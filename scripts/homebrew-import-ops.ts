#!/usr/bin/env node
/**
 * Homebrew import review CLI.
 *
 *   npm run import:audit -- <json-path> [--source <source-path>] [--fix]
 *   npm run import:merge -- --base <drive-json> --incoming <full.json> [--write <out>] [--mode spells|abilities|auto]
 *   npm run import:ops -- completeness <json-path> --source <source-path>
 *   npm run import:ops -- smoke
 *   npm run import:smoke
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { basename, join } from "node:path"
import {
  auditImportWiring,
  compareSourceToImport,
  extractCustomAbilities,
  formatCompletenessReport,
  homebrewImportJsonDir,
  homebrewSourceTextsDir,
  isAbilityCatalogPayload,
  mergeAbilityFillIn,
  mergeSpellFillIn,
  sanitizeHomebrewImportJson,
  summarizeFindings,
  DRIVE_SMOKE_IMPORT_FILES,
} from "@/lib/import/homebrew-import-ops"
import { IMPORT_TO_SOURCE_BASENAME } from "@/lib/import/homebrew-import-ops/paths"

function usage(): never {
  console.error(`Usage:
  npm run import:audit -- <json> [--source <txt>] [--fix]
  npm run import:merge -- --base <json> --incoming <json> [--write <json>] [--mode spells|abilities|auto]
  npm run import:ops -- completeness <json> --source <txt>
  npm run import:ops -- smoke

  --mode auto (default): merge spells if incoming has spells[]; merge custom abilities if incoming has them.
  --mode spells: class/spell fill-in only (mergeSpellFillIn).
  --mode abilities: merge import_proposals.custom_abilities (standalone catalogs or into a class).
`)
  process.exit(2)
}

function parseArgs(argv: string[]) {
  const args = [...argv]
  const flags: Record<string, string | boolean> = {}
  const positional: string[] = []
  while (args.length) {
    const a = args.shift()!
    if (a === "--fix") flags.fix = true
    else if (a.startsWith("--")) {
      const key = a.slice(2)
      const val = args.shift()
      if (!val || val.startsWith("--")) usage()
      flags[key] = val
    } else positional.push(a)
  }
  return { flags, positional }
}

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"))
}

function resolveSourcePath(jsonPath: string, explicit?: string): string | null {
  if (explicit) return explicit
  const base = basename(jsonPath).replace(/\.json$/i, "")
  const mapped = IMPORT_TO_SOURCE_BASENAME[basename(jsonPath)] ?? IMPORT_TO_SOURCE_BASENAME[base] ?? base
  const candidate = join(homebrewSourceTextsDir(), mapped)
  return existsSync(candidate) ? candidate : null
}

function hasSpells(content: unknown): boolean {
  const root = content && typeof content === "object" && !Array.isArray(content) ? (content as Record<string, unknown>) : null
  return Array.isArray(root?.spells) && root!.spells.length > 0
}

function resolveMergeMode(
  modeFlag: string | undefined,
  incoming: unknown,
): "spells" | "abilities" | "both" {
  const mode = (modeFlag ?? "auto").toLowerCase()
  if (mode === "spells") return "spells"
  if (mode === "abilities" || mode === "ability" || mode === "custom_abilities") return "abilities"
  if (mode !== "auto") usage()

  const abilities = extractCustomAbilities(incoming).length > 0
  const spells = hasSpells(incoming)
  if (abilities && spells) return "both"
  if (abilities || isAbilityCatalogPayload(incoming)) return "abilities"
  return "spells"
}

function cmdAudit(jsonPath: string, flags: Record<string, string | boolean>) {
  let content = loadJson(jsonPath)
  if (flags.fix) {
    content = sanitizeHomebrewImportJson(content)
    writeFileSync(jsonPath, `${JSON.stringify(content, null, 2)}\n`)
    console.log(`Wrote sanitized JSON → ${jsonPath}`)
  }
  const findings = auditImportWiring(content)
  const summary = summarizeFindings(findings)
  for (const f of findings) {
    console.log(`[${f.severity}] ${f.id}: ${f.message}${f.path ? ` (${f.path})` : ""}`)
  }
  const abilityCount = extractCustomAbilities(content).length
  const catalog = isAbilityCatalogPayload(content)
  console.log(
    `\nSummary: ${summary.errors} error(s), ${summary.warns} warning(s)` +
      (abilityCount ? `; custom abilities: ${abilityCount}${catalog ? " (catalog)" : ""}` : ""),
  )

  const sourcePath = resolveSourcePath(jsonPath, flags.source as string | undefined)
  if (sourcePath) {
    const report = formatCompletenessReport(
      compareSourceToImport(readFileSync(sourcePath, "utf8"), content),
    )
    console.log(`\n${report}`)
  } else if (!catalog) {
    console.log("\nCompleteness: skipped (pass --source or place matching file under source-texts/Classes)")
  }

  process.exit(summary.ok ? 0 : 1)
}

function cmdMerge(flags: Record<string, string | boolean>) {
  const basePath = flags.base as string | undefined
  const incomingPath = flags.incoming as string | undefined
  if (!basePath || !incomingPath) usage()

  const base = loadJson(basePath)
  const incoming = loadJson(incomingPath)
  const mode = resolveMergeMode(flags.mode as string | undefined, incoming)
  const outPath = (flags.write as string | undefined) ?? basePath

  let merged: Record<string, unknown>
  if (mode === "abilities") {
    merged = mergeAbilityFillIn(base, incoming)
  } else if (mode === "spells") {
    merged = mergeSpellFillIn(base, incoming)
  } else {
    // Spells first (class shell from incoming), then overlay ability union onto that result
    // while preferring the original base shell's structural fixes via ability merge into base…
    // Practical approach: spell-merge base←incoming, then ability-merge that←incoming abilities
    // using the spell-merged object as base shell.
    const afterSpells = mergeSpellFillIn(base, incoming)
    merged = mergeAbilityFillIn(afterSpells, incoming)
  }

  writeFileSync(outPath, `${JSON.stringify(merged, null, 2)}\n`)
  const findings = auditImportWiring(merged)
  const summary = summarizeFindings(findings)
  const abilityCount = extractCustomAbilities(merged).length
  const spellCount = Array.isArray(merged.spells) ? merged.spells.length : 0

  console.log(`Merged (${mode}) → ${outPath}`)
  console.log(
    `Spells: ${spellCount}; custom abilities: ${abilityCount}; audit: ${summary.errors} error(s), ${summary.warns} warning(s)`,
  )
  for (const f of findings.filter((x) => x.severity === "error")) {
    console.log(`[error] ${f.id}: ${f.message}`)
  }
  process.exit(summary.ok ? 0 : 1)
}

function cmdCompleteness(jsonPath: string, flags: Record<string, string | boolean>) {
  const sourcePath = resolveSourcePath(jsonPath, flags.source as string | undefined)
  if (!sourcePath) {
    console.error("Need --source <path> or a matching source-texts/Classes file")
    process.exit(2)
  }
  const findings = compareSourceToImport(readFileSync(sourcePath, "utf8"), loadJson(jsonPath))
  console.log(formatCompletenessReport(findings))
  process.exit(findings.some((f) => f.status === "missing_in_json") ? 1 : 0)
}

function cmdSmoke() {
  const dir = homebrewImportJsonDir()
  let failed = 0
  for (const file of DRIVE_SMOKE_IMPORT_FILES) {
    const path = join(dir, file)
    if (!existsSync(path)) {
      console.log(`[skip] missing ${path}`)
      continue
    }
    const findings = auditImportWiring(loadJson(path))
    const summary = summarizeFindings(findings)
    const mark = summary.ok ? "ok" : "FAIL"
    console.log(`[${mark}] ${file}: ${summary.errors} error(s), ${summary.warns} warning(s)`)
    if (!summary.ok) {
      failed += 1
      for (const f of findings.filter((x) => x.severity === "error")) {
        console.log(`  - ${f.id}: ${f.message}`)
      }
    }
  }
  process.exit(failed ? 1 : 0)
}

function main() {
  const argv = process.argv.slice(2)
  if (!argv.length) usage()
  const cmd = argv.shift()!
  const { flags, positional } = parseArgs(argv)

  switch (cmd) {
    case "audit":
      if (!positional[0]) usage()
      cmdAudit(positional[0], flags)
      break
    case "merge":
      cmdMerge(flags)
      break
    case "completeness":
      if (!positional[0]) usage()
      cmdCompleteness(positional[0], flags)
      break
    case "smoke":
      cmdSmoke()
      break
    default:
      usage()
  }
}

main()
