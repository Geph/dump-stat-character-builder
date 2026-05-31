/**
 * Bump VERSION by 0.1 and sync package.json.
 * Used by .githooks/pre-push before each push.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const versionPath = path.join(root, "VERSION")
const packagePath = path.join(root, "package.json")

const current = fs.readFileSync(versionPath, "utf8").trim()
const parts = current.split(".").map((p) => parseInt(p, 10))
if (parts.some((n) => Number.isNaN(n))) {
  console.error(`Invalid VERSION: ${current}`)
  process.exit(1)
}

const major = parts[0] ?? 0
const minor = parts[1] ?? 0
const next = `${major}.${minor + 1}`

fs.writeFileSync(versionPath, `${next}\n`)

const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"))
pkg.version = next
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`)

console.log(`Version bumped: ${current} → ${next}`)
