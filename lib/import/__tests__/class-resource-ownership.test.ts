import { describe, expect, it } from "vitest"
import { buildClassResourceRowsForClass } from "@/lib/import/enrich-import-classes"

describe("class resource ownership persistence", () => {
  it("encodes subclass_name in persisted prerequisite metadata", () => {
    const rows = buildClassResourceRowsForClass(
      { name: "Inventor", features: [] },
      [
        {
          class_name: "Inventor",
          subclass_name: "Runesmith",
          resource_key: "runes_marked",
          name: "Runes Marked",
          prerequisite_rules: [{ category: "other", value: "Requires a marked object" }],
          uses: {
            type: "special",
            atLevelTable: [{ level: 3, count: 2 }],
          },
        },
      ],
      "KibblesTasty",
      "class-inventor",
    )

    expect(rows[0]).toMatchObject({
      class_id: "class-inventor",
      resource_key: "runes_marked",
      prerequisite_rules: [
        { category: "other", value: "Requires a marked object" },
        { category: "other", value: "Subclass: Runesmith" },
      ],
    })
  })
})
