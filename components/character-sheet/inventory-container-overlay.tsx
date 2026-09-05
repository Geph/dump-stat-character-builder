"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Plus, Trash2, X } from "lucide-react"
import {
  containerCapacityRemaining,
  containerOccupancy,
  type ContainerInventoryEntry,
  type ResolvedInventoryContainer,
} from "@/lib/character/inventory-containers"
import type { InventoryContainerContentKind } from "@/lib/compendium/characteristic-modifiers"
import { cn } from "@/lib/utils"

const KIND_LABELS: Record<InventoryContainerContentKind, string> = {
  equipment: "Item",
  corpse: "Corpse / bones",
  companion: "Undead / thrall",
  freeform: "Other",
}

type InventoryContainerOverlayProps = {
  container: ResolvedInventoryContainer
  entries: ContainerInventoryEntry[]
  onChange: (entries: ContainerInventoryEntry[]) => void
  onClose: () => void
}

function createEntryId(): string {
  return `entry_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function InventoryContainerOverlay({
  container,
  entries,
  onChange,
  onClose,
}: InventoryContainerOverlayProps) {
  const kinds = container.characteristic.contentKinds?.length
    ? container.characteristic.contentKinds
    : (["freeform"] as InventoryContainerContentKind[])
  const [draftKind, setDraftKind] = useState<InventoryContainerContentKind>(kinds[0]!)
  const [draftLabel, setDraftLabel] = useState("")
  const [draftNotes, setDraftNotes] = useState("")

  const occupancy = containerOccupancy(entries)
  const remaining = containerCapacityRemaining(container.characteristic, entries)
  const capacityAmount = container.characteristic.capacityAmount
  const atCapacity = remaining != null && remaining <= 0
  const capacityText =
    container.characteristic.capacityLabel?.trim() ||
    (container.characteristic.capacityMode === "slot_count" && capacityAmount != null
      ? `${occupancy} / ${capacityAmount} slots`
      : container.characteristic.capacityMode === "cubic_feet" && capacityAmount != null
        ? `Up to ${capacityAmount} cubic feet`
        : container.characteristic.capacityMode === "weight_lb" && capacityAmount != null
          ? `Up to ${capacityAmount} lb`
          : null)

  const addEntry = () => {
    const label = draftLabel.trim()
    if (!label || atCapacity) return
    onChange([
      ...entries,
      {
        id: createEntryId(),
        kind: draftKind,
        label: label.slice(0, 120),
        quantity: 1,
        notes: draftNotes.trim() ? draftNotes.trim().slice(0, 500) : null,
      },
    ])
    setDraftLabel("")
    setDraftNotes("")
  }

  const removeEntry = (id: string) => {
    onChange(entries.filter((entry) => entry.id !== id))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-card border-2 border-border rounded-2xl shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 p-4 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-foreground truncate">{container.label}</h2>
            <p className="text-sm text-muted-foreground">
              {[
                container.sourceFeatureName
                  ? `${container.sourceFeatureName} storage`
                  : "Extradimensional storage",
                container.linkedHostName && container.linkedHostName !== container.label
                  ? `Host: ${container.linkedHostName}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {capacityText ? (
              <p className="mt-1 text-xs font-semibold tabular-nums text-foreground">
                {capacityText}
                {remaining != null && container.characteristic.capacityLabel
                  ? ` · ${occupancy}${capacityAmount != null ? ` / ${capacityAmount}` : ""} occupied`
                  : null}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nothing stored yet.</p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{entry.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {KIND_LABELS[entry.kind]}
                      {(entry.quantity ?? 1) > 1 ? ` · ×${entry.quantity}` : ""}
                    </p>
                    {entry.notes ? (
                      <p className="mt-1 text-xs text-foreground/80 whitespace-pre-wrap">
                        {entry.notes}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${entry.label}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Add contents
            </p>
            {kinds.length > 1 ? (
              <div className="flex flex-wrap gap-1.5">
                {kinds.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setDraftKind(kind)}
                    className={cn(
                      "rounded-lg border px-2 py-1 text-[11px] font-semibold",
                      draftKind === kind
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {KIND_LABELS[kind]}
                  </button>
                ))}
              </div>
            ) : null}
            <input
              type="text"
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  addEntry()
                }
              }}
              placeholder={
                draftKind === "corpse"
                  ? "e.g. Humanoid corpse, pile of bones…"
                  : draftKind === "companion"
                    ? "e.g. Skeleton thrall…"
                    : "Name what you store…"
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            <textarea
              value={draftNotes}
              onChange={(event) => setDraftNotes(event.target.value)}
              rows={2}
              placeholder="Optional notes"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            <button
              type="button"
              disabled={!draftLabel.trim() || atCapacity}
              onClick={addEntry}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              {atCapacity ? "At capacity" : "Add"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
