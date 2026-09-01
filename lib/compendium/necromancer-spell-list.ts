/**
 * Mage Hand Press Necromancer spell list (Spell / School / Special tables).
 * Used when the class picker should offer these spells even if an SRD catalog
 * row was never tagged with the Necromancer class.
 */

export const NECROMANCER_SPELLS_BY_LEVEL: Readonly<Record<number, readonly string[]>> = {
  0: [
    "Acid Splash",
    "Blade Ward",
    "Cheat",
    "Chill Touch",
    "Concealed Shot",
    "Cryptogram",
    "Dancing Lights",
    "Eldritch Orb",
    "Eye of Anubis",
    "Hocuspocus",
    "Light",
    "Lightning Surge",
    "Mage Hand",
    "Mending",
    "Message",
    "Minor Illusion",
    "Minor Lifesteal",
    "Poison Spray",
    "Prestidigitation",
    "Ray of Frost",
    "Shocking Grasp",
    "Spare the Dying",
    "Spark of Life",
    "Sulfuric Smoke",
    "True Strike",
  ],
  1: [
    "Alarm",
    "Bane",
    "Command",
    "Comprehend Languages",
    "Detect Evil and Good",
    "Detect Magic",
    "Disguise Self",
    "Exhume",
    "Expeditious Retreat",
    "False Life",
    "Feather Fall",
    "Flawed Reconstruction",
    "Fog Cloud",
    "Grease",
    "Hideous Laughter",
    "Identify",
    "Illusory Script",
    "Jump",
    "Mage Armor",
    "Might of the Abyss",
    "Protection from Evil and Good",
    "Ray of Sickness",
    "Silent Image",
    "Sleep",
    "Thunderwave",
  ],
  2: [
    "Acid Arrow",
    "Arcane Lock",
    "Blindness/Deafness",
    "Darkness",
    "Darkvision",
    "Detect Thoughts",
    "Enhance Ability",
    "Enlarge/Reduce",
    "Gentle Repose",
    "Hold Person",
    "Invisibility",
    "Knock",
    "Locate Object",
    "Misty Step",
    "Ray of Enfeeblement",
    "See Invisibility",
    "Shatter",
    "Silence",
    "Spider Climb",
    "Web",
  ],
  3: [
    "Animate Dead",
    "Bestow Curse",
    "Clairvoyance",
    "Counterspell",
    "Dispel Magic",
    "Fear",
    "Fly",
    "Gaseous Form",
    "Lightning Bolt",
    "Major Image",
    "Nondetection",
    "Protection from Energy",
    "Revivify",
    "Sending",
    "Speak with Dead",
    "Stinking Cloud",
    "Tongues",
    "Vampiric Touch",
  ],
  4: [
    "Arcane Eye",
    "Banishment",
    "Blight",
    "Black Tentacles",
    "Death Ward",
    "Dimension Door",
    "Dominate Beast",
    "Gahoul's Scapegoat",
    "Grasp of the Grave",
    "Greater Invisibility",
    "Hallucinatory Terrain",
    "Locate Creature",
    "Phantasmal Killer",
    "Secret Chest",
  ],
  5: [
    "Antilife Shell",
    "Cloudkill",
    "Contagion",
    "Dispel Evil and Good",
    "Dominate Person",
    "Dream",
    "Flawed Resurrection",
    "Geas",
    "Hold Monster",
    "Insect Plague",
    "Modify Memory",
    "Scrying",
    "Seeming",
    "Teleportation Circle",
  ],
  6: [
    "Chain Lightning",
    "Circle of Death",
    "Contingency",
    "Create Undead",
    "Eyebite",
    "Flesh to Stone",
    "Harm",
    "Magic Jar",
    "True Seeing",
  ],
  7: ["Etherealness", "Finger of Death", "Plane Shift", "Sequester", "Teleport"],
  8: [
    "Antimagic Field",
    "Befuddlement",
    "Clone",
    "Dominate Monster",
    "Gahoul's Glorious Gothic",
    "Maze",
    "Mind Blank",
    "Power Word Stun",
  ],
  9: ["Astral Projection", "Foresight", "Power Word Kill", "Storm of Vengeance", "Weird"],
}

export function normalizeNecromancerSpellKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function necromancerMatchKeys(name: string): string[] {
  const base = normalizeNecromancerSpellKey(name)
  if (!base) return []
  const keys = new Set<string>([base])
  const withoutPossessive = base.replace(/^[a-z]+s\s+/, "")
  if (withoutPossessive && withoutPossessive !== base) keys.add(withoutPossessive)
  return [...keys]
}

const NECROMANCER_SPELL_KEYS = new Set(
  Object.values(NECROMANCER_SPELLS_BY_LEVEL).flatMap((names) =>
    names.flatMap((name) => necromancerMatchKeys(name)),
  ),
)

export function isNecromancerListSpell(name: string): boolean {
  return necromancerMatchKeys(name).some((key) => NECROMANCER_SPELL_KEYS.has(key))
}
