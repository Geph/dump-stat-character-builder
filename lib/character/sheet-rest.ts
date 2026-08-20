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
import { resolveActionUsesTrackingKey } from "@/lib/character/action-uses-key"

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
