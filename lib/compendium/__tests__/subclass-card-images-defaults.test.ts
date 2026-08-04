import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { enrichSrdSubclassRow } from "@/lib/compendium/enrich-srd-subclasses"
import {
  defaultSubclassCardImageUrl,
  listSubclassCardImageRelativePaths,
  rewriteLegacyFlatSubclassCardImageUrl,
  SRD_SUBCLASS_CARD_IMAGES_BY_NAME,
  SUBCLASS_CARD_IMAGES_BY_CLASS_AND_NAME,
} from "@/lib/compendium/subclass-card-images-defaults"

describe("subclass card images", () => {
  it("stores art under parent-class subdirectories", () => {
    expect(defaultSubclassCardImageUrl("Champion", "Fighter")).toMatch(
      /\/images\/compendium\/subclasses\/fighter\/champion\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Knowing Mind", "Psion")).toMatch(
      /\/images\/compendium\/subclasses\/psion\/knowing-mind\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Gadgetsmith", "Inventor")).toMatch(
      /\/images\/compendium\/subclasses\/inventor\/gadgetsmith\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Alchemist", "Artificer")).toMatch(
      /\/images\/compendium\/subclasses\/artificer\/alchemist\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Shadow Sorcery", "Sorcerer")).toMatch(
      /\/images\/compendium\/subclasses\/sorcerer\/shadow-magic\.png$/,
    )
  })

  it("disambiguates Reanimator by parent class", () => {
    expect(defaultSubclassCardImageUrl("Reanimator", "Artificer")).toMatch(
      /\/images\/compendium\/subclasses\/artificer\/reanimator\.png$/,
    )
    // Necromancer Reanimator is a different subclass — do not reuse Artificer art.
    expect(defaultSubclassCardImageUrl("Reanimator", "Necromancer")).toBeNull()
  })

  it("ships an optimized image file for every mapped subclass", () => {
    const imagesDir = path.join(process.cwd(), "public/images/compendium/subclasses")
    for (const rel of listSubclassCardImageRelativePaths()) {
      expect(fs.existsSync(path.join(imagesDir, rel)), `missing art: ${rel}`).toBe(true)
    }
  })

  it("wires every scripts/subclass-card-sources nested slug into defaults", () => {
    const sourcesDir = path.join(process.cwd(), "scripts/subclass-card-sources")
    if (!fs.existsSync(sourcesDir)) return

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
        const rel = path.relative(sourcesDir, full)
        const slug = rel.replace(/\.[^.]+$/, "").split(path.sep).join("/")
        sourceSlugs.push(slug)
      }
    }
    walk(sourcesDir)
    sourceSlugs.sort()

    const mappedSlugs = [
      ...new Set(
        Object.values(SUBCLASS_CARD_IMAGES_BY_CLASS_AND_NAME).map((url) => {
          const marker = "/images/compendium/subclasses/"
          const idx = url.indexOf(marker)
          return url.slice(idx + marker.length).replace(/\.png$/, "")
        }),
      ),
    ].sort()
    expect(mappedSlugs).toEqual(sourceSlugs)
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
    expect(row.card_image_url).toBe(
      defaultSubclassCardImageUrl("Path of the Berserker", "Barbarian"),
    )
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
    expect(gadgetsmith.card_image_url).toBe(defaultSubclassCardImageUrl("Gadgetsmith", "Inventor"))
    expect(knowing.card_image_url).toBe(defaultSubclassCardImageUrl("Knowing Mind", "Psion"))
  })

  it("does not assign Artificer Reanimator art to Necromancer Reanimator", () => {
    const row = enrichSrdSubclassRow(
      { name: "Reanimator", source: "Mage Hand Press", features: [] },
      "Necromancer",
    )
    expect(row.card_image_url).toBeUndefined()
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

  it("rewrites legacy flat subclass card paths to class folders", () => {
    expect(
      rewriteLegacyFlatSubclassCardImageUrl(
        "/images/compendium/subclasses/college-of-lore.png",
        "College of Lore",
        "Bard",
      ),
    ).toMatch(/\/images\/compendium\/subclasses\/bard\/college-of-lore\.png$/)
    expect(
      rewriteLegacyFlatSubclassCardImageUrl(
        "/images/compendium/subclasses/college-of-lore.png",
        "College of Lore",
      ),
    ).toMatch(/\/bard\/college-of-lore\.png$/)
    expect(
      rewriteLegacyFlatSubclassCardImageUrl(
        "/images/compendium/subclasses/bard/college-of-lore.png",
        "College of Lore",
        "Bard",
      ),
    ).toMatch(/\/bard\/college-of-lore\.png$/)
  })
})
