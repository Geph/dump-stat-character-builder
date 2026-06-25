import type { AsiAllocationsByFeatId } from "@/lib/builder/asi-allocation"
import type { FeatSelectionEntry } from "@/lib/builder/feat-choices"
import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type {
  Background,
  CustomAbility,
  DndClass,
  Equipment,
  Feat,
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
  attunedItemIds?: string[]
  equipmentBaseSelections?: Record<string, string>
  modifierCatalog: ModifierCatalogEntry[]
  feats: Feat[]
  customAbilities?: CustomAbility[]
}

export type SkillBonus = {
  name: string
  ability: AbilityScoreKey
  proficient: boolean
  expertise: boolean
  bonus: number
}

export type SaveBonus = {
  ability: AbilityScoreKey
  proficient: boolean
  bonus: number
}

export type WeaponAttackDerived = {
  attackBonus: number
  damageDisplay: string
}

export type DerivedCharacter = {
  abilityScores: Record<AbilityScoreKey, number>
  abilityMods: Record<AbilityScoreKey, number>
  proficiencyBonus: number
  totalLevel: number
  armorClass: number
  maxHp: number
  initiative: number
  speed: number
  passivePerception: number
  skillProficiencies: string[]
  skillExpertise: string[]
  toolProficiencies: string[]
  weaponProficiencies: string[]
  armorProficiencies: string[]
  savingThrowProficiencies: string[]
  languages: string[]
  skills: SkillBonus[]
  saves: SaveBonus[]
  equippedWeaponAttack: WeaponAttackDerived | null
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
