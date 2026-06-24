import {
  formatModifierWiringRegistryCoverage,
  getModifierWiringRegistryCoverage,
} from "@/lib/import/modifier-wiring-registry"
import { BookOpenCheck } from "lucide-react"

type Props = {
  className?: string
}

export function ModifierWiringRegistryCoverageLine({ className = "" }: Props) {
  const coverage = getModifierWiringRegistryCoverage()
  const summary = formatModifierWiringRegistryCoverage(coverage)

  return (
    <p
      className={`flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground ${className}`}
      title={`${coverage.mechanicsKinds} mechanics[] kinds · ${coverage.srdPresetNames} SRD preset names · ${coverage.homebrewPatterns} homebrew patterns in BYO prompt`}
    >
      <BookOpenCheck
        className={`h-3.5 w-3.5 shrink-0 ${coverage.isComplete ? "text-success" : "text-amber-600 dark:text-amber-400"}`}
        aria-hidden
      />
      <span className={coverage.isComplete ? "" : "text-amber-700 dark:text-amber-300"}>{summary}</span>
      {!coverage.isComplete ? (
        <span className="text-amber-700 dark:text-amber-300">(registry out of sync — update modifier-wiring-registry.ts)</span>
      ) : null}
    </p>
  )
}
