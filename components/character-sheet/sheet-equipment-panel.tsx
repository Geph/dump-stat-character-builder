"use client"

import { Coins, Info, Plus, Search } from "lucide-react"
import {
  DEFAULT_ATTUNEMENT_SLOTS,
  isAttunableItem,
  mustAttuneBeforeEquip,
} from "@/lib/compendium/equipment-attunement"
import {
  getBaseSelectionOptions,
  magicItemSummaryLine,
  needsBaseSelection,
  resolveCharacterEquipment,
} from "@/lib/compendium/equipment-base-selection"
import { filterEquipmentList } from "@/lib/compendium/equipment-display"
import { isArmorItem, isShieldItem, isWeaponItem } from "@/lib/compendium/combat-stats"
import { MagicEquipmentBadges } from "@/components/character-sheet/magic-equipment-badges"
import type { Equipment } from "@/lib/types"
import { cn } from "@/lib/utils"

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
  attunedItemIds: string[]
  maxAttunementSlots: number
  onEquipArmor: (id: string | null) => void
  onEquipShield: (id: string | null) => void
  onEquipWeapon: (id: string | null) => void
  onToggleAttune: (id: string) => void
  onShowDetails: (item: Equipment) => void
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
    <label
      className={cn(
        "inline-flex items-center gap-1.5 shrink-0 cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed",
      )}
      title={title}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        title={title}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
      />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </label>
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
  attunedItemIds,
  maxAttunementSlots,
  onEquipArmor,
  onEquipShield,
  onEquipWeapon,
  onToggleAttune,
  onShowDetails,
}: SheetEquipmentPanelProps) {
  const filtered = filterEquipmentList(equipment, searchQuery)
  const attunedCount = attunedItemIds.length
  const slotCap = maxAttunementSlots || DEFAULT_ATTUNEMENT_SLOTS

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
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
        <button
          type="button"
          onClick={onAddEquipment}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add equipment
        </button>
      </div>

      {equipment.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No equipment owned</p>
      ) : (
        <>
      <span className="text-[10px] text-muted-foreground">
        Attuned {attunedCount}/{slotCap}
      </span>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search equipment..."
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-[420px] overflow-y-auto pr-1">
        {filtered.length ? (
          filtered.map((item) => {
            const resolved = resolveCharacterEquipment(item, catalog, equipmentBaseSelections)
            const isArmor = isArmorItem(resolved)
            const isShield = isShieldItem(resolved)
            const isWeapon = isWeaponItem(resolved)
            const attunable = isAttunableItem(item)
            const isAttuned = attunedItemIds.includes(item.id)
            const attuneDisabled = attunable && !isAttuned && attunedCount >= slotCap
            const equipBlocked = mustAttuneBeforeEquip(item) && !isAttuned
            const equipBlockedTitle = "Attune this magic item before equipping it"
            const baseOptions = getBaseSelectionOptions(item, catalog)
            const showBasePicker =
              needsBaseSelection(item, catalog, equipmentBaseSelections) && baseOptions.length > 0
            const selectedBaseId =
              equipmentBaseSelections[item.id] ?? item.selected_base_equipment_id ?? ""
            const summary = magicItemSummaryLine(item, resolved)

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-lg border px-2.5 py-2 bg-muted/40 min-w-0",
                  (equippedArmorId === item.id ||
                    equippedShieldId === item.id ||
                    equippedWeaponId === item.id) &&
                    "border-primary/50 bg-primary/5",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                      <MagicEquipmentBadges item={item} />
                      <span className="text-[10px] text-muted-foreground shrink-0">{item.category}</span>
                    </div>
                    {summary && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{summary}</p>
                    )}
                    {showBasePicker && (
                      <select
                        value={selectedBaseId}
                        onChange={(e) => onBaseSelectionChange(item.id, e.target.value)}
                        className="mt-1.5 w-full text-[10px] px-2 py-1 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <option value="">Choose base item…</option>
                        {baseOptions.map((base) => (
                          <option key={base.id} value={base.id}>
                            {base.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
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
                          disabled={equipBlocked && equippedShieldId !== item.id}
                          title={equipBlocked && equippedShieldId !== item.id ? equipBlockedTitle : undefined}
                          onChange={(checked) => onEquipShield(checked ? item.id : null)}
                        />
                      )}
                      {isWeapon && (
                        <EquipRow
                          label="Wield"
                          checked={equippedWeaponId === item.id}
                          disabled={equipBlocked && equippedWeaponId !== item.id}
                          title={equipBlocked && equippedWeaponId !== item.id ? equipBlockedTitle : undefined}
                          onChange={(checked) => onEquipWeapon(checked ? item.id : null)}
                        />
                      )}
                      {attunable && (
                        <EquipRow
                          label="Attune"
                          checked={isAttuned}
                          disabled={attuneDisabled}
                          onChange={() => onToggleAttune(item.id)}
                        />
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onShowDetails(item)}
                    className="p-0.5 text-muted-foreground hover:text-primary shrink-0"
                    aria-label={`Details for ${item.name}`}
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <p className="text-xs text-muted-foreground md:col-span-2">No equipment matches your search</p>
        )}
      </div>
        </>
      )}
    </div>
  )
}
