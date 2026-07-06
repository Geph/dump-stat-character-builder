import classes from "../lib/srd/seed-data/classes.json"
import subclasses from "../lib/srd/seed-data/subclasses.json"
import { enrichSrdClassList } from "../lib/compendium/enrich-srd-classes"
import { enrichSrdSubclassList } from "../lib/compendium/enrich-srd-subclasses"
import { enrichClassFeatureWithModifierPresets } from "../lib/compendium/enrich-srd-class-features"
import type { Feature } from "../lib/types"

function featureHasModifiers(feature: Feature): boolean {
  return Boolean(feature.linkedModifiers?.length || feature.modifierRefs?.length)
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function summarizeDescription(desc: string | undefined, max = 120): string {
  if (!desc) return "(no description)"
  const plain = stripHtml(desc)
  return plain.length > max ? `${plain.slice(0, max)}…` : plain
}

type Unmatched = {
  source: string
  level: number
  name: string
  description: string
  note?: string
}

const SKIP_NAMES = new Set([
  "spellcasting",
  "prepared spells",
  "cantrips",
  "spells known",
  "spell slots",
  "ability score improvement",
  "epic boon",
])

/** Known narrative-only features with no mechanical modifier hook. */
const ALLOWED_UNMATCHED = new Set([
  "Hunter's Lore",
  "Pact Magic",
  // Level-up markers; damage scales via bonusByLevel on the level-7 Blessed Strikes choice.
  "Improved Blessed Strikes",
  // Level-up marker; damage scales via bonusByLevel on the level-7 Elemental Fury choice.
  "Improved Elemental Fury",
])

function couldHaveModifier(feature: Feature): boolean {
  const name = (feature.name ?? "").toLowerCase()
  if (SKIP_NAMES.has(name)) return false
  if (/ability score improvement|epic boon/i.test(feature.name ?? "")) return false
  // Proficiency-only / passive narrative with no mechanical hook in catalog
  if (/^weapon mastery$/i.test(feature.name ?? "")) return false
  if (/^weapon mastery \(/.test(feature.name ?? "")) return false
  return true
}

function auditFeatures(source: string, features: Feature[]): Unmatched[] {
  const unmatched: Unmatched[] = []
  for (const feature of features) {
    if (!couldHaveModifier(feature)) continue
    if (featureHasModifiers(feature)) continue
    unmatched.push({
      source,
      level: feature.level ?? 0,
      name: feature.name ?? "",
      description: summarizeDescription(feature.description),
    })
  }
  return unmatched
}

const enrichedClasses = enrichSrdClassList(classes as Record<string, unknown>[])
const classIdMap = new Map(
  enrichedClasses.map((c) => [c.name as string, (c as { id?: string }).id ?? c.name]),
)
const enrichedSubclasses = enrichSrdSubclassList(
  (subclasses as { name: string; class_name: string; features?: Feature[]; source?: string }[]).map(
    (sc) => ({
      ...sc,
      class_id: classIdMap.get(sc.class_name) ?? sc.class_name,
    }),
  ) as Record<string, unknown>[],
  new Map(enrichedClasses.map((c) => [String((c as { id?: string }).id ?? c.name), c.name as string])),
)

let detectorFallbackCount = 0
for (const cls of enrichedClasses) {
  for (const raw of (cls.features ?? []) as Feature[]) {
    const presetOnly = enrichClassFeatureWithModifierPresets(String(cls.name), raw, null, {
      skipMechanicalDetection: true,
    })
    const withFallback = enrichClassFeatureWithModifierPresets(String(cls.name), raw)
    if ((withFallback.linkedModifiers?.length ?? 0) > (presetOnly.linkedModifiers?.length ?? 0)) {
      detectorFallbackCount += 1
    }
  }
}
for (const sc of enrichedSubclasses) {
  const parent = String((sc as { class_name?: string }).class_name ?? "")
  const subclassName = String(sc.name ?? "")
  for (const raw of (sc.features ?? []) as Feature[]) {
    const presetOnly = enrichClassFeatureWithModifierPresets(parent, raw, subclassName, {
      skipMechanicalDetection: true,
    })
    const withFallback = enrichClassFeatureWithModifierPresets(parent, raw, subclassName)
    if ((withFallback.linkedModifiers?.length ?? 0) > (presetOnly.linkedModifiers?.length ?? 0)) {
      detectorFallbackCount += 1
    }
  }
}

const allUnmatched: Unmatched[] = []

for (const cls of enrichedClasses) {
  const features = (cls.features ?? []) as Feature[]
  allUnmatched.push(...auditFeatures(String(cls.name), features))
}

for (const sc of enrichedSubclasses) {
  const parent = (sc as { class_name?: string }).class_name ?? "Subclass"
  const name = String(sc.name ?? "")
  const features = (sc.features ?? []) as Feature[]
  allUnmatched.push(...auditFeatures(`${parent} (${name})`, features))
}

console.log(`SRD class/subclass features without common modifiers: ${allUnmatched.length}`)
console.log(`Features supplemented by phrase-detector fall-through: ${detectorFallbackCount}\n`)

const unexpected = allUnmatched.filter((item) => !ALLOWED_UNMATCHED.has(item.name))
if (unexpected.length) {
  console.error(`Unexpected unmatched features (${unexpected.length}):`)
  for (const item of unexpected) {
    console.error(`  ${item.source} L${item.level} ${item.name}`)
  }
  process.exit(1)
}

if (allUnmatched.length) {
  console.log("Allowed unmatched (narrative-only):")
  for (const item of allUnmatched) {
    console.log(`  ${item.source} L${item.level} ${item.name}`)
  }
  console.log()
}

const bySource = new Map<string, Unmatched[]>()
for (const item of allUnmatched) {
  const list = bySource.get(item.source) ?? []
  list.push(item)
  bySource.set(item.source, list)
}

for (const [source, items] of [...bySource.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`## ${source}`)
  for (const item of items.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))) {
    console.log(`  L${item.level} ${item.name}`)
    console.log(`    ${item.description}`)
  }
  console.log()
}
