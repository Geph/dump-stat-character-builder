import type { RestType, UsesConfig } from "@/lib/types"
import {
  getRechargeAmount,
  getRechargeAmountOnInitiative,
  getRechargeRules,
  hasInitiativeRecharge,
  isRestRechargeEnabled,
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
  },
): { used: number; rechargeCapsUsed?: number } {
  if (!uses || max <= 0) return { used: currentUsed }
  if (rest === "initiative") {
    if (!hasInitiativeRecharge(uses)) return { used: currentUsed }
    const rechargeAmount = getRechargeAmountOnInitiative(uses)
    if (rechargeAmount == null) return { used: 0 }
    return { used: Math.max(0, currentUsed - rechargeAmount) }
  }
  if (!isRestRechargeEnabled(uses, rest)) return { used: currentUsed }

  const rule = getRechargeRules(uses).find((entry) => entry.rest === rest)
  if (rule?.maxPerLongRest != null && rule.maxPerLongRest > 0) {
    const usedCaps = options?.rechargeCapsUsed ?? 0
    if (usedCaps >= rule.maxPerLongRest) return { used: currentUsed }
    const rechargeAmount = resolveRechargeRuleAmount(rule, options?.classLevel ?? null)
    const nextUsed =
      rechargeAmount == null ? 0 : Math.max(0, currentUsed - rechargeAmount)
    return { used: nextUsed, rechargeCapsUsed: usedCaps + 1 }
  }

  const rechargeAmount = rule
    ? resolveRechargeRuleAmount(rule, options?.classLevel ?? null)
    : getRechargeAmount(uses, rest)
  if (rechargeAmount == null) return { used: 0 }
  return { used: Math.max(0, currentUsed - rechargeAmount) }
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

  const nextSlots = { ...usedSpellSlotsByKey }
  for (const table of spellSlotTables) {
    if (!shouldResetSpellSlotsOnRest(table, rest)) continue
    const key = spellSlotTableKey(table)
    nextSlots[key] = table.slotsByLevel.map(() => 0)
  }

  const nextResources = { ...usedResourcesById }
  const nextRechargeCaps = { ...rechargeCapsByResourceId }
  for (const entry of resourceEntries) {
    if (entry.uses.type === "special") continue
    const max = resolveUsesAtLevel(entry.uses, entry.classLevel, resolveContext)
    if (max == null || max <= 0) continue
    const current = nextResources[entry.id] ?? 0
    const applied = applyUsesRest(current, entry.uses, rest, max, {
      classLevel: entry.classLevel,
      rechargeCapsUsed: nextRechargeCaps[entry.id] ?? 0,
    })
    nextResources[entry.id] = applied.used
    if (applied.rechargeCapsUsed != null) {
      nextRechargeCaps[entry.id] = applied.rechargeCapsUsed
    }
  }

  const nextActions = { ...usedActionUsesById }
  for (const action of sheetActions) {
    if (!action.limitedUses) continue
    const max = resolveUsesAtLevel(action.limitedUses, action.classLevel, resolveContext)
    if (max == null || max <= 0) continue
    const current = nextActions[action.id] ?? 0
    nextActions[action.id] = applyUsesRest(current, action.limitedUses, rest, max).used
  }

  const result: SheetRestResult = {
    usedSpellSlotsByKey: nextSlots,
    usedResourcesById: nextResources,
    usedActionUsesById: nextActions,
    rechargeCapsByResourceId: nextRechargeCaps,
  }

  if (rest === "long_rest") {
    result.currentHp = maxHp
    result.tempHp = 0
    result.deathSaves = { successes: 0, failures: 0 }
    result.rechargeCapsByResourceId = {}
    const clearedConcentration = activeConditions.filter((name) => isConcentrationCondition(name))
    if (clearedConcentration.length) {
      result.activeConditions = activeConditions.filter((name) => !isConcentrationCondition(name))
    }
  }

  return result
}
