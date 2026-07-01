import { describe, expect, it } from "vitest"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import type { ImportContent } from "@/lib/import/content-schema"

describe("enrichImportContentModifiers equipment", () => {
  it("runs detectFeatureModifiers on imported equipment descriptions", () => {
    const content: ImportContent = {
      equipment: [
        {
          name: "Ring of Protection",
          category: "Wondrous Item",
          description: "You gain a +1 bonus to AC.",
        },
      ],
    }

    const enriched = enrichImportContentModifiers(content)
    const item = enriched.equipment?.[0] as {
      magic_effects?: { characteristics?: { requiresArmor?: boolean }[] }[]
    }

    expect(item?.magic_effects?.length).toBeGreaterThan(0)
    const acChar = item?.magic_effects?.[0]?.characteristics?.find(
      (characteristic) => characteristic.type === "ac" && characteristic.mode === "flat_bonus",
    )
    expect(acChar?.flatBonus).toBe(1)
  })
})
