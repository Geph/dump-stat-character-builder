import type { Feature, StartingEquipmentGroup } from "@/lib/types"
import { defaultClassIconForName } from "@/lib/compendium/class-icons-defaults"
import { SRD_CLASS_CARD_IMAGES_BY_NAME } from "@/lib/compendium/class-card-images-defaults"
import { applyBundledCardImage } from "@/lib/compendium/card-image"
import { enrichSrdClassRow } from "@/lib/compendium/enrich-srd-classes"
import { wireClassToolProficiencyChoices } from "@/lib/compendium/class-tool-proficiencies"
import { sanitizeAlchemistFeatures } from "@/lib/compendium/alchemist-feature-wiring"
import { sanitizeCaptainFeatures } from "@/lib/compendium/captain-feature-wiring"
import bundledClasses from "@/lib/srd/seed-data/classes.json"
import { isSrdSource } from "@/lib/srd/source"

const PLAYER_FACING_GUIDANCE_BOUNDARIES = [
  "Inventor Specialization is the subclass unlock.",
  "Specialization Upgrade uses optionsSource",
  "KibblesTasty Inventor is an Intelligence half caster",
  "Runes Marked is class_resources.",
  "Warden Bond is the subclass unlock",
  "Primal Manifestations use optionsSource",
  "Dump Stat sets endurance_dice",
  "Endurance Dice column",
  "KibblesTasty Occultist is a Wisdom full caster",
  "Occult Rites use optionsSource",
  "Occult Tradition is the subclass unlock",
] as const

export function stripInternalClassFeatureGuidance(description: string): string {
  let cutAt = description.length
  for (const marker of PLAYER_FACING_GUIDANCE_BOUNDARIES) {
    const index = description.indexOf(marker)
    if (index >= 0) cutAt = Math.min(cutAt, index)
  }
  if (cutAt === description.length) return description
  const paragraphStart = description.lastIndexOf("<p", cutAt)
  if (paragraphStart >= 0 && /^<p[^>]*>\s*$/i.test(description.slice(paragraphStart, cutAt))) {
    cutAt = paragraphStart
  }
  return description.slice(0, cutAt).trim()
}

function sanitizeClassFeatureDescriptions<T>(row: T): T {
  const features = (row as { features?: unknown }).features
  if (!Array.isArray(features)) return row
  return {
    ...row,
    features: features.map((feature) => {
      if (!feature || typeof feature !== "object") return feature
      const record = feature as Record<string, unknown>
      if (typeof record.description !== "string") return feature
      return {
        ...record,
        description: stripInternalClassFeatureGuidance(record.description),
      }
    }),
  }
}

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
  (
    bundledClasses as {
      name: string
      starting_equipment_groups?: unknown
      starting_gold?: number
      tool_proficiencies?: string[] | null
    }[]
  ).map((dndClass) => [dndClass.name, dndClass]),
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
    tool_proficiencies?: string[] | null
    features?: unknown
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

    // Backfill tool_proficiencies from bundled SRD seed when older DB rows omit the column.
    if (
      isSrdSource(row.source) &&
      !(Array.isArray(enriched.tool_proficiencies) && enriched.tool_proficiencies.length) &&
      bundledClassesByName.get(row.name)?.tool_proficiencies?.length
    ) {
      enriched = {
        ...enriched,
        tool_proficiencies: [...(bundledClassesByName.get(row.name)!.tool_proficiencies ?? [])],
      }
    }

    if (isSrdSource(row.source)) {
      // enrichSrdClassRow injects Bard/Monk tool picks, then wires any remaining
      // choice phrases from tool_proficiencies.
      return enrichSrdClassRow(enriched as unknown as Record<string, unknown>) as T
    }

    enriched = sanitizeClassFeatureDescriptions(enriched)
    if (/alchemist/i.test(enriched.name)) {
      const features = sanitizeAlchemistFeatures((enriched as { features?: Feature[] }).features)
      if (features) enriched = { ...enriched, features }
    }
    if (/captain/i.test(enriched.name)) {
      const features = sanitizeCaptainFeatures((enriched as { features?: Feature[] }).features)
      if (features) enriched = { ...enriched, features }
    }
    enriched = wireClassToolProficiencyChoices(
      enriched as T & { features?: Feature[] | null; tool_proficiencies?: string[] | null },
    ) as T

    const withIcon = (() => {
      const existingIcon = (enriched as { icon?: unknown }).icon
      if (typeof existingIcon === "string" && existingIcon.trim()) {
        return { ...enriched, icon: existingIcon.trim() }
      }
      const defaultIcon = defaultClassIconForName(enriched.name)
      return defaultIcon ? { ...enriched, icon: defaultIcon } : enriched
    })()

    // Artificer / Psion / other named imports get bundled card art the same way
    // subclasses do — source does not need to be SRD.
    return applyBundledCardImage(
      withIcon as unknown as Record<string, unknown>,
      SRD_CLASS_CARD_IMAGES_BY_NAME,
    ) as T
  })
}
