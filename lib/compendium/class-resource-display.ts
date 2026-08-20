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
import { SUBCLASS_GATED_CLASS_RESOURCE_KEYS } from "@/lib/compendium/subclass-gated-class-resources"

export type ClassResourceDisplayMode = "tracker" | "static" | "hidden"
export type ClassResourceSemanticKind =
  | "pool"
  | "choice_count"
  | "limit"
  | "die_profile"
  | "combat_state"
  | "menu"

/** Die-size lookup columns — kept for mechanics but never shown on the sheet. */
export const HIDDEN_CLASS_RESOURCE_IDS = new Set([
  "exploit_die_size",
  "endurance_die_size",
  "weapon_mastery",
])

/** Fighter resources surfaced on the Combat Actions panel. */
export const ACTION_PANEL_CLASS_RESOURCE_IDS = new Set(["second_wind"])

/** Only show in the Resources column when subclass/content spends this pool. */
export const SUBCLASS_SPEND_GATED_CLASS_RESOURCE_IDS = SUBCLASS_GATED_CLASS_RESOURCE_KEYS

function isGenericCombatStateTracker(resourceId: string): boolean {
  return /^(?:momentum|grudge_battle_die|adrenaline_battle_die)$/.test(resourceId)
}

export function shouldShowClassResourceOnSheet(
  resourceId: string,
  spendKeys: ReadonlySet<string>,
): boolean {
  // Ownership is filtered before sheet entries are built. Do not hide an owned
  // pool merely because its spends live in custom abilities rather than features.
  void resourceId
  void spendKeys
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
  if (isGenericCombatStateTracker(resource.id)) return "tracker"

  if (hasRecharges(resource.uses)) return "tracker"
  if (spendKeys.has(resource.id)) return "tracker"

  if (resource.uses.type === "special") return "static"

  return "static"
}

export function deriveClassResourceSemanticKind(
  resource: ClassResource,
  spendKeys: ReadonlySet<string> = new Set(),
): ClassResourceSemanticKind {
  const key = resource.id.toLowerCase()
  if (resource.uses.type === "unlimited") return "menu"
  if (
    /(?:momentum|ferocity|balance_of_power|rampage_die|grudge_battle_die|adrenaline_battle_die)/.test(
      key,
    )
  ) {
    return "combat_state"
  }
  if (resource.uses.dieType || resource.uses.dieSidesByLevel?.length) return "die_profile"
  if (
    /(?:_known|_formula|formulas|discoveries|upgrades|manifestations|occult_rites|hexes|grand_hexes|plans_known|replicated_magic_items)/.test(
      key,
    )
  ) {
    return "choice_count"
  }
  if (
    resource.uses.recharges?.length ||
    resource.uses.recharge ||
    resource.uses.rechargeOnInitiative ||
    spendKeys.has(resource.id)
  ) {
    return "pool"
  }
  return "limit"
}

export function resolveStaticResourceLabel(
  resource: ClassResource,
  classLevel: number,
  ctx: ResolveUsesContext = {},
): string | null {
  const uses = resource.uses
  if (uses.type === "unlimited") return "Unlimited"
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
