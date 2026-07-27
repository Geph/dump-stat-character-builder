import type { FeatureEffect } from "@/lib/types"

/** Who receives a heal / temp HP effect when an action is used. */
export type EffectTargetPolicy = "self" | "choose_ally"

export type PartyEffectTarget =
  | { kind: "character"; characterId: string; label: string }
  | {
      kind: "companion"
      characterId: string
      companionKey: string
      label: string
    }

const ALLY_HEAL_RE =
  /\b(all(?:y|ies)|another creature|a creature|willing creature|chosen creature)\b/i

/**
 * Resolve whether a heal / temp HP effect applies to self or needs an ally pick.
 * Prefer explicit healTarget; fall back to rollTarget + label heuristics.
 */
export function resolveEffectTargetPolicy(
  effect: Pick<FeatureEffect, "kind" | "label" | "rollTarget"> & {
    healTarget?: "self" | "choose_ally" | null
  },
): EffectTargetPolicy {
  if (effect.healTarget === "choose_ally") return "choose_ally"
  if (effect.healTarget === "self") return "self"
  if (effect.rollTarget === "ally") return "choose_ally"
  if (effect.label && ALLY_HEAL_RE.test(effect.label)) return "choose_ally"
  return "self"
}

export function isHealOrTempHpEffect(effect: Pick<FeatureEffect, "kind">): boolean {
  return effect.kind === "heal_self" || effect.kind === "grant_temp_hp"
}

export function collectTargetableEffects(
  effects: FeatureEffect[] | null | undefined,
): { effect: FeatureEffect; policy: EffectTargetPolicy }[] {
  const out: { effect: FeatureEffect; policy: EffectTargetPolicy }[] = []
  for (const effect of effects ?? []) {
    if (!isHealOrTempHpEffect(effect)) continue
    out.push({ effect, policy: resolveEffectTargetPolicy(effect) })
  }
  return out
}
