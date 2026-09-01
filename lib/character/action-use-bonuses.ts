import { resolveCheckRollMode } from "@/lib/compendium/class-feature-metadata"
import type {
  AbilityModifierKey,
  CharacteristicModifier,
} from "@/lib/compendium/characteristic-modifiers"
import {
  formatResolvedRollBonus,
  rollBonusFromLegacy,
  type ResolveRollBonusDisplayParams,
  type RollBonusConfig,
} from "@/lib/compendium/roll-bonus-config"
import type { FeatureEffect } from "@/lib/types"

export type SheetActionUseBonusRollMode = "bonus" | "advantage" | "disadvantage"

export type SheetActionUseBonus = {
  appliesTo: string
  rollMode: SheetActionUseBonusRollMode
  bonusConfig?: RollBonusConfig | null
  /** When the bonus is subtracted from the roll (Cutting Words). */
  subtract?: boolean
}

type UseBonusSource = {
  activation?: { effects?: FeatureEffect[] } | null
  linkedModifiers?: Array<{
    activation?: { effects?: FeatureEffect[] } | null
    characteristics?: CharacteristicModifier[]
  }>
}

const CHECK_SCOPE_LABELS: Record<string, string> = {
  save: "saving throws",
  death_save: "Death Saving Throws",
  initiative: "Initiative",
  attack: "attack rolls",
  spell_attack: "spell attack rolls",
  spell_save_dc: "spell save DC",
  skill: "skill checks",
  ability: "ability checks",
}

const ROLL_KIND_LABELS: Record<string, string> = {
  ability: "ability checks",
  skill: "skill checks",
  attack: "attack rolls",
  save: "saving throws",
}

function checkScopeLabel(effect: FeatureEffect): string {
  if (effect.checkSkills?.length) return effect.checkSkills.join(", ")
  if (effect.checkCategory === "ability" && effect.checkAbility?.trim()) {
    return `${effect.checkAbility.trim()} checks`
  }
  if (effect.checkCategory && CHECK_SCOPE_LABELS[effect.checkCategory]) {
    return CHECK_SCOPE_LABELS[effect.checkCategory]
  }
  return "the triggering roll"
}

function rollKindsLabel(kinds: string[] | undefined, fallback: string): string {
  const labels = (kinds ?? [])
    .map((kind) => ROLL_KIND_LABELS[kind] ?? kind)
    .filter(Boolean)
  if (!labels.length) return fallback
  if (labels.length === 1) return labels[0]
  return `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`
}

function bonusDedupeKey(bonus: SheetActionUseBonus): string {
  return [
    bonus.rollMode,
    bonus.appliesTo,
    bonus.subtract ? "sub" : "add",
    JSON.stringify(bonus.bonusConfig ?? null),
  ].join("|")
}

function fromFeatureEffect(effect: FeatureEffect): SheetActionUseBonus | null {
  const buffConfig = effect.buffBonus ?? null
  if (buffConfig) {
    const mode = effect.buffMode === "advantage" ? "advantage" : "bonus"
    return {
      appliesTo: effect.rollTarget === "ally" ? "an ally's roll" : checkScopeLabel(effect),
      rollMode: mode,
      bonusConfig: mode === "bonus" ? buffConfig : null,
    }
  }

  const rollMode = resolveCheckRollMode(effect)
  const config = effect.bonusConfig ?? rollBonusFromLegacy(effect.bonusAmount)
  if (rollMode === "advantage" || rollMode === "disadvantage") {
    return { appliesTo: checkScopeLabel(effect), rollMode }
  }
  if (rollMode === "bonus" || config) {
    if (!config && rollMode !== "bonus") return null
    return {
      appliesTo: checkScopeLabel(effect),
      rollMode: "bonus",
      bonusConfig: config,
    }
  }
  return null
}

function fromD20TestReaction(characteristic: CharacteristicModifier): SheetActionUseBonus | null {
  if (characteristic.type !== "d20_test_reaction") return null
  let bonusConfig: RollBonusConfig | null = null
  if (characteristic.dieSource === "ability_modifier" && characteristic.dieAbility) {
    const abilityByScore = {
      strength: "STR",
      dexterity: "DEX",
      constitution: "CON",
      intelligence: "INT",
      wisdom: "WIS",
      charisma: "CHA",
    } as const satisfies Record<string, AbilityModifierKey>
    bonusConfig = {
      mode: "ability_modifier",
      ability: abilityByScore[characteristic.dieAbility] ?? "INT",
    }
  } else if (characteristic.dieSource === "fixed" && characteristic.fixedDie) {
    const die = characteristic.fixedDie.trim()
    const diceMatch = die.match(/^(\d+)?d(\d+)$/i)
    if (diceMatch) {
      const sides = Number(diceMatch[2])
      const dieType =
        sides === 4 || sides === 6 || sides === 8 || sides === 10 || sides === 12 || sides === 20
          ? (`d${sides}` as RollBonusConfig["dieType"])
          : null
      bonusConfig = { mode: "die", dieCount: Number(diceMatch[1] ?? 1), dieType }
    } else {
      const fixed = Number(die)
      if (Number.isFinite(fixed)) bonusConfig = { mode: "fixed", fixed }
    }
  } else if (characteristic.dieSource === "resource_die") {
    bonusConfig = {
      mode: "die",
      dieScaling: "class_resource",
      classResourceKey: characteristic.spendResourceKey,
    }
  }
  if (!bonusConfig && characteristic.modifierMode !== "add" && characteristic.modifierMode !== "subtract") {
    return null
  }
  return {
    appliesTo: rollKindsLabel(characteristic.rollKinds, "the triggering roll"),
    rollMode: "bonus",
    bonusConfig,
    subtract: characteristic.modifierMode === "subtract",
  }
}

function collectFromCharacteristics(
  characteristics: CharacteristicModifier[] | undefined,
  out: SheetActionUseBonus[],
) {
  for (const characteristic of characteristics ?? []) {
    const reactionBonus = fromD20TestReaction(characteristic)
    if (reactionBonus) out.push(reactionBonus)
    const nested = "effect" in characteristic ? characteristic.effect : null
    if (nested?.activation?.effects) {
      for (const effect of nested.activation.effects) {
        const bonus = fromFeatureEffect(effect)
        if (bonus) out.push(bonus)
      }
    }
    if (nested?.characteristics?.length) {
      collectFromCharacteristics(nested.characteristics, out)
    }
  }
}

/** Collect roll bonuses granted when the player uses this feature / feat / ability. */
export function collectActionUseBonuses(item: UseBonusSource): SheetActionUseBonus[] {
  const collected: SheetActionUseBonus[] = []
  for (const effect of item.activation?.effects ?? []) {
    const bonus = fromFeatureEffect(effect)
    if (bonus) collected.push(bonus)
  }
  for (const instance of item.linkedModifiers ?? []) {
    for (const effect of instance.activation?.effects ?? []) {
      const bonus = fromFeatureEffect(effect)
      if (bonus) collected.push(bonus)
    }
    collectFromCharacteristics(instance.characteristics, collected)
  }
  const seen = new Set<string>()
  return collected.filter((bonus) => {
    const key = bonusDedupeKey(bonus)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function formatSheetActionUseBonusLine(
  bonus: SheetActionUseBonus,
  params: ResolveRollBonusDisplayParams = {},
): string {
  if (bonus.rollMode === "advantage") return `Advantage on ${bonus.appliesTo}`
  if (bonus.rollMode === "disadvantage") return `Disadvantage on ${bonus.appliesTo}`
  const amount = formatResolvedRollBonus(bonus.bonusConfig, params)
  if (!amount) return `Bonus to ${bonus.appliesTo}`
  const display = bonus.subtract && amount.startsWith("+") ? `−${amount.slice(1)}` : amount
  return `${display} to ${bonus.appliesTo}`
}

export function formatSheetActionUseBonusLines(
  bonuses: SheetActionUseBonus[] | undefined,
  params: ResolveRollBonusDisplayParams = {},
): string[] {
  return (bonuses ?? []).map((bonus) => formatSheetActionUseBonusLine(bonus, params)).filter(Boolean)
}
