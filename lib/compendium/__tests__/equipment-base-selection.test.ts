import { describe, expect, it } from "vitest"
import {
  getBaseSelectionOptions,
  needsBaseSelection,
  resolveCharacterEquipment,
} from "@/lib/compendium/equipment-base-selection"
import { normalizeEquipmentRow } from "@/lib/import/normalize-equipment"
import type { Equipment } from "@/lib/types"

const longsword: Equipment = {
  id: "base-longsword",
  name: "Longsword",
  category: "Weapon",
  subcategory: "Martial Melee",
  damage: "1d8",
  damage_type: "Slashing",
  properties: { properties: ["Versatile"] },
  cost: { amount: 15, unit: "gp" },
  weight: 3,
  description: null,
  source: "SRD",
  created_at: "",
}

const plusOneLongsword: Equipment = {
  id: "magic-plus-one-longsword",
  name: "+1 Longsword",
  category: "Weapon",
  subcategory: null,
  requires_attunement: false,
  magic_item_category: "Weapon",
  rarity: "Uncommon",
  base_equipment_ids: [longsword.id],
  magic_effects: [{ modifier_id: "attack-bonus", value: 1 }],
  cost: null,
  weight: null,
  description: "A magical longsword.",
  source: "SRD",
  created_at: "",
}

describe("equipment-base-selection", () => {
  it("resolves magic weapon stats from character base selection", () => {
    const resolved = resolveCharacterEquipment(
      plusOneLongsword,
      [longsword, plusOneLongsword],
      { [plusOneLongsword.id]: longsword.id },
    )
    expect(resolved.damage).toBe("1d8")
    expect(resolved.name).toBe("+1 Longsword")
  })

  it("flags items that need a base pick", () => {
    const filterWeapon: Equipment = {
      ...plusOneLongsword,
      id: "plus-one-weapon",
      name: "+1 Weapon",
      base_equipment_ids: [],
      base_equipment_filter: "any_melee_weapon",
    }
    expect(needsBaseSelection(filterWeapon, [longsword, filterWeapon], {})).toBe(true)
    expect(getBaseSelectionOptions(filterWeapon, [longsword, filterWeapon])).toEqual([longsword])
  })
})

describe("normalizeEquipmentRow magic fields", () => {
  it("coerces attunement and base ids from import strings", () => {
    const normalized = normalizeEquipmentRow({
      name: "+1 Shield",
      category: "Armor",
      requires_attunement: "required",
      base_equipment_ids: '["shield-id"]',
      magic_item_category: " Armor ",
      rarity: " Rare ",
    })
    expect(normalized).toMatchObject({
      name: "+1 Shield",
      requires_attunement: true,
      base_equipment_ids: ["shield-id"],
      magic_item_category: "Armor",
      rarity: "Rare",
    })
  })
})
