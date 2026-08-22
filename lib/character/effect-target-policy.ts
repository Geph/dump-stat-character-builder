import { normalizeEffectKind } from "@/lib/compendium/class-feature-metadata"
import type { FeatureEffect } from "@/lib/types"

/** Who receives a heal / temp HP / ally effect when an action is used. */
export type EffectTargetPolicy = "self" | "choose_ally"

export type PartyEffectTarget =
  | { kind: "character"; characterId: string; label: string }
  | {
      kind: "companion"
      characterId: string
      companionKey: string
      label: string
    }

const ALLY_TARGET_RE =
  /\b(all(?:y|ies)|another creature|a creature|willing creature|chosen creature|cohort)\b/i

const HEROIC_INSPIRATION_RE =
  /heroic inspiration|give .{0,40}inspiration|grant .{0,40}inspiration|gains? inspiration/i

/**
 * Resolve whether an effect applies to self or needs an ally pick.
 * Prefer explicit healTarget; fall back to rollTarget, kind, and label heuristics.
 */
export function resolveEffectTargetPolicy(
  effect: Pick<FeatureEffect, "kind" | "label" | "rollTarget"> & {
    healTarget?: "self" | "choose_ally" | null
  },
): EffectTargetPolicy {
  if (effect.healTarget === "choose_ally") return "choose_ally"
  if (effect.healTarget === "self") return "self"
  if (effect.rollTarget === "ally") return "choose_ally"
  if (effect.rollTarget === "enemy") return "self"
  if (effect.label && ALLY_TARGET_RE.test(effect.label)) return "choose_ally"
  const kind = normalizeEffectKind(effect.kind)
  if (kind === "modify_creature" || kind === "grant_inspiration") return "choose_ally"
  return "self"
}

export function isHealOrTempHpEffect(effect: Pick<FeatureEffect, "kind">): boolean {
  return effect.kind === "heal_self" || effect.kind === "grant_temp_hp"
}

export function isHeroicInspirationEffect(effect: Pick<FeatureEffect, "kind" | "label">): boolean {
  if (normalizeEffectKind(effect.kind) === "grant_inspiration") return true
  const label = effect.label ?? ""
  if (!label || /bardic inspiration/i.test(label)) return false
  return HEROIC_INSPIRATION_RE.test(label)
}

/** Effects that can be applied to another creature (or self) via the ally picker. */
export function shouldCollectTargetableEffect(
  effect: Pick<
    FeatureEffect,
    | "kind"
    | "label"
    | "rollTarget"
    | "healTarget"
    | "effectConditionTypes"
    | "removeConditions"
    | "grantAdvantage"
  >,
): boolean {
  if (effect.rollTarget === "enemy") return false
  if (isHealOrTempHpEffect(effect)) return true
  const kind = normalizeEffectKind(effect.kind)
  if (kind === "grant_inspiration") return true
  if (kind === "modify_creature") return true
  if ((effect.effectConditionTypes?.length ?? 0) > 0) return true
  if ((effect.removeConditions?.length ?? 0) > 0) return true
  if (effect.grantAdvantage && resolveEffectTargetPolicy(effect) === "choose_ally") return true
  if (
    (kind === "movement_option" || kind === "check_roll_modifier") &&
    resolveEffectTargetPolicy(effect) === "choose_ally"
  ) {
    return true
  }
  return resolveEffectTargetPolicy(effect) === "choose_ally"
}

export function collectTargetableEffects(
  effects: FeatureEffect[] | null | undefined,
): { effect: FeatureEffect; policy: EffectTargetPolicy }[] {
  const out: { effect: FeatureEffect; policy: EffectTargetPolicy }[] = []
  for (const effect of effects ?? []) {
    if (!shouldCollectTargetableEffect(effect)) continue
    out.push({ effect, policy: resolveEffectTargetPolicy(effect) })
  }
  return out
}

/** When a uses-pool action grants Heroic Inspiration to allies but has no structured effect. */
function abilityFromHealText(text: string): FeatureEffect["healAbility"] {
  const match = text.match(
    /\+\s*your\s+(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+modifier/i,
  )
  if (!match) return null
  const word = match[1].slice(0, 3).toUpperCase()
  return word === "STR" || word === "DEX" || word === "CON" || word === "INT" || word === "WIS" || word === "CHA"
    ? word
    : null
}

/** Rally-style heals: "that creature regains Hit Points equal to … + your Charisma modifier". */
export function inferAllyHealEffect(
  name: string,
  description?: string | null,
): FeatureEffect | null {
  const text = `${name}\n${description ?? ""}`.replace(/<[^>]+>/g, " ")
  if (!/regains? hit points/i.test(text)) return null
  if (!ALLY_TARGET_RE.test(text) && !/\bthat creature\b/i.test(text)) return null
  if (/\byou regain\b/i.test(text) && !ALLY_TARGET_RE.test(text)) return null
  const healAbility = abilityFromHealText(text)
  return {
    id: "inferred_ally_heal",
    kind: "heal_self",
    healTarget: "choose_ally",
    healMode: healAbility ? "ability_modifier" : "dice",
    healAbility,
    healDiceCount: healAbility ? null : 1,
    healDieType: healAbility ? null : "d8",
    label: "Heal ally or cohort",
  }
}

/** Blitz-style commands: "direct your Cohort or an ally … move … or make one attack". */
export function inferDirectCompanionEffect(
  name: string,
  description?: string | null,
): FeatureEffect | null {
  const text = `${name}\n${description ?? ""}`.replace(/<[^>]+>/g, " ")
  if (!/direct(?:ed)? your cohort|\bcohort or an ally\b|direct .{0,40}\bally\b/i.test(text)) {
    return null
  }
  return {
    id: "inferred_direct_companion",
    kind: "modify_creature",
    healTarget: "choose_ally",
    rollTarget: "ally",
    movementDash: true,
    label: "Direct cohort or ally",
  }
}

/** Bolster / Morale Boost — pick the ally or cohort the Battle Die applies to. */
export function inferAllyBuffEffect(
  name: string,
  description?: string | null,
): FeatureEffect | null {
  const text = `${name}\n${description ?? ""}`.replace(/<[^>]+>/g, " ")
  if (inferAllyHealEffect(name, description) || inferDirectCompanionEffect(name, description)) {
    return null
  }
  if (!ALLY_TARGET_RE.test(text)) return null
  if (!/\b(?:attack|saving throw|check)\b/i.test(text)) return null
  return {
    id: "inferred_ally_buff",
    kind: "modify_creature",
    healTarget: "choose_ally",
    rollTarget: "ally",
    label: "Affect ally or cohort",
  }
}

export function inferGrantInspirationEffect(
  name: string,
  description?: string | null,
): FeatureEffect | null {
  const text = `${name}\n${description ?? ""}`
  if (!/inspiration/i.test(text)) return null
  if (/bardic inspiration/i.test(text) && !/heroic inspiration/i.test(text)) return null
  if (!ALLY_TARGET_RE.test(text) && !/\ballies\b/i.test(text)) return null
  if (!HEROIC_INSPIRATION_RE.test(text)) return null
  return {
    id: "inferred_grant_inspiration",
    kind: "grant_inspiration",
    healTarget: "choose_ally",
    label: "Grant Heroic Inspiration",
  }
}

export function allyEffectSummaryLabel(effect: Pick<FeatureEffect, "kind" | "label">): string {
  const label = effect.label?.trim()
  if (label) return label
  const kind = normalizeEffectKind(effect.kind)
  if (kind === "grant_temp_hp") return "Temporary HP"
  if (kind === "heal_self") return "Heal"
  if (kind === "grant_inspiration") return "Heroic Inspiration"
  if (kind === "modify_creature") return "Ally effect"
  if (kind === "movement_option") return "Movement"
  if (kind === "check_roll_modifier") return "Roll modifier"
  return kind.replace(/_/g, " ")
}
