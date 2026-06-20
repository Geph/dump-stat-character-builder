/**
 * Skill example uses from the SRD 5.2.1 "Playing the Game" skill table (SRD p. 9).
 * @see https://www.dndbeyond.com/srd
 */
export const SKILL_DESCRIPTIONS: Record<string, string> = {
  Acrobatics: "Stay on your feet in a tricky situation, or perform an acrobatic stunt.",
  "Animal Handling": "Calm or train an animal, or get an animal to behave in a certain way.",
  Arcana: "Recall lore about spells, magic items, and the planes of existence.",
  Athletics: "Jump farther than normal, stay afloat in rough water, or break something.",
  Deception: "Tell a convincing lie, or wear a disguise convincingly.",
  History: "Recall lore about historical events, people, nations, and cultures.",
  Insight: "Discern a person's mood and intentions.",
  Intimidation: "Awe or threaten someone into doing what you want.",
  Investigation: "Find obscure information in books, or deduce how something works.",
  Medicine: "Diagnose an illness, or determine what killed the recently slain.",
  Nature: "Recall lore about terrain, plants, animals, and weather.",
  Perception: "Using a combination of senses, notice something that's easy to miss.",
  Performance: "Act, tell a story, perform music, or dance.",
  Persuasion: "Honestly and graciously convince someone of something.",
  Religion: "Recall lore about gods, religious rituals, and holy symbols.",
  "Sleight of Hand": "Pick a pocket, conceal a handheld object, or perform legerdemain.",
  Stealth: "Escape notice by moving quietly and hiding behind things.",
  Survival: "Follow tracks, forage, find a trail, or avoid natural hazards.",
}

export function getSkillDescription(skillName: string): string | null {
  return SKILL_DESCRIPTIONS[skillName] ?? null
}
