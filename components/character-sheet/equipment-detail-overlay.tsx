"use client"

import { motion } from "framer-motion"
import { X } from "lucide-react"
import { MagicEquipmentBadges } from "@/components/character-sheet/magic-equipment-badges"
import {
  getBaseSelectionOptions,
  resolveCharacterEquipment,
} from "@/lib/compendium/equipment-base-selection"
import { getEquipmentDetailRows } from "@/lib/compendium/equipment-display"
import { readMagicEffects } from "@/lib/compendium/equipment-magic"
import { isMagicItem } from "@/lib/compendium/equipment-attunement"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import type { Equipment } from "@/lib/types"

type EquipmentDetailOverlayProps = {
  item: Equipment
  catalog?: Equipment[]
  baseSelections?: Record<string, string>
  onClose: () => void
}

export function EquipmentDetailOverlay({
  item,
  catalog = [],
  baseSelections = {},
  onClose,
}: EquipmentDetailOverlayProps) {
  const resolved = catalog.length
    ? resolveCharacterEquipment(item, catalog, baseSelections)
    : item
  const detailRows = getEquipmentDetailRows(resolved)
  const magicEffects = readMagicEffects(item)
  const baseOptions = catalog.length ? getBaseSelectionOptions(item, catalog) : []
  const selectedBaseId = baseSelections[item.id] ?? item.selected_base_equipment_id ?? null
  const selectedBase = selectedBaseId
    ? baseOptions.find((entry) => entry.id === selectedBaseId) ??
      catalog.find((entry) => entry.id === selectedBaseId)
    : null

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
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-foreground">{item.name}</h2>
              <MagicEquipmentBadges item={item} />
            </div>
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
          {selectedBase && (
            <p className="text-xs text-muted-foreground">
              Base item: <span className="font-semibold text-foreground">{selectedBase.name}</span>
            </p>
          )}

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

          {isMagicItem(item) && magicEffects.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase text-muted-foreground mb-1.5">
                Magic effects
              </h3>
              <p className="text-sm text-foreground">
                {magicEffects.length} linked modifier{magicEffects.length === 1 ? "" : "s"} apply when
                this item is active.
              </p>
            </div>
          )}

          {item.description ? (
            <div>
              <h3 className="text-xs font-bold uppercase text-muted-foreground mb-1.5">Description</h3>
              <RichTextContent html={item.description} className="text-sm text-foreground leading-relaxed" />
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
