import type { CompanionStatBlockTemplate } from "@/lib/character/companion-stat-block"

const fixed = (value: number) => ({ parts: [{ type: "fixed" as const, value }] })

/**
 * Generic Find Familiar companion (2024 rules). Used by the Druid's Wild Companion,
 * the Warlock's Pact of the Chain, and any caster who has the Find Familiar spell.
 * The familiar takes an animal form, so its physical line varies; the fixed parts of
 * the rules (telepathy, shared senses, touch-spell delivery, action limits) are
 * captured as traits/actions while HP defaults to the animal's listed value.
 */
export const SRD_FAMILIAR: CompanionStatBlockTemplate = {
  name: "Familiar",
  sizeTypeAlignment: "Tiny Celestial, Fey, or Fiend (your choice)",
  ac: fixed(11),
  hp: fixed(1),
  speed: "Varies by chosen form",
  senses: "Telepathic link within 100 ft.; shares its special senses",
  traits: [
    {
      name: "Forms",
      description:
        "The familiar takes the form of a Beast you choose (such as a bat, cat, frog, hawk, owl, rat, raven, or other Tiny animal). It uses that creature's stat block but is a Celestial, Fey, or Fiend (your choice) instead of a Beast, and its Hit Points equal the animal's listed value (usually 1 or 2).",
    },
    {
      name: "Telepathic Link",
      description:
        "While the familiar is within 100 feet of you, you can communicate with it telepathically.",
    },
    {
      name: "Shared Senses",
      description:
        "As a Bonus Action, you can see through the familiar's eyes and hear what it hears until the start of your next turn, gaining the benefits of any special senses it has. During this time, you are Deaf and Blind with regard to your own senses.",
    },
  ],
  actions: [
    {
      name: "General",
      description:
        "The familiar can take any action allowed by its stat block, but it can't take the Attack action unless a feature (such as Pact of the Chain) grants it that ability.",
    },
    {
      name: "Deliver Touch Spells (Reaction)",
      description:
        "While the familiar is within 100 feet of you, it can use its Reaction to deliver a spell you cast that has a range of Touch. The familiar must be within 5 feet of the target.",
    },
  ],
}

/**
 * Class features that summon a familiar via the Find Familiar spell. Wild Companion
 * (Druid) and Pact of the Chain (Warlock) both reskin Find Familiar, so they share
 * the same companion stat block.
 */
export function isFamiliarFeature(className: string, featureName: string): boolean {
  const name = featureName.trim().toLowerCase()
  return name === "wild companion" || name === "pact of the chain"
}

/** Whether a spell name is the Find Familiar spell (any flavor reskin). */
export function isFindFamiliarSpell(spellName: string): boolean {
  return /^find familiar\b/i.test(spellName.trim())
}
