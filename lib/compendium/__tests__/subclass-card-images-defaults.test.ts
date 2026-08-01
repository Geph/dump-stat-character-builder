import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import bundledSubclasses from "@/lib/srd/seed-data/subclasses.json"
import { enrichSrdSubclassRow } from "@/lib/compendium/enrich-srd-subclasses"
import { SRD_SUBCLASS_CARD_IMAGES_BY_NAME } from "@/lib/compendium/subclass-card-images-defaults"

describe("subclass card images", () => {
  it("covers every bundled SRD subclass plus PHB / Psion / Artificer extras", () => {
    for (const row of bundledSubclasses) {
      expect(
        SRD_SUBCLASS_CARD_IMAGES_BY_NAME[row.name],
        `missing default art for SRD subclass ${row.name}`,
      ).toMatch(/\/images\/compendium\/subclasses\//)
    }
    expect(SRD_SUBCLASS_CARD_IMAGES_BY_NAME.Champion).toMatch(
      /\/images\/compendium\/subclasses\/champion\.png$/,
    )
    expect(SRD_SUBCLASS_CARD_IMAGES_BY_NAME.Alchemist).toMatch(
      /\/images\/compendium\/subclasses\/alchemist\.png$/,
    )
    expect(SRD_SUBCLASS_CARD_IMAGES_BY_NAME["Knowing Mind"]).toMatch(
      /\/images\/compendium\/subclasses\/knowing-mind\.png$/,
    )
    expect(SRD_SUBCLASS_CARD_IMAGES_BY_NAME.Gadgetsmith).toMatch(
      /\/images\/compendium\/subclasses\/gadgetsmith\.png$/,
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

  it("applies named card art on non-SRD imports (Artificer / Psion)", () => {
    const alchemist = enrichSrdSubclassRow(
      { name: "Alchemist", source: "Eberron: Forge of the Artificer", features: [] },
      "Artificer",
    )
    const knowing = enrichSrdSubclassRow(
      { name: "Knowing Mind", source: "KibblesTasty Psion", features: [] },
      "Psion",
    )
    expect(alchemist.card_image_url).toBe(SRD_SUBCLASS_CARD_IMAGES_BY_NAME.Alchemist)
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
