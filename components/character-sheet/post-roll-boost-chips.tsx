"use client"

import type { PostRollDieBoost } from "@/lib/character/post-roll-die-boosts"

export type AppliedPostRollBoost = { sourceName: string; value: number; dieSides: number }

function resourceDieLabel(resourceKey: string): string {
  const words = resourceKey
    .split("_")
    .filter(Boolean)
    .map((word) => (/^dice$/i.test(word) ? "Die" : word.charAt(0).toUpperCase() + word.slice(1)))
  return words.join(" ")
}

export function PostRollBoostChips({
  boosts,
  applied,
  availableFor,
  onApply,
  filled = false,
}: {
  boosts: PostRollDieBoost[]
  applied: AppliedPostRollBoost | null
  availableFor?: (resourceKey: string) => number
  onApply: (boost: PostRollDieBoost) => void
  filled?: boolean
}) {
  if (applied) {
    return (
      <span
        className={`inline-flex h-6 items-center rounded border px-1.5 text-[10px] font-bold tabular-nums ${
          filled ? "border-white/50 text-white" : "border-primary/40 text-primary"
        }`}
        title={`${applied.sourceName}: rolled ${applied.value} on d${applied.dieSides}`}
      >
        +{applied.value} {applied.sourceName}
      </span>
    )
  }
  if (!boosts.length) return null
  return (
    <>
      {boosts.map((boost) => {
        const available = availableFor ? availableFor(boost.resourceKey) : Infinity
        const dieLabel = resourceDieLabel(boost.resourceKey)
        const disabled = available < boost.amount
        const action = boost.reroll
          ? `reroll and add the ${dieLabel}`
          : `add the ${dieLabel} to this roll`
        return (
          <button
            key={boost.id}
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation()
              onApply(boost)
            }}
            className={`inline-flex h-6 items-center gap-0.5 rounded border px-1.5 text-[10px] font-bold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50 ${
              filled
                ? "border-white/50 bg-black/15 text-white hover:border-white/80"
                : "border-dashed border-primary/50 text-primary hover:bg-primary/10"
            }`}
            title={
              disabled
                ? `${boost.sourceName}: no ${dieLabel} left`
                : `${boost.sourceName}: expend ${boost.amount} ${dieLabel} to ${action}${
                    boost.useReaction ? " (uses your Reaction)" : ""
                  }`
            }
            aria-label={`${boost.sourceName}: ${action}`}
          >
            +d{boost.dieSides} {boost.sourceName}
          </button>
        )
      })}
    </>
  )
}
