"use client"

import { useState } from "react"
import { Dices } from "lucide-react"
import { useSheetRollHistory } from "@/components/character-sheet/sheet-roll-history-context"

type D20RollButtonProps = {
  modifier: number
  title?: string
  size?: "sm" | "md" | "lg"
  breakdown?: { label: string; value: number }[]
  onRoll?: () => void
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

export function D20RollButton({ modifier, title, size = "sm", breakdown, onRoll }: D20RollButtonProps) {
  const [result, setResult] = useState<{ natural: number; total: number } | null>(null)
  const history = useSheetRollHistory()

  const sizeClass =
    size === "lg"
      ? "h-11 min-w-11 px-2 text-sm gap-1.5"
      : size === "md"
        ? "h-9 min-w-9 px-2 text-sm gap-1.5"
        : "h-6 min-w-[2.25rem] px-1.5 text-xs gap-1"

  const modLabel = modifier >= 0 ? `+${modifier}` : `${modifier}`

  const formatSigned = (value: number) => (value >= 0 ? `+${value}` : `${value}`)
  const tooltip = (() => {
    const header = title ? `${title} (${modLabel} to hit)` : `Roll d20 ${modLabel}`
    const lines = (breakdown ?? []).filter((part) => part.value !== 0)
    if (!lines.length) return header
    return [
      header,
      ...lines.map((part) => `  ${part.label}: ${formatSigned(part.value)}`),
    ].join("\n")
  })()

  const handleRoll = () => {
    const rolled = rollD20(modifier)
    setResult(rolled)
    history?.logRoll({
      kind: "d20",
      label: title ?? `d20 ${modLabel}`,
      summary: `${rolled.natural}${modifier >= 0 ? ` + ${modifier}` : ` − ${Math.abs(modifier)}`} = ${rolled.total}${d20CriticalSuffix(rolled.natural)}`,
      natural: rolled.natural,
    })
    onRoll?.()
  }

  return (
    <button
      type="button"
      onClick={handleRoll}
      className={`inline-flex items-center justify-center rounded border border-border bg-muted/80 font-bold tabular-nums hover:bg-muted shrink-0 ${sizeClass}`}
      title={tooltip}
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
