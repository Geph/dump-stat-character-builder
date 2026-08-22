/**
 * Stamp curated class/subclass flavor onto bundled seed JSON.
 *
 * Usage: node scripts/run-vite-node.mjs scripts/stamp-class-subclass-flavor.ts
 */
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { SRD_SUBCLASS_DESCRIPTIONS } from "@/lib/compendium/srd-flavor-descriptions"
import { KIBBLES_CLASS_FLAVOR, KIBBLES_SUBCLASS_FLAVOR } from "@/lib/seed-packs/kibbles-tasty/class-flavor"
import { MHP_CLASS_PRESENTATION } from "@/lib/seed-packs/mage-hand-press/class-presentation"
import { MHP_SUBCLASS_FLAVOR } from "@/lib/seed-packs/mage-hand-press/subclass-flavor"

function classNameBase(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, "").trim() || name
}

function subclassFlavor(className: string, name: string): string | undefined {
  const base = classNameBase(className)
  return (
    MHP_SUBCLASS_FLAVOR[`${base}::${name}`] ??
    KIBBLES_SUBCLASS_FLAVOR[`${base}::${name}`] ??
    SRD_SUBCLASS_DESCRIPTIONS[name]
  )
}

function classFlavor(name: string): string | undefined {
  const base = classNameBase(name)
  return (
    MHP_CLASS_PRESENTATION[base]?.description ??
    KIBBLES_CLASS_FLAVOR[name] ??
    KIBBLES_CLASS_FLAVOR[base]
  )
}

function stampContent(path: string, pretty: boolean) {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as {
    classes?: { name?: string; description?: string | null }[]
    subclasses?: { name?: string; class_name?: string; description?: string | null }[]
  }
  let changed = 0
  for (const row of parsed.classes ?? []) {
    const next = classFlavor(String(row.name ?? ""))
    if (next && row.description !== next) {
      row.description = next
      changed++
    }
  }
  for (const row of parsed.subclasses ?? []) {
    const next = subclassFlavor(String(row.class_name ?? ""), String(row.name ?? ""))
    if (next && row.description !== next) {
      row.description = next
      changed++
    }
  }
  if (!changed) {
    console.log(`  ${path.split(/[/\\]/).pop()}: unchanged`)
    return
  }
  writeFileSync(path, pretty ? `${JSON.stringify(parsed, null, 2)}\n` : `${JSON.stringify(parsed)}\n`, "utf8")
  console.log(`  ${path.split(/[/\\]/).pop()}: ${changed} descriptions`)
}

function stampSrdSubclasses() {
  const path = join(process.cwd(), "lib/srd/seed-data/subclasses.json")
  const rows = JSON.parse(readFileSync(path, "utf8")) as { name?: string; description?: string | null }[]
  let changed = 0
  for (const row of rows) {
    const next = SRD_SUBCLASS_DESCRIPTIONS[String(row.name ?? "")]
    if (next && row.description !== next) {
      row.description = next
      changed++
    }
  }
  if (!changed) {
    console.log("  subclasses.json: unchanged")
    return
  }
  writeFileSync(path, `${JSON.stringify(rows, null, 2)}\n`, "utf8")
  console.log(`  subclasses.json: ${changed} descriptions`)
}

const mhp = join(process.cwd(), "lib/seed-packs/mage-hand-press")
const kibbles = join(process.cwd(), "lib/seed-packs/kibbles-tasty")

console.log("Stamping Mage Hand Press…")
for (const file of [
  "magehandpress-alchemist-class.json",
  "magehandpress-captain-class.json",
  "magehandpress-craftsman-class.json",
  "magehandpress-dancer-class.json",
  "magehandpress-gunslinger-class.json",
  "magehandpress-investigator-class.json",
  "magehandpress-martyr-class.json",
  "magehandpress-necromancer-class.json",
  "magehandpress-vagabond-class.json",
  "magehandpress-warden-class.json",
  "magehandpress-warmage-class.json",
  "magehandpress-witch-class.json",
]) {
  stampContent(join(mhp, file), false)
}

console.log("Stamping Kibbles'Tasty…")
for (const file of [
  "kibbles-inventor-class.json",
  "kibbles-occultist-class.json",
  "kibbles-psion-class.json",
  "kibbles-warden-class.json",
]) {
  stampContent(join(kibbles, file), false)
}

console.log("Stamping SRD subclasses…")
stampSrdSubclasses()
console.log("Done.")
