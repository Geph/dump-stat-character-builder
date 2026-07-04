import { characteristicsFromLinkedModifiers } from "@/lib/compendium/builder-modifier-refs"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { tagModifierSource } from "@/lib/character/tag-modifier-source"
import { isArmorItem, isShieldItem, isWeaponItem } from "@/lib/compendium/combat-stats"
import {
  equipmentRequiresAttunement,
  isMagicItem,
} from "@/lib/compendium/equipment-attunement"
import {
  getMagicEffectScope,
  readMagicEffects,
} from "@/lib/compendium/equipment-magic"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { resolveCharacterEquipment } from "@/lib/compendium/equipment-base-selection"
import type { EquipmentBaseSelections } from "@/lib/compendium/equipment-base-selection"
import type { Equipment } from "@/lib/types"

export type EquipmentMagicContext = {
  equipment: Equipment[]
  equippedArmorId: string | null
  equippedShieldId: string | null
  equippedWeaponId: string | null
  attunedItemIds: string[]
  modifierCatalog: ModifierCatalogEntry[]
}

export function isMagicItemEffectActive(
  item: Equipment,
  context: EquipmentMagicContext,
): boolean {
  if (!readMagicEffects(item).length) return false

  const scope = getMagicEffectScope(item)
  if (scope === "wielded") {
    return item.id === context.equippedWeaponId
  }
  if (scope === "worn") {
    return item.id === context.equippedArmorId || item.id === context.equippedShieldId
  }

  if (!isMagicItem(item)) return false
  if (item.requires_attunement === false || equipmentRequiresAttunement(item) === false) {
    return context.equipment.some((entry) => entry.id === item.id)
  }
  return context.attunedItemIds.includes(item.id)
}

export function collectActiveMagicItems(context: EquipmentMagicContext): Equipment[] {
  return context.equipment.filter((item) => isMagicItemEffectActive(item, context))
}

export function collectEquipmentMagicCharacteristics(
  context: EquipmentMagicContext,
): CharacteristicModifier[] {
  return collectActiveMagicItems(context).flatMap((item) =>
    tagModifierSource(
      characteristicsFromLinkedModifiers(context.modifierCatalog, readMagicEffects(item), null),
      {
        sourceType: "item",
        source: item.name,
        label: item.name,
        sourceId: item.id,
      },
    ),
  )
}

export function resolveEquippedItems(
  equipment: Equipment[],
  loadout: {
    equippedArmorId: string | null
    equippedShieldId: string | null
    equippedWeaponId: string | null
  },
  baseSelections: EquipmentBaseSelections = {},
  catalog?: Equipment[],
): {
  armor: Equipment | null
  shield: Equipment | null
  weapon: Equipment | null
} {
  const lookupCatalog = catalog?.length ? catalog : equipment

  const resolve = (id: string | null, predicate: (item: Equipment) => boolean) => {
    if (!id) return null
    const raw = equipment.find((item) => item.id === id && predicate(item))
    return raw ? resolveCharacterEquipment(raw, lookupCatalog, baseSelections) : null
  }

  return {
    armor: resolve(loadout.equippedArmorId, isArmorItem),
    shield: resolve(loadout.equippedShieldId, isShieldItem),
    weapon: resolve(loadout.equippedWeaponId, isWeaponItem),
  }
}
