import { describe, expect, it } from "vitest"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import type { ImportContent } from "@/lib/import/content-schema"

describe("enrichImportContentModifiers equipment", () => {
  it("runs detectFeatureModifiers on imported equipment descriptions", () => {
    const content = {
      equipment: [
        {
          name: "Ring of Protection",
          category: "Wondrous Item",
          subcategory: null,
          description: "You gain a +1 bonus to AC.",
        },
      ],
    }

    const enriched = enrichImportContentModifiers(content as unknown as ImportContent)
    const item = enriched.equipment?.[0] as {
      category?: string
      magic_item_category?: string
      magic_effects?: { characteristics?: { requiresArmor?: boolean }[] }[]
    }

    expect(item?.category).toBe("Other")
    expect(item?.magic_item_category).toBe("Wondrous Item")
    expect(item?.magic_effects?.length).toBeGreaterThan(0)
    const acChar = item?.magic_effects?.[0]?.characteristics?.find(
      (characteristic) =>
        (characteristic as import("@/lib/compendium/characteristic-modifiers").AcCharacteristic).type ===
          "ac" &&
        (characteristic as import("@/lib/compendium/characteristic-modifiers").AcCharacteristic).mode ===
          "flat_bonus",
    ) as import("@/lib/compendium/characteristic-modifiers").AcCharacteristic | undefined
    expect(acChar?.flatBonus).toBe(1)
  })
})
