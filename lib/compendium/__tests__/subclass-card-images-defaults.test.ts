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
    expect(defaultSubclassCardImageUrl("Hedge Mage", "Occultist")).toMatch(
      /\/images\/compendium\/subclasses\/occultist\/hedge-mage\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Oracle", "Occultist")).toMatch(
      /\/images\/compendium\/subclasses\/occultist\/oracle\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Elemental Soul", "Warden")).toMatch(
      /\/images\/compendium\/subclasses\/warden\/elemental-soul\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Dreadwing", "Warden")).toMatch(
      /\/images\/compendium\/subclasses\/warden\/dreadwing\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Dread Wing", "Warden")).toMatch(
      /\/images\/compendium\/subclasses\/warden\/dreadwing\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Timetwister", "Warden")).toMatch(
      /\/images\/compendium\/subclasses\/warden\/timetwister\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Evoker", "Wizard")).toMatch(
      /\/images\/compendium\/subclasses\/wizard\/evoker\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Alchemist", "Artificer")).toMatch(
      /\/images\/compendium\/subclasses\/artificer\/alchemist\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Cartographer", "Artificer")).toMatch(
      /\/images\/compendium\/subclasses\/artificer\/cartographer\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Shadow Sorcery", "Sorcerer")).toBeNull()
  })

  it("maps dropped PHB subclass sources by class and name", () => {
    expect(defaultSubclassCardImageUrl("College of Dance", "Bard")).toMatch(
      /\/images\/compendium\/subclasses\/bard\/college-of-dance\.png$/,
    )
    expect(defaultSubclassCardImageUrl("College of Spirits", "Bard")).toMatch(
      /\/images\/compendium\/subclasses\/bard\/college-of-spirits\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Light Domain", "Cleric")).toMatch(
      /\/images\/compendium\/subclasses\/cleric\/light-domain\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Trickery Domain", "Cleric")).toMatch(
      /\/images\/compendium\/subclasses\/cleric\/trickery-domain\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Circle of the Moon", "Druid")).toMatch(
      /\/images\/compendium\/subclasses\/druid\/circle-of-the-moon\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Battle Master", "Fighter")).toMatch(
      /\/images\/compendium\/subclasses\/fighter\/battle-master\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Psi Warrior", "Fighter")).toMatch(
      /\/images\/compendium\/subclasses\/fighter\/psi-warrior\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Warrior of Mercy", "Monk")).toMatch(
      /\/images\/compendium\/subclasses\/monk\/warrior-of-mercy\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Banneret", "Fighter")).toMatch(
      /\/images\/compendium\/subclasses\/fighter\/banneret\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Mystic Arts", "Monk")).toMatch(
      /\/images\/compendium\/subclasses\/monk\/mystic-arts\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Knowledge Domain", "Cleric")).toMatch(
      /\/images\/compendium\/subclasses\/cleric\/knowledge-domain\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Eldritch Knight", "Fighter")).toMatch(
      /\/images\/compendium\/subclasses\/fighter\/eldritch-knight\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Arcane Archer", "Fighter")).toMatch(
      /\/images\/compendium\/subclasses\/fighter\/arcane-archer\.png$/,
    )
  })

  it("scopes Reanimator to Artificer and skips unmapped names", () => {
    expect(defaultSubclassCardImageUrl("Reanimator", "Artificer")).toMatch(
      /\/images\/compendium\/subclasses\/artificer\/reanimator\.png$/,
    )
    expect(defaultSubclassCardImageUrl("Reanimator", "Necromancer")).toBeNull()
    expect(defaultSubclassCardImageUrl("Phantom", "Rogue")).toBeNull()
    expect(defaultSubclassCardImageUrl("Undead Patron", "Warlock")).toBeNull()
  })

  it("ships an optimized image file for every mapped subclass", () => {
    const imagesDir = path.join(process.cwd(), "public/images/compendium/subclasses")
    for (const rel of listSubclassCardImageRelativePaths()) {
      expect(fs.existsSync(path.join(imagesDir, rel)), `missing art: ${rel}`).toBe(true)
    }
  })

  it("wires every dropped scripts/subclass-card-sources slug into defaults", async () => {
    const sourcesDir = path.join(process.cwd(), "scripts/subclass-card-sources")
    if (!fs.existsSync(sourcesDir)) return
    const { parseSubclassSourceBasename } = await import("../../../scripts/card-source-layout.mjs")

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
        const parsed = parseSubclassSourceBasename(entry.name.replace(/\.[^.]+$/, ""))
        if (parsed) sourceSlugs.push(`${parsed.classSlug}/${parsed.itemSlug}`)
      }
    }
    walk(sourcesDir)
    sourceSlugs.sort()
    if (sourceSlugs.length === 0) return

    const mappedSlugs = new Set(
      Object.values(SUBCLASS_CARD_IMAGES_BY_CLASS_AND_NAME).map((url) => {
        const marker = "/images/compendium/subclasses/"
        const idx = url.indexOf(marker)
        return url.slice(idx + marker.length).replace(/\.png$/, "")
      }),
    )
    expect([...sourceSlugs].filter((slug) => !mappedSlugs.has(slug))).toEqual([])
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

  it("applies named card art on non-SRD imports (Inventor / Psion / Occultist / Warden)", () => {
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
    const hedgeMage = enrichSrdSubclassRow(
      { name: "Hedge Mage", source: "KibblesTasty Occultist", features: [] },
      "Occultist",
    )
    const dreadwing = enrichSrdSubclassRow(
      { name: "Dreadwing", source: "KibblesTasty Warden", features: [] },
      "Warden",
    )
    expect(hedgeMage.card_image_url).toBe(defaultSubclassCardImageUrl("Hedge Mage", "Occultist"))
    expect(dreadwing.card_image_url).toBe(defaultSubclassCardImageUrl("Dreadwing", "Warden"))
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
    expect(
      rewriteLegacyFlatSubclassCardImageUrl(
        "/images/compendium/subclasses/cleric/light.png",
        "Light Domain",
        "Cleric",
      ),
    ).toMatch(/\/cleric\/light-domain\.png$/)
    expect(
      rewriteLegacyFlatSubclassCardImageUrl(
        "/images/compendium/subclasses/druid/moon.png",
        "Circle of the Moon",
        "Druid",
      ),
    ).toMatch(/\/druid\/circle-of-the-moon\.png$/)
  })
})
