/**
 * WOTC species Drive import wiring: shared trait presets + species-specific
 * hooks (Talons, Autognome Sentry's Rest / Specialized Design, etc.).
 */
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import { hasHomebrewFixture, homebrewFixturePath } from "./homebrew-fixture-path"

const FIXTURE = "wotc-species"

type OptionRow = {
  name?: string
  linkedModifiers?: unknown[]
  modifierRefs?: unknown[]
}
type TraitRow = {
  name?: string
  linkedModifiers?: unknown[]
  linked_modifiers?: unknown[]
  modifierRefs?: unknown[]
  mechanics?: unknown[]
  isChoice?: boolean
  choices?: { options?: OptionRow[] }
  uses?: unknown
}

function traitHasWiring(trait: TraitRow): boolean {
  const mods = [
    ...((trait.linked_modifiers as unknown[]) ?? []),
    ...((trait.linkedModifiers as unknown[]) ?? []),
  ]
  const refs = (trait.modifierRefs as unknown[]) ?? []
  const optionWiring = (trait.choices?.options ?? []).some(
    (option) => (option.linkedModifiers?.length ?? 0) > 0,
  )
  // Size / lineage pickers are valid wiring even before option-level mods attach.
  const choiceShell = Boolean(trait.isChoice && (trait.choices?.options?.length ?? 0) > 0)
  return mods.length > 0 || refs.length > 0 || optionWiring || choiceShell || Boolean(trait.uses)
}

describe("WOTC species wiring", () => {
  const skip = !hasHomebrewFixture(FIXTURE)

  it.skipIf(skip)("wires nearly all traits after import enrichment", () => {
    const path = homebrewFixturePath(FIXTURE)!
    const enriched = enrichImportContentModifiers(parseImportContentJson(readFileSync(path, "utf8"))!)

    const unwired: string[] = []
    let wired = 0
    for (const species of enriched.species ?? []) {
      for (const trait of (species.traits ?? []) as TraitRow[]) {
        if (traitHasWiring(trait)) wired++
        else unwired.push(`${species.name} :: ${trait.name}`)
      }
    }

    expect(unwired, JSON.stringify(unwired, null, 2)).toEqual([])
    expect(wired).toBeGreaterThanOrEqual(230)
  })

  it.skipIf(skip)("wires Aarakocra Talons and Autognome Sentry/Specialized Design", () => {
    const path = homebrewFixturePath(FIXTURE)!
    const enriched = enrichImportContentModifiers(parseImportContentJson(readFileSync(path, "utf8"))!)

    const aarakocra = enriched.species?.find((s) => s.name === "Aarakocra")
    const talons = (aarakocra?.traits as TraitRow[] | undefined)?.find((t) => t.name === "Talons")
    expect((talons?.linkedModifiers?.length ?? 0) > 0).toBe(true)
    expect(JSON.stringify(talons?.linkedModifiers)).toMatch(/unarmed_strike_damage|1d6|Slashing/i)

    const autognome = enriched.species?.find((s) => s.name === "Autognome")
    const sentry = (autognome?.traits as TraitRow[] | undefined)?.find((t) => t.name === "Sentry's Rest")
    const specialized = (autognome?.traits as TraitRow[] | undefined)?.find(
      (t) => t.name === "Specialized Design",
    )
    expect(JSON.stringify(sentry?.linkedModifiers)).toMatch(/rest_replacement|magical_sleep/i)
    expect(JSON.stringify(specialized?.linkedModifiers)).toMatch(/tool_proficiencies/)
  })

  it.skipIf(skip)("wires Size and lineage/symbiont choice options", () => {
    const path = homebrewFixturePath(FIXTURE)!
    const enriched = enrichImportContentModifiers(parseImportContentJson(readFileSync(path, "utf8"))!)

    const missing: string[] = []
    for (const species of enriched.species ?? []) {
      for (const trait of (species.traits ?? []) as TraitRow[]) {
        const options = trait.choices?.options ?? []
        if (!trait.isChoice || options.length === 0) continue
        for (const option of options) {
          if ((option.linkedModifiers?.length ?? 0) === 0) {
            missing.push(`${species.name} :: ${trait.name} :: ${option.name ?? "?"}`)
          }
        }
      }
    }
    expect(missing, JSON.stringify(missing, null, 2)).toEqual([])

    const human = enriched.species?.find((s) => s.name === "Human") as
      | { size_options?: string[] | null; traits?: TraitRow[] }
      | undefined
    expect(human?.size_options).toEqual(["Small", "Medium"])
    const size = human?.traits?.find((t) => t.name === "Size")
    expect(
      (size?.choices?.options ?? []).every((o) => (o.linkedModifiers?.length ?? 0) > 0),
    ).toBe(true)

    const elf = enriched.species?.find((s) => s.name === "Elf")
    const lineage = (elf?.traits as TraitRow[] | undefined)?.find((t) => t.name === "Elven Lineage")
    expect((lineage?.choices?.options ?? []).map((o) => o.name)).toEqual(
      expect.arrayContaining(["Drow", "High Elf", "Wood Elf", "Lorwyn Elf", "Shadowmoor Elf"]),
    )
    expect(
      (lineage?.choices?.options ?? []).every((o) => (o.linkedModifiers?.length ?? 0) > 0),
    ).toBe(true)

    const goliath = enriched.species?.find((s) => s.name === "Goliath")
    const giant = (goliath?.traits as TraitRow[] | undefined)?.find((t) => t.name === "Giant Ancestry")
    const cloud = (giant?.choices?.options ?? []).find((o) => o.name === "Cloud's Jaunt")
    expect((cloud?.linkedModifiers?.length ?? 0) > 0).toBe(true)
  })
})
