"use client"

import type { ReactNode } from "react"
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Feat } from "@/lib/types"

type BuilderFeatChoiceButtonProps = {
  feat: Feat
  selected: boolean
  selectedClassName: string
  unselectedClassName?: string
  nameClassName?: string
  compact?: boolean
  showPrerequisite?: boolean
  onSelect: () => void
  onShowDetails?: (feat: Feat) => void
  children?: ReactNode
}

export function BuilderFeatChoiceButton({
  feat,
  selected,
  selectedClassName,
  unselectedClassName = "border-border bg-card hover:border-secondary/50",
  nameClassName,
  compact = false,
  showPrerequisite = false,
  onSelect,
  onShowDetails,
  children,
}: BuilderFeatChoiceButtonProps) {
  const prereq = feat.prerequisite?.trim()

  return (
    <div className="flex min-w-0 items-stretch gap-1">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "min-w-0 flex-1 rounded-lg border-2 text-left transition-all",
          compact ? "px-2.5 py-1.5" : "p-3",
          selected ? selectedClassName : unselectedClassName,
        )}
      >
        <p
          className={cn(
            "font-semibold",
            nameClassName ?? (compact ? "text-xs text-foreground" : "text-sm text-foreground"),
          )}
        >
          {feat.name}
        </p>
        {showPrerequisite && prereq ? (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
            Prereq: {prereq}
          </p>
        ) : null}
        {children}
      </button>
      {onShowDetails ? (
        <button
          type="button"
          aria-label={`About ${feat.name}`}
          onClick={(event) => {
            event.stopPropagation()
            onShowDetails(feat)
          }}
          className="inline-flex shrink-0 items-center justify-center self-stretch rounded-md border border-border bg-card px-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}
