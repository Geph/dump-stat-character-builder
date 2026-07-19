"use client"

import { motion } from "framer-motion"
import { GameIcon } from "@/components/game-icon-picker"
import { BUILDER_ABILITY_NAMES } from "@/lib/builder/builder-constants"
import { cn } from "@/lib/utils"

type AbilityName = (typeof BUILDER_ABILITY_NAMES)[number]

export type AbilityScoreMethod = "pointbuy" | "standard" | "roll" | "custom"

export const ABILITY_GAME_ICONS: Record<AbilityName, string> = {
  strength: "muscle-up",
  dexterity: "dodge",
  constitution: "heart-plus",
  intelligence: "brain",
  wisdom: "third-eye",
  charisma: "charm",
}

const ABILITY_TAGLINES: Record<AbilityName, string> = {
  strength: "Raw might & melee power",
  dexterity: "Agility, reflexes & stealth",
  constitution: "Endurance & vitality",
  intelligence: "Reason, memory & lore",
  wisdom: "Perception & willpower",
  charisma: "Presence & force of will",
}

/** Static per-ability accent classes (Tailwind requires literal class names). */
const ABILITY_THEME: Record<
  AbilityName,
  {
    text: string
    iconRing: string
    barFrom: string
    barTo: string
    glow: string
    cardBorder: string
    chipSelected: string
  }
> = {
  strength: {
    text: "text-red-400",
    iconRing: "border-red-500/60 bg-red-950/60",
    barFrom: "from-red-600",
    barTo: "to-red-400",
    glow: "shadow-[0_0_18px_rgba(239,68,68,0.35)]",
    cardBorder: "hover:border-red-500/60",
    chipSelected: "bg-red-500 text-white",
  },
  dexterity: {
    text: "text-emerald-400",
    iconRing: "border-emerald-500/60 bg-emerald-950/60",
    barFrom: "from-emerald-600",
    barTo: "to-emerald-400",
    glow: "shadow-[0_0_18px_rgba(16,185,129,0.35)]",
    cardBorder: "hover:border-emerald-500/60",
    chipSelected: "bg-emerald-500 text-white",
  },
  constitution: {
    text: "text-amber-400",
    iconRing: "border-amber-500/60 bg-amber-950/60",
    barFrom: "from-amber-600",
    barTo: "to-amber-400",
    glow: "shadow-[0_0_18px_rgba(245,158,11,0.35)]",
    cardBorder: "hover:border-amber-500/60",
    chipSelected: "bg-amber-500 text-black",
  },
  intelligence: {
    text: "text-sky-400",
    iconRing: "border-sky-500/60 bg-sky-950/60",
    barFrom: "from-sky-600",
    barTo: "to-sky-400",
    glow: "shadow-[0_0_18px_rgba(14,165,233,0.35)]",
    cardBorder: "hover:border-sky-500/60",
    chipSelected: "bg-sky-500 text-white",
  },
  wisdom: {
    text: "text-violet-400",
    iconRing: "border-violet-500/60 bg-violet-950/60",
    barFrom: "from-violet-600",
    barTo: "to-violet-400",
    glow: "shadow-[0_0_18px_rgba(139,92,246,0.35)]",
    cardBorder: "hover:border-violet-500/60",
    chipSelected: "bg-violet-500 text-white",
  },
  charisma: {
    text: "text-fuchsia-400",
    iconRing: "border-fuchsia-500/60 bg-fuchsia-950/60",
    barFrom: "from-fuchsia-600",
    barTo: "to-fuchsia-400",
    glow: "shadow-[0_0_18px_rgba(217,70,239,0.35)]",
    cardBorder: "hover:border-fuchsia-500/60",
    chipSelected: "bg-fuchsia-500 text-white",
  },
}

const BAR_SEGMENTS = 20

type AbilityScoreCardsProps = {
  method: AbilityScoreMethod
  scores: Record<AbilityName, number>
  standardAssignments: Partial<Record<AbilityName, number>>
  standardArray: readonly number[]
  getModifierLabel: (score: number) => string
  onAdjust: (ability: AbilityName, delta: number) => void
  onSetCustom: (ability: AbilityName, raw: string) => void
  onAssignStandard: (ability: AbilityName, value: number) => void
  isStandardValueUsedElsewhere: (ability: AbilityName, value: number) => boolean
}

export function AbilityScoreCards({
  method,
  scores,
  standardAssignments,
  standardArray,
  getModifierLabel,
  onAdjust,
  onSetCustom,
  onAssignStandard,
  isStandardValueUsedElsewhere,
}: AbilityScoreCardsProps) {
  return (
    <div className="grid grid-cols-1 max-sm:gap-4 sm:grid-cols-2 gap-4">
      {BUILDER_ABILITY_NAMES.map((ability, index) => {
        const theme = ABILITY_THEME[ability]
        const assigned = method === "standard" ? standardAssignments[ability] ?? null : scores[ability]
        const displayScore = assigned
        const filled =
          displayScore == null ? 0 : Math.max(0, Math.min(BAR_SEGMENTS, displayScore))
        const modifierLabel = displayScore == null ? "—" : getModifierLabel(displayScore)

        return (
          <motion.div
            key={ability}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.25 }}
            className={cn(
              "relative overflow-hidden rounded-xl border-2 border-border bg-gradient-to-b from-black via-zinc-950 to-black p-4 transition-colors max-sm:p-5",
              theme.cardBorder,
            )}
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.45)" }}
          >
            {/* Faint oversized watermark icon */}
            <div className="pointer-events-none absolute -right-4 -bottom-6 opacity-[0.07]">
              <GameIcon name={ABILITY_GAME_ICONS[ability]} className="h-32 w-32 text-white" />
            </div>

            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 backdrop-blur-sm",
                    theme.iconRing,
                    theme.glow,
                  )}
                >
                  <GameIcon name={ABILITY_GAME_ICONS[ability]} className={cn("h-7 w-7", theme.text)} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif text-base font-black uppercase tracking-wide text-white leading-tight">
                    {ability}
                  </h3>
                  <p className="text-[10px] uppercase tracking-wider text-white/45 truncate">
                    {ABILITY_TAGLINES[ability]}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                {method === "custom" ? (
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={scores[ability]}
                    onChange={(e) => onSetCustom(ability, e.target.value)}
                    className="w-16 rounded-lg border-2 border-white/15 bg-black/60 px-1 py-0.5 text-center text-2xl font-black text-white focus:border-primary focus:outline-none"
                  />
                ) : (
                  <span className="text-3xl font-black text-white tabular-nums">
                    {displayScore ?? "—"}
                  </span>
                )}
                <p className={cn("text-sm font-bold", theme.text)}>{modifierLabel}</p>
              </div>
            </div>

            {/* Segmented stat bar */}
            <div className="relative mt-3 flex gap-[3px]" aria-hidden>
              {Array.from({ length: BAR_SEGMENTS }, (_, i) => {
                const isFilled = i < filled
                const isMilestone = (i + 1) % 5 === 0
                return (
                  <motion.span
                    key={i}
                    initial={false}
                    animate={{ opacity: isFilled ? 1 : 0.18, scaleY: isFilled ? 1 : 0.7 }}
                    transition={{ delay: isFilled ? i * 0.012 : 0, duration: 0.18 }}
                    className={cn(
                      "h-2.5 flex-1 rounded-[2px] origin-bottom",
                      isFilled
                        ? cn("bg-gradient-to-t", theme.barFrom, theme.barTo)
                        : "bg-white/25",
                      isMilestone && "mr-[3px]",
                    )}
                  />
                )
              })}
            </div>
            <div className="mt-0.5 flex justify-between text-[8px] font-bold uppercase tracking-wider text-white/30">
              <span>0</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>20</span>
            </div>

            {/* Method-specific controls */}
            {method === "pointbuy" && (
              <div className="relative mt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onAdjust(ability, -1)}
                  disabled={scores[ability] <= 8}
                  className="h-9 w-9 rounded-lg border border-white/15 bg-white/10 text-lg font-black text-white transition-colors hover:bg-white/20 disabled:opacity-25 max-sm:h-11 max-sm:w-11 max-sm:text-xl"
                  aria-label={`Decrease ${ability}`}
                >
                  −
                </button>
                <span className="w-10 text-center text-xl font-black text-white tabular-nums">
                  {scores[ability]}
                </span>
                <button
                  type="button"
                  onClick={() => onAdjust(ability, 1)}
                  disabled={scores[ability] >= 15}
                  className="h-9 w-9 rounded-lg border border-white/15 bg-white/10 text-lg font-black text-white transition-colors hover:bg-white/20 disabled:opacity-25 max-sm:h-11 max-sm:w-11 max-sm:text-xl"
                  aria-label={`Increase ${ability}`}
                >
                  +
                </button>
              </div>
            )}

            {method === "standard" && (
              <div className="relative mt-3 grid grid-cols-3 gap-1.5 justify-items-center">
                {standardArray.map((value) => {
                  const selectedHere = standardAssignments[ability] === value
                  const usedElsewhere = isStandardValueUsedElsewhere(ability, value)
                  const disabled = usedElsewhere && !selectedHere
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={disabled}
                      aria-pressed={selectedHere}
                      onClick={() => onAssignStandard(ability, value)}
                      className={cn(
                        "min-w-[2.25rem] rounded-lg px-2 py-1 text-sm font-bold transition-colors",
                        selectedHere
                          ? cn(theme.chipSelected, theme.glow)
                          : disabled
                            ? "cursor-not-allowed bg-white/5 text-white/20"
                            : "bg-white/10 text-white hover:bg-white/20",
                      )}
                    >
                      {value}
                    </button>
                  )
                })}
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
