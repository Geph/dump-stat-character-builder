import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { AbilityScoreKey, TurnStartTriggerCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import { readLinkedModifiers } from "@/lib/compendium/linked-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { resolveUsesAtLevel, type ResolveUsesContext } from "@/lib/compendium/resolve-uses-config"
import { accrueResource, tickAccumulatedResources } from "@/lib/character/real-time-recharge"
import type { AccumulatedResourceState } from "@/lib/character/sheet-play-state"
import { prefixedResourceKey, slugClassPrefix } from "@/lib/import/third-party-resources"
import { rollDice } from "@/lib/dice/roll-die"
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

function scanFeatureList(
  features: Feature[] | undefined,
  ctx: { className: string; classId: string; classLevel: number },
  into: TurnStartTriggerEntry[],
  catalog: ModifierCatalogEntry[],
) {
  for (const feature of features ?? []) {
    if ((feature.level ?? 1) > ctx.classLevel) continue
    for (const instance of readLinkedModifiers(feature, catalog)) {
      for (const characteristic of instance.characteristics ?? []) {
        if (characteristic.type !== "turn_start_trigger") continue
        const trigger = characteristic as TurnStartTriggerCharacteristic
        const restoreKey = trigger.restoreResourceKey
          ? resolveResourceKeyForClass(ctx.className, trigger.restoreResourceKey)
          : trigger.restoreResourceKey
        into.push({
          id: `${ctx.classId}:${feature.level ?? 1}:${feature.name}:${trigger.id ?? instance.instanceId}`,
          name: trigger.label ?? feature.name,
          classId: ctx.classId,
          classLevel: ctx.classLevel,
          trigger: {
            ...trigger,
            restoreResourceKey: restoreKey,
          },
        })
      }
    }
  }
}

export function collectTurnStartTriggers(
  classDetails: CharacterClassDetail[],
  catalog: ModifierCatalogEntry[] = [],
): TurnStartTriggerEntry[] {
  const entries: TurnStartTriggerEntry[] = []

  for (const entry of classDetails) {
    const className = entry.class?.name
    const classId = entry.row.class_id
    if (!className || !classId || !entry.class) continue

    scanFeatureList(entry.class.features, {
      className,
      classId,
      classLevel: entry.row.level,
    }, entries, catalog)

    if (entry.subclass) {
      scanFeatureList(entry.subclass.features as Feature[] | undefined, {
        className,
        classId,
        classLevel: entry.row.level,
      }, entries, catalog)
    }
  }

  return entries
}

function abilityModForKey(
  key: AbilityScoreKey | null | undefined,
  abilityMods: Record<string, number>,
): number {
  if (!key) return 0
  return abilityMods[key] ?? 0
}

const DIE_SIDES: Record<string, number> = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 }

function resolveTurnStartHealAmount(
  trigger: TurnStartTriggerCharacteristic,
  abilityMods: Record<string, number>,
): number {
  const base =
    trigger.healMode === "ability_modifier"
      ? abilityModForKey(trigger.healAbility, abilityMods)
      : trigger.healMode === "dice" && trigger.healDiceCount && trigger.healDieType
        ? rollDice(trigger.healDiceCount, DIE_SIDES[trigger.healDieType] ?? 0)
        : trigger.healMode === "fixed"
          ? trigger.healFixed ?? 0
          : 0
  return Math.max(0, base + (trigger.healFlatBonus ?? 0))
}

export function applyTurnStartTriggers(params: {
  triggers: TurnStartTriggerEntry[]
  usedResourcesById: Record<string, number>
  resourceEntries: { id: string; uses: UsesConfig; classLevel: number }[]
  resolveContext: ResolveUsesContext
  currentHp: number
  maxHp: number
  activeConditions: string[]
  activeSheetToggleIds?: readonly string[]
  accumulatedResources?: Record<string, AccumulatedResourceState>
  abilityMods?: Record<string, number>
}): {
  usedResourcesById: Record<string, number>
  accumulatedResources: Record<string, AccumulatedResourceState>
  currentHp: number
} {
  const next = { ...params.usedResourcesById }
  let accumulated = tickAccumulatedResources(params.accumulatedResources ?? {})
  const toggles = params.activeSheetToggleIds ?? []
  const abilityMods = params.abilityMods ?? {}
  let currentHp = params.currentHp

  for (const entry of params.triggers) {
    const trigger = entry.trigger
    if (trigger.requiresSheetToggle && !toggles.includes(trigger.requiresSheetToggle)) {
      continue
    }
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
      if (currentHp >= threshold) continue
    }
    if (trigger.hpAtLeast != null && currentHp < trigger.hpAtLeast) continue

    if (trigger.healMode) {
      const amount = resolveTurnStartHealAmount(trigger, abilityMods)
      if (amount > 0 && params.maxHp > 0) {
        currentHp = Math.min(params.maxHp, currentHp + amount)
      }
      continue
    }

    if (
      trigger.accrueResourceKey &&
      trigger.accrueResourceAmount != null &&
      trigger.accrueResourceMaxAbility
    ) {
      const cap = Math.max(0, abilityModForKey(trigger.accrueResourceMaxAbility, abilityMods))
      if (cap <= 0) continue
      accumulated = accrueResource({
        accumulated,
        resourceKey: trigger.accrueResourceKey,
        amount: trigger.accrueResourceAmount,
        max: cap,
        decayMinutes: trigger.accrueDecayMinutes ?? 1,
      })
      continue
    }

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

  return { usedResourcesById: next, accumulatedResources: accumulated, currentHp }
}
