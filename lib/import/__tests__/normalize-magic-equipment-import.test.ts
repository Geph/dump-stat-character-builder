import { describe, expect, it } from "vitest"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { normalizeEquipmentRow } from "@/lib/import/normalize-equipment"
import {
  coerceMagicEquipmentImportFields,
  parseMagicItemSubtitle,
} from "@/lib/import/normalize-magic-equipment-import"

describe("normalizeMagicEquipmentImport", () => {
  it("lifts rarity and attunement from properties and remaps Wondrous Item category", () => {
    const row = normalizeEquipmentRow({
      name: "Amulet of Retributive Healing",
      category: "Wondrous Item",
      subcategory: null,
      description:
        "This amulet has 3 charges and regains 1d3 expended charges daily at dawn. When you restore Hit Points to one other creature, you can expend 1 charge to regain the same amount of Hit Points.",
      cost: null,
      weight: null,
      properties: {
        rarity: "Rare",
        attunement: true,
      },
    })

    expect(row?.category).toBe("Other")
    expect(row?.magic_item_category).toBe("Wondrous Item")
    expect(row?.rarity).toBe("Rare")
    expect(row?.requires_attunement).toBe(true)
    expect(row?.cost).toBeNull()
    expect(row?.properties).toBeNull()
  })

  it("parses magic item subtitle from description text", () => {
    const parsed = parseMagicItemSubtitle(
      "Wondrous Item, rare (requires attunement)\n\nThis amulet has 3 charges.",
    )
    expect(parsed?.magicItemCategory).toBe("Wondrous Item")
    expect(parsed?.rarity).toBe("Rare")
    expect(parsed?.requiresAttunement).toBe(true)
    expect(parsed?.description).toBe("This amulet has 3 charges.")
  })

  it("coerces subtitle fields during row normalization", () => {
    const row = normalizeEquipmentRow({
      name: "Amulet of Retributive Healing",
      category: "",
      description:
        "Wondrous Item, rare (requires attunement)\n\nThis amulet has 3 charges and regains 1d3 expended charges daily at dawn.",
    })

    expect(row?.category).toBe("Other")
    expect(row?.magic_item_category).toBe("Wondrous Item")
    expect(row?.rarity).toBe("Rare")
    expect(row?.requires_attunement).toBe(true)
    expect(row?.description).not.toMatch(/^Wondrous Item/i)
  })

  it("keeps mundane Weapon category when no magic signals are present", () => {
    const row = coerceMagicEquipmentImportFields({
      name: "Longsword",
      category: "Weapon",
      properties: { damage: "1d8 slashing" },
    })

    expect(row.category).toBe("Weapon")
    expect(row.magic_item_category).toBeNull()
  })
})

describe("enrichImportContentModifiers magic equipment charges", () => {
  it("wires charge pool uses for dawn-recharging magic items", () => {
    const enriched = enrichImportContentModifiers({
      equipment: [
        {
          name: "Amulet of Retributive Healing",
          category: "Other",
          magic_item_category: "Wondrous Item",
          rarity: "Rare",
          requires_attunement: true,
          subcategory: null,
          description:
            "This amulet has 3 charges and regains 1d3 expended charges daily at dawn. When you restore Hit Points to one other creature, you can expend 1 charge to regain the same amount of Hit Points.",
          cost: null,
        },
      ],
    })

    const item = enriched.equipment?.[0] as {
      magic_effects?: { characteristics?: { type?: string; uses?: { fixedAmount?: number; specialDescription?: string } }[] }[]
    }
    const usesChar = item?.magic_effects?.[0]?.characteristics?.find(
      (characteristic) => characteristic.type === "uses",
    )
    expect(usesChar?.uses?.fixedAmount).toBe(3)
    expect(usesChar?.uses?.specialDescription).toMatch(/1d3.*dawn/i)
  })
})
