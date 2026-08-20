import {
  defaultClassIconForName,
  HOMEBREW_CLASS_ICONS_BY_NAME,
  SRD_CLASS_ICONS_BY_NAME,
} from "@/lib/compendium/class-icons-defaults"
import { normalizeCreatureType } from "@/lib/compendium/creature-type-filter"

/** Creature type → game-icons slug when no owning class icon is known. */
export const CREATURE_TYPE_ICONS_BY_NAME: Record<string, string> = {
  Aberration: "tentacles-skull",
  Beast: "wolf-head",
  Celestial: "angel-wings",
  Construct: "robot-golem",
  Dragon: "dragon-head",
  Elemental: "fire-silhouette",
  Fey: "fairy",
  Fiend: "devil-mask",
  Giant: "giant",
  Humanoid: "monk-face",
  Monstrosity: "hydra",
  Ooze: "slime",
  Plant: "plant-roots",
  Undead: "stoned-skull",
}

const GENERIC_SCALE_OWNERS = new Set([
  "caregiver",
  "owner",
  "character",
  "spell",
  "the spell",
  "companion",
])

const KNOWN_CLASS_NAMES = [
  ...Object.keys(SRD_CLASS_ICONS_BY_NAME),
  ...Object.keys(HOMEBREW_CLASS_ICONS_BY_NAME),
  "Artificer",
  "Beastheart",
].sort((a, b) => b.length - a.length)

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function isGenericOwner(name: string): boolean {
  return GENERIC_SCALE_OWNERS.has(name.trim().toLowerCase())
}

function classNameFromHaystack(text: string): string | null {
  const hay = text.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
  if (!hay) return null

  for (const name of KNOWN_CLASS_NAMES) {
    const pattern = escapeRegExp(name).replace(/\\s+/g, "\\s+")
    const classLevel = new RegExp(
      `(?:your\\s+)?${pattern}(?:['\\u2019]s)?(?:\\s+|_)level\\b`,
      "i",
    )
    if (classLevel.test(hay)) return name
  }

  const stripped = hay
    .replace(/^(?:your|the)\s+/i, "")
    .replace(/(?:['\u2019]s)?\s+level$/i, "")
    .trim()
  if (!stripped || isGenericOwner(stripped)) return null
  for (const name of KNOWN_CLASS_NAMES) {
    if (name.toLowerCase() === stripped.toLowerCase()) return name
  }
  return null
}

function classNamesFromScaledObject(value: unknown, into: string[]): void {
  if (!value || typeof value !== "object") return
  if (Array.isArray(value)) {
    for (const entry of value) classNamesFromScaledObject(entry, into)
    return
  }
  const rec = value as Record<string, unknown>
  if (Array.isArray(rec.parts)) {
    for (const part of rec.parts) {
      if (!part || typeof part !== "object") continue
      const ref = (part as { ref?: { kind?: string; className?: string } }).ref
      if (ref?.kind === "class_level" && typeof ref.className === "string" && ref.className.trim()) {
        if (!isGenericOwner(ref.className)) into.push(ref.className.trim())
      }
    }
  }
  for (const child of Object.values(rec)) {
    if (child && typeof child === "object") classNamesFromScaledObject(child, into)
  }
}

function explicitClassName(item: Record<string, unknown>): string | null {
  for (const key of ["class_name", "parent_class_name", "owner_class_name"] as const) {
    const value = item[key]
    if (typeof value === "string" && value.trim() && !isGenericOwner(value)) {
      return value.trim()
    }
  }
  return null
}

function scalingText(item: Record<string, unknown>): string {
  const scaling = item.scaling
  if (!scaling || typeof scaling !== "object") return ""
  const rec = scaling as { scales_with?: unknown; notes?: unknown }
  return [rec.scales_with, rec.notes].filter((part) => typeof part === "string").join(" ")
}

/** Owning D&D class when the creature/companion is class-scaled or explicitly linked. */
export function inferCreatureOwnerClassName(item: Record<string, unknown>): string | null {
  const explicit = explicitClassName(item)
  if (explicit) return explicit

  const fromScaling = classNameFromHaystack(scalingText(item))
  if (fromScaling) return fromScaling

  const fromBlock: string[] = []
  classNamesFromScaledObject(item.stat_block, fromBlock)
  classNamesFromScaledObject(item.import_payload, fromBlock)
  if (fromBlock[0]) return fromBlock[0]

  for (const key of ["description", "hp", "ac"] as const) {
    const value = item[key]
    if (typeof value === "string") {
      const found = classNameFromHaystack(value)
      if (found) return found
    }
  }
  return null
}

export function defaultCreatureTypeIcon(creatureType: string | null | undefined): string | null {
  const type = normalizeCreatureType(creatureType)
  if (!type) return null
  const exact = CREATURE_TYPE_ICONS_BY_NAME[type]
  if (exact) return exact
  const match = Object.entries(CREATURE_TYPE_ICONS_BY_NAME).find(
    ([name]) => name.toLowerCase() === type.toLowerCase(),
  )
  return match?.[1] ?? null
}

/**
 * Assigned icon wins. Otherwise the owning class icon, then creature type.
 */
export function defaultCreatureIconForItem(item: Record<string, unknown>): string | null {
  if (typeof item.icon === "string" && item.icon.trim()) return item.icon.trim()
  const className = inferCreatureOwnerClassName(item)
  if (className) {
    const classIcon = defaultClassIconForName(className)
    if (classIcon) return classIcon
  }
  const type =
    typeof item.creature_type === "string"
      ? item.creature_type
      : typeof item.creatureType === "string"
        ? item.creatureType
        : null
  return defaultCreatureTypeIcon(type)
}
