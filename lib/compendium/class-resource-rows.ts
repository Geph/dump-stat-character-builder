import { SRD_CLASS_RESOURCES_BY_NAME } from "@/lib/compendium/class-resources-defaults"
import { formatUsesRecharges } from "@/lib/compendium/normalize-uses-config"
import { resolveUsesAtLevel } from "@/lib/compendium/resolve-uses-config"
import type { ClassResource, ClassResourceRow } from "@/lib/types"

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
      })
    }
  }
  return rows
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
    default:
      return uses.type
  }
}
