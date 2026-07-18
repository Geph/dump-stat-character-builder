import { resolveAllSpeeds } from "@/lib/character/resolve-all-speeds"
import {
  applyAbilityScoreOverrides,
} from "@/lib/character/apply-characteristic-runtime"
import { normalizeBuilderPicks } from "@/lib/builder/builder-picks"
import {
  inferClassSkillPicks,
  inferSpellPicksByClassId,
} from "@/lib/builder/infer-builder-picks"
import { aggregateAsiBonuses } from "@/lib/builder/asi-allocation"
import { aggregateBackgroundAbilityBonuses } from "@/lib/builder/background-asi"
import { mergeSkillProficiencies } from "@/lib/builder/choices"
import {
  aggregateClassArmorProficiencies,
  aggregateClassToolProficiencies,
  aggregateClassWeaponProficiencies,
  fixedClassSkillProficiencies,
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
  abilityModifierKeyToScoreKey,
  aggregateCharacteristics,
  applyAcCharacteristics,
  applyHpCharacteristics,
  computeInitiative,
  resolveAggregatedAcFormula,
  type SheetToggleKey,
  sumAttackRollModifiers,
  sumDamageRollModifiers,
  type AbilityScoreKey,
  type AggregatedCharacteristics,
} from "@/lib/compendium/characteristic-modifiers"
import {
  calculateArmorClass,
  calculateWeaponAttack,
  getArmorAcText,
  getShieldBonus,
  getWeaponAttackAbility,
  getWeaponDamageText,
  getWeaponPropertyTags,
  isWeaponProficient,
  parseArmorAc,
  type AbilityMods,
} from "@/lib/compendium/combat-stats"
import {
  buildWeaponDamageExpression,
  parseWeaponDamageDice,
} from "@/lib/compendium/weapon-damage-roll"
import {
  characterHasTwoWeaponFighting,
  defaultOffHandIncludesAbilityMod,
} from "@/lib/compendium/two-weapon-fighting"
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
  DerivedForcedSaveRemap,
  DerivedSpellcastingEntry,
  DerivedTelepathy,
  SaveBonus,
  SkillBonus,
  StatBreakdownPart,
  ToolBonus,
  WeaponAttackDerived,
} from "@/lib/character/types"
import {
  collectFeatureDamageBonuses,
  collectFeatureRollBonuses,
  computeRollBonusAmount,
} from "@/lib/character/collect-limited-feature-effects"
import { getExhaustionDerivedEffects } from "@/lib/srd/exhaustion-effects"
import { resolveSpellcastingAbilityKey } from "@/lib/compendium/spell-slots"

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

function buildWeaponAttackDerived(
  weapon: Equipment,
  params: {
    abilityMods: AbilityMods
    proficiencyBonus: number
    weaponProficiencies: string[]
    aggregatedCharacteristics: AggregatedCharacteristics
    featureDamageBonus: number
    includeAbilityModifier?: boolean
  },
): WeaponAttackDerived | null {
  const overrides = params.aggregatedCharacteristics.weaponAbilityOverrides
  const base = calculateWeaponAttack(
    weapon,
    params.abilityMods,
    params.proficiencyBonus,
    isWeaponProficient(weapon, params.weaponProficiencies),
    overrides,
  )
  if (!base) return null

  const weaponProps = getWeaponPropertyTags(weapon)
  const modifierBonus = sumAttackRollModifiers(params.aggregatedCharacteristics, {
    subcategory: weapon.subcategory ?? "",
    properties: weaponProps,
  })
  const damageBonus =
    sumDamageRollModifiers(params.aggregatedCharacteristics, {
      subcategory: weapon.subcategory ?? "",
      properties: weaponProps,
      damageType: weapon.damage_type ?? "",
    }) + params.featureDamageBonus

  const attackBonus = base.attackBonus + modifierBonus
  const attackBreakdown = [...base.attackBreakdown]
  if (modifierBonus !== 0) {
    attackBreakdown.push({ label: "Bonuses", value: modifierBonus })
  }
  if (params.featureDamageBonus > 0) {
    attackBreakdown.push({ label: "Feature damage", value: params.featureDamageBonus })
  }

  const damageDice = parseWeaponDamageDice(getWeaponDamageText(weapon)).oneHanded
  const damageDisplay =
    damageDice != null && params.includeAbilityModifier != null
      ? buildWeaponDamageExpression({
          weapon,
          abilityMods: params.abilityMods,
          dice: damageDice,
          includeAbilityModifier: params.includeAbilityModifier,
          flatDamageBonus: damageBonus,
          overrides,
        })
      : damageBonus > 0
        ? `${base.damageDisplay} + ${damageBonus}`
        : base.damageDisplay

  const attackAbility = getWeaponAttackAbility(weapon, params.abilityMods, {
    overrides,
    forRoll: "attack",
  })
  const damageAbility = getWeaponAttackAbility(weapon, params.abilityMods, {
    overrides,
    forRoll: "damage",
  })

  return {
    attackBonus,
    damageDisplay,
    attackBreakdown,
    attackAbilityMod: attackAbility.mod,
    damageAbilityMod: damageAbility.mod,
  }
}

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

export function classesForHp(inputs: CharacterBuildInputs): { cls: DndClass; level: number }[] {
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

export function calculateBaseMaxHp(
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

function passiveSkillScore(
  skillName: string,
  ability: AbilityScoreKey,
  abilityMods: Record<AbilityScoreKey, number>,
  skillProficiencies: string[],
  skillExpertise: string[],
  proficiencyBonus: number,
): number {
  return (
    10 +
    abilityMods[ability] +
    (skillProficiencies.includes(skillName)
      ? proficiencyBonus * (skillExpertise.includes(skillName) ? 2 : 1)
      : 0)
  )
}

function buildSpellcastingEntries(params: {
  classLevels: { classId: string; level: number }[]
  classes: DndClass[]
  abilityMods: Record<AbilityScoreKey, number>
  proficiencyBonus: number
  aggregatedSpellcastingAbility: AbilityScoreKey | null
  resolvedFeatures: import("@/lib/types").Feature[]
  featureLimitationCtx: import("@/lib/compendium/modifier-limitations").LimitationEvaluationContext
  characterLevel: number
}): DerivedSpellcastingEntry[] {
  const saveDcFeatureBonus =
    params.resolvedFeatures.length > 0
      ? collectFeatureRollBonuses(
          params.resolvedFeatures,
          { kind: "spell_save_dc" },
          {
            ...params.featureLimitationCtx,
            proficiencyBonus: params.proficiencyBonus,
            abilityMods: params.abilityMods,
            characterLevel: params.characterLevel,
          },
        ).total
      : 0

  const entries: DerivedSpellcastingEntry[] = []
  for (const row of params.classLevels) {
    const cls = params.classes.find((entry) => entry.id === row.classId)
    if (!cls?.spellcasting?.ability) continue
    const ability =
      resolveSpellcastingAbilityKey(cls.spellcasting.ability) ??
      params.aggregatedSpellcastingAbility
    if (!ability) continue
    const abilityMod = params.abilityMods[ability]
    const abilityLabel =
      ability.charAt(0).toUpperCase() + ability.slice(1)
    entries.push({
      classId: cls.id,
      className: cls.name,
      ability,
      abilityLabel,
      abilityMod,
      saveDcFeatureBonus,
      saveDc: 8 + params.proficiencyBonus + abilityMod + saveDcFeatureBonus,
      attackBonus: params.proficiencyBonus + abilityMod,
    })
  }
  return entries
}

function buildForcedSaveRemaps(
  remaps: import("@/lib/compendium/characteristic-modifiers").ForcedSaveAbilityRemapCharacteristic[],
): DerivedForcedSaveRemap[] {
  return remaps.map((remap) => ({
    fromAbility: remap.fromAbility,
    toAbility: remap.toAbility,
    scope: remap.scope,
    label: remap.label,
  }))
}

function buildTelepathyDerived(
  telepathy: AggregatedCharacteristics["telepathy"],
): DerivedTelepathy | null {
  if (!telepathy) return null
  return { rangeFeet: telepathy.rangeFeet, label: telepathy.label }
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
  customSkills: import("@/lib/compendium/characteristic-modifiers").CustomSkillDefinition[],
  featureBonusContext?: {
    features: import("@/lib/types").Feature[]
    limitationCtx: import("@/lib/compendium/modifier-limitations").LimitationEvaluationContext
    characterLevel: number
  },
): SkillBonus[] {
  const srdSkillNames = new Set(SKILL_ROWS.map((row) => row.name))

  const buildOne = (
    name: string,
    ability: AbilityScoreKey,
    proficient: boolean,
    expertise: boolean,
  ): SkillBonus => {
    let bonus =
      abilityMods[ability] +
      (proficient ? proficiencyBonus * (expertise ? 2 : 1) : 0)
    if (featureBonusContext) {
      const { total } = collectFeatureRollBonuses(
        featureBonusContext.features,
        { kind: "skill", skillName: name, ability },
        {
          ...featureBonusContext.limitationCtx,
          proficiencyBonus,
          abilityMods,
          characterLevel: featureBonusContext.characterLevel,
          skillProficient: proficient,
        },
      )
      bonus += total
    }
    return { name, ability, proficient, expertise, bonus }
  }

  const srd = SKILL_ROWS.map(({ name, ability }) => {
    const proficient = skillProficiencies.includes(name)
    const expertise = skillExpertise.includes(name)
    return buildOne(name, ability, proficient, expertise)
  })

  const custom = customSkills
    .filter((entry) => entry.name.trim() && !srdSkillNames.has(entry.name.trim()))
    .map((entry) => buildOne(entry.name.trim(), entry.ability, true, entry.expertise))

  return [...srd, ...custom]
}

function toolCheckAbility(toolName: string): AbilityScoreKey {
  const normalized = toolName.toLowerCase()
  if (normalized.includes("thieves")) return "dexterity"
  if (
    normalized.includes("herbalism") ||
    normalized.includes("healer") ||
    normalized.includes("poisoner")
  ) {
    return "wisdom"
  }
  if (
    normalized.includes("smith") ||
    normalized.includes("mason") ||
    normalized.includes("carpenter") ||
    normalized.includes("cobbler") ||
    normalized.includes("cook")
  ) {
    return "strength"
  }
  return "intelligence"
}

function buildToolBonuses(
  proficiencyBonus: number,
  abilityMods: Record<AbilityScoreKey, number>,
  toolProficiencies: string[],
  toolExpertise: string[],
  toolExpertiseAll: boolean,
): ToolBonus[] {
  const uniqueTools = [...new Set(toolProficiencies.map((tool) => tool.trim()).filter(Boolean))]
  return uniqueTools.map((name) => {
    const ability = toolCheckAbility(name)
    const proficient = true
    const expertise = toolExpertiseAll || toolExpertise.some((tool) => tool.toLowerCase() === name.toLowerCase())
    const bonus = abilityMods[ability] + proficiencyBonus * (expertise ? 2 : 1)
    return { name, ability, proficient, expertise, bonus }
  })
}

function saveMatchesAlternateList(saveAbility: AbilityScoreKey, saves: string[]): boolean {
  if (!saves.length) return true
  const label = saveAbility.charAt(0).toUpperCase() + saveAbility.slice(1)
  return saves.some((entry) => {
    const normalized = entry.trim().toLowerCase()
    return normalized === saveAbility || normalized === label.toLowerCase()
  })
}

function resolveGoverningSaveAbility(
  saveAbility: AbilityScoreKey,
  alternates: AggregatedCharacteristics["savingThrowAlternateAbilities"],
): AbilityScoreKey {
  for (const alt of alternates) {
    if (saveMatchesAlternateList(saveAbility, alt.saves ?? [])) {
      return alt.ability
    }
  }
  return saveAbility
}

function buildSaveBonuses(
  proficiencyBonus: number,
  abilityMods: Record<AbilityScoreKey, number>,
  savingThrowProficiencies: string[],
  aggregated: AggregatedCharacteristics,
  characterLevel: number,
): SaveBonus[] {
  let auraBonus = 0
  for (const aura of aggregated.auras) {
    if (aura.affectsSelf === false) continue
    if (!aura.saveBonusConfig) continue
    auraBonus += computeRollBonusAmount(aura.saveBonusConfig, {
      proficiencyBonus,
      abilityMods,
      characterLevel,
    })
  }

  return ABILITY_SCORE_KEYS.map((ability) => {
    const label = ability.charAt(0).toUpperCase() + ability.slice(1)
    const proficient = savingThrowProficiencies.some(
      (entry) => entry.toLowerCase() === ability || entry.toLowerCase() === label.toLowerCase(),
    )
    const governingAbility = resolveGoverningSaveAbility(
      ability,
      aggregated.savingThrowAlternateAbilities,
    )
    const abilityPart = abilityMods[governingAbility]
    const profPart = proficient ? proficiencyBonus : 0
    return {
      ability,
      proficient,
      governingAbility: governingAbility !== ability ? governingAbility : undefined,
      auraBonus: auraBonus !== 0 ? auraBonus : undefined,
      bonus: abilityPart + profPart + auraBonus,
    }
  })
}

const ABILITY_MOD_LABELS: Record<AbilityScoreKey, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
}

/** Itemize the Armor Class contributions so they sum to the value `applyAcCharacteristics` returns. */
function buildAcBreakdown(params: {
  aggregated: AggregatedCharacteristics
  abilityMods: Record<AbilityScoreKey, number>
  proficiencyBonus: number
  dexMod: number
  armor: Equipment | null
  shield: Equipment | null
  shieldBonus: number
  wearingArmor: boolean
}): StatBreakdownPart[] {
  const { aggregated, abilityMods, proficiencyBonus, dexMod, armor, shield, shieldBonus, wearingArmor } =
    params
  const parts: StatBreakdownPart[] = []
  const armoredFlat = wearingArmor ? aggregated.acFlatBonusWhileArmored : 0

  const pushIf = (label: string, value: number) => {
    if (value !== 0) parts.push({ label, value })
  }

  if (aggregated.acFixed != null && aggregated.acFixed > 0) {
    parts.push({ label: "Fixed AC (feature)", value: aggregated.acFixed })
    if (aggregated.acIncludeProficiency) pushIf("Proficiency Bonus", proficiencyBonus)
    pushIf("Feature bonus", aggregated.acFlatBonus)
    pushIf("While armored", armoredFlat)
    pushIf(shield?.name ?? "Shield", shieldBonus)
    return parts
  }

  if (aggregated.acAbilityMods.length > 0) {
    parts.push({ label: "Base (Unarmored Defense)", value: aggregated.acBase })
    for (const key of aggregated.acAbilityMods) {
      const scoreKey = abilityModifierKeyToScoreKey(key)
      parts.push({ label: ABILITY_MOD_LABELS[scoreKey], value: abilityMods[scoreKey] })
    }
    if (aggregated.acIncludeProficiency) pushIf("Proficiency Bonus", proficiencyBonus)
    pushIf("Feature bonus", aggregated.acFlatBonus)
    pushIf("While armored", armoredFlat)
    pushIf(shield?.name ?? "Shield", shieldBonus)
    return parts
  }

  if (armor) {
    const acText = getArmorAcText(armor)
    parts.push({
      label: armor.name,
      value: acText ? parseArmorAc(acText, dexMod) : 10 + dexMod,
    })
  } else {
    parts.push({ label: "Base", value: 10 })
    parts.push({ label: "Dexterity", value: dexMod })
  }
  pushIf(shield?.name ?? "Shield", shieldBonus)
  pushIf("Feature bonus", aggregated.acFlatBonus)
  pushIf("While armored", armoredFlat)
  if (aggregated.acIncludeProficiency) pushIf("Proficiency Bonus", proficiencyBonus)
  return parts
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
    equippedOffHandWeaponId: inputs.equippedOffHandWeaponId ?? null,
    attunedItemIds: inputs.attunedItemIds ?? [],
    modifierCatalog: inputs.modifierCatalog,
  })

  const { armor: equippedArmor, shield: equippedShield, weapon: equippedWeapon, offHandWeapon: equippedOffHandWeapon } =
    resolveEquippedItems(
      inputs.equipment,
      {
        equippedArmorId: inputs.equippedArmorId,
        equippedShieldId: inputs.equippedShieldId,
        equippedWeaponId: inputs.equippedWeaponId,
        equippedOffHandWeaponId: inputs.equippedOffHandWeaponId ?? null,
      },
      inputs.equipmentBaseSelections ?? {},
      inputs.equipmentCatalog,
    )

  const totalLevel =
    inputs.classLevels.length > 0
      ? inputs.classLevels.reduce((sum, row) => sum + row.level, 0)
      : 1

  const aggregatedCharacteristics = aggregateCharacteristics(
    [...builderCharacteristicMods, ...equipmentMagicMods],
    {
      activeSheetToggles: inputs.activeSheetToggles,
      activeConditions: inputs.activeConditions,
      equippedArmor,
      equippedShield,
      currentHp: inputs.currentHp,
      characterLevel: totalLevel,
    },
  )
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

  const abilityScores = applyAbilityScoreOverrides(
    ABILITY_SCORE_KEYS.reduce(
      (scores, key) => {
        const uncapped =
          inputs.baseAbilityScores[key] +
          (aggregatedCharacteristics.abilityBonuses[key] ?? 0) +
          (asiBonuses[key] ?? 0) +
          (backgroundAbilityBonuses[key] ?? 0)
        // Base + racial/fixed + ASI/background cannot exceed 20; feature overrides may still raise.
        scores[key] = Math.min(20, uncapped)
        return scores
      },
      {} as Record<AbilityScoreKey, number>,
    ),
    aggregatedCharacteristics.abilityScoreOverrides,
  )

  const abilityMods = abilityModsFromScores(abilityScores)

  const proficiencyBonus = Math.floor((totalLevel - 1) / 4) + 2

  const skillProficiencies = mergeSkillProficiencies(
    background?.skill_proficiencies,
    inputs.classSkillPicks,
    [
      ...inputs.extraSkillProficiencies,
      ...aggregatedCharacteristics.skills,
      ...fixedClassSkillProficiencies({
        classLevels: inputs.classLevels,
        classes: inputs.classes,
        primaryClassId: inputs.primaryClassId,
      }),
    ],
  )
  const skillExpertise = [...aggregatedCharacteristics.skillExpertise]
  for (const skill of aggregatedCharacteristics.expertiseIfProficientSkills) {
    const name = skill.trim()
    if (!name) continue
    const alreadyProficient = skillProficiencies.some(
      (entry) => entry.toLowerCase() === name.toLowerCase(),
    )
    if (alreadyProficient) {
      if (!skillExpertise.some((entry) => entry.toLowerCase() === name.toLowerCase())) {
        skillExpertise.push(name)
      }
    } else {
      skillProficiencies.push(name)
    }
  }

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

  const maxHpBase = applyHpCharacteristics(
    calculateBaseMaxHp(inputs, abilityMods.constitution),
    aggregatedCharacteristics,
    totalLevel,
  )
  const exhaustionFx = getExhaustionDerivedEffects(inputs.exhaustionLevel ?? 0)
  const maxHp =
    exhaustionFx.hpMaxMultiplier < 1
      ? Math.max(1, Math.floor(maxHpBase * exhaustionFx.hpMaxMultiplier))
      : maxHpBase

  const wearingArmor = Boolean(equippedArmor)
  const shieldBonus = getShieldBonus(equippedShield)
  const baseArmorClass = calculateArmorClass(abilityMods.dexterity, equippedArmor, equippedShield)
  resolveAggregatedAcFormula(aggregatedCharacteristics, {
    selectedFormulaId: inputs.modifierPlayerPicks.ac_formula?.[0] ?? null,
    abilityMods,
    proficiencyBonus,
  })
  const armorClass = applyAcCharacteristics(
    baseArmorClass,
    aggregatedCharacteristics,
    abilityMods,
    proficiencyBonus,
    { shieldBonus, wearingArmor },
  )
  const acBreakdown = buildAcBreakdown({
    aggregated: aggregatedCharacteristics,
    abilityMods,
    proficiencyBonus,
    dexMod: abilityMods.dexterity,
    armor: equippedArmor,
    shield: equippedShield,
    shieldBonus,
    wearingArmor,
  })

  let speed = resolveWalkSpeed(inputs, aggregatedCharacteristics.speed)
  const walkBeforeExhaustion = speed
  if (exhaustionFx.speedMultiplier < 1) {
    speed = Math.floor(speed * exhaustionFx.speedMultiplier)
  }
  if (exhaustionFx.speedZero) speed = 0

  const speeds = resolveAllSpeeds({
    walkSpeed: walkBeforeExhaustion,
    aggregatedSpeed: aggregatedCharacteristics.speed,
    speedEqualToWalk: aggregatedCharacteristics.speedEqualToWalk,
    exhaustionMultiplier: exhaustionFx.speedMultiplier,
    exhaustionZero: exhaustionFx.speedZero,
  })

  const initiative = computeInitiative(
    abilityMods.dexterity,
    aggregatedCharacteristics,
    abilityMods,
    proficiencyBonus,
  )

  const passivePerception = passiveSkillScore(
    "Perception",
    "wisdom",
    abilityMods,
    skillProficiencies,
    skillExpertise,
    proficiencyBonus,
  )
  const passiveInsight = passiveSkillScore(
    "Insight",
    "wisdom",
    abilityMods,
    skillProficiencies,
    skillExpertise,
    proficiencyBonus,
  )
  const passiveInvestigation = passiveSkillScore(
    "Investigation",
    "intelligence",
    abilityMods,
    skillProficiencies,
    skillExpertise,
    proficiencyBonus,
  )

  const featureLimitationCtx = {
    activeConditions: inputs.activeConditions,
    activeSheetToggles: inputs.activeSheetToggles,
    equippedArmor,
    equippedShield,
    currentHp: inputs.currentHp,
  }
  const resolvedFeatures = inputs.resolvedFeatures ?? []
  const spellcasting = buildSpellcastingEntries({
    classLevels: inputs.classLevels,
    classes: inputs.classes,
    abilityMods,
    proficiencyBonus,
    aggregatedSpellcastingAbility: aggregatedCharacteristics.spellcastingAbility,
    resolvedFeatures,
    featureLimitationCtx,
    characterLevel: totalLevel,
  })
  const forcedSaveRemaps = buildForcedSaveRemaps(aggregatedCharacteristics.forcedSaveAbilityRemaps)
  const telepathy = buildTelepathyDerived(aggregatedCharacteristics.telepathy)
  const featureDamageBonus =
    resolvedFeatures.length > 0
      ? collectFeatureDamageBonuses(resolvedFeatures, {
          ...featureLimitationCtx,
          characterLevel: totalLevel,
        }).flatBonus
      : 0

  const hasTwoWeaponFighting = characterHasTwoWeaponFighting(inputs.feats)
  const weaponAttackContext = {
    abilityMods,
    proficiencyBonus,
    weaponProficiencies,
    aggregatedCharacteristics,
    featureDamageBonus,
  }

  const equippedWeaponAttack =
    equippedWeapon && primaryClass
      ? buildWeaponAttackDerived(equippedWeapon, weaponAttackContext)
      : equippedWeapon
        ? buildWeaponAttackDerived(equippedWeapon, {
            ...weaponAttackContext,
            weaponProficiencies: [],
          })
        : null

  const equippedOffHandWeaponAttack =
    equippedOffHandWeapon && primaryClass
      ? buildWeaponAttackDerived(equippedOffHandWeapon, {
          ...weaponAttackContext,
          includeAbilityModifier: defaultOffHandIncludesAbilityMod(
            getWeaponAttackAbility(equippedOffHandWeapon, abilityMods, {
              overrides: aggregatedCharacteristics.weaponAbilityOverrides,
              forRoll: "attack",
            }).mod,
            hasTwoWeaponFighting,
          ),
        })
      : equippedOffHandWeapon
        ? buildWeaponAttackDerived(equippedOffHandWeapon, {
            ...weaponAttackContext,
            weaponProficiencies: [],
            includeAbilityModifier: defaultOffHandIncludesAbilityMod(
              getWeaponAttackAbility(equippedOffHandWeapon, abilityMods, {
                overrides: aggregatedCharacteristics.weaponAbilityOverrides,
                forRoll: "attack",
              }).mod,
              hasTwoWeaponFighting,
            ),
          })
        : null

  return {
    abilityScores,
    abilityMods,
    asiBonuses,
    proficiencyBonus,
    totalLevel,
    armorClass,
    acBreakdown,
    acFormulaOptions: aggregatedCharacteristics.acFormulaOptions,
    maxHp,
    initiative,
    speed,
    speeds,
    passivePerception,
    passiveInsight,
    passiveInvestigation,
    skillProficiencies,
    skillExpertise,
    toolProficiencies,
    weaponProficiencies,
    armorProficiencies,
    savingThrowProficiencies,
    languages,
    skills: buildSkillBonuses(
      proficiencyBonus,
      abilityMods,
      skillProficiencies,
      skillExpertise,
      aggregatedCharacteristics.customSkills,
      resolvedFeatures.length
        ? {
            features: resolvedFeatures,
            limitationCtx: featureLimitationCtx,
            characterLevel: totalLevel,
          }
        : undefined,
    ),
    tools: buildToolBonuses(
      proficiencyBonus,
      abilityMods,
      toolProficiencies,
      aggregatedCharacteristics.toolExpertise,
      aggregatedCharacteristics.toolExpertiseAll,
    ),
    saves: buildSaveBonuses(
      proficiencyBonus,
      abilityMods,
      savingThrowProficiencies,
      aggregatedCharacteristics,
      totalLevel,
    ),
    spellcasting,
    forcedSaveRemaps,
    telepathy,
    restReplacement: aggregatedCharacteristics.restReplacement,
    magicalSleepImmunity: aggregatedCharacteristics.magicalSleepImmunity,
    noSleepRequired: aggregatedCharacteristics.noSleepRequired,
    healingReceivedModifiers: aggregatedCharacteristics.healingReceivedModifiers,
    grantedCustomAbilityNames: aggregatedCharacteristics.grantedCustomAbilityNames,
    featureChoiceCountBonuses: aggregatedCharacteristics.featureChoiceCountBonuses,
    powerRiders: aggregatedCharacteristics.powerRiders,
    equippedWeaponAttack,
    equippedOffHandWeaponAttack,
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
    feature_choice_picks?: Record<string, string[]> | null
    modifier_player_picks?: Record<string, string[]> | null
    builder_picks?: import("@/lib/builder/builder-picks").CharacterBuilderPicks | null
    spell_ids?: string[]
    equipped_armor_id?: string | null
    equipped_shield_id?: string | null
    equipped_weapon_id?: string | null
    equipped_off_hand_weapon_id?: string | null
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
  const builderPicks = normalizeBuilderPicks(character.builder_picks)

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
    classSkillPicks:
      builderPicks.class_skill_picks ??
      inferClassSkillPicks(character as import("@/lib/types").Character, classes, params.background),
    classToolPicks: builderPicks.class_tool_picks ?? {},
    featureChoicePicks: character.feature_choice_picks ?? {},
    speciesTraitPicks: builderPicks.species_trait_picks ?? {},
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
    equippedOffHandWeaponId: character.equipped_off_hand_weapon_id ?? null,
    attunedItemIds: character.attuned_item_ids ?? [],
    equipmentBaseSelections: character.equipment_base_selections ?? {},
    modifierCatalog: params.modifierCatalog,
    feats: params.feats,
  }
}

export { SKILL_ROWS }
