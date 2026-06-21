"use client"

import { Coins } from "lucide-react"
import type { StartingEquipmentOption } from "@/lib/types"
import { isGoldOnlyOption } from "@/lib/builder/equipment-utils"
import { STARTING_EQUIPMENT_CARD_IMAGES } from "@/lib/site-images"
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
  options = [],
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
          const optionItems = option.items ?? []
          const edgeImage = goldOnly
            ? STARTING_EQUIPMENT_CARD_IMAGES.gold
            : STARTING_EQUIPMENT_CARD_IMAGES.gear

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
                  "relative w-[45%] shrink-0 overflow-hidden bg-muted/20",
                  side === "right" ? "order-2" : "order-1",
                )}
                aria-hidden
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={edgeImage}
                  alt=""
                  className={cn(
                    "h-full w-full object-cover",
                    side === "right" ? "object-right" : "object-left",
                  )}
                />
              </div>

              <div
                className={cn(
                  "flex min-w-0 flex-1 flex-col justify-center gap-2 p-4",
                  side === "right" ? "order-1" : "order-2",
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
                    {optionItems.map((item, ii) => {
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
            </button>
          )
        })}
      </div>
    </div>
  )
}
