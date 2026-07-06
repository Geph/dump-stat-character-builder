import { describe, expect, it } from "vitest"
import {
  getMultipleClassImportBlock,
  multipleClassImportMessage,
} from "@/lib/import/import-class-limits"
import type { ImportContent } from "@/lib/import/content-schema"

describe("getMultipleClassImportBlock", () => {
  it("allows a single class import", () => {
    const content = {
      classes: [
        {
          name: "Alternate Fighter",
          features: [],
          description: null,
          hit_die: 8,
          primary_ability: null,
        },
      ],
    }
    expect(getMultipleClassImportBlock(content)).toBeNull()
  })

  it("blocks when more than one class is present", () => {
    const content = {
      classes: [
        { name: "Fighter", features: [], description: null, hit_die: 8, primary_ability: null },
        { name: "KibblesTasty Psion", features: [], description: null, hit_die: 8, primary_ability: null },
      ],
    }
    const block = getMultipleClassImportBlock(content, "pdf")
    expect(block).not.toBeNull()
    expect(block!.classNames).toEqual(["Fighter", "KibblesTasty Psion"])
    expect(block!.message).toContain("page range")
    expect(block!.message).toContain("Fighter, KibblesTasty Psion")
  })

  it("mentions clipboard splitting for text imports", () => {
    const message = multipleClassImportMessage(["Fighter", "KibblesTasty Psion", "Wizard"], "text")
    expect(message).toContain("3 classes")
    expect(message).toContain("one class at a time")
    expect(message).toContain("page ranges")
  })
})
