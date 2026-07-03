"use client"

import type { MagicItemPower } from "@/lib/character/magic-item-powers"

type MagicItemPowersPanelProps = {
  powers: MagicItemPower[]
  activeToggleIds: ReadonlySet<string>
  onTogglePower: (toggleId: string, active: boolean) => void
}

export function MagicItemPowersPanel({
  powers,
  activeToggleIds,
  onTogglePower,
}: MagicItemPowersPanelProps) {
  if (!powers.length) return null

  return (
    <section className="bg-card rounded-xl p-3 border border-border">
      <h2 className="text-sm font-bold mb-2">Magic Item Powers</h2>
      <div className="space-y-2">
        {powers.map((power) => {
          if (power.kind === "conditional" && power.toggleId) {
            const active = activeToggleIds.has(power.toggleId)
            return (
              <label
                key={`${power.itemId}-${power.powerId}`}
                className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => onTogglePower(power.toggleId!, event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-primary shrink-0"
                />
                <span>
                  <span className="font-semibold text-foreground">{power.itemName}</span>
                  <span className="text-muted-foreground"> — </span>
                  <span>{power.label}</span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                    Conditional — off by default
                  </span>
                </span>
              </label>
            )
          }

          return (
            <div
              key={`${power.itemId}-${power.powerId}`}
              className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
            >
              <span className="font-semibold text-foreground">{power.itemName}</span>
              <span className="text-muted-foreground"> — </span>
              <span>{power.label}</span>
              <span className="block text-[10px] text-muted-foreground mt-0.5 capitalize">
                {power.kind === "uses" ? "Activatable power" : "Passive"}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
