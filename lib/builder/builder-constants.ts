import {
  Dices,
  Package,
  Shield,
  Sparkles,
  UserCircle,
  Users,
} from "lucide-react"
import type { CharacterDraft } from "@/lib/types"

export const BUILDER_STEP_IDS = {
  CLASS: 1,
  ORIGIN: 2,
  ABILITIES: 3,
  GEAR: 4,
  SPELLS: 5,
  DETAILS: 6,
} as const

export const BUILDER_STEPS = [
  { id: BUILDER_STEP_IDS.CLASS, label: "Class & Level", icon: Shield },
  { id: BUILDER_STEP_IDS.ORIGIN, label: "Origin", icon: Users },
  { id: BUILDER_STEP_IDS.ABILITIES, label: "Abilities", icon: Dices },
  { id: BUILDER_STEP_IDS.GEAR, label: "Gear", icon: Package },
  { id: BUILDER_STEP_IDS.SPELLS, label: "Spells", icon: Sparkles },
  { id: BUILDER_STEP_IDS.DETAILS, label: "Details", icon: UserCircle },
] as const

export const BUILDER_ABILITY_NAMES = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const

export const BUILDER_STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const

export const BUILDER_EMPTY_CHARACTER: CharacterDraft = {
  name: "",
  level: 1,
  class_id: null,
  subclass_id: null,
  species_id: null,
  background_id: null,
  strength: 8,
  dexterity: 8,
  constitution: 8,
  intelligence: 8,
  wisdom: 8,
  charisma: 8,
  skill_proficiencies: [],
  tool_proficiencies: [],
  weapon_proficiencies: [],
  armor_proficiencies: [],
  languages: ["Common"],
  spell_ids: [],
  equipment_ids: [],
  gold: 0,
  feat_ids: [],
  personality_traits: "",
  ideals: "",
  bonds: "",
  flaws: "",
  backstory: "",
  portrait_url: null,
  banner_url: null,
}
