import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { readLinkedModifiers } from "@/lib/compendium/linked-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { resolveUsesAtLevel, type ResolveUsesContext } from "@/lib/compendium/resolve-uses-config"
import type { Feature, FeatureEffect, RestType, UsesConfig } from "@/lib/types"

export type ResourceRefreshEffect = {
  id: string
  featureName: string
  resourceKey: string
  classId: string
  classLevel: number
  onRest?: "short_rest" | "long_rest" | "short_or_long_rest" | null
  onInitiative?: boolean
  oncePerLongRest?: boolean
  /** Restore this many uses (Dire Gambit). */
  restoreAmount?: number | null
  /** Fill until at least this many remain (Superior Inspiration, Perfect Focus). */
  fillUntilRemaining?: number | null
  formula?: "full" | "half_level_up" | "half_level_down" | null
}

function fillUntilRemaining(currentUsed: number, max: number, minimumRemaining: number): number {
  if (max <= 0 || minimumRemaining <= 0) return currentUsed
  const remaining = Math.max(0, max - currentUsed)
  if (remaining >= minimumRemaining) return currentUsed
  return Math.max(0, max - Math.min(max, minimumRemaining))
}

function remapResourceKey(resourceKey: string): string {
  if (resourceKey === "pact_slots") return "pact_magic_slots"
  return resourceKey
}

function matchesRest(
  onRest: ResourceRefreshEffect["onRest"],
  rest: RestType,
): boolean {
  if (!onRest) return false
  if (onRest === "short_or_long_rest") return rest === "short_rest" || rest === "long_rest"
  return onRest === rest
}

function scanFeatureList(
  features: Feature[] | undefined,
  ctx: { classId: string; classLevel: number },
  catalog: ModifierCatalogEntry[],
  into: ResourceRefreshEffect[],
) {
  for (const feature of features ?? []) {
    if ((feature.level ?? 1) > ctx.classLevel) continue
    for (const instance of readLinkedModifiers(feature, catalog)) {
      for (const effect of instance.activation?.effects ?? []) {
        const refresh = refreshEffectFromFeatureEffect(effect, feature.name, ctx)
        if (refresh) into.push(refresh)
      }
    }
  }
}

function refreshEffectFromFeatureEffect(
  effect: FeatureEffect,
  featureName: string,
  ctx: { classId: string; classLevel: number },
): ResourceRefreshEffect | null {
  if (effect.kind !== "class_resource") return null
  const resourceKey = remapResourceKey(effect.classResourceKey ?? "")
  if (!resourceKey) return null
  const onInitiative = effect.resourceRefreshOnInitiative === true
  const onRest = effect.resourceRefreshOnRest ?? null
  if (!onInitiative && !onRest) return null

  const formula: ResourceRefreshEffect["formula"] =
    effect.resourceRefreshFormula === "half_level_down"
      ? "half_level_down"
      : effect.resourceRefreshFormula === "half_level"
        ? "half_level_up"
        : effect.classResourceChange === "reset" &&
            effect.classResourceAmount == null &&
            effect.resourceRefreshCap == null
          ? "full"
          : effect.resourceRefreshFormula === "full"
            ? "full"
            : null

  return {
    id: `${ctx.classId}:${featureName}:${effect.id ?? resourceKey}`,
    featureName,
    resourceKey,
    classId: ctx.classId,
    classLevel: ctx.classLevel,
    onRest,
    onInitiative,
    oncePerLongRest: effect.resourceRefreshOncePerLongRest === true,
    restoreAmount:
      effect.resourceRefreshCap == null && effect.classResourceAmount != null
        ? effect.classResourceAmount
        : null,
    fillUntilRemaining: effect.resourceRefreshCap ?? null,
    formula,
  }
}

export function collectResourceRefreshEffects(
  classDetails: CharacterClassDetail[],
  catalog: ModifierCatalogEntry[] = [],
): ResourceRefreshEffect[] {
  const entries: ResourceRefreshEffect[] = []
  for (const entry of classDetails) {
    const classId = entry.row.class_id
    if (!classId) continue
    const ctx = { classId, classLevel: entry.row.level }
    scanFeatureList(entry.class?.features as Feature[] | undefined, ctx, catalog, entries)
    if (entry.subclass) {
      scanFeatureList(entry.subclass.features as Feature[] | undefined, ctx, catalog, entries)
    }
  }
  return entries
}

function findResourceEntry(
  resourceEntries: { id: string; uses: UsesConfig; classLevel: number }[],
  effect: ResourceRefreshEffect,
) {
  const prefixed = `${effect.classId}_${effect.resourceKey}`
  return (
    resourceEntries.find((entry) => entry.id === prefixed) ??
    resourceEntries.find(
      (entry) =>
        entry.id === effect.resourceKey || entry.id.endsWith(`_${effect.resourceKey}`),
    ) ??
    null
  )
}

function nextUsedAfterRefresh(
  currentUsed: number,
  max: number,
  effect: ResourceRefreshEffect,
): number {
  if (max <= 0) return currentUsed
  if (effect.fillUntilRemaining != null && effect.fillUntilRemaining > 0) {
    return fillUntilRemaining(currentUsed, max, effect.fillUntilRemaining)
  }
  if (effect.formula === "half_level_up") {
    const restore = Math.max(1, Math.ceil(effect.classLevel / 2))
    return Math.max(0, currentUsed - restore)
  }
  if (effect.formula === "half_level_down") {
    const restore = Math.max(0, Math.floor(effect.classLevel / 2))
    return Math.max(0, currentUsed - restore)
  }
  if (effect.restoreAmount != null && effect.restoreAmount > 0) {
    return Math.max(0, currentUsed - effect.restoreAmount)
  }
  if (effect.formula === "full" || effect.formula == null) {
    return 0
  }
  return currentUsed
}

export function applyFeatureResourceRefresh(params: {
  usedResourcesById: Record<string, number>
  resourceEntries: { id: string; uses: UsesConfig; classLevel: number }[]
  resolveContext: ResolveUsesContext
  effects: ResourceRefreshEffect[]
  trigger: "initiative" | "short_rest" | "long_rest"
  rechargeCapsByResourceId?: Record<string, number>
}): {
  usedResourcesById: Record<string, number>
  rechargeCapsByResourceId: Record<string, number>
} {
  const next = { ...params.usedResourcesById }
  const caps = { ...(params.rechargeCapsByResourceId ?? {}) }

  const applicable = params.effects.filter((effect) => {
    if (params.trigger === "initiative") return effect.onInitiative === true
    return matchesRest(effect.onRest, params.trigger)
  })

  // Full once-per-long-rest restores (Uncanny Metabolism) before fill-until (Perfect Focus).
  applicable.sort((a, b) => {
    const aRank = a.oncePerLongRest ? 0 : a.fillUntilRemaining != null ? 2 : 1
    const bRank = b.oncePerLongRest ? 0 : b.fillUntilRemaining != null ? 2 : 1
    return aRank - bRank
  })

  for (const effect of applicable) {
    if (effect.oncePerLongRest && (caps[effect.id] ?? 0) >= 1) continue
    const entry = findResourceEntry(params.resourceEntries, effect)
    if (!entry) continue
    const max = resolveUsesAtLevel(entry.uses, entry.classLevel, params.resolveContext)
    if (max == null || max <= 0) continue
    const current = next[entry.id] ?? 0
    const updated = nextUsedAfterRefresh(current, max, effect)
    if (updated === current) continue
    next[entry.id] = updated
    if (effect.oncePerLongRest) caps[effect.id] = (caps[effect.id] ?? 0) + 1
  }

  return { usedResourcesById: next, rechargeCapsByResourceId: caps }
}
