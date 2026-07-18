import type { ClassDetailFeatureRow } from "@/lib/builder/class-detail-features"
import {
  portraitDetailBadge,
  portraitDetailSummary,
  portraitDetailTitle,
} from "@/lib/compendium/portrait-detail-typography"
import { cn } from "@/lib/utils"

export function ClassDetailFeatureList({
  features,
  levelLabel,
  accentClassName = "text-primary",
  comfortableFromMd = false,
  /** When false, omit summary blurbs (titles + level only). */
  showSummary = true,
  /** Prefix each row with its unlock level. */
  showLevel = false,
}: {
  features: ClassDetailFeatureRow[]
  levelLabel?: string
  accentClassName?: string
  comfortableFromMd?: boolean
  showSummary?: boolean
  showLevel?: boolean
}) {
  if (!features.length) return null

  const levelClass = comfortableFromMd
    ? portraitDetailBadge
    : "text-[9px] font-bold uppercase tracking-widest text-white/45"
  const titleClass = comfortableFromMd ? portraitDetailTitle : "text-[11px] font-semibold leading-tight"
  const badgeClass = comfortableFromMd
    ? portraitDetailBadge
    : "text-[9px] font-bold uppercase tracking-wide opacity-75"
  const summaryClass = comfortableFromMd ? portraitDetailSummary : "text-[10px] leading-snug text-white/60 line-clamp-1"

  return (
    <div>
      {levelLabel ? (
        <p className={levelClass}>{levelLabel}</p>
      ) : null}
      <ul className={levelLabel ? "mt-0.5 space-y-2" : "space-y-2"}>
        {features.map((feature) => (
          <li key={`${feature.level}-${feature.name}`} className="min-w-0">
            <p
              className={cn(
                titleClass,
                feature.resourceRelated ? accentClassName : "text-white/90",
              )}
            >
              {showLevel ? (
                <span className={cn("mr-1.5", badgeClass, "text-white/45")}>L{feature.level}</span>
              ) : null}
              {feature.name}
              {feature.resourceRelated ? (
                <span className={cn("ml-1", badgeClass)}>
                  Resource
                </span>
              ) : null}
            </p>
            {showSummary && feature.summary ? (
              <p className={cn(summaryClass, !comfortableFromMd && "line-clamp-1")}>{feature.summary}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
