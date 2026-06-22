import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { characteristicCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { FeatureActivation, UsesConfig } from "@/lib/types"

export function modId(key: string): string {
  return `mod_${key}`
}

export function charInstance(
  instanceId: string,
  catalogRefId: string,
  characteristics: CharacteristicModifier[],
): LinkedModifierInstance {
  return { instanceId, catalogRefId, characteristics }
}

export function fxInstance(
  instanceId: string,
  catalogRefId: string,
  activation: FeatureActivation,
): LinkedModifierInstance {
  return { instanceId, catalogRefId, activation }
}

export function usesInstance(
  instanceId: string,
  uses: UsesConfig,
  label?: string,
): LinkedModifierInstance {
  return charInstance(instanceId, characteristicCatalogRefId("uses"), [
    {
      id: modId(`${instanceId}_uses`),
      type: "uses",
      uses,
      label,
    },
  ])
}

export function syncLinkedFeature<
  T extends { linkedModifiers?: LinkedModifierInstance[]; modifierRefs?: string[] },
>(patch: T): T & { modifierRefs: string[] } {
  return syncModifierRefs(patch)
}
