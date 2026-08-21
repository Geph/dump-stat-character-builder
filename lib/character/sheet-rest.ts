import type { RestType, UsesConfig } from "@/lib/types"
import {
  getRechargeAmountOnInitiative,
  getEffectiveRechargeRules,
  getRestRechargeRules,
  hasInitiativeRecharge,
  resolveRechargeRuleAmount,
} from "@/lib/compendium/normalize-uses-config"
import { resolveUsesAtLevel, type ResolveUsesContext } from "@/lib/compendium/resolve-uses-config"
import {
  isConcentrationCondition,
  spellSlotTableKey,
  type SpellSlotTable,
} from "@/lib/compendium/spell-slots"
import type { ResourceTrackerEntry } from "@/components/character-sheet/resource-uses-tracker"
import type { SheetActionEntry } from "@/lib/character/sheet-actions"
import { isShortRestActivityText } from "@/lib/character/alchemist-bomb-sheet"
import { resolveActionUsesTrackingKey } from "@/lib/character/action-uses-key"
import {
  applyFeatureResourceRefresh,
  type ResourceRefreshEffect,
} from "@/lib/character/collect-resource-refresh-effects"

export function shouldResetSpellSlotsOnRest(table: SpellSlotTable, rest: RestType): boolean {
  if (rest === "long_rest") return true
  return table.type === "pact"
}

export function applyUsesRest(
  currentUsed: number,
  uses: UsesConfig | null | undefined,
  rest: RestType,
  max: number,
  options?: {
    classLevel?: number
    rechargeCapsUsed?: number
    abilityModifiers?: Partial<Record<string, number>> | null
    proficiencyBonus?: number | null
  },
): { used: number; rechargeCapsUsed?: number } {
  if (!uses || max <= 0) return { used: currentUsed }
  if (rest === "initiative") {
    if (!hasInitiativeRecharge(uses)) return { used: currentUsed }
    const rechargeAmount = getRechargeAmountOnInitiative(uses)
    if (rechargeAmount == null) return { used: 0 }
    return { used: Math.max(0, currentUsed - rechargeAmount) }
  }
  const effectiveRules =
    options?.classLevel == null
      ? getRestRechargeRules(uses)
      : getEffectiveRechargeRules(uses, options.classLevel).filter(
          (rule): rule is Extract<typeof rule, { rest: RestType }> => "rest" in rule,
        )
  // A pool can stack more than one rule for the same rest: the Alchemist regains 1 Reagent on
  // every Short Rest and, via Reagent Synthesis, up to their INT modifier once per Long Rest.
  const rules = effectiveRules.filter((entry) => entry.rest === rest)
  if (!rules.length) return { used: currentUsed }

  let used = currentUsed
  let capsUsed = options?.rechargeCapsUsed ?? 0
  let capsConsumed = false

  for (const rule of rules) {
    const cap = rule.maxPerLongRest != null && rule.maxPerLongRest > 0 ? rule.maxPerLongRest : null
    if (cap != null && capsUsed >= cap) continue
    const rechargeAmount = resolveRechargeRuleAmount(
      rule,
      options?.classLevel ?? null,
      options?.abilityModifiers ?? null,
      { proficiencyBonus: options?.proficiencyBonus },
    )
    const nextUsed = rechargeAmount == null ? 0 : Math.max(0, used - rechargeAmount)
    if (cap != null) {
      // Don't burn a limited recharge that had nothing to restore.
      if (nextUsed === used) continue
      capsUsed += 1
      capsConsumed = true
    }
    used = nextUsed
  }

  return capsConsumed ? { used, rechargeCapsUsed: capsUsed } : { used }
}

export function applyInitiativeResourceRecharge(
  usedResourcesById: Record<string, number>,
  resourceEntries: { id: string; uses: UsesConfig; classLevel: number }[],
  resolveContext: ResolveUsesContext,
): Record<string, number> {
  const next = { ...usedResourcesById }
  for (const entry of resourceEntries) {
    if (!hasInitiativeRecharge(entry.uses)) continue
    const max = resolveUsesAtLevel(entry.uses, entry.classLevel, resolveContext)
    if (max == null || max <= 0) continue
    const current = next[entry.id] ?? 0
    next[entry.id] = applyUsesRest(current, entry.uses, "initiative", max).used
  }
  return next
}

/** Spend the lowest available spell slot at or above `minSpellLevel`. */
export function spendLowestAvailableSpellSlot(
  usedByLevel: number[],
  slotsByLevel: number[],
  minSpellLevel = 1,
): { nextUsed: number[]; spentLevel: number } | null {
  const nextUsed = [...usedByLevel]
  const floor = Math.max(1, minSpellLevel)
  for (let index = floor - 1; index < slotsByLevel.length; index += 1) {
    const max = slotsByLevel[index] ?? 0
    const used = nextUsed[index] ?? 0
    if (used < max) {
      nextUsed[index] = used + 1
      return { nextUsed, spentLevel: index + 1 }
    }
  }
  return null
}

/** Restore expended spell slots, preferring lower levels first. */
export function restoreExpendedSpellSlots(
  usedByLevel: number[],
  restoreCount: number | "all",
): number[] {
  if (restoreCount === "all") return usedByLevel.map(() => 0)
  let remaining = Math.max(0, restoreCount)
  return usedByLevel.map((used) => {
    if (remaining <= 0) return used
    const restore = Math.min(used, remaining)
    remaining -= restore
    return used - restore
  })
}

/**
 * Arcane Recovery: restore expended slots whose combined level is at most `budget`,
 * none above `maxSlotLevel`. Prefers higher-level expended slots.
 */
export function restoreSpellSlotsByCombinedLevel(
  usedByLevel: number[],
  budget: number,
  maxSlotLevel: number,
): number[] {
  const next = [...usedByLevel]
  let remaining = Math.max(0, budget)
  const cap = Math.min(Math.max(1, maxSlotLevel), next.length)
  for (let level = cap; level >= 1; level -= 1) {
    const index = level - 1
    while ((next[index] ?? 0) > 0 && remaining >= level) {
      next[index] -= 1
      remaining -= level
    }
  }
  return next
}

/** Dark Arcana expected value: INT modifier + 4 (average d8) per slot level. */
export function charnelTouchRestoreFromSlot(intMod: number, slotLevel: number): number {
  return Math.max(1, intMod + 4 * Math.max(1, slotLevel))
}

/** Magical Cunning restores half of max Pact slots (rounded up), or all with Eldritch Master. */
export function pactSlotRestoreCount(
  maxSlotsByLevel: number[],
  mode: "half_round_up" | "all",
): number | "all" {
  if (mode === "all") return "all"
  const max = maxSlotsByLevel.reduce((sum, value) => sum + value, 0)
  return Math.max(1, Math.ceil(max / 2))
}

/** Refill a spent-use tracker until at least `minimumRemaining` uses remain. */
export function applyMinimumResourceRemaining(
  currentUsed: number,
  max: number,
  minimumRemaining: number,
): number {
  if (max <= 0 || minimumRemaining <= 0) return currentUsed
  const remaining = Math.max(0, max - currentUsed)
  if (remaining >= minimumRemaining) return currentUsed
  return Math.max(0, max - Math.min(max, minimumRemaining))
}

export type ApplySheetRestParams = {
  rest: RestType
  maxHp: number
  activeConditions: string[]
  usedSpellSlotsByKey: Record<string, number[]>
  spellSlotTables: SpellSlotTable[]
  usedResourcesById: Record<string, number>
  resourceEntries: ResourceTrackerEntry[]
  usedActionUsesById: Record<string, number>
  sheetActions: SheetActionEntry[]
  resolveContext: ResolveUsesContext
  rechargeCapsByResourceId?: Record<string, number>
  resourceRefreshEffects?: ResourceRefreshEffect[]
}

export type SheetRestResult = {
  currentHp?: number
  tempHp?: number
  deathSaves?: { successes: number; failures: number }
  activeConditions?: string[]
  usedSpellSlotsByKey: Record<string, number[]>
  usedResourcesById: Record<string, number>
  usedActionUsesById: Record<string, number>
  rechargeCapsByResourceId?: Record<string, number>
  /** Human-readable lines describing what this rest restored. */
  summary: string[]
}

function sumSlotUses(slots: number[] | undefined): number {
  return (slots ?? []).reduce((sum, value) => sum + value, 0)
}

export function applySheetRest(params: ApplySheetRestParams): SheetRestResult {
  const {
    rest,
    maxHp,
    activeConditions,
    usedSpellSlotsByKey,
    spellSlotTables,
    usedResourcesById,
    resourceEntries,
    usedActionUsesById,
    sheetActions,
    resolveContext,
    rechargeCapsByResourceId = {},
    resourceRefreshEffects = [],
  } = params

  const summary: string[] = []

  const nextSlots = { ...usedSpellSlotsByKey }
  for (const table of spellSlotTables) {
    if (!shouldResetSpellSlotsOnRest(table, rest)) continue
    const key = spellSlotTableKey(table)
    const before = sumSlotUses(usedSpellSlotsByKey[key])
    nextSlots[key] = table.slotsByLevel.map(() => 0)
    if (before > 0) {
      summary.push(
        table.type === "pact"
          ? `Restored ${table.className} pact magic (${before} slot${before === 1 ? "" : "s"})`
          : `Restored ${table.className} spell slots (${before})`,
      )
    }
  }

  const nextResources = { ...usedResourcesById }
  const nextRechargeCaps = { ...rechargeCapsByResourceId }
  for (const entry of resourceEntries) {
    const max = resolveUsesAtLevel(entry.uses, entry.classLevel, resolveContext)
    if (max == null || max <= 0) continue
    const current = nextResources[entry.id] ?? 0
    const applied = applyUsesRest(current, entry.uses, rest, max, {
      classLevel: entry.classLevel,
      rechargeCapsUsed: nextRechargeCaps[entry.id] ?? 0,
      abilityModifiers: resolveContext.abilityModifiers,
      proficiencyBonus: resolveContext.proficiencyBonus,
    })
    nextResources[entry.id] = applied.used
    if (applied.rechargeCapsUsed != null) {
      nextRechargeCaps[entry.id] = applied.rechargeCapsUsed
    }
    const restored = current - applied.used
    if (restored > 0) {
      summary.push(
        `Restored ${entry.name} (${restored} use${restored === 1 ? "" : "s"})`,
      )
    }
  }

  if (resourceRefreshEffects.length && (rest === "short_rest" || rest === "long_rest")) {
    const beforeRefresh = { ...nextResources }
    const refreshed = applyFeatureResourceRefresh({
      usedResourcesById: nextResources,
      resourceEntries,
      resolveContext,
      effects: resourceRefreshEffects,
      trigger: rest,
      rechargeCapsByResourceId: nextRechargeCaps,
    })
    Object.assign(nextResources, refreshed.usedResourcesById)
    Object.assign(nextRechargeCaps, refreshed.rechargeCapsByResourceId)
    for (const entry of resourceEntries) {
      const restored = (beforeRefresh[entry.id] ?? 0) - (nextResources[entry.id] ?? 0)
      if (restored > 0 && !summary.some((line) => line.includes(entry.name))) {
        summary.push(
          `Restored ${entry.name} (${restored} use${restored === 1 ? "" : "s"})`,
        )
      }
    }
  }

  const nextActions = { ...usedActionUsesById }
  const seenShareKeys = new Set<string>()
  for (const action of sheetActions) {
    if (!action.limitedUses) continue
    const max = resolveUsesAtLevel(action.limitedUses, action.classLevel, resolveContext)
    if (max == null || max <= 0) continue
    const trackingId = resolveActionUsesTrackingKey(action)
    if (seenShareKeys.has(trackingId)) continue
    seenShareKeys.add(trackingId)
    const current = nextActions[trackingId] ?? 0
    const nextUsed = applyUsesRest(current, action.limitedUses, rest, max).used
    nextActions[trackingId] = nextUsed
    const restored = current - nextUsed
    if (restored > 0) {
      summary.push(
        `Restored ${action.name} (${restored} use${restored === 1 ? "" : "s"})`,
      )
    }
  }

  const result: SheetRestResult = {
    usedSpellSlotsByKey: nextSlots,
    usedResourcesById: nextResources,
    usedActionUsesById: nextActions,
    rechargeCapsByResourceId: nextRechargeCaps,
    summary,
  }

  if (rest === "short_rest" || rest === "long_rest") {
    const seenActivities = new Set<string>()
    for (const action of sheetActions) {
      if (!isShortRestActivityText(action.name, action.description)) continue
      const key = action.name.trim().toLowerCase()
      if (seenActivities.has(key)) continue
      seenActivities.add(key)
      summary.push(`Available: ${action.name}`)
    }
  }

  if (rest === "long_rest") {
    result.currentHp = maxHp
    result.tempHp = 0
    result.deathSaves = { successes: 0, failures: 0 }
    result.rechargeCapsByResourceId = {}
    summary.unshift(`Hit points restored to ${maxHp}`)
    summary.push("Temporary HP cleared")
    summary.push("Death saves reset")
    const clearedConcentration = activeConditions.filter((name) => isConcentrationCondition(name))
    if (clearedConcentration.length) {
      result.activeConditions = activeConditions.filter((name) => !isConcentrationCondition(name))
      summary.push(
        `Ended concentration${clearedConcentration.length > 1 ? ` (${clearedConcentration.length})` : ""}`,
      )
    }
  }

  if (summary.length === 0) {
    summary.push(
      rest === "short_rest"
        ? "No short-rest resources needed restoring"
        : "No additional resources needed restoring",
    )
  }

  return result
}
