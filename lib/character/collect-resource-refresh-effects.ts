import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { readLinkedModifiers } from "@/lib/compendium/linked-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { resolveRestoreAmount, type RestoreAmountConfig } from "@/lib/compendium/restore-amount-config"
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
  onCriticalHit?: boolean
  oncePerLongRest?: boolean
  /** Restore this many uses (Dire Gambit). */
  restoreAmount?: number | null
  restoreAmountConfig?: RestoreAmountConfig | null
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
        const refresh = refreshEffectFromFeatureEffect(effect, feature.name, feature.description, ctx)
        if (refresh) into.push(refresh)
      }
    }
  }
}

function featureTextMentionsCriticalHit(description: string | null | undefined): boolean {
  return /\bcritical hits?\b/i.test(description ?? "")
}

function refreshEffectFromFeatureEffect(
  effect: FeatureEffect,
  featureName: string,
  featureDescription: string | null | undefined,
  ctx: { classId: string; classLevel: number },
): ResourceRefreshEffect | null {
  if (effect.kind !== "class_resource") return null
  const resourceKey = remapResourceKey(effect.classResourceKey ?? "")
  if (!resourceKey) return null
  const onInitiative = effect.resourceRefreshOnInitiative === true
  const onCriticalHit =
    effect.resourceRefreshOnCriticalHit === true ||
    (onInitiative && featureTextMentionsCriticalHit(featureDescription))
  const onRest = effect.resourceRefreshOnRest ?? null
  if (!onInitiative && !onCriticalHit && !onRest) return null

  const explicitFull = effect.resourceRefreshFormula === "full"
  const formula: ResourceRefreshEffect["formula"] =
    effect.resourceRefreshFormula === "half_level_down"
      ? "half_level_down"
      : effect.resourceRefreshFormula === "half_level"
        ? "half_level_up"
        : explicitFull
          ? "full"
          : effect.classResourceChange === "reset" &&
              effect.classResourceAmount == null &&
              effect.resourceRefreshCap == null &&
              !onInitiative &&
              !onCriticalHit
            ? "full"
            : null

  const restoreAmount =
    effect.resourceRefreshCap == null && effect.classResourceAmount != null
      ? effect.classResourceAmount
      : effect.resourceRefreshCap == null &&
          (onInitiative || onCriticalHit) &&
          !explicitFull
        ? 1
        : null

  return {
    id: `${ctx.classId}:${featureName}:${effect.id ?? resourceKey}`,
    featureName,
    resourceKey,
    classId: ctx.classId,
    classLevel: ctx.classLevel,
    onRest,
    onInitiative,
    onCriticalHit,
    oncePerLongRest: effect.resourceRefreshOncePerLongRest === true,
    restoreAmount,
    restoreAmountConfig: effect.classResourceAmountConfig ?? null,
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
  resolveContext: ResolveUsesContext,
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
  if (effect.restoreAmountConfig) {
    const restore = resolveRestoreAmount(effect.restoreAmountConfig, {
      proficiencyBonus: resolveContext.proficiencyBonus,
      abilityModifiers: resolveContext.abilityModifiers,
    })
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
  trigger: "initiative" | "critical_hit" | "short_rest" | "long_rest"
  rechargeCapsByResourceId?: Record<string, number>
}): {
  usedResourcesById: Record<string, number>
  rechargeCapsByResourceId: Record<string, number>
} {
  const next = { ...params.usedResourcesById }
  const caps = { ...(params.rechargeCapsByResourceId ?? {}) }

  const applicable = params.effects.filter((effect) => {
    if (params.trigger === "initiative") return effect.onInitiative === true
    if (params.trigger === "critical_hit") return effect.onCriticalHit === true
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
    const updated = nextUsedAfterRefresh(current, max, effect, params.resolveContext)
    if (updated === current) continue
    next[entry.id] = updated
    if (effect.oncePerLongRest) caps[effect.id] = (caps[effect.id] ?? 0) + 1
  }

  return { usedResourcesById: next, rechargeCapsByResourceId: caps }
}
