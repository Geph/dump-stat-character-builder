import { formatClassComplexityPhrase, resolveClassComplexity } from "@/lib/compendium/class-complexity"
import type { CompendiumThemeColorId } from "@/lib/compendium/theme-colors"
import { resolveClassResourcesForClass } from "@/lib/compendium/resolve-class-resources"
import { isWeaponMasteryFeature } from "@/lib/compendium/weapon-mastery-choice"
import type { ClassResource, DndClass } from "@/lib/types"

export type ClassDetailHeroBadge = {
  label: string
  emphasis?: boolean
  /** Fixed palette slot — complexity uses violet so it stays distinct from class accent. */
  themeColor?: CompendiumThemeColorId
}

export const CLASS_COMPLEXITY_BADGE_COLOR: CompendiumThemeColorId = "violet"

const GENERIC_SPELL_RESOURCE_IDS = new Set(["spell_slots", "pact_magic_slots"])

/** First matching resource id per class — iconic spendable pools for the detail hero. */
const SIGNATURE_RESOURCE_PRIORITY: Record<string, string[]> = {
  Barbarian: ["rage"],
  Bard: ["bardic_inspiration"],
  Cleric: ["channel_divinity"],
  Druid: ["wild_shape"],
  Fighter: ["second_wind"],
  Monk: ["focus_points"],
  Paladin: ["lay_on_hands", "channel_divinity"],
  Ranger: [],
  Rogue: [],
  Sorcerer: ["sorcery_points"],
  Warlock: [],
  Wizard: [],
  Artificer: [],
}

/** When no spendable pool applies, fall back to a level 1–3 feature name. */
const SIGNATURE_FEATURE_FALLBACK: Record<string, string> = {
  Wizard: "Arcane Recovery",
  Ranger: "Favored Enemy",
  Rogue: "Sneak Attack",
  Artificer: "Tinker's Magic",
  Warlock: "Eldritch Invocations",
}

function resourceUnlockedByLevel(resource: ClassResource, maxLevel = 3): boolean {
  const uses = resource.uses
  if (!uses) return true
  if (uses.type === "fixed") return true
  const table = uses.atLevelTable
  if (!table?.length) return true
  return table.some((row) => row.level <= maxLevel && row.count > 0)
}

export function classHasWeaponMastery(cls: DndClass): boolean {
  return (cls.features ?? []).some((feature) => isWeaponMasteryFeature(feature))
}

export function spellcastingCharacteristicLabel(cls: DndClass): string | null {
  const spellcasting = cls.spellcasting
  if (!spellcasting) return null
  if (spellcasting.pact_magic || spellcasting.type === "pact" || spellcasting.caster_progression === "pact") {
    return "PACT MAGIC"
  }
  if (spellcasting.point_pool?.replaces_spell_slots) return "POINT POOL CASTER"
  if (spellcasting.spellbook || spellcasting.prepared) return "PREPARED CASTER"
  if (spellcasting.caster_progression === "half") return "HALF CASTER"
  if (spellcasting.caster_progression === "third") return "THIRD CASTER"
  return "SPELLCASTER"
}

function signatureResourceBadges(cls: DndClass): ClassDetailHeroBadge[] {
  const resources = resolveClassResourcesForClass(cls).filter(
    (resource) => !GENERIC_SPELL_RESOURCE_IDS.has(resource.id),
  )
  const priority = SIGNATURE_RESOURCE_PRIORITY[cls.name] ?? []
  const badges: ClassDetailHeroBadge[] = []

  for (const resourceId of priority) {
    const resource = resources.find((entry) => entry.id === resourceId)
    if (!resource || !resourceUnlockedByLevel(resource)) continue
    badges.push({ label: resource.name.toUpperCase(), emphasis: true })
  }

  if (badges.length > 0) return badges

  const earlyResources = resources
    .filter((resource) => resourceUnlockedByLevel(resource))
    .slice(0, 2)
  return earlyResources.map((resource) => ({
    label: resource.name.toUpperCase(),
    emphasis: true,
  }))
}

function signatureFeatureFallbackBadge(cls: DndClass): ClassDetailHeroBadge | null {
  const fallbackName = SIGNATURE_FEATURE_FALLBACK[cls.name]
  if (!fallbackName) return null
  const feature = (cls.features ?? []).find(
    (entry) =>
      entry.level <= 3 &&
      entry.name.localeCompare(fallbackName, undefined, { sensitivity: "accent" }) === 0,
  )
  if (!feature) return null
  return { label: feature.name.toUpperCase(), emphasis: true }
}

export function getClassComplexityHeroBadge(
  cls: Pick<DndClass, "name" | "complexity">,
): ClassDetailHeroBadge | null {
  const complexity = resolveClassComplexity(cls)
  if (!complexity) return null
  return {
    label: formatClassComplexityPhrase(complexity),
    themeColor: CLASS_COMPLEXITY_BADGE_COLOR,
  }
}

/** Characteristic + signature badges for the class detail overlay hero. */
export function getClassDetailHeroBadges(cls: DndClass): ClassDetailHeroBadge[] {
  const badges: ClassDetailHeroBadge[] = []

  const spellLabel = spellcastingCharacteristicLabel(cls)
  if (spellLabel) badges.push({ label: spellLabel })

  if (classHasWeaponMastery(cls)) {
    badges.push({ label: "WEAPON MASTERY" })
  }

  const resourceBadges = signatureResourceBadges(cls)
  if (resourceBadges.length > 0) {
    badges.push(...resourceBadges)
    return badges
  }

  const fallback = signatureFeatureFallbackBadge(cls)
  if (fallback) badges.push(fallback)

  return badges
}
