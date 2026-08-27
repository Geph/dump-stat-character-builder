"use client"

import { D20NaturalsDisplay } from "@/components/character-sheet/d20-naturals-display"
import { isNat20OrNat1 } from "@/components/character-sheet/d20-roll-button"
import { useSheetRollHistory } from "@/components/character-sheet/sheet-roll-history-context"
import { formatRollTime } from "@/lib/character/sheet-roll-history"
import { cn } from "@/lib/utils"

function historyEquationTail(summary: string): string {
  const equation = summary.match(/ [+−] \d+ = .+$/)
  if (equation) return equation[0].trim()
  const outcome = summary.match(/ — .+$/)
  if (outcome) return outcome[0].trim()
  return summary
}

/** Session roll list for embedding in the manual dice overlay. */
export function SheetRollHistoryPanel() {
  const history = useSheetRollHistory()
  if (!history) return null

  const { entries } = history

  if (entries.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-xs text-muted-foreground">
        No rolls yet. Dice you roll on this sheet will appear here.
      </p>
    )
  }

  return (
    <ul className="space-y-1 p-2">
      {entries.map((entry) => {
        const dualDice =
          entry.naturals != null &&
          entry.naturals.length > 1 &&
          entry.natural != null
        return (
          <li
            key={entry.id}
            className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold leading-snug text-foreground">{entry.label}</p>
              <time
                className="shrink-0 text-[10px] tabular-nums text-muted-foreground"
                dateTime={new Date(entry.at).toISOString()}
              >
                {formatRollTime(entry.at)}
              </time>
            </div>
            <p
              className={cn(
                "mt-0.5 inline-flex flex-wrap items-baseline gap-1 text-xs font-bold tabular-nums",
                !dualDice &&
                  entry.natural != null &&
                  isNat20OrNat1(entry.natural)
                  ? "text-primary"
                  : "text-foreground",
              )}
            >
              {dualDice ? (
                <>
                  <D20NaturalsDisplay
                    chosen={entry.natural!}
                    naturals={entry.naturals!}
                  />
                  <span>
                    {historyEquationTail(entry.summary)}
                  </span>
                </>
              ) : (
                entry.summary
              )}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
