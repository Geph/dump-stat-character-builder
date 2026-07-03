import type { FeatModifierPreset } from "@/lib/compendium/feat-modifier-presets"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"

export type FeatPresetConflict = {
  presetName: string
  reason: string
}

function attackBonusFromPreset(linkedModifiers: LinkedModifierInstance[] | undefined): number | null {
  for (const instance of linkedModifiers ?? []) {
    for (const mod of instance.characteristics ?? []) {
      if (mod.type !== "attack_roll_modifiers") continue
      for (const entry of mod.entries ?? []) {
        if (typeof entry.bonus === "number") return entry.bonus
      }
    }
    for (const effect of instance.effects ?? []) {
      if (effect.kind !== "attack_bonus") continue
      const bonus = (effect as { bonus?: number }).bonus
      if (typeof bonus === "number") return bonus
    }
  }
  return null
}

function rangedAttackBonusFromDescription(description: string): number | null {
  const patterns = [
    /\+\s*(\d+)\s+(?:bonus\s+)?to\s+(?:your\s+)?ranged\s+(?:weapon\s+)?attack\s+rolls?\b/i,
    /\+\s*(\d+)\s+bonus\s+to\s+attack\s+rolls?\s+you\s+make\s+with\s+ranged\s+weapons?\b/i,
  ]
  for (const pattern of patterns) {
    const match = description.match(pattern)
    if (!match) continue
    const bonus = parseInt(match[1], 10)
    if (Number.isFinite(bonus)) return bonus
  }
  return null
}

/** When description contradicts a name-matched feat preset, prefer description-driven wiring. */
export function featPresetConflict(
  featName: string,
  description: string,
  preset: FeatModifierPreset | undefined,
): FeatPresetConflict | null {
  if (!preset?.linkedModifiers?.length || !description.trim()) return null

  const presetBonus = attackBonusFromPreset(preset.linkedModifiers)
  const describedBonus = rangedAttackBonusFromDescription(description)
  if (presetBonus == null || describedBonus == null) return null
  if (presetBonus === describedBonus) return null

  return {
    presetName: featName,
    reason: `Description grants +${describedBonus} to ranged attacks but preset "${featName}" wires +${presetBonus}.`,
  }
}

export function shouldSkipFeatPreset(
  featName: string,
  description: string,
  preset: FeatModifierPreset | undefined,
): boolean {
  return featPresetConflict(featName, description, preset) != null
}
