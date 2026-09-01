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
  /** Override default `h-8 w-8` icon size. */
  iconClassName?: string
  selected?: boolean
  selectionVariant?: "primary" | "secondary"
  disabled?: boolean
  badge?: ReactNode
  accentColor?: CompendiumThemeColorId | null
  onSelect?: () => void
  /** When set without onSelect, the whole card opens the detail overlay. */
  onLearnMore?: () => void
  className?: string
}

export function CompendiumDenseSelectionCard({
  name,
  subtitle,
  icon,
  iconClassName,
  selected = false,
  selectionVariant = "primary",
  disabled = false,
  badge,
  accentColor = null,
  onSelect,
  onLearnMore,
  className,
}: CompendiumDenseSelectionCardProps) {
  const accent = compendiumAccentColorStyles(accentColor)
  const selectedClassName =
    selectionVariant === "secondary"
      ? "border-secondary bg-secondary/10 ring-1 ring-secondary/30"
      : "border-primary bg-primary/10 ring-1 ring-primary/30"
  const activate = onSelect ?? onLearnMore

  return (
    <div
      role={activate ? "button" : undefined}
      tabIndex={activate && !disabled ? 0 : undefined}
      aria-label={onLearnMore && !onSelect ? `View ${name} details` : undefined}
      onClick={disabled ? undefined : activate}
      onKeyDown={(e) => {
        if (!activate || disabled) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          activate()
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
          <GameIcon
            name={icon}
            className={cn("h-8 w-8 shrink-0", accent.iconText, iconClassName)}
          />
        )}
        <div className="min-w-0 flex-1">
          {subtitle && (
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {subtitle}
            </p>
          )}
          <h3 className="font-bold text-xs text-foreground leading-tight">{name}</h3>
        </div>
      </div>
    </div>
  )
}
