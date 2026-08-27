import {
  hasWeaponProperty,
  isUnarmedStrikeWeapon,
  UNARMED_STRIKE_EQUIPMENT_ID,
} from "@/lib/compendium/combat-stats"
import type {
  AbilityScoreKey,
  AggregatedCharacteristics,
  UnarmedStrikeDie,
  WeaponAbilityOverrideCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"
import {
  pickHigherUnarmedDie,
  resolveUnarmedStrikeDieAtLevel,
} from "@/lib/compendium/characteristic-modifiers"
import type { Equipment } from "@/lib/types"

export { isUnarmedStrikeWeapon, UNARMED_STRIKE_EQUIPMENT_ID }

export function characterHasFreeHand(params: {
  mainWeapon?: Equipment | null
  offHandWeapon?: Equipment | null
  shield?: Equipment | null
}): boolean {
  const main = params.mainWeapon ?? null
  const off = params.offHandWeapon ?? null
  const shield = params.shield ?? null

  if (main && hasWeaponProperty(main, "two-handed")) return false
  if (off && hasWeaponProperty(off, "two-handed")) return false
  if (main && shield) return false
  if (off && shield) return false
  if (main && off) return false
  return true
}

/** True when not wielding a weapon or shield (Unarmed Fighting's 1d8). */
export function characterIsEmptyHanded(params: {
  mainWeapon?: Equipment | null
  offHandWeapon?: Equipment | null
  shield?: Equipment | null
}): boolean {
  return !params.mainWeapon && !params.offHandWeapon && !params.shield
}

export function extraUnarmedStrikeAbilityOverrides(
  aggregated: Pick<AggregatedCharacteristics, "unarmedStrikeAbility">,
): WeaponAbilityOverrideCharacteristic[] {
  const ability = aggregated.unarmedStrikeAbility
  // Dexterity is modeled as Finesse on the synthetic weapon (higher of STR/DEX).
  if (!ability || ability === "dexterity") return []
  return [
    {
      id: "unarmed_strike_ability_override",
      type: "weapon_ability_override",
      ability,
      appliesTo: "both",
      scope: "specific",
      weaponNames: ["Unarmed Strike"],
    },
  ]
}

export function buildUnarmedStrikeEquipment(params: {
  die: UnarmedStrikeDie | null
  dieByLevel?: AggregatedCharacteristics["unarmedStrikeDieByLevel"]
  emptyHandedDie?: UnarmedStrikeDie | null
  emptyHanded?: boolean
  damageType: string | null
  ability: AbilityScoreKey | null
  characterLevel: number
}): Equipment {
  const baseDie =
    resolveUnarmedStrikeDieAtLevel(params.die, params.dieByLevel, params.characterLevel)
  const resolvedDie =
    (params.emptyHanded && params.emptyHandedDie
      ? pickHigherUnarmedDie(baseDie, params.emptyHandedDie)
      : baseDie) ?? "1"
  const damageType = params.damageType?.trim() || "Bludgeoning"
  return {
    id: UNARMED_STRIKE_EQUIPMENT_ID,
    name: "Unarmed Strike",
    category: "Weapon",
    subcategory: "Simple Melee Weapons",
    cost: null,
    weight: null,
    properties: params.ability === "dexterity" ? ["Finesse"] : [],
    description: null,
    damage: resolvedDie,
    damage_type: damageType,
    range: "5 ft",
    mastery: null,
    icon: "punch-blast",
    source: "SRD",
    creator_url: null,
    created_at: "",
  }
}
