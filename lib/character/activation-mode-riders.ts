import {
  defaultDanceParentCharacteristicModifiers,
  defaultDanceStyleCharacteristicModifiers,
  defaultDanceStyleReminderActions,
  isDanceBeginFeature,
  isDanceStyleChoiceFeature,
  type ActivationModeReminderAction,
} from "@/lib/character/dancer-dance-styles"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { MIGRATED_INLINE_CATALOG_ID, readLinkedModifiers } from "@/lib/compendium/linked-modifiers"
import type { Feature } from "@/lib/types"

const RUNTIME_INSTANCE_PREFIX = "modinst_runtime_activation_mode"

/**
 * Signature stance / mode abilities (Dance, and similar L1–3 cores):
 * one parent button → info → exclusive pick → parent toggle + mode toggle →
 * gated child sheet surfaces.
 *
 * Independent maneuvers that only share a die pool (Captain Battle Tactics,
 * Gunslinger Risk, Warmage Kings, Investigator trinkets) stay as separate buttons.
 */
function ridersForFeature(feature: Pick<Feature, "name" | "choices">): CharacteristicModifier[] {
  if (isDanceBeginFeature(feature)) return defaultDanceParentCharacteristicModifiers()
  if (isDanceStyleChoiceFeature(feature)) return defaultDanceStyleCharacteristicModifiers()
  return []
}

export function featureHasActivationModeRiders(
  feature: Pick<Feature, "name" | "choices">,
): boolean {
  return ridersForFeature(feature).length > 0
}

export function mergeActivationModeRidersIntoFeature(
  feature: Feature,
  occupiedIds: ReadonlySet<string> = new Set(),
): Feature {
  const extras = ridersForFeature(feature)
  if (!extras.length) return feature

  const linked = readLinkedModifiers(feature)
  const existingIds = new Set<string>()
  const existingOptions = new Set<string>()
  for (const instance of linked) {
    for (const mod of instance.characteristics ?? []) {
      if (mod.id) existingIds.add(mod.id)
      if (mod.type !== "resource_ability_menu") continue
      for (const option of mod.options ?? []) {
        const key = option.name.trim().toLowerCase()
        if (key) existingOptions.add(key)
      }
    }
  }
  const toAdd = extras.filter((mod) => {
    if (mod.id && (occupiedIds.has(mod.id) || existingIds.has(mod.id))) return false
    if (mod.type === "resource_ability_menu") {
      const optionName = mod.options?.[0]?.name.trim().toLowerCase()
      if (optionName && existingOptions.has(optionName)) return false
    }
    return true
  })
  if (!toAdd.length) return feature

  return {
    ...feature,
    linkedModifiers: [
      ...linked,
      {
        instanceId: `${RUNTIME_INSTANCE_PREFIX}:${feature.name}`,
        catalogRefId: MIGRATED_INLINE_CATALOG_ID,
        characteristics: toAdd,
      },
    ],
  }
}

export function collectActivationModeRiderModifiers(
  features: readonly Feature[],
  occupiedIds: ReadonlySet<string> = new Set(),
): CharacteristicModifier[] {
  const mods: CharacteristicModifier[] = []
  const seen = new Set(occupiedIds)
  for (const feature of features) {
    for (const mod of ridersForFeature(feature)) {
      if (mod.id && seen.has(mod.id)) continue
      if (mod.id) seen.add(mod.id)
      mods.push(mod)
    }
  }
  return mods
}

export function collectActivationModeReminderActions(
  features: readonly Feature[],
  existingNames: ReadonlySet<string> = new Set(),
): ActivationModeReminderAction[] {
  if (!features.some((feature) => isDanceStyleChoiceFeature(feature))) return []
  return defaultDanceStyleReminderActions().filter(
    (entry) => !existingNames.has(entry.name.trim().toLowerCase()),
  )
}
