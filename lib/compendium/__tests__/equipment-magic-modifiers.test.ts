import { describe, expect, it } from "vitest"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import {
  collectEquipmentMagicCharacteristics,
  isMagicItemEffectActive,
} from "@/lib/compendium/equipment-magic-modifiers"
import type { Equipment } from "@/lib/types"

function item(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: "item-id",
    name: "Item",
    category: "Adventuring Gear",
    subcategory: null,
    cost: null,
    weight: null,
    properties: null,
    description: null,
    icon: null,
    source: "test",
    creator_url: null,
    created_at: "",
    ...overrides,
  } as unknown as unknown as Equipment
}

function linked(chars: CharacteristicModifier[]): LinkedModifierInstance[] {
  return [
    {
      instanceId: `modinst_${chars[0]?.id ?? "test"}`,
      catalogRefId: "cat_test",
      characteristics: chars,
    },
  ]
}

describe("isMagicItemEffectActive", () => {
  const ring = item({
    id: "ring",
    magic_item_category: "Ring",
    rarity: "Rare",
    requires_attunement: true,
    magic_effects: linked([
      { id: "ring_ac", type: "ac", mode: "flat_bonus", flatBonus: 1 },
    ]),
  })

  it("applies attuned-scope effects only when attuned", () => {
    const ctx = {
      equipment: [ring],
      equippedArmorId: null,
      equippedShieldId: null,
      equippedWeaponId: null,
      attunedItemIds: [] as string[],
      modifierCatalog: [],
    }
    expect(isMagicItemEffectActive(ring, ctx)).toBe(false)
    expect(
      isMagicItemEffectActive(ring, { ...ctx, attunedItemIds: ["ring"] }),
    ).toBe(true)
  })

  it("applies wielded-scope effects only when equipped as weapon", () => {
    const sword = item({
      id: "plus-one",
      category: "Weapon",
      subcategory: "Martial Melee Weapons",
      rarity: "Uncommon",
      requires_attunement: true,
      magic_effects: linked([
        {
          id: "plus_one_attack",
          type: "attack_roll_modifiers",
          entries: [{ bonus: 1, target: "all" }],
        },
      ]),
    })
    const ctx = {
      equipment: [sword],
      equippedArmorId: null,
      equippedShieldId: null,
      equippedWeaponId: null,
      attunedItemIds: ["plus-one"],
      modifierCatalog: [],
    }
    expect(isMagicItemEffectActive(sword, ctx)).toBe(false)
    expect(
      isMagicItemEffectActive(sword, { ...ctx, equippedWeaponId: "plus-one" }),
    ).toBe(true)
  })
})

describe("collectEquipmentMagicCharacteristics", () => {
  it("aggregates active magic item modifiers", () => {
    const shield = item({
      id: "plus-one-shield",
      name: "+1 Shield",
      category: "Armor",
      subcategory: "Shield",
      rarity: "Uncommon",
      requires_attunement: true,
      magic_effects: linked([
        { id: "shield_ac", type: "ac", mode: "flat_bonus", flatBonus: 1 },
      ]),
    })

    const mods = collectEquipmentMagicCharacteristics({
      equipment: [shield],
      equippedArmorId: null,
      equippedShieldId: "plus-one-shield",
      equippedWeaponId: null,
      attunedItemIds: ["plus-one-shield"],
      modifierCatalog: [],
    })

    expect(mods).toHaveLength(1)
    expect(mods[0]?.type).toBe("ac")
  })
})
