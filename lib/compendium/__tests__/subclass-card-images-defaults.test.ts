import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { enrichSrdSubclassRow } from "@/lib/compendium/enrich-srd-subclasses"
import { SRD_SUBCLASS_CARD_IMAGES_BY_NAME } from "@/lib/compendium/subclass-card-images-defaults"

describe("subclass card images", () => {
  it("maps Drive-approved subclasses including Psion and Inventor", () => {
    expect(SRD_SUBCLASS_CARD_IMAGES_BY_NAME.Champion).toMatch(
      /\/images\/compendium\/subclasses\/champion\.png$/,
    )
    expect(SRD_SUBCLASS_CARD_IMAGES_BY_NAME["Knowing Mind"]).toMatch(
      /\/images\/compendium\/subclasses\/knowing-mind\.png$/,
    )
    expect(SRD_SUBCLASS_CARD_IMAGES_BY_NAME.Gadgetsmith).toMatch(
      /\/images\/compendium\/subclasses\/gadgetsmith\.png$/,
    )
    expect(SRD_SUBCLASS_CARD_IMAGES_BY_NAME.Alchemist).toBeUndefined()
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

  it("enriches subclass rows with default card art when unset", () => {
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

  it("applies named card art on non-SRD imports (Inventor / Psion)", () => {
    const gadgetsmith = enrichSrdSubclassRow(
      { name: "Gadgetsmith", source: "KibblesTasty Inventor", features: [] },
      "Inventor",
    )
    const knowing = enrichSrdSubclassRow(
      { name: "Knowing Mind", source: "KibblesTasty Psion", features: [] },
      "Psion",
    )
    expect(gadgetsmith.card_image_url).toBe(SRD_SUBCLASS_CARD_IMAGES_BY_NAME.Gadgetsmith)
    expect(knowing.card_image_url).toBe(SRD_SUBCLASS_CARD_IMAGES_BY_NAME["Knowing Mind"])
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

  it("does not invent art for unmapped homebrew subclass names", () => {
    const row = enrichSrdSubclassRow(
      {
        name: "Path of the Homebrew",
        source: "Custom",
        features: [],
      },
      "Barbarian",
    )
    expect(row.card_image_url).toBeUndefined()
  })
})
