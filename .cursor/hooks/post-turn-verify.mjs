#!/usr/bin/env node
/**
 * Cursor `stop` hook — Node port so Windows (no working bash) still typechecks.
 * Mirrors `.cursor/hooks/post-turn-verify.sh` for the fast CI gate (eslint + tsc).
 * Also runs `pnpm install --frozen-lockfile` when lockfile / workspace / package.json change.
 * When the turn touched lib/import, lib/compendium, or lib/character, also runs the
 * resource-graph audit, granted-equipment cross-surface audit, and claim-coverage report
 * (scoped to changed classes when that is determinable).
 *
 * Force: CURSOR_HOOK_FORCE=1
 * Also run next build: CURSOR_HOOK_RUN_BUILD=1
 * Verbose: CURSOR_HOOK_VERBOSE=1
 */

import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

const ROOT = resolve(import.meta.dirname, "../..")
const STAMP_FILE = join(ROOT, ".git", "dumpstat-post-turn-verify")
const VERBOSE = process.env.CURSOR_HOOK_VERBOSE === "1"

function log(...args) {
  if (VERBOSE) console.error("post-turn-verify:", ...args)
}

function readStdin() {
  return new Promise((resolvePromise) => {
    if (process.stdin.isTTY) {
      resolvePromise("")
      return
    }
    const chunks = []
    process.stdin.setEncoding("utf8")
    process.stdin.on("data", (chunk) => chunks.push(chunk))
    process.stdin.on("end", () => resolvePromise(chunks.join("")))
    process.stdin.on("error", () => resolvePromise(""))
  })
}

function emit(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`)
}

function listRelevantChanges() {
  const run = (args) => {
    const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" })
    return result.stdout ?? ""
  }
  const names = [
    ...run(["diff", "--name-only", "HEAD"]).split(/\r?\n/),
    ...run(["diff", "--cached", "--name-only"]).split(/\r?\n/),
    ...run(["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/),
  ]
  return [
    ...new Set(
      names
        .map((n) => n.trim())
        .filter(Boolean)
        .filter(
          (n) =>
            /\.(ts|tsx|js|jsx|mjs|cjs|json)$/.test(n) ||
            /(?:^|\/)(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)$/.test(n),
        )
        .filter((n) => !/(^|\/)(node_modules|\.next)\//.test(n)),
    ),
  ]
}

function changesSinceStamp() {
  if (!existsSync(STAMP_FILE)) return true
  const stamp = statSync(STAMP_FILE).mtimeMs
  const changed = listRelevantChanges()
  if (!changed.length) return false
  for (const rel of changed) {
    const full = join(ROOT, rel)
    if (!existsSync(full)) continue
    if (statSync(full).mtimeMs > stamp) return true
  }
  return false
}

function shouldRun(loopCount) {
  if (process.env.CURSOR_HOOK_FORCE === "1") return true
  if (Number(loopCount) > 0) return true
  return changesSinceStamp()
}

function failWithFollowup(label, code, out) {
  console.error(`post-turn-verify: ${label} FAILED (exit ${code})`)
  emit({
    followup_message:
      "The repo `stop` hook ran an automated check after your last turn " +
      "(the same fast gate CI blocks on).\n\n" +
      `**Command:** \`${label}\`\n` +
      `**Result:** failed with exit code **${code}**.\n\n` +
      "Fix the issues in the output below, then continue.\n\n" +
      "```text\n" +
      out.slice(0, 12000) +
      "\n```\n",
  })
  process.exit(0)
}

function runCheck(label, command, args, shell = false) {
  log("running", label)
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
    shell,
  })
  const code = result.status ?? 1
  if (code === 0) return
  failWithFollowup(label, code, `${result.stdout ?? ""}${result.stderr ?? ""}`)
}

function parseAuditPayload(stdout) {
  const lines = String(stdout ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (!lines[i].startsWith("{")) continue
    try {
      const parsed = JSON.parse(lines[i])
      if (parsed && parsed.ok === true && Array.isArray(parsed.newMisses)) return parsed
    } catch {
      /* keep scanning */
    }
  }
  return null
}

function runPostTurnAudits(changedFiles) {
  const filesFrom = join(ROOT, ".git", "dumpstat-audit-files.txt")
  try {
    mkdirSync(join(ROOT, ".git"), { recursive: true })
    writeFileSync(filesFrom, changedFiles.join("\n"))
  } catch (error) {
    failWithFollowup("post-turn audits (write file list)", 1, String(error))
  }
  const runner = join(ROOT, "scripts", "run-vite-node.mjs")
  const script = join(ROOT, "scripts", "post-turn-audits.ts")
  const args = [runner, script, "--files-from", filesFrom]
  if (VERBOSE) args.push("--verbose")
  log("running post-turn audits")
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  })
  const code = result.status ?? 1
  const combined = `${result.stdout ?? ""}${result.stderr ?? ""}`
  if (result.stderr?.trim()) console.error(result.stderr.trimEnd())
  if (code !== 0) {
    failWithFollowup("post-turn audits", code, combined)
  }
  const payload = parseAuditPayload(result.stdout)
  if (!payload) {
    failWithFollowup("post-turn audits", 1, `No JSON payload in audit output.\n${combined}`)
  }
  if (VERBOSE) log(payload.summary)
  return payload
}

function runPnpmOrBin(label, binName, binArgs, pnpmArgs) {
  // Prefer node entrypoints — Windows .cmd wrappers break when the repo path has spaces
  // (e.g. "Google Drive").
  if (binName === "eslint") {
    const eslintJs = join(ROOT, "node_modules", "eslint", "bin", "eslint.js")
    if (existsSync(eslintJs)) {
      runCheck(label, process.execPath, [eslintJs, ...binArgs], false)
      return
    }
  }
  if (binName === "tsc") {
    const tscJs = join(ROOT, "node_modules", "typescript", "bin", "tsc")
    if (existsSync(tscJs)) {
      runCheck(label, process.execPath, [tscJs, ...binArgs], false)
      return
    }
  }
  const localUnix = join(ROOT, "node_modules", ".bin", binName)
  if (existsSync(localUnix)) {
    runCheck(label, localUnix, binArgs, false)
    return
  }
  runCheck(label, process.platform === "win32" ? "pnpm.cmd" : "pnpm", pnpmArgs, true)
}

const raw = await readStdin()
let status = "completed"
let loopCount = 0
try {
  const parsed = raw.trim() ? JSON.parse(raw) : {}
  status = parsed.status ?? "completed"
  loopCount = parsed.loop_count ?? 0
} catch {
  /* ignore */
}

if (status === "aborted") {
  log("status=aborted — skipping")
  emit({})
  process.exit(0)
}

if (!shouldRun(loopCount)) {
  log("skipped (no relevant source changes since last pass)")
  emit({})
  process.exit(0)
}

const changed = listRelevantChanges()
const lockfileTouched = changed.some((n) =>
  /(?:^|\/)(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)$/.test(n),
)
if (lockfileTouched || process.env.CURSOR_HOOK_FORCE === "1") {
  runCheck(
    "pnpm install --frozen-lockfile",
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["install", "--frozen-lockfile"],
    true,
  )
}

runPnpmOrBin("eslint .", "eslint", ["."], ["run", "lint"])
runPnpmOrBin("tsc --noEmit", "tsc", ["--noEmit"], ["exec", "tsc", "--noEmit"])

if (process.env.CURSOR_HOOK_RUN_BUILD === "1") {
  runCheck("next build", process.execPath, [join(ROOT, "scripts", "build-hosted.mjs")])
}

const auditTrigger = changed.some((n) =>
  /(?:^|\/)lib\/(import|compendium|character)\//.test(n.replace(/\\/g, "/")),
)
const force = process.env.CURSOR_HOOK_FORCE === "1"
let auditFollowup = ""
if (auditTrigger || force) {
  const auditReport = runPostTurnAudits(changed)
  if (auditReport?.newMisses?.length) {
    const lines = auditReport.newMisses.map((row) => {
      const where = row.feature
        ? `${row.class} / ${row.feature}${row.level != null ? ` L${row.level}` : ""}`
        : row.class
      return `- [${row.audit}] ${where}: ${row.detail}`
    })
    auditFollowup =
      "The repo `stop` hook ran the resource-graph, granted-equipment, and claim-coverage audits.\n\n" +
      `${auditReport.summary}\n\n` +
      `**Scope:** ${auditReport.full ? "full sweep" : auditReport.classes.join(", ") || "none"}\n` +
      `**New misses:** ${auditReport.newMisses.length}\n\n` +
      lines.join("\n") +
      "\n"
  }
}

try {
  mkdirSync(join(ROOT, ".git"), { recursive: true })
  writeFileSync(STAMP_FILE, `${new Date().toISOString()}\n`)
} catch {
  /* ignore */
}

log("all checks passed")
emit(auditFollowup ? { followup_message: auditFollowup } : {})
process.exit(0)
