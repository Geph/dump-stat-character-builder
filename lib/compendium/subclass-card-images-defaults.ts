import { withBasePath } from "@/lib/config/deploy-mode"

const subclassCardImage = (slug: string) => withBasePath(`/images/compendium/subclasses/${slug}.png`)

/**
 * Default card art for subclasses — files live under public/images/compendium/subclasses/.
 * Names match Drive-approved masters in scripts/subclass-card-sources.
 */
export const SRD_SUBCLASS_CARD_IMAGES_BY_NAME: Record<string, string> = {
  // Artificer (Eberron + Ravenloft)
  Alchemist: subclassCardImage("alchemist"),
  Armorer: subclassCardImage("armorer"),
  Artillerist: subclassCardImage("artillerist"),
  "Battle Smith": subclassCardImage("battle-smith"),
  Cartographer: subclassCardImage("cartographer"),
  Reanimator: subclassCardImage("reanimator"),

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
  "College of Dance": subclassCardImage("college-of-dance"),
  "College of Glamour": subclassCardImage("college-of-glamour"),
  "College of Lore": subclassCardImage("college-of-lore"),
  "College of Spirits": subclassCardImage("college-of-spirits"),
  "College of the Moon": subclassCardImage("college-of-the-moon"),
  "College of Valor": subclassCardImage("college-of-valor"),

  // Cleric
  "Grave Domain": subclassCardImage("grave-domain"),
  "Knowledge Domain": subclassCardImage("knowledge-domain"),
  "Life Domain": subclassCardImage("life-domain"),
  "Light Domain": subclassCardImage("light-domain"),
  "Trickery Domain": subclassCardImage("trickery-domain"),
  "War Domain": subclassCardImage("war-domain"),

  // Druid
  "Circle of the Land": subclassCardImage("circle-of-the-land"),
  "Circle of the Moon": subclassCardImage("circle-of-the-moon"),
  "Circle of the Sea": subclassCardImage("circle-of-the-sea"),
  "Circle of the Stars": subclassCardImage("circle-of-the-stars"),

  // Fighter
  Banneret: subclassCardImage("banneret"),
  "Battle Master": subclassCardImage("battle-master"),
  Champion: subclassCardImage("champion"),
  "Eldritch Knight": subclassCardImage("eldritch-knight"),
  "Psi Warrior": subclassCardImage("psi-warrior"),

  // Monk
  "Warrior of Mercy": subclassCardImage("warrior-of-mercy"),
  "Warrior of Shadow": subclassCardImage("warrior-of-shadow"),
  "Warrior of the Elements": subclassCardImage("warrior-of-the-elements"),
  "Warrior of the Open Hand": subclassCardImage("warrior-of-the-open-hand"),

  // Paladin
  "Oath of Devotion": subclassCardImage("oath-of-devotion"),
  "Oath of Glory": subclassCardImage("oath-of-glory"),
  "Oath of the Ancients": subclassCardImage("oath-of-the-ancients"),
  "Oath of the Noble Genies": subclassCardImage("oath-of-the-noble-genies"),
  "Oath of Vengeance": subclassCardImage("oath-of-vengeance"),

  // Ranger
  "Beast Master": subclassCardImage("beast-master"),
  "Fey Wanderer": subclassCardImage("fey-wanderer"),
  "Gloom Stalker": subclassCardImage("gloom-stalker"),
  "Hollow Warden": subclassCardImage("hollow-warden"),
  Hunter: subclassCardImage("hunter"),
  "Winter Walker": subclassCardImage("winter-walker"),

  // Rogue
  "Arcane Trickster": subclassCardImage("arcane-trickster"),
  Assassin: subclassCardImage("assassin"),
  Gadgeteer: subclassCardImage("gadgeteer"),
  Phantom: subclassCardImage("phantom"),
  "Scion of the Three": subclassCardImage("scion-of-the-three"),
  Soulknife: subclassCardImage("soulknife"),
  Thief: subclassCardImage("thief"),

  // Sorcerer
  "Aberrant Sorcery": subclassCardImage("aberrant-sorcery"),
  "Clockwork Sorcery": subclassCardImage("clockwork-sorcery"),
  "Draconic Sorcery": subclassCardImage("draconic-sorcery"),
  "Shadow Sorcery": subclassCardImage("shadow-magic"),
  "Spellfire Sorcery": subclassCardImage("spellfire-sorcery"),
  "Wild Magic Sorcery": subclassCardImage("wild-magic-sorcery"),

  // Warlock
  "Archfey Patron": subclassCardImage("archfey-patron"),
  "Celestial Patron": subclassCardImage("celestial-patron"),
  "Fiend Patron": subclassCardImage("fiend-patron"),
  "Great Old One Patron": subclassCardImage("great-old-one-patron"),
  "Undead Patron": subclassCardImage("undead-patron"),

  // Wizard
  Abjurer: subclassCardImage("abjurer"),
  Bladesinger: subclassCardImage("bladesinger"),
  Diviner: subclassCardImage("diviner"),
  Evoker: subclassCardImage("evoker"),
  Illusionist: subclassCardImage("illusionist"),

  // KibblesTasty Psion
  "Awakened Mind": subclassCardImage("awakened-mind"),
  "Consuming Mind": subclassCardImage("consuming-mind"),
  "Elemental Mind": subclassCardImage("elemental-mind"),
  "Knowing Mind": subclassCardImage("knowing-mind"),
  "Shaper's Mind": subclassCardImage("shapers-mind"),
  "Shaper’s Mind": subclassCardImage("shapers-mind"), // curly apostrophe from Drive imports
  "Transcended Mind": subclassCardImage("transcended-mind"),
  "Unleashed Mind": subclassCardImage("unleashed-mind"),
  "Wandering Mind": subclassCardImage("wandering-mind"),
}

export function defaultSubclassCardImageUrl(subclassName: string): string | null {
  return SRD_SUBCLASS_CARD_IMAGES_BY_NAME[subclassName] ?? null
}
