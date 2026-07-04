"use client"

import { useState } from "react"
import {
  applyCompanionAttackRedirect,
  formatCompanionRedirectSummary,
} from "@/lib/character/companion-redirect"

type CompanionAttackRedirectProps = {
  companionName: string
  companionCurrentHp: number
  onApply: (nextCompanionHp: number, overflowToOwner: number) => void
}

/** Astral Guardian — redirect incoming attack damage to a companion with overflow. */
export function CompanionAttackRedirect({
  companionName,
  companionCurrentHp,
  onApply,
}: CompanionAttackRedirectProps) {
  const [damageInput, setDamageInput] = useState("10")
  const [lastSummary, setLastSummary] = useState<string | null>(null)

  const apply = () => {
    const incomingDamage = Math.max(0, parseInt(damageInput, 10) || 0)
    const result = applyCompanionAttackRedirect({ incomingDamage, companionCurrentHp })
    setLastSummary(formatCompanionRedirectSummary(result))
    onApply(result.companionHpAfter, result.overflowToOwner)
  }

  return (
    <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 space-y-2">
      <p className="text-xs font-bold text-violet-800 dark:text-violet-200">
        Redirect attack to {companionName}
      </p>
      <p className="text-[10px] text-muted-foreground">
        Reaction: spend 1 psi point (track manually). Overflow damage returns to you.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs flex flex-col gap-1">
          <span className="font-semibold text-muted-foreground">Incoming damage</span>
          <input
            type="number"
            min={0}
            value={damageInput}
            onChange={(e) => setDamageInput(e.target.value)}
            className="w-24 rounded-md border border-border bg-background px-2 py-1 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={apply}
          className="min-h-9 rounded-lg border border-violet-500/40 bg-violet-500/15 px-3 text-xs font-semibold text-violet-900 dark:text-violet-100"
        >
          Apply redirect
        </button>
      </div>
      {lastSummary ? (
        <p className="text-[10px] text-muted-foreground tabular-nums">{lastSummary}</p>
      ) : null}
    </div>
  )
}
