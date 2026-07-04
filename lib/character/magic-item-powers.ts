import { readMagicEffects } from "@/lib/compendium/equipment-magic"
import { characteristicsFromLinkedModifiers } from "@/lib/compendium/builder-modifier-refs"
import {
  collectActiveMagicItems,
  type EquipmentMagicContext,
} from "@/lib/compendium/equipment-magic-modifiers"
import type { SheetToggleDefinition } from "@/lib/compendium/sheet-toggle-registry"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { readActivationUsesFromInstances } from "@/lib/character/magic-item-activation"
import type { Equipment, FeatureActivation, UsesConfig } from "@/lib/types"

export type MagicItemPowerKind = "passive" | "conditional" | "uses" | "activation"

export type MagicItemPower = {
  itemId: string
  itemName: string
  powerId: string
  label: string
  kind: MagicItemPowerKind
  toggleId?: string
  activation?: FeatureActivation | null
  activationUses?: UsesConfig | null
  characteristics: CharacteristicModifier[]
}

function toggleIdForItemPower(itemId: string, modId: string): string {
  return `magic_item:${itemId}:${modId}`
}

export function collectMagicItemPowers(context: EquipmentMagicContext): MagicItemPower[] {
  const items = collectActiveMagicItems(context)
  const powers: MagicItemPower[] = []

  for (const item of items) {
    const instances = readMagicEffects(item)
    const activationUses = readActivationUsesFromInstances(instances)
    const characteristics = characteristicsFromLinkedModifiers(
      context.modifierCatalog,
      instances,
      null,
    )

    for (const instance of instances) {
      if (instance.activation?.action || instance.activation?.bonusAction || instance.activation?.reaction) {
        const effectLabel =
          instance.activation.effects?.[0]?.label ??
          instance.activation.effects?.[0]?.kind ??
          item.name
        powers.push({
          itemId: item.id,
          itemName: item.name,
          powerId: instance.instanceId,
          label: String(effectLabel),
          kind: "activation",
          activation: instance.activation,
          activationUses,
          characteristics: [],
        })
      }
    }

    for (const mod of characteristics) {
      const label = mod.label ?? item.name
      if (mod.requiresSheetToggle) {
        powers.push({
          itemId: item.id,
          itemName: item.name,
          powerId: mod.id,
          label,
          kind: "conditional",
          toggleId: mod.requiresSheetToggle,
          activationUses,
          characteristics: [mod],
        })
        continue
      }
      if (mod.type === "uses") {
        powers.push({
          itemId: item.id,
          itemName: item.name,
          powerId: mod.id,
          label,
          kind: "uses",
          activationUses: activationUses ?? (mod as { uses?: UsesConfig }).uses ?? null,
          characteristics: [mod],
        })
        continue
      }
      powers.push({
        itemId: item.id,
        itemName: item.name,
        powerId: mod.id,
        label,
        kind: "passive",
        activationUses,
        characteristics: [mod],
      })
    }
  }

  return powers
}

export function magicItemToggleDefinitions(
  powers: MagicItemPower[],
  itemLookup: Map<string, Equipment>,
): SheetToggleDefinition[] {
  const defs: SheetToggleDefinition[] = []
  const seen = new Set<string>()

  for (const power of powers) {
    if (power.kind !== "conditional" || !power.toggleId) continue
    if (seen.has(power.toggleId)) continue
    seen.add(power.toggleId)
    defs.push({
      id: power.toggleId,
      label: `${itemLookup.get(power.itemId)?.name ?? power.itemName}: ${power.label}`,
      sourceType: "magic_item",
      sourceId: power.itemId,
      defaultActive: false,
    })
  }

  return defs
}

export function proposeMagicItemToggleId(itemId: string, modId: string): string {
  return toggleIdForItemPower(itemId, modId)
}
