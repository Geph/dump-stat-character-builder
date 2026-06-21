"use client"

import { RotateCcw } from "lucide-react"

type DeathSaveState = {
  successes: number
  failures: number
}

type CombatConditionTrackersProps = {
  inspiration: boolean
  onInspirationChange: (value: boolean) => void
  deathSaves: DeathSaveState
  onDeathSavesChange: (next: DeathSaveState) => void
}

function DeathSaveDots({
  label,
  count,
  tone,
  onToggle,
}: {
  label: string
  count: number
  tone: "success" | "failure"
  onToggle: (index: number) => void
}) {
  const activeClass =
    tone === "success"
      ? "border-emerald-500 bg-emerald-500"
      : "border-destructive bg-destructive"

  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">{label}</p>
      <div className="flex gap-1">
        {Array.from({ length: 3 }, (_, index) => {
          const active = index < count
          return (
            <button
              key={index}
              type="button"
              onClick={() => onToggle(index)}
              className={`h-4 w-4 rounded-full border ${
                active ? activeClass : "border-border bg-background hover:border-muted-foreground"
              }`}
              aria-label={`${label} ${index + 1}${active ? " marked" : ""}`}
            />
          )
        })}
      </div>
    </div>
  )
}

export function CombatConditionTrackers({
  inspiration,
  onInspirationChange,
  deathSaves,
  onDeathSavesChange,
}: CombatConditionTrackersProps) {
  const toggleSuccess = (index: number) => {
    const active = index < deathSaves.successes
    onDeathSavesChange({
      ...deathSaves,
      successes: active ? index : index + 1,
    })
  }

  const toggleFailure = (index: number) => {
    const active = index < deathSaves.failures
    onDeathSavesChange({
      ...deathSaves,
      failures: active ? index : index + 1,
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/25 px-2.5 py-2">
        <div>
          <p className="text-xs font-bold text-foreground">Heroic Inspiration</p>
          <p className="text-[10px] text-muted-foreground">Toggle when awarded or spent</p>
        </div>
        <button
          type="button"
          onClick={() => onInspirationChange(!inspiration)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
            inspiration
              ? "bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40"
              : "bg-muted text-muted-foreground border border-border"
          }`}
        >
          {inspiration ? "Active" : "None"}
        </button>
      </div>

      <div className="rounded-lg border border-border/70 bg-muted/25 p-2.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs font-bold text-foreground">Death Saves</p>
          <button
            type="button"
            onClick={() => onDeathSavesChange({ successes: 0, failures: 0 })}
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3 h-3" />
            Clear
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DeathSaveDots
            label="Successes"
            count={deathSaves.successes}
            tone="success"
            onToggle={toggleSuccess}
          />
          <DeathSaveDots
            label="Failures"
            count={deathSaves.failures}
            tone="failure"
            onToggle={toggleFailure}
          />
        </div>
      </div>
    </div>
  )
}
