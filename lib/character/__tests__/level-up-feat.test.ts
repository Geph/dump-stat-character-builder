import { describe, expect, it } from "vitest"
import {
  levelUpFeatAllocationPrefix,
  levelUpFeatSlotKey,
  mergeLevelUpFeatPersist,
  normalizeAsiAllocationsMap,
} from "@/lib/character/level-up-feat"
import { buildInputsFromSavedCharacter, computeDerivedCharacter } from "@/lib/character/compute-derived"
import { fighterClass } from "@/lib/character/__tests__/fixtures"
import { collectModifierPlayerChoiceSlots } from "@/lib/builder/modifier-player-choices"
import { enrichSrdFeatRow } from "@/lib/compendium/enrich-srd-feats"
import { SRD_SOURCE } from "@/lib/srd/source"
import type { Feat } from "@/lib/types"

const CLASS_ID = fighterClass.id

describe("level-up feat persist", () => {
  it("keys each milestone slot the same way the builder does", () => {
    expect(levelUpFeatSlotKey(CLASS_ID, "Ability Score Improvement", 4)).toBe(
      `${CLASS_ID}:L4:Ability Score Improvement`,
    )
    expect(levelUpFeatSlotKey(CLASS_ID, "Feat", 8)).toBe(`${CLASS_ID}:L8:Ability Score Improvement`)
    expect(levelUpFeatAllocationPrefix(`${CLASS_ID}:L4:Ability Score Improvement`)).toBe(
      `feat:${CLASS_ID}:L4:Ability Score Improvement`,
    )
  })

  it("writes the feat pick onto the slot and keeps per-level allocations", () => {
    const firstSlot = levelUpFeatSlotKey(CLASS_ID, "Ability Score Improvement", 4)
    const firstKey = `${levelUpFeatAllocationPrefix(firstSlot)}::asi`
    const first = mergeLevelUpFeatPersist({
      featId: "feat_asi",
      slotKey: firstSlot,
      pendingAllocations: { [firstKey]: { strength: 2 } },
      existingFeatIds: [],
      existingPicks: {},
      existingAllocations: {},
    })
    const secondSlot = levelUpFeatSlotKey(CLASS_ID, "Feat", 8)
    const secondKey = `${levelUpFeatAllocationPrefix(secondSlot)}::asi`
    const second = mergeLevelUpFeatPersist({
      featId: "feat_asi",
      slotKey: secondSlot,
      pendingAllocations: { [secondKey]: { dexterity: 2 } },
      existingFeatIds: first.featIds,
      existingPicks: first.featureChoicePicks,
      existingAllocations: first.asiAllocations,
    })

    expect(second.featureChoicePicks[secondSlot]).toEqual(["feat_asi"])
    expect(second.asiAllocations[firstKey]).toEqual({ strength: 2 })
    expect(second.asiAllocations[secondKey]).toEqual({ dexterity: 2 })
  })

  it("parses stringified asi_allocations so scores still apply", () => {
    expect(normalizeAsiAllocationsMap('{"milestone_asi":{"wisdom":2}}')).toEqual({
      milestone_asi: { wisdom: 2 },
    })
  })
})

describe("level-up feat player choices", () => {
  it("surfaces Skilled skill/tool picks for a milestone slot", () => {
    const skilled = enrichSrdFeatRow({
      id: "feat_skilled",
      name: "Skilled",
      source: SRD_SOURCE,
      description: "You gain proficiency in three skills or tools of your choice.",
    }) as unknown as Feat
    const slotKey = levelUpFeatSlotKey(CLASS_ID, "Ability Score Improvement", 4)
    const choicePickKey = levelUpFeatAllocationPrefix(slotKey)
    const slots = collectModifierPlayerChoiceSlots({
      featEntries: [{ featId: skilled.id, choicePickKey }],
      feats: [skilled],
      featChoicePicks: {},
      catalog: [],
    })
    const shared = slots.find((slot) => slot.kind === "skill_or_tool")
    expect(shared).toMatchObject({
      sourceKey: choicePickKey,
      maxCount: 3,
      sharedChoiceGroup: "skilled_proficiencies",
    })
  })
})

describe("level-up ASI allocations on the sheet", () => {
  it("adds allocated ASI points to derived scores", () => {
    const slot = levelUpFeatSlotKey(CLASS_ID, "Ability Score Improvement", 4)
    const allocationKey = `${levelUpFeatAllocationPrefix(slot)}::asi`
    const persist = mergeLevelUpFeatPersist({
      featId: "feat_asi",
      slotKey: slot,
      pendingAllocations: { [allocationKey]: { strength: 2 } },
      existingFeatIds: [],
      existingPicks: {},
      existingAllocations: {},
    })
    const character = {
      strength: 15,
      dexterity: 14,
      constitution: 13,
      intelligence: 10,
      wisdom: 10,
      charisma: 8,
      level: 4,
      class_id: CLASS_ID,
      subclass_id: null,
      character_classes: [{ class_id: CLASS_ID, level: 4, subclass_id: null, order: 0 }],
      species_id: null,
      background_id: null,
      asi_allocations: persist.asiAllocations,
      skill_proficiencies: [],
      tool_proficiencies: [],
      weapon_proficiencies: [],
      armor_proficiencies: [],
      languages: ["Common"],
      equipment_ids: [],
      feat_ids: persist.featIds,
      feature_choice_picks: persist.featureChoicePicks,
    }
    const inputs = buildInputsFromSavedCharacter({
      character,
      classes: [fighterClass],
      species: null,
      background: null,
      feats: [{ id: "feat_asi", name: "Ability Score Improvement" } as Feat],
      equipment: [],
      modifierCatalog: [],
    })
    expect(inputs).not.toBeNull()
    const derived = computeDerivedCharacter(inputs!)
    expect(derived.abilityScores.strength).toBe(17)
    expect(derived.abilityScores.dexterity).toBe(14)
  })
})
