import type { UsesConfig } from "@/lib/types"

export type ResourceConversionSource =
  | { kind: "spell_slot"; minSpellLevel: number }
  | { kind: "class_resource"; resourceKey: string; resourceAmount?: number }

export type ResourceConversionTarget = {
  resourceKey: string
  restores: number
}

export function readResourceConversionFromUses(
  uses: UsesConfig | null | undefined,
): { source: ResourceConversionSource; target: ResourceConversionTarget } | null {
  if (!uses) return null
  if (uses.restoreBySpellSlot) {
    return {
      source: {
        kind: "spell_slot",
        minSpellLevel: uses.restoreBySpellSlot.minSpellLevel,
      },
      target: {
        resourceKey: uses.classResourceKey ?? "",
        restores: uses.restoreBySpellSlot.restores,
      },
    }
  }
  if (uses.restoreByResource?.resourceKey) {
    return {
      source: {
        kind: "class_resource",
        resourceKey: uses.restoreByResource.resourceKey,
        resourceAmount: uses.restoreByResource.resourceAmount,
      },
      target: {
        resourceKey: uses.classResourceKey ?? "",
        restores: uses.restoreByResource.restores,
      },
    }
  }
  return null
}

/** Apply a spell-slot → resource-pool conversion (e.g. Quarry, Hexmaster). */
export function applySpellSlotToResourceRestore(params: {
  slotsByLevel: number[]
  minSpellLevel: number
  currentUses: number
  maxUses: number
  restores: number
}): { nextUses: number; nextSlots: number[]; applied: boolean } {
  const slotIndex = Math.max(0, params.minSpellLevel - 1)
  const slots = [...params.slotsByLevel]
  while (slots.length <= slotIndex) slots.push(0)
  if ((slots[slotIndex] ?? 0) <= 0) {
    return { nextUses: params.currentUses, nextSlots: params.slotsByLevel, applied: false }
  }
  slots[slotIndex] = Math.max(0, (slots[slotIndex] ?? 0) - 1)
  const nextUses = Math.min(params.maxUses, params.currentUses + Math.max(1, params.restores))
  return { nextUses, nextSlots: slots, applied: true }
}
