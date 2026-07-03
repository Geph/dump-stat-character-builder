import { characteristicCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import { readLinkedModifiers, syncModifierRefs } from "@/lib/compendium/linked-modifiers"
import { prefixedResourceKey, slugClassPrefix } from "@/lib/import/third-party-resources"
import type { Feature, LinkedModifierInstance } from "@/lib/types"

function isMonkLikeClass(className: string): boolean {
  return /\bmonk\b/i.test(className) && className !== "Monk"
}

function monkUnarmoredDefense(instanceKey: string): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, characteristicCatalogRefId("ac"), [
    {
      id: modId(instanceKey),
      type: "ac",
      mode: "ability_modifiers",
      base: 10,
      abilities: ["dexterity", "wisdom"],
      label: "Unarmored Defense",
    },
  ])
}

function remapResourceKeyInModifiers(
  modifiers: LinkedModifierInstance[] | undefined,
  fromKey: string,
  toKey: string,
): LinkedModifierInstance[] | undefined {
  if (!modifiers?.length || fromKey === toKey) return modifiers
  const json = JSON.stringify(modifiers)
  if (!json.includes(fromKey)) return modifiers
  return JSON.parse(json.replaceAll(fromKey, toKey)) as LinkedModifierInstance[]
}

function wireUnarmoredDefense(feature: Feature, className: string): Feature {
  if (!/^unarmored defense$/i.test(feature.name.trim())) return feature
  if (
    readLinkedModifiers(feature).some((inst) =>
      inst.characteristics?.some((char) => char.type === "ac"),
    )
  ) {
    return feature
  }
  const prefix = slugClassPrefix(className)
  return syncModifierRefs({
    ...feature,
    linkedModifiers: [
      ...(feature.linkedModifiers ?? []),
      monkUnarmoredDefense(`${prefix}_uac`),
    ],
  }) as Feature
}

/** Remap SRD focus_points → prefixed ki_points and wire monk UAC for homebrew monks. */
export function enrichMonkClassFeatures(features: Feature[], className: string): Feature[] {
  if (!isMonkLikeClass(className)) return features

  const prefix = slugClassPrefix(className)
  const kiKey = prefixedResourceKey(prefix, "ki_points")

  return features.map((feature) => {
    let next: Feature = wireUnarmoredDefense(feature, className)
    const remapped = remapResourceKeyInModifiers(next.linkedModifiers, "focus_points", kiKey)
    if (remapped !== next.linkedModifiers) {
      next = syncModifierRefs({ ...next, linkedModifiers: remapped }) as Feature
    }
    return next
  })
}

export function remapKiResourceKey(className: string, resourceKey: string): string {
  if (resourceKey !== "ki_points" || !isMonkLikeClass(className)) return resourceKey
  return prefixedResourceKey(slugClassPrefix(className), "ki_points")
}

export function remapKiKeysOnFeatRows<T extends { linkedModifiers?: LinkedModifierInstance[] }>(
  feats: T[],
  classNames: string[],
): T[] {
  const monkClass = classNames.find((name) => isMonkLikeClass(name))
  if (!monkClass) return feats
  const kiKey = prefixedResourceKey(slugClassPrefix(monkClass), "ki_points")
  return feats.map((feat) => {
    const remapped = remapResourceKeyInModifiers(feat.linkedModifiers, "ki_points", kiKey)
    if (remapped === feat.linkedModifiers) return feat
    return { ...feat, linkedModifiers: remapped }
  })
}
