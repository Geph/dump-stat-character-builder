import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { enrichSrdClassRow } from "@/lib/compendium/enrich-srd-classes"
import { enrichClassesList } from "@/lib/compendium/normalize-class-data"
import { SRD_CLASS_CARD_IMAGES_BY_NAME } from "@/lib/compendium/class-card-images-defaults"
import { isBundledPublicCardArtPath, publicCardArtPathFromUrl } from "../../../scripts/bundled-card-art.mjs"

const EXPECTED_CLASS_NAMES = [
  "Artificer",
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Inventor",
  "Monk",
  "Occultist",
  "Paladin",
  "Psion",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
  "Warden",
  "Warden (Kibbles Tasty)",
]

describe("class card images", () => {
  it("maps SRD / PHB / Artificer / Psion classes to bundled card art paths", () => {
    expect(Object.keys(SRD_CLASS_CARD_IMAGES_BY_NAME).sort()).toEqual(
      [...EXPECTED_CLASS_NAMES].sort(),
    )
    expect(SRD_CLASS_CARD_IMAGES_BY_NAME.Bard).toMatch(/\/images\/compendium\/classes\/bard\.png$/)
    expect(SRD_CLASS_CARD_IMAGES_BY_NAME.Psion).toMatch(/\/images\/compendium\/classes\/psion\.png$/)
    expect(SRD_CLASS_CARD_IMAGES_BY_NAME.Artificer).toMatch(
      /\/images\/compendium\/classes\/artificer\.png$/,
    )
  })

  it("ships an optimized image file for every bundled class", () => {
    const imagesDir = path.join(process.cwd(), "public/images/compendium/classes")
    for (const [name, url] of Object.entries(SRD_CLASS_CARD_IMAGES_BY_NAME)) {
      const repoRel = publicCardArtPathFromUrl(url)
      if (!repoRel || !isBundledPublicCardArtPath(repoRel)) continue
      const file = path.basename(url)
      expect(fs.existsSync(path.join(imagesDir, file)), `missing bundled art for ${name}: ${file}`).toBe(
        true,
      )
    }
  })

  it("enriches SRD class rows with default card art when unset", () => {
    const row = enrichSrdClassRow({ name: "Wizard", source: "SRD", features: [] })
    expect(row.card_image_url).toBe(SRD_CLASS_CARD_IMAGES_BY_NAME.Wizard)
  })

  it("enriches Warlock with bundled warlock card art for visual builder view", () => {
    const row = enrichSrdClassRow({ name: "Warlock", source: "SRD", features: [] })
    expect(row.card_image_url).toBe(SRD_CLASS_CARD_IMAGES_BY_NAME.Warlock)
    expect(row.card_image_url).toMatch(/\/images\/compendium\/classes\/warlock\.png$/)
  })

  it("applies bundled card art to non-SRD named imports (Psion / Artificer / Inventor / Occultist)", () => {
    type ClassRow = {
      name: string
      source: string
      features: unknown[]
      card_image_url?: string | null
    }
    const [psion] = enrichClassesList<ClassRow>([
      { name: "Psion", source: "KibblesTasty Psion", features: [] },
    ])
    const [artificer] = enrichClassesList<ClassRow>([
      { name: "Artificer", source: "Eberron: Forge of the Artificer", features: [] },
    ])
    const [inventor] = enrichClassesList<ClassRow>([
      { name: "Inventor", source: "KibblesTasty Inventor", features: [] },
    ])
    const [occultist] = enrichClassesList<ClassRow>([
      { name: "Occultist", source: "Kibbles Tasty", features: [] },
    ])
    const [warden] = enrichClassesList<ClassRow>([
      { name: "Warden (Kibbles Tasty)", source: "Kibbles Tasty", features: [] },
    ])
    expect(psion.card_image_url).toBe(SRD_CLASS_CARD_IMAGES_BY_NAME.Psion)
    expect(artificer.card_image_url).toBe(SRD_CLASS_CARD_IMAGES_BY_NAME.Artificer)
    expect(inventor.card_image_url).toBe(SRD_CLASS_CARD_IMAGES_BY_NAME.Inventor)
    expect(occultist.card_image_url).toBe(SRD_CLASS_CARD_IMAGES_BY_NAME.Occultist)
    expect(warden.card_image_url).toBe(SRD_CLASS_CARD_IMAGES_BY_NAME["Warden (Kibbles Tasty)"])
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
