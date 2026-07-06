import type { StartingEquipmentGroup } from "@/lib/types"
import { enrichSrdClassRow } from "@/lib/compendium/enrich-srd-classes"
import bundledClasses from "@/lib/srd/seed-data/classes.json"
import { isSrdSource } from "@/lib/srd/source"

function normalizeEquipmentItems(raw: unknown): { name: string; quantity: number }[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      name: String(item.name ?? "").trim(),
      quantity:
        typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0
          ? item.quantity
          : 1,
    }))
    .filter((item) => item.name)
}

export function normalizeStartingEquipmentGroups(raw: unknown): StartingEquipmentGroup[] {
  let groups = raw
  if (typeof groups === "string") {
    try {
      groups = JSON.parse(groups)
    } catch {
      return []
    }
  }

  if (!Array.isArray(groups)) return []

  return groups
    .filter((group): group is Record<string, unknown> => !!group && typeof group === "object")
    .map((group) => {
      const options = Array.isArray(group.options)
        ? group.options
            .filter((option): option is Record<string, unknown> => !!option && typeof option === "object")
            .map((option) => ({
              label: String(option.label ?? "").trim(),
              items: normalizeEquipmentItems(option.items),
            }))
            .filter((option) => option.label)
        : []

      return {
        description: String(group.description ?? "Choose one").trim() || "Choose one",
        options,
      }
    })
    .filter((group) => group.options.length > 0)
}

const bundledClassesByName = new Map(
  (bundledClasses as { name: string; starting_equipment_groups?: unknown; starting_gold?: number }[]).map(
    (dndClass) => [dndClass.name, dndClass],
  ),
)

function classHasStartingPackages(groups: StartingEquipmentGroup[]): boolean {
  return groups.some((group) => group.options.length > 0)
}

/** Normalize stored class rows and fill missing starting equipment from bundled SRD seed. */
export function enrichClassesList<
  T extends {
    name: string
    source?: string | null
    starting_equipment_groups?: unknown
    starting_gold?: number | null
  },
>(rows: T[]): T[] {
  return rows.map((row) => {
    const starting_equipment_groups = normalizeStartingEquipmentGroups(row.starting_equipment_groups)
    let enriched: T

    if (classHasStartingPackages(starting_equipment_groups)) {
      enriched = { ...row, starting_equipment_groups }
    } else if (!isSrdSource(row.source)) {
      enriched = { ...row, starting_equipment_groups }
    } else {
      const seed = bundledClassesByName.get(row.name)
      if (!seed) {
        enriched = { ...row, starting_equipment_groups }
      } else {
        const seedGroups = normalizeStartingEquipmentGroups(seed.starting_equipment_groups)
        if (!classHasStartingPackages(seedGroups)) {
          enriched = { ...row, starting_equipment_groups }
        } else {
          enriched = {
            ...row,
            starting_equipment_groups: seedGroups,
            starting_gold:
              typeof row.starting_gold === "number" && row.starting_gold > 0
                ? row.starting_gold
                : typeof seed.starting_gold === "number"
                  ? seed.starting_gold
                  : row.starting_gold,
          }
        }
      }
    }

    if (isSrdSource(row.source)) {
      return enrichSrdClassRow(enriched as unknown as Record<string, unknown>) as T
    }
    return enriched
  })
}
