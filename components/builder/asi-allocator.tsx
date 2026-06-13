"use client"

import { ABILITY_SCORE_KEYS } from "@/lib/compendium/characteristic-modifiers"
import {
  adjustAsiPoint,
  getAsiAllocatorHelpText,
  getAsiPointsUsed,
  type AsiAllocation,
} from "@/lib/builder/asi-allocation"

type Props = {
  allocation: AsiAllocation
  onChange: (allocation: AsiAllocation) => void
  totalPoints: number
  pickCount?: number
  title?: string
  allowedAbilities?: (typeof ABILITY_SCORE_KEYS)[number][]
  maxPerAbility?: number
  helpText?: string
}

const ABILITY_LABELS: Record<(typeof ABILITY_SCORE_KEYS)[number], string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
}

export function AsiAllocator({
  allocation,
  onChange,
  totalPoints,
  pickCount = 1,
  title = "Ability Score Improvement",
  allowedAbilities,
  maxPerAbility,
  helpText: helpTextOverride,
}: Props) {
  const pointsUsed = getAsiPointsUsed(allocation)
  const pointsRemaining = totalPoints - pointsUsed
  const helpText = helpTextOverride ?? getAsiAllocatorHelpText(totalPoints, pickCount)
  const perAbilityMax = maxPerAbility ?? totalPoints
  const visibleAbilities = allowedAbilities ?? ABILITY_SCORE_KEYS

  return (
    <div className="mt-2 p-3 rounded-lg border border-border bg-card/80">
      <p className="text-xs font-bold text-foreground mb-1">{title}</p>
      {pickCount > 1 && (
        <p className="text-[11px] text-muted-foreground mb-1">
          From {pickCount} selected feats ({totalPoints} points total)
        </p>
      )}
      <p className="text-[11px] text-muted-foreground mb-2">
        {helpText} ({pointsRemaining} point{pointsRemaining === 1 ? "" : "s"} remaining)
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ABILITY_SCORE_KEYS.filter((ability) => visibleAbilities.includes(ability)).map((ability) => {
          const value = allocation[ability] ?? 0
          return (
            <div
              key={ability}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-muted/50"
            >
              <span className="text-xs text-foreground truncate">{ABILITY_LABELS[ability]}</span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onChange(adjustAsiPoint(allocation, ability, -1, perAbilityMax))}
                  disabled={value <= 0}
                  className="w-6 h-6 rounded bg-muted text-foreground text-sm font-bold disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-5 text-center text-sm font-bold text-primary">+{value}</span>
                <button
                  type="button"
                  onClick={() => onChange(adjustAsiPoint(allocation, ability, 1, perAbilityMax))}
                  disabled={pointsRemaining <= 0 || value >= perAbilityMax}
                  className="w-6 h-6 rounded bg-muted text-foreground text-sm font-bold disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
