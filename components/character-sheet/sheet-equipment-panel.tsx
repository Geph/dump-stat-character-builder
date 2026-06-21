"use client"

import { Coins, Info, Plus, Search } from "lucide-react"
import { DamageRollButton } from "@/components/character-sheet/damage-roll-button"
import { D20RollButton } from "@/components/character-sheet/d20-roll-button"
import {
  DEFAULT_ATTUNEMENT_SLOTS,
  isAttunableItem,
} from "@/lib/compendium/equipment-attunement"
import { filterEquipmentList } from "@/lib/compendium/equipment-display"
import {
  calculateWeaponAttack,
  getWeaponDamageText,
  isArmorItem,
  isShieldItem,
  isWeaponItem,
  isWeaponProficient,
} from "@/lib/compendium/combat-stats"
import type { Equipment } from "@/lib/types"
import { cn } from "@/lib/utils"

type SheetEquipmentPanelProps = {
  equipment: Equipment[]
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
  weaponProficiencies: string[]
  abilityMods: Record<string, number>
  proficiencyBonus: number
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
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-1.5 shrink-0 cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
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
  weaponProficiencies,
  abilityMods,
  proficiencyBonus,
  onEquipArmor,
  onEquipShield,
  onEquipWeapon,
  onToggleAttune,
  onShowDetails,
}: SheetEquipmentPanelProps) {
  const filtered = filterEquipmentList(equipment, searchQuery)
  const attunedCount = attunedItemIds.length
  const slotCap = maxAttunementSlots || DEFAULT_ATTUNEMENT_SLOTS

  const adjustGold = (delta: number) => {
    onGoldChange(Math.max(0, gold + delta))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs font-semibold text-foreground">Gold</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => adjustGold(-1)}
              className="w-7 h-7 rounded-md border border-border bg-muted text-sm font-bold hover:bg-muted/80"
              aria-label="Decrease gold by 1"
            >
              −
            </button>
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
            <button
              type="button"
              onClick={() => adjustGold(1)}
              className="w-7 h-7 rounded-md border border-border bg-muted text-sm font-bold hover:bg-muted/80"
              aria-label="Increase gold by 1"
            >
              +
            </button>
          </div>
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
      <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
        {filtered.length ? (
          filtered.map((item) => {
            const isArmor = isArmorItem(item)
            const isShield = isShieldItem(item)
            const isWeapon = isWeaponItem(item)
            const attunable = isAttunableItem(item)
            const isAttuned = attunedItemIds.includes(item.id)
            const attuneDisabled = attunable && !isAttuned && attunedCount >= slotCap
            const proficient = isWeapon ? isWeaponProficient(item, weaponProficiencies) : false
            const attack =
              isWeapon && equippedWeaponId === item.id
                ? calculateWeaponAttack(item, abilityMods, proficiencyBonus, proficient)
                : null
            const damageText = isWeapon ? getWeaponDamageText(item) : null

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-lg border px-2.5 py-2 bg-muted/40",
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
                      <span className="text-[10px] text-muted-foreground shrink-0">{item.category}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      {isArmor && (
                        <EquipRow
                          label="Wear"
                          checked={equippedArmorId === item.id}
                          onChange={(checked) => onEquipArmor(checked ? item.id : null)}
                        />
                      )}
                      {isShield && (
                        <EquipRow
                          label="Wield"
                          checked={equippedShieldId === item.id}
                          onChange={(checked) => onEquipShield(checked ? item.id : null)}
                        />
                      )}
                      {isWeapon && (
                        <EquipRow
                          label="Wield"
                          checked={equippedWeaponId === item.id}
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
                    {attack && (
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground uppercase">To Hit</span>
                          <D20RollButton modifier={attack.attackBonus} title={`${item.name} attack`} />
                        </div>
                        {(attack.damageDisplay || damageText) && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground uppercase">Dmg</span>
                            <DamageRollButton
                              expression={attack.damageDisplay ?? damageText!}
                              label={`${item.name} damage`}
                            />
                          </div>
                        )}
                      </div>
                    )}
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
          <p className="text-xs text-muted-foreground">No equipment matches your search</p>
        )}
      </div>
        </>
      )}
    </div>
  )
}
