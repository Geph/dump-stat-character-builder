import { buildWeaponSheetContext } from "@/lib/compendium/weapon-sheet-context"
import { getWeaponMastery } from "@/lib/compendium/combat-stats"
import { resolveSubclassUnlockLevel } from "@/lib/builder/choices"
import type { CharacterBuildInputs } from "@/lib/character/types"
import type { Equipment, Feature } from "@/lib/types"
import type { SheetToggleDefinition } from "@/lib/compendium/sheet-toggle-registry"

export const WEAPON_MOUNTED_TOGGLE_PREFIX = "weapon_mounted:"

export function mountedWeaponToggleId(weaponId: string): string {
  return `${WEAPON_MOUNTED_TOGGLE_PREFIX}${weaponId}`
}

export function isMountedWeaponToggleId(toggleId: string): boolean {
  return toggleId.startsWith(WEAPON_MOUNTED_TOGGLE_PREFIX)
}

export function isWeaponMounted(
  activeToggles: Iterable<string> | undefined,
  weaponId: string,
): boolean {
  if (!activeToggles) return false
  const id = mountedWeaponToggleId(weaponId)
  for (const toggle of activeToggles) {
    if (toggle === id) return true
  }
  return false
}

function unlockedFeatures(inputs: CharacterBuildInputs): Feature[] {
  const features: Feature[] = []
  for (const entry of inputs.classLevels) {
    const cls = inputs.classes.find((row) => row.id === entry.classId)
    for (const feature of cls?.features ?? []) {
      if (feature.level <= entry.level) features.push(feature)
    }
    const subclassId = inputs.subclassByClassId[entry.classId]
    if (subclassId && entry.level >= resolveSubclassUnlockLevel(cls)) {
      const subclass = inputs.subclasses.find((row) => row.id === subclassId)
      for (const feature of subclass?.features ?? []) {
        if (feature.level <= entry.level) features.push(feature)
      }
    }
  }
  return features
}

export function characterHasWalkingTurret(inputs: CharacterBuildInputs): boolean {
  return unlockedFeatures(inputs).some((feature) => /^walking turret$/i.test(feature.name ?? ""))
}

export function weaponIsRanged(weapon: Equipment): boolean {
  return (weapon.subcategory ?? "").toLowerCase().includes("ranged")
}

export function weaponHasMountedMastery(weapon: Equipment): boolean {
  return /^mounted$/i.test(getWeaponMastery(weapon) ?? "")
}

/**
 * Walking Turret: holding a Ranged weapon whose mastery you can use.
 * Native Mounted mastery weapons can also be mounted without that feature.
 */
export function canMountWeapon(
  weapon: Equipment,
  inputs: CharacterBuildInputs,
  weaponProficiencies: string[],
): boolean {
  if (!weaponIsRanged(weapon)) return false
  const context = buildWeaponSheetContext(weapon, inputs, weaponProficiencies)
  if (!context.masteryActive && !weaponHasMountedMastery(weapon)) return false
  if (weaponHasMountedMastery(weapon)) return context.masteryActive || characterHasWalkingTurret(inputs)
  return characterHasWalkingTurret(inputs) && context.masteryActive
}

export function equippedWeaponsEligibleToMount(
  inputs: CharacterBuildInputs,
  weapons: Equipment[],
  weaponProficiencies: string[],
): Equipment[] {
  return weapons.filter((weapon) => canMountWeapon(weapon, inputs, weaponProficiencies))
}

export function anyEquippedWeaponIsMounted(
  inputs: CharacterBuildInputs,
  weapons: Equipment[],
  weaponProficiencies: string[],
): boolean {
  return weapons.some(
    (weapon) =>
      isWeaponMounted(inputs.activeSheetToggles, weapon.id) &&
      canMountWeapon(weapon, inputs, weaponProficiencies),
  )
}

export function mountedWeaponToggleDefinitions(
  weapons: Equipment[],
  inputs: CharacterBuildInputs,
  weaponProficiencies: string[],
): SheetToggleDefinition[] {
  return equippedWeaponsEligibleToMount(inputs, weapons, weaponProficiencies).map((weapon) => ({
    id: mountedWeaponToggleId(weapon.id),
    label: `Mounted · ${weapon.name}`,
    sourceType: "class_feature" as const,
    hint: "Bonus Action. Until the end of your turn, damage dice increase one step. Moving costs 1 extra foot per foot.",
  }))
}
