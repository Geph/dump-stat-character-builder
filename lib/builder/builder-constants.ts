import {
  ClipboardCheck,
  Dices,
  Package,
  Shield,
  UserCircle,
  Users,
} from "lucide-react"
import type { CharacterDraft } from "@/lib/types"

export const BUILDER_STEPS = [
  { id: 1, label: "Class & Level", icon: Shield },
  { id: 2, label: "Origin", icon: Users },
  { id: 3, label: "Abilities", icon: Dices },
  { id: 4, label: "Gear & Spells", icon: Package },
  { id: 5, label: "Details", icon: UserCircle },
  { id: 6, label: "Review", icon: ClipboardCheck },
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
