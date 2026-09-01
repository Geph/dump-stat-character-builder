import {
  calculateWeaponAttack,
  getWeaponAttackAbility,
  isWeaponProficient,
  weaponOmitsAbilityModifierFromDamage,
  type AbilityMods,
} from "@/lib/compendium/combat-stats"
import type { WeaponAbilityOverrideCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import type { WeaponAttackDerived } from "@/lib/character/types"
import type { Equipment } from "@/lib/types"

/** Build a combat card attack when derived resolution missed the wielded item. */
export function fallbackWeaponAttackDerived(
  weapon: Equipment,
  params: {
    abilityMods: AbilityMods
    proficiencyBonus: number
    weaponProficiencies: string[]
    overrides?: WeaponAbilityOverrideCharacteristic[] | null
    includeAbilityModifier?: boolean
  },
): WeaponAttackDerived | null {
  const base = calculateWeaponAttack(
    weapon,
    params.abilityMods,
    params.proficiencyBonus,
    isWeaponProficient(weapon, params.weaponProficiencies),
    params.overrides,
  )
  if (!base) return null
  const attackAbility = getWeaponAttackAbility(weapon, params.abilityMods, {
    overrides: params.overrides,
    forRoll: "attack",
  })
  const damageAbility = getWeaponAttackAbility(weapon, params.abilityMods, {
    overrides: params.overrides,
    forRoll: "damage",
  })
  const includeAbilityModifier = params.includeAbilityModifier ?? true
  return {
    ...base,
    attackAbilityMod: attackAbility.mod,
    damageAbilityMod: damageAbility.mod,
    includesAbilityModifierOnDamage:
      includeAbilityModifier && !weaponOmitsAbilityModifierFromDamage(weapon),
  }
}

export function abilityModsFromScores(scores: {
  strength?: number | null
  dexterity?: number | null
  constitution?: number | null
  intelligence?: number | null
  wisdom?: number | null
  charisma?: number | null
}): AbilityMods {
  const mod = (score: number | null | undefined) => Math.floor(((score ?? 10) - 10) / 2)
  return {
    strength: mod(scores.strength),
    dexterity: mod(scores.dexterity),
    constitution: mod(scores.constitution),
    intelligence: mod(scores.intelligence),
    wisdom: mod(scores.wisdom),
    charisma: mod(scores.charisma),
  }
}
