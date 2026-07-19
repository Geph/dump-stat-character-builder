"use client"

import { ABILITY_SCORE_KEYS } from "@/lib/compendium/characteristic-modifiers"
import {
  adjustAsiPoint,
  getAsiAllocatorHelpText,
  getAsiPointsUsed,
  type AsiAllocation,
} from "@/lib/builder/asi-allocation"
import { compendiumCardHeroImageClass } from "@/lib/compendium/card-image"
import { cn } from "@/lib/utils"

type Props = {
  allocation: AsiAllocation
  onChange: (allocation: AsiAllocation) => void
  totalPoints: number
  pickCount?: number
  title?: string
  /** Origin of this pool (e.g. "Feat · Observant"). */
  sourceLabel?: string | null
  allowedAbilities?: (typeof ABILITY_SCORE_KEYS)[number][]
  maxPerAbility?: number
  helpText?: string
  /** Cinematic builder — dark cards matching ability score pickers. */
  variant?: "default" | "visual"
  /** Optional banner image (e.g. selected background card art). */
  headerImageUrl?: string | null
  /** Base ability scores before this allocator's bonuses. */
  baseScores?: Partial<Record<(typeof ABILITY_SCORE_KEYS)[number], number>>
  /** Bonuses from other allocators already applied. */
  otherBonuses?: Partial<Record<(typeof ABILITY_SCORE_KEYS)[number], number>>
  /** Cap for base + other + this allocator (default uncapped). */
  scoreCap?: number
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
  sourceLabel = null,
  allowedAbilities,
  maxPerAbility,
  helpText: helpTextOverride,
  variant = "default",
  headerImageUrl,
  baseScores,
  otherBonuses,
  scoreCap,
}: Props) {
  const pointsUsed = getAsiPointsUsed(allocation)
  const pointsRemaining = totalPoints - pointsUsed
  const helpText = helpTextOverride ?? getAsiAllocatorHelpText(totalPoints, pickCount)
  const perAbilityMax = maxPerAbility ?? totalPoints
  const visibleAbilities = allowedAbilities ?? ABILITY_SCORE_KEYS
  const visual = variant === "visual"
  const bannerUrl = headerImageUrl?.trim() || null

  const canIncrease = (ability: (typeof ABILITY_SCORE_KEYS)[number], value: number) => {
    if (pointsRemaining <= 0 || value >= perAbilityMax) return false
    if (scoreCap == null) return true
    const base = baseScores?.[ability] ?? 0
    const other = otherBonuses?.[ability] ?? 0
    return base + other + value + 1 <= scoreCap
  }

  const abilityRows = (
    <div
      className={cn(
        "grid gap-2",
        visual
          ? "max-sm:grid-cols-1 max-sm:gap-3 sm:grid-cols-2 xl:grid-cols-3"
          : "max-sm:grid-cols-1 sm:grid-cols-3",
      )}
    >
      {ABILITY_SCORE_KEYS.filter((ability) => visibleAbilities.includes(ability)).map((ability) => {
        const value = allocation[ability] ?? 0
        return (
          <div
            key={ability}
            className={cn(
              "flex items-center justify-between gap-2 px-2 py-1.5 rounded-md",
              visual
                ? "rounded-lg border border-white/15 bg-white/5 max-sm:px-3 max-sm:py-3"
                : "bg-muted/50 max-sm:px-3 max-sm:py-3",
            )}
          >
            <span
              className={cn(
                "text-xs truncate",
                visual ? "font-semibold uppercase tracking-wide text-white/80" : "text-foreground",
              )}
            >
              {ABILITY_LABELS[ability]}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onChange(adjustAsiPoint(allocation, ability, -1, perAbilityMax))}
                disabled={value <= 0}
                className={cn(
                  "rounded text-sm font-bold disabled:opacity-30 max-sm:h-10 max-sm:w-10 max-sm:text-base",
                  visual
                    ? "h-7 w-7 rounded-lg border border-white/15 bg-white/10 text-white hover:bg-white/20"
                    : "w-6 h-6 bg-muted text-foreground",
                )}
                aria-label={`Decrease ${ABILITY_LABELS[ability]}`}
              >
                −
              </button>
              <span
                className={cn(
                  "w-5 text-center text-sm font-bold",
                  visual ? "w-6 text-amber-400" : "text-primary",
                )}
              >
                +{value}
              </span>
              <button
                type="button"
                onClick={() => onChange(adjustAsiPoint(allocation, ability, 1, perAbilityMax))}
                disabled={!canIncrease(ability, value)}
                className={cn(
                  "rounded text-sm font-bold disabled:opacity-30 max-sm:h-10 max-sm:w-10 max-sm:text-base",
                  visual
                    ? "h-7 w-7 rounded-lg border border-white/15 bg-white/10 text-white hover:bg-white/20"
                    : "w-6 h-6 bg-muted text-foreground",
                )}
                aria-label={`Increase ${ABILITY_LABELS[ability]}`}
              >
                +
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )

  if (!visual) {
    return (
      <div className="mt-2 p-3 rounded-lg border border-border bg-card/80">
        <p className="text-xs font-bold text-foreground mb-1">{title}</p>
        {sourceLabel ? (
          <p className="text-[11px] text-muted-foreground mb-1">{sourceLabel}</p>
        ) : null}
        {pickCount > 1 && (
          <p className="text-[11px] text-muted-foreground mb-1">
            From {pickCount} selected feats ({totalPoints} points total)
          </p>
        )}
        <p className="text-[11px] text-muted-foreground mb-2">
          {helpText} ({pointsRemaining} point{pointsRemaining === 1 ? "" : "s"} remaining)
        </p>
        {abilityRows}
      </div>
    )
  }

  return (
    <div
      className="mt-2 overflow-hidden rounded-xl border-2 border-border bg-gradient-to-b from-black via-zinc-950 to-black transition-colors hover:border-amber-500/40"
      style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.45)" }}
    >
      {bannerUrl ? (
        <div className="relative aspect-[21/9] max-h-[11.2rem] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerUrl}
            alt=""
            className={compendiumCardHeroImageClass("top")}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/45 to-black" />
        </div>
      ) : null}

      <div className={cn("relative p-4", !bannerUrl && "pt-4")}>
        <p className="font-serif text-base font-black uppercase tracking-wide text-white">{title}</p>
        {sourceLabel ? (
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-400/80">
            {sourceLabel}
          </p>
        ) : null}
        {pickCount > 1 && (
          <p className="mt-0.5 text-[11px] text-white/50">
            From {pickCount} selected feats ({totalPoints} points total)
          </p>
        )}
        <p className="mt-1 text-[11px] leading-relaxed text-white/55">
          {helpText}{" "}
          <span className="font-semibold text-amber-400/90">
            ({pointsRemaining} point{pointsRemaining === 1 ? "" : "s"} remaining)
          </span>
        </p>
        <div className="mt-3">{abilityRows}</div>
      </div>
    </div>
  )
}
