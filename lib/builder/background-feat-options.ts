import { grantFeatsFromLinkedModifiers, type ResolvedGrantFeat } from "@/lib/compendium/grant-feat-catalog"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { Background } from "@/lib/types"

export type BackgroundFeatPickSlot = {
  key: string
  label: string
  featCategories: string[]
}

function pushGrantSlots(
  grants: ResolvedGrantFeat[],
  keyPrefix: string,
  labelPrefix: string,
  slots: BackgroundFeatPickSlot[],
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

/** Feat pick slots granted by a background feature (e.g. Pact Seeker → Planar Pact feat). */
export function getBackgroundFeatPickSlots(
  background: Background | undefined,
  catalog: ModifierCatalogEntry[],
): BackgroundFeatPickSlot[] {
  if (!background?.feature) return []

  const slots: BackgroundFeatPickSlot[] = []
  pushGrantSlots(
    grantFeatsFromLinkedModifiers(
      catalog,
      background.feature.linkedModifiers,
      background.feature.modifierRefs,
    ),
    `background:${background.id}:mods`,
    background.name,
    slots,
  )
  return slots
}

export function backgroundFeatPicksComplete(
  slots: BackgroundFeatPickSlot[],
  featureChoicePicks: Record<string, string[]>,
): boolean {
  for (const slot of slots) {
    if (!(featureChoicePicks[slot.key]?.[0] ?? "")) return false
  }
  return true
}
