"use client"

import type { ReactNode } from "react"
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
  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
          Armor
        </p>
        {armorOptions.length > 0 ? (
          <div className="space-y-1">
            {armorOptions.map((item) => (
              <EquipCheckboxRow
                key={item.id}
                item={item}
                checked={equippedArmorId === item.id}
                onChange={(checked) => onEquippedArmorChange(checked ? item.id : null)}
              />
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground italic">No armor owned</p>
        )}
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
          Shields
        </p>
        {shieldOptions.length > 0 ? (
          <div className="space-y-1">
            {shieldOptions.map((item) => (
              <EquipCheckboxRow
                key={item.id}
                item={item}
                checked={equippedShieldId === item.id}
                onChange={(checked) => onEquippedShieldChange(checked ? item.id : null)}
              />
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground italic">No shields owned</p>
        )}
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
          Main Weapon
        </p>
        {weaponOptions.length > 0 ? (
          <div className="space-y-1">
            {weaponOptions.map((item) => (
              <EquipCheckboxRow
                key={item.id}
                item={item}
                checked={equippedWeaponId === item.id}
                onChange={(checked) => onEquippedWeaponChange(checked ? item.id : null)}
              />
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground italic">No weapons owned</p>
        )}
        {weaponAttackDisplay}
      </div>
    </div>
  )
}
