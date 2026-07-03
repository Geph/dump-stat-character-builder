import type { ResourceTrackerEntry } from "@/components/character-sheet/resource-uses-tracker"
import { readLinkedModifiers } from "@/lib/compendium/linked-modifiers"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { UsesCharacteristic } from "@/lib/compendium/characteristic-modifiers"

function slugLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
}

/** Feature-linked uses pools (Innate Arcanum, Innate Sorcery) for the resource tracker. */
export function collectFeatureUsesResources(
  classDetails: CharacterClassDetail[],
): ResourceTrackerEntry[] {
  const entries: ResourceTrackerEntry[] = []
  const seen = new Set<string>()

  for (const entry of classDetails) {
    const className = entry.class?.name
    const classId = entry.row.class_id
    if (!className || !classId || !entry.class) continue

    for (const feature of entry.class.features ?? []) {
      if ((feature.level ?? 1) > entry.row.level) continue
      for (const instance of readLinkedModifiers(feature)) {
        for (const characteristic of instance.characteristics ?? []) {
          if (characteristic.type !== "uses") continue
          const usesChar = characteristic as UsesCharacteristic
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
