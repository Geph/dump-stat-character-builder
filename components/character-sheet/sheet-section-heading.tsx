"use client"

import type { LucideIcon } from "lucide-react"
import { GameIcon } from "@/components/game-icon-picker"
import { cn } from "@/lib/utils"

type SheetSectionHeadingProps = {
  children: React.ReactNode
  className?: string
  /** Match ability-tab uppercase labels vs combat panel titles. */
  size?: "sm" | "xs"
  as?: "h2" | "h3" | "p"
} & (
  | { icon: LucideIcon; gameIcon?: never }
  | { icon?: never; gameIcon: string }
)

export function SheetSectionHeading({
  icon: Icon,
  gameIcon,
  children,
  className,
  size = "sm",
  as: Tag = "h2",
}: SheetSectionHeadingProps) {
  return (
    <Tag
      className={cn(
        "flex items-center gap-2 font-bold",
        size === "sm" && "mb-2 text-sm text-foreground",
        size === "xs" && "mb-2 text-xs uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      {gameIcon ? (
        <GameIcon name={gameIcon} className="h-4 w-4 shrink-0 text-primary" />
      ) : Icon ? (
        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      ) : null}
      {children}
    </Tag>
  )
}
