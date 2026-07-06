import { describe, expect, it } from "vitest"
import { enrichBackgroundList } from "@/lib/compendium/normalize-backgrounds"
import { SRD_BACKGROUND_CARD_IMAGES_BY_NAME } from "@/lib/compendium/background-card-images-defaults"

describe("SRD background card images", () => {
  it("maps all four SRD backgrounds to bundled card art paths", () => {
    expect(Object.keys(SRD_BACKGROUND_CARD_IMAGES_BY_NAME).sort()).toEqual(
      ["Acolyte", "Criminal", "Sage", "Soldier"].sort(),
    )
    expect(SRD_BACKGROUND_CARD_IMAGES_BY_NAME.Acolyte).toMatch(
      /\/images\/compendium\/backgrounds\/acolyte\.png$/,
    )
  })

  it("enriches SRD background rows with default card art when unset", () => {
    const [row] = enrichBackgroundList([
      { name: "Sage", source: "SRD", ability_bonuses: { Intelligence: 1, Wisdom: 1 } },
    ] as unknown as import("@/lib/types").Background[])
    expect(row.card_image_url).toBe(SRD_BACKGROUND_CARD_IMAGES_BY_NAME.Sage)
  })

  it("preserves custom card art when already set", () => {
    const custom = "/custom/sage.png"
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
