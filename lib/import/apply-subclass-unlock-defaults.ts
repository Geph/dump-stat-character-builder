import { ensureSubclassUnlockFeature } from "@/lib/compendium/subclass-unlock-modifier"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature } from "@/lib/types"

const KIBBLES_SUBCLASS_FEATURE_NAMES: Record<string, string> = {
  inventor: "Inventor Specialization",
  occultist: "Occult Tradition",
  psion: "Psionic Archetype",
  warden: "Warden Bond",
}

/**
 * Persist explicit subclass-selection modifier metadata into class import JSON.
 * Kibbles classes choose at level 1; other supported class sources default to level 3.
 */
export function applySubclassUnlockDefaults(
  content: ImportContent,
  source: string,
): ImportContent {
  if (!content.classes?.length) return content
  const isKibbles = source.trim().toLowerCase() === "kibbles tasty"
  const unlockLevel = isKibbles ? 1 : 3
  return {
    ...content,
    classes: content.classes.map((cls) => ({
      ...cls,
      features: ensureSubclassUnlockFeature(
        { name: cls.name, features: cls.features as Feature[] },
        unlockLevel,
        isKibbles ? KIBBLES_SUBCLASS_FEATURE_NAMES[cls.name.trim().toLowerCase()] : undefined,
      ) as typeof cls.features,
    })),
  }
}
