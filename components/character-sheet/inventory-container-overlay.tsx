"use client"

import { motion } from "framer-motion"
import { X } from "lucide-react"
import {
  type ContainerInventoryEntry,
  type ResolvedInventoryContainer,
} from "@/lib/character/inventory-containers"
import {
  InventoryContainerContents,
  inventoryContainerCapacityText,
} from "@/components/character-sheet/inventory-container-contents"

type InventoryContainerOverlayProps = {
  container: ResolvedInventoryContainer
  entries: ContainerInventoryEntry[]
  onChange: (entries: ContainerInventoryEntry[]) => void
  onClose: () => void
}

export function InventoryContainerOverlay({
  container,
  entries,
  onChange,
  onClose,
}: InventoryContainerOverlayProps) {
  const capacityText = inventoryContainerCapacityText(container, entries)

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

        <div className="p-4">
          <InventoryContainerContents
            container={container}
            entries={entries}
            onChange={onChange}
            hint="The same list appears on the feature card."
          />
        </div>
      </motion.div>
    </motion.div>
  )
}
