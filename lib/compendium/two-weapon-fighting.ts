import type { Feat } from "@/lib/types"
import { hasWeaponProperty, type AbilityMods } from "@/lib/compendium/combat-stats"

export function isLightWeapon(weapon: { properties?: unknown }): boolean {
  return hasWeaponProperty(weapon as import("@/lib/types").Equipment, "light")
}

export function characterHasTwoWeaponFighting(feats: Feat[]): boolean {
  return feats.some((feat) => /^two-?weapon fighting$/i.test(feat.name.trim()))
}

/** Off-hand bonus-action damage omits positive ability mod unless Two-Weapon Fighting applies. */
export function defaultOffHandIncludesAbilityMod(
  abilityMod: number,
  hasTwoWeaponFighting: boolean,
): boolean {
  if (hasTwoWeaponFighting) return true
  return abilityMod < 0
}

export function offHandDamageIncludesAbilityMod(
  abilityMod: number,
  hasTwoWeaponFighting: boolean,
  manualInclude?: boolean,
): boolean {
  if (manualInclude != null) return manualInclude
  return defaultOffHandIncludesAbilityMod(abilityMod, hasTwoWeaponFighting)
}
