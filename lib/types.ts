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
}

// Trait with choice support for species
export interface Trait {
  name: string
  description: string
  isChoice?: boolean
  choices?: FeatureChoice
}

// Lineage for species variants
export interface Lineage {
  name: string
  description: string
  traits: Trait[]
}

export interface Species {
  id: string
  name: string
  description: string | null
  speed: number
  size: string | null
  traits: Trait[]
  lineages: Lineage[]
  icon: string | null
  source: string
  created_at: string
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
  features: Feature[]
  spellcasting: {
    ability: string
    cantrips?: number
    spells_known?: number
    prepared?: boolean
    spellbook?: boolean
    pact_magic?: boolean
    starts_at?: number
  } | null
  icon: string | null
  source: string
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
  source: string
  created_at: string
}

export interface CustomAbility {
  id: string
  name: string
  description: string | null
  prerequisites: string | null
  attached_to_type: string | null
  attached_to_id: string | null
  uses_type: 'fixed' | 'proficiency' | 'short_rest' | 'long_rest' | 'unlimited' | null
  uses_amount: number | null
  source: string
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
  equipment: unknown
  feature: { name: string; description: string } | null
  source: string
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
  source: string
  created_at: string
}

export interface Feat {
  id: string
  name: string
  description: string | null
  prerequisite: string | null
  benefits: unknown
  source: string
  created_at: string
}

export interface Equipment {
  id: string
  name: string
  category: string
  subcategory: string | null
  cost: { amount: number; unit: string } | null
  weight: number | null
  properties: unknown
  description: string | null
  source: string
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
  proficiency_bonus: number
  hit_points: number | null
  hit_point_max: number | null
  armor_class: number | null
  initiative: number | null
  speed: number | null
  skill_proficiencies: string[] | null
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
  skill_proficiencies: string[]
  tool_proficiencies?: string[]
  languages: string[]
  equipment_ids: string[]
  spell_ids: string[]
  feat_ids?: string[]
}
