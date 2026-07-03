"use client"

import { useMemo, useState, type ReactNode } from "react"
import { Search } from "lucide-react"
import {
  filterEquipmentByMagicKind,
  filterEquipmentList,
} from "@/lib/compendium/equipment-display"
import type { Equipment } from "@/lib/types"
import { cn } from "@/lib/utils"

type EquippedGearPanelProps = {
  armorOptions: Equipment[]
  shieldOptions: Equipment[]
  weaponOptions: Equipment[]
  equippedArmorId: string | null
  equippedShieldId: string | null
  equippedWeaponId: string | null
  onEquippedArmorChange: (id: string | null) => void
  onEquippedShieldChange: (id: string | null) => void
  onEquippedWeaponChange: (id: string | null) => void
  weaponAttackDisplay?: ReactNode
  className?: string
}

type GearSlotFilter = "all" | "armor" | "shield" | "weapon"
type MagicKindFilter = "all" | "magic" | "mundane"

function EquipCheckboxRow({
  item,
  checked,
  onChange,
}: {
  item: Equipment
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 rounded border px-2 py-1.5 cursor-pointer transition-colors",
        checked ? "border-primary bg-primary/10" : "border-border bg-background/80 hover:border-primary/40",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
      />
      <span className="text-[10px] font-medium text-foreground truncate">{item.name}</span>
    </label>
  )
}

function filterGearOptions(
  items: Equipment[],
  search: string,
  magicKind: MagicKindFilter,
  equippedId: string | null,
): Equipment[] {
  const filtered = filterEquipmentByMagicKind(filterEquipmentList(items, search), magicKind)
  if (!equippedId) return filtered
  const equipped = items.find((item) => item.id === equippedId)
  if (!equipped || filtered.some((item) => item.id === equippedId)) return filtered
  return [equipped, ...filtered]
}

function GearSection({
  title,
  items,
  equippedId,
  onEquip,
  emptyLabel,
}: {
  title: string
  items: Equipment[]
  equippedId: string | null
  onEquip: (id: string | null) => void
  emptyLabel: string
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
        {title}
        {items.length > 0 ? (
          <span className="text-muted-foreground/80 font-normal normal-case ml-1">({items.length})</span>
        ) : null}
      </p>
      {items.length > 0 ? (
        <div className="space-y-1">
          {items.map((item) => (
            <EquipCheckboxRow
              key={item.id}
              item={item}
              checked={equippedId === item.id}
              onChange={(checked) => onEquip(checked ? item.id : null)}
            />
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground italic">{emptyLabel}</p>
      )}
    </div>
  )
}

export function EquippedGearPanel({
  armorOptions,
  shieldOptions,
  weaponOptions,
  equippedArmorId,
  equippedShieldId,
  equippedWeaponId,
  onEquippedArmorChange,
  onEquippedShieldChange,
  onEquippedWeaponChange,
  weaponAttackDisplay,
  className,
}: EquippedGearPanelProps) {
  const [search, setSearch] = useState("")
  const [slotFilter, setSlotFilter] = useState<GearSlotFilter>("all")
  const [magicKindFilter, setMagicKindFilter] = useState<MagicKindFilter>("all")

  const filteredArmor = useMemo(
    () => filterGearOptions(armorOptions, search, magicKindFilter, equippedArmorId),
    [armorOptions, search, magicKindFilter, equippedArmorId],
  )
  const filteredShields = useMemo(
    () => filterGearOptions(shieldOptions, search, magicKindFilter, equippedShieldId),
    [shieldOptions, search, magicKindFilter, equippedShieldId],
  )
  const filteredWeapons = useMemo(
    () => filterGearOptions(weaponOptions, search, magicKindFilter, equippedWeaponId),
    [weaponOptions, search, magicKindFilter, equippedWeaponId],
  )

  const totalVisible =
    (slotFilter === "all" || slotFilter === "armor" ? filteredArmor.length : 0) +
    (slotFilter === "all" || slotFilter === "shield" ? filteredShields.length : 0) +
    (slotFilter === "all" || slotFilter === "weapon" ? filteredWeapons.length : 0)

  const hasAnyOwned = armorOptions.length + shieldOptions.length + weaponOptions.length > 0

  return (
    <div className={cn("space-y-2", className)}>
      {hasAnyOwned ? (
        <>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search owned gear..."
              className="w-full pl-8 pr-2 py-1.5 text-[10px] bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <select
              value={slotFilter}
              onChange={(e) => setSlotFilter(e.target.value as GearSlotFilter)}
              className="flex-1 min-w-[5.5rem] bg-background border border-border rounded-md px-2 py-1 text-[10px] text-foreground focus:outline-none focus:border-primary"
              aria-label="Filter by gear slot"
            >
              <option value="all">All slots</option>
              <option value="armor">Armor</option>
              <option value="shield">Shields</option>
              <option value="weapon">Weapons</option>
            </select>
            <select
              value={magicKindFilter}
              onChange={(e) => setMagicKindFilter(e.target.value as MagicKindFilter)}
              className="flex-1 min-w-[5.5rem] bg-background border border-border rounded-md px-2 py-1 text-[10px] text-foreground focus:outline-none focus:border-primary"
              aria-label="Filter by item kind"
            >
              <option value="all">All items</option>
              <option value="magic">Magic</option>
              <option value="mundane">Mundane</option>
            </select>
            {(search.trim() || slotFilter !== "all" || magicKindFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("")
                  setSlotFilter("all")
                  setMagicKindFilter("all")
                }}
                className="px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </>
      ) : null}

      <div className="max-h-48 overflow-y-auto pr-0.5 space-y-3">
        {totalVisible === 0 ? (
          <p className="text-[10px] text-muted-foreground italic text-center py-3">
            {hasAnyOwned ? "No gear matches your search or filters." : "No equipment owned yet."}
          </p>
        ) : (
          <>
            {(slotFilter === "all" || slotFilter === "armor") && (
              <GearSection
                title="Armor"
                items={filteredArmor}
                equippedId={equippedArmorId}
                onEquip={onEquippedArmorChange}
                emptyLabel={armorOptions.length > 0 ? "No armor matches filters" : "No armor owned"}
              />
            )}
            {(slotFilter === "all" || slotFilter === "shield") && (
              <GearSection
                title="Shields"
                items={filteredShields}
                equippedId={equippedShieldId}
                onEquip={onEquippedShieldChange}
                emptyLabel={shieldOptions.length > 0 ? "No shields match filters" : "No shields owned"}
              />
            )}
            {(slotFilter === "all" || slotFilter === "weapon") && (
              <GearSection
                title="Main Weapon"
                items={filteredWeapons}
                equippedId={equippedWeaponId}
                onEquip={onEquippedWeaponChange}
                emptyLabel={weaponOptions.length > 0 ? "No weapons match filters" : "No weapons owned"}
              />
            )}
          </>
        )}
      </div>

      {weaponAttackDisplay}
    </div>
  )
}
