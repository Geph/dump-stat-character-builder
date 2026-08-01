"use client"

import { useMemo } from "react"
import { Coins } from "lucide-react"
import type { Equipment, StartingEquipmentOption } from "@/lib/types"
import {
  collapseWeaponCategoryPackageOptions,
  equipmentCategoryKind,
  equipmentForCategory,
  filterStartingEquipmentOptionsByWeaponProficiency,
  formatPackageOptionTitle,
  isGoldOnlyOption,
} from "@/lib/builder/equipment-utils"
import { getCinematicPickerContainerClass } from "@/lib/builder/picker-pagination"
import { SwipeVisualPicker } from "@/components/builder/swipe-visual-picker"
import { STARTING_EQUIPMENT_CARD_IMAGES } from "@/lib/site-images"
import { cn } from "@/lib/utils"

/** Show this many plain item lines before collapsing the rest behind “…”. */
const VISIBLE_ITEM_LINES = 4

type StartingEquipmentPackagePickerProps = {
  title: string
  description: string
  options: StartingEquipmentOption[]
  selectedIndex: number | null
  startingGold: number
  onSelect: (index: number) => void
  equipment?: Equipment[]
  categoryPicks?: Record<string, string>
  onCategoryPick?: (optionIndex: number, itemIndex: number, equipmentId: string) => void
  /** Weapon proficiencies — hides martial-only options when martial weapons are not granted. */
  weaponProficiencies?: string[]
  /** Alternate image side per row for visual variety */
  imageSide?: "left" | "right" | "alternate"
  /** Phone swipe carousel (cinematic builder on narrow screens). */
  swipeLayout?: boolean
}

export function StartingEquipmentPackagePicker({
  title,
  description,
  options = [],
  selectedIndex,
  startingGold,
  onSelect,
  equipment = [],
  categoryPicks = {},
  onCategoryPick,
  weaponProficiencies = [],
  imageSide = "alternate",
  swipeLayout = false,
}: StartingEquipmentPackagePickerProps) {
  const displayOptions = useMemo(() => {
    const collapsed = collapseWeaponCategoryPackageOptions(options, equipment)
    return filterStartingEquipmentOptionsByWeaponProficiency(collapsed, weaponProficiencies)
  }, [options, equipment, weaponProficiencies])

  const originalIndexByDisplay = useMemo(() => {
    const collapsed = collapseWeaponCategoryPackageOptions(options, equipment)
    return displayOptions.map((option) => collapsed.indexOf(option))
  }, [options, equipment, displayOptions])

  if (!displayOptions.length) return null

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{title}</p>
        <h3 className="mt-1 font-serif text-xl font-black text-foreground">{description}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose <span className="font-semibold text-foreground">one</span> package:
        </p>
      </div>

      <SwipeVisualPicker
        enabled={swipeLayout}
        className={cn(
          swipeLayout
            ? getCinematicPickerContainerClass()
            : "grid grid-cols-1 lg:grid-cols-2 gap-4",
        )}
      >
        {displayOptions.map((option, displayIndex) => {
          const index = originalIndexByDisplay[displayIndex] ?? displayIndex
          const selected = selectedIndex === index
          const goldOnly = isGoldOnlyOption(option, startingGold)
          const side =
            imageSide === "alternate" ? (displayIndex % 2 === 0 ? "left" : "right") : imageSide
          const optionItems = option.items ?? []
          const edgeImage = goldOnly
            ? STARTING_EQUIPMENT_CARD_IMAGES.gold
            : STARTING_EQUIPMENT_CARD_IMAGES.gear
          // Truncate collapsed cards; selecting expands the full item list.
          const expandList = selected
          const visibleItems = expandList
            ? optionItems
            : optionItems.slice(0, VISIBLE_ITEM_LINES)
          const hiddenCount = expandList
            ? 0
            : Math.max(0, optionItems.length - VISIBLE_ITEM_LINES)

          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelect(index)}
              aria-expanded={expandList}
              className={cn(
                "group relative flex min-h-[148px] w-full rounded-xl border-2 text-left transition-all",
                selected
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : "overflow-hidden border-border bg-card hover:border-primary/40",
              )}
            >
              <div
                className={cn(
                  // Phone swipe: half; medium single-col: one-third; lg 2-col cards: half again.
                  "relative w-1/2 shrink-0 self-stretch overflow-hidden bg-muted/20 sm:w-1/3 lg:w-1/2",
                  side === "right" ? "order-2" : "order-1",
                )}
                aria-hidden
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={edgeImage}
                  alt=""
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover",
                    side === "right" ? "object-right" : "object-left",
                  )}
                />
              </div>

              <div
                className={cn(
                  "flex min-w-0 w-1/2 flex-col justify-center gap-2 p-4 sm:w-2/3 lg:w-1/2",
                  side === "right" ? "order-1" : "order-2",
                )}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-primary">
                  {formatPackageOptionTitle(option.label, index)}
                </p>
                {goldOnly ? (
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-primary" />
                    <span className="font-serif text-2xl font-black text-foreground">
                      {startingGold} GP
                    </span>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {visibleItems.map((item, ii) => {
                      const isGp = item.name.toLowerCase() === "gold pieces"
                      const category = equipmentCategoryKind(item.name)
                      if (category) {
                        const choices = equipmentForCategory(category, equipment)
                        const pickKey = `${index}:${ii}`
                        const selectedId = categoryPicks[pickKey] ?? ""
                        return (
                          <li key={ii} onClick={(event) => event.stopPropagation()}>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                              {item.quantity > 1 ? `${item.quantity}× ` : ""}
                              {item.name}
                            </label>
                            <select
                              value={selectedId}
                              onChange={(event) => {
                                onSelect(index)
                                onCategoryPick?.(index, ii, event.target.value)
                              }}
                              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-semibold text-foreground"
                            >
                              <option value="">Choose weapon…</option>
                              {choices.map((row) => (
                                <option key={row.id} value={row.id}>
                                  {row.name}
                                </option>
                              ))}
                            </select>
                          </li>
                        )
                      }
                      return (
                        <li
                          key={ii}
                          className="text-[11px] font-bold uppercase tracking-wide text-foreground/90"
                        >
                          {isGp ? (
                            <span className="inline-flex items-center gap-1">
                              <Coins className="h-3 w-3 text-primary" />
                              {item.quantity} GP
                            </span>
                          ) : (
                            <>
                              {item.quantity > 1 ? `${item.quantity}× ` : ""}
                              {item.name}
                            </>
                          )}
                        </li>
                      )
                    })}
                    {hiddenCount > 0 ? (
                      <li className="text-[11px] font-bold uppercase tracking-wide text-primary/80">
                        +{hiddenCount} more
                      </li>
                    ) : null}
                  </ul>
                )}
                {goldOnly && (
                  <p className="text-[10px] text-muted-foreground">
                    Buy equipment from the list below with your starting gold.
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </SwipeVisualPicker>
    </div>
  )
}
