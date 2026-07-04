import type { ResourceTrackerEntry } from "@/components/character-sheet/resource-uses-tracker"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { UsesCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import { resolveUsesAtLevel, type ResolveUsesContext } from "@/lib/compendium/resolve-uses-config"
import { readMagicEffects } from "@/lib/compendium/equipment-magic"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { Equipment, UsesConfig } from "@/lib/types"

/** Read the first activation cost from magic item linked modifiers (shared-pool or fixed uses). */
export function readActivationUsesFromInstances(
  instances: LinkedModifierInstance[] | null | undefined,
): UsesConfig | null {
  for (const instance of instances ?? []) {
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type === "uses") {
        return (characteristic as UsesCharacteristic).uses
      }
    }
  }
  return null
}

export function readActivationUsesFromEquipment(item: Equipment): UsesConfig | null {
  return readActivationUsesFromInstances(readMagicEffects(item))
}

export function resolveClassResourceTrackerEntry(params: {
  resourceKey: string
  resourceEntries: ResourceTrackerEntry[]
  classDetails: CharacterClassDetail[]
}): ResourceTrackerEntry | null {
  for (const entry of params.resourceEntries) {
    const uses = entry.uses
    if (uses.type === "class_resource" && uses.classResourceKey === params.resourceKey) {
      return entry
    }
    if (uses.type !== "class_resource" && entry.id.endsWith(`_${params.resourceKey}`)) {
      return entry
    }
  }

  for (const detail of params.classDetails) {
    const classId = detail.row.class_id
    if (!classId) continue
    const id = `${classId}_${params.resourceKey}`
    const match = params.resourceEntries.find((entry) => entry.id === id)
    if (match) return match
  }

  return null
}

export function activationCostAmount(uses: UsesConfig | null | undefined): number {
  if (!uses) return 0
  if (uses.type === "class_resource") return Math.max(1, uses.classResourceAmount ?? 1)
  if (uses.type === "fixed") return Math.max(1, uses.fixedAmount ?? 1)
  return 1
}

export function remainingClassResourceUses(params: {
  uses: UsesConfig
  resourceEntry: ResourceTrackerEntry
  usedResourcesById: Record<string, number>
  resolveContext: ResolveUsesContext
}): number {
  const max = resolveUsesAtLevel(params.resourceEntry.uses, params.resourceEntry.classLevel, params.resolveContext)
  if (max == null || max <= 0) return 0
  const used = params.usedResourcesById[params.resourceEntry.id] ?? 0
  return Math.max(0, max - used)
}

export function canSpendActivationUses(params: {
  uses: UsesConfig | null | undefined
  resourceEntries: ResourceTrackerEntry[]
  usedResourcesById: Record<string, number>
  resolveContext: ResolveUsesContext
  classDetails: CharacterClassDetail[]
}): boolean {
  if (!params.uses) return true
  if (params.uses.type === "class_resource" && params.uses.classResourceKey) {
    const entry = resolveClassResourceTrackerEntry({
      resourceKey: params.uses.classResourceKey,
      resourceEntries: params.resourceEntries,
      classDetails: params.classDetails,
    })
    if (!entry) return false
    const remaining = remainingClassResourceUses({
      uses: params.uses,
      resourceEntry: entry,
      usedResourcesById: params.usedResourcesById,
      resolveContext: params.resolveContext,
    })
    return remaining >= activationCostAmount(params.uses)
  }
  return true
}

export function applyActivationUsesSpend(params: {
  uses: UsesConfig
  resourceEntries: ResourceTrackerEntry[]
  usedResourcesById: Record<string, number>
  classDetails: CharacterClassDetail[]
}): Record<string, number> | null {
  if (params.uses.type !== "class_resource" || !params.uses.classResourceKey) return null
  const entry = resolveClassResourceTrackerEntry({
    resourceKey: params.uses.classResourceKey,
    resourceEntries: params.resourceEntries,
    classDetails: params.classDetails,
  })
  if (!entry) return null
  const cost = activationCostAmount(params.uses)
  const current = params.usedResourcesById[entry.id] ?? 0
  return { ...params.usedResourcesById, [entry.id]: current + cost }
}
