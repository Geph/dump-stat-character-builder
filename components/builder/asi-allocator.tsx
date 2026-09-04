"use client"

import { ABILITY_SCORE_KEYS } from "@/lib/compendium/characteristic-modifiers"
import {
  adjustAsiPoint,
  getAsiAllocatorHelpText,
  getAsiPointsUsed,
  type AsiAllocation,
} from "@/lib/builder/asi-allocation"
import { GameIcon } from "@/components/game-icon-picker"
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
  /** Game-icons slug shown in the visual card's upper right (feat / trait icon). */
  icon?: string | null
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

const ABILITY_SHORT: Record<(typeof ABILITY_SCORE_KEYS)[number], string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
}

function hasCurrentScores(
  baseScores?: Partial<Record<(typeof ABILITY_SCORE_KEYS)[number], number>>,
): baseScores is Partial<Record<(typeof ABILITY_SCORE_KEYS)[number], number>> {
  return Boolean(baseScores && ABILITY_SCORE_KEYS.some((ability) => baseScores[ability] != null))
}

function CurrentAbilityScores({
  baseScores,
  otherBonuses,
  allocation,
  allowedAbilities,
  visual,
}: {
  baseScores: Partial<Record<(typeof ABILITY_SCORE_KEYS)[number], number>>
  otherBonuses?: Partial<Record<(typeof ABILITY_SCORE_KEYS)[number], number>>
  allocation: AsiAllocation
  allowedAbilities?: (typeof ABILITY_SCORE_KEYS)[number][]
  visual?: boolean
}) {
  const allowed = allowedAbilities ? new Set(allowedAbilities) : null
  return (
    <div
      className={cn(
        "rounded-md border px-2 py-2",
        visual ? "border-white/15 bg-white/5" : "border-border bg-muted/40",
      )}
    >
      <p
        className={cn(
          "mb-1.5 text-[10px] font-bold uppercase tracking-wide",
          visual ? "text-white/50" : "text-muted-foreground",
        )}
      >
        Current scores
      </p>
      <div className="grid grid-cols-6 gap-1">
        {ABILITY_SCORE_KEYS.map((ability) => {
          const current = (baseScores[ability] ?? 10) + (otherBonuses?.[ability] ?? 0)
          const added = allocation[ability] ?? 0
          const next = current + added
          const eligible = !allowed || allowed.has(ability)
          return (
            <div
              key={ability}
              className={cn(
                "rounded px-0.5 py-1 text-center",
                eligible ? (visual ? "bg-white/5" : "bg-background/70") : "opacity-50",
              )}
            >
              <p
                className={cn(
                  "text-[8px] font-bold uppercase tracking-wide",
                  visual ? "text-white/55" : "text-muted-foreground",
                )}
              >
                {ABILITY_SHORT[ability]}
              </p>
              {added > 0 ? (
                <p className={cn("text-[11px] font-black tabular-nums", visual ? "text-amber-400" : "text-primary")}>
                  <span className={cn("font-semibold", visual ? "text-white/70" : "text-foreground")}>
                    {current}
                  </span>
                  <span className="mx-0.5 text-[9px]">→</span>
                  {next}
                </p>
              ) : (
                <p
                  className={cn(
                    "text-[11px] font-black tabular-nums",
                    visual ? "text-white" : "text-foreground",
                  )}
                >
                  {current}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
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
  icon,
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
          ? "max-sm:grid-cols-1 max-sm:gap-3 sm:grid-cols-2"
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
        {hasCurrentScores(baseScores) ? (
          <div className="mt-3">
            <CurrentAbilityScores
              baseScores={baseScores}
              otherBonuses={otherBonuses}
              allocation={allocation}
              allowedAbilities={allowedAbilities}
            />
          </div>
        ) : null}
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
        {icon ? (
          <div className="pointer-events-none absolute right-3 top-3 text-amber-400/85" aria-hidden>
            <GameIcon name={icon} className="h-11 w-11" />
          </div>
        ) : null}
        <p className={cn("font-serif text-base font-black uppercase tracking-wide text-white", icon && "pr-14")}>{title}</p>
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
