import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { enrichBackgroundList } from "@/lib/compendium/normalize-backgrounds"
import { SRD_BACKGROUND_CARD_IMAGES_BY_NAME } from "@/lib/compendium/background-card-images-defaults"

describe("background card images", () => {
  it("maps core WOTC backgrounds to bundled local art when available", () => {
    for (const name of ["Acolyte", "Criminal", "Sage", "Soldier", "Haunted One", "Mist Wanderer"]) {
      expect(SRD_BACKGROUND_CARD_IMAGES_BY_NAME[name]).toMatch(
        /\/images\/compendium\/backgrounds\//,
      )
    }
    expect(SRD_BACKGROUND_CARD_IMAGES_BY_NAME.Acolyte).toMatch(/acolyte\.png$/)
    expect(SRD_BACKGROUND_CARD_IMAGES_BY_NAME["Haunted One"]).toMatch(/haunted-one\.png$/)
    expect(SRD_BACKGROUND_CARD_IMAGES_BY_NAME["House Cannith Heir"]).toMatch(
      /house-cannith-heir\.png$/,
    )
  })

  it("keeps hosted dumpstat URLs for backgrounds without bundled sources", () => {
    expect(SRD_BACKGROUND_CARD_IMAGES_BY_NAME.Harper).toMatch(
      /^https:\/\/jeffginger\.com\/dumpstat\/wotc\/backgrounds\//,
    )
  })

  it("ships an optimized image file for every bundled background path", () => {
    const imagesDir = path.join(process.cwd(), "public/images/compendium/backgrounds")
    for (const [name, url] of Object.entries(SRD_BACKGROUND_CARD_IMAGES_BY_NAME)) {
      if (!url.includes("/images/compendium/backgrounds/")) continue
      const file = path.basename(url)
      expect(fs.existsSync(path.join(imagesDir, file)), `missing art for ${name}: ${file}`).toBe(
        true,
      )
    }
  })

  it("enriches non-SRD background rows with default card art when unset", () => {
    const [row] = enrichBackgroundList([
      { name: "Haunted One", source: "Van Richten's Guide to Ravenloft" },
    ] as unknown as import("@/lib/types").Background[])
    expect(row.card_image_url).toBe(SRD_BACKGROUND_CARD_IMAGES_BY_NAME["Haunted One"])
  })

  it("applies bundled defaults when an older bundled path is already set", () => {
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
