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

  for (const featId of params.grantedFeatIds) {
    entries.push({ featId, choicePickKey: grantedFeatChoicePickKey(featId) })
  }

  return entries
}

export function linkedModifiersForFeat(
  feat: Feat,
  choicePickKey: string,
  featChoicePicks: Record<string, string[]>,
  catalog: ModifierCatalogEntry[],
): LinkedModifierInstance[] {
  if (feat.isChoice && feat.choices?.options?.length) {
    const instances: LinkedModifierInstance[] = []
    const picked = featChoicePicks[choicePickKey] ?? []
    for (const optionName of picked) {
      const option = feat.choices.options.find((entry) => entry.name === optionName)
      if (!option) continue
      instances.push(
        ...effectiveLinkedModifiers(option.linkedModifiers, option.modifierRefs, catalog),
      )
    }
    return instances
  }

  return effectiveLinkedModifiers(feat.linkedModifiers, feat.modifierRefs, catalog)
}

export function validateFeatModifierChoices(
  feats: Feat[],
  entries: FeatSelectionEntry[],
  featChoicePicks: Record<string, string[]>,
): boolean {
  for (const entry of entries) {
    const feat = feats.find((f) => f.id === entry.featId)
    if (!feat?.isChoice || !feat.choices) continue
    const picks = featChoicePicks[entry.choicePickKey] ?? []
    if (!choiceCountMet(picks, feat.choices.count)) return false
  }
  return true
}

export function featsRequiringModifierChoices(
  feats: Feat[],
  entries: FeatSelectionEntry[],
): { entry: FeatSelectionEntry; feat: Feat }[] {
  return entries.flatMap((entry) => {
    const feat = feats.find((f) => f.id === entry.featId)
    if (!feat?.isChoice || !feat.choices?.options?.length) return []
    return [{ entry, feat }]
  })
}
