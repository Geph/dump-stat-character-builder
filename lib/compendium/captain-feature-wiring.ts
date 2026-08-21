import { characteristicCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import type { Feature } from "@/lib/types"

/** Base Battle Tactics maneuvers every Captain knows. Not a Maneuvers Known picker. */
export const CAPTAIN_BASE_MANEUVERS = [
  "Bolster",
  "Born Leader",
  "Morale Boost",
  "Rally",
  "Staggering Strike",
] as const

export const CAPTAIN_BATTLE_TACTICS_GRANT_ID = "modinst_captain_battle_tactics_maneuvers"

export function isCaptainBaseManeuverName(name: string | null | undefined): boolean {
  const key = name?.trim().toLowerCase() ?? ""
  return CAPTAIN_BASE_MANEUVERS.some((entry) => entry.toLowerCase() === key)
}

export function captainBattleTacticsGrantModifier(
  abilityNames: readonly string[] = CAPTAIN_BASE_MANEUVERS,
): LinkedModifierInstance {
  return charInstance(
    CAPTAIN_BATTLE_TACTICS_GRANT_ID,
    characteristicCatalogRefId("grant_custom_ability"),
    [
      {
        id: modId("captain_battle_tactics_maneuvers"),
        type: "grant_custom_ability",
        abilityNames: [...abilityNames],
        label: "Gain Captain Maneuver Options",
      },
    ],
  )
}

function mergeGrantNames(
  existing: LinkedModifierInstance[] | undefined,
  names: readonly string[],
): { modifiers: LinkedModifierInstance[]; changed: boolean } {
  const wanted = [...new Set(names.map((name) => name.trim()).filter(Boolean))]
  const grantIndex = (existing ?? []).findIndex((instance) =>
    instance.characteristics?.some((char) => char.type === "grant_custom_ability"),
  )
  if (grantIndex < 0) {
    return {
      modifiers: [...(existing ?? []), captainBattleTacticsGrantModifier(wanted)],
      changed: true,
    }
  }
  const instance = existing![grantIndex]
  const chars = instance.characteristics ?? []
  const nextChars = chars.map((char) => {
    if (char.type !== "grant_custom_ability") return char
    const current = char.abilityNames ?? []
    const merged = [...new Set([...current, ...wanted])]
    if (merged.length === current.length && merged.every((name, i) => name === current[i])) {
      return char
    }
    return { ...char, abilityNames: merged }
  })
  const changed = nextChars.some((char, i) => char !== chars[i])
  if (!changed) return { modifiers: existing!, changed: false }
  const next = [...existing!]
  next[grantIndex] = { ...instance, characteristics: nextChars }
  return { modifiers: next, changed: true }
}

export function sanitizeCaptainFeature(
  feature: Feature,
  extraManeuverNames: readonly string[] = [],
): Feature {
  if (!/^battle tactics$/i.test(feature.name.trim())) return feature
  const names = [...CAPTAIN_BASE_MANEUVERS, ...extraManeuverNames]
  const { modifiers, changed } = mergeGrantNames(feature.linkedModifiers, names)
  const sheetDisplay = {
    combatActions: true,
    featuresTab: true,
    ...feature.sheetDisplay,
  }
  const displayChanged =
    feature.sheetDisplay?.combatActions !== true || feature.sheetDisplay?.featuresTab !== true
  if (!changed && !displayChanged) return feature
  return syncModifierRefs({
    ...feature,
    linkedModifiers: modifiers,
    sheetDisplay,
  })
}

export function sanitizeCaptainFeatures(
  features: Feature[] | undefined,
  extraManeuverNames: readonly string[] = [],
): Feature[] | undefined {
  if (!features?.length) return features
  return features.map((feature) => sanitizeCaptainFeature(feature, extraManeuverNames))
}
