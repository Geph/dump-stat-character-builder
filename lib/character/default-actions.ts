export type DefaultSheetAction = {
  id: string
  name: string
  description: string
}

/** 2024 rules standard actions (plus Grapple, Shove, and Improvise as commonly used options). */
export const DEFAULT_SHEET_ACTIONS: DefaultSheetAction[] = [
  {
    id: "attack",
    name: "Attack",
    description:
      "Attack with a weapon or an Unarmed Strike. When you take this action, you can make one attack roll.",
  },
  {
    id: "dash",
    name: "Dash",
    description:
      "For the rest of the turn, give yourself extra movement equal to your Speed (after applying any modifiers).",
  },
  {
    id: "disengage",
    name: "Disengage",
    description: "Your movement doesn't provoke Opportunity Attacks for the rest of the turn.",
  },
  {
    id: "dodge",
    name: "Dodge",
    description:
      "Until the start of your next turn, attack rolls against you have Disadvantage, and you make Dexterity saving throws with Advantage. You lose this benefit if you have the Incapacitated condition or if your Speed is 0.",
  },
  {
    id: "grapple",
    name: "Grapple",
    description:
      "When you take the Attack action with an Unarmed Strike, you can use it to grapple a creature instead of dealing damage. Make a Strength (Athletics) or Dexterity (Acrobatics) check contested by the target's Strength (Athletics) or Dexterity (Acrobatics). On a success, the target has the Grappled condition.",
  },
  {
    id: "help",
    name: "Help",
    description:
      "Help another creature's ability check or attack roll, or administer first aid to a creature with 0 Hit Points.",
  },
  {
    id: "hide",
    name: "Hide",
    description: "Make a Dexterity (Stealth) check to hide from other creatures.",
  },
  {
    id: "improvise",
    name: "Improvise",
    description:
      "Describe an action not covered by other rules. The GM decides whether it is possible and what D20 Test to make, if any.",
  },
  {
    id: "influence",
    name: "Influence",
    description:
      "Make a Charisma (Deception, Intimidation, Performance, or Persuasion) or Wisdom (Animal Handling) check to alter a creature's attitude.",
  },
  {
    id: "magic",
    name: "Magic",
    description: "Cast a spell, use a magic item, or use a magical feature.",
  },
  {
    id: "ready",
    name: "Ready",
    description:
      "Prepare to take an action in response to a trigger you define. When the trigger occurs, you can take your readied action as a Reaction.",
  },
  {
    id: "search",
    name: "Search",
    description:
      "Make a Wisdom (Insight, Medicine, Perception, or Survival) check to find or notice something.",
  },
  {
    id: "shove",
    name: "Shove",
    description:
      "When you take the Attack action with an Unarmed Strike, you can use it to shove a creature instead of dealing damage. Make a Strength (Athletics) check contested by the target's Strength (Athletics) or Dexterity (Acrobatics). On a success, you push the target up to 5 feet away or knock it Prone.",
  },
  {
    id: "study",
    name: "Study",
    description:
      "Make an Intelligence (Arcana, History, Investigation, Nature, or Religion) check to recall or research information.",
  },
  {
    id: "utilize",
    name: "Utilize",
    description:
      "Use a nonmagical object. You normally interact with an object while doing something else; take this action when an object requires its own action to use.",
  },
]
