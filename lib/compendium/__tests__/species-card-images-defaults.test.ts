import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { enrichSrdSpeciesRow } from "@/lib/compendium/enrich-srd-species"
import { enrichCustomSpeciesRow } from "@/lib/compendium/enrich-custom-species"
import { enrichSpeciesList } from "@/lib/compendium/normalize-species-traits"
import {
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
        "Aasimar (2024)",
        "Astral Elf",
        "Autognome",
        "Bugbear",
        "Centaur",
        "Changeling",
        "Changeling (2014)",
        "Changeling (2024)",
        "Deep Gnome",
        "Dhampir",
        "Dragonborn",
        "Dwarf",
        "Eladrin",
        "Elf",
        "Giff",
        "Githzerai",
        "Gnome",
        "Goliath",
        "Hadozee",
        "Halfling",
        "Hexblood",
        "Human",
        "Kalashtar",
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
    expect(SPECIES_CARD_IMAGES_BY_NAME["Aasimar (2014)"]).toMatch(
      /\/images\/compendium\/species\/aasimar-2014\.png$/,
    )
    expect(SPECIES_CARD_IMAGES_BY_NAME["Aasimar (2024)"]).toBe(SPECIES_CARD_IMAGES_BY_NAME.Aasimar)
    expect(SPECIES_CARD_IMAGES_BY_NAME.Changeling).toMatch(
      /\/images\/compendium\/species\/changeling\.png$/,
    )
    expect(SPECIES_CARD_IMAGES_BY_NAME["Changeling (2014)"]).toMatch(
      /\/images\/compendium\/species\/changeling-2014\.png$/,
    )
    expect(SPECIES_CARD_IMAGES_BY_NAME["Changeling (2024)"]).toBe(
      SPECIES_CARD_IMAGES_BY_NAME.Changeling,
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

  it("uses distinct 2014 vs 2024 Aasimar and Changeling portraits", () => {
    const aasimar2014 = enrichCustomSpeciesRow({
      name: "Aasimar (2014)",
      source: "Custom",
      traits: [],
    })
    const aasimar = enrichCustomSpeciesRow({ name: "Aasimar", source: "Custom", traits: [] })
    const changeling2014 = enrichCustomSpeciesRow({
      name: "Changeling (2014)",
      source: "Custom",
      traits: [],
    })
    const changeling = enrichCustomSpeciesRow({ name: "Changeling", source: "Custom", traits: [] })
    expect(aasimar2014.card_image_url).toBe(SPECIES_CARD_IMAGES_BY_NAME["Aasimar (2014)"])
    expect(aasimar.card_image_url).toBe(SPECIES_CARD_IMAGES_BY_NAME.Aasimar)
    expect(aasimar2014.card_image_url).not.toBe(aasimar.card_image_url)
    expect(changeling2014.card_image_url).toBe(SPECIES_CARD_IMAGES_BY_NAME["Changeling (2014)"])
    expect(changeling.card_image_url).toBe(SPECIES_CARD_IMAGES_BY_NAME.Changeling)
    expect(changeling2014.card_image_url).not.toBe(changeling.card_image_url)
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
