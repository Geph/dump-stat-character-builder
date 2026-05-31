/**
 * Push to origin, then bump VERSION by 0.1 for the next release.
 *
 *   node scripts/git-push.mjs [branch]
 *   npm run push
 */
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const branch = process.argv[2] || "Cursor"
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit" })
}

function readVersion() {
  return fs.readFileSync(path.join(root, "VERSION"), "utf8").trim()
}

run(`git push -u origin ${branch}`)
run("node scripts/bump-version.mjs")
run("git add VERSION package.json")
run(`git commit -m "chore: bump version to ${readVersion()}"`)
run(`git push origin ${branch}`)

console.log(`Pushed ${branch}. Next release version: ${readVersion()}`)
