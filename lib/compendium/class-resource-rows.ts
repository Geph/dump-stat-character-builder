import { SRD_CLASS_RESOURCES_BY_NAME } from "@/lib/compendium/class-resources-defaults"
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

export function formatUsesSummary(uses: ClassResource["uses"]): string {
  switch (uses.type) {
    case "fixed":
      return `${uses.fixedAmount ?? 1} / ${formatRecharge(uses.recharge)}`
    case "ability_modifier":
      return `${uses.abilityModifier ?? "ability"} mod / ${formatRecharge(uses.recharge)}`
    case "at_level":
      return `Scales by level / ${formatRecharge(uses.recharge)}`
    case "unlimited":
      return "Unlimited"
    default:
      return uses.type
  }
}

function formatRecharge(recharge?: string): string {
  if (recharge === "short_rest") return "short rest"
  if (recharge === "long_rest") return "long rest"
  return recharge ?? "rest"
}
