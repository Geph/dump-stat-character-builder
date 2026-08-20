import type { DndClass, Feature } from "@/lib/types"
import type { SubclassUnlockCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import {
  syncModifierRefs,
  type LinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"

export const SUBCLASS_UNLOCK_CATALOG_ID = "cat_char_subclass_unlock"

const STRICT_SUBCLASS_GATE_NAME =
  /^(?:subclass|.+\s+subclass|psionic archetype|inventor specialization|occult tradition|warden bond|divine domain|sacred oath|martial archetype|primal path|bard college|druid circle|monastic tradition|roguish archetype|sorcerous origin|otherworldly patron|arcane tradition)$/i

export function featureHasSubclassUnlockModifier(feature: Pick<Feature, "linkedModifiers">): boolean {
  return (feature.linkedModifiers ?? []).some(
    (instance) =>
      instance.catalogRefId === SUBCLASS_UNLOCK_CATALOG_ID ||
      (instance.characteristics ?? []).some((characteristic) => characteristic.type === "subclass_unlock"),
  )
}

function subclassUnlockModifier(label: string): LinkedModifierInstance {
  const characteristic: SubclassUnlockCharacteristic = {
    id: "subclass_unlock",
    type: "subclass_unlock",
    label,
  }
  return {
    instanceId: `modinst_subclass_unlock_${label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    catalogRefId: SUBCLASS_UNLOCK_CATALOG_ID,
    characteristics: [characteristic],
  }
}

function strictGateAtLevel(features: Feature[], level: number): Feature | undefined {
  return features.find(
    (feature) =>
      feature.level === level &&
      !/\b(?:subclass|archetype)\s+features?\b/i.test(feature.name) &&
      STRICT_SUBCLASS_GATE_NAME.test(feature.name.trim()),
  )
}

/**
 * Stamp the reusable subclass-selection modifier onto the class's gate feature.
 * If the source omitted that feature, add a small structural feature at the configured level.
 */
export function ensureSubclassUnlockFeature(
  cls: Pick<DndClass, "name" | "features">,
  unlockLevel: number,
  preferredFeatureName?: string,
): Feature[] {
  const features = [...(cls.features ?? [])]
  if (features.some(featureHasSubclassUnlockModifier)) return features

  const preferred = preferredFeatureName?.trim()
  const gate =
    (preferred
      ? features.find(
          (feature) =>
            feature.level === unlockLevel &&
            feature.name.trim().toLowerCase() === preferred.toLowerCase(),
        )
      : undefined) ?? strictGateAtLevel(features, unlockLevel)
  const label = gate?.name.trim() || preferred || "Subclass"

  if (gate) {
    return features.map((feature) =>
      feature !== gate
        ? feature
        : syncModifierRefs({
            ...feature,
            linkedModifiers: [
              ...(feature.linkedModifiers ?? []),
              subclassUnlockModifier(label),
            ],
          }),
    )
  }

  const structuralFeature = syncModifierRefs({
    level: unlockLevel,
    name: label,
    description: `Choose a ${label.toLowerCase()} for this class.`,
    isChoice: false,
    linkedModifiers: [subclassUnlockModifier(label)],
  } as Feature)
  return [...features, structuralFeature].sort(
    (a, b) => a.level - b.level || a.name.localeCompare(b.name),
  )
}
