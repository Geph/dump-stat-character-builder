import { compendiumCardBlurb } from "@/lib/compendium/card-image"
import {
  portraitDetailSummary,
  portraitDetailTitle,
} from "@/lib/compendium/portrait-detail-typography"
import type { Trait } from "@/lib/types"
import { cn } from "@/lib/utils"

export function SpeciesDetailTraitList({
  traits,
  comfortableFromMd = false,
}: {
  traits: Trait[]
  comfortableFromMd?: boolean
}) {
  if (!traits.length) return null

  const titleClass = comfortableFromMd ? portraitDetailTitle : "text-[11px] font-semibold leading-tight text-white/90"
  const summaryClass = comfortableFromMd
    ? portraitDetailSummary
    : "text-[10px] leading-snug text-white/60 line-clamp-2"

  return (
    <ul className="space-y-2">
      {traits.map((trait) => (
        <li key={trait.name} className="min-w-0">
          <p className={titleClass}>{trait.name}</p>
          {trait.description ? (
            <p className={cn(summaryClass, !comfortableFromMd && "line-clamp-2")}>
              {compendiumCardBlurb(trait.description)}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

export function splitSpeciesTraits(traits: Trait[]): [Trait[], Trait[]] {
  if (!traits.length) return [[], []]
  const mid = Math.ceil(traits.length / 2)
  return [traits.slice(0, mid), traits.slice(mid)]
}
