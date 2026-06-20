"use client"

import { useMemo, useState } from "react"
import { Check, Coins, Info, Search } from "lucide-react"
import { PickerGridPagination } from "@/components/builder/picker-grid-pagination"
import { filterEquipmentList } from "@/lib/compendium/equipment-display"
import {
  EQUIPMENT_CATEGORY_ORDER,
  groupEquipmentByCategory,
} from "@/lib/compendium/equipment-categories"
import { getEquipmentCostGp, formatEquipmentCost } from "@/lib/builder/equipment-utils"
import { paginateList } from "@/lib/builder/picker-pagination"
import { usePickerPageSize } from "@/hooks/use-picker-page-size"
import type { Equipment } from "@/lib/types"

type EquipmentShoppingPanelProps = {
  equipment: Equipment[]
  equipmentSearch: string
  onEquipmentSearchChange: (value: string) => void
  equipmentFilterCategory: string
  onEquipmentFilterCategoryChange: (value: string) => void
  goldPurchasedEquipmentIds: string[]
  goldSpent: number
  totalGoldBudget: number
  onTogglePurchase: (itemId: string, checked: boolean) => void
  onShowDetails: (item: Equipment) => void
}

export function EquipmentShoppingPanel({
  equipment,
  equipmentSearch,
  onEquipmentSearchChange,
  equipmentFilterCategory,
  onEquipmentFilterCategoryChange,
  goldPurchasedEquipmentIds,
  goldSpent,
  totalGoldBudget,
  onTogglePurchase,
  onShowDetails,
}: EquipmentShoppingPanelProps) {
  const pageSize = usePickerPageSize()
  const [categoryPages, setCategoryPages] = useState<Record<string, number>>({})

  const categoryOptions = useMemo(() => {
    const seen = new Set<string>()
    for (const item of equipment) {
      if (item.category?.trim()) seen.add(item.category.trim())
    }
    return EQUIPMENT_CATEGORY_ORDER.filter((cat) => seen.has(cat)).concat(
      [...seen]
        .filter((cat) => !EQUIPMENT_CATEGORY_ORDER.includes(cat as (typeof EQUIPMENT_CATEGORY_ORDER)[number]))
        .sort(),
    )
  }, [equipment])

  const equipmentGroups = useMemo(() => {
    const searched = filterEquipmentList(equipment, equipmentSearch)
    const filtered =
      equipmentFilterCategory === "all"
        ? searched
        : searched.filter((item) => (item.category?.trim() || "Other") === equipmentFilterCategory)
    return groupEquipmentByCategory(filtered)
  }, [equipment, equipmentSearch, equipmentFilterCategory])

  const goldRemaining = totalGoldBudget - goldSpent

  const setCategoryPage = (category: string, page: number) => {
    setCategoryPages((prev) => ({ ...prev, [category]: page }))
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">Starting gold</span>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-foreground tabular-nums">{goldRemaining} GP</p>
          <p className="text-[10px] text-muted-foreground">
            {goldSpent} spent of {totalGoldBudget} GP
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search equipment to buy..."
          value={equipmentSearch}
          onChange={(e) => {
            onEquipmentSearchChange(e.target.value)
            setCategoryPages({})
          }}
          className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
      </div>

      {categoryOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Type
          </label>
          <select
            value={equipmentFilterCategory}
            onChange={(e) => {
              onEquipmentFilterCategoryChange(e.target.value)
              setCategoryPages({})
            }}
            className="bg-card border-2 border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            <option value="all">All types</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {equipmentFilterCategory !== "all" && (
            <button
              type="button"
              onClick={() => {
                onEquipmentFilterCategoryChange("all")
                setCategoryPages({})
              }}
              className="px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Clear type filter
            </button>
          )}
        </div>
      )}

      <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-1">
        {equipmentGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No equipment matches your search.</p>
        ) : (
          equipmentGroups.map(({ category, items }) => {
            const page = categoryPages[category] ?? 0
            const { pageItems, pageCount, safePage } = paginateList(items, page, pageSize)
            return (
              <div key={category}>
                <p className="text-xs font-bold text-primary uppercase mb-2">
                  {category}
                  <span className="text-muted-foreground font-normal ml-1">({items.length})</span>
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {pageItems.map((item) => {
                    const isPurchased = goldPurchasedEquipmentIds.includes(item.id)
                    const cost = getEquipmentCostGp(item)
                    const cannotAfford = !isPurchased && goldSpent + cost > totalGoldBudget
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                          cannotAfford
                            ? "border-border bg-card opacity-50 cursor-not-allowed"
                            : isPurchased
                              ? "border-primary bg-primary/10 cursor-pointer"
                              : "border-border bg-card hover:border-primary/50 cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isPurchased}
                          disabled={cannotAfford}
                          onChange={(e) => onTogglePurchase(item.id, e.target.checked)}
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isPurchased ? "bg-primary border-primary" : "border-muted-foreground"
                          }`}
                        >
                          {isPurchased && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {formatEquipmentCost(item) ?? "—"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onShowDetails(item)
                          }}
                          className="p-0.5 text-muted-foreground hover:text-primary shrink-0"
                        >
                          <Info className="w-3 h-3" />
                        </button>
                      </label>
                    )
                  })}
                </div>
                {pageCount > 1 && (
                  <PickerGridPagination
                    page={safePage}
                    pageCount={pageCount}
                    onPrevious={() => setCategoryPage(category, Math.max(0, safePage - 1))}
                    onNext={() => setCategoryPage(category, Math.min(pageCount - 1, safePage + 1))}
                    previousLabel={`Previous ${category}`}
                    nextLabel={`Next ${category}`}
                  />
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
