import type { AbilityModifierKey } from "@/lib/compendium/characteristic-modifiers"

export type RollBonusMode =
  | "fixed"
  | "proficiency"
  | "ability_modifier"
  | "multiplier"
  | "die"
  | "spell_attack"
  | "character_level"
  | "class_resource_count"

export type RollBonusResultFloorMode = "none" | "fixed" | "ability"

export interface RollBonusResultFloor {
  mode: RollBonusResultFloorMode
  fixed?: number | null
  ability?: AbilityModifierKey | null
}

export type RollBonusDieScaling = "fixed" | "by_level" | "class_resource"

export interface RollBonusConfig {
  mode: RollBonusMode
  fixed?: number | null
  ability?: AbilityModifierKey | null
  /** Multiplier applied to proficiency or ability modifier (e.g. 0.5 rounds down). */
  multiplier?: number | null
  dieCount?: number | null
  dieType?: "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | null
  dieScaling?: RollBonusDieScaling | null
  classResourceKey?: string | null
  /** Minimum result after applying the bonus (e.g. Reliable Talent, Aura of Protection). */
  resultFloor?: RollBonusResultFloor | null
  /** When set, limits which rolls receive this bonus (e.g. Jack of All Trades). */
  bonusAppliesWhen?: "always" | "non_proficient_skill_only"
}

export type BuffAllyMode = "advantage" | "bonus"

export const ROLL_BONUS_MODE_LABELS: Record<RollBonusMode, string> = {
  fixed: "Fixed amount",
  proficiency: "Proficiency bonus",
  ability_modifier: "Ability modifier",
  multiplier: "Multiplier (× prof. or ability)",
  die: "Die roll",
  spell_attack: "Spell attack modifier",
  character_level: "Character level",
  class_resource_count: "Class resource count (Class Cap)",
}

export function defaultRollBonusConfig(mode: RollBonusMode = "fixed"): RollBonusConfig {
  return { mode, fixed: mode === "fixed" ? 1 : null, multiplier: mode === "multiplier" ? 1 : null }
}

/** Migrate legacy numeric bonusAmount to RollBonusConfig. */
export function rollBonusFromLegacy(bonusAmount: number | null | undefined): RollBonusConfig | null {
  if (bonusAmount == null) return null
  return { mode: "fixed", fixed: bonusAmount }
}

export type FormatRollBonusSummaryOptions = {
  /** Current die size (sides) per class-resource key — lets "die" + "class_resource" resolve to real notation. */
  classResourceDieSides?: Record<string, number>
}

export function formatRollBonusSummary(
  config: RollBonusConfig | null | undefined,
  options?: FormatRollBonusSummaryOptions,
): string {
  if (!config) return "—"
  switch (config.mode) {
    case "fixed":
      return config.fixed != null ? `+${config.fixed}` : "Fixed"
    case "proficiency":
      return "Proficiency bonus"
    case "ability_modifier":
      return config.ability ? `${config.ability} modifier` : "Ability modifier"
    case "multiplier":
      return `×${config.multiplier ?? 1} (${config.ability ? `${config.ability} mod` : "proficiency"})`
    case "die":
      if (config.dieScaling === "class_resource" && config.classResourceKey) {
        const sides = options?.classResourceDieSides?.[config.classResourceKey]
        const dieCount = config.dieCount ?? 1
        return sides != null
          ? `${dieCount}d${sides} (${config.classResourceKey} die)`
          : `${config.classResourceKey} die`
      }
      if (config.dieCount && config.dieType) {
        return config.dieScaling === "by_level"
          ? `${config.dieCount}${config.dieType} (scales by level)`
          : `${config.dieCount}${config.dieType}`
      }
      return "Die bonus"
    case "character_level":
      return "Character level"
    case "class_resource_count":
      return config.classResourceKey
        ? `${config.classResourceKey} (Class Cap)`
        : "Class resource count"
    case "spell_attack":
      return "Spell attack modifier"
    default:
      return "—"
  }
}
