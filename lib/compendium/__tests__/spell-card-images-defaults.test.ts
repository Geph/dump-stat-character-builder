import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import { isBundledPublicCardArtPath } from "@/lib/compendium/bundled-card-art"
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
    expect(spellNameToCardImageSlug("Hex:decay")).toBe("hex-decay")
    expect(spellNameToCardImageSlug("Hex: Decay")).toBe("hex-decay")
    expect(spellNameToCardImageSlug("Dancing Object (Animate Object)")).toBe(
      "dancing-object-animate-object",
    )
    expect(spellNameToCardImageSlug("Trary\u2019s Terrific Transposition")).toBe(
      "trarys-terrific-transposition",
    )
  })

  it("matches Hex cantrip art across colon spacing variants", () => {
    const mapped = { requireAvailable: false } as const
    for (const name of ["Hex:decay", "Hex: Decay", "Hex Decay", "hex:decay"] as const) {
      expect(defaultSpellCardImageUrl(name, mapped), name).toMatch(/\/hex-decay\.png$/)
    }
    expect(defaultSpellCardImageUrl("Hex:evil Eye", mapped)).toMatch(/\/hex-evil-eye\.png$/)
    expect(defaultSpellCardImageUrl("Hex: Evil Eye", mapped)).toMatch(/\/hex-evil-eye\.png$/)
  })

  it("maps Kibbles import spell names to local art when the PNG is present", () => {
    expect(defaultSpellCardImageUrl("Mutate")).toMatch(/\/mutate\.png$/)
    expect(defaultSpellCardImageUrl("Awaken Rope")).toMatch(/\/awaken-rope\.png$/)
    expect(defaultSpellCardImageUrl("Dancing Object (Animate Object)")).toMatch(
      /\/dancing-object-animate-object\.png$/,
    )
    expect(defaultSpellCardImageUrl("Dancing Objects (Animate Object)")).toMatch(
      /\/dancing-object-animate-object\.png$/,
    )
    expect(defaultSpellCardImageUrl("Trary\u2019s Terrific Transposition")).toMatch(
      /\/trarys-terrific-transposition\.png$/,
    )
    expect(defaultSpellCardImageUrl("Beam of Annihilation")).toMatch(
      /\/beam-of-annihilation\.png$/,
    )
  })

  it("maps every listed spell name to a compendium spell path", () => {
    for (const name of BUNDLED_SPELL_CARD_IMAGE_NAMES) {
      expect(defaultSpellCardImageUrl(name, { requireAvailable: false }), name).toMatch(
        /\/images\/compendium\/spells\//,
      )
    }
  })

  it("ships an image file for every git-bundled spell mapping", () => {
    const imagesDir = path.join(process.cwd(), "public/images/compendium/spells")
    const bundled = Object.entries(BUNDLED_SPELL_CARD_IMAGES_BY_NAME).filter(([, url]) =>
      isBundledPublicCardArtPath(`public/images/compendium/spells/${path.basename(url)}`),
    )
    expect(bundled.length).toBeGreaterThan(300)
    for (const [name, url] of bundled) {
      const file = path.basename(url)
      expect(fs.existsSync(path.join(imagesDir, file)), `missing art for ${name}: ${file}`).toBe(
        true,
      )
      expect(defaultSpellCardImageUrl(name), name).toMatch(/\/images\/compendium\/spells\//)
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

  it("applies bundled art to leveled SRD spells when optimized portraits exist", () => {
    for (const name of ["Bane", "Alarm", "Fireball"] as const) {
      const row = enrichSrdSpellRow({ name, source: "SRD", level: 1 })
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
