/**
 * game-icons.net slugs for SRD weapons, used by the builder's visual weapon-mastery grid.
 * All slugs are verified to exist under public/icons. Unknown weapons fall back by mastery
 * property, then to a generic crossed-swords icon.
 */
const WEAPON_ICON_BY_NAME: Record<string, string> = {
  Battleaxe: "battle-axe",
  Blowgun: "bamboo",
  Club: "wood-club",
  Dagger: "plain-dagger",
  Dart: "dart",
  Flail: "flail",
  Glaive: "glaive",
  Greataxe: "sharp-axe",
  Greatclub: "spiked-bat",
  Greatsword: "two-handed-sword",
  Halberd: "halberd",
  "Hand Crossbow": "crossbow",
  Handaxe: "war-axe",
  "Heavy Crossbow": "heavy-arrow",
  Javelin: "thrown-spear",
  Lance: "spear-hook",
  "Light Crossbow": "crossbow",
  "Light Hammer": "flat-hammer",
  Longbow: "high-shot",
  Longsword: "broadsword",
  Mace: "flanged-mace",
  Maul: "thor-hammer",
  Morningstar: "spiked-mace",
  Musket: "musket",
  Pike: "pikeman",
  Pistol: "pistol-gun",
  Quarterstaff: "bo",
  Rapier: "pointy-sword",
  Scimitar: "machete",
  Shortbow: "bow-arrow",
  Shortsword: "broad-dagger",
  Sickle: "sickle",
  Sling: "slingshot",
  Spear: "spears",
  Trident: "trident",
  "War Pick": "war-pick",
  Warhammer: "warhammer",
  Whip: "whip",
}

const FALLBACK_ICON = "crossed-swords"

/** Resolve a game-icons.net slug for a weapon by its display name. */
export function weaponIconSlug(weaponName: string): string {
  const exact = WEAPON_ICON_BY_NAME[weaponName.trim()]
  if (exact) return exact

  const lower = weaponName.toLowerCase()
  const match = Object.keys(WEAPON_ICON_BY_NAME).find((name) =>
    lower.includes(name.toLowerCase()),
  )
  if (match) return WEAPON_ICON_BY_NAME[match]

  if (lower.includes("axe")) return "battle-axe"
  if (lower.includes("bow") && lower.includes("cross")) return "crossbow"
  if (lower.includes("bow")) return "bow-arrow"
  if (lower.includes("hammer")) return "warhammer"
  if (lower.includes("sword") || lower.includes("blade")) return "broadsword"
  if (lower.includes("spear") || lower.includes("pike")) return "spears"
  if (lower.includes("mace") || lower.includes("club")) return "flanged-mace"
  if (lower.includes("dagger") || lower.includes("knife")) return "plain-dagger"
  return FALLBACK_ICON
}
