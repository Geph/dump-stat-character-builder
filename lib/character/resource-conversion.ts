import type { UsesConfig } from "@/lib/types"

export type ResourceConversionSource =
  | { kind: "spell_slot"; minSpellLevel: number }
  | { kind: "class_resource"; resourceKey: string; resourceAmount?: number }
  | { kind: "hit_dice"; amount: number }

export type ResourceConversionTarget =
  | { kind: "resource_pool"; resourceKey: string; restores: number }
  | { kind: "refresh_feature_uses"; featureKey: string; restores?: number | null }

export type ResourceConversionRule = {
  source: ResourceConversionSource
  target: ResourceConversionTarget
  label?: string | null
}

export function readResourceConversionFromUses(
  uses: UsesConfig | null | undefined,
): ResourceConversionRule | null {
  if (!uses) return null
  if (uses.restoreBySpellSlot) {
    return {
      source: { kind: "spell_slot", minSpellLevel: uses.restoreBySpellSlot.minSpellLevel },
      target: {
        kind: "resource_pool",
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
        kind: "resource_pool",
        resourceKey: uses.classResourceKey ?? "",
        restores: uses.restoreByResource.restores,
      },
    }
  }
  return null
}

export function readResourceConversionsFromUses(
  uses: UsesConfig | null | undefined,
): ResourceConversionRule[] {
  const legacy = readResourceConversionFromUses(uses)
  const explicit = uses?.resourceConversions ?? []
  if (legacy && !explicit.length) return [legacy]
  return explicit
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

/** Apply class-resource → resource-pool conversion (e.g. Hemoreagent-style). */
export function applyResourceToResourceRestore(params: {
  sourceUsed: number
  sourceMax: number
  sourceAmount: number
  targetUsed: number
  targetMax: number
  restores: number
}): {
  nextSourceUsed: number
  nextTargetUsed: number
  applied: boolean
} {
  const available = params.sourceMax - params.sourceUsed
  if (available < params.sourceAmount) {
    return {
      nextSourceUsed: params.sourceUsed,
      nextTargetUsed: params.targetUsed,
      applied: false,
    }
  }
  const headroom = params.targetMax - params.targetUsed
  if (headroom <= 0) {
    return {
      nextSourceUsed: params.sourceUsed,
      nextTargetUsed: params.targetUsed,
      applied: false,
    }
  }
  const gain = Math.min(headroom, Math.max(1, params.restores))
  return {
    nextSourceUsed: params.sourceUsed + params.sourceAmount,
    nextTargetUsed: Math.max(0, params.targetUsed - gain),
    applied: true,
  }
}
