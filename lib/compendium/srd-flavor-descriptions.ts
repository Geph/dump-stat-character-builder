import { isSrdSource } from "@/lib/srd/source"

/** Short flavor summaries for SRD compendium cards (not stat-block filler). */
export const SRD_SPECIES_DESCRIPTIONS: Record<string, string> = {
  Aasimar:
    "Mortals touched by celestial power, often radiating a faint inner light and capable of channeling radiant energy.",
  Dragonborn:
    "Descendants of dragons with scaled skin and a draconic breath weapon tied to their ancestry's elemental type.",
  Dwarf:
    "Hardy, long-lived folk known for resilience, craftsmanship, and a deep connection to stone and tradition.",
  Elf:
    "Graceful, long-lived people with keen senses and a natural affinity for magic or the wilds, depending on their lineage.",
  Gnome:
    "Small, inventive folk with a knack for tinkering, illusion, or both, and an irrepressible curiosity.",
  Goliath:
    "Towering, mountain-bred people with great physical resilience and a culture built around endurance and competition.",
  Halfling:
    "Small, nimble, and famously lucky folk known for their bravery in the face of danger and their love of comfort.",
  Human:
    "Versatile and adaptable, humans make up for a lack of innate magic with sheer breadth of skill and ambition.",
  Orc:
    "Strong, driven people with great stamina and a fierce reputation, often shaped by perseverance against adversity.",
  Tiefling:
    "Mortals bearing a fiendish heritage, marked by infernal features and an innate spark of otherworldly magic.",
}

export const SRD_BACKGROUND_DESCRIPTIONS: Record<string, string> = {
  Acolyte:
    "Raised in service to a temple or faith, skilled in religious knowledge and ritual.",
  Artisan:
    "Trained in a craft trade, skilled with tools and the business of making things.",
  Charlatan:
    "A practiced trickster skilled in deception, disguise, and reading people.",
  Criminal:
    "Someone who's lived outside the law, comfortable with stealth and shady connections.",
  Entertainer:
    "A performer skilled at captivating a crowd, whether through music, acrobatics, or showmanship.",
  Farmer:
    "Raised working the land, hardy and practical with a good understanding of animals and tools.",
  Guard:
    "Trained to watch, protect, and enforce order, often with military-adjacent discipline.",
  Guide:
    "Experienced in wilderness travel, skilled at navigation and survival.",
  Hermit:
    "Someone who spent long periods in isolation, often gaining insight into medicine, religion, or themselves.",
  Merchant:
    "Skilled in trade and negotiation, with a good head for persuasion and commerce.",
  Noble:
    "Raised with wealth and status, skilled in etiquette, history, and the art of persuasion.",
  Sage:
    "A devoted scholar with deep book learning and a thirst for arcane or historical knowledge.",
  Sailor:
    "Seasoned by life at sea, skilled in athletics, navigation, and rough-and-tumble survival.",
  Scribe:
    "Trained in careful writing and record-keeping, with sharp attention to detail.",
  Soldier:
    "Trained for war, skilled in tactics, athletics, and the discipline of military life.",
  Wayfarer:
    "A streetwise traveler skilled at slipping by unnoticed and surviving on wit alone.",
}

export const SRD_CLASS_DESCRIPTIONS: Record<string, string> = {
  Barbarian:
    "A fierce warrior who channels primal rage into devastating melee combat and supernatural resilience.",
  Bard:
    "A magical performer who weaves music and words into spells, support, and clever versatility.",
  Cleric:
    "A divine spellcaster who channels the power of a deity to heal, protect, or smite.",
  Druid:
    "A nature-attuned spellcaster who can shape-shift into animals and command the natural world.",
  Fighter:
    "A master of martial combat, skilled with a wide range of weapons and tactics.",
  Monk:
    "A martial artist who channels inner discipline into supernatural speed, strikes, and resilience.",
  Paladin:
    "A holy warrior bound by sacred oaths, blending martial prowess with divine magic.",
  Ranger:
    "A skilled hunter and survivalist who blends martial skill with nature-based magic.",
  Rogue:
    "A cunning, stealthy expert in precision strikes, subterfuge, and skillful trickery.",
  Sorcerer:
    "A spellcaster who draws magic from an innate, often inherited supernatural source.",
  Warlock:
    "A spellcaster who gains power through a pact with a mysterious or otherworldly patron.",
  Wizard:
    "A scholarly spellcaster who masters magic through rigorous study and a vast spellbook.",
}

export type SrdFlavorCategory = "species" | "background" | "class"

const DESCRIPTIONS_BY_CATEGORY: Record<SrdFlavorCategory, Record<string, string>> = {
  species: SRD_SPECIES_DESCRIPTIONS,
  background: SRD_BACKGROUND_DESCRIPTIONS,
  class: SRD_CLASS_DESCRIPTIONS,
}

export function srdFlavorDescription(
  category: SrdFlavorCategory,
  name: string,
): string | undefined {
  return DESCRIPTIONS_BY_CATEGORY[category][name]
}

/** Apply SRD flavor summary when this row is from the bundled SRD seed. */
export function applySrdFlavorDescription(
  row: Record<string, unknown>,
  category: SrdFlavorCategory,
): Record<string, unknown> {
  if (!isSrdSource(row.source)) return row
  const name = String(row.name ?? "").trim()
  if (!name) return row
  const flavor = srdFlavorDescription(category, name)
  if (!flavor) return row
  return { ...row, description: flavor }
}
