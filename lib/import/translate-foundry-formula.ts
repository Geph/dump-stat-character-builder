import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"

const ABILITY_CODE_TO_KEY: Record<string, AbilityScoreKey> = {
  str: "strength",
  dex: "dexterity",
  con: "constitution",
  int: "intelligence",
  wis: "wisdom",
  cha: "charisma",
}

export type ParsedFoundryFormula =
  | { kind: "number"; value: number }
  | { kind: "proficiency" }
  | { kind: "ability_mod"; ability: AbilityScoreKey }
  | { kind: "class_level"; classKey: string }
  | { kind: "character_level" }
  | { kind: "ac_formula"; base: number; abilities: AbilityScoreKey[] }
  | { kind: "unresolved"; raw: string }

export function parseFoundryFormulaValue(value: unknown): ParsedFoundryFormula | null {
  if (value == null) return null

  const asNum = typeof value === "number" ? value : Number(String(value).trim())
  if (Number.isFinite(asNum) && String(value).trim() !== "" && !String(value).includes("@")) {
    return { kind: "number", value: asNum }
  }

  const raw = String(value).trim()
  if (!raw) return null

  if (raw === "@prof" || raw.includes("@prof")) {
    return { kind: "proficiency" }
  }

  if (raw.includes("@details.level") || raw.includes("@attributes.level")) {
    return { kind: "character_level" }
  }

  const classLevel = raw.match(/@classes\.([a-z0-9_-]+)\.levels/i)
  if (classLevel) {
    return { kind: "class_level", classKey: classLevel[1] }
  }

  const abilityMods = [...raw.matchAll(/@abilities\.([a-z]+)\.mod/gi)]
  if (abilityMods.length > 0) {
    const abilities = abilityMods
      .map((match) => ABILITY_CODE_TO_KEY[match[1].toLowerCase()])
      .filter(Boolean) as AbilityScoreKey[]

    const baseMatch = raw.match(/(?:^|\s)(\d+)\s*\+/)
    const base = baseMatch ? parseInt(baseMatch[1], 10) : 10

    if (abilities.length >= 1 && (raw.includes("+") || raw.includes("max"))) {
      return { kind: "ac_formula", base, abilities: abilities.slice(0, 2) }
    }

    if (abilities.length === 1) {
      return { kind: "ability_mod", ability: abilities[0] }
    }
  }

  const plainNum = Number(raw)
  if (Number.isFinite(plainNum)) {
    return { kind: "number", value: plainNum }
  }

  return { kind: "unresolved", raw }
}

export function formulaToFlatBonus(parsed: ParsedFoundryFormula | null): number | null {
  if (!parsed) return null
  if (parsed.kind === "number") return parsed.value
  return null
}
