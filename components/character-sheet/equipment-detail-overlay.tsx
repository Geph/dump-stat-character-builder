"use client"

import { motion } from "framer-motion"
import { X } from "lucide-react"
import type { Equipment } from "@/lib/types"
import { getEquipmentDetailRows } from "@/lib/compendium/equipment-display"

type EquipmentDetailOverlayProps = {
  item: Equipment
  onClose: () => void
}

export function EquipmentDetailOverlay({ item, onClose }: EquipmentDetailOverlayProps) {
  const detailRows = getEquipmentDetailRows(item)

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
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 p-4 border-b border-border bg-card/95 backdrop-blur-sm">
          <div>
            <h2 className="text-lg font-black text-foreground">{item.name}</h2>
            <p className="text-sm text-muted-foreground">
              {[item.category, item.subcategory].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {detailRows.length > 0 && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
              {detailRows.map((row) => (
                <div key={row.label} className="contents">
                  <dt className="text-muted-foreground font-semibold">{row.label}</dt>
                  <dd className="text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {item.description ? (
            <div>
              <h3 className="text-xs font-bold uppercase text-muted-foreground mb-1.5">Description</h3>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {item.description}
              </p>
            </div>
          ) : (
            !detailRows.length && (
              <p className="text-sm text-muted-foreground">No additional details recorded for this item.</p>
            )
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
