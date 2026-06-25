"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Coins, Plus, Search, X } from "lucide-react"
import { PickerGridPagination } from "@/components/builder/picker-grid-pagination"
import { MagicEquipmentBadges } from "@/components/character-sheet/magic-equipment-badges"
import {
  filterEquipmentByMagicCategory,
  filterEquipmentByMagicKind,
  filterEquipmentList,
} from "@/lib/compendium/equipment-display"
import {
  getBaseSelectionOptions,
  magicItemSummaryLine,
  needsBaseSelection,
} from "@/lib/compendium/equipment-base-selection"
import {
  EQUIPMENT_CATEGORY_ORDER,
  groupEquipmentByCategory,
} from "@/lib/compendium/equipment-categories"
import { formatEquipmentCost, getEquipmentCostGp } from "@/lib/builder/equipment-utils"
import { paginateList } from "@/lib/builder/picker-pagination"
import { usePickerPageSize } from "@/hooks/use-picker-page-size"
import type { Equipment } from "@/lib/types"

export type AddEquipmentOptions = {
  deductCost: boolean
  selectedBaseId?: string
}

type SheetAddEquipmentOverlayProps = {
  open: boolean
  onClose: () => void
  catalog: Equipment[]
  ownedIds: string[]
  currentGold: number
  onAddItem: (item: Equipment, options: AddEquipmentOptions) => void
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
  const [magicKindFilter, setMagicKindFilter] = useState<"all" | "magic" | "mundane">("all")
  const [magicCategoryFilter, setMagicCategoryFilter] = useState("all")
  const [categoryPages, setCategoryPages] = useState<Record<string, number>>({})
  const [pendingItem, setPendingItem] = useState<Equipment | null>(null)
  const [pendingBaseId, setPendingBaseId] = useState<string>("")
  const [pendingDeductCost, setPendingDeductCost] = useState(false)

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

  const magicCategoryOptions = useMemo(() => {
    const values = new Set<string>()
    for (const item of catalog) {
      if (item.magic_item_category) values.add(item.magic_item_category)
    }
    return [...values].sort((a, b) => a.localeCompare(b))
  }, [catalog])

  const equipmentGroups = useMemo(() => {
    const available = catalog.filter((item) => !ownedSet.has(item.id))
    const searched = filterEquipmentList(available, search)
    const byCategory =
      categoryFilter === "all"
        ? searched
        : searched.filter((item) => (item.category?.trim() || "Other") === categoryFilter)
    const byMagic = filterEquipmentByMagicKind(byCategory, magicKindFilter)
    const filtered = filterEquipmentByMagicCategory(byMagic, magicCategoryFilter)
    return groupEquipmentByCategory(filtered)
  }, [catalog, ownedSet, search, categoryFilter, magicKindFilter, magicCategoryFilter])

  const pendingBaseOptions = useMemo(() => {
    if (!pendingItem) return []
    return getBaseSelectionOptions(pendingItem, catalog)
  }, [pendingItem, catalog])

  const resetPending = () => {
    setPendingItem(null)
    setPendingBaseId("")
    setPendingDeductCost(false)
  }

  const tryAddItem = (item: Equipment, deductCost: boolean) => {
    const baseOptions = getBaseSelectionOptions(item, catalog)
    const mustPick =
      needsBaseSelection(item, catalog) &&
      (baseOptions.length > 1 || Boolean(item.base_equipment_filter))

    if (mustPick) {
      setPendingItem(item)
      setPendingDeductCost(deductCost)
      setPendingBaseId(baseOptions.length === 1 ? baseOptions[0]!.id : "")
      return
    }

    onAddItem(item, {
      deductCost,
      selectedBaseId: baseOptions.length === 1 ? baseOptions[0]?.id : undefined,
    })
  }

  const confirmPendingAdd = () => {
    if (!pendingItem || !pendingBaseId) return
    onAddItem(pendingItem, { deductCost: pendingDeductCost, selectedBaseId: pendingBaseId })
    resetPending()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
          onClick={() => {
            resetPending()
            onClose()
          }}
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
                onClick={() => {
                  resetPending()
                  onClose()
                }}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pendingItem ? (
              <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Choose base item</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pendingItem.name} needs a mundane base before it is added to your inventory.
                  </p>
                </div>
                <select
                  value={pendingBaseId}
                  onChange={(e) => setPendingBaseId(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Select base…</option>
                  {pendingBaseOptions.map((base) => (
                    <option key={base.id} value={base.id}>
                      {base.name}
                      {base.subcategory ? ` (${base.subcategory})` : ""}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetPending}
                    className="px-3 py-2 text-xs font-bold rounded-lg border border-border hover:bg-muted"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!pendingBaseId}
                    onClick={confirmPendingAdd}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                  >
                    {pendingDeductCost ? "Buy with base" : "Add with base"}
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="flex-1 min-w-[140px] text-sm px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="all">All categories</option>
                      {categoryOptions.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <select
                      value={magicKindFilter}
                      onChange={(e) => {
                        const next = e.target.value as "all" | "magic" | "mundane"
                        setMagicKindFilter(next)
                        if (next !== "magic") setMagicCategoryFilter("all")
                      }}
                      className="flex-1 min-w-[120px] text-sm px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="all">All items</option>
                      <option value="magic">Magic items</option>
                      <option value="mundane">Mundane items</option>
                    </select>
                    {magicKindFilter === "magic" && magicCategoryOptions.length > 0 && (
                      <select
                        value={magicCategoryFilter}
                        onChange={(e) => setMagicCategoryFilter(e.target.value)}
                        className="flex-1 min-w-[120px] text-sm px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <option value="all">All magic types</option>
                        {magicCategoryOptions.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
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
                              const summary = magicItemSummaryLine(item)
                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
                                >
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold text-foreground truncate">
                                        {item.name}
                                      </p>
                                      <MagicEquipmentBadges item={item} />
                                    </div>
                                    {summary && (
                                      <p className="text-[10px] text-muted-foreground mt-0.5">{summary}</p>
                                    )}
                                    {costGp > 0 && (
                                      <p className="text-[10px] text-muted-foreground">
                                        {formatEquipmentCost(item)}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => tryAddItem(item, false)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-border bg-card hover:border-primary/50 transition-colors"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      Add
                                    </button>
                                    {costGp > 0 && (
                                      <button
                                        type="button"
                                        disabled={!canBuy}
                                        onClick={() => tryAddItem(item, true)}
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
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
