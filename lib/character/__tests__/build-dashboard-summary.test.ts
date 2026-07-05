import { describe, expect, it } from "vitest"
import { parseCompanionStatBlock } from "@/lib/character/parse-companion-stat-block"
import {
  buildDashboardSummary,
  buildDashboardSummaries,
} from "@/lib/character/build-dashboard-summary"
import type { DashboardHydratedCharacter } from "@/lib/character/hydrate-dashboard"
import { companionKey } from "@/lib/character/companion-stat-block"
import { barbarianShieldFixture, barbarianClass } from "@/lib/character/__tests__/fixtures"
import { computeDerivedCharacter } from "@/lib/character/compute-derived"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { Character, DndClass, Feat } from "@/lib/types"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"

const BARBARIAN_CLASS_ID = barbarianClass.id

function baseCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: "char-1",
    local_id: null,
    name: "Throk",
    level: 3,
    experience: 0,
    class_id: BARBARIAN_CLASS_ID,
    subclass_id: null,
    character_classes: [{ class_id: BARBARIAN_CLASS_ID, level: 3, subclass_id: null, order: 0 }],
    class_add_order: [BARBARIAN_CLASS_ID],
    species_id: null,
    background_id: null,
    size: null,
    strength: 16,
    dexterity: 14,
    constitution: 16,
    intelligence: 10,
    wisdom: 12,
    charisma: 8,
    alignment: null,
    personality_traits: null,
    ideals: null,
    bonds: null,
    flaws: null,
    backstory: null,
    appearance: null,
    portrait_url: null,
    banner_url: null,
    asi_allocations: null,
    proficiency_bonus: 2,
    hit_points: 28,
    hit_point_max: 32,
    armor_class: 17,
    initiative: null,
    speed: null,
    skill_proficiencies: ["Athletics"],
    skill_expertise: null,
    tool_proficiencies: null,
    weapon_proficiencies: null,
    armor_proficiencies: null,
    languages: ["Common"],
    equipment_ids: [],
    gold: 0,
    equipped_armor_id: null,
    equipped_shield_id: null,
    equipped_weapon_id: null,
    attuned_item_ids: [],
    equipment_base_selections: null,
    spell_ids: [],
    feat_ids: [],
    feat_choice_picks: null,
    feature_choice_picks: null,
    modifier_player_picks: null,
    companion_state: null,
    sheet_state: {
      activeConditions: ["Poisoned"],
      exhaustionLevel: 0,
      activeSheetToggleIds: [],
      usedResourcesById: {},
      usedActionUsesById: {},
      usedSpellSlotsByKey: {},
      rechargeCapsByResourceId: {},
      currentHp: 24,
      tempHp: 0,
      deathSaves: { successes: 0, failures: 0 },
      hasInspiration: false,
      realTimeCooldowns: {},
      accumulatedResources: {},
      savedAt: "2026-01-01T00:00:00.000Z",
    },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

function barbarianHydrated(overrides: Partial<DashboardHydratedCharacter> = {}): DashboardHydratedCharacter {
  const inputs = barbarianShieldFixture()
  const derived = computeDerivedCharacter(inputs)
  const dndClass = inputs.classes[0] as DndClass
  const classDetails: CharacterClassDetail[] = [
    {
      row: { class_id: dndClass.id, level: 3, subclass_id: null, order: 0 },
      class: { ...dndClass, id: BARBARIAN_CLASS_ID },
      subclass: null,
    },
  ]

  return {
    character: {
      ...baseCharacter(),
      classes: classDetails[0].class,
      class_list: classDetails,
    },
    feats: inputs.feats as Feat[],
    equipment: inputs.equipment,
    equipmentCatalog: inputs.equipmentCatalog ?? inputs.equipment,
    modifierCatalog: inputs.modifierCatalog as ModifierCatalogEntry[],
    customAbilities: [],
    spells: [],
    ...overrides,
  }
}

describe("build-dashboard-summary", () => {
  it("derives combat stats from computeDerivedCharacter and saved play state", () => {
    const summary = buildDashboardSummary(barbarianHydrated())
    expect(summary).not.toBeNull()
    expect(summary!.name).toBe("Throk")
    expect(summary!.classLabel).toContain("Barbarian Level 3")
    expect(summary!.currentHp).toBe(24)
    expect(summary!.armorClass).toBeGreaterThan(0)
    expect(summary!.passivePerception).toBeGreaterThan(0)
    expect(summary!.abilityScores.strength).toBeGreaterThan(0)
    expect(summary!.abilityMods.strength).toBeGreaterThanOrEqual(0)
    expect(summary!.conditions).toContain("Poisoned")
  })

  it("caps resource lines at two entries", () => {
    const hydrated = barbarianHydrated({
      character: {
        ...barbarianHydrated().character,
        sheet_state: {
          ...baseCharacter().sheet_state!,
          usedResourcesById: { [`${BARBARIAN_CLASS_ID}_rage`]: 1 },
        },
      },
    })
    const summary = buildDashboardSummary(hydrated)
    expect(summary).not.toBeNull()
    expect(summary!.resources.length).toBeLessThanOrEqual(2)
  })

  it("returns no companions when none resolve", () => {
    const summary = buildDashboardSummary(barbarianHydrated())
    expect(summary!.companions).toEqual([])
    expect(summary!.extraCompanionCount).toBe(0)
  })

  it("resolves scaled companion HP and AC from saved companion state", () => {
    const reanimated = parseCompanionStatBlock(
      "Reanimated Companion",
      `Reanimated Companion

Medium Undead, Neutral

AC 10 plus your Intelligence modifier

HP 5 plus five times your Artificer level (the companion has a number of Hit Dice [d8s] equal to your Artificer level)

Speed 30 ft.`,
    )!

    const artificerClass: DndClass = {
      id: "class-artificer",
      name: "Artificer",
      description: "",
      hit_die: 8,
      primary_ability: "Intelligence",
      saving_throws: ["Constitution", "Intelligence"],
      skill_choices: { count: 2, options: [] },
      features: [
        {
          name: "Reanimated Companion",
          level: 3,
          description: "You animate a companion.",
          companion_stat_block: reanimated,
        },
      ],
      spellcasting: null,
      class_resources: [],
      source: "Custom",
      creator_url: null,
      created_at: "2026-01-01T00:00:00.000Z",
    }

    const classDetails: CharacterClassDetail[] = [
      {
        row: { class_id: artificerClass.id, level: 5, subclass_id: null, order: 0 },
        class: artificerClass,
        subclass: null,
      },
    ]

    const companionStateKey = companionKey({
      featureName: "Reanimated Companion",
      featureLevel: 3,
      className: "Artificer",
      subclassName: null,
      classId: artificerClass.id,
      subclassId: null,
    })

    const summary = buildDashboardSummary({
      character: {
        ...baseCharacter({
          id: "char-artificer",
          name: "Hexa",
          level: 5,
          class_id: artificerClass.id,
          intelligence: 16,
          character_classes: [{ class_id: artificerClass.id, level: 5, subclass_id: null, order: 0 }],
          companion_state: [{ key: companionStateKey, currentHp: 25, customName: null }],
        }),
        classes: artificerClass,
        class_list: classDetails,
      },
      feats: [],
      equipment: [],
      equipmentCatalog: [],
      modifierCatalog: [],
      customAbilities: [],
      spells: [],
    })

    expect(summary!.companions).toHaveLength(1)
    expect(summary!.companions[0].maxHp).toBe(30)
    expect(summary!.companions[0].ac).toBe(13)
    expect(summary!.companions[0].currentHp).toBe(25)
  })

  it("builds summaries for multiple hydrated rows", () => {
    const summaries = buildDashboardSummaries([
      barbarianHydrated(),
      barbarianHydrated({ character: { ...baseCharacter({ id: "char-2", name: "B" }), class_list: barbarianHydrated().character.class_list } }),
    ])
    expect(summaries).toHaveLength(2)
  })
})
