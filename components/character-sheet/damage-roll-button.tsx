"use client"

import { useState } from "react"
import { Dices } from "lucide-react"
import { parseDamageRoll, rollDamage } from "@/lib/dice/damage-roll"

export function DamageRollButton({ expression }: { expression: string }) {
  const [total, setTotal] = useState<number | null>(null)
  const parsed = parseDamageRoll(expression)

  if (!parsed) return null

  const handleRoll = () => {
    setTotal(rollDamage(parsed).total)
  }

  return (
    <button
      type="button"
      onClick={handleRoll}
      className="inline-flex items-center justify-center gap-1 h-6 min-w-[2.25rem] px-1.5 rounded border border-border bg-muted/80 text-xs font-bold tabular-nums hover:bg-muted shrink-0"
      title={expression ? `Roll damage (${expression})` : "Roll damage"}
      aria-label={expression ? `Roll damage (${expression})` : "Roll damage"}
    >
      <Dices className="w-3 h-3 text-muted-foreground shrink-0" aria-hidden />
      {total != null ? <span className="font-black text-primary">{total}</span> : null}
    </button>
  )
}
