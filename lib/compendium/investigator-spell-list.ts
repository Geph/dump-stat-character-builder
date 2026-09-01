/**
 * Mage Hand Press Investigator grimoire list (Spell / School / Special tables).
 * Used when the Ritualist picker should offer Investigator spells even if an SRD
 * catalog row was never tagged with the Investigator class.
 */
import type { SpellsKnownChoiceGrant } from "@/lib/compendium/characteristic-modifiers"
import { isNecromancerListSpell } from "@/lib/compendium/necromancer-spell-list"
import { spellNameOnClassList } from "@/lib/compendium/spell-name-match"

/** Ritual Level column — max spell level you can add to the grimoire. */
export const INVESTIGATOR_RITUAL_LEVEL_TIERS: ReadonlyArray<{
  level: number
  ritualLevel: number
}> = [
  { level: 1, ritualLevel: 1 },
  { level: 3, ritualLevel: 2 },
  { level: 5, ritualLevel: 3 },
  { level: 7, ritualLevel: 4 },
  { level: 9, ritualLevel: 5 },
  { level: 11, ritualLevel: 6 },
]

export function investigatorRitualLevelAt(classLevel: number): number {
  let ritualLevel = 1
  for (const tier of INVESTIGATOR_RITUAL_LEVEL_TIERS) {
    if (classLevel >= tier.level) ritualLevel = tier.ritualLevel
  }
  return ritualLevel
}

/**
 * Grimoire spell picks: 4 level-1 spells at 1st, then +2 Investigator spells each
 * time you gain an Investigator level (up to the Ritual Level cap at that level).
 */
export function buildInvestigatorGrimoireChoiceGrants(): SpellsKnownChoiceGrant[] {
  const grants: SpellsKnownChoiceGrant[] = [{ level: 1, count: 4 }]
  for (let classLevel = 2; classLevel <= 20; classLevel++) {
    grants.push({
      level: investigatorRitualLevelAt(classLevel),
      count: 2,
      unlocksAtClassLevel: classLevel,
      upToLevel: true,
    })
  }
  return grants
}

export const INVESTIGATOR_SPELLS_BY_LEVEL: Readonly<Record<number, readonly string[]>> = {
  1: [
    "Alarm",
    "Blood Print",
    "Clue",
    "Comprehend Languages",
    "Conjure Cover",
    "Consecrated Armor",
    "Curse Ward",
    "Detect Evil and Good",
    "Detect Magic",
    "Detect Poison and Disease",
    "Disguise Self",
    "Find Familiar",
    "Floating Disc",
    "Fog Cloud",
    "Heroism",
    "Identify",
    "Illusory Script",
    "Memorize",
    "Protection from Evil and Good",
    "Purify Food and Drink",
    "Rumor",
    "Speak with Animals",
    "Transient Bulwark",
    "Unseen Servant",
    "Whispering Wind",
  ],
  2: [
    "Animal Messenger",
    "Arcane Lock",
    "Arcanist's Magic Aura",
    "Augury",
    "Darkness",
    "Darkvision",
    "Gentle Repose",
    "Jethro's Instant Reload",
    "Knock",
    "Locate Animals or Plants",
    "Locate Object",
    "Magic Mouth",
    "Map",
    "Nondescript",
    "Protect Threshold",
    "Protection from Poison",
    "See Invisibility",
    "Silence",
    "Spider Climb",
    "Stone Bones",
    "Unseen Artisan",
    "Zone of Truth",
  ],
  3: [
    "After Image",
    "Benign Dismemberment",
    "Clairvoyance",
    "Create Food and Water",
    "Daylight",
    "Dispel Magic",
    "Flashback",
    "Fly",
    "Geomantic Discernment",
    "Magic Circle",
    "Meld into Stone",
    "Nondetection",
    "Phantom Steed",
    "Remove Curse",
    "Séance",
    "Sending",
    "Speak with Dead",
    "Speak with Plants",
    "Tongues",
    "Water Breathing",
    "Water Walk",
  ],
  4: [
    "Arcane Eye",
    "Dire Warning",
    "Divination",
    "Invisibility Purge",
    "Locate Creature",
    "Private Sanctum",
    "Scrutinize Foe",
    "Secret Chest",
    "Zero Gravity",
  ],
  5: [
    "Commune",
    "Commune with Nature",
    "Contact Other Plane",
    "Dream",
    "Geas",
    "Legend Lore",
    "Planar Binding",
    "Telepathic Bond",
  ],
  6: ["Find the Path", "Forbiddance", "Game of Fate", "Instant Summons"],
}

export function normalizeInvestigatorSpellKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

const INVESTIGATOR_SPELL_KEYS = new Set(
  Object.values(INVESTIGATOR_SPELLS_BY_LEVEL)
    .flat()
    .map((name) => normalizeInvestigatorSpellKey(name)),
)

export function isInvestigatorListSpell(name: string): boolean {
  return INVESTIGATOR_SPELL_KEYS.has(normalizeInvestigatorSpellKey(name))
}

/**
 * True when a catalog row belongs on a class list. Uses the spell's classes[] tag,
 * then any persisted/import `spell_list` names, then hardcoded Investigator /
 * Necromancer fallbacks for classes imported before lists were stored.
 */
export function spellMatchesClassName(
  spell: { name: string; classes?: string[] | null },
  className: string,
  classSpellList?: readonly string[] | null,
): boolean {
  const needle = className.trim().toLowerCase()
  if (!needle) return false
  if (spell.classes?.some((entry) => entry.trim().toLowerCase() === needle)) return true
  if (spellNameOnClassList(spell.name, classSpellList)) return true
  if (needle === "investigator") return isInvestigatorListSpell(spell.name)
  if (needle === "necromancer") return isNecromancerListSpell(spell.name)
  return false
}

/**
 * Pull a class name out of a spells_known label such as "Investigator spell list"
 * or "Witch cantrips". Returns [] when the label is not a class list.
 */
export function inferSpellListClassNames(label?: string | null): string[] {
  if (!label) return []
  const match = label
    .trim()
    .match(/^(.+?)(?:'s)?(?:\s+spell\s+list|\s+spells|\s+cantrips)$/i)
  if (!match?.[1]) return []
  const name = match[1].trim()
  if (!name || /^(hexes|bonus|any|choose)$/i.test(name)) return []
  return [name]
}
