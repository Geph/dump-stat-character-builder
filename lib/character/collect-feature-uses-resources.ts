import type { ResourceTrackerEntry } from "@/components/character-sheet/resource-uses-tracker"
import { readLinkedModifiers } from "@/lib/compendium/linked-modifiers"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { UsesCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { resolveClassResourcesForClass } from "@/lib/compendium/resolve-class-resources"

function slugLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
}

function featureUsesDuplicatesClassResource(
  usesChar: UsesCharacteristic,
  classResourceIds: ReadonlySet<string>,
  classResourceNames: ReadonlySet<string>,
): boolean {
  if (usesChar.uses.type === "class_resource") return true

  const label = usesChar.label?.trim()
  if (!label) return false

  const normalizedLabel = label.toLowerCase()
  if (classResourceNames.has(normalizedLabel)) return true

  const slug = slugLabel(label)
  return classResourceIds.has(slug)
}

/** Feature-linked uses pools (Innate Arcanum, Innate Sorcery) for the resource tracker. */
export function collectFeatureUsesResources(
  classDetails: CharacterClassDetail[],
  catalog: ModifierCatalogEntry[] = [],
): ResourceTrackerEntry[] {
  const entries: ResourceTrackerEntry[] = []
  const seen = new Set<string>()

  for (const entry of classDetails) {
    const className = entry.class?.name
    const classId = entry.row.class_id
    if (!className || !classId || !entry.class) continue

    const classResources = resolveClassResourcesForClass(entry.class)
    const classResourceIds = new Set(classResources.map((resource) => resource.id))
    const classResourceNames = new Set(
      classResources.map((resource) => resource.name.trim().toLowerCase()),
    )

    for (const feature of entry.class.features ?? []) {
      if ((feature.level ?? 1) > entry.row.level) continue
      for (const instance of readLinkedModifiers(feature, catalog)) {
        for (const characteristic of instance.characteristics ?? []) {
          if (characteristic.type !== "uses") continue
          const usesChar = characteristic as UsesCharacteristic
          if (
            featureUsesDuplicatesClassResource(usesChar, classResourceIds, classResourceNames)
          ) {
            continue
          }
          const label = usesChar.label?.trim()
          if (!label) continue
          const id = `${classId}_feature_${slugLabel(label)}`
          if (seen.has(id)) continue
          seen.add(id)
          entries.push({
            id,
            name:
              classDetails.length > 1 ? `${label} (${className})` : label,
            uses: usesChar.uses,
            classLevel: entry.row.level,
          })
        }
      }
    }
  }

  return entries
}
