import type { Feature, UsesConfig } from "@/lib/types"
import type { ClassResource } from "@/lib/types"
import { readLinkedModifiers } from "@/lib/compendium/linked-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import {
  formatResourceDieLabel,
  resolveDieSidesAtLevel,
  resolveTierCountAtLevel,
  resolveUsesAtLevel,
  type ResolveUsesContext,
} from "@/lib/compendium/resolve-uses-config"

export type ClassResourceDisplayMode = "tracker" | "static" | "hidden"

/** Die-size lookup columns — kept for mechanics but never shown on the sheet. */
export const HIDDEN_CLASS_RESOURCE_IDS = new Set([
  "exploit_die_size",
  "endurance_die_size",
  "weapon_mastery",
])

/** Fighter resources surfaced on the Combat Actions panel. */
export const ACTION_PANEL_CLASS_RESOURCE_IDS = new Set([
  "second_wind",
  "action_surge",
  "indomitable",
])

/** Only show in the Resources column when subclass/content spends this pool. */
export const SUBCLASS_SPEND_GATED_CLASS_RESOURCE_IDS = new Set([
  "superiority_dice",
  "psionic_energy_dice",
])

export function shouldShowClassResourceOnSheet(
  resourceId: string,
  spendKeys: ReadonlySet<string>,
): boolean {
  if (SUBCLASS_SPEND_GATED_CLASS_RESOURCE_IDS.has(resourceId) && !spendKeys.has(resourceId)) {
    return false
  }
  return true
}

function hasRecharges(uses: UsesConfig): boolean {
  return (uses.recharges?.length ?? 0) > 0
}

function walkUsesForSpendKeys(uses: UsesConfig | null | undefined, spendKeys: Set<string>): void {
  if (!uses) return
  if (uses.type === "class_resource" && uses.classResourceKey?.trim()) {
    spendKeys.add(uses.classResourceKey.trim())
  }
  if (uses.restoreByResource?.resourceKey?.trim()) {
    spendKeys.add(uses.restoreByResource.resourceKey.trim())
  }
}

function walkFeatureForSpendKeys(
  feature: Feature,
  catalog: ModifierCatalogEntry[],
  spendKeys: Set<string>,
): void {
  for (const option of feature.choices?.options ?? []) {
    if (option.resourceCost && feature.choices?.resourceKey?.trim()) {
      spendKeys.add(feature.choices.resourceKey.trim())
    }
  }
  for (const instance of readLinkedModifiers(feature, catalog)) {
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type === "uses") {
        walkUsesForSpendKeys(characteristic.uses, spendKeys)
      }
    }
  }
}

/** Collect resource keys referenced as activation/spend costs in class content. */
export function collectClassResourceSpendKeys(
  features: Feature[] | null | undefined,
  catalog: ModifierCatalogEntry[] = [],
): Set<string> {
  const spendKeys = new Set<string>()
  for (const feature of features ?? []) {
    walkFeatureForSpendKeys(feature, catalog, spendKeys)
  }
  return spendKeys
}

export function deriveClassResourceDisplay(
  resource: ClassResource,
  spendKeys: ReadonlySet<string>,
): ClassResourceDisplayMode {
  if (resource.display) return resource.display
  if (HIDDEN_CLASS_RESOURCE_IDS.has(resource.id)) return "hidden"

  if (hasRecharges(resource.uses)) return "tracker"
  if (spendKeys.has(resource.id)) return "tracker"

  if (resource.uses.type === "special") return "static"

  return "static"
}

export function resolveStaticResourceLabel(
  resource: ClassResource,
  classLevel: number,
  ctx: ResolveUsesContext = {},
): string | null {
  const uses = resource.uses
  if (uses.type === "special") {
    const table = uses.atLevelTable ?? uses.dieSidesByLevel
    if (table?.length) {
      const count = resolveTierCountAtLevel(table, classLevel)
      if (uses.dieType || uses.dieSidesByLevel?.length) {
        const die = formatResourceDieLabel(uses, classLevel) ?? uses.dieType
        return die ? `${die}` : String(count)
      }
      return String(count)
    }
    return uses.specialDescription?.trim() || null
  }

  const dieLabel = formatResourceDieLabel(uses, classLevel)
  if (dieLabel && !hasRecharges(uses) && resolveUsesAtLevel(uses, classLevel, ctx) == null) {
    return dieLabel
  }

  const max = resolveUsesAtLevel(uses, classLevel, ctx)
  if (max == null) {
    const sides = resolveDieSidesAtLevel(uses, classLevel)
    if (sides != null) return `d${sides}`
    return null
  }
  if (max <= 0) return null
  return dieLabel ? `${max} (${dieLabel})` : String(max)
}

export function isSpendableResourceEntry(
  resource: ClassResource,
  spendKeys: ReadonlySet<string>,
): boolean {
  return deriveClassResourceDisplay(resource, spendKeys) === "tracker"
}
