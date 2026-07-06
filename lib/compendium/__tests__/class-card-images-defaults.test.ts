import { describe, expect, it } from "vitest"
import { enrichSrdClassRow } from "@/lib/compendium/enrich-srd-classes"
import { SRD_CLASS_CARD_IMAGES_BY_NAME } from "@/lib/compendium/class-card-images-defaults"

describe("SRD class card images", () => {
  it("maps all twelve SRD classes to bundled card art paths", () => {
    expect(Object.keys(SRD_CLASS_CARD_IMAGES_BY_NAME).sort()).toEqual(
      [
        "Barbarian",
        "Bard",
        "Cleric",
        "Druid",
        "Fighter",
        "Monk",
        "Paladin",
        "Ranger",
        "Rogue",
        "Sorcerer",
        "Warlock",
        "Wizard",
      ].sort(),
    )
    expect(SRD_CLASS_CARD_IMAGES_BY_NAME.Bard).toMatch(/\/images\/compendium\/classes\/bard\.png$/)
  })

  it("enriches SRD class rows with default card art when unset", () => {
    const row = enrichSrdClassRow({ name: "Wizard", source: "SRD", features: [] })
    expect(row.card_image_url).toBe(SRD_CLASS_CARD_IMAGES_BY_NAME.Wizard)
  })

  it("preserves custom card art when already set", () => {
    const custom = "/custom/wizard.png"
    const row = enrichSrdClassRow({
      name: "Wizard",
      source: "SRD",
      features: [],
      card_image_url: custom,
    })
    expect(row.card_image_url).toBe(custom)
  })
})
