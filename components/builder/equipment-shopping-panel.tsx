"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { Check, Coins, Info } from "lucide-react"
import { PickerGridPagination } from "@/components/builder/picker-grid-pagination"
import { filterEquipmentByMagicKind, filterEquipmentList } from "@/lib/compendium/equipment-display"
import { MagicEquipmentBadges } from "@/components/character-sheet/magic-equipment-badges"
import {
  EQUIPMENT_CATEGORY_ORDER,
  groupEquipmentByCategory,
} from "@/lib/compendium/equipment-categories"
import { getEquipmentCostGp, formatEquipmentCost } from "@/lib/builder/equipment-utils"
import { EquipmentQuantityStepper } from "@/components/character-sheet/equipment-quantity-stepper"
import { paginateList } from "@/lib/builder/picker-pagination"
import { usePickerPageSize } from "@/hooks/use-picker-page-size"
import type { Equipment } from "@/lib/types"
import { SearchBox } from "@/components/search/search-box"
import { rankSearchResults } from "@/lib/search/ranked-search"

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
  onAdjustQuantity: (itemId: string, delta: number) => void
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
  onAdjustQuantity,
  onShowDetails,
}: EquipmentShoppingPanelProps) {
  const pageSize = usePickerPageSize("dense")
  const [categoryPages, setCategoryPages] = useState<Record<string, number>>({})
  const [magicKindFilter, setMagicKindFilter] = useState<"all" | "magic" | "mundane">("mundane")
  const deferredEquipmentSearch = useDeferredValue(equipmentSearch)

  const categoryOptions = useMemo(() => {
    const seen = new Set<string>()
    for (const item of equipment) {
      if (item.category?.trim()) seen.add(item.category.trim())
    }
    return [
      ...EQUIPMENT_CATEGORY_ORDER.filter((cat) => seen.has(cat)),
      ...[...seen]
        .filter((cat) => !EQUIPMENT_CATEGORY_ORDER.includes(cat as (typeof EQUIPMENT_CATEGORY_ORDER)[number]))
        .sort(),
    ]
  }, [equipment])

  const equipmentGroups = useMemo(() => {
    const searched = filterEquipmentList(equipment, deferredEquipmentSearch)
    const byCategory =
      equipmentFilterCategory === "all"
        ? searched
        : searched.filter((item) => (item.category?.trim() || "Other") === equipmentFilterCategory)
    const filtered = filterEquipmentByMagicKind(byCategory, magicKindFilter)
    return groupEquipmentByCategory(filtered)
  }, [equipment, deferredEquipmentSearch, equipmentFilterCategory, magicKindFilter])

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

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchBox
          value={equipmentSearch}
          onChange={(value) => {
            onEquipmentSearchChange(value)
            setCategoryPages({})
          }}
          suggestions={rankSearchResults(equipment, deferredEquipmentSearch, {
            name: (item) => item.name,
            fields: [
              { name: "category", value: (item) => item.category, weight: 1.3 },
              { name: "subcategory", value: (item) => item.subcategory, weight: 1.2 },
              { name: "rarity", value: (item) => item.rarity, weight: 1.1 },
              { name: "description", value: (item) => item.description, weight: 0.35 },
            ],
            limit: 8,
          }).map((match) => ({
            id: match.item.id,
            label: match.item.name,
            detail: [match.item.category, match.item.rarity].filter(Boolean).join(" · "),
            item: match.item,
            matchKind: match.kind,
          }))}
          onSelect={(suggestion) => {
            onEquipmentSearchChange(suggestion.label)
            setCategoryPages({})
          }}
          scope="builder:equipment"
          placeholder="Search equipment to buy…"
          ariaLabel="Search equipment to buy"
          className="flex-1 sm:min-w-[12rem]"
          inputClassName="border"
        />
        {categoryOptions.length > 0 && (
          <>
            <select
              value={equipmentFilterCategory}
              onChange={(e) => {
                onEquipmentFilterCategoryChange(e.target.value)
                setCategoryPages({})
              }}
              aria-label="Equipment type"
              className="bg-card border-2 border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary sm:w-auto"
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
            <select
              value={magicKindFilter}
              onChange={(e) => {
                setMagicKindFilter(e.target.value as "all" | "magic" | "mundane")
                setCategoryPages({})
              }}
              aria-label="Magic or mundane"
              className="bg-card border-2 border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary sm:w-auto"
            >
              <option value="all">All items</option>
              <option value="magic">Magic only</option>
              <option value="mundane">Mundane only</option>
            </select>
          </>
        )}
      </div>

      <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-1">
        {equipmentGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No equipment matches your search.</p>
        ) : (
          equipmentGroups.map(({ category, items }) => {
            const page = categoryPages[category] ?? 0
            const { items: pageItems, pageCount, safePage } = paginateList(items, page, pageSize)
            return (
              <div key={category}>
                <p className="text-xs font-bold text-primary uppercase mb-2">
                  {category}
                  <span className="text-muted-foreground font-normal ml-1">({items.length})</span>
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {pageItems.map((item) => {
                    const purchasedQty = goldPurchasedEquipmentIds.filter((id) => id === item.id).length
                    const isPurchased = purchasedQty > 0
                    const cost = getEquipmentCostGp(item)
                    const cannotAffordAnother = goldSpent + cost > totalGoldBudget
                    const cannotAfford = !isPurchased && cannotAffordAnother
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                          cannotAfford
                            ? "border-border bg-card opacity-50"
                            : isPurchased
                              ? "border-primary bg-primary/10"
                              : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        <button
                          type="button"
                          disabled={cannotAfford}
                          onClick={() => onTogglePurchase(item.id, !isPurchased)}
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isPurchased ? "bg-primary border-primary" : "border-muted-foreground"
                          } disabled:cursor-not-allowed`}
                          aria-pressed={isPurchased}
                          aria-label={isPurchased ? `Remove ${item.name}` : `Buy ${item.name}`}
                        >
                          {isPurchased && <Check className="w-2.5 h-2.5 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1">
                            <p className="font-medium text-sm text-foreground truncate">{item.name}</p>
                            <MagicEquipmentBadges item={item} />
                          </div>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {formatEquipmentCost(item) ?? "—"}
                            {purchasedQty > 1 ? ` · ${purchasedQty}×` : ""}
                          </p>
                        </div>
                        {isPurchased ? (
                          <EquipmentQuantityStepper
                            value={purchasedQty}
                            onChange={(next) => onAdjustQuantity(item.id, next - purchasedQty)}
                            ariaLabel={`${item.name} quantity`}
                          />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onShowDetails(item)}
                          className="p-0.5 text-muted-foreground hover:text-primary shrink-0"
                        >
                          <Info className="w-3 h-3" />
                        </button>
                      </div>
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
