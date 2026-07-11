import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import bundledSubclasses from "@/lib/srd/seed-data/subclasses.json"
import { enrichSrdSubclassRow } from "@/lib/compendium/enrich-srd-subclasses"
import { SRD_SUBCLASS_CARD_IMAGES_BY_NAME } from "@/lib/compendium/subclass-card-images-defaults"

describe("SRD subclass card images", () => {
  it("maps all twelve SRD subclasses to bundled card art paths", () => {
    expect(Object.keys(SRD_SUBCLASS_CARD_IMAGES_BY_NAME).sort()).toEqual(
      bundledSubclasses.map((row) => row.name).sort(),
    )
    expect(SRD_SUBCLASS_CARD_IMAGES_BY_NAME.Champion).toMatch(
      /\/images\/compendium\/subclasses\/champion\.png$/,
    )
  })

  it("ships an optimized image file for every mapped subclass", () => {
    const imagesDir = path.join(process.cwd(), "public/images/compendium/subclasses")
    for (const [name, url] of Object.entries(SRD_SUBCLASS_CARD_IMAGES_BY_NAME)) {
      const file = path.basename(url)
      expect(fs.existsSync(path.join(imagesDir, file)), `missing art for ${name}: ${file}`).toBe(
        true,
      )
    }
  })

  it("enriches SRD subclass rows with default card art when unset", () => {
    const row = enrichSrdSubclassRow(
      {
        name: "Path of the Berserker",
        source: "D&D 5.5e SRD",
        features: [],
      },
      "Barbarian",
    )
    expect(row.card_image_url).toBe(SRD_SUBCLASS_CARD_IMAGES_BY_NAME["Path of the Berserker"])
  })

  it("preserves custom card art when already set", () => {
    const custom = "/custom/berserker.png"
    const row = enrichSrdSubclassRow(
      {
        name: "Path of the Berserker",
        source: "D&D 5.5e SRD",
        features: [],
        card_image_url: custom,
      },
      "Barbarian",
    )
    expect(row.card_image_url).toBe(custom)
  })

  it("does not apply defaults to custom homebrew subclasses", () => {
    const row = enrichSrdSubclassRow(
      {
        name: "Path of the Berserker",
        source: "Custom",
        features: [],
      },
      "Barbarian",
    )
    expect(row.card_image_url).toBeUndefined()
  })
})
