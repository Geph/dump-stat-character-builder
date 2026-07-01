import { describe, expect, it } from "vitest"
import { prepareImportedContent } from "@/lib/import/finalize-import"
import type { ImportContent } from "@/lib/import/content-schema"

describe("import review gate", () => {
  it("requires confirmation even for a single spell import", () => {
    const content: ImportContent = {
      spells: [
        {
          name: "Test Spell",
          level: 1,
          school: "Evocation",
          casting_time: "1 action",
          range: "60 feet",
          components: ["V", "S"],
          duration: "Instantaneous",
          concentration: false,
          description: "A test.",
          classes: ["Wizard"],
        },
      ],
    }

    const prepared = prepareImportedContent(content, { collisions: [] })
    expect(prepared.kind).toBe("confirm")
  })
})
