"use client"

import { Sparkles } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { StatContribution } from "@/lib/character/stat-contributions"

function formatSigned(value: number) {
  return value >= 0 ? `+${value}` : `${value}`
}

/** Feature bonus lines on a skill breakdown (excludes ability / proficiency / expertise). */
export function skillFeatureBonusLines(
  contributions: StatContribution[] | undefined,
): StatContribution[] {
  return (contributions ?? []).filter((line) => {
    if (line.sourceType !== "feature") return false
    const label = line.label.trim().toLowerCase()
    return label !== "proficiency" && label !== "expertise"
  })
}

type SkillFeatureBonusIndicatorProps = {
  contributions: StatContribution[]
}

/** Compact notice when a feature adds to a skill check; hover shows source + amount. */
export function SkillFeatureBonusIndicator({ contributions }: SkillFeatureBonusIndicatorProps) {
  const featureLines = skillFeatureBonusLines(contributions)
  if (!featureLines.length) return null

  const total = featureLines.reduce((sum, line) => sum + line.amount, 0)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex items-center justify-center rounded px-0.5 py-0.5 bg-sky/15 text-sky border border-sky/25 shrink-0"
          aria-label={`Feature bonuses ${formatSigned(total)}`}
        >
          <Sparkles className="h-3 w-3" aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4} className="max-w-[220px] space-y-1 p-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Feature bonuses
        </p>
        {featureLines.map((line, index) => (
          <div
            key={`${line.label}-${index}`}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="min-w-0 leading-snug">{line.label}</span>
            <span className="font-medium tabular-nums shrink-0">{formatSigned(line.amount)}</span>
          </div>
        ))}
      </TooltipContent>
    </Tooltip>
  )
}
