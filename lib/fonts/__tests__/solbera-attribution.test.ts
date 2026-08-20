import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  CC_BY_SA_4_LEGALCODE_URL,
  CC_BY_SA_4_URL,
  SOLBERA_ATTRIBUTION_STATEMENT,
  SOLBERA_BUNDLED_FAMILIES,
  SOLBERA_FONTS_SOURCE_URL,
} from "@/lib/fonts/solbera-attribution"

describe("Solbera font attribution", () => {
  it("names every bundled family and points at CC BY-SA 4.0 plus source", () => {
    expect(SOLBERA_BUNDLED_FAMILIES).toEqual([
      "Nodesto Caps Condensed",
      "Bookinsanity",
      "Scaly Sans",
      "Mr Eaves Small Caps",
    ])
    expect(CC_BY_SA_4_URL).toContain("by-sa/4.0")
    expect(CC_BY_SA_4_LEGALCODE_URL).toContain("legalcode")
    expect(SOLBERA_FONTS_SOURCE_URL).toContain("solbera-dnd-fonts")
    expect(SOLBERA_ATTRIBUTION_STATEMENT).toMatch(/CC BY-SA 4\.0/)
    expect(SOLBERA_ATTRIBUTION_STATEMENT).toMatch(/not covered by this repository’s MIT license/)
  })

  it("keeps NOTICE and LICENSE beside the bundled otf files", () => {
    const dir = join(process.cwd(), "app", "fonts", "solbera")
    const notice = readFileSync(join(dir, "NOTICE.md"), "utf8")
    const license = readFileSync(join(dir, "LICENSE"), "utf8")
    expect(notice).toMatch(/Creative Commons Attribution-ShareAlike 4\.0/)
    expect(notice).toMatch(/Solbera/)
    expect(notice).toMatch(/\*\*not\*\* MIT-licensed/)
    expect(license).toMatch(/CC BY-SA 4\.0/)
    for (const file of [
      "nodesto-caps-condensed.otf",
      "bookinsanity.otf",
      "scaly-sans.otf",
      "mr-eaves-small-caps.otf",
    ]) {
      expect(readFileSync(join(dir, file)).subarray(0, 4).toString("ascii")).toBe("OTTO")
    }
  })
})
