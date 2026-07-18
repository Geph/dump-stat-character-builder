import { describe, expect, it } from "vitest"
import { applyFeatNamePreset } from "@/lib/compendium/apply-feat-name-preset"
import { aggregateCharacteristics } from "@/lib/compendium/characteristic-modifiers"
import { collectSheetActions } from "@/lib/character/sheet-actions"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"

describe("Keen Mind / Observant common modifiers", () => {
  it("wires Keen Mind ASI, lore skill with expertiseIfProficient, and Study as Bonus Action", () => {
    const row = applyFeatNamePreset({
      name: "Keen Mind",
      description:
        "You gain the following benefits. Ability Score Increase. Increase your Intelligence score by 1. Lore Knowledge. Choose one of Arcana, History, Investigation, Nature, or Religion. Quick Study. You can take the Study action as a Bonus Action.",
      category: "General",
    })
    const linked = (row.linkedModifiers ?? row.linked_modifiers) as {
      characteristics?: CharacteristicModifier[]
      activation?: {
        bonusAction?: boolean
        effects?: { kind?: string; standardActionStudy?: boolean }[]
      }
    }[]

    const asi = linked
      .flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "ability_scores")
    expect(asi).toMatchObject({
      type: "ability_scores",
      mode: "fixed",
      bonuses: { intelligence: 1 },
    })

    const lore = linked
      .flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "skills")
    expect(lore).toMatchObject({
      type: "skills",
      choiceCount: 1,
      expertiseIfProficient: true,
    })
    if (lore?.type === "skills") {
      expect(lore.entries.map((entry) => entry.skill).sort()).toEqual(
        ["Arcana", "History", "Investigation", "Nature", "Religion"].sort(),
      )
    }

    const study = linked.find((instance) =>
      instance.activation?.effects?.some((effect) => effect.kind === "standard_action"),
    )
    expect(study?.activation?.bonusAction).toBe(true)
    expect(study?.activation?.effects?.[0]).toMatchObject({
      kind: "standard_action",
      standardActionStudy: true,
    })
  })

  it("resolves expertiseIfProficient to a deferred skill list in aggregation", () => {
    const aggregated = aggregateCharacteristics([
      {
        id: "lore",
        type: "skills",
        entries: [{ skill: "Arcana", expertise: false }],
        expertiseIfProficient: true,
      },
    ])
    expect(aggregated.expertiseIfProficientSkills).toEqual(["Arcana"])
    expect(aggregated.skills).toEqual([])
    expect(aggregated.skillExpertise).toEqual([])
  })

  it("surfaces Study as a Bonus Action sheet action from Keen Mind", () => {
    const row = applyFeatNamePreset({
      name: "Keen Mind",
      description: "Study as a Bonus Action.",
      category: "General",
    })
    const actions = collectSheetActions({
      classDetails: [],
      species: null,
      backgroundFeature: {
        name: "Keen Mind",
        description: "Quick Study",
        linkedModifiers: (row.linkedModifiers ?? row.linked_modifiers) as never,
      },
    })
    const study = actions.find((action) => action.name === "Study")
    expect(study?.kinds).toEqual(["bonus"])
  })

  it("wires Observant Search as a Bonus Action with expertiseIfProficient", () => {
    const row = applyFeatNamePreset({
      name: "Observant",
      description: "Search as a Bonus Action.",
      category: "General",
    })
    const linked = (row.linkedModifiers ?? row.linked_modifiers) as {
      characteristics?: CharacteristicModifier[]
      activation?: {
        bonusAction?: boolean
        effects?: { kind?: string; standardActionSearch?: boolean }[]
      }
    }[]
    const skills = linked
      .flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "skills")
    expect(skills).toMatchObject({ expertiseIfProficient: true })
    const search = linked.find((instance) =>
      instance.activation?.effects?.some((effect) => effect.kind === "standard_action"),
    )
    expect(search?.activation?.effects?.[0]).toMatchObject({
      kind: "standard_action",
      standardActionSearch: true,
    })
  })
})
