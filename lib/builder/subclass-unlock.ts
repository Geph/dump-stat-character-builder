import type { DndClass, Feature } from "@/lib/types"

/** SRD default when a class does not declare an earlier archetype/subclass gate. */
export const DEFAULT_SUBCLASS_LEVEL = 3

/** @deprecated Prefer DEFAULT_SUBCLASS_LEVEL or resolveSubclassUnlockLevel(cls). */
export const SUBCLASS_LEVEL = DEFAULT_SUBCLASS_LEVEL

const SUBCLASS_GATE_TEXT =
  /\b(subclass|bard college|primal path|arcane tradition|divine domain|sacred oath|roguish archetype|martial archetype|druid circle|sorcerous origin|otherworldly patron|monastic tradition|wizard school|psionic archetype)\b/i

const SUBCLASS_GATE_NAME =
  /\b(subclass|college|path|tradition|domain|patron|archetype|circle|school|oath|philosophy|covenant|specialty|calling)\b/i

const SUBCLASS_CHOICE_CATEGORY =
  /\b(college|path|tradition|domain|patron|archetype|circle|school|oath|philosophy|way of|subclass|covenant|specialty|calling)\b/i

/** Later "Archetype Feature" / "Subclass Feature" grants — not the unlock choice. */
export function isSubclassFeatureGrant(feature: Feature): boolean {
  const name = feature.name.trim()
  return (
    /\b(archetype|subclass)\s+features?\b/i.test(name) ||
    /^subclass feature$/i.test(name) ||
    /^archetype feature$/i.test(name)
  )
}

/** True when this class feature is the gate that unlocks subclass/archetype selection. */
export function isSubclassUnlockFeature(feature: Feature): boolean {
  if (isSubclassFeatureGrant(feature)) return false
  const name = feature.name.trim()
  const text = `${name} ${feature.description ?? ""}`
  if (SUBCLASS_GATE_TEXT.test(text)) return true
  if (SUBCLASS_GATE_NAME.test(name)) return true
  if (feature.isChoice && SUBCLASS_CHOICE_CATEGORY.test(feature.choices?.category ?? "")) {
    return true
  }
  return false
}

/**
 * Level at which the builder should require/show subclass (archetype) picks.
 * Prefer the earliest unlock feature on the class; fall back to the SRD default (3).
 */
export function resolveSubclassUnlockLevel(cls: Pick<DndClass, "features"> | null | undefined): number {
  const levels = (cls?.features ?? [])
    .filter(isSubclassUnlockFeature)
    .map((feature) => feature.level)
    .filter((level) => Number.isFinite(level) && level >= 1)
  if (levels.length === 0) return DEFAULT_SUBCLASS_LEVEL
  return Math.min(...levels)
}

/** Label for the unlock feature when present (e.g. "Psionic Archetype"), else "Subclass". */
export function resolveSubclassUnlockLabel(cls: Pick<DndClass, "features"> | null | undefined): string {
  const unlock = (cls?.features ?? [])
    .filter(isSubclassUnlockFeature)
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))[0]
  return unlock?.name?.trim() || "Subclass"
}

export function classNeedsSubclass(
  classLevel: number,
  subclassCount: number,
  unlockLevel: number = DEFAULT_SUBCLASS_LEVEL,
): boolean {
  return classLevel >= unlockLevel && subclassCount > 0
}
