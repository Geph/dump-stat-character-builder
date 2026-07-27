import type { CharacterCompanionState } from "@/lib/character/companion-stat-block"
import type { PartyEffectTarget } from "@/lib/character/effect-target-policy"
import { resolveFeatureEffectHealAmount, type HealResolveContext } from "@/lib/character/resolve-feature-effect-heal"
import { normalizeSheetPlayState, type CharacterSheetPlayState } from "@/lib/character/sheet-play-state"
import type { FeatureEffect } from "@/lib/types"
import { createClient } from "@/lib/db/client"

export type ApplyPartyHealResult = {
  amount: number
  kind: "heal" | "temp_hp"
  targetLabel: string
}

/**
 * Apply heal_self / grant_temp_hp to a party character or companion.
 * Updates hit_points / sheet_state / companion_state on the target character row.
 */
export async function applyPartyHealEffect(params: {
  effect: FeatureEffect
  target: PartyEffectTarget
  healContext: HealResolveContext
  /** When targeting self on the open sheet, also return the amount for local React state. */
  selfCharacterId?: string | null
}): Promise<ApplyPartyHealResult | null> {
  const amount = resolveFeatureEffectHealAmount(params.effect, params.healContext)
  if (amount <= 0) return null

  const db = createClient()
  const { data, error } = await db
    .from("characters")
    .select("*")
    .eq("id", params.target.characterId)
    .single()
  if (error || !data) {
    throw new Error(error?.message ?? "Could not load heal target.")
  }

  const row = data as Record<string, unknown>
  const maxHp = typeof row.hit_point_max === "number" ? row.hit_point_max : null
  const play = normalizeSheetPlayState(
    row.sheet_state as CharacterSheetPlayState | null | undefined,
  ) ?? ({} as CharacterSheetPlayState)
  const kind = params.effect.kind === "grant_temp_hp" ? "temp_hp" : "heal"

  if (params.target.kind === "companion") {
    const companionKey = params.target.companionKey
    const companions = Array.isArray(row.companion_state)
      ? ([...row.companion_state] as CharacterCompanionState[])
      : []
    const index = companions.findIndex((entry) => entry.key === companionKey)
    if (index < 0) throw new Error("Companion not found on that character.")
    const companion = { ...companions[index] }
    const current = typeof companion.currentHp === "number" ? companion.currentHp : 0
    companion.currentHp = kind === "heal" ? current + amount : current
    companions[index] = companion
    const { error: patchError } = await db
      .from("characters")
      .update({ companion_state: companions })
      .eq("id", params.target.characterId)
    if (patchError) throw new Error(patchError.message)
    return { amount, kind, targetLabel: params.target.label }
  }

  const currentHp =
    typeof play.currentHp === "number"
      ? play.currentHp
      : typeof row.hit_points === "number"
        ? row.hit_points
        : maxHp ?? 0
  const nextHp =
    kind === "heal"
      ? maxHp != null
        ? Math.min(maxHp, currentHp + amount)
        : currentHp + amount
      : currentHp
  const nextTemp =
    kind === "temp_hp" ? Math.max(play.tempHp ?? 0, amount) : (play.tempHp ?? 0)

  const nextPlay: CharacterSheetPlayState = {
    ...play,
    currentHp: nextHp,
    tempHp: nextTemp,
  }

  const { error: patchError } = await db
    .from("characters")
    .update({
      hit_points: nextHp,
      sheet_state: nextPlay,
    })
    .eq("id", params.target.characterId)
  if (patchError) throw new Error(patchError.message)

  return { amount, kind, targetLabel: params.target.label }
}
