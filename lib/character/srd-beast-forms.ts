import type {
  CompanionNamedBlock,
  CompanionStatBlockTemplate,
} from "@/lib/character/companion-stat-block"

/**
 * Wild Shape usage directions from the 2024 Druid class description. Shown once at
 * the top of the Companion / Beast Form tab (not repeated on each form), so the
 * rules sit alongside the known Beast stat blocks.
 */
export const WILD_SHAPE_DIRECTIONS: CompanionNamedBlock = {
  name: "Wild Shape",
  description:
    "As a Bonus Action, shape-shift into a Beast form you have learned. You stay in that form for a number of hours equal to half your Druid level, or until you use Wild Shape again, have the Incapacitated condition, or die. You can leave the form early as a Bonus Action. You know four Beast forms (CR 1/4 or lower, no Fly Speed); the Rat, Riding Horse, Spider, and Wolf are recommended. After a Long Rest you can swap one known form for another eligible one.",
}

/**
 * The 2024 "Game Statistics" rule for Wild Shape: your stats are replaced by the
 * Beast's, but you retain your creature type, Hit Points and Hit Point Dice, your
 * Intelligence/Wisdom/Charisma scores, class features, languages, and feats. You
 * keep your skill and saving throw proficiencies (using your Proficiency Bonus) in
 * addition to the creature's, and use the higher modifier when they overlap.
 */
export const WILD_SHAPE_GAME_STATISTICS: CompanionNamedBlock = {
  name: "Game Statistics",
  description:
    "Your game statistics are replaced by the Beast's stat block, but you retain your creature type; Hit Points; Hit Point Dice; Intelligence, Wisdom, and Charisma scores; class features; languages; and feats. You also keep your skill and saving throw proficiencies and use your Proficiency Bonus for them, in addition to gaining the creature's proficiencies. If a skill or saving throw modifier in the Beast's stat block is higher than yours, use the one in the stat block.",
}

const fixed = (value: number) => ({ parts: [{ type: "fixed" as const, value }] })

/**
 * SRD 2024 recommended Beast forms for the Druid's Wild Shape feature. Stats are
 * the creatures' own (fixed) values, since a wild-shaped Druid uses the form's
 * Armor Class and Hit Points.
 */
export const SRD_BEAST_FORMS: CompanionStatBlockTemplate[] = [
  {
    name: "Rat",
    sizeTypeAlignment: "Tiny Beast, Unaligned",
    ac: fixed(10),
    hp: fixed(1),
    speed: "30 ft., Climb 30 ft.",
    abilityScores: {
      strength: { score: 2, modifier: -4, save: -4 },
      dexterity: { score: 11, modifier: 0, save: 0 },
      constitution: { score: 9, modifier: -1, save: -1 },
      intelligence: { score: 2, modifier: -4, save: -4 },
      wisdom: { score: 10, modifier: 0, save: 0 },
      charisma: { score: 4, modifier: -3, save: -3 },
    },
    senses: "Darkvision 30 ft.; Passive Perception 10",
    cr: "0",
    polymorph: true,
    traits: [
      {
        name: "Agile",
        description: "The rat doesn't provoke Opportunity Attacks when it moves out of an enemy's reach.",
      },
    ],
    actions: [
      {
        name: "Bite",
        description: "Melee Attack Roll: +0, reach 5 ft. Hit: 1 Piercing damage.",
      },
    ],
  },
  {
    name: "Riding Horse",
    sizeTypeAlignment: "Large Beast, Unaligned",
    ac: fixed(11),
    hp: fixed(13),
    hitDiceNote: "2d10 + 2",
    speed: "60 ft.",
    abilityScores: {
      strength: { score: 16, modifier: 3, save: 3 },
      dexterity: { score: 10, modifier: 0, save: 0 },
      constitution: { score: 12, modifier: 1, save: 1 },
      intelligence: { score: 2, modifier: -4, save: -4 },
      wisdom: { score: 11, modifier: 0, save: 0 },
      charisma: { score: 7, modifier: -2, save: -2 },
    },
    senses: "Passive Perception 10",
    cr: "1/4",
    polymorph: true,
    traits: [],
    actions: [
      {
        name: "Hooves",
        description: "Melee Attack Roll: +5, reach 5 ft. Hit: 7 (1d8 + 3) Bludgeoning damage.",
      },
    ],
  },
  {
    name: "Spider",
    sizeTypeAlignment: "Tiny Beast, Unaligned",
    ac: fixed(12),
    hp: fixed(1),
    speed: "20 ft., Climb 20 ft.",
    abilityScores: {
      strength: { score: 2, modifier: -4, save: -4 },
      dexterity: { score: 14, modifier: 2, save: 2 },
      constitution: { score: 8, modifier: -1, save: -1 },
      intelligence: { score: 1, modifier: -5, save: -5 },
      wisdom: { score: 10, modifier: 0, save: 0 },
      charisma: { score: 2, modifier: -4, save: -4 },
    },
    senses: "Darkvision 30 ft.; Passive Perception 10",
    cr: "0",
    polymorph: true,
    traits: [
      {
        name: "Spider Climb",
        description:
          "The spider can climb difficult surfaces, including along ceilings, without needing to make an ability check.",
      },
      {
        name: "Web Walker",
        description: "The spider ignores movement restrictions caused by webs.",
      },
    ],
    actions: [
      {
        name: "Bite",
        description:
          "Melee Attack Roll: +4, reach 5 ft. Hit: 1 Piercing damage plus 2 (1d4) Poison damage.",
      },
    ],
  },
  {
    name: "Wolf",
    sizeTypeAlignment: "Medium Beast, Unaligned",
    ac: fixed(12),
    hp: fixed(11),
    hitDiceNote: "2d8 + 2",
    speed: "40 ft.",
    abilityScores: {
      strength: { score: 14, modifier: 2, save: 2 },
      dexterity: { score: 15, modifier: 2, save: 2 },
      constitution: { score: 12, modifier: 1, save: 1 },
      intelligence: { score: 3, modifier: -4, save: -4 },
      wisdom: { score: 12, modifier: 1, save: 1 },
      charisma: { score: 6, modifier: -2, save: -2 },
    },
    senses: "Passive Perception 13",
    cr: "1/4",
    polymorph: true,
    traits: [
      {
        name: "Pack Tactics",
        description:
          "The wolf has Advantage on an attack roll against a creature if at least one of the wolf's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition.",
      },
    ],
    actions: [
      {
        name: "Bite",
        description:
          "Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Piercing damage. If the target is a Large or smaller creature, it has the Prone condition.",
      },
    ],
  },
]

/** Whether a class feature is the Druid's Wild Shape (the Beast form source). */
export function isDruidWildShapeFeature(className: string, featureName: string): boolean {
  return /^druid$/i.test(className.trim()) && /^wild shape$/i.test(featureName.trim())
}
