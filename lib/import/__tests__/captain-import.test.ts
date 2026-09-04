import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  CAPTAIN_BASE_MANEUVERS,
  CAPTAIN_COHORT_SPECIES_DEFS,
  CAPTAIN_COHORT_TYPES,
  sanitizeCaptainFeatures,
} from "@/lib/compendium/captain-feature-wiring"
import { collectBuilderModifierRefIds } from "@/lib/compendium/builder-modifier-refs"
import { collectClassFeatureModifierPlayerChoiceSlots } from "@/lib/builder/modifier-player-choices"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { sanitizeCaptainImportContent } from "@/lib/import/enrichment-presets/packs/captain"
import { detectFeatureModifiers } from "@/lib/import/detect-feature-modifiers"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature } from "@/lib/types"

describe("Captain enrichment", () => {
  it("auto-grants base Battle Tactics maneuvers and does not make a knacks picker", () => {
    const enriched = applyImportEnrichmentPresets({
      classes: [
        {
          name: "Captain",
          description: "",
          hit_die: 8,
          primary_ability: ["Charisma"],
          features: [
            {
              level: 1,
              name: "Battle Tactics",
              description: "You learn maneuvers fueled by Battle Dice.",
            },
          ],
        },
      ],
      abilities: [
        {
          name: "Bolster",
          description: "Expend one Battle Die to motivate an ally.",
          source_type: "class",
          source_name: "Captain",
          level_requirement: 1,
        },
      ],
    } as unknown as ImportContent)

    const tactics = enriched.classes?.[0]?.features?.find((f) => f.name === "Battle Tactics") as Feature
    expect(tactics.choices?.optionsSource).not.toBe("class_knacks")
    const grant = (tactics.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "grant_custom_ability")
    expect(grant).toMatchObject({
      type: "grant_custom_ability",
      abilityNames: expect.arrayContaining([...CAPTAIN_BASE_MANEUVERS]),
    })
    expect(tactics.sheetDisplay?.combatActions).toBe(true)

    const names = [
      ...(enriched.abilities ?? []).map((row) => row.name),
      ...(enriched.import_proposals?.custom_abilities ?? []).map((row) => row.name),
    ]
    for (const name of CAPTAIN_BASE_MANEUVERS) {
      expect(names).toContain(name)
    }
    const bolster = enriched.abilities?.find((row) => row.name === "Bolster")
    expect(bolster?.ability_role).toBe("knack")
  })

  it("keeps subclass [Maneuver] features as combat cards, not knack picks", () => {
    const enriched = applyImportEnrichmentPresets({
      classes: [{ name: "Captain", description: "", hit_die: 8, primary_ability: ["Charisma"], features: [] }],
      subclasses: [
        {
          name: "Eagle Banner",
          class_name: "Captain",
          description: null,
          features: [
            {
              level: 3,
              name: "Eagle Eye [Maneuver]",
              description: "Expend one Battle Die when you miss.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)

    const eye = enriched.subclasses?.[0]?.features?.[0] as Feature
    expect(eye.sheetDisplay?.combatActions).toBe(true)
    expect(eye.choices?.optionsSource).toBeUndefined()
  })

  it("fills missing base maneuvers on sanitize", () => {
    const next = sanitizeCaptainImportContent({
      classes: [
        {
          name: "Captain",
          description: "",
          hit_die: 8,
          primary_ability: ["Charisma"],
          features: [{ level: 1, name: "Battle Tactics", description: "Maneuvers." }],
        },
      ],
      import_proposals: { custom_abilities: [] },
    } as unknown as ImportContent)

    const names = next.import_proposals?.custom_abilities?.map((row) => row.name) ?? []
    expect(names.sort()).toEqual([...CAPTAIN_BASE_MANEUVERS].sort())
  })
})

describe("Captain seed pack", () => {
  it("ships base maneuvers and Battle Tactics auto-grant", () => {
    const seed = JSON.parse(
      readFileSync(join(__dirname, "../../seed-packs/mage-hand-press/magehandpress-captain-class.json"), "utf8"),
    ) as {
      classes: { features: Feature[] }[]
      abilities: { name: string; ability_role?: string }[]
    }
    const tactics = seed.classes[0].features.find((feature) => feature.name === "Battle Tactics")
    const grant = (tactics?.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "grant_custom_ability")
    expect(grant?.abilityNames).toEqual(expect.arrayContaining([...CAPTAIN_BASE_MANEUVERS]))
    const knacks = seed.abilities.filter((ability) => ability.ability_role === "knack").map((a) => a.name)
    expect(knacks).toEqual(expect.arrayContaining([...CAPTAIN_BASE_MANEUVERS]))
  })

  it("asks the player to pick one Cohort type at level 2", () => {
    const seed = JSON.parse(
      readFileSync(join(__dirname, "../../seed-packs/mage-hand-press/magehandpress-captain-class.json"), "utf8"),
    ) as {
      classes: { features: Feature[] }[]
    }
    const cohort = sanitizeCaptainFeatures(seed.classes[0].features)?.find(
      (feature) => feature.name === "Cohort",
    )
    expect(cohort?.isChoice).toBe(true)
    expect(cohort?.choices?.count).toBe(1)
    expect(cohort?.choices?.options?.map((option) => option.name)).toEqual(
      expect.arrayContaining([...CAPTAIN_COHORT_TYPES]),
    )
  })

  it("wires Cohort Species as a companion-scoped picker with all nine traits", () => {
    const seed = JSON.parse(
      readFileSync(join(__dirname, "../../seed-packs/mage-hand-press/magehandpress-captain-class.json"), "utf8"),
    ) as {
      classes: { features: Feature[] }[]
    }
    const features = sanitizeCaptainFeatures(seed.classes[0].features)
    const species = features?.find((feature) => feature.name === "Cohort Species")
    expect(species?.isChoice).toBe(true)
    expect(species?.choices?.applyTo).toBe("companion")
    expect(species?.choices?.applyToCompanionFeature).toBe("Cohort")
    expect(species?.choices?.options?.map((option) => option.name)).toEqual(
      expect.arrayContaining(CAPTAIN_COHORT_SPECIES_DEFS.map((def) => def.name)),
    )
    const dwarf = species?.choices?.options?.find((option) => /^dwarf/i.test(option.name))
    const types = (dwarf?.linkedModifiers ?? []).flatMap((instance) => [
      ...(instance.characteristics ?? []).map((char) => char.type),
    ])
    expect(types).toEqual(expect.arrayContaining(["damage_resistance", "condition_immunity"]))
    const dragonborn = species?.choices?.options?.find((option) => /^dragonborn/i.test(option.name))
    const dragonRes = (dragonborn?.linkedModifiers ?? [])
      .flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "damage_resistance")
    expect(dragonRes?.type).toBe("damage_resistance")
    if (dragonRes?.type === "damage_resistance") {
      expect(dragonRes.choiceOptions).toEqual(["Acid", "Cold", "Fire", "Lightning", "Poison"])
      expect(dragonRes.label).toBe("Cohort Draconic Ancestry")
    }
  })

  it("inserts Cohort Species when the import only has the type picker", () => {
    const features = sanitizeCaptainFeatures([
      { level: 2, name: "Cohort", description: "You gain a loyal Cohort." },
    ])
    const species = features?.find((feature) => feature.name === "Cohort Species")
    expect(species?.isChoice).toBe(true)
    expect(species?.choices?.applyTo).toBe("companion")
    expect(species?.choices?.options).toHaveLength(CAPTAIN_COHORT_SPECIES_DEFS.length)
  })

  it("keeps Cohort Species modifiers off the Captain", () => {
    const features = sanitizeCaptainFeatures([
      { level: 2, name: "Cohort", description: "You gain a loyal Cohort." },
      {
        level: 2,
        name: "Cohort Species",
        description: "When you initiate a new Humanoid Cohort, you can also give it one of the following traits.",
      },
    ])
    const cls = {
      id: "captain-1",
      name: "Captain",
      features,
    } as unknown as import("@/lib/types").DndClass
    const mods = collectBuilderModifierRefIds({
      catalog: [],
      speciesTraitPicks: {},
      feats: [],
      selectedFeatIds: [],
      classLevels: [{ classId: "captain-1", level: 2 }],
      classes: [cls],
      subclasses: [],
      subclassByClassId: {},
      featureChoicePicks: { "captain-1:L2:Cohort Species": ["Dwarf: Resistances and Immunities"] },
    })
    expect(mods.some((mod) => mod.type === "damage_resistance")).toBe(false)
    expect(mods.some((mod) => mod.type === "condition_immunity")).toBe(false)
  })
})

describe("Captain fixture enrichment", () => {
  it("turns the intro-only Cohort Species row into a companion-scoped picker", () => {
    const fixture = JSON.parse(
      readFileSync(join(__dirname, "./fixtures/captain-class.json"), "utf8"),
    ) as ImportContent
    const enriched = applyImportEnrichmentPresets(fixture)
    const species = enriched.classes?.[0]?.features?.find((feature) => feature.name === "Cohort Species") as
      | Feature
      | undefined
    expect(species?.isChoice).toBe(true)
    expect(species?.choices?.applyTo).toBe("companion")
    expect(species?.choices?.options?.map((option) => option.name)).toEqual(
      expect.arrayContaining(CAPTAIN_COHORT_SPECIES_DEFS.map((def) => def.name)),
    )
    const gnome = species?.choices?.options?.find((option) => /^gnome/i.test(option.name))
    const slots = collectClassFeatureModifierPlayerChoiceSlots({
      classLevels: [{ classId: "captain-1", level: 2 }],
      classes: [{ id: "captain-1", name: "Captain", features: [species!] } as unknown as import("@/lib/types").DndClass],
      subclasses: [],
      subclassByClassId: {},
      featureChoicePicks: { "captain-1:L2:Cohort Species": [gnome!.name] },
      catalog: [],
    })
    expect(slots.some((slot) => slot.kind === "saving_throw")).toBe(true)
    expect(gnome?.linkedModifiers?.length).toBeGreaterThan(0)
  })

  it("detects Valiant Surge as a Battle Die restore on a critical hit", () => {
    const fixture = JSON.parse(
      readFileSync(join(__dirname, "./fixtures/captain-class.json"), "utf8"),
    ) as ImportContent
    const surge = fixture.classes?.[0]?.features?.find((feature) => feature.name === "Valiant Surge")
    expect(surge?.description).toBeTruthy()
    const effect = detectFeatureModifiers(surge!.description ?? "", {
      contentKind: "class_feature",
      sourceName: "Captain",
      featureName: "Valiant Surge",
      level: 7,
    }).find((entry) => entry.ruleId === "resource.refresh_one_on_initiative_or_crit")?.instance
      .activation?.effects?.[0]
    expect(effect).toMatchObject({
      kind: "class_resource",
      classResourceKey: "battle_dice",
      classResourceChange: "increase",
      classResourceAmount: 1,
      resourceRefreshOnCriticalHit: true,
    })
  })
})
