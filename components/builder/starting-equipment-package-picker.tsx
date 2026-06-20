"use client"

import { Check, Coins } from "lucide-react"
import type { StartingEquipmentOption } from "@/lib/types"
import { isGoldOnlyOption } from "@/lib/builder/equipment-utils"
import { cn } from "@/lib/utils"

type StartingEquipmentPackagePickerProps = {
  title: string
  description: string
  options: StartingEquipmentOption[]
  selectedIndex: number | null
  startingGold: number
  onSelect: (index: number) => void
  /** Alternate image side per row for visual variety */
  imageSide?: "left" | "right" | "alternate"
}

export function StartingEquipmentPackagePicker({
  title,
  description,
  options,
  selectedIndex,
  startingGold,
  onSelect,
  imageSide = "alternate",
}: StartingEquipmentPackagePickerProps) {
  if (!options.length) return null

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{title}</p>
        <h3 className="mt-1 font-serif text-xl font-black text-foreground">{description}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose <span className="font-semibold text-foreground">one</span> package:
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {options.map((option, index) => {
          const selected = selectedIndex === index
          const goldOnly = isGoldOnlyOption(option, startingGold)
          const side =
            imageSide === "alternate" ? (index % 2 === 0 ? "left" : "right") : imageSide
          const gpInPackage = option.items.find(
            (item) => item.name.toLowerCase() === "gold pieces",
          )

          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelect(index)}
              className={cn(
                "group relative flex min-h-[140px] w-full overflow-hidden rounded-xl border-2 text-left transition-all",
                selected
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <div
                className={cn(
                  "absolute left-1/2 top-0 z-20 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-card transition-colors",
                  selected
                    ? "border-primary bg-destructive text-white"
                    : "border-border bg-muted text-transparent group-hover:border-primary/50",
                )}
              >
                {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </div>

              <div
                className={cn(
                  "relative z-10 flex flex-1 flex-col justify-center gap-2 p-4 pt-5",
                  side === "right" ? "order-1 pr-28" : "pl-28",
                )}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-primary">
                  Option {option.label || String.fromCharCode(65 + index)}
                </p>
                {goldOnly ? (
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-primary" />
                    <span className="font-serif text-2xl font-black text-foreground">
                      {startingGold} GP
                    </span>
                  </div>
                ) : (
                  <ul className="space-y-0.5">
                    {option.items.map((item, ii) => {
                      const isGp = item.name.toLowerCase() === "gold pieces"
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
                  </ul>
                )}
                {goldOnly && (
                  <p className="text-[10px] text-muted-foreground">
                    Buy equipment from the list below with your starting gold.
                  </p>
                )}
              </div>

              <div
                className={cn(
                  "absolute bottom-0 top-0 w-24 bg-gradient-to-br from-muted/80 via-primary/20 to-muted/40 opacity-80",
                  side === "right" ? "right-0" : "left-0",
                )}
                aria-hidden
              >
                <div className="flex h-full items-center justify-center text-4xl opacity-30">
                  {goldOnly ? "💰" : "🎒"}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
