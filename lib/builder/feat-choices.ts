import { choiceCountMet } from "@/lib/builder/choices"
import { effectiveLinkedModifiers, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { Feat } from "@/lib/types"

export type FeatSelectionEntry = {
  featId: string
  choicePickKey: string
}

export function featChoicePickKey(slotKey: string): string {
  return `feat:${slotKey}`
}

export function grantedFeatChoicePickKey(featId: string): string {
  return `feat:granted:${featId}`
}

export function buildFeatSelectionEntries(params: {
  featPickSlots: { key: string }[]
  speciesFeatPickSlots: { key: string }[]
  backgroundFeatPickSlots?: { key: string }[]
  featureChoicePicks: Record<string, string[]>
  grantedFeatIds: string[]
}): FeatSelectionEntry[] {
  const entries: FeatSelectionEntry[] = []

  for (const slot of params.featPickSlots) {
    const featId = params.featureChoicePicks[slot.key]?.[0]
    if (featId) entries.push({ featId, choicePickKey: featChoicePickKey(slot.key) })
  }

  for (const slot of params.speciesFeatPickSlots) {
    const featId = params.featureChoicePicks[slot.key]?.[0]
    if (featId) entries.push({ featId, choicePickKey: featChoicePickKey(slot.key) })
  }

  for (const slot of params.backgroundFeatPickSlots ?? []) {
    const featId = params.featureChoicePicks[slot.key]?.[0]
    if (featId) entries.push({ featId, choicePickKey: featChoicePickKey(slot.key) })
  }

  for (const featId of params.grantedFeatIds) {
    entries.push({ featId, choicePickKey: grantedFeatChoicePickKey(featId) })
  }

  return entries
}

/**
 * Feat-level modifiers apply on top of the picked options' modifiers — a choice feat can
 * carry benefits shared by every option (e.g. Scion of the Outer Planes' casting ability).
 */
export function linkedModifiersForFeat(
  feat: Feat,
  choicePickKey: string,
  featChoicePicks: Record<string, string[]>,
  catalog: ModifierCatalogEntry[],
): LinkedModifierInstance[] {
  const instances = effectiveLinkedModifiers(feat.linkedModifiers, feat.modifierRefs, catalog)
  if (!feat.isChoice || !feat.choices?.options?.length) return instances

  const seenInstanceIds = new Set(instances.map((instance) => instance.instanceId))
  const picked = featChoicePicks[choicePickKey] ?? []
  for (const optionName of picked) {
    const option = feat.choices.options.find((entry) => entry.name === optionName)
    if (!option) continue
    for (const instance of effectiveLinkedModifiers(
      option.linkedModifiers,
      option.modifierRefs,
      catalog,
    )) {
      if (instance.instanceId && seenInstanceIds.has(instance.instanceId)) continue
      if (instance.instanceId) seenInstanceIds.add(instance.instanceId)
      instances.push(instance)
    }
  }
  return instances
}

export function collectFeatModifierChoiceBlockers(
  feats: Feat[],
  entries: FeatSelectionEntry[],
  featChoicePicks: Record<string, string[]>,
): string[] {
  const blockers: string[] = []
  for (const entry of entries) {
    const feat = feats.find((f) => f.id === entry.featId)
    if (!feat?.isChoice || !feat.choices) continue
    // Dynamic optionsSource pools are validated in the picker UI; skip hard blockers when the
    // static options list is empty (talents may be unavailable until a discipline is known).
    if (!feat.choices.options?.length) continue
    const picks = featChoicePicks[entry.choicePickKey] ?? []
    if (!choiceCountMet(picks, feat.choices.count)) {
      blockers.push(
        `${feat.name}: choose ${feat.choices.count} option${feat.choices.count === 1 ? "" : "s"} (${picks.length}/${feat.choices.count}).`,
      )
    }
  }
  return blockers
}

export function validateFeatModifierChoices(
  feats: Feat[],
  entries: FeatSelectionEntry[],
  featChoicePicks: Record<string, string[]>,
): boolean {
  return (
    collectFeatModifierChoiceBlockers(feats, entries, featChoicePicks).length === 0
  )
}

export function featsRequiringModifierChoices(
  feats: Feat[],
  entries: FeatSelectionEntry[],
): { entry: FeatSelectionEntry; feat: Feat }[] {
  return entries.flatMap((entry) => {
    const feat = feats.find((f) => f.id === entry.featId)
    if (!feat?.isChoice || !feat.choices) return []
    if (!feat.choices.options?.length && !feat.choices.optionsSource) return []
    return [{ entry, feat }]
  })
}
