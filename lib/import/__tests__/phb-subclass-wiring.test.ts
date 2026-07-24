/**
 * PHB 2024 subclass wiring audit: every subclass feature in the Drive import JSONs must
 * come out of SRD enrichment with at least one mechanical hook (linked modifiers, spell
 * table, uses, or wired choice options), except the documented descriptive-only allowlist.
 */
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { enrichSrdSubclassRow } from "@/lib/compendium/enrich-srd-subclasses"
import { parseSubclassSpellTable } from "@/lib/import/subclass-spell-table"
import { hasHomebrewFixture, homebrewFixturePath } from "./homebrew-fixture-path"

const CLASSES = [
  "barbarian",
  "bard",
  "cleric",
  "druid",
  "fighter",
  "monk",
  "paladin",
  "ranger",
  "rogue",
  "sorcerer",
  "warlock",
  "wizard",
] as const

const FIXTURES = CLASSES.map((cls) => `phb-${cls}-subclasses`)

/** Features that are intentionally descriptive-only (see SRD_CLASS_FEATURES_WITHOUT_MODIFIER_MATCH). */
const DESCRIPTIVE_ONLY = new Set(["Hunter's Lore"])

function normalizeName(name: string): string {
  return name.replace(/[\u2018\u2019\u201B]/g, "'").trim()
}

type OptionRow = { name?: string; linkedModifiers?: unknown[]; modifierRefs?: unknown[] }
type FeatureRow = {
  name?: string
  level?: number
  description?: string
  isChoice?: boolean
  choices?: { options?: OptionRow[] }
  mechanics?: unknown[]
  linked_modifiers?: unknown[]
  linkedModifiers?: unknown[]
  modifierRefs?: unknown[]
  uses?: unknown
}

function featureHasWiring(feat: FeatureRow): boolean {
  const mods = [
    ...((feat.linked_modifiers as unknown[]) ?? []),
    ...((feat.linkedModifiers as unknown[]) ?? []),
  ]
  const refs = (feat.modifierRefs as unknown[]) ?? []
  const mech = (feat.mechanics as unknown[]) ?? []
  const spellTableRows = /spells$/i.test(feat.name ?? "")
    ? (parseSubclassSpellTable(feat.description ?? "")?.rows ?? [])
    : []
  const optionWiring = (feat.choices?.options ?? []).some(
    (option) => (option.linkedModifiers?.length ?? 0) > 0 || (option.modifierRefs?.length ?? 0) > 0,
  )
  return (
    mods.length > 0 ||
    refs.length > 0 ||
    mech.length > 0 ||
    spellTableRows.length > 0 ||
    Boolean(feat.uses) ||
    optionWiring
  )
}

function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function loadEnrichedSubclasses(cls: (typeof CLASSES)[number]) {
  const path = homebrewFixturePath(`phb-${cls}-subclasses`)
  if (!path) throw new Error(`missing fixture phb-${cls}-subclasses`)
  const data = JSON.parse(readFileSync(path, "utf8")) as { subclasses?: Record<string, unknown>[] }
  return (data.subclasses ?? []).map((sub) => enrichSrdSubclassRow({ ...sub }, cap(cls), []))
}

describe.skipIf(!hasHomebrewFixture(...FIXTURES))("PHB 2024 subclass wiring", () => {
  it("wires every subclass feature (outside the descriptive-only allowlist)", () => {
    const unwired: string[] = []
    for (const cls of CLASSES) {
      for (const sub of loadEnrichedSubclasses(cls)) {
        for (const feat of (sub.features ?? []) as FeatureRow[]) {
          if (DESCRIPTIVE_ONLY.has(normalizeName(feat.name ?? ""))) continue
          if (!featureHasWiring(feat)) {
            unwired.push(`${cls}/${sub.name} L${feat.level} ${feat.name}`)
          }
        }
      }
    }
    expect(unwired).toEqual([])
  })

  it("wires Hunter's Prey options despite curly apostrophes in the import", () => {
    const hunter = loadEnrichedSubclasses("ranger").find((sub) => sub.name === "Hunter")
    const feature = ((hunter?.features ?? []) as FeatureRow[]).find(
      (feat) => normalizeName(feat.name ?? "") === "Hunter's Prey",
    )
    expect(feature?.isChoice).toBe(true)
    const optionNames = (feature?.choices?.options ?? []).map((option) => option.name)
    expect(optionNames).toEqual(["Colossus Slayer", "Horde Breaker"])
    for (const option of feature?.choices?.options ?? []) {
      expect((option.linkedModifiers?.length ?? 0)).toBeGreaterThan(0)
    }
  })

  it("attaches Nature's Ward resistances to pre-split Circle of the Land options", () => {
    const land = loadEnrichedSubclasses("druid").find((sub) => sub.name === "Circle of the Land")
    const feature = ((land?.features ?? []) as FeatureRow[]).find(
      (feat) => feat.name === "Circle of the Land Spells",
    )
    const options = feature?.choices?.options ?? []
    expect(options.length).toBe(4)
    for (const option of options) {
      expect((option.linkedModifiers?.length ?? 0), `option ${option.name}`).toBeGreaterThan(0)
    }
  })

  it("fills Aspect of the Wilds and Power of the Wilds choice options", () => {
    const wildHeart = loadEnrichedSubclasses("barbarian").find(
      (sub) => sub.name === "Path of the Wild Heart",
    )
    const features = (wildHeart?.features ?? []) as FeatureRow[]
    const aspect = features.find((feat) => feat.name === "Aspect of the Wilds")
    expect((aspect?.choices?.options ?? []).map((option) => option.name)).toEqual([
      "Owl",
      "Panther",
      "Salmon",
    ])
    const power = features.find((feat) => feat.name === "Power of the Wilds")
    expect((power?.choices?.options ?? []).map((option) => option.name)).toEqual([
      "Falcon",
      "Lion",
      "Ram",
    ])
  })
})
