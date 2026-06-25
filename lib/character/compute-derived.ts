import { aggregateAsiBonuses } from "@/lib/builder/asi-allocation"
import { aggregateBackgroundAbilityBonuses } from "@/lib/builder/background-asi"
import { mergeSkillProficiencies } from "@/lib/builder/choices"
import {
  aggregateClassArmorProficiencies,
  aggregateClassToolProficiencies,
  aggregateClassWeaponProficiencies,
} from "@/lib/builder/multiclass-proficiencies"
import { collectBuilderModifierRefIds } from "@/lib/compendium/builder-modifier-refs"
import {
  collectEquipmentMagicCharacteristics,
  resolveEquippedItems,
} from "@/lib/compendium/equipment-magic-modifiers"
import {
  getEffectiveArmorProficiencies,
  getEffectiveWeaponProficiencies,
  mergeProficiencyLists,
} from "@/lib/compendium/background-proficiencies"
import {
  ABILITY_SCORE_KEYS,
  aggregateCharacteristics,
  applyAcCharacteristics,
  applyHpCharacteristics,
  computeInitiative,
  sumAttackRollModifiers,
  sumDamageRollModifiers,
  type AbilityScoreKey,
} from "@/lib/compendium/characteristic-modifiers"
import {
  calculateArmorClass,
  calculateWeaponAttack,
  getShieldBonus,
  getWeaponPropertyTags,
  isWeaponProficient,
} from "@/lib/compendium/combat-stats"
import type { Background, DndClass, Equipment } from "@/lib/types"
import type { CharacterClassRow } from "@/lib/character/character-classes"
import {
  classLevelsToRows,
  normalizeCharacterClassRows,
  rowsToClassAddOrder,
  rowsToClassLevels,
  rowsToSubclassMap,
  resolvePrimaryClassIdFromRows,
} from "@/lib/character/character-classes"
import type {
  CharacterBuildInputs,
  CharacterSaveSnapshot,
  DerivedCharacter,
  SaveBonus,
  SkillBonus,
} from "@/lib/character/types"

const SKILL_ROWS: { name: string; ability: AbilityScoreKey }[] = [
  { name: "Acrobatics", ability: "dexterity" },
  { name: "Animal Handling", ability: "wisdom" },
  { name: "Arcana", ability: "intelligence" },
  { name: "Athletics", ability: "strength" },
  { name: "Deception", ability: "charisma" },
  { name: "History", ability: "intelligence" },
  { name: "Insight", ability: "wisdom" },
  { name: "Intimidation", ability: "charisma" },
  { name: "Investigation", ability: "intelligence" },
  { name: "Medicine", ability: "wisdom" },
  { name: "Nature", ability: "intelligence" },
  { name: "Perception", ability: "wisdom" },
  { name: "Performance", ability: "charisma" },
  { name: "Persuasion", ability: "charisma" },
  { name: "Religion", ability: "intelligence" },
  { name: "Sleight of Hand", ability: "dexterity" },
  { name: "Stealth", ability: "dexterity" },
  { name: "Survival", ability: "wisdom" },
]

function abilityModsFromScores(scores: Record<AbilityScoreKey, number>) {
  return ABILITY_SCORE_KEYS.reduce(
    (mods, key) => {
      mods[key] = Math.floor((scores[key] - 10) / 2)
      return mods
    },
    {} as Record<AbilityScoreKey, number>,
  )
}

function resolvePrimaryClass(
  inputs: CharacterBuildInputs,
): DndClass | null {
  const primaryId = inputs.primaryClassId ?? inputs.classLevels[0]?.classId ?? null
  if (!primaryId) return null
  return inputs.classes.find((cls) => cls.id === primaryId) ?? null
}

function classesForHp(inputs: CharacterBuildInputs): { cls: DndClass; level: number }[] {
  if (inputs.classLevels.length > 0) {
    return inputs.classLevels
      .map((entry) => ({
        cls: inputs.classes.find((c) => c.id === entry.classId)!,
        level: entry.level,
      }))
      .filter((row) => row.cls)
  }
  const primary = resolvePrimaryClass(inputs)
  if (!primary) return []
  const totalLevel = inputs.classLevels.reduce((sum, row) => sum + row.level, 0) || 1
  return [{ cls: primary, level: totalLevel }]
}

function calculateBaseMaxHp(
  inputs: CharacterBuildInputs,
  conMod: number,
): number {
  const rows = classesForHp(inputs)
  if (!rows.length) return Math.max(8 + conMod, 1)

  let hp = 0
  let isFirstLevel = true
  for (const { cls, level } of rows) {
    const hitDie = cls.hit_die ?? 8
    for (let i = 0; i < level; i++) {
      if (isFirstLevel) {
        hp += hitDie + conMod
        isFirstLevel = false
      } else {
        hp += Math.floor(hitDie / 2) + 1 + conMod
      }
    }
  }
  return Math.max(Number.isFinite(hp) ? hp : 8 + conMod, 1)
}

function resolveWalkSpeed(inputs: CharacterBuildInputs, aggregatedSpeed: Record<string, number>) {
  const species = inputs.species
  const baseWalkSpeed =
    typeof species?.speed === "number"
      ? species.speed
      : typeof species?.speed === "object" && species?.speed
        ? (species.speed as { walking?: number }).walking ?? 30
        : 30
  return aggregatedSpeed.walk ?? baseWalkSpeed
}

function buildSkillBonuses(
  proficiencyBonus: number,
  abilityMods: Record<AbilityScoreKey, number>,
  skillProficiencies: string[],
  skillExpertise: string[],
): SkillBonus[] {
  return SKILL_ROWS.map(({ name, ability }) => {
    const proficient = skillProficiencies.includes(name)
    const expertise = skillExpertise.includes(name)
    const bonus =
      abilityMods[ability] +
      (proficient ? proficiencyBonus * (expertise ? 2 : 1) : 0)
    return { name, ability, proficient, expertise, bonus }
  })
}

function buildSaveBonuses(
  proficiencyBonus: number,
  abilityMods: Record<AbilityScoreKey, number>,
  savingThrowProficiencies: string[],
): SaveBonus[] {
  return ABILITY_SCORE_KEYS.map((ability) => {
    const label = ability.charAt(0).toUpperCase() + ability.slice(1)
    const proficient = savingThrowProficiencies.some(
      (entry) => entry.toLowerCase() === ability || entry.toLowerCase() === label.toLowerCase(),
    )
    return {
      ability,
      proficient,
      bonus: abilityMods[ability] + (proficient ? proficiencyBonus : 0),
    }
  })
}

export function computeDerivedCharacter(inputs: CharacterBuildInputs): DerivedCharacter {
  const primaryClass = resolvePrimaryClass(inputs)
  const background = inputs.background

  const builderCharacteristicMods = collectBuilderModifierRefIds({
    catalog: inputs.modifierCatalog,
    species: inputs.species ?? undefined,
    speciesTraitPicks: inputs.speciesTraitPicks,
    background,
    feats: inputs.feats,
    selectedFeatIds: inputs.selectedFeatIds,
    grantedFeatIds: inputs.grantedFeatIds,
    featSelectionEntries: inputs.featSelectionEntries,
    featChoicePicks: inputs.featChoicePicks,
    modifierPlayerPicks: inputs.modifierPlayerPicks,
    classLevels: inputs.classLevels,
    classes: inputs.classes,
    subclasses: inputs.subclasses,
    subclassByClassId: inputs.subclassByClassId,
    featureChoicePicks: inputs.featureChoicePicks,
    customAbilities: inputs.customAbilities,
  })

  const equipmentMagicMods = collectEquipmentMagicCharacteristics({
    equipment: inputs.equipment,
    equippedArmorId: inputs.equippedArmorId,
    equippedShieldId: inputs.equippedShieldId,
    equippedWeaponId: inputs.equippedWeaponId,
    attunedItemIds: inputs.attunedItemIds ?? [],
    modifierCatalog: inputs.modifierCatalog,
  })

  const aggregatedCharacteristics = aggregateCharacteristics([
    ...builderCharacteristicMods,
    ...equipmentMagicMods,
  ])
  // Source IDs the character currently has, used to discard orphaned ability-score
  // pool allocations left behind after a class/feat/species change.
  const validAsiSourceIds = new Set<string>(
    [
      ...inputs.classLevels.map((entry) => entry.classId),
      ...Object.values(inputs.subclassByClassId ?? {}),
      ...(inputs.selectedFeatIds ?? []),
      ...(inputs.grantedFeatIds ?? []),
      ...(inputs.species?.id ? [inputs.species.id] : []),
    ].filter(Boolean),
  )
  const asiBonuses = aggregateAsiBonuses(inputs.asiAllocations, validAsiSourceIds)
  const backgroundAbilityBonuses = aggregateBackgroundAbilityBonuses(
    background,
    inputs.asiAllocations,
  )

  const abilityScores = ABILITY_SCORE_KEYS.reduce(
    (scores, key) => {
      scores[key] =
        inputs.baseAbilityScores[key] +
        (aggregatedCharacteristics.abilityBonuses[key] ?? 0) +
        (asiBonuses[key] ?? 0) +
        (backgroundAbilityBonuses[key] ?? 0)
      return scores
    },
    {} as Record<AbilityScoreKey, number>,
  )

  const abilityMods = abilityModsFromScores(abilityScores)

  const totalLevel =
    inputs.classLevels.length > 0
      ? inputs.classLevels.reduce((sum, row) => sum + row.level, 0)
      : 1
  const proficiencyBonus = Math.floor((totalLevel - 1) / 4) + 2

  const skillProficiencies = mergeSkillProficiencies(
    background?.skill_proficiencies,
    inputs.classSkillPicks,
    [...inputs.extraSkillProficiencies, ...aggregatedCharacteristics.skills],
  )
  const skillExpertise = [...aggregatedCharacteristics.skillExpertise]

  const aggregatedClassWeaponProficiencies = aggregateClassWeaponProficiencies({
    classLevels: inputs.classLevels,
    classes: inputs.classes,
    primaryClassId: inputs.primaryClassId,
  })
  const aggregatedClassArmorProficiencies = aggregateClassArmorProficiencies({
    classLevels: inputs.classLevels,
    classes: inputs.classes,
    primaryClassId: inputs.primaryClassId,
  })
  const aggregatedClassToolProficiencies = aggregateClassToolProficiencies({
    classLevels: inputs.classLevels,
    classes: inputs.classes,
    primaryClassId: inputs.primaryClassId,
    classToolPicks: inputs.classToolPicks,
  })

  const weaponProficiencies = getEffectiveWeaponProficiencies(
    aggregatedClassWeaponProficiencies,
    inputs.extraWeaponProficiencies,
    aggregatedCharacteristics.weaponProficiencies,
  )
  const armorProficiencies = getEffectiveArmorProficiencies(
    aggregatedClassArmorProficiencies,
    inputs.extraArmorProficiencies,
    aggregatedCharacteristics.armorProficiencies,
  )
  const toolProficiencies = mergeProficiencyLists(
    aggregatedClassToolProficiencies,
    inputs.extraToolProficiencies,
    aggregatedCharacteristics.toolProficiencies,
  )

  const savingThrowProficiencies = [
    ...new Set([
      ...(primaryClass?.saving_throws ?? []),
      ...aggregatedCharacteristics.savingThrows,
    ]),
  ]

  const languages = [
    ...new Set([...inputs.languages, ...aggregatedCharacteristics.languages]),
  ]

  const maxHp = applyHpCharacteristics(
    calculateBaseMaxHp(inputs, abilityMods.constitution),
    aggregatedCharacteristics,
    totalLevel,
  )

  const { armor: equippedArmor, shield: equippedShield, weapon: equippedWeapon } =
    resolveEquippedItems(
      inputs.equipment,
      {
        equippedArmorId: inputs.equippedArmorId,
        equippedShieldId: inputs.equippedShieldId,
        equippedWeaponId: inputs.equippedWeaponId,
      },
      inputs.equipmentBaseSelections ?? {},
      inputs.equipmentCatalog,
    )

  const wearingArmor = Boolean(equippedArmor)
  const shieldBonus = getShieldBonus(equippedShield)
  const baseArmorClass = calculateArmorClass(abilityMods.dexterity, equippedArmor, equippedShield)
  const armorClass = applyAcCharacteristics(
    baseArmorClass,
    aggregatedCharacteristics,
    abilityMods,
    proficiencyBonus,
    { shieldBonus, wearingArmor },
  )

  const speed = resolveWalkSpeed(inputs, aggregatedCharacteristics.speed)

  const initiative = computeInitiative(
    abilityMods.dexterity,
    aggregatedCharacteristics,
    abilityMods,
    proficiencyBonus,
  )

  const passivePerception =
    10 +
    abilityMods.wisdom +
    (skillProficiencies.includes("Perception")
      ? proficiencyBonus * (skillExpertise.includes("Perception") ? 2 : 1)
      : 0)

  const baseEquippedWeaponAttack =
    equippedWeapon && primaryClass
      ? calculateWeaponAttack(
          equippedWeapon,
          abilityMods,
          proficiencyBonus,
          isWeaponProficient(equippedWeapon, weaponProficiencies),
        )
      : equippedWeapon
        ? calculateWeaponAttack(equippedWeapon, abilityMods, proficiencyBonus, false)
        : null

  const equippedWeaponAttack =
    baseEquippedWeaponAttack && equippedWeapon
      ? (() => {
          const weaponProps = getWeaponPropertyTags(equippedWeapon)
          const attackBonus =
            baseEquippedWeaponAttack.attackBonus +
            sumAttackRollModifiers(aggregatedCharacteristics, {
              subcategory: equippedWeapon.subcategory ?? "",
              properties: weaponProps,
            })
          const damageBonus = sumDamageRollModifiers(aggregatedCharacteristics, {
            subcategory: equippedWeapon.subcategory ?? "",
            properties: weaponProps,
            damageType: equippedWeapon.damage_type ?? "",
          })
          const damageDisplay =
            damageBonus > 0
              ? `${baseEquippedWeaponAttack.damageDisplay} + ${damageBonus}`
              : baseEquippedWeaponAttack.damageDisplay
          return { attackBonus, damageDisplay }
        })()
      : baseEquippedWeaponAttack

  return {
    abilityScores,
    abilityMods,
    asiBonuses,
    proficiencyBonus,
    totalLevel,
    armorClass,
    maxHp,
    initiative,
    speed,
    passivePerception,
    skillProficiencies,
    skillExpertise,
    toolProficiencies,
    weaponProficiencies,
    armorProficiencies,
    savingThrowProficiencies,
    languages,
    skills: buildSkillBonuses(proficiencyBonus, abilityMods, skillProficiencies, skillExpertise),
    saves: buildSaveBonuses(proficiencyBonus, abilityMods, savingThrowProficiencies),
    equippedWeaponAttack,
    attunementSlots: aggregatedCharacteristics.attunementSlots ?? 3,
  }
}

export type EquipmentLoadoutIds = {
  armorId: string | null
  shieldId: string | null
  weaponId: string | null
}

/** AC for a hypothetical equipment loadout — same engine as the live character sheet. */
export function deriveArmorClassForLoadout(
  inputs: CharacterBuildInputs,
  loadout: EquipmentLoadoutIds,
): number {
  return computeDerivedCharacter({
    ...inputs,
    equippedArmorId: loadout.armorId,
    equippedShieldId: loadout.shieldId,
    equippedWeaponId: loadout.weaponId,
  }).armorClass
}

/** Snapshot combat/proficiency fields for persistence — derived from the same engine as preview. */
export function buildCharacterSaveSnapshot(
  inputs: CharacterBuildInputs,
  derived: DerivedCharacter,
): CharacterSaveSnapshot {
  return {
    strength: inputs.baseAbilityScores.strength,
    dexterity: inputs.baseAbilityScores.dexterity,
    constitution: inputs.baseAbilityScores.constitution,
    intelligence: inputs.baseAbilityScores.intelligence,
    wisdom: inputs.baseAbilityScores.wisdom,
    charisma: inputs.baseAbilityScores.charisma,
    hit_point_max: derived.maxHp,
    armor_class: derived.armorClass,
    initiative: derived.initiative,
    speed: derived.speed,
    proficiency_bonus: derived.proficiencyBonus,
    skill_proficiencies: derived.skillProficiencies,
    skill_expertise: derived.skillExpertise,
    tool_proficiencies: derived.toolProficiencies,
    weapon_proficiencies: derived.weaponProficiencies,
    armor_proficiencies: derived.armorProficiencies,
    languages: derived.languages,
    character_classes: classLevelsToRows(
      inputs.classLevels,
      inputs.subclassByClassId,
      inputs.classAddOrder ?? inputs.classLevels.map((row) => row.classId),
    ),
    class_add_order: inputs.classAddOrder ?? inputs.classLevels.map((row) => row.classId),
  }
}

/** Recompute derived stats from a saved character row + compendium relations. */
export function buildInputsFromSavedCharacter(params: {
  character: {
    strength: number
    dexterity: number
    constitution: number
    intelligence: number
    wisdom: number
    charisma: number
    level: number
    class_id: string | null
    subclass_id: string | null
    character_classes?: CharacterClassRow[] | null
    class_add_order?: string[] | null
    species_id: string | null
    background_id: string | null
    asi_allocations: Record<string, Partial<Record<AbilityScoreKey, number>>> | null
    skill_proficiencies: string[] | null
    tool_proficiencies: string[] | null
    weapon_proficiencies: string[] | null
    armor_proficiencies: string[] | null
    languages: string[] | null
    equipment_ids: string[]
    feat_ids: string[]
    feat_choice_picks?: Record<string, string[]> | null
    modifier_player_picks?: Record<string, string[]> | null
    equipped_armor_id?: string | null
    equipped_shield_id?: string | null
    equipped_weapon_id?: string | null
    attuned_item_ids?: string[] | null
    equipment_base_selections?: Record<string, string> | null
  }
  classes: DndClass[]
  subclasses?: import("@/lib/types").Subclass[]
  species: import("@/lib/types").Species | null | undefined
  background: Background | null | undefined
  feats: import("@/lib/types").Feat[]
  equipment: Equipment[]
  equipmentCatalog?: Equipment[]
  modifierCatalog: import("@/lib/compendium/modifier-catalog").ModifierCatalogEntry[]
}): CharacterBuildInputs | null {
  const { character, classes } = params
  const classRows = normalizeCharacterClassRows(character as never)
  if (!classRows.length) return null

  const classLevels = rowsToClassLevels(classRows)
  const subclassByClassId = rowsToSubclassMap(classRows)
  const primaryClassId = resolvePrimaryClassIdFromRows(classRows, character.class_id)

  return {
    baseAbilityScores: {
      strength: character.strength,
      dexterity: character.dexterity,
      constitution: character.constitution,
      intelligence: character.intelligence,
      wisdom: character.wisdom,
      charisma: character.charisma,
    },
    asiAllocations: (character.asi_allocations as CharacterBuildInputs["asiAllocations"]) ?? {},
    background: params.background ?? null,
    species: params.species ?? null,
    classLevels,
    classes,
    subclasses: params.subclasses ?? [],
    subclassByClassId,
    primaryClassId,
    classAddOrder: character.class_add_order ?? rowsToClassAddOrder(classRows),
    classSkillPicks: {},
    classToolPicks: {},
    featureChoicePicks: {},
    speciesTraitPicks: {},
    featChoicePicks: character.feat_choice_picks ?? {},
    modifierPlayerPicks: character.modifier_player_picks ?? {},
    selectedFeatIds: character.feat_ids ?? [],
    grantedFeatIds: [],
    featSelectionEntries: [],
    extraSkillProficiencies: character.skill_proficiencies ?? [],
    extraToolProficiencies: character.tool_proficiencies ?? [],
    extraWeaponProficiencies: character.weapon_proficiencies ?? [],
    extraArmorProficiencies: character.armor_proficiencies ?? [],
    languages: character.languages ?? ["Common"],
    equipment: params.equipment,
    equipmentCatalog: params.equipmentCatalog,
    equippedArmorId: character.equipped_armor_id ?? null,
    equippedShieldId: character.equipped_shield_id ?? null,
    equippedWeaponId: character.equipped_weapon_id ?? null,
    attunedItemIds: character.attuned_item_ids ?? [],
    equipmentBaseSelections: character.equipment_base_selections ?? {},
    modifierCatalog: params.modifierCatalog,
    feats: params.feats,
  }
}

export { SKILL_ROWS }
