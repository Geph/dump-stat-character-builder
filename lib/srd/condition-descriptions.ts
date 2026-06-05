/** SRD 5.2.1 condition summaries for UI tooltips. */
export const SRD_CONDITIONS = [
  {
    name: "Blinded",
    description:
      "You can't see and automatically fail any ability check that requires sight. Attack rolls against you have advantage, and your attack rolls have disadvantage.",
  },
  {
    name: "Charmed",
    description:
      "You can't attack the charmer or target the charmer with harmful abilities. The charmer has advantage on ability checks to interact socially with you.",
  },
  {
    name: "Deafened",
    description:
      "You can't hear and automatically fail any ability check that requires hearing.",
  },
  {
    name: "Exhaustion",
    description:
      "This condition is cumulative. Each level imposes additional effects: disadvantage on ability checks (level 1), halved speed (level 2), disadvantage on attack rolls and saving throws (level 3), HP maximum halved (level 4), speed reduced to 0 (level 5), and death at level 6.",
  },
  {
    name: "Frightened",
    description:
      "You have disadvantage on ability checks and attack rolls while the source of your fear is within line of sight. You can't willingly move closer to that source.",
  },
  {
    name: "Grappled",
    description:
      "Your speed is 0, and you can't benefit from any bonus to speed. The condition ends if the grappler is incapacitated or if an effect removes you from the grappler's reach.",
  },
  {
    name: "Incapacitated",
    description:
      "You can't take actions, bonus actions, or reactions.",
  },
  {
    name: "Invisible",
    description:
      "You are impossible to see without the aid of magic or a special sense. Attack rolls against you have disadvantage, and your attack rolls have advantage.",
  },
  {
    name: "Paralyzed",
    description:
      "You are incapacitated and can't move or speak. You automatically fail Strength and Dexterity saving throws. Attack rolls against you have advantage, and any hit within 5 feet is a critical hit.",
  },
  {
    name: "Petrified",
    description:
      "You are transformed into a solid inanimate substance along with any nonmagical objects you are wearing or carrying. Your weight increases by a factor of ten, and you stop aging.",
  },
  {
    name: "Poisoned",
    description:
      "You have disadvantage on attack rolls and ability checks.",
  },
  {
    name: "Prone",
    description:
      "You have the prone condition only if you are lying on the ground. Your only movement option is to crawl. You have disadvantage on attack rolls, and attack rolls against you have advantage if the attacker is within 5 feet.",
  },
  {
    name: "Restrained",
    description:
      "Your speed is 0, and you can't benefit from any bonus to speed. Attack rolls against you have advantage, and your attack rolls have disadvantage.",
  },
  {
    name: "Stunned",
    description:
      "You are incapacitated, can't move, and can speak only falteringly. You automatically fail Strength and Dexterity saving throws. Attack rolls against you have advantage.",
  },
  {
    name: "Unconscious",
    description:
      "You are incapacitated, can't move or speak, and are unaware of your surroundings. You drop whatever you are holding and fall prone. Attack rolls against you have advantage, and any hit within 5 feet is a critical hit.",
  },
] as const

export function getConditionDescription(name: string): string | undefined {
  return SRD_CONDITIONS.find((c) => c.name === name)?.description
}
