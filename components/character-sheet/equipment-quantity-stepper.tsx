"use client"

import { Minus, Plus } from "lucide-react"
import { EQUIPMENT_QUANTITY_MAX } from "@/lib/character/equipment-quantities"
import { cn } from "@/lib/utils"

type EquipmentQuantityStepperProps = {
  value: number
  onChange: (next: number) => void
  disabled?: boolean
  ariaLabel: string
  className?: string
}

export function EquipmentQuantityStepper({
  value,
  onChange,
  disabled,
  ariaLabel,
  className,
}: EquipmentQuantityStepperProps) {
  return (
    <div
      className={cn(
        "inline-flex h-8 items-center rounded-md border border-border bg-background/80",
        disabled && "opacity-50",
        className,
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        disabled={disabled || value <= 0}
        onClick={() => onChange(value - 1)}
        className="inline-flex h-8 w-7 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
        aria-label={`Decrease ${ariaLabel}`}
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        min={0}
        max={EQUIPMENT_QUANTITY_MAX}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const next = parseInt(event.target.value, 10)
          onChange(Number.isFinite(next) ? next : 0)
        }}
        aria-label={ariaLabel}
        className="h-8 w-8 border-x border-border bg-transparent text-center text-xs font-bold tabular-nums text-foreground focus:outline-none"
      />
      <button
        type="button"
        disabled={disabled || value >= EQUIPMENT_QUANTITY_MAX}
        onClick={() => onChange(value + 1)}
        className="inline-flex h-8 w-7 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
        aria-label={`Increase ${ariaLabel}`}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}
