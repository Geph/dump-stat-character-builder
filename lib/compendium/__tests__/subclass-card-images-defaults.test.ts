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
import { isBundledPublicCardArtPath } from "../../../scripts/bundled-card-art.mjs"

function expectDefaultSubclassCardImage(
  subclassName: string,
  className: string,
  pattern: RegExp | null,
) {
  const url = defaultSubclassCardImageUrl(subclassName, className)
  if (pattern == null) {
    expect(url).toBeNull()
    return
  }
  if (url == null) {
    // Defaults map still knows the path; CI/GitHub clones omit non-bundled art files.
    expect(
      Object.values(SUBCLASS_CARD_IMAGES_BY_CLASS_AND_NAME).some((candidate) =>
        pattern.test(candidate),
      ),
    ).toBe(true)
    return
  }
  expect(url).toMatch(pattern)
}

describe("subclass card images", () => {
  it("stores art under parent-class subdirectories", () => {
    expectDefaultSubclassCardImage("Champion", "Fighter", /\/images\/compendium\/subclasses\/fighter\/champion\.png$/)
    expectDefaultSubclassCardImage("Knowing Mind", "Psion", /\/images\/compendium\/subclasses\/psion\/knowing-mind\.png$/)
    expectDefaultSubclassCardImage("Gadgetsmith", "Inventor", /\/images\/compendium\/subclasses\/inventor\/gadgetsmith\.png$/)
    expectDefaultSubclassCardImage("Hedge Mage", "Occultist", /\/images\/compendium\/subclasses\/occultist\/hedge-mage\.png$/)
    expectDefaultSubclassCardImage("Oracle", "Occultist", /\/images\/compendium\/subclasses\/occultist\/oracle\.png$/)
    expectDefaultSubclassCardImage("Elemental Soul", "Warden", /\/images\/compendium\/subclasses\/warden\/elemental-soul\.png$/)
    expectDefaultSubclassCardImage("Dreadwing", "Warden", /\/images\/compendium\/subclasses\/warden\/dreadwing\.png$/)
    expectDefaultSubclassCardImage("Dread Wing", "Warden", /\/images\/compendium\/subclasses\/warden\/dreadwing\.png$/)
    expectDefaultSubclassCardImage("Timetwister", "Warden", /\/images\/compendium\/subclasses\/warden\/timetwister\.png$/)
    expectDefaultSubclassCardImage(
      "Elemental Soul",
      "Warden (Kibbles Tasty)",
      /\/images\/compendium\/subclasses\/warden\/elemental-soul\.png$/,
    )
    expectDefaultSubclassCardImage(
      "Dreadwing",
      "Warden (Kibbles Tasty)",
      /\/images\/compendium\/subclasses\/warden\/dreadwing\.png$/,
    )
    expectDefaultSubclassCardImage("Elemental Soul", "Warden (Mage Hand Press)", null)
    expectDefaultSubclassCardImage(
      "Hedge Mage",
      "KibblesTasty Occultist",
      /\/images\/compendium\/subclasses\/occultist\/hedge-mage\.png$/,
    )
    expectDefaultSubclassCardImage("Evoker", "Wizard", /\/images\/compendium\/subclasses\/wizard\/evoker\.png$/)
    expectDefaultSubclassCardImage("Alchemist", "Artificer", /\/images\/compendium\/subclasses\/artificer\/alchemist\.png$/)
    expectDefaultSubclassCardImage(
      "Cartographer",
      "Artificer",
      /\/images\/compendium\/subclasses\/artificer\/cartographer\.png$/,
    )
    expectDefaultSubclassCardImage("Shadow Sorcery", "Sorcerer", /sorcerer\/shadow-sorcery\.png$/)
    expectDefaultSubclassCardImage("Undead Patron", "Warlock", /warlock\/undead-patron\.png$/)
    expectDefaultSubclassCardImage("Spellfire Sorcery", "Sorcerer", /sorcerer\/spellfire-sorcery\.png$/)
    expectDefaultSubclassCardImage("Bladesinging", "Wizard", /wizard\/bladesinging\.png$/)
    expectDefaultSubclassCardImage("Archfey Patron", "Warlock", /warlock\/archfey-patron\.png$/)
    expectDefaultSubclassCardImage("Abjurer", "Wizard", /wizard\/abjurer\.png$/)
    expectDefaultSubclassCardImage("Vestige Patron", "Warlock", /warlock\/vestige-patron\.png$/)
  })

  it("maps dropped PHB subclass sources by class and name", () => {
    expectDefaultSubclassCardImage(
      "College of Dance",
      "Bard",
      /\/images\/compendium\/subclasses\/bard\/college-of-dance\.png$/,
    )
    expectDefaultSubclassCardImage(
      "College of Spirits",
      "Bard",
      /\/images\/compendium\/subclasses\/bard\/college-of-spirits\.png$/,
    )
    expectDefaultSubclassCardImage(
      "Light Domain",
      "Cleric",
      /\/images\/compendium\/subclasses\/cleric\/light-domain\.png$/,
    )
    expectDefaultSubclassCardImage(
      "Trickery Domain",
      "Cleric",
      /\/images\/compendium\/subclasses\/cleric\/trickery-domain\.png$/,
    )
    expectDefaultSubclassCardImage(
      "Circle of the Moon",
      "Druid",
      /\/images\/compendium\/subclasses\/druid\/circle-of-the-moon\.png$/,
    )
    expectDefaultSubclassCardImage(
      "Battle Master",
      "Fighter",
      /\/images\/compendium\/subclasses\/fighter\/battle-master\.png$/,
    )
    expectDefaultSubclassCardImage(
      "Psi Warrior",
      "Fighter",
      /\/images\/compendium\/subclasses\/fighter\/psi-warrior\.png$/,
    )
    expectDefaultSubclassCardImage(
      "Warrior of Mercy",
      "Monk",
      /\/images\/compendium\/subclasses\/monk\/warrior-of-mercy\.png$/,
    )
    expectDefaultSubclassCardImage(
      "Banneret",
      "Fighter",
      /\/images\/compendium\/subclasses\/fighter\/banneret\.png$/,
    )
    expectDefaultSubclassCardImage(
      "Mystic Arts",
      "Monk",
      /\/images\/compendium\/subclasses\/monk\/mystic-arts\.png$/,
    )
    expectDefaultSubclassCardImage(
      "Knowledge Domain",
      "Cleric",
      /\/images\/compendium\/subclasses\/cleric\/knowledge-domain\.png$/,
    )
    expectDefaultSubclassCardImage(
      "Eldritch Knight",
      "Fighter",
      /\/images\/compendium\/subclasses\/fighter\/eldritch-knight\.png$/,
    )
    expectDefaultSubclassCardImage(
      "Arcane Archer",
      "Fighter",
      /\/images\/compendium\/subclasses\/fighter\/arcane-archer\.png$/,
    )
    expectDefaultSubclassCardImage(
      "Oath of Vengeance",
      "Paladin",
      /\/images\/compendium\/subclasses\/paladin\/oath-of-vengeance\.png$/,
    )
    expectDefaultSubclassCardImage(
      "Oath of the Noble Genies",
      "Paladin",
      /\/images\/compendium\/subclasses\/paladin\/oath-of-the-noble-genies\.png$/,
    )
    expectDefaultSubclassCardImage(
      "Beast Master",
      "Ranger",
      /\/images\/compendium\/subclasses\/ranger\/beast-master\.png$/,
    )
    expectDefaultSubclassCardImage(
      "Winter Walker",
      "Ranger",
      /\/images\/compendium\/subclasses\/ranger\/winter-walker\.png$/,
    )
    expectDefaultSubclassCardImage("Warden", "Ranger", /\/images\/compendium\/subclasses\/ranger\/warden\.png$/)
    expectDefaultSubclassCardImage("Warden", "Warden (Kibbles Tasty)", null)
    expectDefaultSubclassCardImage(
      "Soulknife",
      "Rogue",
      /\/images\/compendium\/subclasses\/rogue\/soulknife\.png$/,
    )
    expectDefaultSubclassCardImage(
      "Scion of the Three",
      "Rogue",
      /\/images\/compendium\/subclasses\/rogue\/scion-of-the-three\.png$/,
    )
    expectDefaultSubclassCardImage(
      "Cursesmith",
      "Inventor",
      /\/images\/compendium\/subclasses\/inventor\/cursesmith\.png$/,
    )
    expectDefaultSubclassCardImage(
      "Relicsmith",
      "Inventor",
      /\/images\/compendium\/subclasses\/inventor\/relicsmith\.png$/,
    )
    expectDefaultSubclassCardImage("Witch", "Occultist", /\/images\/compendium\/subclasses\/occultist\/witch\.png$/)
    expectDefaultSubclassCardImage(
      "Voidwatcher",
      "Occultist",
      /\/images\/compendium\/subclasses\/occultist\/voidwatcher\.png$/,
    )
    expectDefaultSubclassCardImage("Shaman", "Occultist", /\/images\/compendium\/subclasses\/occultist\/shaman\.png$/)
    expectDefaultSubclassCardImage(
      "Spiritualist",
      "Occultist",
      /\/images\/compendium\/subclasses\/occultist\/spiritualist\.png$/,
    )
  })

  it("scopes Reanimator to Artificer and skips unmapped names", () => {
    expectDefaultSubclassCardImage(
      "Reanimator",
      "Artificer",
      /\/images\/compendium\/subclasses\/artificer\/reanimator\.png$/,
    )
    expectDefaultSubclassCardImage("Reanimator", "Necromancer", null)
    expectDefaultSubclassCardImage("Phantom", "Rogue", /\/images\/compendium\/subclasses\/rogue\/phantom\.png$/)
    expectDefaultSubclassCardImage(
      "Undead Patron",
      "Warlock",
      /\/images\/compendium\/subclasses\/warlock\/undead-patron\.png$/,
    )
  })

  it("ships an optimized image file for every bundled subclass", () => {
    const imagesDir = path.join(process.cwd(), "public/images/compendium/subclasses")
    for (const rel of listSubclassCardImageRelativePaths()) {
      const repoRel = `public/images/compendium/subclasses/${rel}`
      if (!isBundledPublicCardArtPath(repoRel)) continue
      expect(fs.existsSync(path.join(imagesDir, rel)), `missing bundled art: ${rel}`).toBe(true)
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
      "Warden (Kibbles Tasty)",
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
