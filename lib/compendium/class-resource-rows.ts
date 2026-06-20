import { SRD_CLASS_RESOURCES_BY_NAME } from "@/lib/compendium/class-resources-defaults"
import { formatUsesRecharges } from "@/lib/compendium/normalize-uses-config"
import { resolveUsesAtLevel } from "@/lib/compendium/resolve-uses-config"
import type { ClassResource, ClassResourceRow } from "@/lib/types"
import { SRD_CREATOR_URL } from "@/lib/srd/source"

export function rowToClassResource(
  row: Pick<ClassResourceRow, "resource_key" | "name" | "description" | "uses">,
): ClassResource {
  return {
    id: row.resource_key,
    name: row.name,
    description: row.description ?? undefined,
    uses: row.uses,
  }
}

export function resourcesForClass(
  classId: string,
  rows: Pick<ClassResourceRow, "class_id" | "resource_key" | "name" | "description" | "uses">[],
): ClassResource[] {
  return rows.filter((row) => row.class_id === classId).map(rowToClassResource)
}

export function buildSrdClassResourceRows(
  classIdMap: Map<string, string>,
  source = "SRD",
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  for (const [className, resources] of Object.entries(SRD_CLASS_RESOURCES_BY_NAME)) {
    const class_id = classIdMap.get(className)
    if (!class_id) continue
    for (const resource of resources) {
      rows.push({
        class_id,
        resource_key: resource.id,
        name: resource.name,
        description: resource.description ?? "",
        uses: resource.uses,
        source,
        creator_url: source === "SRD" || source === "D&D 5.5e SRD" ? SRD_CREATOR_URL : null,
      })
    }
  }
  return rows
}

export type ClassResourceGroup = {
  resourceKey: string
  label: string
  items: ClassResourceRow[]
}

export type ClassResourceVariantGroup = {
  /** Short label for this uses pattern (e.g. tier table summary). */
  usesLabel: string
  items: ClassResourceRow[]
}

/** Group compendium rows that share a resource_key (e.g. Channel Divinity, Spell Slots). */
export function groupClassResourcesByKey(
  resources: ClassResourceRow[],
  classNamesById: Record<string, string>,
): ClassResourceGroup[] {
  const byKey = new Map<string, ClassResourceRow[]>()
  for (const resource of resources) {
    const key = resource.resource_key.trim() || resource.name.trim().toLowerCase().replace(/\s+/g, "_")
    const list = byKey.get(key) ?? []
    list.push(resource)
    byKey.set(key, list)
  }

  const groups: ClassResourceGroup[] = []
  for (const [resourceKey, items] of byKey) {
    items.sort((a, b) => {
      const classA = classNamesById[a.class_id] ?? ""
      const classB = classNamesById[b.class_id] ?? ""
      return classA.localeCompare(classB)
    })
    groups.push({
      resourceKey,
      label: items[0]?.name ?? resourceKey.replace(/_/g, " "),
      items,
    })
  }

  return sortClassResourceGroups(groups)
}

/** Shared resources first (by class count), then alphabetical. */
export function sortClassResourceGroups(groups: ClassResourceGroup[]): ClassResourceGroup[] {
  return [...groups].sort((a, b) => {
    if (a.items.length !== b.items.length) return b.items.length - a.items.length
    return a.label.localeCompare(b.label)
  })
}

/** Split a resource family by distinct uses configs (e.g. full vs half caster spell slots). */
export function variantGroupsWithinResource(
  group: ClassResourceGroup,
  classNamesById: Record<string, string>,
): ClassResourceVariantGroup[] {
  const byUses = new Map<string, ClassResourceRow[]>()
  for (const item of group.items) {
    const usesKey = JSON.stringify(item.uses)
    const list = byUses.get(usesKey) ?? []
    list.push(item)
    byUses.set(usesKey, list)
  }

  const variants: ClassResourceVariantGroup[] = []
  for (const items of byUses.values()) {
    items.sort((a, b) => {
      const classA = classNamesById[a.class_id] ?? ""
      const classB = classNamesById[b.class_id] ?? ""
      return classA.localeCompare(classB)
    })
    variants.push({
      usesLabel: formatUsesSummary(items[0]!.uses),
      items,
    })
  }

  return variants.sort((a, b) => b.items.length - a.items.length || a.usesLabel.localeCompare(b.usesLabel))
}

export function classResourceGroupClassPreview(
  group: ClassResourceGroup,
  classNamesById: Record<string, string>,
  maxNames = 3,
): string {
  const names = group.items.map((item) => classNamesById[item.class_id] ?? "Unknown")
  if (names.length <= maxNames) return names.join(" · ")
  return `${names.slice(0, maxNames).join(" · ")} +${names.length - maxNames}`
}

export function formatUsesSummary(uses: ClassResource["uses"], characterLevel = 20): string {
  const rechargeLabel = formatUsesRecharges(uses)
  switch (uses.type) {
    case "fixed":
      return `${uses.fixedAmount ?? 1} / ${rechargeLabel}`
    case "proficiency":
      return `Proficiency bonus / ${rechargeLabel}`
    case "ability_modifier":
      return `${uses.abilityModifier ?? "Ability"} mod / ${rechargeLabel}`
    case "class_resource":
      return uses.classResourceKey
        ? `Uses ${uses.classResourceKey.replace(/_/g, " ")} pool`
        : "Class resource pool"
    case "at_level": {
      const resolved = resolveUsesAtLevel(uses, characterLevel)
      if (uses.atLevelMode === "multiply_level") {
        const mult = uses.atLevelTable?.[0]?.count ?? 1
        return `Level × ${mult} (e.g. ${resolved ?? "?"} at ${characterLevel}) / ${rechargeLabel}`
      }
      const tiers = (uses.atLevelTable ?? [])
        .map((row) => `${row.count} @${row.level}`)
        .join(", ")
      return tiers ? `${tiers} / ${rechargeLabel}` : `Scales by level / ${rechargeLabel}`
    }
    case "unlimited":
      return "Unlimited"
    case "special":
      return uses.specialDescription?.trim() || "Special uses (see description)"
    default:
      return uses.type
  }
}
