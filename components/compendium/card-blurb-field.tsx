"use client"

import {
  COMPENDIUM_CARD_BLURB_MAX_LENGTH,
} from "@/lib/compendium/card-image"
import { cn } from "@/lib/utils"

type CardBlurbFieldProps = {
  value: string
  onChange: (value: string) => void
  label?: string
  hint?: string
  placeholder?: string
  className?: string
}

export function CardBlurbField({
  value,
  onChange,
  label = "Card blurb",
  hint = "Short text shown on selection cards in the builder (2 lines max).",
  placeholder = "A one- or two-sentence hook that fits on the card…",
  className,
}: CardBlurbFieldProps) {
  const length = value.length
  const overLimit = length > COMPENDIUM_CARD_BLURB_MAX_LENGTH

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <label className="block text-sm font-semibold text-foreground">{label}</label>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        <span
          className={cn(
            "text-xs tabular-nums shrink-0",
            overLimit ? "text-destructive font-semibold" : "text-muted-foreground",
          )}
        >
          {length}/{COMPENDIUM_CARD_BLURB_MAX_LENGTH}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) =>
          onChange(e.target.value.slice(0, COMPENDIUM_CARD_BLURB_MAX_LENGTH))
        }
        maxLength={COMPENDIUM_CARD_BLURB_MAX_LENGTH}
        rows={3}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground text-sm leading-relaxed focus:outline-none focus:border-primary resize-y min-h-[80px]"
      />
    </div>
  )
}
