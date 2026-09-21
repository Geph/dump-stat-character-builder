/** Shared source-layout helpers for scripts/optimize-site-images.mjs */

export function kebabSlug(value) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Strip Drive duplicate suffixes like "Dragonborn (1)". */
export function stripCopySuffix(basename) {
  return String(basename ?? "")
    .replace(/\s*\(\d+\)\s*$/u, "")
    .trim()
}

export const CARD_OUTPUT_SLUG_ALIASES = {
  "aasimar-2024": "aasimar",
  "changeling-2024": "changeling",
  "changeling-2026": "changeling",
  // Kibbles Warden masters must be named `Warden-Kibbles.png` (not bare `warden.png`)
  // so Mage Hand Press `magehandpress/warden.png` can ship as `warden.png`.
  archeaeologist: "archaeologist",
  "house-thurani-heir": "house-thuranni-heir",
  "house-tharashk": "house-tharashk-heir",
  "gate-guardian": "gate-warden",
  "dhakanni-golindar": "dhakaani-golindar",
}

export const SPELL_CARD_OUTPUT_SLUG_ALIASES = {
  "beam-of-annhilation": "beam-of-annihilation",
  "dancing-object": "dancing-object-animate-object",
  "terrific-transposition": "trarys-terrific-transposition",
  "sapre-the-dying": "spare-the-dying",
  // WotC master filename quirks → SRD seed slugs
  "create-water": "create-or-destroy-water",
  "cure-light-wounds": "cure-wounds",
  "detect-evil": "detect-evil-and-good",
  "detect-poison": "detect-poison-and-disease",
  "fairie-fire": "faerie-fire",
  "good-berry": "goodberry",
  "discordant-whispers": "dissonant-whispers",
  "cat-nap": "catnap",
  "aberrent-spirit": "aberrant-spirit",
  "beastial-spirit": "bestial-spirit",
  "thundrous-smite": "thunderous-smite",
  antipathy: "antipathy-sympathy",
  sympathy: "antipathy-sympathy",
  "magic-aura": "arcanists-magic-aura",
  "arcanists-magic-aura": "arcanists-magic-aura",
  "melfs-acid-arrow": "acid-arrow",
  "bigbys-hand": "arcane-hand",
  "bigbys-forceful-hand": "arcane-hand",
  "tashas-hideous-laughter": "hideous-laughter",
  "hideous-laughter": "hideous-laughter",
  "leomunds-tiny-hut": "tiny-hut",
  "mordenkainens-faithful-hound": "faithful-hound",
  "mordenkainens-private-sanctum": "private-sanctum",
  "mordenkainens-magnificent-mansion": "magnificent-mansion",
  "mordenkainens-sword": "arcane-sword",
  "otilukes-freezing-sphere": "freezing-sphere",
  "otilukes-resilient-sphere": "resilient-sphere",
  "ottos-irresistible-dance": "irresistible-dance",
  "drawmijs-instant-summons": "instant-summons",
  "rarys-telepathic-bond": "telepathic-bond",
  "evards-black-tentacles": "black-tentacles",
  "locate-animals-and-plants": "locate-animals-or-plants",
  "protection-from-evil": "protection-from-evil-and-good",
  "purify-food-and-water": "purify-food-and-drink",
  "nystuls-magic-aura": "arcanists-magic-aura",
  "leomunds-tiny-chest": "secret-chest",
  "entrancing-mirrors": "mirror-image",
}

export function spellCardSourceToSlug(basename) {
  return kebabSlug(basename)
}

/** Drop non-spell masters and Midjourney dump filenames. */
export function shouldSkipSpellCardSourceBase(base) {
  const stem = String(base ?? "").trim()
  if (!stem) return true
  if (/^gephginger[_-]/i.test(stem)) return true
  if (/^coming\s+soon$/i.test(stem)) return true
  if (/^_/.test(stem)) return true
  return false
}

/**
 * Parse spell card masters like "Mutate 2.png" / "Repair Front.png".
 * Trailing version numbers collapse to one slug; higher version wins.
 * Also strips WotC `alt` / `v2` / decorative suffixes before slugifying.
 */
export function parseSpellCardSourceBase(base) {
  let stem = stripCopySuffix(String(base ?? ""))
    .replace(/\s+Front$/i, "")
    .replace(/\s+alt$/i, "")
    .replace(/[-_\s]alt$/i, "")
    .replace(/[-_\s]v\d+$/i, "")
    .replace(/[-_\s]spear$/i, "")
    .replace(/[-_\s]void$/i, "")
    .replace(/[-_\s]fixed$/i, "")
    .replace(/[-_\s]revised$/i, "")
    .replace(/[-_\s]variation$/i, "")
    .replace(/[-_\s]ship[-_\s]?fixed$/i, "")
    .replace(/[-_\s]similar[-_\s]?area$/i, "")
    .replace(/[-_\s]on[-_\s]?target$/i, "")
    .replace(/\s*\(creature\)\s*$/i, "")
    .replace(/^_+/, "")
    .trim()
  let version = 0
  const versionMatch = stem.match(/^(.*?)(?:\s+|-)(\d+)$/)
  if (versionMatch) {
    stem = versionMatch[1].trim()
    version = Number(versionMatch[2])
  }
  // "Astral-Projection-02-Ship" style leftovers after suffix strip
  const dashedVersion = stem.match(/^(.*?)-0*(\d+)$/)
  if (dashedVersion && !version) {
    stem = dashedVersion[1].trim()
    version = Number(dashedVersion[2])
  }
  const slug = spellCardSourceToSlug(stem)
  const outputSlug = SPELL_CARD_OUTPUT_SLUG_ALIASES[slug] ?? slug
  return { outputSlug, version }
}

const CLASS_PREFIXES = [
  "Alchemist",
  "Artificer",
  "Inventor",
  "Occultist",
  "Barbarian",
  "Paladin",
  "Sorcerer",
  "Warlock",
  "Fighter",
  "Ranger",
  "Cleric",
  "Druid",
  "Wizard",
  "Monk",
  "Rogue",
  "Bard",
  "Psion",
  "Warden",
  "Necromancer",
  "Dancer",
  "Captain",
  "Warmage",
  "Witch",
  "Craftsman",
  "Gunslinger",
  "Investigator",
  "Martyr",
  "Vagabond",
].sort((a, b) => b.length - a.length)

/** Unprefixed drop names (Mage Hand Press) → parent class. */
const UNPREFIXED_SUBCLASS_CLASS = {
  Amorist: "Alchemist",
  Apothecary: "Alchemist",
  "Dynamo Engineer": "Alchemist",
  Mutagenist: "Alchemist",
  "Mad Bomber": "Alchemist",
  "Ooze Rancher": "Alchemist",
  "Slime Rancher": "Alchemist",
  Venomsmith: "Alchemist",
  Xenoalchemist: "Alchemist",
  "Daggermark": "Captain",
  "Dragon Banner": "Captain",
  "Eagle Banner": "Captain",
  "Holy Icon": "Captain",
  "Jolly Roger": "Captain",
  "Lion Banner": "Captain",
  "Tower Banner": "Captain",
  Acrobat: "Dancer",
  Cheerleader: "Dancer",
  Contortionist: "Dancer",
  Courtesan: "Dancer",
  "Danseur Macabre": "Dancer",
  Dramaturge: "Dancer",
  Fencer: "Dancer",
  "Fey Ballerina": "Dancer",
  "Fire Dancer": "Dancer",
  Harlequin: "Dancer",
  Marionettist: "Dancer",
  Mime: "Dancer",
  Moonwalker: "Dancer",
  "Shadow Dancer": "Dancer",
  Steelsinger: "Dancer",
  "Blood Ascendant": "Necromancer",
  "Death Knight": "Necromancer",
  Overlord: "Necromancer",
  "Pale Master": "Necromancer",
  Pharaoh: "Necromancer",
  "Plague Lord": "Necromancer",
  Reanimator: "Necromancer",
  Reaper: "Necromancer",
  "Beastblood Guardian": "Warden",
  "Drake-blooded": "Warden",
  Godsworn: "Warden",
  "Gray Watchman": "Warden",
  "Grey Watchman": "Warden",
  Nightgaunt: "Warden",
  Stoneheart: "Warden",
  "Stoneheart Defender": "Warden",
  "Storm Sentinel": "Warden",
  "Verdant Protector": "Warden",
}

/** Short filename remainder → official display name, keyed by class. */
const SUBCLASS_SHORT_TO_DISPLAY = {
  Alchemist: {
    "Slime Rancher": "Ooze Rancher",
  },
  Barbarian: {
    Berserker: "Path of the Berserker",
    "Wild Heart": "Path of the Wild Heart",
    "World Tree": "Path of the World Tree",
    Zealot: "Path of the Zealot",
  },
  Bard: {
    Lore: "College of Lore",
    Dance: "College of Dance",
    Glamour: "College of Glamour",
    Valor: "College of Valor",
    Spirits: "College of Spirits",
  },
  Cleric: {
    Life: "Life Domain",
    Light: "Light Domain",
    Trickery: "Trickery Domain",
    War: "War Domain",
    Arcana: "Arcana Domain",
    Grave: "Grave Domain",
    Knowledge: "Knowledge Domain",
    Mind: "Mind Domain",
  },
  Druid: {
    Land: "Circle of the Land",
    Moon: "Circle of the Moon",
    Sea: "Circle of the Sea",
    Stars: "Circle of the Stars",
    Forged: "Circle of the Forged",
  },
  Monk: {
    "Open Hand": "Warrior of the Open Hand",
    Elements: "Warrior of the Elements",
    Mercy: "Warrior of Mercy",
    Shadow: "Warrior of Shadow",
    "Living Weapon": "Warrior of the Living Weapon",
    "Mystric Arts": "Mystic Arts",
    "Mystic Arts": "Mystic Arts",
  },
  Paladin: {
    Devotion: "Oath of Devotion",
    Ancients: "Oath of the Ancients",
    Glory: "Oath of Glory",
    Vengeance: "Oath of Vengeance",
    Vengence: "Oath of Vengeance",
    Genies: "Oath of the Noble Genies",
  },
  Ranger: {
    Beastmaster: "Beast Master",
    "Beast Master": "Beast Master",
    "Fey Wanderer": "Fey Wanderer",
    "Gloom Stalker": "Gloom Stalker",
    "Winter Walker": "Winter Walker",
    Warden: "Warden",
  },
  Rogue: {
    "Arcane Trickster": "Arcane Trickster",
    Assassin: "Assassin",
    "Soul Knife": "Soulknife",
    Soulknife: "Soulknife",
    "Scion of the Three": "Scion of the Three",
    Phantom: "Phantom",
  },
  Sorcerer: {
    Draconic: "Draconic Sorcery",
    Aberrent: "Aberrant Sorcery",
    Aberrant: "Aberrant Sorcery",
    Clockwork: "Clockwork Sorcery",
    "Wild Magic": "Wild Magic Sorcery",
    Spellfire: "Spellfire Sorcery",
    Shadow: "Shadow Sorcery",
  },
  Warlock: {
    Fiend: "Fiend Patron",
    Celestial: "Celestial Patron",
    "Arch Fey": "Archfey Patron",
    Archfey: "Archfey Patron",
    "Great Old One": "Great Old One Patron",
    Vestige: "Vestige Patron",
    Undead: "Undead Patron",
  },
  Wizard: {
    Evoker: "Evoker",
    Abjurer: "Abjurer",
    Conjurer: "Conjurer",
    Diviner: "Diviner",
    Enchanter: "Enchanter",
    Illusionist: "Illusionist",
    Necromancer: "Necromancer",
    Transmuter: "Transmuter",
    Bladesinging: "Bladesinging",
  },
  Psion: {
    Awakened: "Awakened Mind",
    Consuming: "Consuming Mind",
    Elemental: "Elemental Mind",
    Knowing: "Knowing Mind",
    Shapers: "Shaper's Mind",
    Transcended: "Transcended Mind",
    Unleashed: "Unleashed Mind",
    Wandering: "Wandering Mind",
  },
  Warden: {
    "Dread Wing": "Dreadwing",
    "Time Twister": "Timetwister",
    "Gray Watchman": "Grey Watchman",
    Stoneheart: "Stoneheart Defender",
  },
  Craftsman: {
    "Arcane Maesters": "Arcane Maesters' Guild",
    Armigers: "Armigers' Guild",
    Bladeworkers: "Bladeworkers' Guild",
    Calibarons: "Calibarons' Guild",
    Forgeknights: "Forgeknights' Guild",
    Mechanauts: "Mechanauts' Guild",
    Thunderlords: "Thunderlords' Guild",
    Trappers: "Trappers' Guild",
  },
  Martyr: {
    Atonement: "Burden of Atonement",
    Discord: "Burden of Discord",
    Mercy: "Burden of Mercy",
    Rebirth: "Burden of Rebirth",
    Revolution: "Burden of Revolution",
    "The End": "Burden of the End",
    Truth: "Burden of Truth",
    Tyranny: "Burden of Tyranny",
  },
  Gunslinger: {
    "Gun Ko Master": "Gun-Ko Master",
    "Gun-Ko Master": "Gun-Ko Master",
  },
  Vagabond: {
    "Experiment-x": "Experiment X",
    "Experiment-X": "Experiment X",
    Ronin: "Rōnin",
    "Rōnin": "Rōnin",
  },
  Witch: {
    Black: "Black Magic",
    Blood: "Blood Magic",
    Green: "Green Magic",
    Purple: "Purple Magic",
    Red: "Red Magic",
    Steel: "Steel Magic",
    Tea: "Tea Magic",
    Technicolor: "Technicolor Magic",
    White: "White Magic",
  },
}

export function subclassClassSlug(className) {
  return kebabSlug(className)
}

export function subclassItemSlug(displayName) {
  return kebabSlug(displayName)
}

function impliedClassForUnprefixedSubclass(trimmed) {
  const exact = UNPREFIXED_SUBCLASS_CLASS[trimmed]
  if (exact) return exact
  const key = Object.keys(UNPREFIXED_SUBCLASS_CLASS).find(
    (name) => name.toLowerCase() === trimmed.toLowerCase(),
  )
  return key ? UNPREFIXED_SUBCLASS_CLASS[key] : null
}

export function parseSubclassSourceBasename(basename) {
  const trimmed = String(basename ?? "").trim()
  if (!trimmed) return null
  const prefix = CLASS_PREFIXES.find(
    (name) =>
      trimmed === name ||
      trimmed.startsWith(`${name} `) ||
      trimmed.toLowerCase().startsWith(`${name.toLowerCase()} `),
  )
  if (!prefix) {
    const impliedClass = impliedClassForUnprefixedSubclass(trimmed)
    if (impliedClass) return parseSubclassSourceBasename(`${impliedClass} ${trimmed}`)
    return null
  }
  const remainder = trimmed.slice(prefix.length).trim()
  if (!remainder) return null
  const display =
    SUBCLASS_SHORT_TO_DISPLAY[prefix]?.[remainder] ??
    SUBCLASS_SHORT_TO_DISPLAY[prefix]?.[
      Object.keys(SUBCLASS_SHORT_TO_DISPLAY[prefix] ?? {}).find(
        (key) => key.toLowerCase() === remainder.toLowerCase(),
      ) ?? ""
    ] ??
    remainder
  return {
    className: prefix,
    displayName: display,
    classSlug: subclassClassSlug(prefix),
    itemSlug: subclassItemSlug(display),
  }
}

export function flattenSourceBasenameToSlug(basename) {
  const stripped = stripCopySuffix(basename)
  const raw = kebabSlug(stripped)
  return CARD_OUTPUT_SLUG_ALIASES[raw] ?? raw
}
