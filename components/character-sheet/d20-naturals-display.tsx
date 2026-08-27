import { cn } from "@/lib/utils"

type D20NaturalsDisplayProps = {
  naturals: number[]
  chosen: number
  /** Contrast for filled combat tiles (white text). */
  filled?: boolean
  className?: string
}

/**
 * Shows every d20 face from an adv/dis roll. The kept die is emphasized; the discarded
 * one stays visible but quieter so both results are on the sheet and in history.
 */
export function D20NaturalsDisplay({
  naturals,
  chosen,
  filled = false,
  className,
}: D20NaturalsDisplayProps) {
  if (naturals.length === 0) return null

  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={
        naturals.length > 1
          ? `Rolled ${naturals.join(" and ")}, kept ${chosen}`
          : `Rolled ${chosen}`
      }
    >
      {naturals.map((natural, index) => {
        const kept = natural === chosen
        return (
          <span
            key={`${index}-${natural}`}
            className={cn(
              "inline-flex min-w-[1.15em] items-center justify-center rounded px-0.5 tabular-nums leading-none",
              kept
                ? filled
                  ? "bg-white/25 font-black text-white"
                  : "bg-primary/15 font-black text-primary"
                : filled
                  ? "font-medium text-white/45"
                  : "font-medium text-muted-foreground",
            )}
          >
            {natural}
            {kept && (natural === 20 || natural === 1) ? (
              <span className={filled ? "text-white" : "text-primary"} aria-hidden>
                !!
              </span>
            ) : null}
          </span>
        )
      })}
    </span>
  )
}
