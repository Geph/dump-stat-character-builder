import {
  isLongRestActivityText,
  isRestDialogueChoiceText,
  isShortRestActivityText,
} from "@/lib/character/alchemist-bomb-sheet"
import {
  inferActivatableActionCategory,
  inferActivatableActionKinds,
  type ActivatableItem,
} from "@/lib/character/sheet-actions"
import type { Feature, FeatureSheetDisplay } from "@/lib/types"

export type ResolvedFeatureSheetDisplay = {
  abilitiesActions: boolean
  combatActions: boolean
  featuresTab: boolean
  restDialogues: boolean
}

function featureHasHitDiceRestore(item: ActivatableItem): boolean {
  return (item.linkedModifiers ?? []).some((instance) =>
    (instance.characteristics ?? []).some((char) => char.type === "hit_dice_restore"),
  )
}

function inferRestDialogues(item: ActivatableItem): boolean {
  return (
    isRestDialogueChoiceText(item.name, item.description) ||
    isShortRestActivityText(item.name, item.description) ||
    isLongRestActivityText(item.name, item.description) ||
    featureHasHitDiceRestore(item)
  )
}

/** Infer sheet placement from activation wiring (legacy default when sheetDisplay is unset). */
export function inferFeatureSheetDisplay(item: ActivatableItem): ResolvedFeatureSheetDisplay {
  const restDialogues = inferRestDialogues(item)
  if (isRestDialogueChoiceText(item.name, item.description) || featureHasHitDiceRestore(item)) {
    return {
      featuresTab: true,
      abilitiesActions: false,
      combatActions: false,
      restDialogues: true,
    }
  }
  const kinds = inferActivatableActionKinds(item)
  if (!kinds.length) {
    return {
      featuresTab: true,
      abilitiesActions: false,
      combatActions: false,
      restDialogues,
    }
  }
  const category = inferActivatableActionCategory(item)
  return {
    featuresTab: true,
    abilitiesActions: category === "utility",
    combatActions: category === "combat",
    restDialogues,
  }
}

function isPotionMixologist(name: string | undefined): boolean {
  return /^potion mixologist$/i.test((name ?? "").trim())
}

export function resolveFeatureSheetDisplay(
  feature: Pick<Feature, "sheetDisplay" | "name"> & ActivatableItem,
): ResolvedFeatureSheetDisplay {
  // Seed / older imports stamped Mixologist as Abilities-only and omitted featuresTab,
  // which hid the level-up card and filed the bonus action on Non-Combat.
  if (isPotionMixologist(feature.name)) {
    return { featuresTab: true, abilitiesActions: false, combatActions: true, restDialogues: false }
  }
  const explicit = feature.sheetDisplay
  if (explicit && typeof explicit === "object") {
    const inferred = inferFeatureSheetDisplay(feature)
    const forceCombat =
      inferred.combatActions && /^reckless attack$/i.test((feature.name ?? "").trim())
    return {
      featuresTab: explicit.featuresTab ?? false,
      abilitiesActions: explicit.abilitiesActions ?? false,
      combatActions: explicit.combatActions || forceCombat,
      restDialogues: explicit.restDialogues ?? inferred.restDialogues,
    }
  }
  return inferFeatureSheetDisplay(feature)
}

export function featureShowsOnSheetTab(feature: Feature): boolean {
  return resolveFeatureSheetDisplay(feature).featuresTab
}

/** Stamp explicit sheetDisplay from current wiring (used when enriching SRD content). */
export function applyFeatureSheetDisplay(feature: Feature): Feature {
  if (feature.sheetDisplay && typeof feature.sheetDisplay === "object") {
    return feature
  }
  return {
    ...feature,
    sheetDisplay: inferFeatureSheetDisplay(feature),
  }
}

export function normalizeFeatureSheetDisplay(
  display: FeatureSheetDisplay | null | undefined,
): FeatureSheetDisplay | null {
  if (!display || typeof display !== "object") return null
  return {
    abilitiesActions: display.abilitiesActions ?? false,
    combatActions: display.combatActions ?? false,
    featuresTab: display.featuresTab ?? false,
    restDialogues: display.restDialogues,
  }
}
