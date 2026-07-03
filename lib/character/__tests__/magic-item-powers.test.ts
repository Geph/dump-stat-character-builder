import { describe, expect, it } from "vitest"
import { collectMagicItemPowers } from "@/lib/character/magic-item-powers"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { Equipment } from "@/lib/types"

function linked(chars: CharacteristicModifier[]): LinkedModifierInstance[] {
  return [
    {
      instanceId: `modinst_${chars[0]?.id ?? "test"}`,
      catalogRefId: "cat_test",
      characteristics: chars,
    },
  ]
}

const conditionalItem: Equipment = {
  id: "item-1",
  name: "Unyielding Duty",
  category: "Weapon",
  subcategory: "Martial Melee Weapons",
  description: "Test",
  cost: null,
  weight: null,
  properties: null,
  icon: null,
  source: "test",
  creator_url: null,
  created_at: "",
  rarity: "Rare",
  requires_attunement: false,
  magic_effects: linked([
    {
      id: "bonus",
      type: "damage_roll_modifiers",
      entries: [{ bonus: 2, target: "all" }],
      requiresSheetToggle: "magic_item:item-1:bonus",
      label: "Radiant burst",
    },
  ]),
}

describe("collectMagicItemPowers", () => {
  it("surfaces conditional magic item powers with toggle ids", () => {
    const powers = collectMagicItemPowers({
      equipment: [conditionalItem],
      equippedArmorId: null,
      equippedShieldId: null,
      equippedWeaponId: "item-1",
      attunedItemIds: [],
      modifierCatalog: [],
    })

    expect(powers).toHaveLength(1)
    expect(powers[0]?.kind).toBe("conditional")
    expect(powers[0]?.toggleId).toBe("magic_item:item-1:bonus")
  })
})
