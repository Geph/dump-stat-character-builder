export const BACKGROUND_ABILITY_KEYS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const

export type BackgroundAbilityKey = (typeof BACKGROUND_ABILITY_KEYS)[number]

const ABILITY_ALIASES: Record<string, BackgroundAbilityKey> = {
  str: "strength",
  strength: "strength",
  dex: "dexterity",
  dexterity: "dexterity",
  con: "constitution",
  constitution: "constitution",
  int: "intelligence",
  intelligence: "intelligence",
  wis: "wisdom",
  wisdom: "wisdom",
  cha: "charisma",
  charisma: "charisma",
}

export function normalizeBackgroundAbilityKey(raw: string): BackgroundAbilityKey | null {
  const key = raw.trim().toLowerCase().replace(/[^a-z]/g, "")
  if (ABILITY_ALIASES[key]) return ABILITY_ALIASES[key]
  for (const ability of BACKGROUND_ABILITY_KEYS) {
    if (key === ability || key.startsWith(ability.slice(0, 3))) return ability
  }
  return null
}

/** Normalize stored ability_bonuses keys to lowercase for the editor. */
export function normalizeBackgroundAbilityBonuses(
  bonuses: Record<string, number> | null | undefined,
): Record<string, number> {
  if (!bonuses) return {}
  const out: Record<string, number> = {}
  for (const [rawKey, value] of Object.entries(bonuses)) {
    const key = normalizeBackgroundAbilityKey(rawKey)
    if (key) out[key] = value
  }
  return out
}

/** Parse SRD / import "Ability Scores: Intelligence, Wisdom, Charisma" lines. */
export function parseBackgroundAbilityScoresLine(text: string | null | undefined): Record<string, number> | null {
  if (!text?.trim()) return null
  const cleaned = text.replace(/^choose\s*\d+:\s*/i, "").trim()
  const parts = cleaned.split(/\s*,\s*|\s+and\s+/)
  const bonuses: Record<string, number> = {}

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const withBonus = trimmed.match(/^([A-Za-z]+)\s*\+?\s*(\d+)\s*$/i)
    if (withBonus) {
      const key = normalizeBackgroundAbilityKey(withBonus[1])
      if (key) bonuses[key] = parseInt(withBonus[2], 10)
      continue
    }
    const key = normalizeBackgroundAbilityKey(trimmed)
    if (key) bonuses[key] = 0
  }

  return Object.keys(bonuses).length > 0 ? bonuses : null
}

export type BackgroundGrantedSpells = Record<string, string[]>

export function normalizeGrantedSpells(
  raw: BackgroundGrantedSpells | null | undefined,
): BackgroundGrantedSpells {
  if (!raw || typeof raw !== "object") return {}
  const out: BackgroundGrantedSpells = {}
  for (const [levelKey, ids] of Object.entries(raw)) {
    if (!Array.isArray(ids)) continue
    const unique = [...new Set(ids.filter((id) => typeof id === "string" && id))]
    if (unique.length) out[levelKey] = unique
  }
  return out
}

export function grantedSpellCount(granted: BackgroundGrantedSpells): number {
  return Object.values(granted).reduce((sum, ids) => sum + ids.length, 0)
}

/** Labels for character levels 1–20 when assigning background-granted spells. */
export function formatCharacterLevelLabel(level: number): string {
  if (level === 1) return "1st Level"
  if (level === 2) return "2nd Level"
  if (level === 3) return "3rd Level"
  return `${level}th Level`
}

export const BACKGROUND_GRANT_CHARACTER_LEVELS = Array.from({ length: 20 }, (_, i) => {
  const level = i + 1
  return { level, label: formatCharacterLevelLabel(level) }
})

/** Display label for a granted_spells map key (character level; legacy spell-level keys supported). */
export function formatGrantedSpellLevelKey(levelKey: string): string {
  const n = parseInt(levelKey, 10)
  if (!Number.isFinite(n)) return levelKey
  if (n === 0) return "Cantrips (legacy)"
  if (n >= 1 && n <= 20) return formatCharacterLevelLabel(n)
  return `Level ${n}`
}
