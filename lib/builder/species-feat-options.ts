import { grantFeatsFromLinkedModifiers, type ResolvedGrantFeat } from "@/lib/compendium/grant-feat-catalog"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { Species } from "@/lib/types"

export type SpeciesFeatPickSlot = {
  key: string
  label: string
  featCategories: string[]
}

function pushGrantSlots(
  grants: ResolvedGrantFeat[],
  keyPrefix: string,
  labelPrefix: string,
  slots: SpeciesFeatPickSlot[],
): void {
  grants.forEach((grant, grantIndex) => {
    const baseKey =
      grants.length === 1
        ? keyPrefix
        : `${keyPrefix}:${grant.catalogEntryId}:${grantIndex}`

    for (let n = 0; n < grant.count; n++) {
      const slotKey = grant.count === 1 ? baseKey : `${baseKey}:${n}`
      const grantLabel =
        grant.count === 1 ? grant.label : `${grant.label} (${n + 1}/${grant.count})`
      slots.push({
        key: slotKey,
        label: labelPrefix ? `${labelPrefix}: ${grantLabel}` : grantLabel,
        featCategories: grant.featCategories,
      })
    }
  })
}

/** Feat pick slots granted by species-wide or trait linked modifiers (e.g. Human Versatile origin feat). */
export function getSpeciesFeatPickSlots(
  species: Species | undefined,
  speciesTraitPicks: Record<string, string[]>,
  catalog: ModifierCatalogEntry[],
): SpeciesFeatPickSlot[] {
  if (!species) return []

  const slots: SpeciesFeatPickSlot[] = []

  pushGrantSlots(
    grantFeatsFromLinkedModifiers(catalog, species.linkedModifiers, species.modifierRefs),
    `species:${species.id}:mods`,
    species.name,
    slots,
  )

  species.traits?.forEach((trait, index) => {
    if (trait.isChoice && trait.choices?.options?.length) {
      const picked = speciesTraitPicks[String(index)] ?? []
      for (const optionName of picked) {
        const option = trait.choices.options.find((entry) => entry.name === optionName)
        if (!option) continue
        pushGrantSlots(
          grantFeatsFromLinkedModifiers(catalog, option.linkedModifiers, option.modifierRefs),
          `species:${species.id}:trait:${index}:${optionName}`,
          `${trait.name}: ${optionName}`,
          slots,
        )
      }
      return
    }

    pushGrantSlots(
      grantFeatsFromLinkedModifiers(catalog, trait.linkedModifiers, trait.modifierRefs),
      `species:${species.id}:trait:${index}`,
      trait.name,
      slots,
    )
  })

  return slots
}

export function speciesFeatPicksComplete(
  slots: SpeciesFeatPickSlot[],
  featureChoicePicks: Record<string, string[]>,
): boolean {
  for (const slot of slots) {
    if (!(featureChoicePicks[slot.key]?.[0] ?? "")) return false
  }
  return true
}
