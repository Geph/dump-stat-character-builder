import type { FeatPickSlot } from "@/lib/builder/class-feat-features"
import { slotUsesCatalogFeatPicks } from "@/lib/builder/catalog-feat-options"

export type CatalogFeatPickGroup = {
  groupKey: string
  className: string
  label: string
  featCategories: string[]
  slots: FeatPickSlot[]
}

/** Strip trailing "(2/5)" ordinals from scaled feat-grant slot labels. */
export function stripFeatPickSlotOrdinalLabel(label: string): string {
  return label.replace(/\s\(\d+\/\d+\)$/, "")
}

export function catalogFeatPickGroupKey(slot: FeatPickSlot): string {
  return [
    slot.classId,
    [...slot.featCategories].sort().join("|"),
    stripFeatPickSlotOrdinalLabel(slot.label),
  ].join("::")
}

export function readCatalogFeatPicksFromSlots(
  slots: FeatPickSlot[],
  featureChoicePicks: Record<string, string[]>,
): string[] {
  return slots
    .map((slot) => featureChoicePicks[slot.key]?.[0])
    .filter((pickId): pickId is string => Boolean(pickId))
}

export function distributeCatalogFeatPicksToSlots(
  slots: FeatPickSlot[],
  pickIds: string[],
): Record<string, string[]> {
  const next: Record<string, string[]> = {}
  slots.forEach((slot, index) => {
    const pickId = pickIds[index]
    next[slot.key] = pickId ? [pickId] : []
  })
  return next
}

export function groupCatalogFeatPickSlots(slots: FeatPickSlot[]): {
  catalogGroups: CatalogFeatPickGroup[]
  regularSlots: FeatPickSlot[]
} {
  const regularSlots: FeatPickSlot[] = []
  const groupMap = new Map<string, CatalogFeatPickGroup>()

  for (const slot of slots) {
    if (!slotUsesCatalogFeatPicks(slot.featCategories)) {
      regularSlots.push(slot)
      continue
    }

    const groupKey = catalogFeatPickGroupKey(slot)
    const existing = groupMap.get(groupKey)
    if (existing) {
      existing.slots.push(slot)
      continue
    }

    groupMap.set(groupKey, {
      groupKey,
      className: slot.className,
      label: stripFeatPickSlotOrdinalLabel(slot.label),
      featCategories: slot.featCategories,
      slots: [slot],
    })
  }

  const catalogGroups = [...groupMap.values()]
  for (const group of catalogGroups) {
    group.slots.sort((a, b) => a.key.localeCompare(b.key))
  }
  catalogGroups.sort(
    (a, b) =>
      a.slots[0].milestoneLevel - b.slots[0].milestoneLevel ||
      a.className.localeCompare(b.className) ||
      a.label.localeCompare(b.label),
  )

  return { catalogGroups, regularSlots }
}
