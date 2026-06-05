"use client"

import { useState } from "react"
import { Dices } from "lucide-react"

type D20RollButtonProps = {
  modifier: number
  title?: string
  size?: "sm" | "md"
}

export function rollD20(modifier: number): { natural: number; total: number } {
  const natural = 1 + Math.floor(Math.random() * 20)
  return { natural, total: natural + modifier }
}

export function isNat20OrNat1(natural: number): boolean {
  return natural === 20 || natural === 1
}

export function d20CriticalSuffix(natural: number): string {
  return isNat20OrNat1(natural) ? " !!" : ""
}

function RollDiceIcon({ className = "w-3 h-3" }: { className?: string }) {
  return <Dices className={`${className} text-muted-foreground shrink-0`} aria-hidden />
}

export function D20RollButton({ modifier, title, size = "sm" }: D20RollButtonProps) {
  const [result, setResult] = useState<{ natural: number; total: number } | null>(null)

  const sizeClass =
    size === "md"
      ? "h-7 min-w-[2.75rem] px-2 text-sm gap-1.5"
      : "h-6 min-w-[2.25rem] px-1.5 text-xs gap-1"

  const modLabel = modifier >= 0 ? `+${modifier}` : `${modifier}`

  return (
    <button
      type="button"
      onClick={() => setResult(rollD20(modifier))}
      className={`inline-flex items-center justify-center rounded border border-border bg-muted/80 font-bold tabular-nums hover:bg-muted shrink-0 ${sizeClass}`}
      title={title ?? `Roll d20 ${modLabel}`}
      aria-label={title ?? `Roll d20 ${modLabel}`}
    >
      <RollDiceIcon />
      {result != null ? (
        <span className="font-medium">
          {result.natural}
          <span className="text-muted-foreground">=</span>
          <span className="font-black text-primary">{result.total}</span>
          {isNat20OrNat1(result.natural) ? (
            <span className="text-primary" aria-label="Natural 20 or natural 1">
              !!
            </span>
          ) : null}
        </span>
      ) : null}
    </button>
  )
}
