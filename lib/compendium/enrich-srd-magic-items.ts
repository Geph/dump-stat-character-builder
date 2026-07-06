import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { FEAT_MODIFIER_CATALOG } from "@/lib/compendium/enrich-srd-feats"
import {
  charInstance,
  fxInstance,
  modId,
} from "@/lib/compendium/modifier-instance-builders"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { BaseEquipmentFilter } from "@/lib/compendium/equipment-magic"
import { weaponIconSlug } from "@/lib/compendium/weapon-icons"
import { isSrdSource } from "@/lib/srd/source"
import { applySrdItemIcon, SRD_ARMOR_ICONS_BY_NAME } from "@/lib/compendium/srd-item-icons-defaults"

type MagicItemSeedRow = Record<string, unknown> & {
  name: string
  source?: string
  magic_effects?: LinkedModifierInstance[]
  base_equipment_names?: string[]
  base_equipment_ids?: string[]
  base_equipment_filter?: BaseEquipmentFilter | null
  magic_bonus?: number
}

function attackBonusCharacteristic(bonus: number, label: string): CharacteristicModifier {
  return {
    id: modId(`magic_attack_${bonus}`),
    type: "attack_roll_modifiers",
    label,
    entries: [{ bonus, target: "all" }],
  }
}

function damageBonusCharacteristic(bonus: number, label: string): CharacteristicModifier {
  return {
    id: modId(`magic_damage_${bonus}`),
    type: "damage_roll_modifiers",
    label,
    entries: [{ bonus, target: "all" }],
  }
}

function acBonusCharacteristic(
  bonus: number,
  label: string,
  requiresArmor = false,
): CharacteristicModifier {
  return {
    id: modId(`magic_ac_${bonus}`),
    type: "ac",
    mode: "flat_bonus",
    flatBonus: bonus,
    requiresArmor,
    label,
  }
}

function weaponBonusEffects(instanceId: string, bonus: number, label: string): LinkedModifierInstance[] {
  return [
    charInstance(`${instanceId}_attack`, FEAT_MODIFIER_CATALOG.attackRollModifiers, [
      attackBonusCharacteristic(bonus, label),
    ]),
    charInstance(`${instanceId}_damage`, FEAT_MODIFIER_CATALOG.damageRollModifiers, [
      damageBonusCharacteristic(bonus, label),
    ]),
  ]
}

function acBonusEffects(
  instanceId: string,
  bonus: number,
  label: string,
  requiresArmor = false,
): LinkedModifierInstance[] {
  return [
    charInstance(instanceId, FEAT_MODIFIER_CATALOG.ac, [
      acBonusCharacteristic(bonus, label, requiresArmor),
    ]),
  ]
}

function healPotionEffects(instanceId: string, dice: string, label: string): LinkedModifierInstance[] {
  return [
    fxInstance(instanceId, FEAT_MODIFIER_CATALOG.healSelf, {
      action: true,
      bonusAction: true,
      effects: [{ id: modId(`${instanceId}_heal`), kind: "heal_self", bonusDice: dice }],
      label,
    } as import("@/lib/types").FeatureActivation),
  ]
}

type MagicItemPreset = {
  magic_effects?: LinkedModifierInstance[]
  requires_attunement?: boolean
  rarity?: string
  base_equipment_names?: string[]
  base_equipment_filter?: BaseEquipmentFilter | null
}

function expandGenericMagicRows(row: MagicItemSeedRow): MagicItemSeedRow[] {
  const name = row.name
  if (name === "Weapon, +1, +2, or +3") {
    return [
      { ...row, name: "+1 Weapon", rarity: "Uncommon", magic_bonus: 1, base_equipment_filter: "any_weapon" },
      { ...row, name: "+2 Weapon", rarity: "Rare", magic_bonus: 2, base_equipment_filter: "any_weapon" },
      { ...row, name: "+3 Weapon", rarity: "Very Rare", magic_bonus: 3, base_equipment_filter: "any_weapon" },
    ]
  }
  if (name === "Shield, +1, +2, or +3") {
    return [
      {
        ...row,
        name: "+1 Shield",
        rarity: "Uncommon",
        magic_bonus: 1,
        base_equipment_names: ["Shield"],
        category: "Armor",
        subcategory: "Shield",
      },
      {
        ...row,
        name: "+2 Shield",
        rarity: "Rare",
        magic_bonus: 2,
        base_equipment_names: ["Shield"],
        category: "Armor",
        subcategory: "Shield",
      },
      {
        ...row,
        name: "+3 Shield",
        rarity: "Very Rare",
        magic_bonus: 3,
        base_equipment_names: ["Shield"],
        category: "Armor",
        subcategory: "Shield",
      },
    ]
  }
  if (name === "Armor, +1, +2, or +3") {
    return [
      { ...row, name: "+1 Armor", rarity: "Rare", magic_bonus: 1 },
      { ...row, name: "+2 Armor", rarity: "Very Rare", magic_bonus: 2 },
      { ...row, name: "+3 Armor", rarity: "Legendary", magic_bonus: 3 },
    ]
  }
  return [row]
}

function presetForRow(row: MagicItemSeedRow): MagicItemPreset | null {
  const bonus = row.magic_bonus
  if (typeof bonus === "number" && bonus > 0) {
    if (row.magic_item_category === "Weapon" || row.base_equipment_filter === "any_weapon") {
      const label = `+${bonus} magic weapon`
      return { magic_effects: weaponBonusEffects(`modinst_${row.name}`, bonus, label) }
    }
    if (row.subcategory === "Shield" || row.base_equipment_names?.includes("Shield")) {
      const label = `+${bonus} magic shield`
      return { magic_effects: acBonusEffects(`modinst_${row.name}`, bonus, label) }
    }
    if (row.magic_item_category === "Armor") {
      const label = `+${bonus} magic armor`
      return { magic_effects: acBonusEffects(`modinst_${row.name}`, bonus, label, true) }
    }
  }

  const presets: Record<string, MagicItemPreset> = {
    "Ring of Protection": {
      requires_attunement: true,
      magic_effects: acBonusEffects("modinst_ring_protection_ac", 1, "Ring of Protection"),
    },
    "Elven Chain": {
      magic_effects: acBonusEffects("modinst_elven_chain", 1, "Elven Chain", true),
      base_equipment_names: ["Chain Mail", "Chain Shirt"],
    },
    "Potion of Healing (Greater)": {
      magic_effects: healPotionEffects("modinst_potion_healing_greater", "4d4 + 4", "Potion of Healing (Greater)"),
    },
    "Potion of Healing (Superior)": {
      magic_effects: healPotionEffects("modinst_potion_healing_superior", "8d4 + 8", "Potion of Healing (Superior)"),
    },
    "Potion of Healing (Supreme)": {
      magic_effects: healPotionEffects("modinst_potion_healing_supreme", "10d4 + 20", "Potion of Healing (Supreme)"),
    },
  }

  return presets[row.name] ?? null
}

export function enrichSrdMagicItemRow(row: MagicItemSeedRow): MagicItemSeedRow {
  if (!isSrdSource(row.source ?? "")) return row
  const preset = presetForRow(row)
  if (!preset) return row
  return {
    ...row,
    requires_attunement: preset.requires_attunement ?? row.requires_attunement,
    rarity: preset.rarity ?? row.rarity,
    base_equipment_names: preset.base_equipment_names ?? row.base_equipment_names,
    base_equipment_filter: preset.base_equipment_filter ?? row.base_equipment_filter,
    magic_effects: preset.magic_effects ?? row.magic_effects,
  }
}

export function expandSrdMagicItemRows(rows: MagicItemSeedRow[]): MagicItemSeedRow[] {
  return rows.flatMap((row) => expandGenericMagicRows(row))
}

export function enrichSrdMagicItemList(rows: MagicItemSeedRow[]): MagicItemSeedRow[] {
  return expandSrdMagicItemRows(rows).map(enrichSrdMagicItemRow)
}

/** Reclassify the mundane Potion of Healing seed row with structured magic fields. */
export function enrichSrdMundaneEquipmentRow(row: Record<string, unknown>): Record<string, unknown> {
  let enriched = { ...row }
  if (!isSrdSource(String(row.source ?? ""))) return enriched

  if (row.name === "Potion of Healing") {
    enriched = {
      ...enriched,
      magic_item_category: "Potion",
      rarity: "Common",
      requires_attunement: false,
      magic_effects: healPotionEffects("modinst_potion_healing", "2d4 + 2", "Potion of Healing"),
    }
  }

  if (
    enriched.category === "Weapon" &&
    !(typeof enriched.icon === "string" && enriched.icon.trim())
  ) {
    const name = String(enriched.name ?? "").trim()
    if (name) {
      enriched = { ...enriched, icon: weaponIconSlug(name) }
    }
  }

  if (enriched.category === "Armor") {
    enriched = applySrdItemIcon(enriched, SRD_ARMOR_ICONS_BY_NAME)
  }

  return enriched
}

export function enrichSrdMundaneEquipmentList(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(enrichSrdMundaneEquipmentRow)
}

export function resolveMagicItemBaseEquipmentIds(
  rows: MagicItemSeedRow[],
  equipmentNameToId: Map<string, string>,
): MagicItemSeedRow[] {
  return rows.map((row) => {
    const names = row.base_equipment_names ?? []
    const ids = names
      .map((name) => equipmentNameToId.get(name))
      .filter((id): id is string => Boolean(id))
    const selected =
      ids.length === 1 ? ids[0] : row.selected_base_equipment_id ?? null
    const { base_equipment_names: _names, magic_bonus: _bonus, heal_dice: _heal, attunement_restriction: _restriction, ...rest } =
      row
    return {
      ...rest,
      base_equipment_ids: ids.length ? ids : null,
      selected_base_equipment_id: selected,
      base_equipment_filter: row.base_equipment_filter ?? null,
      magic_effects: row.magic_effects ?? [],
    }
  }) as unknown as MagicItemSeedRow[]
}

export function prepareMagicItemsForSeed(
  rows: MagicItemSeedRow[],
  equipmentNameToId: Map<string, string>,
): MagicItemSeedRow[] {
  const enriched = enrichSrdMagicItemList(rows)
  const mundaneNames = new Set(["Potion of Healing"])
  const filtered = enriched.filter((row) => !mundaneNames.has(row.name))
  return resolveMagicItemBaseEquipmentIds(filtered, equipmentNameToId)
}
