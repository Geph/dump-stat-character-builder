import { describe, expect, it } from "vitest"
import { enrichBackgroundList } from "@/lib/compendium/normalize-backgrounds"
import { SRD_BACKGROUND_CARD_IMAGES_BY_NAME } from "@/lib/compendium/background-card-images-defaults"

describe("background card images", () => {
  it("maps core WOTC backgrounds to dumpstat hosted art", () => {
    for (const name of ["Acolyte", "Criminal", "Sage", "Soldier", "Haunted One", "Mist Wanderer"]) {
      expect(SRD_BACKGROUND_CARD_IMAGES_BY_NAME[name]).toMatch(
        /^https:\/\/jeffginger\.com\/dumpstat\/wotc\/backgrounds\//,
      )
    }
    expect(SRD_BACKGROUND_CARD_IMAGES_BY_NAME.Acolyte).toContain("Acolyte.jpeg")
    expect(SRD_BACKGROUND_CARD_IMAGES_BY_NAME["Haunted One"]).toContain("Haunted%20One.jpeg")
  })

  it("enriches non-SRD background rows with default card art when unset", () => {
    const [row] = enrichBackgroundList([
      { name: "Haunted One", source: "Van Richten's Guide to Ravenloft" },
    ] as unknown as import("@/lib/types").Background[])
    expect(row.card_image_url).toBe(SRD_BACKGROUND_CARD_IMAGES_BY_NAME["Haunted One"])
  })

  it("upgrades bundled /images/compendium background paths to hosted defaults", () => {
    const [row] = enrichBackgroundList([
      {
        name: "Sage",
        source: "SRD",
        ability_bonuses: { Intelligence: 1, Wisdom: 1 },
        card_image_url: "/images/compendium/backgrounds/sage.png",
      },
    ])
    expect(row.card_image_url).toBe(SRD_BACKGROUND_CARD_IMAGES_BY_NAME.Sage)
  })

  it("preserves custom remote card art when already set", () => {
    const custom = "https://example.com/custom-sage.png"
    const [row] = enrichBackgroundList([
      {
        name: "Sage",
        source: "SRD",
        ability_bonuses: { Intelligence: 1, Wisdom: 1 },
        card_image_url: custom,
      },
    ])
    expect(row.card_image_url).toBe(custom)
  })
})
