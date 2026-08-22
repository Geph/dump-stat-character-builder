import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  CAPTAIN_BASE_MANEUVERS,
  CAPTAIN_COHORT_TYPES,
  sanitizeCaptainFeatures,
} from "@/lib/compendium/captain-feature-wiring"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { sanitizeCaptainImportContent } from "@/lib/import/enrichment-presets/packs/captain"
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
})
