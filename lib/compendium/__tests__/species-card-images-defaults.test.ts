import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { enrichSrdSpeciesRow } from "@/lib/compendium/enrich-srd-species"
import { enrichCustomSpeciesRow } from "@/lib/compendium/enrich-custom-species"
import { enrichSpeciesList } from "@/lib/compendium/normalize-species-traits"
import {
  defaultSpeciesCardImageUrl,
  SPECIES_CARD_IMAGES_BY_NAME,
  SRD_SPECIES_CARD_IMAGE_NAMES,
} from "@/lib/compendium/species-card-images-defaults"

describe("species card images", () => {
  it("maps all bundled species art paths", () => {
    expect(Object.keys(SPECIES_CARD_IMAGES_BY_NAME).sort()).toEqual(
      [
        "Aarakocra",
        "Aasimar",
        "Aasimar (2014)",
        "Aasimar (2022)",
        "Aasimar (2024)",
        "Astral Elf",
        "Autognome",
        "Bugbear",
        "Centaur",
        "Changeling",
        "Changeling (2014)",
        "Changeling (2022)",
        "Changeling (2024)",
        "Deep Gnome",
        "Dhakaani Ghaal'dar",
        "Dhakaani Ghaal'Dar",
        "Dhakaani Ghaal'dar (Hobgoblin)",
        "Dhakaani Golin'dar",
        "Dhakanni Golin'dar",
        "Dhakaani Golin'dar (Goblin)",
        "Dhakaani Guul'dar",
        "Dhakaani Guul'dar (Bugbear)",
        "Dhampir",
        "Dragonborn",
        "Duergar",
        "Dwarf",
        "Eladrin",
        "Elf",
        "Lorwyn Elf",
        "Fairy",
        "Lorwyn Fairy",
        "Giff",
        "Githzerai",
        "Gnoll",
        "Gnome",
        "Goliath",
        "Hadozee",
        "Halfling",
        "Hexblood",
        "Human",
        "Jhorgun'taal",
        "Jhorgun'taal (Half-Orc)",
        "Kalashtar",
        "Kalamer Landwalker Merfolk",
        "Kalamer Landwalker (Merfolk)",
        "Khoravar",
        "Lupin",
        "Orc",
        "Plasmoid",
        "Reborn",
        "Shifter",
        "Tabaxi",
        "Tiefling",
        "Warforged",
      ].sort(),
    )
    expect(SPECIES_CARD_IMAGES_BY_NAME.Elf).toMatch(/\/images\/compendium\/species\/elf\.png$/)
    expect(SPECIES_CARD_IMAGES_BY_NAME["Astral Elf"]).toMatch(
      /\/images\/compendium\/species\/astral-elf\.png$/,
    )
    expect(SPECIES_CARD_IMAGES_BY_NAME.Autognome).toMatch(
      /\/images\/compendium\/species\/autognome\.png$/,
    )
    expect(SPECIES_CARD_IMAGES_BY_NAME.Aasimar).toMatch(/\/images\/compendium\/species\/aasimar\.png$/)
    expect(SPECIES_CARD_IMAGES_BY_NAME["Aasimar (2022)"]).toMatch(
      /\/images\/compendium\/species\/aasimar-2022\.png$/,
    )
    expect(SPECIES_CARD_IMAGES_BY_NAME["Aasimar (2014)"]).toBe(
      SPECIES_CARD_IMAGES_BY_NAME["Aasimar (2022)"],
    )
    expect(SPECIES_CARD_IMAGES_BY_NAME["Aasimar (2024)"]).toBe(SPECIES_CARD_IMAGES_BY_NAME.Aasimar)
    expect(SPECIES_CARD_IMAGES_BY_NAME.Changeling).toMatch(
      /\/images\/compendium\/species\/changeling\.png$/,
    )
    expect(SPECIES_CARD_IMAGES_BY_NAME["Changeling (2022)"]).toMatch(
      /\/images\/compendium\/species\/changeling-2022\.png$/,
    )
    expect(SPECIES_CARD_IMAGES_BY_NAME["Changeling (2024)"]).toBe(
      SPECIES_CARD_IMAGES_BY_NAME.Changeling,
    )
    expect(SPECIES_CARD_IMAGES_BY_NAME.Fairy).toMatch(/\/images\/compendium\/species\/fairy\.png$/)
    expect(SPECIES_CARD_IMAGES_BY_NAME["Dhakaani Ghaal'dar"]).toMatch(
      /\/images\/compendium\/species\/dhakaani-ghaaldar\.png$/,
    )
  })

  it("resolves parenthetical lineage tags and capitalization variants", () => {
    expect(defaultSpeciesCardImageUrl("Dhakaani Guul'dar (Bugbear)")).toBe(
      SPECIES_CARD_IMAGES_BY_NAME["Dhakaani Guul'dar"],
    )
    expect(defaultSpeciesCardImageUrl("Dhakaani Ghaal'dar (Hobgoblin)")).toBe(
      SPECIES_CARD_IMAGES_BY_NAME["Dhakaani Ghaal'dar"],
    )
    expect(defaultSpeciesCardImageUrl("Dhakaani Ghaal'Dar (Hobgoblin)")).toBe(
      SPECIES_CARD_IMAGES_BY_NAME["Dhakaani Ghaal'dar"],
    )
    expect(defaultSpeciesCardImageUrl("Kalamer Landwalker (Merfolk)")).toBe(
      SPECIES_CARD_IMAGES_BY_NAME["Kalamer Landwalker Merfolk"],
    )
    expect(defaultSpeciesCardImageUrl("Fairy")).toBe(SPECIES_CARD_IMAGES_BY_NAME.Fairy)
    expect(defaultSpeciesCardImageUrl("lorwyn fairy")).toBe(SPECIES_CARD_IMAGES_BY_NAME.Fairy)
  })

  it("keeps MotM 2022 portraits distinct from 2024", () => {
    expect(defaultSpeciesCardImageUrl("Aasimar (2022)")).toBe(
      SPECIES_CARD_IMAGES_BY_NAME["Aasimar (2022)"],
    )
    expect(defaultSpeciesCardImageUrl("Aasimar (2024)")).toBe(SPECIES_CARD_IMAGES_BY_NAME.Aasimar)
    expect(defaultSpeciesCardImageUrl("Aasimar (2022)")).not.toBe(
      defaultSpeciesCardImageUrl("Aasimar (2024)"),
    )
    expect(defaultSpeciesCardImageUrl("Changeling (2022)")).not.toBe(
      defaultSpeciesCardImageUrl("Changeling (2024)"),
    )
  })

  it("ships an optimized image file for every mapped species", () => {
    const imagesDir = path.join(process.cwd(), "public/images/compendium/species")
    for (const [name, url] of Object.entries(SPECIES_CARD_IMAGES_BY_NAME)) {
      const file = path.basename(url)
      expect(fs.existsSync(path.join(imagesDir, file)), `missing art for ${name}: ${file}`).toBe(
        true,
      )
    }
  })

  it("wires every scripts/species-card-sources slug into defaults or 2024 aliases", () => {
    const sourcesDir = path.join(process.cwd(), "scripts/species-card-sources")
    if (!fs.existsSync(sourcesDir)) return
    const sourceSlugs = fs
      .readdirSync(sourcesDir)
      .filter((entry) => /\.(png|jpe?g|webp)$/i.test(entry))
      .map((entry) => path.basename(entry, path.extname(entry)))
      .sort()
    const mappedSlugs = new Set(
      Object.values(SPECIES_CARD_IMAGES_BY_NAME).map((url) =>
        path.basename(url).replace(/\.png$/, ""),
      ),
    )
    // Canonical outputs for *-2024 sources.
    mappedSlugs.add("aasimar")
    mappedSlugs.add("changeling")
    const missing = sourceSlugs.filter((slug) => {
      if (mappedSlugs.has(slug)) return false
      if (slug.endsWith("-2024") && mappedSlugs.has(slug.replace(/-2024$/, ""))) return false
      return true
    })
    expect(missing, `unmapped source slugs: ${missing.join(", ")}`).toEqual([])
  })

  it("maps every SRD species to bundled card art", () => {
    for (const name of SRD_SPECIES_CARD_IMAGE_NAMES) {
      expect(SPECIES_CARD_IMAGES_BY_NAME[name]).toBeTruthy()
    }
  })

  it("enriches SRD species rows with default card art when unset", () => {
    const row = enrichSrdSpeciesRow({ name: "Elf", source: "SRD", traits: [] })
    expect(row.card_image_url).toBe(SPECIES_CARD_IMAGES_BY_NAME.Elf)
  })

  it("preserves custom card art on SRD species", () => {
    const custom = "/custom/elf.png"
    const row = enrichSrdSpeciesRow({
      name: "Elf",
      source: "SRD",
      traits: [],
      card_image_url: custom,
    })
    expect(row.card_image_url).toBe(custom)
  })

  it("does not apply bundled art to non-SRD rows via SRD enrich", () => {
    const row = enrichSrdSpeciesRow({ name: "Tabaxi", source: "Custom", traits: [] })
    expect(row.card_image_url).toBeUndefined()
  })

  it("applies bundled art to custom species when name matches", () => {
    const row = enrichCustomSpeciesRow({ name: "Tabaxi", source: "Custom", traits: [] })
    expect(row.card_image_url).toBe(SPECIES_CARD_IMAGES_BY_NAME.Tabaxi)
  })

  it("applies Fairy and Dhakaani art on custom enrich", () => {
    const fairy = enrichCustomSpeciesRow({ name: "Fairy", source: "Custom", traits: [] })
    const guuldar = enrichCustomSpeciesRow({
      name: "Dhakaani Guul'dar (Bugbear)",
      source: "Eberron",
      traits: [],
    })
    const ghaaldar = enrichCustomSpeciesRow({
      name: "Dhakaani Ghaal'dar (Hobgoblin)",
      source: "Eberron",
      traits: [],
    })
    expect(fairy.card_image_url).toBe(SPECIES_CARD_IMAGES_BY_NAME.Fairy)
    expect(guuldar.card_image_url).toBe(SPECIES_CARD_IMAGES_BY_NAME["Dhakaani Guul'dar"])
    expect(ghaaldar.card_image_url).toBe(SPECIES_CARD_IMAGES_BY_NAME["Dhakaani Ghaal'dar"])
  })

  it("uses distinct MotM vs 2024 Aasimar and Changeling portraits", () => {
    const aasimar2022 = enrichCustomSpeciesRow({
      name: "Aasimar (2022)",
      source: "Custom",
      traits: [],
    })
    const aasimar = enrichCustomSpeciesRow({ name: "Aasimar", source: "Custom", traits: [] })
    const changeling2022 = enrichCustomSpeciesRow({
      name: "Changeling (2022)",
      source: "Custom",
      traits: [],
    })
    const changeling = enrichCustomSpeciesRow({ name: "Changeling", source: "Custom", traits: [] })
    expect(aasimar2022.card_image_url).toBe(SPECIES_CARD_IMAGES_BY_NAME["Aasimar (2022)"])
    expect(aasimar.card_image_url).toBe(SPECIES_CARD_IMAGES_BY_NAME.Aasimar)
    expect(aasimar2022.card_image_url).not.toBe(aasimar.card_image_url)
    expect(changeling2022.card_image_url).toBe(SPECIES_CARD_IMAGES_BY_NAME["Changeling (2022)"])
    expect(changeling.card_image_url).toBe(SPECIES_CARD_IMAGES_BY_NAME.Changeling)
    expect(changeling2022.card_image_url).not.toBe(changeling.card_image_url)
  })

  it("enriches species list with card art for SRD and custom rows", () => {
    const [elf, tabaxi] = enrichSpeciesList([
      { name: "Elf", source: "SRD", traits: [] },
      { name: "Tabaxi", source: "Eberron", traits: [] },
    ] as unknown as import("@/lib/types").Species[])
    expect(elf.card_image_url).toBe(SPECIES_CARD_IMAGES_BY_NAME.Elf)
    expect(tabaxi.card_image_url).toBe(SPECIES_CARD_IMAGES_BY_NAME.Tabaxi)
  })
})
