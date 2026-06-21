"use client"

import {
  ACTION_KIND_LABELS,
  type ActionEconomyKind,
  type SheetActionEntry,
} from "@/lib/character/sheet-actions"
import { resolveUsesAtLevel, type ResolveUsesContext } from "@/lib/compendium/resolve-uses-config"
import type { UsesConfig } from "@/lib/types"

type SheetActionsPanelProps = {
  actions: SheetActionEntry[]
  usedByActionId: Record<string, number>
  onUsedChange: (next: Record<string, number>) => void
  resolveContext: ResolveUsesContext
}

function resolveActionMax(
  uses: UsesConfig | null | undefined,
  classLevel: number,
  ctx: ResolveUsesContext,
): number | null {
  if (!uses || uses.type === "unlimited") return null
  return resolveUsesAtLevel(uses, classLevel, ctx)
}

function ActionUseDots({
  actionId,
  max,
  used,
  onToggle,
}: {
  actionId: string
  max: number
  used: number
  onToggle: (actionId: string, slotIndex: number, max: number) => void
}) {
  return (
    <div className="flex gap-1 shrink-0">
      {Array.from({ length: max }, (_, index) => {
        const isUsed = index < used
        return (
          <button
            key={index}
            type="button"
            onClick={() => onToggle(actionId, index, max)}
            className={`h-3.5 w-3.5 rounded border ${
              isUsed
                ? "border-primary bg-primary"
                : "border-border bg-background hover:border-primary/50"
            }`}
            aria-label={`Use ${index + 1}${isUsed ? " spent" : ""}`}
          />
        )
      })}
    </div>
  )
}

export function SheetActionsPanel({
  actions,
  usedByActionId,
  onUsedChange,
  resolveContext,
}: SheetActionsPanelProps) {
  if (!actions.length) {
    return <p className="text-xs text-muted-foreground italic">No action-economy abilities listed.</p>
  }

  const toggleUse = (actionId: string, slotIndex: number, max: number) => {
    const used = usedByActionId[actionId] ?? 0
    const isUsed = slotIndex < used
    onUsedChange({
      ...usedByActionId,
      [actionId]: isUsed ? slotIndex : slotIndex + 1,
    })
  }

  const grouped: Record<ActionEconomyKind, SheetActionEntry[]> = {
    action: [],
    bonus: [],
    reaction: [],
  }
  for (const entry of actions) {
    for (const kind of entry.kinds) {
      if (!grouped[kind].some((existing) => existing.id === entry.id)) {
        grouped[kind].push(entry)
      }
    }
  }

  return (
    <div className="space-y-3">
      {(Object.keys(grouped) as ActionEconomyKind[]).map((kind) => {
        const entries = grouped[kind]
        if (!entries.length) return null
        return (
          <div key={kind}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
              {ACTION_KIND_LABELS[kind]}
            </p>
            <div className="space-y-1">
              {entries.map((entry) => {
                const max = resolveActionMax(entry.limitedUses, entry.classLevel, resolveContext)
                const used = usedByActionId[entry.id] ?? 0
                return (
                  <div
                    key={`${kind}-${entry.id}`}
                    className="flex items-center justify-between gap-2 rounded border border-border/70 bg-muted/25 px-2 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{entry.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{entry.sourceLabel}</p>
                    </div>
                    {max != null && max > 0 ? (
                      <ActionUseDots
                        actionId={entry.id}
                        max={max}
                        used={used}
                        onToggle={toggleUse}
                      />
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
