import { applyAllyEffectLocally, type AllyEffectApplyResult } from "@/lib/character/apply-ally-effect"
import type { CharacterCompanionState } from "@/lib/character/companion-stat-block"
import type { PartyEffectTarget } from "@/lib/character/effect-target-policy"
import type { HealResolveContext } from "@/lib/character/resolve-feature-effect-heal"
import { normalizeSheetPlayState, type CharacterSheetPlayState } from "@/lib/character/sheet-play-state"
import type { FeatureEffect } from "@/lib/types"
import { createClient } from "@/lib/db/client"

export type ApplyPartyHealResult = {
  amount: number
  kind: AllyEffectApplyResult["kind"]
  targetLabel: string
  summary: string
}

/**
 * Apply a targetable ally effect to a party character or companion.
 * Updates hit_points / sheet_state / companion_state on the target character row.
 */
export async function applyPartyHealEffect(params: {
  effect: FeatureEffect
  target: PartyEffectTarget
  healContext: HealResolveContext
  /** When targeting self on the open sheet, also return the amount for local React state. */
  selfCharacterId?: string | null
}): Promise<ApplyPartyHealResult | null> {
  const db = createClient()
  const { data, error } = await db
    .from("characters")
    .select("*")
    .eq("id", params.target.characterId)
    .single()
  if (error || !data) {
    throw new Error(error?.message ?? "Could not load effect target.")
  }

  const row = data as Record<string, unknown>
  const maxHp = typeof row.hit_point_max === "number" ? row.hit_point_max : null
  const play = normalizeSheetPlayState(
    row.sheet_state as CharacterSheetPlayState | null | undefined,
  )
  const companions = Array.isArray(row.companion_state)
    ? ([...row.companion_state] as CharacterCompanionState[])
    : []

  let companion: CharacterCompanionState | null = null
  let companionIndex = -1
  if (params.target.kind === "companion") {
    companionIndex = companions.findIndex((entry) => entry.key === params.target.companionKey)
    if (companionIndex < 0) throw new Error("Companion not found on that character.")
    companion = { ...companions[companionIndex] }
  }

  const applied = applyAllyEffectLocally({
    effect: params.effect,
    target: params.target,
    healContext: params.healContext,
    play,
    companion,
    maxHp: params.target.kind === "character" ? maxHp : null,
  })
  if (!applied) return null

  if (params.target.kind === "companion" && companion && applied.companionPatch) {
    const nextCompanion = { ...companion, ...applied.companionPatch }
    companions[companionIndex] = nextCompanion
    const { error: patchError } = await db
      .from("characters")
      .update({ companion_state: companions })
      .eq("id", params.target.characterId)
    if (patchError) throw new Error(patchError.message)
    return {
      amount: applied.amount,
      kind: applied.kind,
      targetLabel: applied.targetLabel,
      summary: applied.summary,
    }
  }

  if (params.target.kind === "character" && applied.playPatch) {
    const nextPlay: CharacterSheetPlayState = {
      ...play,
      ...applied.playPatch,
      durationReminders: applied.playPatch.durationReminders ?? play.durationReminders,
    }
    const nextHp =
      typeof nextPlay.currentHp === "number"
        ? nextPlay.currentHp
        : typeof row.hit_points === "number"
          ? row.hit_points
          : maxHp ?? 0
    const { error: patchError } = await db
      .from("characters")
      .update({
        hit_points: nextHp,
        sheet_state: nextPlay,
      })
      .eq("id", params.target.characterId)
    if (patchError) throw new Error(patchError.message)
  }

  return {
    amount: applied.amount,
    kind: applied.kind,
    targetLabel: applied.targetLabel,
    summary: applied.summary,
  }
}
