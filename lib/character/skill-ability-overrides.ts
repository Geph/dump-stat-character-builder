import { ABILITY_SCORE_KEYS, type AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"

const ABILITY_SET = new Set<string>(ABILITY_SCORE_KEYS)

export function isAbilityScoreKey(value: string): value is AbilityScoreKey {
  return ABILITY_SET.has(value)
}

export function normalizeSkillAbilityOverrides(
  raw: unknown,
): Record<string, AbilityScoreKey> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  const out: Record<string, AbilityScoreKey> = {}
  for (const [skillName, ability] of Object.entries(raw)) {
    if (!skillName.trim() || typeof ability !== "string" || !isAbilityScoreKey(ability)) continue
    out[skillName] = ability
  }
  return out
}

export function resolveSkillAbility(
  skillName: string,
  defaultAbility: AbilityScoreKey,
  overrides?: Record<string, AbilityScoreKey> | null,
): AbilityScoreKey {
  const override = overrides?.[skillName]
  return override ?? defaultAbility
}

export function setSkillAbilityOverride(
  current: Record<string, AbilityScoreKey>,
  skillName: string,
  ability: AbilityScoreKey | null,
  defaultAbility: AbilityScoreKey,
): Record<string, AbilityScoreKey> {
  const next = { ...current }
  if (ability == null || ability === defaultAbility) {
    delete next[skillName]
    return next
  }
  next[skillName] = ability
  return next
}
