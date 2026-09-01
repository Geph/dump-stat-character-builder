"use client"

import { RotateCcw } from "lucide-react"
import { GameIcon } from "@/components/game-icon-picker"
import { resolveUsesAtLevel, formatResourceDieLabel, type ResolveUsesContext } from "@/lib/compendium/resolve-uses-config"
import { spellSlotTableKey, type SpellSlotTable } from "@/lib/compendium/spell-slots"
import { applyUsedSpellSlotToResourceRestore } from "@/lib/character/resource-conversion"
import type { UsesConfig } from "@/lib/types"

export type ResourceTrackerEntry = {
  id: string
  name: string
  uses: UsesConfig
  classLevel: number
  /** Owning class icon shown to the left of the resource name. */
  icon?: string | null
}

type ResourceUsesTrackerProps = {
  entries: ResourceTrackerEntry[]
  usedById: Record<string, number>
  onUsedChange: (next: Record<string, number>) => void
  resolveContext: ResolveUsesContext
  spellSlotTables?: SpellSlotTable[]
  usedSpellSlotsByKey?: Record<string, number[]>
  onUsedSpellSlotsChange?: (next: Record<string, number[]>) => void
}

function resolveMax(entry: ResourceTrackerEntry, ctx: ResolveUsesContext): number | null {
  return resolveUsesAtLevel(entry.uses, entry.classLevel, ctx)
}

export function ResourceUsesTracker({
  entries,
  usedById,
  onUsedChange,
  resolveContext,
  spellSlotTables = [],
  usedSpellSlotsByKey = {},
  onUsedSpellSlotsChange,
}: ResourceUsesTrackerProps) {
  const trackable = entries
    .map((entry) => {
      const max = resolveMax(entry, resolveContext)
      if (max == null || max <= 0) return null
      return { entry, max }
    })
    .filter(Boolean) as { entry: ResourceTrackerEntry; max: number }[]

  if (!trackable.length) return null

  const resetAll = () => {
    const next = { ...usedById }
    for (const { entry } of trackable) next[entry.id] = 0
    onUsedChange(next)
  }

  const toggleUse = (id: string, max: number, slotIndex: number) => {
    const used = usedById[id] ?? 0
    const isUsed = slotIndex < used
    const nextUsed = isUsed ? Math.max(0, used - 1) : used < max ? used + 1 : used
    onUsedChange({ ...usedById, [id]: nextUsed })
  }

  const setUsed = (id: string, max: number, value: number) => {
    const nextUsed = Math.max(0, Math.min(max, Math.floor(value)))
    onUsedChange({ ...usedById, [id]: nextUsed })
  }

  const restoreWithSpellSlot = (entry: ResourceTrackerEntry, max: number) => {
    const conversion = entry.uses.restoreBySpellSlot
    if (!conversion || !onUsedSpellSlotsChange) return
    for (const table of spellSlotTables) {
      const key = spellSlotTableKey(table)
      const usedSlots = usedSpellSlotsByKey[key] ?? table.slotsByLevel.map(() => 0)
      const result = applyUsedSpellSlotToResourceRestore({
        slotTotalsByLevel: table.slotsByLevel,
        usedSlotsByLevel: usedSlots,
        minSpellLevel: conversion.minSpellLevel,
        resourceUsed: usedById[entry.id] ?? 0,
        restores: conversion.restores,
      })
      if (result.spentSlotLevel == null) continue
      onUsedSpellSlotsChange({ ...usedSpellSlotsByKey, [key]: result.nextUsedSlots })
      setUsed(entry.id, max, result.nextResourceUsed)
      return
    }
  }

  const hasAvailableSpellSlot = (uses: UsesConfig): boolean => {
    const conversion = uses.restoreBySpellSlot
    if (!conversion) return false
    return spellSlotTables.some((table) => {
      const key = spellSlotTableKey(table)
      const used = usedSpellSlotsByKey[key] ?? []
      return table.slotsByLevel.some(
        (total, index) =>
          index >= conversion.minSpellLevel - 1 && (used[index] ?? 0) < total,
      )
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase">Class Resources</h3>
        <button
          type="button"
          onClick={resetAll}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
          title="Restore all resources"
        >
          <RotateCcw className="w-3 h-3" />
          Rest
        </button>
      </div>
      {trackable.map(({ entry, max }) => {
        const used = usedById[entry.id] ?? 0
        const dieLabel = formatResourceDieLabel(entry.uses, entry.classLevel)
        const displayName = dieLabel ? `${entry.name} (${dieLabel})` : entry.name
        return (
          <div key={entry.id} className="rounded-lg border border-border/70 bg-muted/25 p-2.5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                {entry.icon ? (
                  <GameIcon name={entry.icon} className="h-4 w-4 shrink-0 text-primary" />
                ) : null}
                <p className="text-xs font-bold text-foreground">{displayName}</p>
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {max - used} / {max}
              </span>
            </div>
            {max > 12 ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUsed(entry.id, max, used - 1)}
                  className="h-7 rounded border border-border px-2 text-xs font-semibold hover:bg-muted"
                  aria-label={`Restore one ${entry.name}`}
                >
                  −
                </button>
                <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Spent
                  <input
                    type="number"
                    min={0}
                    max={max}
                    value={used}
                    onChange={(event) => setUsed(entry.id, max, Number(event.target.value))}
                    className="h-7 w-16 rounded border border-border bg-background px-2 text-center text-xs font-bold text-foreground"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setUsed(entry.id, max, used + 1)}
                  className="h-7 rounded border border-border px-2 text-xs font-semibold hover:bg-muted"
                  aria-label={`Spend one ${entry.name}`}
                >
                  +
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: max }, (_, index) => {
                  const isUsed = index < used
                  return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleUse(entry.id, max, index)}
                    className={`h-5 w-5 rounded-full border transition-colors ${
                      isUsed
                        ? "border-primary bg-primary hover:bg-primary/90"
                        : "border-primary bg-transparent hover:bg-primary/20"
                    }`}
                    title={isUsed ? "Mark available" : "Mark spent"}
                    aria-label={`${entry.name} use ${index + 1}${isUsed ? " spent" : " available"}`}
                  />
                  )
                })}
              </div>
            )}
            {entry.uses.restoreBySpellSlot ? (
              <button
                type="button"
                disabled={
                  used <= 0 ||
                  !onUsedSpellSlotsChange ||
                  !hasAvailableSpellSlot(entry.uses)
                }
                onClick={() => restoreWithSpellSlot(entry, max)}
                className="mt-2 rounded border border-border px-2 py-1 text-[10px] font-semibold disabled:opacity-40"
              >
                Spend level {entry.uses.restoreBySpellSlot.minSpellLevel}+ slot to restore{" "}
                {entry.uses.restoreBySpellSlot.restores}
              </button>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
