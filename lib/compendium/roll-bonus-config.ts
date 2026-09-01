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

export type ResolveRollBonusDisplayParams = {
  proficiencyBonus?: number
  abilityMods?: Partial<Record<string, number>>
  characterLevel?: number
  classResourceDieSides?: Record<string, number>
  classResourceCounts?: Record<string, number>
}

const ABILITY_MOD_TO_SCORE: Record<string, string> = {
  STR: "strength",
  DEX: "dexterity",
  CON: "constitution",
  INT: "intelligence",
  WIS: "wisdom",
  CHA: "charisma",
}

const SCORE_TO_ABILITY_MOD: Record<string, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
}

function signedBonus(amount: number): string {
  return amount >= 0 ? `+${amount}` : `${amount}`
}

function lookupAbilityMod(
  mods: Partial<Record<string, number>> | undefined,
  ability: string | null | undefined,
): number | undefined {
  if (!mods || !ability) return undefined
  const upper = ability.toUpperCase()
  if (mods[upper] != null) return mods[upper]
  const scoreKey = ABILITY_MOD_TO_SCORE[upper] ?? ability.toLowerCase()
  if (mods[scoreKey] != null) return mods[scoreKey]
  if (mods[ability] != null) return mods[ability]
  return undefined
}

function abilityDisplayLabel(ability: string | null | undefined): string | null {
  if (!ability) return null
  const upper = ability.toUpperCase()
  if (ABILITY_MOD_TO_SCORE[upper]) return upper
  return SCORE_TO_ABILITY_MOD[ability.toLowerCase()] ?? ability
}

/** Resolved bonus for the Use overlay — numbers when known, dice notation without rolling. */
export function formatResolvedRollBonus(
  config: RollBonusConfig | null | undefined,
  params: ResolveRollBonusDisplayParams = {},
): string | null {
  if (!config) return null
  switch (config.mode) {
    case "fixed":
      return config.fixed != null ? signedBonus(config.fixed) : null
    case "proficiency": {
      const pb = params.proficiencyBonus
      const factor = config.multiplier ?? 1
      if (pb == null) return factor === 1 ? "Proficiency Bonus" : `×${factor} Proficiency Bonus`
      const amount = Math.floor(pb * factor)
      const label = factor === 1 ? "Proficiency Bonus" : `×${factor} Proficiency Bonus`
      return `${signedBonus(amount)} (${label})`
    }
    case "ability_modifier": {
      const label = abilityDisplayLabel(config.ability)
      const mod = lookupAbilityMod(params.abilityMods, config.ability)
      if (mod == null) return label ? `${label} modifier` : "Ability modifier"
      return `${signedBonus(mod)} (${label ?? "ability"} modifier)`
    }
    case "multiplier": {
      const factor = config.multiplier ?? 1
      const source = config.ability
        ? `${abilityDisplayLabel(config.ability) ?? config.ability} modifier`
        : "Proficiency Bonus"
      const base = config.ability
        ? lookupAbilityMod(params.abilityMods, config.ability)
        : params.proficiencyBonus
      if (base == null) return `×${factor} (${source})`
      return `${signedBonus(Math.floor(base * factor))} (×${factor} ${source})`
    }
    case "character_level": {
      const level = params.characterLevel
      if (level == null) return "character level"
      return `${signedBonus(level)} (character level)`
    }
    case "class_resource_count": {
      const key = config.classResourceKey?.trim()
      const count = key ? params.classResourceCounts?.[key] : undefined
      const label = key ? `${key.replace(/_/g, " ")} (Class Cap)` : "Class Cap"
      if (count == null) return label
      return `${signedBonus(count)} (${label})`
    }
    case "die":
      return formatRollBonusSummary(config, {
        classResourceDieSides: params.classResourceDieSides,
      })
    case "spell_attack":
      return "Spell attack modifier"
    default:
      return formatRollBonusSummary(config, {
        classResourceDieSides: params.classResourceDieSides,
      })
  }
}
