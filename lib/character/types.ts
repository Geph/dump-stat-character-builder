import type { AsiAllocationsByFeatId } from "@/lib/builder/asi-allocation"
import type { FeatSelectionEntry } from "@/lib/builder/feat-choices"
import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import type { SheetToggleKey } from "@/lib/compendium/characteristic-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type {
  Background,
  CustomAbility,
  DndClass,
  Equipment,
  Feat,
  Feature,
  Species,
  Subclass,
} from "@/lib/types"

export type ClassLevelEntry = { classId: string; level: number }

export type CharacterBuildInputs = {
  baseAbilityScores: Record<AbilityScoreKey, number>
  asiAllocations: AsiAllocationsByFeatId
  background: Background | null
  species: Species | null
  classLevels: ClassLevelEntry[]
  classes: DndClass[]
  subclasses: Subclass[]
  subclassByClassId: Record<string, string>
  primaryClassId: string | null
  classAddOrder?: string[]
  classSkillPicks: Record<string, string[]>
  classToolPicks: Record<string, string[]>
  featureChoicePicks: Record<string, string[]>
  speciesTraitPicks: Record<string, string[]>
  featChoicePicks: Record<string, string[]>
  modifierPlayerPicks: Record<string, string[]>
  selectedFeatIds: string[]
  grantedFeatIds: string[]
  featSelectionEntries: FeatSelectionEntry[]
  extraSkillProficiencies: string[]
  extraToolProficiencies: string[]
  extraWeaponProficiencies: string[]
  extraArmorProficiencies: string[]
  languages: string[]
  equipment: Equipment[]
  /** Full compendium catalog for resolving magic item base stats (defaults to `equipment`). */
  equipmentCatalog?: Equipment[]
  equippedArmorId: string | null
  equippedShieldId: string | null
  equippedWeaponId: string | null
  equippedOffHandWeaponId?: string | null
  attunedItemIds?: string[]
  equipmentBaseSelections?: Record<string, string>
  modifierCatalog: ModifierCatalogEntry[]
  feats: Feat[]
  customAbilities?: CustomAbility[]
  /** Sheet toggles for gated modifiers (Rage, below half HP, etc.). */
  activeSheetToggles?: ReadonlySet<SheetToggleKey>
  /** Equipment ids bound to weapon spell buffs (Magic Weapon, Elemental Weapon). */
  sheetToggleWeaponIds?: Record<string, string>
  /** Active conditions on the sheet (Incapacitated, Poisoned, etc.). */
  activeConditions?: string[]
  /** Per-session exhaustion level (0–6). */
  exhaustionLevel?: number
  /** Current HP for hp_threshold limitations (Survivor, etc.). */
  currentHp?: number
  /** Enriched class/subclass features for gated FeatureEffect consumers (Rage damage, JoAT, etc.). */
  resolvedFeatures?: Feature[]
  /** House-rule remaps of which ability governs a skill check. */
  skillAbilityOverrides?: Record<string, AbilityScoreKey>
}

export type SkillBonus = {
  name: string
  ability: AbilityScoreKey
  /** SRD or custom-skill default before a house-rule remap. */
  defaultAbility?: AbilityScoreKey
  proficient: boolean
  expertise: boolean
  bonus: number
}

export type SaveBonus = {
  ability: AbilityScoreKey
  proficient: boolean
  bonus: number
  /** Ability actually used when an alternate-ability characteristic remaps this save. */
  governingAbility?: AbilityScoreKey
  /** Extra bonus from self-affecting auras (e.g. Aura of Protection). */
  auraBonus?: number
}

export type DerivedSpellcastingEntry = {
  classId: string
  className: string
  ability: AbilityScoreKey
  abilityLabel: string
  abilityMod: number
  /** Final spell save DC including feature bonuses (e.g. Innate Sorcery). */
  saveDc: number
  attackBonus: number
  /** Portion of saveDc from FeatureEffect spell_save_dc bonuses (already included). */
  saveDcFeatureBonus: number
}

export type DerivedForcedSaveRemap = {
  fromAbility: string
  toAbility: string
  scope: "your_spells" | "your_features" | "all"
  label?: string
}

export type DerivedSpecialSaveDc = {
  classId: string
  className: string
  label: string
  ability: AbilityScoreKey
  abilityLabel: string
  abilityMod: number
  dc: number
}

export type DerivedTelepathy = {
  rangeFeet: number
  label?: string
}

export type WeaponAttackDerived = {
  attackBonus: number
  damageDisplay: string
  /** Itemized contributions whose values sum to `attackBonus`. */
  attackBreakdown: StatBreakdownPart[]
  /** Ability modifier used for attack rolls (after weapon ability overrides). */
  attackAbilityMod: number
  /** Ability modifier used for damage rolls (after weapon ability overrides). */
  damageAbilityMod: number
  /** True when Overkill or similar has applied the ability modifier to this damage. */
  includesAbilityModifierOnDamage: boolean
}

/** A single labeled contribution to a derived statistic (e.g. Armor Class). */
export type StatBreakdownPart = {
  label: string
  value: number
}

export type ToolBonus = {
  name: string
  ability: AbilityScoreKey
  proficient: boolean
  expertise: boolean
  bonus: number
}

export type DerivedCharacter = {
  abilityScores: Record<AbilityScoreKey, number>
  abilityMods: Record<AbilityScoreKey, number>
  asiBonuses: Partial<Record<AbilityScoreKey, number>>
  proficiencyBonus: number
  totalLevel: number
  armorClass: number
  /** Itemized contributions whose values sum to `armorClass`. */
  acBreakdown: StatBreakdownPart[]
  /** Competing base AC formulas when multiclass or magic items apply. */
  acFormulaOptions: import("@/lib/compendium/characteristic-modifiers").AcFormulaOption[]
  maxHp: number
  initiative: number
  speed: number
  /** All movement modes (walk, fly, swim, etc.) when present. */
  speeds: import("@/lib/character/resolve-all-speeds").CharacterSpeedEntry[]
  passivePerception: number
  passiveInsight: number
  passiveInvestigation: number
  skillProficiencies: string[]
  skillExpertise: string[]
  toolProficiencies: string[]
  weaponProficiencies: string[]
  armorProficiencies: string[]
  savingThrowProficiencies: string[]
  languages: string[]
  skills: SkillBonus[]
  tools: ToolBonus[]
  saves: SaveBonus[]
  spellcasting: DerivedSpellcastingEntry[]
  /** Per-source rules for spells granted by feats, species, backgrounds, and features. */
  grantedSpellCasts: import("@/lib/character/free-cast-spells").GrantedSpellCastProfile[]
  /** Non-spell class save DCs (Maneuver, Technique, Psionic, …). */
  specialSaveDcs: DerivedSpecialSaveDc[]
  forcedSaveRemaps: DerivedForcedSaveRemap[]
  telepathy: DerivedTelepathy | null
  restReplacement: {
    restHours: number
    replacesLongRest: boolean
    description: string
  } | null
  magicalSleepImmunity: boolean
  noSleepRequired: boolean
  /** Darkvision/tremorsense/etc, merged from species-trait text and CharacteristicModifiers. */
  vision: { type: string; rangeFeet: number }[]
  resistances: string[]
  immunities: string[]
  conditionImmunities: string[]
  /** Feature / item names that grant each listed condition immunity. */
  conditionImmunitySources: Record<string, string[]>
  /** Passive movement rules (Halfling Nimbleness, Naturally Stealthy, Spider Climb, …). */
  movementEffects: import("@/lib/compendium/characteristic-modifiers").AggregatedCharacteristics["movementEffects"]
  /** Extra-turn rules (Thief's Reflexes, etc) — informational; no turn-order simulation exists. */
  extraTurns: import("@/lib/compendium/characteristic-modifiers").ExtraTurnCharacteristic[]
  healingReceivedModifiers: import("@/lib/compendium/characteristic-modifiers").HealingReceivedModifierCharacteristic[]
  spellHealingModifiers: import("@/lib/compendium/characteristic-modifiers").SpellHealingModifierCharacteristic[]
  grantedCustomAbilityNames: string[]
  /** Items unlocked features put in the bag (Investigator Trinkets), by name. */
  grantedEquipment: import("@/lib/compendium/characteristic-modifiers").GrantedEquipmentEntry[]
  /** Upgrades applied to custom abilities the character already knows. */
  customAbilityModifications: import("@/lib/compendium/characteristic-modifiers").ModifyCustomAbilityCharacteristic[]
  featureChoiceCountBonuses: import("@/lib/compendium/characteristic-modifiers").FeatureChoiceCountBonusCharacteristic[]
  featureChoiceOptionGrants: import("@/lib/compendium/characteristic-modifiers").FeatureChoiceOptionGrantCharacteristic[]
  powerRiders: import("@/lib/compendium/characteristic-modifiers").PowerRiderCharacteristic[]
  weaponAbilityOverrides: import("@/lib/compendium/characteristic-modifiers").WeaponAbilityOverrideCharacteristic[]
  equippedWeaponAttack: WeaponAttackDerived | null
  equippedOffHandWeaponAttack: WeaponAttackDerived | null
  /** Synthetic Unarmed Strike — always available on the Combat tab. */
  unarmedStrikeWeapon: import("@/lib/types").Equipment | null
  unarmedStrikeAttack: WeaponAttackDerived | null
  attunementSlots: number
}

export type CharacterSaveSnapshot = {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  hit_point_max: number
  armor_class: number
  initiative: number
  speed: number
  proficiency_bonus: number
  skill_proficiencies: string[]
  skill_expertise: string[]
  tool_proficiencies: string[]
  weapon_proficiencies: string[]
  armor_proficiencies: string[]
  languages: string[]
  character_classes: import("@/lib/character/character-classes").CharacterClassRow[]
  class_add_order: string[]
}
