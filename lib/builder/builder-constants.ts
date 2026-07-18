import {
  Dices,
  Layers,
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
  /** Conditional — Metamagic, Invocations, disciplines/talents, knacks/exploits, etc. */
  CLASS_ABILITIES: 8,
} as const

/**
 * Builder steps in display order. `order` drives navigation/reachability so we can
 * insert CLASS_ABILITIES without renumbering legacy draft step ids 1–6.
 */
export const BUILDER_STEPS = [
  { id: BUILDER_STEP_IDS.CLASS, order: 1, label: "Class & Level", icon: Shield },
  { id: BUILDER_STEP_IDS.CLASS_ABILITIES, order: 2, label: "Class Abilities", icon: Layers },
  { id: BUILDER_STEP_IDS.ORIGIN, order: 3, label: "Origin", icon: Users },
  { id: BUILDER_STEP_IDS.ABILITIES, order: 4, label: "Abilities", icon: Dices },
  { id: BUILDER_STEP_IDS.GEAR, order: 5, label: "Gear", icon: Package },
  { id: BUILDER_STEP_IDS.SPELLS, order: 6, label: "Spells", icon: Sparkles },
  { id: BUILDER_STEP_IDS.DETAILS, order: 7, label: "Details", icon: UserCircle },
] as const

export function builderStepOrder(stepId: number): number {
  return BUILDER_STEPS.find((step) => step.id === stepId)?.order ?? stepId
}

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
