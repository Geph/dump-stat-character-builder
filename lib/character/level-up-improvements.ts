import {
  resolveFixedValueAtLevel,
  type BonusByLevelEntry,
} from "@/lib/compendium/bonus-by-level"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import type { Feature } from "@/lib/types"

/** Standard 5E proficiency bonus by character level. */
export function proficiencyBonusAtLevel(level: number): number {
  return Math.floor((Math.max(1, level) - 1) / 4) + 2
}

/** Average HP gained for one class level after 1st (before Constitution). */
export function averageHitDieResult(hitDie: number): number {
  return Math.floor(Math.max(1, hitDie) / 2) + 1
}

export function averageHpGain(hitDie: number, conMod: number): number {
  return averageHitDieResult(hitDie) + conMod
}

/** Roll 1..hitDie then add Constitution (minimum 1 total HP from the level). */
export function rolledHpGain(hitDie: number, conMod: number, natural: number): number {
  const clamped = Math.max(1, Math.min(hitDie, Math.floor(natural)))
  return Math.max(1, clamped + conMod)
}

export function rollHitDie(hitDie: number): number {
  return 1 + Math.floor(Math.random() * Math.max(1, hitDie))
}

export type LevelUpStandardizedNote = {
  id: string
  title: string
  detail: string
}

/** Notes for improvements that always scale with character level (not class features). */
export function buildLevelUpStandardizedNotes(params: {
  fromTotalLevel: number
  toTotalLevel: number
  maxSpellLevelBefore?: number | null
  maxSpellLevelAfter?: number | null
}): LevelUpStandardizedNote[] {
  const notes: LevelUpStandardizedNote[] = []
  const pbBefore = proficiencyBonusAtLevel(params.fromTotalLevel)
  const pbAfter = proficiencyBonusAtLevel(params.toTotalLevel)
  if (pbAfter > pbBefore) {
    notes.push({
      id: "proficiency_bonus",
      title: "Proficiency Bonus",
      detail: `Increases from +${pbBefore} to +${pbAfter}.`,
    })
  }
  const spellBefore = params.maxSpellLevelBefore ?? 0
  const spellAfter = params.maxSpellLevelAfter ?? 0
  if (spellAfter > spellBefore) {
    notes.push({
      id: "spell_level",
      title: "Spell level access",
      detail: `You can now prepare or learn spells of up to level ${spellAfter}.`,
    })
  }
  return notes
}

export type LevelUpFeatureImprovement = {
  name: string
  featureLevel: number
  detail: string
  source: "class" | "subclass"
}

function formatCritRange(minimum: number): string {
  if (minimum >= 20) return "20"
  return `${minimum}–20`
}

function resolveCritMinimum(
  base: number | null | undefined,
  byLevel: BonusByLevelEntry[] | null | undefined,
  classLevel: number,
): number {
  return resolveFixedValueAtLevel(byLevel, classLevel, base ?? null) ?? base ?? 20
}

function attackTargetLabel(target: string | undefined): string | null {
  if (!target || target === "all") return null
  if (target === "ranged") return "ranged weapons"
  if (target === "melee") return "melee weapons"
  if (target === "spell") return "spell attacks"
  return target
}

/** Crit-range tiers that unlock between `fromLevel` (exclusive) and `toLevel` (inclusive). */
function criticalHitImprovementDetails(
  mod: CharacteristicModifier,
  fromLevel: number,
  toLevel: number,
): string[] {
  if (mod.type !== "attack_roll_modifiers") return []
  const details: string[] = []
  const seen = new Set<string>()

  const check = (
    base: number | null | undefined,
    byLevel: BonusByLevelEntry[] | null | undefined,
    scope: string | null,
  ) => {
    if (!byLevel?.length) return
    const before = resolveCritMinimum(base, byLevel, fromLevel)
    const after = resolveCritMinimum(base, byLevel, toLevel)
    if (before === after) return
    const scopeSuffix = scope ? ` with ${scope}` : ""
    const detail = `Critical hits${scopeSuffix} improve from ${formatCritRange(before)} to ${formatCritRange(after)}.`
    if (seen.has(detail)) return
    seen.add(detail)
    details.push(detail)
  }

  check(mod.criticalHitMinimum, mod.criticalHitMinimumByLevel, null)
  for (const entry of mod.entries ?? []) {
    check(
      entry.criticalHitMinimum ?? mod.criticalHitMinimum,
      entry.criticalHitMinimumByLevel,
      attackTargetLabel(entry.target),
    )
  }
  return details
}

/**
 * Features already unlocked before this class level that gain a mechanical tier at `toLevel`
 * (e.g. Critical Shot expanding the crit range at Gunslinger 9).
 */
export function collectFeatureScalingImprovements(
  features: Feature[] | undefined,
  fromLevel: number,
  toLevel: number,
  source: "class" | "subclass",
): LevelUpFeatureImprovement[] {
  const out: LevelUpFeatureImprovement[] = []
  for (const feature of features ?? []) {
    if ((feature.level ?? 0) > fromLevel) continue
    const details: string[] = []
    for (const instance of feature.linkedModifiers ?? []) {
      for (const mod of instance.characteristics ?? []) {
        details.push(...criticalHitImprovementDetails(mod, fromLevel, toLevel))
      }
    }
    const unique = [...new Set(details)]
    if (unique.length === 0) continue
    out.push({
      name: feature.name,
      featureLevel: feature.level ?? 0,
      detail: unique.join(" "),
      source,
    })
  }
  return out
}
