"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { Coins, Info, PackageOpen, Pin, Plus } from "lucide-react"
import {
  DEFAULT_ATTUNEMENT_SLOTS,
  isAttunableItem,
  mustAttuneBeforeEquip,
} from "@/lib/compendium/equipment-attunement"
import {
  getBaseSelectionOptions,
  needsBaseSelection,
  resolveCharacterEquipment,
} from "@/lib/compendium/equipment-base-selection"
import {
  filterEquipmentList,
  matchesEquipmentSheetFilter,
  orderEquipmentWithPins,
  type EquipmentSheetFilter,
} from "@/lib/compendium/equipment-display"
import { isArmorItem, isShieldItem } from "@/lib/compendium/combat-stats"
import {
  canDualWieldSameWeapon,
  ownedEquipmentQuantity,
  type EquipmentQuantities,
} from "@/lib/character/equipment-quantities"
import {
  exclusiveTwoHandedEquipWarning,
  occupiedHandsBlockReason,
} from "@/lib/character/wield-constraints"
import { isWieldableWeaponItem } from "@/lib/compendium/magic-item-weapon-base"
import { isLightWeapon } from "@/lib/compendium/two-weapon-fighting"
import { EquipmentQuantityStepper } from "@/components/character-sheet/equipment-quantity-stepper"
import { MagicEquipmentBadges } from "@/components/character-sheet/magic-equipment-badges"
import type { Equipment } from "@/lib/types"
import { cn } from "@/lib/utils"
import { SearchBox } from "@/components/search/search-box"
import { rankSearchResults } from "@/lib/search/ranked-search"

const EQUIPMENT_FILTER_OPTIONS: { value: EquipmentSheetFilter; label: string }[] = [
  { value: "all", label: "All items" },
  { value: "armor", label: "Armor" },
  { value: "weapons", label: "Weapons" },
  { value: "adventuring_gear", label: "Adventuring gear" },
  { value: "magic", label: "Magic items" },
  { value: "pinned", label: "Pinned" },
]

type SheetEquipmentPanelProps = {
  equipment: Equipment[]
  catalog: Equipment[]
  equipmentBaseSelections: Record<string, string>
  onBaseSelectionChange: (magicItemId: string, baseEquipmentId: string) => void
  gold: number
  onGoldChange: (gold: number) => void
  onAddEquipment: () => void
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  equippedArmorId: string | null
  equippedShieldId: string | null
  equippedWeaponId: string | null
  equippedOffHandWeaponId: string | null
  attunedItemIds: string[]
  maxAttunementSlots: number
  pinnedEquipmentIds: string[]
  onTogglePinnedEquipment: (id: string) => void
  onEquipArmor: (id: string | null) => void
  onEquipShield: (id: string | null) => void
  onEquipWeapon: (id: string | null) => void
  onEquipOffHandWeapon: (id: string | null) => void
  onToggleAttune: (id: string) => void
  onShowDetails: (item: Equipment) => void
  /** Equipment ids that open a nested / extradimensional container. */
  containerEquipmentIds?: Set<string> | string[]
  onOpenContainer?: (item: Equipment) => void
  ownedIds: string[]
  equipmentQuantities?: EquipmentQuantities
  onQuantityChange: (id: string, quantity: number) => void
  extraWieldSlots?: number
}

function EquipRow({
  checked,
  onChange,
  label,
  disabled,
  title,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex min-h-8 items-center justify-center rounded-md border-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors",
        checked
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-background/80 text-muted-foreground hover:border-primary/40 hover:text-foreground",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {label}
    </button>
  )
}

export function SheetEquipmentPanel({
  equipment,
  catalog,
  equipmentBaseSelections,
  onBaseSelectionChange,
  gold,
  onGoldChange,
  onAddEquipment,
  searchQuery,
  onSearchQueryChange,
  equippedArmorId,
  equippedShieldId,
  equippedWeaponId,
  equippedOffHandWeaponId,
  attunedItemIds,
  maxAttunementSlots,
  pinnedEquipmentIds,
  onTogglePinnedEquipment,
  onEquipArmor,
  onEquipShield,
  onEquipWeapon,
  onEquipOffHandWeapon,
  onToggleAttune,
  onShowDetails,
  containerEquipmentIds,
  onOpenContainer,
  ownedIds,
  equipmentQuantities,
  onQuantityChange,
  extraWieldSlots = 0,
}: SheetEquipmentPanelProps) {
  const [categoryFilter, setCategoryFilter] = useState<EquipmentSheetFilter>("all")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const containerIdSet = useMemo(() => {
    if (!containerEquipmentIds) return new Set<string>()
    return containerEquipmentIds instanceof Set
      ? containerEquipmentIds
      : new Set(containerEquipmentIds)
  }, [containerEquipmentIds])
  const mainWeapon = useMemo(() => {
    if (!equippedWeaponId) return null
    const raw = equipment.find((item) => item.id === equippedWeaponId)
    return raw ? resolveCharacterEquipment(raw, catalog, equipmentBaseSelections) : null
  }, [catalog, equippedWeaponId, equipment, equipmentBaseSelections])
  const twoHandedBlocksOthers = occupiedHandsBlockReason(extraWieldSlots, mainWeapon)
  const filtered = useMemo(() => {
    const bySearch = filterEquipmentList(equipment, deferredSearchQuery)
    const byCategory = bySearch.filter((item) =>
      matchesEquipmentSheetFilter(item, categoryFilter, pinnedEquipmentIds),
    )
    return orderEquipmentWithPins(byCategory, pinnedEquipmentIds)
  }, [equipment, deferredSearchQuery, categoryFilter, pinnedEquipmentIds])
  const attunedCount = attunedItemIds.length
  const slotCap = maxAttunementSlots || DEFAULT_ATTUNEMENT_SLOTS

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border">
        <div className="flex items-center gap-2 shrink-0">
          <Coins className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs font-semibold text-foreground">Gold</span>
          <input
            type="number"
            min={0}
            value={gold}
            onChange={(e) => {
              const next = parseInt(e.target.value, 10)
              onGoldChange(Number.isFinite(next) ? Math.max(0, next) : 0)
            }}
            className="w-16 h-7 px-1 text-center text-xs font-bold tabular-nums bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <span className="text-[10px] text-muted-foreground">GP</span>
        </div>
        {equipment.length > 0 ? (
          <>
            <SearchBox
              value={searchQuery}
              onChange={onSearchQueryChange}
              suggestions={rankSearchResults(equipment, deferredSearchQuery, {
                name: (item) => item.name,
                fields: [
                  { name: "category", value: (item) => item.category, weight: 1.3 },
                  { name: "rarity", value: (item) => item.rarity, weight: 1.1 },
                ],
                limit: 8,
              }).map((match) => ({
                id: match.item.id,
                label: match.item.name,
                detail: [match.item.category, match.item.rarity].filter(Boolean).join(" · "),
                item: match.item,
                matchKind: match.kind,
              }))}
              onSelect={(suggestion) => onSearchQueryChange(suggestion.label)}
              scope="sheet:equipment"
              placeholder="Search equipment…"
              ariaLabel="Search owned equipment"
              className="min-w-[8rem] flex-1"
              inputClassName="border bg-muted py-1.5 text-xs"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as EquipmentSheetFilter)}
              aria-label="Filter equipment"
              className="h-[30px] shrink-0 rounded-lg border border-border bg-muted px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {EQUIPMENT_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Attuned
              </span>
              {Array.from({ length: slotCap }, (_, index) => {
                const attunedId = attunedItemIds[index]
                const attunedItem = attunedId
                  ? equipment.find((entry) => entry.id === attunedId)
                  : undefined
                const filled = Boolean(attunedId)
                return (
                  <input
                    key={`attune-slot-${index}`}
                    type="checkbox"
                    checked={filled}
                    disabled={!filled}
                    title={
                      attunedItem
                        ? `Unattune ${attunedItem.name}`
                        : `Attunement slot ${index + 1} of ${slotCap}`
                    }
                    aria-label={
                      attunedItem
                        ? `Unattune ${attunedItem.name}`
                        : `Empty attunement slot ${index + 1} of ${slotCap}`
                    }
                    onChange={() => {
                      if (attunedId) onToggleAttune(attunedId)
                    }}
                    className="h-4 w-4 rounded accent-primary disabled:opacity-40"
                  />
                )
              })}
            </div>
          </>
        ) : null}
        <button
          type="button"
          onClick={onAddEquipment}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0 ml-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Add equipment
        </button>
      </div>

      {equipment.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No equipment owned</p>
      ) : (
        <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5 max-h-[420px] overflow-y-auto pr-1">
        {filtered.length ? (
          filtered.map((item) => {
            const resolved = resolveCharacterEquipment(item, catalog, equipmentBaseSelections)
            const isArmor = isArmorItem(resolved)
            const isShield = isShieldItem(resolved)
            const isWeapon = isWieldableWeaponItem(item) || isWieldableWeaponItem(resolved)
            const attunable = isAttunableItem(item)
            const isAttuned = attunedItemIds.includes(item.id)
            const attunementSlot = isAttuned ? attunedItemIds.indexOf(item.id) + 1 : null
            const attuneDisabled = attunable && !isAttuned && attunedCount >= slotCap
            const attuneDisabledTitle =
              attuneDisabled
                ? `Attunement limit reached (${attunedCount}/${slotCap})`
                : undefined
            const equipBlocked = mustAttuneBeforeEquip(item) && !isAttuned
            const equipBlockedTitle = "Attune this magic item before equipping it"
            const baseOptions = getBaseSelectionOptions(item, catalog)
            const showBasePicker =
              needsBaseSelection(item, catalog, equipmentBaseSelections) && baseOptions.length > 0
            const selectedBaseId =
              equipmentBaseSelections[item.id] ?? item.selected_base_equipment_id ?? ""
            const pinned = pinnedEquipmentIds.includes(item.id)
            const inInventory = ownedIds.includes(item.id)
            const quantity = inInventory
              ? ownedEquipmentQuantity(ownedIds, equipmentQuantities, item.id)
              : 1
            const dualWieldSame = canDualWieldSameWeapon(quantity)

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-lg border px-2 py-1.5 bg-muted/40 min-w-0",
                  (equippedArmorId === item.id ||
                    equippedShieldId === item.id ||
                    equippedWeaponId === item.id ||
                    equippedOffHandWeaponId === item.id) &&
                    "border-primary/50 bg-primary/5",
                  pinned && "border-primary/35",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onTogglePinnedEquipment(item.id)}
                      title={pinned ? "Unpin item" : "Pin item to top"}
                      aria-label={pinned ? `Unpin ${item.name}` : `Pin ${item.name}`}
                      aria-pressed={pinned}
                      className={cn(
                        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
                        pinned
                          ? "text-primary bg-primary/10 hover:bg-primary/15"
                          : "text-muted-foreground/70 hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {pinned ? (
                        <Pin className="h-4 w-4 fill-current" aria-hidden />
                      ) : (
                        <Pin className="h-4 w-4" aria-hidden />
                      )}
                    </button>
                    <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                    <MagicEquipmentBadges item={item} />
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {containerIdSet.has(item.id) && onOpenContainer ? (
                      <button
                        type="button"
                        onClick={() => onOpenContainer(item)}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 text-[10px] font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary/15"
                        aria-label={`Open contents of ${item.name}`}
                      >
                        <PackageOpen className="w-3.5 h-3.5" />
                        Contents
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onShowDetails(item)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background/80 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      aria-label={`Details for ${item.name}`}
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {inInventory || isArmor || isShield || isWeapon || attunable ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {inInventory ? (
                      <EquipmentQuantityStepper
                        value={quantity}
                        onChange={(next) => onQuantityChange(item.id, next)}
                        ariaLabel={`${item.name} quantity`}
                      />
                    ) : null}
                    {isArmor && (
                      <EquipRow
                        label="Wear"
                        checked={equippedArmorId === item.id}
                        disabled={equipBlocked && equippedArmorId !== item.id}
                        title={equipBlocked && equippedArmorId !== item.id ? equipBlockedTitle : undefined}
                        onChange={(checked) => onEquipArmor(checked ? item.id : null)}
                      />
                    )}
                    {isShield && (
                      <EquipRow
                        label="Wield"
                        checked={equippedShieldId === item.id}
                        disabled={
                          (equipBlocked && equippedShieldId !== item.id) ||
                          Boolean(twoHandedBlocksOthers && equippedShieldId !== item.id)
                        }
                        title={
                          equipBlocked && equippedShieldId !== item.id
                            ? equipBlockedTitle
                            : twoHandedBlocksOthers && equippedShieldId !== item.id
                              ? twoHandedBlocksOthers
                              : undefined
                        }
                        onChange={(checked) => onEquipShield(checked ? item.id : null)}
                      />
                    )}
                    {isWeapon && isLightWeapon(resolved) ? (
                      <>
                        <EquipRow
                          label="Main"
                          checked={equippedWeaponId === item.id}
                          disabled={equipBlocked && equippedWeaponId !== item.id}
                          title={equipBlocked && equippedWeaponId !== item.id ? equipBlockedTitle : undefined}
                          onChange={(checked) => {
                            if (checked) {
                              if (equippedOffHandWeaponId === item.id && !dualWieldSame) {
                                onEquipOffHandWeapon(null)
                              }
                              onEquipWeapon(item.id)
                              return
                            }
                            if (equippedWeaponId === item.id) onEquipWeapon(null)
                          }}
                        />
                        <EquipRow
                          label="Off-hand"
                          checked={equippedOffHandWeaponId === item.id}
                          disabled={
                            (equipBlocked && equippedOffHandWeaponId !== item.id) ||
                            Boolean(twoHandedBlocksOthers && equippedOffHandWeaponId !== item.id)
                          }
                          title={
                            equipBlocked && equippedOffHandWeaponId !== item.id
                              ? equipBlockedTitle
                              : twoHandedBlocksOthers && equippedOffHandWeaponId !== item.id
                                ? twoHandedBlocksOthers
                              : !dualWieldSame && equippedWeaponId === item.id
                                ? "Carry at least two to wield one in each hand"
                                : undefined
                          }
                          onChange={(checked) => {
                            if (checked) {
                              if (equippedWeaponId === item.id && !dualWieldSame) {
                                onEquipWeapon(null)
                              }
                              onEquipOffHandWeapon(item.id)
                              return
                            }
                            if (equippedOffHandWeaponId === item.id) onEquipOffHandWeapon(null)
                          }}
                        />
                      </>
                    ) : isWeapon ? (
                      <EquipRow
                        label="Wield"
                        checked={equippedWeaponId === item.id}
                        disabled={equipBlocked && equippedWeaponId !== item.id}
                        title={
                          equipBlocked && equippedWeaponId !== item.id
                            ? equipBlockedTitle
                            : exclusiveTwoHandedEquipWarning(
                                extraWieldSlots,
                                resolved,
                                Boolean(equippedShieldId || equippedOffHandWeaponId),
                              ) ?? undefined
                        }
                        onChange={(checked) => onEquipWeapon(checked ? item.id : null)}
                      />
                    ) : null}
                    {attunable && (
                      <EquipRow
                        label={attunementSlot != null ? `Attune ${attunementSlot}` : "Attune"}
                        checked={isAttuned}
                        disabled={attuneDisabled}
                        title={attuneDisabledTitle}
                        onChange={() => onToggleAttune(item.id)}
                      />
                    )}
                </div>
                ) : null}
                {showBasePicker ? (
                  <select
                    value={selectedBaseId}
                    onChange={(e) => onBaseSelectionChange(item.id, e.target.value)}
                    className="mt-1.5 w-full text-xs px-2 py-1 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Choose base item…</option>
                    {baseOptions.map((base) => (
                      <option key={base.id} value={base.id}>
                        {base.name}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            )
          })
        ) : (
          <p className="text-xs text-muted-foreground md:col-span-2 lg:col-span-3">
            No equipment matches your search
          </p>
        )}
      </div>
        </>
      )}
    </div>
  )
}
