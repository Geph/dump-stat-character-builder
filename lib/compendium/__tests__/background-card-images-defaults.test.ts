import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { enrichBackgroundList } from "@/lib/compendium/normalize-backgrounds"
import { SRD_BACKGROUND_CARD_IMAGES_BY_NAME } from "@/lib/compendium/background-card-images-defaults"
import { isBundledPublicCardArtPath, publicCardArtPathFromUrl } from "../../../scripts/bundled-card-art.mjs"

describe("background card images", () => {
  it("maps PHB / SRD backgrounds to bundled local art", () => {
    for (const name of [
      "Acolyte",
      "Artisan",
      "Charlatan",
      "Criminal",
      "Entertainer",
      "Farmer",
      "Guard",
      "Guide",
      "Hermit",
      "Merchant",
      "Noble",
      "Sage",
      "Sailor",
      "Scribe",
      "Soldier",
      "Wayfarer",
    ]) {
      expect(SRD_BACKGROUND_CARD_IMAGES_BY_NAME[name]).toMatch(
        /\/images\/compendium\/backgrounds\//,
      )
      expect(SRD_BACKGROUND_CARD_IMAGES_BY_NAME[name]).not.toMatch(/jeffginger\.com/i)
    }
  })

  it("replaces dumpstat hosts with bundled PHB art on enrich", () => {
    const [row] = enrichBackgroundList([
      {
        name: "Noble",
        source: "Player's Handbook",
        card_image_url: "https://jeffginger.com/dumpstat/wotc/backgrounds/Noble.jpeg",
      },
    ] as unknown as import("@/lib/types").Background[])
    expect(row.card_image_url).toBe(SRD_BACKGROUND_CARD_IMAGES_BY_NAME.Noble)
    expect(row.card_image_url).toMatch(/\/images\/compendium\/backgrounds\/noble\.png$/)
  })

  it("does not auto-assign jeffginger dumpstat URLs", () => {
    for (const url of Object.values(SRD_BACKGROUND_CARD_IMAGES_BY_NAME)) {
      expect(url).not.toMatch(/jeffginger\.com/i)
    }
    expect(SRD_BACKGROUND_CARD_IMAGES_BY_NAME.Harper).toBeUndefined()
  })

  it("prefers bundled art for Ravenloft / FRUA backgrounds by name", () => {
    for (const name of ["Carouser", "Inquisitive", "Spirit Medium", "Vampire Devotee"]) {
      expect(SRD_BACKGROUND_CARD_IMAGES_BY_NAME[name]).toMatch(
        /\/images\/compendium\/backgrounds\//,
      )
    }
  })

  it("maps Eberron house heirs, House Agent, and Kibbles Engineer/Tinker", () => {
    expect(SRD_BACKGROUND_CARD_IMAGES_BY_NAME["House Agent"]).toMatch(/house-agent\.png$/)
    expect(SRD_BACKGROUND_CARD_IMAGES_BY_NAME.Engineer).toMatch(/engineer\.png$/)
    expect(SRD_BACKGROUND_CARD_IMAGES_BY_NAME.Tinker).toMatch(/tinker\.png$/)
    expect(SRD_BACKGROUND_CARD_IMAGES_BY_NAME["Gate Guardian"]).toBe(
      SRD_BACKGROUND_CARD_IMAGES_BY_NAME["Gate Warden"],
    )
    expect(SRD_BACKGROUND_CARD_IMAGES_BY_NAME["House Thurani Heir"]).toBe(
      SRD_BACKGROUND_CARD_IMAGES_BY_NAME["House Thuranni Heir"],
    )
    expect(SRD_BACKGROUND_CARD_IMAGES_BY_NAME["House Tharashk"]).toBe(
      SRD_BACKGROUND_CARD_IMAGES_BY_NAME["House Tharashk Heir"],
    )
  })

  it("wires every scripts/background-card-sources slug into defaults", async () => {
    const sourcesDir = path.join(process.cwd(), "scripts/background-card-sources")
    if (!fs.existsSync(sourcesDir)) return
    const { flattenSourceBasenameToSlug } = await import("../../../scripts/card-source-layout.mjs")
    const sourceSlugs: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith(".")) continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
          continue
        }
        if (!/\.(png|jpe?g|webp)$/i.test(entry.name)) continue
        sourceSlugs.push(flattenSourceBasenameToSlug(entry.name.replace(/\.[^.]+$/, "")))
      }
    }
    walk(sourcesDir)
    const mappedSlugs = new Set(
      Object.values(SRD_BACKGROUND_CARD_IMAGES_BY_NAME).map((url) =>
        path.basename(url).replace(/\.png$/, ""),
      ),
    )
    const missing = [...new Set(sourceSlugs)].filter((slug) => slug && !mappedSlugs.has(slug)).sort()
    expect(missing, `unmapped source slugs: ${missing.join(", ")}`).toEqual([])
  })

  it("ships landscape 21:9 optimized files for every bundled background", async () => {
    const imagesDir = path.join(process.cwd(), "public/images/compendium/backgrounds")
    const { default: sharp } = await import("sharp")
    for (const [name, url] of Object.entries(SRD_BACKGROUND_CARD_IMAGES_BY_NAME)) {
      const repoRel = publicCardArtPathFromUrl(url)
      if (!repoRel || !isBundledPublicCardArtPath(repoRel)) continue
      const file = path.basename(url)
      const full = path.join(imagesDir, file)
      expect(fs.existsSync(full), `missing bundled art for ${name}: ${file}`).toBe(true)
      const meta = await sharp(full).metadata()
      expect(meta.width, `${name} width`).toBe(1680)
      expect(meta.height, `${name} height`).toBe(720)
    }
  })

  it("enriches rows by name regardless of source label", () => {
    const [ravenloft] = enrichBackgroundList([
      { name: "Haunted One", source: "Van Richten's Guide to Ravenloft" },
    ] as unknown as import("@/lib/types").Background[])
    expect(ravenloft.card_image_url).toBe(SRD_BACKGROUND_CARD_IMAGES_BY_NAME["Haunted One"])

    const [mislabeled] = enrichBackgroundList([
      { name: "Haunted One", source: "Player's Handbook" },
    ] as unknown as import("@/lib/types").Background[])
    expect(mislabeled.card_image_url).toBe(SRD_BACKGROUND_CARD_IMAGES_BY_NAME["Haunted One"])
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

  it("clears dumpstat hosts when no bundled art exists", () => {
    const [row] = enrichBackgroundList([
      {
        name: "Harper",
        source: "Forgotten Realms",
        card_image_url: "https://jeffginger.com/dumpstat/wotc/backgrounds/Harper.jpeg",
      },
    ] as unknown as import("@/lib/types").Background[])
    expect(row.card_image_url).toBeNull()
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
