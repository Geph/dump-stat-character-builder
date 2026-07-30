import type { Equipment } from "@/lib/types"
import {
  calculateWeaponAttack,
  getWeaponAttackAbility,
  type AbilityMods,
} from "@/lib/compendium/combat-stats"
import type { WeaponAttackDerived } from "@/lib/character/types"

export const WEAPON_MORPH_EXCLUSIVE_GROUP = "weapon_morph"

export type WeaponMorphOptionId =
  | "bone_spike"
  | "chitinous_plating"
  | "flesh_club"
  | "sinew_whip"
  | "viscera_cannon"

export type WeaponMorphDefinition = {
  id: WeaponMorphOptionId
  toggleId: string
  menuName: string
  kind: "weapon" | "shield"
  equipment: Equipment
}

function morphEquipment(partial: Omit<Equipment, "created_at" | "source" | "creator_url" | "icon"> & {
  id: string
}): Equipment {
  return {
    ...partial,
    icon: null,
    source: "Weapon Morph",
    creator_url: null,
    created_at: "",
  }
}

export const WEAPON_MORPH_OPTIONS: WeaponMorphDefinition[] = [
  {
    id: "bone_spike",
    toggleId: "weapon_morph_bone_spike",
    menuName: "Bone Spike",
    kind: "weapon",
    equipment: morphEquipment({
      id: "morph:bone_spike",
      name: "Bone Spike",
      category: "Weapon",
      subcategory: "Martial Melee",
      cost: null,
      weight: null,
      properties: ["Finesse"],
      description: "Weapon Morph natural weapon (piercing).",
      damage: "1d8",
      damage_type: "piercing",
      range: "5 ft",
      mastery: null,
    }),
  },
  {
    id: "flesh_club",
    toggleId: "weapon_morph_flesh_club",
    menuName: "Flesh Club",
    kind: "weapon",
    equipment: morphEquipment({
      id: "morph:flesh_club",
      name: "Flesh Club",
      category: "Weapon",
      subcategory: "Martial Melee",
      cost: null,
      weight: null,
      properties: [],
      description: "Weapon Morph natural weapon (bludgeoning).",
      damage: "1d8",
      damage_type: "bludgeoning",
      range: "5 ft",
      mastery: null,
    }),
  },
  {
    id: "sinew_whip",
    toggleId: "weapon_morph_sinew_whip",
    menuName: "Sinew Whip",
    kind: "weapon",
    equipment: morphEquipment({
      id: "morph:sinew_whip",
      name: "Sinew Whip",
      category: "Weapon",
      subcategory: "Martial Melee",
      cost: null,
      weight: null,
      properties: ["Finesse", "Reach"],
      description: "Weapon Morph natural weapon with Reach.",
      damage: "1d6",
      damage_type: "slashing",
      range: "10 ft",
      mastery: null,
    }),
  },
  {
    id: "viscera_cannon",
    toggleId: "weapon_morph_viscera_cannon",
    menuName: "Viscera Cannon",
    kind: "weapon",
    equipment: morphEquipment({
      id: "morph:viscera_cannon",
      name: "Viscera Cannon",
      category: "Weapon",
      subcategory: "Martial Ranged",
      cost: null,
      weight: null,
      properties: ["Ammunition"],
      description: "Weapon Morph ranged natural weapon. Each shot costs 1 HP (ammo).",
      damage: "1d8",
      damage_type: "acid",
      range: "60/180 ft",
      mastery: null,
    }),
  },
  {
    id: "chitinous_plating",
    toggleId: "weapon_morph_chitinous_plating",
    menuName: "Chitinous Plating",
    kind: "shield",
    equipment: morphEquipment({
      id: "morph:chitinous_plating",
      name: "Chitinous Plating",
      category: "Armor",
      subcategory: "Shield",
      cost: null,
      weight: null,
      properties: [],
      description: "Weapon Morph shield-like plating (+2 AC while active).",
      armor_class: 2,
      damage: null,
      damage_type: null,
      range: null,
      mastery: null,
    }),
  },
]

const byMenuName = new Map(
  WEAPON_MORPH_OPTIONS.map((option) => [option.menuName.toLowerCase(), option]),
)
const byToggleId = new Map(WEAPON_MORPH_OPTIONS.map((option) => [option.toggleId, option]))

export function weaponMorphToggleIdForOption(optionName: string): string | null {
  const n = optionName.trim().toLowerCase()
  if (n === "end morph" || n.includes("end morph")) return "__end_weapon_morph__"
  return byMenuName.get(n)?.toggleId ?? null
}

export function weaponMorphOptionForToggle(toggleId: string): WeaponMorphDefinition | null {
  return byToggleId.get(toggleId) ?? null
}

export function activeWeaponMorphOption(
  activeToggleIds: readonly string[],
): WeaponMorphDefinition | null {
  for (const id of activeToggleIds) {
    const option = byToggleId.get(id)
    if (option) return option
  }
  return null
}

/** Build a minimal attack card for a morph weapon using STR/DEX and PB. */
export function buildWeaponMorphAttack(params: {
  equipment: Equipment
  abilityMods: AbilityMods
  proficiencyBonus: number
}): WeaponAttackDerived | null {
  const base = calculateWeaponAttack(
    params.equipment,
    params.abilityMods,
    params.proficiencyBonus,
    true,
  )
  if (!base) return null
  const attackAbility = getWeaponAttackAbility(params.equipment, params.abilityMods, {
    forRoll: "attack",
  })
  const damageAbility = getWeaponAttackAbility(params.equipment, params.abilityMods, {
    forRoll: "damage",
  })
  return {
    attackBonus: base.attackBonus,
    damageDisplay: base.damageDisplay,
    attackBreakdown: base.attackBreakdown,
    attackAbilityMod: attackAbility.mod,
    damageAbilityMod: damageAbility.mod,
  }
}
