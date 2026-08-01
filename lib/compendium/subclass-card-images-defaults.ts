import { withBasePath } from "@/lib/config/deploy-mode"

const subclassCardImage = (slug: string) => withBasePath(`/images/compendium/subclasses/${slug}.png`)

/**
 * Default card art for subclasses — files live under public/images/compendium/subclasses/.
 * Only names with Drive-approved masters in scripts/graphics are mapped.
 */
export const SRD_SUBCLASS_CARD_IMAGES_BY_NAME: Record<string, string> = {
  // Inventor (KibblesTasty)
  Fleshsmith: subclassCardImage("fleshsmith"),
  Gadgetsmith: subclassCardImage("gadgetsmith"),
  Golemsmith: subclassCardImage("golemsmith"),
  Infusionsmith: subclassCardImage("infusionsmith"),
  Potionsmith: subclassCardImage("potionsmith"),
  Runesmith: subclassCardImage("runesmith"),
  Thundersmith: subclassCardImage("thundersmith"),
  Warsmith: subclassCardImage("warsmith"),

  // Barbarian
  "Path of the Berserker": subclassCardImage("path-of-the-berserker"),
  "Path of the Wild Heart": subclassCardImage("path-of-the-wild-heart"),
  "Path of the World Tree": subclassCardImage("path-of-the-world-tree"),
  "Path of the Zealot": subclassCardImage("path-of-the-zealot"),

  // Bard
  "College of Lore": subclassCardImage("college-of-lore"),

  // Cleric
  "Life Domain": subclassCardImage("life-domain"),

  // Druid
  "Circle of the Land": subclassCardImage("circle-of-the-land"),

  // Fighter
  Champion: subclassCardImage("champion"),

  // Monk
  "Warrior of the Open Hand": subclassCardImage("warrior-of-the-open-hand"),

  // Paladin
  "Oath of Devotion": subclassCardImage("oath-of-devotion"),

  // Ranger
  Hunter: subclassCardImage("hunter"),

  // Rogue
  Gadgeteer: subclassCardImage("gadgeteer"),
  Thief: subclassCardImage("thief"),

  // Sorcerer
  "Draconic Sorcery": subclassCardImage("draconic-sorcery"),

  // Warlock
  "Fiend Patron": subclassCardImage("fiend-patron"),

  // Wizard
  Evoker: subclassCardImage("evoker"),

  // KibblesTasty Psion
  "Awakened Mind": subclassCardImage("awakened-mind"),
  "Consuming Mind": subclassCardImage("consuming-mind"),
  "Elemental Mind": subclassCardImage("elemental-mind"),
  "Knowing Mind": subclassCardImage("knowing-mind"),
  "Shaper's Mind": subclassCardImage("shapers-mind"),
  "Transcended Mind": subclassCardImage("transcended-mind"),
  "Unleashed Mind": subclassCardImage("unleashed-mind"),
  "Wandering Mind": subclassCardImage("wandering-mind"),
}

export function defaultSubclassCardImageUrl(subclassName: string): string | null {
  return SRD_SUBCLASS_CARD_IMAGES_BY_NAME[subclassName] ?? null
}
