import type {
  CompanionNamedBlock,
  CompanionStatBlockTemplate,
} from "@/lib/character/companion-stat-block"
import { SRD_FAMILIAR } from "@/lib/character/srd-familiar"
import type { Creature } from "@/lib/types"

/**
 * Form option pools for shape/summon features that resolve against the
 * Creatures & Companions compendium: Druid Wild Shape (eligible Beasts by
 * level) and Find Familiar (standard forms, broadened by Pact of the Chain).
 */

/** 2024 Wild Shape Beast Shapes tiers. */
export type WildShapeTier = {
  minLevel: number
  maxCr: number
  flyAllowed: boolean
  knownForms: number
}

export const WILD_SHAPE_TIERS: WildShapeTier[] = [
  { minLevel: 8, maxCr: 1, flyAllowed: true, knownForms: 8 },
  { minLevel: 5, maxCr: 0.5, flyAllowed: false, knownForms: 6 },
  { minLevel: 2, maxCr: 0.25, flyAllowed: false, knownForms: 4 },
]

/** Recommended starting forms from the 2024 Druid class description. */
export const WILD_SHAPE_RECOMMENDED_FORMS = ["Rat", "Riding Horse", "Spider", "Wolf"]

/** Named forms from the 2024 Find Familiar spell text. */
export const FIND_FAMILIAR_FORMS = [
  "Bat",
  "Cat",
  "Frog",
  "Hawk",
  "Lizard",
  "Octopus",
  "Owl",
  "Rat",
  "Raven",
  "Spider",
  "Weasel",
]

/** Expanded forms available to a Warlock with Pact of the Chain (2024). */
export const PACT_OF_THE_CHAIN_FORMS = [
  "Imp",
  "Pseudodragon",
  "Quasit",
  "Skeleton",
  "Slaad Tadpole",
  "Sphinx of Wonder",
  "Sprite",
  "Venomous Snake",
]

export function crToNumber(cr: string | null | undefined): number | null {
  if (!cr) return null
  const trimmed = cr.trim()
  if (!trimmed || /^none$/i.test(trimmed)) return null
  if (trimmed.includes("/")) {
    const [a, b] = trimmed.split("/")
    const num = Number(a) / Number(b)
    return Number.isFinite(num) ? num : null
  }
  const num = Number(trimmed)
  return Number.isFinite(num) ? num : null
}

export function wildShapeTierForLevel(druidLevel: number): WildShapeTier | null {
  return WILD_SHAPE_TIERS.find((tier) => druidLevel >= tier.minLevel) ?? null
}

function isBeast(creature: Creature): boolean {
  return /\bbeast\b/i.test(creature.creature_type ?? "")
}

function templateHasFlySpeed(template: CompanionStatBlockTemplate): boolean {
  return /\bfly\b/i.test(template.speed ?? "")
}

/**
 * Compendium Beasts a Druid of the given level can adopt with Wild Shape:
 * CR capped by level tier, Fly Speed excluded until level 8. Templates are
 * cloned with polymorph rules enabled.
 */
export function wildShapeEligibleForms(
  creatures: Creature[] | undefined,
  druidLevel: number,
): CompanionStatBlockTemplate[] {
  const tier = wildShapeTierForLevel(druidLevel)
  if (!tier || !creatures?.length) return []

  const forms: CompanionStatBlockTemplate[] = []
  for (const creature of creatures) {
    if (!isBeast(creature) || creature.category === "companion") continue
    const template = creature.stat_block
    if (!template) continue
    const cr = crToNumber(creature.cr ?? template.cr)
    if (cr == null || cr > tier.maxCr) continue
    if (!tier.flyAllowed && templateHasFlySpeed(template)) continue
    forms.push({ ...template, name: creature.name, polymorph: true })
  }
  return forms.sort((a, b) => a.name.localeCompare(b.name))
}

const FAMILIAR_LINK_TRAITS: CompanionNamedBlock[] = [
  {
    name: "Familiar",
    description:
      "The familiar is a spirit — a Celestial, Fey, or Fiend (your choice) instead of its printed type. It acts independently of you but obeys your commands, and it can't take the Attack action unless a feature (such as Pact of the Chain) grants it that ability. When it drops to 0 Hit Points, it vanishes and can be resummoned by casting the spell again.",
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
]

const FAMILIAR_DELIVER_TOUCH: CompanionNamedBlock = {
  name: "Deliver Touch Spells (Reaction)",
  description:
    "While the familiar is within 100 feet of you, it can use its Reaction to deliver a spell you cast that has a range of Touch. The familiar must be within 5 feet of the target.",
}

/**
 * Familiar form options resolvable from the creatures compendium: the named
 * Find Familiar forms plus any other CR 0 Beast; Pact of the Chain adds its
 * expanded special forms.
 */
export function familiarFormOptions(
  creatures: Creature[] | undefined,
  options?: { pactOfTheChain?: boolean },
): CompanionStatBlockTemplate[] {
  if (!creatures?.length) return []

  const namedForms = new Set(FIND_FAMILIAR_FORMS.map((name) => name.toLowerCase()))
  const chainForms = new Set(
    options?.pactOfTheChain ? PACT_OF_THE_CHAIN_FORMS.map((name) => name.toLowerCase()) : [],
  )

  const forms: CompanionStatBlockTemplate[] = []
  for (const creature of creatures) {
    const template = creature.stat_block
    if (!template || creature.category === "companion") continue
    const key = creature.name.trim().toLowerCase()

    const isNamedForm = namedForms.has(key)
    const isChainForm = chainForms.has(key)
    const cr = crToNumber(creature.cr ?? template.cr)
    const isGenericForm = isBeast(creature) && cr === 0

    if (!isNamedForm && !isChainForm && !isGenericForm) continue
    forms.push({ ...template, name: creature.name })
  }

  const byName = new Map(forms.map((form) => [form.name.toLowerCase(), form]))
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Merge a chosen animal form with the Find Familiar spell rules: the familiar
 * keeps the form's stat block but gains the spirit traits (telepathy, shared
 * senses, touch-spell delivery).
 */
export function familiarTemplateForForm(
  form: CompanionStatBlockTemplate,
): CompanionStatBlockTemplate {
  const sizeType = form.sizeTypeAlignment
    ? form.sizeTypeAlignment.replace(/\bBeast\b/i, "Celestial, Fey, or Fiend (your choice)")
    : SRD_FAMILIAR.sizeTypeAlignment
  return {
    ...form,
    name: `Familiar (${form.name})`,
    sizeTypeAlignment: sizeType,
    traits: [...(form.traits ?? []), ...FAMILIAR_LINK_TRAITS],
    reactions: [...(form.reactions ?? []), FAMILIAR_DELIVER_TOUCH],
    polymorph: false,
  }
}
