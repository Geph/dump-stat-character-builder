import type { Background, Character, CharacterDraft, DndClass, Spell } from "@/lib/types"
import type { BuilderDraftSnapshot } from "@/lib/builder/draft-storage"
import { BUILDER_STEP_IDS } from "@/lib/builder/builder-constants"
import {
  normalizeCharacterClassRows,
  rowsToClassAddOrder,
  rowsToClassLevels,
  rowsToSubclassMap,
} from "@/lib/character/character-classes"
import { normalizeBuilderPicks } from "@/lib/builder/builder-picks"
import {
  inferClassSkillPicks,
  inferSpellPicksByClassId,
} from "@/lib/builder/infer-builder-picks"

export function characterToDraft(character: Character): CharacterDraft {
  return {
    name: character.name,
    level: character.level,
    class_id: character.class_id,
    subclass_id: character.subclass_id,
    species_id: character.species_id,
    background_id: character.background_id,
    size: character.size ?? null,
    strength: character.strength,
    dexterity: character.dexterity,
    constitution: character.constitution,
    intelligence: character.intelligence,
    wisdom: character.wisdom,
    charisma: character.charisma,
    alignment: character.alignment ?? undefined,
    personality_traits: character.personality_traits ?? "",
    ideals: character.ideals ?? "",
    bonds: character.bonds ?? "",
    flaws: character.flaws ?? "",
    backstory: character.backstory ?? "",
    appearance: character.appearance ?? undefined,
    portrait_url: character.portrait_url,
    banner_url: character.banner_url ?? null,
    asi_allocations: character.asi_allocations ?? undefined,
    skill_proficiencies: character.skill_proficiencies ?? [],
    tool_proficiencies: character.tool_proficiencies ?? [],
    weapon_proficiencies: character.weapon_proficiencies ?? [],
    armor_proficiencies: character.armor_proficiencies ?? [],
    languages: character.languages ?? ["Common"],
    equipment_ids: character.equipment_ids ?? [],
    gold: character.gold ?? 0,
    spell_ids: character.spell_ids ?? [],
    feat_ids: character.feat_ids ?? [],
  }
}

export function characterToBuilderState(
  character: Character,
  options: {
    dndClass?: DndClass | null
    background?: Background | null
    allClasses?: DndClass[]
    allSubclasses?: import("@/lib/types").Subclass[]
    spells?: Spell[]
  } = {},
): Omit<BuilderDraftSnapshot, "version" | "savedAt"> {
  const classRows = normalizeCharacterClassRows(character)
  const classLevels = classRows.length
    ? rowsToClassLevels(classRows)
    : character.class_id
      ? [{ classId: character.class_id, level: character.level }]
      : []

  const subclassByClassId = classRows.length
    ? rowsToSubclassMap(classRows)
    : character.class_id && character.subclass_id
      ? { [character.class_id]: character.subclass_id }
      : {}

  const builderPicks = normalizeBuilderPicks(character.builder_picks)
  const allClasses = options.allClasses ?? (options.dndClass ? [options.dndClass] : [])

  const classSkillPicks =
    builderPicks.class_skill_picks ??
    inferClassSkillPicks(character, allClasses, options.background)

  const classToolPicks = builderPicks.class_tool_picks ?? {}

  const spellPicksByClassId =
    builderPicks.spell_picks_by_class_id ??
    inferSpellPicksByClassId(character, allClasses, options.spells ?? [])

  const speciesTraitPicks = builderPicks.species_trait_picks ?? {}

  return {
    currentStep: 1,
    maxStepReached: BUILDER_STEP_IDS.DETAILS,
    character: characterToDraft(character),
    abilityMethod: "pointbuy",
    pointsRemaining: 27,
    classSearch: "",
    speciesSearch: "",
    backgroundSearch: "",
    spellSearch: "",
    equipmentSearch: "",
    previewTab: "summary",
    mobilePanel: "steps",
    equippedArmorId: character.equipped_armor_id ?? null,
    equippedShieldId: character.equipped_shield_id ?? null,
    equippedWeaponId: character.equipped_weapon_id ?? null,
    classLevels,
    subclassByClassId,
    classSkillPicks,
    classToolPicks,
    featureChoicePicks: (character.feature_choice_picks as Record<string, string[]>) ?? {},
    featChoicePicks: (character.feat_choice_picks as Record<string, string[]>) ?? {},
    modifierPlayerPicks: (character.modifier_player_picks as Record<string, string[]>) ?? {},
    primaryClassId: character.class_id,
    classAddOrder:
      character.class_add_order ??
      (classRows.length ? rowsToClassAddOrder(classRows) : classLevels.map((entry) => entry.classId)),
    speciesTraitPicks,
    startingEquipmentOptionIndex: builderPicks.starting_equipment_option_index ?? null,
    backgroundStartingEquipmentOptionIndex:
      builderPicks.background_starting_equipment_option_index ?? null,
    goldPurchasedEquipmentIds: builderPicks.gold_purchased_equipment_ids ?? [],
    spellPicksByClassId,
    asiAllocationsByFeatId: (character.asi_allocations as Record<string, Partial<Record<string, number>>>) ?? {},
    standardArrayAssignments: {},
    currentHp: character.hit_points ?? character.hit_point_max ?? null,
    tempHp: 0,
    editingCharacterId: character.id,
    cardViewMode: "dense",
  }
}
