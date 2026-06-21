"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Coins, Plus, Search, X } from "lucide-react"
import { PickerGridPagination } from "@/components/builder/picker-grid-pagination"
import { filterEquipmentList } from "@/lib/compendium/equipment-display"
import {
  EQUIPMENT_CATEGORY_ORDER,
  groupEquipmentByCategory,
} from "@/lib/compendium/equipment-categories"
import { formatEquipmentCost, getEquipmentCostGp } from "@/lib/builder/equipment-utils"
import { paginateList } from "@/lib/builder/picker-pagination"
import { usePickerPageSize } from "@/hooks/use-picker-page-size"
import type { Equipment } from "@/lib/types"

type SheetAddEquipmentOverlayProps = {
  open: boolean
  onClose: () => void
  catalog: Equipment[]
  ownedIds: string[]
  currentGold: number
  onAddItem: (item: Equipment, options: { deductCost: boolean }) => void
}

export function SheetAddEquipmentOverlay({
  open,
  onClose,
  catalog,
  ownedIds,
  currentGold,
  onAddItem,
}: SheetAddEquipmentOverlayProps) {
  const pageSize = usePickerPageSize()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [categoryPages, setCategoryPages] = useState<Record<string, number>>({})

  const ownedSet = useMemo(() => new Set(ownedIds), [ownedIds])

  const categoryOptions = useMemo(() => {
    const seen = new Set<string>()
    for (const item of catalog) {
      if (item.category?.trim()) seen.add(item.category.trim())
    }
    return EQUIPMENT_CATEGORY_ORDER.filter((cat) => seen.has(cat)).concat(
      [...seen]
        .filter(
          (cat) => !EQUIPMENT_CATEGORY_ORDER.includes(cat as (typeof EQUIPMENT_CATEGORY_ORDER)[number]),
        )
        .sort(),
    )
  }, [catalog])

  const equipmentGroups = useMemo(() => {
    const available = catalog.filter((item) => !ownedSet.has(item.id))
    const searched = filterEquipmentList(available, search)
    const filtered =
      categoryFilter === "all"
        ? searched
        : searched.filter((item) => (item.category?.trim() || "Other") === categoryFilter)
    return groupEquipmentByCategory(filtered)
  }, [catalog, ownedSet, search, categoryFilter])

  return (
    <AnimatePresence>
      {open && (
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
            className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-card border-2 border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-lg font-black text-foreground">Add Equipment</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Choose from the compendium. Use <span className="font-semibold">Add</span> for loot
                  or <span className="font-semibold">Buy</span> to spend gold.
                </p>
                <p className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-foreground">
                  <Coins className="w-4 h-4 text-primary" />
                  {currentGold} GP available
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 border-b border-border shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search equipment..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-auto text-sm px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="all">All categories</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {equipmentGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No matching equipment to add.
                </p>
              ) : (
                equipmentGroups.map((group) => {
                  const page = categoryPages[group.category] ?? 0
                  const { items, pageCount } = paginateList(group.items, page, pageSize)
                  const safePage = Math.min(page, Math.max(0, pageCount - 1))

                  return (
                    <div key={group.category}>
                      <h3 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                        {group.category}
                      </h3>
                      <div className="space-y-1.5">
                        {items.map((item) => {
                          const costGp = getEquipmentCostGp(item)
                          const canBuy = costGp > 0 && currentGold >= costGp
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">
                                  {item.name}
                                </p>
                                {costGp > 0 && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatEquipmentCost(item)}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => onAddItem(item, { deductCost: false })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-border bg-card hover:border-primary/50 transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Add
                                </button>
                                {costGp > 0 && (
                                  <button
                                    type="button"
                                    disabled={!canBuy}
                                    onClick={() => onAddItem(item, { deductCost: true })}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Buy
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {pageCount > 1 && (
                        <PickerGridPagination
                          page={safePage}
                          pageCount={pageCount}
                          onPrevious={() =>
                            setCategoryPages((prev) => ({
                              ...prev,
                              [group.category]: Math.max(0, safePage - 1),
                            }))
                          }
                          onNext={() =>
                            setCategoryPages((prev) => ({
                              ...prev,
                              [group.category]: Math.min(pageCount - 1, safePage + 1),
                            }))
                          }
                          previousLabel={`Previous ${group.category}`}
                          nextLabel={`Next ${group.category}`}
                        />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
