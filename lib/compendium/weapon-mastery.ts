import {
  normalizeModifierCatalog,
  type ModifierCatalogEntry,
} from "@/lib/compendium/modifier-catalog"
import type { CustomAbility } from "@/lib/types"

/** Must match {@link WEAPON_MASTERY_PROPERTIES_CATALOG_ID} in system-option-catalogs.ts */
const WEAPON_MASTERY_PROPERTIES_CATALOG_LOOKUP_ID = "00000000-0000-4000-8000-000000000004"

/** 2024 PHB weapon mastery property rules (short reference text). */
export const WEAPON_MASTERY_DESCRIPTIONS: Record<string, string> = {
  Cleave:
    "If you hit a creature with this weapon, you can make an attack against a second creature within 5 feet of the first that is also within your reach.",
  Graze:
    "If your attack roll with this weapon misses a creature, you can deal damage to that creature equal to the ability modifier used for the attack roll. This damage is the same type dealt by the weapon.",
  Nick:
    "When you make the extra attack of the Light property, you can make it as part of the Attack action instead of as a Bonus Action. You can make this extra attack only once per turn.",
  Push:
    "If you hit a creature with this weapon, you can push the creature up to 10 feet straight away from yourself.",
  Sap:
    "If you hit a creature with this weapon, that creature has Disadvantage on its next attack roll before the start of your next turn.",
  Slow:
    "If you hit a creature with this weapon and deal damage to it, you can reduce its Speed by 10 feet until the start of your next turn. If the creature is hit more than once by weapons that have this property, the Speed reduction doesn't exceed 10 feet.",
  Topple:
    "If you hit a creature with this weapon, you can force the creature to make a Constitution saving throw (DC 8 plus the ability modifier used to make the attack roll and your Proficiency Bonus). On a failed save, the creature has the Prone condition.",
  Vex:
    "If you hit a creature with this weapon and deal damage to the creature, you have Advantage on your next attack roll against that creature before the end of your next turn.",
}

export const STANDARD_WEAPON_MASTERY_NAMES = Object.keys(WEAPON_MASTERY_DESCRIPTIONS)

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
}

export function firstClauseOfWeaponMasteryRule(text: string): string {
  const period = text.indexOf(". ")
  if (period > 0) return text.slice(0, period)
  const comma = text.indexOf(", ")
  if (comma > 0 && comma < 120) return text.slice(0, comma)
  return text.length > 100 ? `${text.slice(0, 97)}…` : text
}

export function weaponMasteryCatalogEntriesFromAbilities(
  customAbilities?: CustomAbility[] | null,
): ModifierCatalogEntry[] {
  if (!customAbilities?.length) return []
  const ability = customAbilities.find((row) => row.id === WEAPON_MASTERY_PROPERTIES_CATALOG_LOOKUP_ID)
  if (!ability) return []
  return normalizeModifierCatalog(
    (ability as unknown as Record<string, unknown>).modifier_catalog,
  )
}

export function weaponMasteryPropertyNames(
  catalogEntries?: ModifierCatalogEntry[] | null,
): string[] {
  const names = new Set(STANDARD_WEAPON_MASTERY_NAMES)
  for (const entry of catalogEntries ?? []) {
    const trimmed = entry.name?.trim()
    if (trimmed) names.add(trimmed)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

export function buildWeaponMasteryDescriptionsLookup(
  catalogEntries?: ModifierCatalogEntry[] | null,
): Record<string, string> {
  const lookup: Record<string, string> = { ...WEAPON_MASTERY_DESCRIPTIONS }
  for (const entry of catalogEntries ?? []) {
    const name = entry.name?.trim()
    if (!name) continue
    const fromDescription = entry.description ? stripHtml(entry.description) : null
    const fromSummary = entry.summary?.trim()
    lookup[name] = fromDescription || fromSummary || lookup[name] || name
  }
  return lookup
}

export function describeWeaponMastery(
  name: string,
  catalogEntries?: ModifierCatalogEntry[] | null,
): string | null {
  const trimmed = name.trim()
  if (!trimmed) return null

  if (catalogEntries?.length) {
    const fromCatalog = catalogEntries.find(
      (entry) => entry.name.trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (fromCatalog) {
      if (fromCatalog.description) return stripHtml(fromCatalog.description)
      if (fromCatalog.summary?.trim()) return fromCatalog.summary.trim()
    }
  }

  const exact = WEAPON_MASTERY_DESCRIPTIONS[trimmed]
  if (exact) return exact
  const match = Object.entries(WEAPON_MASTERY_DESCRIPTIONS).find(
    ([key]) => key.toLowerCase() === trimmed.toLowerCase(),
  )
  return match?.[1] ?? null
}
