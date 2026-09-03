"use client"

import type { Equipment } from "@/lib/types"

type WeaponSpellBuffPickerOverlayProps = {
  open: boolean
  title: string
  hint?: string
  weapons: Equipment[]
  onPick: (weaponId: string) => void
  onCancel: () => void
}

/** Modal to choose which wielded weapon a spell buff (Magic Weapon, …) enchants. */
export function WeaponSpellBuffPickerOverlay({
  open,
  title,
  hint,
  weapons,
  onPick,
  onCancel,
}: WeaponSpellBuffPickerOverlayProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="weapon-spell-buff-picker-title"
        className="relative w-full max-w-md rounded-2xl border-2 border-primary/40 bg-card p-5 shadow-2xl"
      >
        <h2
          id="weapon-spell-buff-picker-title"
          className="text-lg font-black text-foreground"
        >
          {title}
        </h2>
        {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
        {weapons.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No wielded weapons in inventory. Equip a weapon, then try again.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {weapons.map((weapon) => (
              <li key={weapon.id}>
                <button
                  type="button"
                  onClick={() => onPick(weapon.id)}
                  className="flex w-full items-center justify-between rounded-xl border-2 border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <span className="font-semibold text-foreground">{weapon.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {weapon.subcategory?.trim() || "Weapon"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            {weapons.length === 0 ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  )
}
