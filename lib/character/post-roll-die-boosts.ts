import type {
  CharacteristicModifier,
  FailedRollTriggerCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { RollContext } from "@/lib/character/roll-context"
import type { Feature } from "@/lib/types"

/** A resource die the player can spend after seeing a d20 result (Knack, Tenacity, …). */
export type PostRollDieBoost = {
  id: string
  sourceName: string
  resourceKey: string
  amount: number
  dieSides: number
  useReaction: boolean
  /** Reroll the d20 (same modifier) and add the die to the new roll. */
  reroll: boolean
}

type BoostFeature = Pick<Feature, "name"> & {
  linkedModifiers?: LinkedModifierInstance[] | null
}

function selfFailedRollTriggers(
  linkedModifiers: LinkedModifierInstance[] | null | undefined,
): FailedRollTriggerCharacteristic[] {
  const out: FailedRollTriggerCharacteristic[] = []
  for (const instance of linkedModifiers ?? []) {
    for (const char of (instance.characteristics ?? []) as CharacteristicModifier[]) {
      if (char.type !== "failed_roll_trigger") continue
      if ((char.triggerOn ?? "fail") !== "fail") continue
      if ((char.targetScope ?? "self") !== "self") continue
      if (!char.spendResourceKey) continue
      out.push(char)
    }
  }
  return out
}

/** True when the item spends a die on the character's own failed ability / skill checks. */
export function itemBoostsOwnChecks(
  linkedModifiers: LinkedModifierInstance[] | null | undefined,
): boolean {
  return selfFailedRollTriggers(linkedModifiers).some(
    (trigger) => trigger.rollKind === "skill" || trigger.rollKind === "ability",
  )
}

function triggerDieResourceKey(trigger: FailedRollTriggerCharacteristic): string {
  for (const effect of trigger.effect?.activation?.effects ?? []) {
    const config = (effect as { bonusConfig?: { mode?: string; classResourceKey?: string | null } })
      .bonusConfig
    if (config?.mode === "die" && config.classResourceKey) return config.classResourceKey
  }
  return trigger.spendResourceKey ?? ""
}

function abilityMatches(filter: string | null | undefined, ability: string | undefined): boolean {
  if (!filter) return true
  if (!ability) return false
  return filter.slice(0, 3).toLowerCase() === ability.slice(0, 3).toLowerCase()
}

function triggerMatchesRoll(
  trigger: FailedRollTriggerCharacteristic,
  context: RollContext,
  skillProficient: boolean | undefined,
): boolean {
  switch (trigger.rollKind) {
    case "skill":
      if (context.kind !== "skill") return false
      break
    case "ability":
      // A skill check is an ability check with that skill's ability.
      if (context.kind !== "ability" && context.kind !== "skill") return false
      break
    case "save":
      if (context.kind !== "save" && context.kind !== "death_save") return false
      break
    case "attack":
      if (context.kind !== "attack" && context.kind !== "spell_attack") return false
      break
    default:
      return false
  }
  if (!abilityMatches(trigger.ability, context.ability)) return false
  if (trigger.skills?.length) {
    const skill = context.skillName?.toLowerCase()
    if (!skill || !trigger.skills.some((name) => name.toLowerCase() === skill)) return false
  }
  if (trigger.requiresProficiency && !(context.kind === "skill" && skillProficient)) return false
  return true
}

export function collectPostRollDieBoosts(
  features: readonly BoostFeature[],
  context: RollContext,
  opts: { skillProficient?: boolean; classResourceDieSides?: Record<string, number> },
): PostRollDieBoost[] {
  const boosts: PostRollDieBoost[] = []
  const seen = new Set<string>()
  for (const feature of features) {
    for (const trigger of selfFailedRollTriggers(feature.linkedModifiers)) {
      if (!triggerMatchesRoll(trigger, context, opts.skillProficient)) continue
      const dieSides = opts.classResourceDieSides?.[triggerDieResourceKey(trigger)] ?? 0
      if (dieSides <= 0) continue
      const key = feature.name.trim().toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      boosts.push({
        id: trigger.id ?? `${feature.name}:${trigger.rollKind}`,
        sourceName: feature.name,
        resourceKey: trigger.spendResourceKey!,
        amount: Math.max(1, trigger.spendResourceAmount ?? 1),
        dieSides,
        useReaction: Boolean(trigger.useReaction),
        reroll: Boolean(trigger.rerollRoll),
      })
    }
  }
  return boosts
}
