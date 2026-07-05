"use client"

import type { ReactNode } from "react"
import { GameIcon } from "@/components/game-icon-picker"
import {
  compendiumAccentColorStyles,
  type CompendiumThemeColorId,
} from "@/lib/compendium/theme-colors"
import { cn } from "@/lib/utils"

type CompendiumDenseSelectionCardProps = {
  name: string
  subtitle?: string
  icon?: string | null
  selected?: boolean
  selectionVariant?: "primary" | "secondary"
  disabled?: boolean
  badge?: ReactNode
  accentColor?: CompendiumThemeColorId | null
  onSelect?: () => void
  className?: string
}

export function CompendiumDenseSelectionCard({
  name,
  subtitle,
  icon,
  selected = false,
  selectionVariant = "primary",
  disabled = false,
  badge,
  accentColor = null,
  onSelect,
  className,
}: CompendiumDenseSelectionCardProps) {
  const accent = compendiumAccentColorStyles(accentColor)
  const selectedClassName =
    selectionVariant === "secondary"
      ? "border-secondary bg-secondary/10 ring-1 ring-secondary/30"
      : "border-primary bg-primary/10 ring-1 ring-primary/30"

  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect && !disabled ? 0 : undefined}
      onClick={disabled ? undefined : onSelect}
      onKeyDown={(e) => {
        if (!onSelect || disabled) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        "relative flex flex-col rounded-xl border-2 bg-card p-3 text-left transition-all cursor-pointer",
        selected
          ? selectedClassName
          : "border-border hover:border-primary/40",
        disabled && "pointer-events-none opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {badge && <div className="absolute right-2 top-2">{badge}</div>}
      <div className="flex items-start gap-2">
        {icon && (
          <GameIcon name={icon} className={cn("h-8 w-8 shrink-0", accent.iconText)} />
        )}
        <div className="min-w-0 flex-1">
          {subtitle && (
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {subtitle}
            </p>
          )}
          <h3 className="font-bold text-sm text-foreground leading-tight">{name}</h3>
        </div>
      </div>
    </div>
  )
}
