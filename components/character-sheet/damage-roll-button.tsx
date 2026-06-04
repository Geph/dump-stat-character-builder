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
      className="flex items-center justify-center gap-1 h-6 min-w-[2.25rem] px-1.5 rounded border border-border bg-muted/80 text-xs font-bold tabular-nums hover:bg-muted shrink-0"
      title={expression ? `Roll damage (${expression})` : "Roll damage"}
    >
      {total != null ? (
        <span>{total}</span>
      ) : (
        <Dices className="w-3 h-3 text-muted-foreground" />
      )}
    </button>
  )
}
