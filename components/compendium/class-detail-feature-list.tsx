import type { ClassDetailFeatureRow } from "@/lib/builder/class-detail-features"
import { cn } from "@/lib/utils"

export function ClassDetailFeatureList({
  features,
  levelLabel,
  accentClassName = "text-primary",
}: {
  features: ClassDetailFeatureRow[]
  levelLabel?: string
  accentClassName?: string
}) {
  if (!features.length) return null

  return (
    <div>
      {levelLabel ? (
        <p className="text-[9px] font-bold uppercase tracking-widest text-white/45">{levelLabel}</p>
      ) : null}
      <ul className={levelLabel ? "mt-0.5 space-y-1" : "space-y-1"}>
        {features.map((feature) => (
          <li key={`${feature.level}-${feature.name}`} className="min-w-0">
            <p
              className={cn(
                "text-[11px] font-semibold leading-tight",
                feature.resourceRelated ? accentClassName : "text-white/90",
              )}
            >
              {feature.name}
              {feature.resourceRelated ? (
                <span className="ml-1 text-[9px] font-bold uppercase tracking-wide opacity-75">
                  Resource
                </span>
              ) : null}
            </p>
            {feature.summary ? (
              <p className="text-[10px] leading-snug text-white/60 line-clamp-1">{feature.summary}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
