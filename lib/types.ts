// D&D 2024 Types

// Feature with choice support
export interface FeatureChoice {
  category: string // e.g., "Fighting Style", "Skill Proficiency"
  options: { name: string; description: string }[]
  count: number // how many to choose
}

export interface Feature {
  level: number
  name: string
  description: string
  isChoice?: boolean
  choices?: FeatureChoice
  limitedUses?: UsesConfig | null
}

// Trait with choice support for species
export interface Trait {
  name: string
  description: string
  level?: number // level at which trait becomes available, defaults to 1
  isChoice?: boolean
  choices?: FeatureChoice
}

export interface Species {
  id: string
  name: string
  description: string | null
  speed: number | { [key: string]: number } // e.g. { walking: 30, climbing: 30 }
  size: string | null
  creature_type: string | null
  traits: Trait[]
  characteristics: import("@/lib/compendium/characteristic-modifiers").CharacteristicModifier[] | null
  icon: string | null
  source: string
  creator_url: string | null
  created_at: string
}

export interface StartingEquipmentOption {
  label: string
  items: { name: string; quantity: number }[]
}

export interface StartingEquipmentGroup {
  description: string
  options: StartingEquipmentOption[]
}

export interface SpellProgressionEntry {
  level: number
  cantrips: number
  prepared: number
  max_spell_level: number
}

export interface DndClass {
  id: string
  name: string
  description: string | null
  hit_die: number
  primary_ability: string[] | null
  saving_throws: string[] | null
  armor_proficiencies: string[] | null
  weapon_proficiencies: string[] | null
  skill_choices: { count: number; options: string[] } | null
  starting_equipment: unknown
  starting_equipment_groups: StartingEquipmentGroup[] | null
  starting_gold: number | null
  features: Feature[]
  spellcasting: {
    ability: string
    type?: "prepared" | "pact"
    cantrips?: number
    spells_known?: number
    prepared?: boolean
    spellbook?: boolean
    pact_magic?: boolean
    starts_at?: number
    progression?: SpellProgressionEntry[]
  } | null
  icon: string | null
  source: string
  creator_url: string | null
  created_at: string
}

export interface Subclass {
  id: string
  class_id: string
  name: string
  description: string | null
  features: Feature[]
  spellcasting?: {
    ability: string
    cantrips?: number
    spells_known?: number
  } | null
  icon: string | null
  source: string
  creator_url: string | null
  created_at: string
}

// Uses configuration for abilities with limited uses
export interface UsesAtLevel {
  level: number
  count: number
}

export interface UsesConfig {
  type: 'fixed' | 'proficiency' | 'ability_modifier' | 'custom_ability' | 'at_level' | 'unlimited'
  fixedAmount?: number
  abilityModifier?: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'
  customAbilityId?: string
  atLevelTable?: UsesAtLevel[]
  recharge?: 'short_rest' | 'long_rest' | null
  dieCount?: number
  dieType?: 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | null
}

export interface CustomAbility {
  id: string
  name: string
  description: string | null
  prerequisites: string | null
  characteristics: import("@/lib/compendium/characteristic-modifiers").CharacteristicModifier[] | null
  attached_to_type: string | null
  attached_to_id: string | null
  /** @deprecated Use a "uses" entry in characteristics instead */
  uses: UsesConfig | null
  show_in_builder: boolean
  icon: string | null
  source: string
  creator_url: string | null
  created_at: string
  updated_at: string
}

export interface Background {
  id: string
  name: string
  description: string | null
  ability_bonuses: Record<string, number> | null
  skill_proficiencies: string[] | null
  tool_proficiencies: string[] | null
  feat_granted: string | null
  starting_gold: number | null
  starting_equipment: { name: string; quantity: number }[] | null
  equipment: unknown  // legacy field
  feature: { name: string; description: string } | null
  icon: string | null
  source: string
  creator_url: string | null
  created_at: string
}

export interface Spell {
  id: string
  name: string
  level: number
  school: string
  casting_time: string | null
  range: string | null
  components: string[] | null
  material: string | null
  duration: string | null
  concentration: boolean
  ritual: boolean
  description: string | null
  higher_levels: string | null
  classes: string[] | null
  icon: string | null
  source: string
  creator_url: string | null
  created_at: string
}

export interface Feat {
  id: string
  name: string
  description: string | null
  category: string | null  // "Origin" | "General" | "Fighting Style" | "Epic Boon"
  level_requirement: number | null
  prerequisite: string | null  // legacy field
  prerequisite_feat_ids: string[] | null
  prerequisite_class_ids: string[] | null
  prerequisite_species_ids: string[] | null
  prerequisite_background_ids: string[] | null
  benefits: import("@/lib/compendium/characteristic-modifiers").CharacteristicModifier[] | null
  icon: string | null
  source: string
  creator_url: string | null
  created_at: string
}

export interface Equipment {
  id: string
  name: string
  category: string
  subcategory: string | null
  cost: { amount: number; unit: string } | null
  weight: number | null
  properties: string[] | null
  description: string | null
  // Armor-specific fields
  armor_class?: number | null
  stealth_disadvantage?: boolean
  // Weapon-specific fields
  damage?: string | null // e.g. "1d8"
  damage_type?: string | null // e.g. "slashing", "piercing", "bludgeoning"
  range?: string | null // e.g. "5 ft" or "80/320 ft"
  mastery?: string | null // e.g. "Cleave", "Graze"
  // Attached abilities (for finesse, two-handed, etc.)
  attached_ability_ids?: string[]
  icon: string | null
  source: string
  creator_url: string | null
  created_at: string
}

export interface Character {
  id: string
  local_id: string | null
  name: string
  level: number
  experience: number
  class_id: string | null
  subclass_id: string | null
  species_id: string | null
  background_id: string | null
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  alignment: string | null
  personality_traits: string | null
  ideals: string | null
  bonds: string | null
  flaws: string | null
  backstory: string | null
  appearance: Record<string, string> | null
  portrait_url: string | null
  banner_url: string | null
  asi_allocations: Record<string, Partial<Record<string, number>>> | null
  proficiency_bonus: number
  hit_points: number | null
  hit_point_max: number | null
  armor_class: number | null
  initiative: number | null
  speed: number | null
  skill_proficiencies: string[] | null
  skill_expertise: string[] | null
  tool_proficiencies: string[] | null
  languages: string[] | null
  equipment_ids: string[]
  spell_ids: string[]
  feat_ids: string[]
  created_at: string
  updated_at: string
}

export interface CharacterDraft {
  name: string
  level: number
  class_id: string | null
  subclass_id?: string | null
  species_id: string | null
  background_id: string | null
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  alignment?: string
  personality_traits: string
  ideals: string
  bonds: string
  flaws: string
  backstory: string
  appearance?: Record<string, string>
  portrait_url: string | null
  banner_url?: string | null
  asi_allocations?: Record<string, Partial<Record<string, number>>> | null
  skill_proficiencies: string[]
  tool_proficiencies?: string[]
  languages: string[]
  equipment_ids: string[]
  spell_ids: string[]
  feat_ids?: string[]
}
