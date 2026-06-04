export type SkillAbility =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma"

export const SKILLS_DATA: { name: string; ability: SkillAbility }[] = [
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

export const ABILITY_ORDER: SkillAbility[] = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
]

export const ABILITY_ABBREVIATIONS: Record<SkillAbility, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
}

export function groupSkillsByAbility(): { ability: SkillAbility; label: string; skills: typeof SKILLS_DATA }[] {
  return ABILITY_ORDER.map((ability) => ({
    ability,
    label: ABILITY_ABBREVIATIONS[ability],
    skills: SKILLS_DATA.filter((skill) => skill.ability === ability),
  }))
}

/** Flat list: all skills grouped by ability (STR → CHA), alphabetical within each ability. */
export function getSkillsInAbilityOrder(): typeof SKILLS_DATA {
  return ABILITY_ORDER.flatMap((ability) =>
    SKILLS_DATA.filter((skill) => skill.ability === ability).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  )
}
