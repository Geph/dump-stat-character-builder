"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react"
import { GameIcon } from "@/components/game-icon-picker"
import { ClassLevelInput } from "@/components/builder/class-level-input"
import { cn } from "@/lib/utils"

const LEVEL_SEGMENTS = 20

type ClassLevelRowProps = {
  classNameLabel: string
  icon?: string | null
  level: number
  min?: number
  max: number
  isPrimary: boolean
  canIncrease: boolean
  variant?: "default" | "visual"
  onDecrease: () => void
  onIncrease: () => void
  onCommitLevel: (level: number) => void
  onRemove: () => void
}

export function ClassLevelRow({
  classNameLabel,
  icon,
  level,
  min = 1,
  max,
  isPrimary,
  canIncrease,
  variant = "default",
  onDecrease,
  onIncrease,
  onCommitLevel,
  onRemove,
}: ClassLevelRowProps) {
  if (variant === "visual") {
    return (
      <VisualClassLevelRow
        classNameLabel={classNameLabel}
        icon={icon}
        level={level}
        min={min}
        max={max}
        isPrimary={isPrimary}
        canIncrease={canIncrease}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
        onCommitLevel={onCommitLevel}
        onRemove={onRemove}
      />
    )
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg p-2 max-sm:min-h-[6rem] max-sm:flex-col max-sm:items-center max-sm:justify-center max-sm:gap-3.5 max-sm:px-4 max-sm:py-4",
        isPrimary ? "bg-primary/10 border border-primary/40" : "bg-card border border-border",
      )}
    >
      <div className="flex-1 min-w-0 max-sm:flex-none max-sm:text-center">
        <span className="font-bold text-sm max-sm:text-lg text-foreground">{classNameLabel}</span>
        {isPrimary && (
          <span className="ml-2 text-[10px] max-sm:text-xs font-bold uppercase tracking-wide text-primary max-sm:ml-0 max-sm:mt-1 max-sm:block">
            Primary
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 max-sm:gap-3">
        <button
          type="button"
          onClick={onDecrease}
          className="p-1 max-sm:p-3.5 bg-muted hover:bg-destructive/20 rounded max-sm:rounded-xl"
          aria-label={`Decrease ${classNameLabel} level`}
        >
          <Minus className="w-3 h-3 max-sm:w-6 max-sm:h-6" />
        </button>
        <ClassLevelInput
          value={level}
          min={min}
          max={max}
          aria-label={`${classNameLabel} level`}
          onCommit={onCommitLevel}
          className="w-8 max-sm:w-14 text-center font-bold text-sm max-sm:text-xl bg-background border border-border rounded max-sm:rounded-xl px-0.5 py-0.5 max-sm:py-2.5 focus:outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={onIncrease}
          disabled={!canIncrease}
          className="p-1 max-sm:p-3.5 bg-muted hover:bg-primary/20 rounded max-sm:rounded-xl disabled:opacity-30"
          aria-label={`Increase ${classNameLabel} level`}
        >
          <Plus className="w-3 h-3 max-sm:w-6 max-sm:h-6" />
        </button>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 text-muted-foreground hover:text-destructive max-sm:p-3"
        aria-label={`Remove ${classNameLabel}`}
      >
        <X className="w-3 h-3 max-sm:w-5 max-sm:h-5" />
      </button>
    </div>
  )
}

function VisualClassLevelRow({
  classNameLabel,
  icon,
  level,
  min = 1,
  max,
  isPrimary,
  canIncrease,
  onDecrease,
  onIncrease,
  onCommitLevel,
  onRemove,
}: Omit<ClassLevelRowProps, "variant">) {
  const [prevLevel, setPrevLevel] = useState(level)
  const direction = level >= prevLevel ? 1 : -1

  useEffect(() => {
    if (level !== prevLevel) setPrevLevel(level)
  }, [level, prevLevel])

  const filled = Math.max(0, Math.min(LEVEL_SEGMENTS, level))

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-xl border-2 bg-gradient-to-b from-black via-zinc-950 to-black p-2.5 transition-colors max-sm:p-3",
        isPrimary
          ? "border-amber-500/55 hover:border-amber-400/70"
          : "border-border hover:border-white/25",
      )}
      style={{
        boxShadow: isPrimary
          ? "inset 0 0 0 1px rgba(245,158,11,0.12), 0 8px 28px rgba(0,0,0,0.5), 0 0 24px rgba(245,158,11,0.12)"
          : "inset 0 0 0 1px rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.45)",
      }}
    >
      {icon ? (
        <div className="pointer-events-none absolute -right-3 -bottom-5 opacity-[0.08]">
          <GameIcon name={icon} className="h-28 w-28 text-white" />
        </div>
      ) : null}

      <div className="relative flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch max-sm:gap-2.5">
        <div className="min-w-0 flex-1 max-sm:text-center">
          <div className="flex items-center gap-2.5 max-sm:justify-center">
            {icon ? (
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 backdrop-blur-sm max-sm:h-10 max-sm:w-10",
                  isPrimary
                    ? "border-amber-500/60 bg-amber-950/60 shadow-[0_0_16px_rgba(245,158,11,0.3)]"
                    : "border-white/20 bg-white/5",
                )}
              >
                <GameIcon
                  name={icon}
                  className={cn("h-4 w-4 max-sm:h-5 max-sm:w-5", isPrimary ? "text-amber-400" : "text-white/80")}
                />
              </div>
            ) : null}
            <div className="min-w-0">
              <h3 className="font-serif text-base font-black uppercase tracking-wide text-white leading-tight max-sm:text-lg">
                {classNameLabel}
              </h3>
              <p
                className={cn(
                  "mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em]",
                  isPrimary ? "text-amber-400" : "text-white/40",
                )}
              >
                {isPrimary ? "Primary class" : "Multiclass"}
              </p>
            </div>
          </div>
        </div>

        {/* Horizontal level ticker */}
        <div className="flex shrink-0 items-center gap-2 max-sm:justify-center max-sm:gap-3">
          <span className="hidden text-[9px] font-bold uppercase tracking-[0.18em] text-white/35 sm:inline">
            Level
          </span>
          <div
            className="relative flex items-center overflow-hidden rounded-xl border border-white/15 bg-black/70 shadow-[inset_0_2px_12px_rgba(0,0,0,0.65)]"
            aria-live="polite"
          >
            <button
              type="button"
              onClick={onDecrease}
              className="flex h-10 w-9 items-center justify-center text-white/70 transition-colors hover:bg-white/10 hover:text-amber-300 max-sm:h-12 max-sm:w-12"
              aria-label={`Decrease ${classNameLabel} level`}
            >
              <ChevronLeft className="h-4 w-4 max-sm:h-6 max-sm:w-6" strokeWidth={2.5} />
            </button>

            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden border-x border-white/10 max-sm:h-12 max-sm:w-14">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-2 bg-gradient-to-r from-black/80 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-2 bg-gradient-to-l from-black/80 to-transparent" />
              <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                <motion.span
                  key={level}
                  custom={direction}
                  initial={{ x: direction * 22, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: direction * -22, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className="absolute inset-0 flex items-center justify-center font-black tabular-nums text-amber-400 text-xl max-sm:text-3xl"
                >
                  {level}
                </motion.span>
              </AnimatePresence>
              <ClassLevelInput
                value={level}
                min={min}
                max={max}
                aria-label={`${classNameLabel} level`}
                onCommit={onCommitLevel}
                className="absolute inset-0 z-[2] cursor-text bg-transparent text-center text-[0] text-transparent caret-amber-400 outline-none focus:bg-black/50 focus:text-xl focus:font-black focus:text-amber-400 focus:caret-auto max-sm:focus:text-3xl"
              />
            </div>

            <button
              type="button"
              onClick={onIncrease}
              disabled={!canIncrease || level >= max}
              className="flex h-10 w-9 items-center justify-center text-white/70 transition-colors hover:bg-white/10 hover:text-amber-300 disabled:opacity-25 max-sm:h-12 max-sm:w-12"
              aria-label={`Increase ${classNameLabel} level`}
            >
              <ChevronRight className="h-4 w-4 max-sm:h-6 max-sm:w-6" strokeWidth={2.5} />
            </button>
          </div>

          <button
            type="button"
            onClick={onRemove}
            className="hidden rounded-lg border border-white/10 bg-white/5 p-2 text-white/45 transition-colors hover:border-destructive/40 hover:bg-destructive/15 hover:text-destructive sm:inline-flex"
            aria-label={`Remove ${classNameLabel}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* XP-style level bar */}
      <div className="relative mt-2.5 flex gap-[2px] max-sm:mt-3" aria-hidden>
        {Array.from({ length: LEVEL_SEGMENTS }, (_, i) => {
          const isFilled = i < filled
          const isMilestone = (i + 1) % 5 === 0
          return (
            <motion.span
              key={i}
              initial={false}
              animate={{ opacity: isFilled ? 1 : 0.16, scaleY: isFilled ? 1 : 0.65 }}
              transition={{ delay: isFilled ? i * 0.01 : 0, duration: 0.16 }}
              className={cn(
                "h-1.5 flex-1 origin-bottom rounded-[2px] max-sm:h-2",
                isFilled
                  ? isPrimary
                    ? "bg-gradient-to-t from-amber-700 to-amber-400"
                    : "bg-gradient-to-t from-primary/80 to-primary"
                  : "bg-white/20",
                isMilestone && "mr-[2px]",
              )}
            />
          )
        })}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 sm:hidden">
        <p className="text-[9px] font-bold uppercase tracking-wider text-white/30 max-sm:text-[10px]">
          Level {level}
          <span className="text-white/20"> / 20</span>
        </p>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/45 transition-colors hover:border-destructive/40 hover:bg-destructive/15 hover:text-destructive max-sm:min-h-11 max-sm:px-4 max-sm:text-xs"
          aria-label={`Remove ${classNameLabel}`}
        >
          <X className="h-3.5 w-3.5 max-sm:h-4 max-sm:w-4" />
          Remove
        </button>
      </div>
    </motion.div>
  )
}
