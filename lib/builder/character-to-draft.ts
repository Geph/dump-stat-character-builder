import type { Background, Character, CharacterDraft, DndClass } from "@/lib/types"
import type { BuilderDraftSnapshot } from "@/lib/builder/draft-storage"

function deriveClassSkillPicks(
  character: Character,
  dndClass: DndClass | null | undefined,
  background: Background | null | undefined,
): Record<string, string[]> {
  if (!character.class_id || !dndClass?.skill_choices?.options?.length) return {}

  const bgSkills = new Set(background?.skill_proficiencies ?? [])
  const classOptions = new Set(dndClass.skill_choices.options)
  const picks = (character.skill_proficiencies ?? []).filter(
    (skill) => classOptions.has(skill) && !bgSkills.has(skill),
  )

  return picks.length ? { [character.class_id]: picks } : {}
}

export function characterToDraft(character: Character): CharacterDraft {
  return {
    name: character.name,
    level: character.level,
    class_id: character.class_id,
    subclass_id: character.subclass_id,
    species_id: character.species_id,
    background_id: character.background_id,
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
    spell_ids: character.spell_ids ?? [],
    feat_ids: character.feat_ids ?? [],
  }
}

export function characterToBuilderState(
  character: Character,
  options: {
    dndClass?: DndClass | null
    background?: Background | null
  } = {},
): Omit<BuilderDraftSnapshot, "version" | "savedAt"> {
  const classLevels = character.class_id
    ? [{ classId: character.class_id, level: character.level }]
    : []

  const subclassByClassId: Record<string, string> = {}
  if (character.class_id && character.subclass_id) {
    subclassByClassId[character.class_id] = character.subclass_id
  }

  const classSkillPicks = deriveClassSkillPicks(character, options.dndClass, options.background)

  const spellPicksByClassId: Record<string, string[]> = {}
  if (character.class_id && character.spell_ids?.length) {
    spellPicksByClassId[character.class_id] = character.spell_ids
  }

  return {
    currentStep: 1,
    maxStepReached: 6,
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
    equippedArmorId: null,
    equippedShieldId: null,
    equippedWeaponId: null,
    classLevels,
    subclassByClassId,
    classSkillPicks,
    featureChoicePicks: {},
    speciesTraitPicks: {},
    startingEquipmentOptionIndex: null,
    spellPicksByClassId,
    asiAllocationsByFeatId: (character.asi_allocations as Record<string, Partial<Record<string, number>>>) ?? {},
    currentHp: character.hit_points ?? character.hit_point_max ?? null,
    tempHp: 0,
    editingCharacterId: character.id,
  }
}
