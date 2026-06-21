import type { RestType, UsesConfig } from "@/lib/types"
import {
  getRechargeAmount,
  getRechargeAmountOnInitiative,
  hasInitiativeRecharge,
  isRestRechargeEnabled,
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
): number {
  if (!uses || max <= 0) return currentUsed
  if (rest === "initiative") {
    if (!hasInitiativeRecharge(uses)) return currentUsed
    const rechargeAmount = getRechargeAmountOnInitiative(uses)
    if (rechargeAmount == null) return 0
    return Math.max(0, currentUsed - rechargeAmount)
  }
  if (!isRestRechargeEnabled(uses, rest)) return currentUsed
  const rechargeAmount = getRechargeAmount(uses, rest)
  if (rechargeAmount == null) return 0
  return Math.max(0, currentUsed - rechargeAmount)
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
    next[entry.id] = applyUsesRest(current, entry.uses, "initiative", max)
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
}

export type SheetRestResult = {
  currentHp?: number
  tempHp?: number
  deathSaves?: { successes: number; failures: number }
  activeConditions?: string[]
  usedSpellSlotsByKey: Record<string, number[]>
  usedResourcesById: Record<string, number>
  usedActionUsesById: Record<string, number>
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
  } = params

  const nextSlots = { ...usedSpellSlotsByKey }
  for (const table of spellSlotTables) {
    if (!shouldResetSpellSlotsOnRest(table, rest)) continue
    const key = spellSlotTableKey(table)
    nextSlots[key] = table.slotsByLevel.map(() => 0)
  }

  const nextResources = { ...usedResourcesById }
  for (const entry of resourceEntries) {
    if (entry.uses.type === "special") continue
    const max = resolveUsesAtLevel(entry.uses, entry.classLevel, resolveContext)
    if (max == null || max <= 0) continue
    const current = nextResources[entry.id] ?? 0
    nextResources[entry.id] = applyUsesRest(current, entry.uses, rest, max)
  }

  const nextActions = { ...usedActionUsesById }
  for (const action of sheetActions) {
    if (!action.limitedUses) continue
    const max = resolveUsesAtLevel(action.limitedUses, action.classLevel, resolveContext)
    if (max == null || max <= 0) continue
    const current = nextActions[action.id] ?? 0
    nextActions[action.id] = applyUsesRest(current, action.limitedUses, rest, max)
  }

  const result: SheetRestResult = {
    usedSpellSlotsByKey: nextSlots,
    usedResourcesById: nextResources,
    usedActionUsesById: nextActions,
  }

  if (rest === "long_rest") {
    result.currentHp = maxHp
    result.tempHp = 0
    result.deathSaves = { successes: 0, failures: 0 }
    const clearedConcentration = activeConditions.filter((name) => isConcentrationCondition(name))
    if (clearedConcentration.length) {
      result.activeConditions = activeConditions.filter((name) => !isConcentrationCondition(name))
    }
  }

  return result
}
