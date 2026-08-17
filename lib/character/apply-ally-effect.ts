import type { CharacterCompanionState } from "@/lib/character/companion-stat-block"
import { createDurationReminder } from "@/lib/character/duration-reminders"
import {
  allyEffectSummaryLabel,
  isHealOrTempHpEffect,
  isHeroicInspirationEffect,
  type PartyEffectTarget,
} from "@/lib/character/effect-target-policy"
import { normalizeEffectKind } from "@/lib/compendium/class-feature-metadata"
import {
  resolveFeatureEffectHealAmount,
  type HealResolveContext,
} from "@/lib/character/resolve-feature-effect-heal"
import type { CharacterSheetPlayState } from "@/lib/character/sheet-play-state"
import type { FeatureEffect } from "@/lib/types"

export type AllyEffectApplyKind = "heal" | "temp_hp" | "inspiration" | "condition" | "buff"

export type AllyEffectApplyResult = {
  kind: AllyEffectApplyKind
  amount: number
  targetLabel: string
  summary: string
  playPatch?: Partial<
    Pick<
      CharacterSheetPlayState,
      "currentHp" | "tempHp" | "hasInspiration" | "activeConditions" | "durationReminders"
    >
  >
  companionPatch?: Partial<Pick<CharacterCompanionState, "currentHp" | "tempHp" | "activeConditions">>
}

function mergeConditions(
  current: string[] | null | undefined,
  add: string[],
  remove: string[],
): string[] {
  const next = new Set((current ?? []).filter((entry) => typeof entry === "string" && entry.trim()))
  for (const name of remove) next.delete(name)
  for (const name of add) {
    const trimmed = name.trim()
    if (trimmed) next.add(trimmed)
  }
  return [...next]
}

function isBuffLikeEffect(effect: Pick<FeatureEffect, "kind" | "grantAdvantage">): boolean {
  const kind = normalizeEffectKind(effect.kind)
  return (
    kind === "modify_creature" ||
    kind === "movement_option" ||
    kind === "check_roll_modifier" ||
    Boolean(effect.grantAdvantage)
  )
}

/**
 * Apply one targetable effect to in-memory play or companion state.
 * Used by the open sheet (local) and by the party persist path.
 */
export function applyAllyEffectLocally(params: {
  effect: FeatureEffect
  target: PartyEffectTarget
  healContext: HealResolveContext
  play?: CharacterSheetPlayState | null
  companion?: CharacterCompanionState | null
  maxHp?: number | null
}): AllyEffectApplyResult | null {
  const { effect, target, healContext, play, companion, maxHp } = params
  const summaries: string[] = []
  let kind: AllyEffectApplyKind = "buff"
  let amount = 0
  const playPatch: NonNullable<AllyEffectApplyResult["playPatch"]> = {}
  const companionPatch: NonNullable<AllyEffectApplyResult["companionPatch"]> = {}
  let changed = false

  if (isHealOrTempHpEffect(effect)) {
    amount = resolveFeatureEffectHealAmount(effect, healContext)
    if (amount <= 0) return null
    const isTemp = effect.kind === "grant_temp_hp"
    kind = isTemp ? "temp_hp" : "heal"
    if (target.kind === "companion") {
      if (isTemp) {
        companionPatch.tempHp = Math.max(companion?.tempHp ?? 0, amount)
      } else {
        const current = typeof companion?.currentHp === "number" ? companion.currentHp : 0
        const next = current + amount
        companionPatch.currentHp = maxHp != null ? Math.min(maxHp, next) : next
      }
    } else if (isTemp) {
      playPatch.tempHp = Math.max(play?.tempHp ?? 0, amount)
    } else {
      const current =
        typeof play?.currentHp === "number" ? play.currentHp : maxHp != null ? maxHp : 0
      const next = current + amount
      playPatch.currentHp = maxHp != null ? Math.min(maxHp, next) : next
    }
    summaries.push(isTemp ? `+${amount} temp HP` : `Healed ${amount} HP`)
    changed = true
  }

  const addConditions = (effect.effectConditionTypes ?? []).filter(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
  )
  const removeConditions = (effect.removeConditions ?? []).filter(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
  )
  if (addConditions.length || removeConditions.length) {
    if (target.kind === "companion") {
      companionPatch.activeConditions = mergeConditions(
        companion?.activeConditions,
        addConditions,
        removeConditions,
      )
    } else {
      playPatch.activeConditions = mergeConditions(play?.activeConditions, addConditions, removeConditions)
    }
    if (addConditions.length) summaries.push(addConditions.join(", "))
    if (removeConditions.length) summaries.push(`cleared ${removeConditions.join(", ")}`)
    if (kind === "buff") kind = "condition"
    changed = true
  }

  if (isHeroicInspirationEffect(effect) && target.kind === "character") {
    playPatch.hasInspiration = true
    summaries.push("Heroic Inspiration")
    if (kind === "buff") kind = "inspiration"
    changed = true
  }

  const shouldRemind =
    target.kind === "character" &&
    isBuffLikeEffect(effect) &&
    !isHealOrTempHpEffect(effect) &&
    addConditions.length === 0 &&
    !isHeroicInspirationEffect(effect)
  if (shouldRemind) {
    const reminder = createDurationReminder(allyEffectSummaryLabel(effect))
    playPatch.durationReminders = [...(play?.durationReminders ?? []), reminder]
    summaries.push(reminder.label)
    changed = true
  } else if (target.kind === "companion" && isBuffLikeEffect(effect) && !changed) {
    summaries.push(allyEffectSummaryLabel(effect))
    changed = true
  }

  if (!changed) return null

  return {
    kind,
    amount,
    targetLabel: target.label,
    summary: summaries.join(" · ") || allyEffectSummaryLabel(effect),
    playPatch: Object.keys(playPatch).length ? playPatch : undefined,
    companionPatch: Object.keys(companionPatch).length ? companionPatch : undefined,
  }
}
