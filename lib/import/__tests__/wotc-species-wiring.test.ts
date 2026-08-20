/**
 * WOTC species Drive import wiring: shared trait presets + species-specific
 * hooks (Talons, Autognome Sentry's Rest / Specialized Design, etc.).
 */
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import { SPECIES_CARD_IMAGES_BY_NAME } from "@/lib/compendium/species-card-images-defaults"
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

  it.skipIf(skip)("uses canonical short source keys", () => {
    const path = homebrewFixturePath(FIXTURE)!
    const parsed = parseImportContentJson(readFileSync(path, "utf8"))!
    const sources = [...new Set((parsed.species ?? []).map((species) => species.source))].sort()
    expect(sources).toEqual(["eberron", "lorwyn", "motm", "phb", "ravenloft", "spelljammer"])
  })

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

  it.skipIf(skip)("preserves constrained skill pools and curated compound traits", () => {
    const path = homebrewFixturePath(FIXTURE)!
    const enriched = enrichImportContentModifiers(parseImportContentJson(readFileSync(path, "utf8"))!)
    const species = (name: string) => enriched.species?.find((row) => row.name === name)
    const trait = (speciesName: string, traitName: string) =>
      (species(speciesName)?.traits as TraitRow[] | undefined)?.find((row) => row.name === traitName)

    const naturalAffinity = JSON.stringify(trait("Centaur", "Natural Affinity")?.linkedModifiers)
    expect(naturalAffinity).toMatch(/Animal Handling/)
    expect(naturalAffinity).toMatch(/Medicine/)
    expect(naturalAffinity).toMatch(/Nature/)
    expect(naturalAffinity).toMatch(/Survival/)
    expect(naturalAffinity).toMatch(/"allowAnySkill":false/)

    expect(JSON.stringify(trait("Aasimar (2024)", "Healing Hands")?.linkedModifiers)).toMatch(
      /healing_dice_pool/,
    )
    expect(JSON.stringify(trait("Aasimar (2024)", "Celestial Revelation")?.linkedModifiers)).toMatch(
      /on_hit_trigger/,
    )
    expect(JSON.stringify(trait("Changeling (2024)", "Shape-Shifter")?.linkedModifiers)).toMatch(
      /creature_size/,
    )

    const dualMind = JSON.stringify(trait("Kalashtar", "Dual Mind")?.linkedModifiers)
    expect(dualMind).toMatch(/Wisdom/)
    expect(dualMind).toMatch(/Charisma/)
    expect(JSON.stringify(trait("Kalashtar", "Severed from Dreams")?.linkedModifiers)).toMatch(
      /Dream/,
    )

    const versatility = JSON.stringify(trait("Khoravar", "Skill Versatility")?.linkedModifiers)
    expect(versatility).toMatch(/skills/)
    expect(versatility).toMatch(/tool_proficiencies/)
    expect(versatility).toMatch(/sharedChoiceGroup/)

    const gnomishCunning = JSON.stringify(trait("Gnome", "Gnomish Cunning")?.linkedModifiers)
    expect(gnomishCunning).toMatch(/Intelligence/)
    expect(gnomishCunning).toMatch(/Wisdom/)
    expect(gnomishCunning).toMatch(/Charisma/)

    const vampiricBite = JSON.stringify(trait("Dhampir", "Vampiric Bite")?.linkedModifiers)
    expect(vampiricBite).toMatch(/unarmed_strike_damage/)
    expect(vampiricBite).toMatch(/constitution/)

    const windCaller = JSON.stringify(trait("Aarakocra", "Wind Caller")?.linkedModifiers)
    expect(windCaller).toMatch(/spellcasting_ability/)
    expect(windCaller).toMatch(/abilityOptions/)

    const aasimar = species("Aasimar (2024)") as
      | { linkedModifiers?: unknown[]; linked_modifiers?: unknown[] }
      | undefined
    expect(JSON.stringify(aasimar?.linkedModifiers ?? aasimar?.linked_modifiers)).toMatch(/languages/)
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
    expect((lineage?.choices?.options ?? []).map((o) => o.name)).toEqual([
      "Drow",
      "High Elf",
      "Wood Elf",
    ])
    expect(
      (lineage?.choices?.options ?? []).every((o) => (o.linkedModifiers?.length ?? 0) > 0),
    ).toBe(true)

    const lorwynElf = enriched.species?.find((s) => s.name === "Lorwyn Elf")
    const lorwynLineage = (lorwynElf?.traits as TraitRow[] | undefined)?.find(
      (t) => t.name === "Elven Lineage",
    )
    expect((lorwynLineage?.choices?.options ?? []).map((o) => o.name)).toEqual([
      "Lorwyn Elf",
      "Shadowmoor Elf",
    ])
    expect(
      (lorwynLineage?.choices?.options ?? []).every((o) => (o.linkedModifiers?.length ?? 0) > 0),
    ).toBe(true)

    const eberronAasimar = enriched.species?.find((s) => s.name === "Aasimar (Eberron)")
    const aasimarLineage = (eberronAasimar?.traits as TraitRow[] | undefined)?.find(
      (t) => t.name === "Aasimar Lineage",
    )
    expect((aasimarLineage?.choices?.options ?? []).map((o) => o.name)).toEqual([
      "Fernian",
      "Mabaran",
    ])
    expect(
      (aasimarLineage?.choices?.options ?? []).every((o) => (o.linkedModifiers?.length ?? 0) > 0),
    ).toBe(true)
    expect(JSON.stringify(aasimarLineage?.choices?.options?.[0]?.linkedModifiers)).toMatch(
      /Fire|Produce Flame/i,
    )
    expect(JSON.stringify(aasimarLineage?.choices?.options?.[1]?.linkedModifiers)).toMatch(
      /Toll the Dead|Radiant/i,
    )

    const revelation = (eberronAasimar?.traits as TraitRow[] | undefined)?.find(
      (t) => t.name === "Celestial Revelation",
    )
    expect((revelation?.choices?.options ?? []).map((o) => o.name)).toEqual([
      "Heavenly Wings",
      "Inner Radiance",
      "Inner Darkness",
      "Necrotic Shroud",
    ])
    const innerRadiance = (revelation?.choices?.options ?? []).find((o) => o.name === "Inner Radiance")
    const innerDarkness = (revelation?.choices?.options ?? []).find((o) => o.name === "Inner Darkness")
    expect(JSON.stringify(innerRadiance?.linkedModifiers)).toMatch(/Fire/i)
    expect(JSON.stringify(innerDarkness?.linkedModifiers)).toMatch(/Necrotic/i)
    expect(SPECIES_CARD_IMAGES_BY_NAME["Aasimar (Eberron)"]).toMatch(/aasimar-eberron/)

    const flamekin = enriched.species?.find((s) => s.name === "Flamekin")
    expect((flamekin?.traits as TraitRow[] | undefined)?.map((t) => t.name)).toEqual([
      "Size",
      "Darkvision",
      "Fire Resistance",
      "Reach to the Blaze",
    ])
    expect(
      ((flamekin?.traits as TraitRow[] | undefined) ?? []).every((t) => traitHasWiring(t)),
    ).toBe(true)

    const goliath = enriched.species?.find((s) => s.name === "Goliath")
    const giant = (goliath?.traits as TraitRow[] | undefined)?.find((t) => t.name === "Giant Ancestry")
    const cloud = (giant?.choices?.options ?? []).find((o) => o.name === "Cloud's Jaunt")
    expect((cloud?.linkedModifiers?.length ?? 0) > 0).toBe(true)

    for (const speciesName of ["Lorwyn Fairy", "Kithkin"]) {
      const regionalSpecies = enriched.species?.find((s) => s.name === speciesName)
      const regionalOrigin = (regionalSpecies?.traits as TraitRow[] | undefined)?.find(
        (t) => t.name === "Regional Origin",
      )
      expect((regionalOrigin?.choices?.options ?? []).map((o) => o.name)).toEqual([
        "Lorwyn",
        "Shadowmoor",
      ])
      expect(JSON.stringify(regionalOrigin?.choices?.options?.[0]?.linkedModifiers)).not.toMatch(
        /darkvision/i,
      )
      expect(JSON.stringify(regionalOrigin?.choices?.options?.[1]?.linkedModifiers)).toMatch(
        /darkvision/i,
      )
    }
  })
})
