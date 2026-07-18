import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { Feature, FeatureChoice } from "@/lib/types"

/**
 * Legacy shape of the removed `feature_option_picker` characteristic. We only
 * read it here to migrate old stored content into the unified `FeatureChoice`
 * model; it is no longer part of the active characteristic union.
 */
type LegacyFeatureOptionPicker = {
  type: "feature_option_picker"
  id?: string
  category?: string | null
  choiceCount?: number | null
  choiceCountByLevel?: { level: number; count: number }[] | null
  swappableOnRest?: boolean | null
  swapRestType?: "short" | "long" | null
  resourceKey?: string | null
  optionsSource?: string | null
  label?: string | null
  options?: { name?: string | null; description?: string | null; resourceCost?: number | null }[] | null
}

/**
 * Build a transitional `feature_option_picker` characteristic for producers (SRD
 * enrichment, import) that is immediately migrated into a `FeatureChoice`. The
 * type is intentionally not part of the public characteristic union.
 */
export function legacyFeatureOptionPickerCharacteristic(
  args: Omit<LegacyFeatureOptionPicker, "type">,
): CharacteristicModifier {
  return { type: "feature_option_picker", ...args } as unknown as CharacteristicModifier
}

function isLegacyPicker(value: unknown): value is LegacyFeatureOptionPicker {
  return Boolean(value) && (value as { type?: string }).type === "feature_option_picker"
}

function pickerToChoice(picker: LegacyFeatureOptionPicker, fallbackName: string): FeatureChoice {
  return {
    category: picker.category?.trim() || picker.label?.trim() || fallbackName || "Option",
    count: typeof picker.choiceCount === "number" && picker.choiceCount > 0 ? picker.choiceCount : 1,
    swappableOnRest: picker.swappableOnRest ?? undefined,
    resourceKey: picker.resourceKey ?? undefined,
    optionsSource: (picker.optionsSource as FeatureChoice["optionsSource"]) ?? undefined,
    choiceCountByLevel: Array.isArray(picker.choiceCountByLevel)
      ? picker.choiceCountByLevel
      : undefined,
    options: Array.isArray(picker.options)
      ? picker.options.map((option) => ({
          name: option?.name ?? "",
          description: option?.description ?? "",
          resourceCost: option?.resourceCost ?? undefined,
        }))
      : [],
  }
}

/** Merge a migrated picker choice into any existing FeatureChoice, preserving authored data. */
function mergeChoice(existing: FeatureChoice | undefined, incoming: FeatureChoice): FeatureChoice {
  if (!existing) return incoming
  return {
    ...existing,
    category: existing.category?.trim() ? existing.category : incoming.category,
    count: existing.count > 0 ? existing.count : incoming.count,
    swappableOnRest: existing.swappableOnRest ?? incoming.swappableOnRest,
    swapRestType: existing.swapRestType ?? incoming.swapRestType,
    resourceKey: existing.resourceKey ?? incoming.resourceKey,
    optionsSource: existing.optionsSource ?? incoming.optionsSource,
    choiceCountByLevel: existing.choiceCountByLevel?.length
      ? existing.choiceCountByLevel
      : incoming.choiceCountByLevel,
    options: existing.options?.length ? existing.options : incoming.options,
  }
}

/**
 * Convert any legacy `feature_option_picker` characteristics on a feature into the
 * unified `FeatureChoice` representation, stripping the legacy characteristics (and
 * any linked-modifier instances they leave empty). Idempotent and safe on content
 * that has no legacy pickers.
 */
export function migrateFeatureOptionPickers(feature: Feature): Feature {
  const linked = feature.linkedModifiers
  if (!Array.isArray(linked) || linked.length === 0) return feature

  let foundPicker = false
  let choice: FeatureChoice | undefined = feature.choices ?? undefined

  const nextLinked: LinkedModifierInstance[] = []
  for (const instance of linked) {
    const characteristics = instance.characteristics
    if (!Array.isArray(characteristics) || characteristics.length === 0) {
      nextLinked.push(instance)
      continue
    }

    const remaining = characteristics.filter((char) => {
      if (isLegacyPicker(char)) {
        foundPicker = true
        choice = mergeChoice(choice, pickerToChoice(char, feature.name))
        return false
      }
      return true
    })

    if (remaining.length === characteristics.length) {
      nextLinked.push(instance)
    } else if (remaining.length > 0) {
      nextLinked.push({ ...instance, characteristics: remaining })
    }
    // else: instance held only the legacy picker → drop it entirely
  }

  if (!foundPicker) return feature

  return {
    ...feature,
    isChoice: true,
    choices: choice,
    linkedModifiers: nextLinked,
  }
}
