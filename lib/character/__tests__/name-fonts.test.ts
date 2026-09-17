import { describe, expect, it } from "vitest"
import {
  DEFAULT_NAME_FONT_ID,
  NAME_FONTS,
  getNameFont,
  normalizeNameFontId,
  readNameFontId,
  withNameFont,
} from "@/lib/character/name-fonts"

describe("name fonts", () => {
  it("offers six previewable fonts", () => {
    expect(NAME_FONTS).toHaveLength(6)
    expect(getNameFont("storybook").cssFamily).toContain("--font-great-vibes")
    expect(getNameFont("small-caps").cssFamily).toContain("--font-comic-neue")
    expect(getNameFont("clean").cssFamily).toContain("--font-orbitron")
  })

  it("falls back to classic for unknown ids", () => {
    expect(normalizeNameFontId(undefined)).toBe(DEFAULT_NAME_FONT_ID)
    expect(normalizeNameFontId("papyrus")).toBe("classic")
    expect(getNameFont("elegant").id).toBe("elegant")
  })

  it("round-trips the choice on appearance without dropping other fields", () => {
    const next = withNameFont({ age: "24", height: "5'8\"" }, "archaic")
    expect(next.age).toBe("24")
    expect(next.height).toBe("5'8\"")
    expect(readNameFontId(next)).toBe("archaic")
  })
})
