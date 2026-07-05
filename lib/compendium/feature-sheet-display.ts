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
}

/** Infer sheet placement from activation wiring (legacy default when sheetDisplay is unset). */
export function inferFeatureSheetDisplay(item: ActivatableItem): ResolvedFeatureSheetDisplay {
  const kinds = inferActivatableActionKinds(item)
  if (!kinds.length) {
    return {
      featuresTab: true,
      abilitiesActions: false,
      combatActions: false,
    }
  }
  const category = inferActivatableActionCategory(item)
  return {
    featuresTab: true,
    abilitiesActions: category === "utility",
    combatActions: category === "combat",
  }
}

export function resolveFeatureSheetDisplay(
  feature: Pick<Feature, "sheetDisplay"> & ActivatableItem,
): ResolvedFeatureSheetDisplay {
  const explicit = feature.sheetDisplay
  if (explicit && typeof explicit === "object") {
    return {
      featuresTab: explicit.featuresTab ?? false,
      abilitiesActions: explicit.abilitiesActions ?? false,
      combatActions: explicit.combatActions ?? false,
    }
  }
  return inferFeatureSheetDisplay(feature)
}

export function featureShowsOnSheetTab(feature: Feature): boolean {
  return resolveFeatureSheetDisplay(feature).featuresTab
}

/** Stamp explicit sheetDisplay from current wiring (used when enriching SRD content). */
export function applyFeatureSheetDisplay(feature: Feature): Feature {
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
  }
}
