import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { TurnStartTriggerCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import { readLinkedModifiers } from "@/lib/compendium/linked-modifiers"
import { resolveUsesAtLevel, type ResolveUsesContext } from "@/lib/compendium/resolve-uses-config"
import { prefixedResourceKey, slugClassPrefix } from "@/lib/import/third-party-resources"
import type { Feature, UsesConfig } from "@/lib/types"

export type TurnStartTriggerEntry = {
  id: string
  name: string
  classId: string
  classLevel: number
  trigger: TurnStartTriggerCharacteristic
}

function resolveResourceKeyForClass(className: string, resourceKey: string): string {
  if (!resourceKey || className === "Monk") return resourceKey
  if (/\bmonk\b/i.test(className) && resourceKey === "ki_points") {
    return prefixedResourceKey(slugClassPrefix(className), "ki_points")
  }
  return resourceKey
}

export function collectTurnStartTriggers(
  classDetails: CharacterClassDetail[],
): TurnStartTriggerEntry[] {
  const entries: TurnStartTriggerEntry[] = []

  for (const entry of classDetails) {
    const className = entry.class?.name
    const classId = entry.row.class_id
    if (!className || !classId || !entry.class) continue

    for (const feature of entry.class.features ?? []) {
      if ((feature.level ?? 1) > entry.row.level) continue
      for (const instance of readLinkedModifiers(feature)) {
        for (const characteristic of instance.characteristics ?? []) {
          if (characteristic.type !== "turn_start_trigger") continue
          const trigger = characteristic as TurnStartTriggerCharacteristic
          const restoreKey = trigger.restoreResourceKey
            ? resolveResourceKeyForClass(className, trigger.restoreResourceKey)
            : trigger.restoreResourceKey
          entries.push({
            id: `${classId}:${feature.level ?? 1}:${feature.name}:${trigger.id ?? instance.instanceId}`,
            name: trigger.label ?? feature.name,
            classId,
            classLevel: entry.row.level,
            trigger: {
              ...trigger,
              restoreResourceKey: restoreKey,
            },
          })
        }
      }
    }
  }

  return entries
}

export function applyTurnStartTriggers(params: {
  triggers: TurnStartTriggerEntry[]
  usedResourcesById: Record<string, number>
  resourceEntries: { id: string; uses: UsesConfig; classLevel: number }[]
  resolveContext: ResolveUsesContext
  currentHp: number
  maxHp: number
  activeConditions: string[]
}): Record<string, number> {
  const next = { ...params.usedResourcesById }

  for (const entry of params.triggers) {
    const trigger = entry.trigger
    if (
      trigger.blockedByConditions?.some((condition) =>
        params.activeConditions.some((active) =>
          active.toLowerCase().includes(condition.toLowerCase()),
        ),
      )
    ) {
      continue
    }

    if (trigger.hpBelowFraction != null && params.maxHp > 0) {
      const threshold = params.maxHp * trigger.hpBelowFraction
      if (params.currentHp >= threshold) continue
    }
    if (trigger.hpAtLeast != null && params.currentHp < trigger.hpAtLeast) continue

    if (trigger.restoreResourceKey && trigger.restoreResourceAmount != null) {
      const resourceEntry = params.resourceEntries.find((row) =>
        row.id.endsWith(`_${trigger.restoreResourceKey}`),
      )
      if (!resourceEntry) continue
      const max = resolveUsesAtLevel(
        resourceEntry.uses,
        resourceEntry.classLevel,
        params.resolveContext,
      ) ?? 0
      if (max <= 0) continue
      const current = next[resourceEntry.id] ?? 0
      next[resourceEntry.id] = Math.max(0, current - trigger.restoreResourceAmount)
    }
  }

  return next
}
