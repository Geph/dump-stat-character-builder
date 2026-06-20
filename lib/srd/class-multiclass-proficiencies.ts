/** 2024 SRD “As a Multiclass Character” proficiency grants (Character Creation, p. 25). */

const MUSICAL_INSTRUMENTS = [
  "Bagpipes",
  "Drum",
  "Dulcimer",
  "Flute",
  "Horn",
  "Lute",
  "Lyre",
  "Pan Flute",
  "Shawm",
  "Viol",
] as const

export type MulticlassSkillChoice = {
  count: number
  /** Pick from the class’s level-1 skill list. */
  fromClassList?: boolean
  /** Pick any skill (Bard multiclass). */
  anySkill?: boolean
}

export type MulticlassToolChoice = {
  count: number
  options: string[]
}

export type MulticlassProficiencyGrant = {
  armor?: string[]
  weapons?: string[]
  /** Granted automatically (e.g. Thieves’ Tools). */
  tools?: string[]
  skillChoice?: MulticlassSkillChoice
  toolChoice?: MulticlassToolChoice
}

export const SRD_CLASS_MULTICLASS_PROFICIENCIES: Record<string, MulticlassProficiencyGrant> = {
  Barbarian: {
    weapons: ["Martial weapons"],
    armor: ["Shields"],
  },
  Bard: {
    armor: ["Light armor"],
    skillChoice: { count: 1, anySkill: true },
    toolChoice: { count: 1, options: [...MUSICAL_INSTRUMENTS] },
  },
  Cleric: {
    armor: ["Light armor", "Medium armor", "Shields"],
  },
  Druid: {
    armor: ["Light armor", "Shields"],
  },
  Fighter: {
    weapons: ["Martial weapons"],
    armor: ["Light armor", "Medium armor", "Shields"],
  },
  Monk: {},
  Paladin: {
    weapons: ["Martial weapons"],
    armor: ["Light armor", "Medium armor", "Shields"],
  },
  Ranger: {
    weapons: ["Martial weapons"],
    armor: ["Light armor", "Medium armor", "Shields"],
    skillChoice: { count: 1, fromClassList: true },
  },
  Rogue: {
    armor: ["Light armor"],
    tools: ["Thieves' Tools"],
    skillChoice: { count: 1, fromClassList: true },
  },
  Sorcerer: {},
  Warlock: {
    armor: ["Light armor"],
  },
  Wizard: {},
}

export function multiclassGrantForClass(className: string): MulticlassProficiencyGrant {
  return SRD_CLASS_MULTICLASS_PROFICIENCIES[className] ?? {}
}
