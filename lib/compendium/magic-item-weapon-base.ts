import { SRD_WEAPON_NAMES } from "@/lib/compendium/weapon-proficiency-options"

const SWORD_BASES = [
  "Glaive",
  "Greatsword",
  "Longsword",
  "Rapier",
  "Scimitar",
  "Shortsword",
] as const

const NAMED_WEAPON_BASES: Record<string, readonly string[]> = {
  "Rod of Lordly Might": ["Mace"],
  "Flame Tongue": SWORD_BASES,
  Defender: SWORD_BASES,
}

const WEAPON_NAMES_BY_LENGTH = [...SRD_WEAPON_NAMES].sort((a, b) => b.length - a.length)

export type MagicItemWeaponBaseSource = {
  name?: string | null
  category?: string | null
  magic_item_category?: string | null
  description?: string | null
  base_equipment_names?: string[] | null
}

function magicType(item: MagicItemWeaponBaseSource): string {
  return (item.magic_item_category ?? "").trim().toLowerCase()
}

function weaponNamesFromDescription(description: string): string[] {
  const haystack = description.replace(/\s+/g, " ")
  const patterns = [
    /wielded as a magic ([^.]+)/i,
    /functions as a magic ([^.]+)/i,
    /can be used as a magic ([^.]+)/i,
  ]
  for (const pattern of patterns) {
    const match = haystack.match(pattern)
    if (!match?.[1]) continue
    const clause = match[1]
    const weapon = WEAPON_NAMES_BY_LENGTH.find((name) =>
      new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(clause),
    )
    if (weapon) return [weapon]
  }
  return []
}

/** Mundane weapon names a magic item should inherit when it has no explicit base. */
export function inferMagicItemWeaponBaseNames(item: MagicItemWeaponBaseSource): string[] {
  if (magicType(item) === "staff") return ["Quarterstaff"]

  const named = item.name ? NAMED_WEAPON_BASES[item.name] : undefined
  if (named?.length) return [...named]

  if (item.description) {
    return weaponNamesFromDescription(item.description)
  }
  return []
}

export function applyInferredMagicItemWeaponBases<T extends MagicItemWeaponBaseSource>(
  item: T,
): T {
  if (item.base_equipment_names?.length) return item
  const inferred = inferMagicItemWeaponBaseNames(item)
  if (!inferred.length) return item
  return { ...item, base_equipment_names: inferred }
}

/** True for mundane weapons and magic items that can be used as a weapon. */
export function isWieldableWeaponItem(item: {
  category?: string | null
  name?: string | null
  magic_item_category?: string | null
  description?: string | null
}): boolean {
  if ((item.category ?? "") === "Weapon") return true
  return inferMagicItemWeaponBaseNames(item).length > 0
}
