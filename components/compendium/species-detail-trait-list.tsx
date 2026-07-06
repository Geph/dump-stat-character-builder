import { compendiumCardBlurb } from "@/lib/compendium/card-image"
import type { Trait } from "@/lib/types"

export function SpeciesDetailTraitList({ traits }: { traits: Trait[] }) {
  if (!traits.length) return null

  return (
    <ul className="space-y-1">
      {traits.map((trait) => (
        <li key={trait.name} className="min-w-0">
          <p className="text-[11px] font-semibold leading-tight text-white/90">{trait.name}</p>
          {trait.description ? (
            <p className="text-[10px] leading-snug text-white/60 line-clamp-2">
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
