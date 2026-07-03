import { characteristicCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import { readLinkedModifiers, syncModifierRefs } from "@/lib/compendium/linked-modifiers"
import type { ClassResourceImportRow } from "@/lib/import/enrich-import-classes"
import type { Feature, LinkedModifierInstance, UsesConfig } from "@/lib/types"

const QUARRY_TOGGLE = "quarry_marked"

function isAlternateRanger(className: string): boolean {
  return /alternate\s+ranger/i.test(className)
}

export function buildQuarryClassResource(className: string): ClassResourceImportRow {
  const uses: UsesConfig = {
    type: "ability_modifier",
    abilityModifier: "WIS",
    recharges: [{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }],
    restoreBySpellSlot: { minSpellLevel: 1, restores: 1 },
    rechargeOverrides: [
      {
        atClassLevel: 10,
        recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
      },
    ],
  }
  return {
    class_name: className,
    resource_key: "quarry",
    name: "Quarry",
    description: "Mark a creature as your Quarry. Uses equal your Wisdom modifier (minimum 1).",
    uses,
  }
}

function quarryOnHitDie(instanceKey: string): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, characteristicCatalogRefId("on_hit_trigger"), [
    {
      id: modId(`${instanceKey}_on_hit`),
      type: "on_hit_trigger",
      requiresSheetToggle: QUARRY_TOGGLE,
      effect: {
        id: modId(`${instanceKey}_damage`),
        kind: "extra_damage_on_hit",
        bonusDice: "1d6",
        label: "Quarry Die damage (scales on class table)",
      },
    },
  ])
}

function wireQuarryFeature(feature: Feature, className: string): Feature {
  if (!/^quarry$/i.test(feature.name.trim())) return feature
  const prefix = className.toLowerCase().replace(/[^a-z0-9]+/g, "_")
  const existing = readLinkedModifiers(feature)
  const hasOnHit = existing.some((inst) =>
    inst.characteristics?.some((char) => char.type === "on_hit_trigger"),
  )
  if (hasOnHit) return feature
  return syncModifierRefs({
    ...feature,
    linkedModifiers: [...(feature.linkedModifiers ?? []), quarryOnHitDie(`${prefix}_quarry_hit`)],
  }) as Feature
}

export function enrichAlternateRangerFeatures(features: Feature[], className: string): Feature[] {
  if (!isAlternateRanger(className)) return features
  return features.map((feature) => wireQuarryFeature(feature, className))
}

export function mergeAlternateRangerClassResources(
  className: string,
  features: Feature[],
  resources: ClassResourceImportRow[],
): ClassResourceImportRow[] {
  if (!isAlternateRanger(className)) return resources
  if (!features.some((feature) => /^quarry$/i.test(feature.name.trim()))) return resources
  if (resources.some((row) => row.resource_key === "quarry")) return resources
  return [...resources, buildQuarryClassResource(className)]
}
