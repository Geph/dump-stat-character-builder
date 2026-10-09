import { describe, expect, it } from "vitest"
import { generateRandomCharacterName, nameStyleForSpecies } from "../random-character-name"

describe("species-aware names", () => {
  it("recognizes variants without substring collisions", () => {
    expect(nameStyleForSpecies("High Elf")).toBe("elf")
    expect(nameStyleForSpecies("Half-Orc")).toBe("orc")
    expect(nameStyleForSpecies("Genasi: Earth")).toBe("genasi")
    expect(nameStyleForSpecies("Clockwork Shelf")).toBeUndefined()
  })
  it("uses the selected style and elemental variant", () => {
    expect(generateRandomCharacterName("Dwarf", () => 0)).toBe("Bromrik Coppervein")
    expect(generateRandomCharacterName("Genasi: Earth", () => 0)).toBe("Ashea Flintwake")
    expect(generateRandomCharacterName("Fire Genasi", () => 0)).toBe("Ashea Cinderwake")
  })
  it("falls back to the full style pool for missing or unknown species", () => {
    expect(generateRandomCharacterName(null, () => 0)).toBe(generateRandomCharacterName("Unknown", () => 0))
    expect(generateRandomCharacterName(null, () => 0.999)).not.toBe(generateRandomCharacterName(null, () => 0))
  })
})
