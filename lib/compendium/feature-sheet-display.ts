import {
  isLongRestActivityText,
  isRestDialogueChoiceText,
  isShortRestActivityText,
} from "@/lib/character/alchemist-bomb-sheet"
import {
  inferActivatableActionCategory,
  inferActivatableActionKinds,
  itemSignalsEnemyCombatImpact,
  type ActivatableItem,
} from "@/lib/character/sheet-actions"
import type { Feature } from "@/lib/types"

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
    // Non-action enemy combat impact (debuff attacks/damage/saves) → Combat Passive.
    if (itemSignalsEnemyCombatImpact(item)) {
      return {
        featuresTab: true,
        abilitiesActions: false,
        combatActions: true,
        restDialogues,
      }
    }
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

/**
 * Opening combat-round timing ("During the first round of combat…") is enough to
 * file the feature on the Combat tab even when the rest of the prose is social/utility
 * (e.g. Courtesan Sociable Start / Influence as a Bonus Action).
 */
export function descriptionOpensWithFirstRoundOfCombat(
  description?: string | null,
): boolean {
  const text = (description ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return /^(?:during|on|in)\s+the\s+first\s+(?:round|turn)\s+of\s+combat\b/i.test(text)
}

export function resolveFeatureSheetDisplay(
  feature: Pick<Feature, "sheetDisplay" | "name" | "description"> & ActivatableItem,
): ResolvedFeatureSheetDisplay {
  // Seed / older imports stamped Mixologist as Abilities-only and omitted featuresTab,
  // which hid the level-up card and filed the bonus action on Non-Combat.
  if (isPotionMixologist(feature.name)) {
    return { featuresTab: true, abilitiesActions: false, combatActions: true, restDialogues: false }
  }
  const opensCombatRound = descriptionOpensWithFirstRoundOfCombat(feature.description)
  const explicit = feature.sheetDisplay
  if (explicit && typeof explicit === "object") {
    const inferred = inferFeatureSheetDisplay(feature)
    const forceCombat =
      opensCombatRound ||
      (inferred.combatActions && /^reckless attack$/i.test((feature.name ?? "").trim()))
    return {
      featuresTab: explicit.featuresTab ?? false,
      // First-round combat openers are Combat-tab actions even when older stamps filed
      // social/utility wording (Influence, etc.) on Abilities only.
      abilitiesActions: opensCombatRound ? false : (explicit.abilitiesActions ?? false),
      combatActions: explicit.combatActions || forceCombat,
      restDialogues: explicit.restDialogues ?? inferred.restDialogues,
    }
  }
  if (opensCombatRound) {
    const inferred = inferFeatureSheetDisplay(feature)
    return { ...inferred, combatActions: true, abilitiesActions: false }
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

export { normalizeFeatureSheetDisplay } from "@/lib/compendium/normalize-feature-sheet-display"
