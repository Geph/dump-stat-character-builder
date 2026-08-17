import { getWeaponPropertyTags } from "@/lib/compendium/combat-stats"
import type { Equipment } from "@/lib/types"

export type WeaponPrerequisiteTarget = {
  subcategory?: string | null
  properties?: string[]
  damageType?: string | null
}

export type WeaponPrerequisiteClause =
  | { kind: "melee" }
  | { kind: "ranged" }
  | { kind: "property"; name: string }
  | { kind: "damage"; name: string }

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ")
}

export function weaponTargetFromEquipment(weapon: Equipment): WeaponPrerequisiteTarget {
  return {
    subcategory: weapon.subcategory,
    properties: getWeaponPropertyTags(weapon),
    damageType: weapon.damage_type,
  }
}

export function classifyWeaponPrerequisiteClause(clause: string): WeaponPrerequisiteClause | null {
  const text = clause.replace(/[.]/g, "").trim()
  if (!text) return null
  if (/^(melee)\s+weapons?$/i.test(text)) return { kind: "melee" }
  if (/^(ranged)\s+weapons?$/i.test(text)) return { kind: "ranged" }

  const propertyMatch = text.match(/^(.+?)\s+propert(?:y|ies)$/i)
  if (propertyMatch?.[1]) return { kind: "property", name: propertyMatch[1].trim() }

  const damageMatch = text.match(/^(.+?)\s+damage$/i)
  if (damageMatch?.[1]) return { kind: "damage", name: damageMatch[1].trim() }

  return null
}

export function isWeaponPrerequisiteClause(clause: string): boolean {
  return classifyWeaponPrerequisiteClause(clause) != null
}

function listHasTag(tags: string[] | undefined, required: string): boolean {
  const needle = normalize(required)
  if (!needle) return false
  return (tags ?? []).some((tag) => {
    const haystack = normalize(tag)
    return haystack === needle || haystack.includes(needle) || needle.includes(haystack)
  })
}

export function weaponSatisfiesPrerequisiteClause(
  clause: string,
  weapon: WeaponPrerequisiteTarget,
): boolean {
  const classified = classifyWeaponPrerequisiteClause(clause)
  if (!classified) return false
  const subcategory = weapon.subcategory ?? ""
  if (classified.kind === "melee") return /melee/i.test(subcategory)
  if (classified.kind === "ranged") return /ranged/i.test(subcategory)
  if (classified.kind === "property") return listHasTag(weapon.properties, classified.name)
  return listHasTag(
    [weapon.damageType ?? "", ...(weapon.properties ?? [])].filter(Boolean),
    classified.name,
  )
}

export function stripClassOnlyBrackets(prerequisite: string): {
  cleaned: string
  classOnlyNames: string[]
} {
  const classOnlyNames: string[] = []
  const cleaned = prerequisite
    .replace(/\[([^\]]+?)\s+only\]/gi, (_, name: string) => {
      if (name.trim()) classOnlyNames.push(name.trim())
      return " "
    })
    .replace(/\(([^)]+?)\s+only\)/gi, (_, name: string) => {
      if (name.trim()) classOnlyNames.push(name.trim())
      return " "
    })
    .replace(/\s+/g, " ")
    .trim()
  return { cleaned, classOnlyNames }
}
