"use client"

import { useState } from "react"
import {
  ABILITY_ABBREVIATIONS,
  ABILITY_ORDER,
  type SkillAbility,
} from "@/lib/compendium/skills"
import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import { cn } from "@/lib/utils"

export function SkillAbilityLabel({
  skillName,
  defaultAbility,
  currentAbility,
  enabled,
  onSelect,
}: {
  skillName: string
  defaultAbility: AbilityScoreKey
  currentAbility: AbilityScoreKey
  enabled: boolean
  onSelect: (ability: AbilityScoreKey | null) => void
}) {
  const [open, setOpen] = useState(false)
  const abbr = ABILITY_ABBREVIATIONS[currentAbility as SkillAbility] ?? currentAbility.slice(0, 3).toUpperCase()
  const overridden = currentAbility !== defaultAbility

  if (!enabled) {
    return <span className="text-muted-foreground">({abbr})</span>
  }

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Change ability for ${skillName}, currently ${abbr}`}
        title="Change skill ability"
        className={cn(
          "rounded px-0.5 font-semibold underline decoration-dotted underline-offset-2 hover:text-primary",
          overridden ? "text-primary" : "text-muted-foreground",
        )}
      >
        ({abbr})
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-[99]" aria-hidden onClick={() => setOpen(false)} />
          <div
            role="listbox"
            aria-label={`Ability for ${skillName}`}
            className="absolute left-0 top-full z-[100] mt-1 grid grid-cols-3 gap-1 rounded-lg border border-border bg-card p-1.5 shadow-xl"
          >
            {ABILITY_ORDER.map((ability) => {
              const selected = ability === currentAbility
              return (
                <button
                  key={ability}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onSelect(ability === defaultAbility ? null : ability)
                    setOpen(false)
                  }}
                  className={cn(
                    "min-w-9 rounded-md border px-1.5 py-1 text-[10px] font-bold tabular-nums",
                    selected
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {ABILITY_ABBREVIATIONS[ability]}
                </button>
              )
            })}
          </div>
        </>
      ) : null}
    </span>
  )
}
