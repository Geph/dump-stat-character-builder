/**
 * Free Mage Hand Press subclasses included in the example seed pack.
 * Only these subclass names (plus base classes / spells / shared catalogs) are bundled.
 * Matching is normalized (accents, apostrophes, plural guild spelling).
 */
export const MHP_FREE_SUBCLASSES_BY_CLASS: Record<string, string[]> = {
  Alchemist: ["Mutagenist", "Mad Bomber", "Apothecary"],
  Captain: ["Lion Banner", "Jolly Roger", "Eagle Banner"],
  Craftsman: ["Calibarons' Guild", "Bladeworkers' Guild", "Armigers' Guild"],
  Dancer: ["Fencer", "Courtesan", "Acrobat"],
  Gunslinger: ["Pistolero", "Gun Tank", "Deadeye"],
  Investigator: ["Occultist", "Exterminator", "Detective"],
  Martyr: ["Burden of Truth", "Burden of Revolution", "Burden of Mercy"],
  Necromancer: ["Cyberghoul", "Pale Master", "Overlord", "Death Knight"],
  Vagabond: ["Ronin", "Mage Brand", "Houndmaster"],
  Warden: ["Verdant Protector", "Grey Watchman", "Beastblood Guardian"],
  Warmage: [
    "House of Rooks",
    "House of Pawns",
    "House of Knights",
    "House of Kings",
    "House of Bishops",
  ],
  Witch: ["Black Magic", "Green Magic", "Red Magic", "White Magic"],
}

/** Accept common spelling variants from Drive JSON / hand-written lists. */
const SUBCLASS_ALIASES: Record<string, string> = {
  "calibaron's guild": "calibarons' guild",
  "calibarons guild": "calibarons' guild",
  "bladeworker's guild": "bladeworkers' guild",
  "bladeworkers guild": "bladeworkers' guild",
  "armiger's guild": "armigers' guild",
  "armigers guild": "armigers' guild",
  "rōnin": "ronin",
  ronin: "ronin",
}

export function normalizeSubclassMatchKey(name: string): string {
  const stripped = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B']/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return SUBCLASS_ALIASES[stripped] ?? stripped
}

export function buildMhpFreeSubclassKeySet(
  byClass: Record<string, string[]> = MHP_FREE_SUBCLASSES_BY_CLASS,
): Set<string> {
  const keys = new Set<string>()
  for (const names of Object.values(byClass)) {
    for (const name of names) keys.add(normalizeSubclassMatchKey(name))
  }
  return keys
}

export function isMhpFreeSubclassName(
  name: string | null | undefined,
  allowKeys: Set<string> = buildMhpFreeSubclassKeySet(),
): boolean {
  if (!name?.trim()) return false
  return allowKeys.has(normalizeSubclassMatchKey(name))
}

/** House of X / Foo Guild mentions in a prerequisite string. */
export function extractMhpSubclassMentions(text: string | null | undefined): string[] {
  if (!text?.trim()) return []
  const mentions: string[] = []
  const houseRe = /House of [A-Za-z]+/g
  const guildRe = /[A-Za-z][\w']*(?:'s)?\s+Guild/g
  for (const re of [houseRe, guildRe]) {
    for (const match of text.matchAll(re)) {
      mentions.push(match[0])
    }
  }
  return mentions
}

/**
 * True when a prerequisite only names non-allowlisted subclasses (e.g. Warmage tricks
 * gated to House of Cards / Dice while free houses are Rooks/Pawns/…).
 */
export function prerequisiteOnlyMentionsNonFreeSubclasses(
  prerequisite: string | null | undefined,
  allowKeys: Set<string> = buildMhpFreeSubclassKeySet(),
): boolean {
  const mentions = extractMhpSubclassMentions(prerequisite)
  if (!mentions.length) return false
  return mentions.every((name) => !isMhpFreeSubclassName(name, allowKeys))
}

export type MhpAbilityAllowCheck = {
  source_type?: string | null
  source_name?: string | null
  prerequisite?: string | null
}

/** Keep class/shared abilities; drop paid-subclass rows and paid-only prereq gates. */
export function isMhpBundledAbilityAllowed(
  ability: MhpAbilityAllowCheck,
  allowKeys: Set<string> = buildMhpFreeSubclassKeySet(),
): boolean {
  if (ability.source_type === "subclass") {
    if (ability.source_name && !isMhpFreeSubclassName(ability.source_name, allowKeys)) {
      return false
    }
  }
  if (prerequisiteOnlyMentionsNonFreeSubclasses(ability.prerequisite, allowKeys)) {
    return false
  }
  return true
}
