import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import { enrichSrdSpellRow, resolveSpellCardImageUrl } from "@/lib/compendium/enrich-srd-spells"
import {
  BUNDLED_SPELL_CARD_IMAGE_NAMES,
  BUNDLED_SPELL_CARD_IMAGES_BY_NAME,
  defaultSpellCardImageUrl,
  spellNameToCardImageSlug,
} from "@/lib/compendium/spell-card-images-defaults"

describe("spell card image defaults", () => {
  it("maps spell names to kebab-case slugs", () => {
    expect(spellNameToCardImageSlug("Acid Splash")).toBe("acid-splash")
    expect(spellNameToCardImageSlug("Green-Flame Blade")).toBe("green-flame-blade")
    expect(spellNameToCardImageSlug("Spare the Dying")).toBe("spare-the-dying")
  })

  it("exposes bundled art for every listed spell name", () => {
    for (const name of BUNDLED_SPELL_CARD_IMAGE_NAMES) {
      expect(defaultSpellCardImageUrl(name)).toMatch(/\/images\/compendium\/spells\//)
    }
  })

  it("ships an image file for every mapped spell", () => {
    const imagesDir = path.join(process.cwd(), "public/images/compendium/spells")
    for (const [name, url] of Object.entries(BUNDLED_SPELL_CARD_IMAGES_BY_NAME)) {
      const file = path.basename(url)
      expect(fs.existsSync(path.join(imagesDir, file)), `missing art for ${name}: ${file}`).toBe(
        true,
      )
    }
  })

  it("applies bundled art to SRD spells on enrich without adding rows", () => {
    const row = enrichSrdSpellRow({ name: "Fire Bolt", source: "SRD", level: 0 })
    expect(row.card_image_url).toMatch(/\/images\/compendium\/spells\/fire-bolt\.png$/)
  })

  it("skips non-SRD rows during SRD enrich", () => {
    const row = enrichSrdSpellRow({ name: "Fire Bolt", source: "Custom", level: 0 })
    expect(row.card_image_url).toBeUndefined()
  })

  it("applies bundled art to remaining Drive-backed SRD cantrips", () => {
    for (const name of ["Eldritch Blast", "Fire Bolt", "Sacred Flame"] as const) {
      const row = enrichSrdSpellRow({ name, source: "SRD", level: 0 })
      expect(row.card_image_url).toMatch(
        new RegExp(`/images/compendium/spells/${spellNameToCardImageSlug(name)}\\.png$`),
      )
    }
  })

  it("keeps custom card art on SRD spells", () => {
    const custom = "https://example.com/custom.png"
    const row = enrichSrdSpellRow({
      name: "Fire Bolt",
      source: "SRD",
      level: 0,
      card_image_url: custom,
    })
    expect(row.card_image_url).toBe(custom)
  })

  it("resolveSpellCardImageUrl falls back to bundled art by name", () => {
    expect(resolveSpellCardImageUrl({ name: "Eldritch Blast" })).toMatch(/eldritch-blast\.png$/)
    expect(
      resolveSpellCardImageUrl({
        name: "Fire Bolt",
        card_image_url: "https://example.com/custom.png",
      }),
    ).toBe("https://example.com/custom.png")
  })
})
