/**
 * Soften homebrew / seed-pack creature rows toward schema v2.0 before strict parse.
 * Incomplete rows still fail Zod — callers should fall back to the legacy path.
 */

const NULLISH_KEYS = [
  "cr",
  "xp",
  "proficiency_bonus",
  "scaling",
  "ac_note",
  "initiative_modifier",
  "initiative_passive",
  "hit_dice",
  "skills",
  "proficiencies",
  "gear",
  "resistances",
  "damage_immunities",
  "condition_immunities",
  "vulnerabilities",
  "languages",
  "traits",
  "actions",
  "bonus_actions",
  "reactions",
  "legendary_actions",
] as const

const LIST_STRING_KEYS = [
  "resistances",
  "damage_immunities",
  "condition_immunities",
  "vulnerabilities",
] as const

const ABILITY_LIST_KEYS = [
  "traits",
  "actions",
  "bonus_actions",
  "reactions",
  "legendary_actions",
] as const

const LONG_ABILITY_KEYS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const

const SHORT_ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const

const LONG_TO_SHORT = {
  strength: "str",
  dexterity: "dex",
  constitution: "con",
  intelligence: "int",
  wisdom: "wis",
  charisma: "cha",
} as const

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

function formatSigned(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

function joinStringList(value: unknown): unknown {
  if (!Array.isArray(value)) return value
  const parts = value.filter((part): part is string => typeof part === "string" && part.trim().length > 0)
  return parts.length ? parts.join(", ") : null
}

function normalizeAbilityEntry(entry: unknown): unknown {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry
  const row = { ...(entry as Record<string, unknown>) }
  if (typeof row.text !== "string" && typeof row.description === "string") {
    row.text = row.description
  }
  if (row.text == null) row.text = ""
  if (!("unlock_level_label" in row)) row.unlock_level_label = null
  if (!("unlock_level_number" in row)) row.unlock_level_number = null
  if (!("tag" in row)) row.tag = null
  return row
}

function parseSpeedString(raw: string): Record<string, unknown> {
  const text = raw.replace(/\s+/g, " ").trim()
  const walk = text.match(/(\d+)\s*ft\.?/i)
  const fly = text.match(/fly\s+(\d+)\s*ft\.?/i)
  const swim = text.match(/swim\s+(\d+)\s*ft\.?/i)
  const climb = text.match(/climb\s+(\d+)\s*ft\.?/i)
  const burrow = text.match(/burrow\s+(\d+)\s*ft\.?/i)
  return {
    walk: walk ? Number(walk[1]) : null,
    fly: fly ? Number(fly[1]) : null,
    swim: swim ? Number(swim[1]) : null,
    climb: climb ? Number(climb[1]) : null,
    burrow: burrow ? Number(burrow[1]) : null,
    notes: text || null,
  }
}

function parseSensesString(raw: string): Record<string, unknown> {
  const text = raw.replace(/\s+/g, " ").trim()
  const darkvision = text.match(/darkvision\s+(\d+)/i)
  const blindsight = text.match(/blindsight\s+(\d+)/i)
  const tremorsense = text.match(/tremorsense\s+(\d+)/i)
  const truesight = text.match(/truesight\s+(\d+)/i)
  const passive = text.match(/passive\s+perception\s+(\d+)/i)
  return {
    darkvision: darkvision ? Number(darkvision[1]) : null,
    blindsight: blindsight ? Number(blindsight[1]) : null,
    tremorsense: tremorsense ? Number(tremorsense[1]) : null,
    truesight: truesight ? Number(truesight[1]) : null,
    passive_perception: passive ? Number(passive[1]) : null,
  }
}

function normalizeAbilityScores(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw
  const input = raw as Record<string, unknown>
  const hasLong = LONG_ABILITY_KEYS.some((key) => key in input)
  const hasShort = SHORT_ABILITY_KEYS.some((key) => key in input)
  if (!hasLong && hasShort) {
    // Ensure each short key is an object { score, mod, save }.
    const out: Record<string, unknown> = {}
    for (const key of SHORT_ABILITY_KEYS) {
      const value = input[key]
      if (value && typeof value === "object" && !Array.isArray(value)) {
        out[key] = value
        continue
      }
      if (typeof value === "number" && Number.isFinite(value)) {
        const mod = abilityModifier(value)
        out[key] = { score: value, mod: formatSigned(mod), save: formatSigned(mod) }
        continue
      }
      return raw
    }
    return out
  }
  if (!hasLong) return raw

  const out: Record<string, unknown> = {}
  for (const longKey of LONG_ABILITY_KEYS) {
    const short = LONG_TO_SHORT[longKey]
    const value = input[longKey] ?? input[short]
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[short] = value
      continue
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      const mod = abilityModifier(value)
      out[short] = { score: value, mod: formatSigned(mod), save: formatSigned(mod) }
      continue
    }
    return raw
  }
  return out
}

/** Best-effort coercion for seed-pack / LLM creature rows. */
export function coerceCreatureImportCandidate(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw
  const row: Record<string, unknown> = { ...(raw as Record<string, unknown>) }

  for (const key of NULLISH_KEYS) {
    if (!(key in row)) row[key] = null
  }

  for (const key of LIST_STRING_KEYS) {
    row[key] = joinStringList(row[key])
  }

  if (typeof row.speed === "string") {
    row.speed = parseSpeedString(row.speed)
  }

  if (typeof row.senses === "string") {
    row.senses = parseSensesString(row.senses)
  } else if (!("senses" in row) || row.senses == null) {
    row.senses = {
      darkvision: null,
      blindsight: null,
      tremorsense: null,
      truesight: null,
      passive_perception: null,
    }
  }

  if ("ability_scores" in row) {
    row.ability_scores = normalizeAbilityScores(row.ability_scores)
  }

  for (const key of ABILITY_LIST_KEYS) {
    if (Array.isArray(row[key])) {
      row[key] = row[key].map(normalizeAbilityEntry)
    }
  }

  if (typeof row.description !== "string") {
    row.description = row.description == null ? "" : String(row.description)
  }

  if (typeof row.creature_type !== "string" || !row.creature_type.trim()) {
    // Keep explicit nulls as missing for Zod when the row is otherwise empty;
    // only fill when other combat fields suggest a structured companion.
    if (typeof row.ac === "string" && typeof row.hp === "string") {
      row.creature_type = "Creature"
    }
  }
  if (typeof row.size !== "string" || !row.size.trim()) {
    if (typeof row.ac === "string" && typeof row.hp === "string") {
      row.size = "Medium"
    }
  }
  if (typeof row.alignment !== "string" || !row.alignment.trim()) {
    if (typeof row.ac === "string" && typeof row.hp === "string") {
      row.alignment = "Unaligned"
    }
  }

  return row
}
