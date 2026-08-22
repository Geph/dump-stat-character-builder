import { describe, expect, it } from "vitest"
import {
  normalizeSpeciesTraitPicksForSpecies,
  resolveSpeciesTraitPicks,
  speciesTraitPickKey,
} from "@/lib/builder/species-trait-picks"
import type { Species } from "@/lib/types"

const elfLike = {
  id: "elf",
  name: "Elf",
  traits: [
    { name: "Darkvision", description: "…" },
    { name: "Elven Lineage", description: "…", isChoice: true },
    { name: "Fey Ancestry", description: "…" },
  ],
} as Species

describe("speciesTraitPickKey", () => {
  it("prefers the trait name", () => {
    expect(speciesTraitPickKey({ name: "Elven Lineage" }, 1)).toBe("Elven Lineage")
  })
})

describe("normalizeSpeciesTraitPicksForSpecies", () => {
  it("rewrites legacy index keys to trait names", () => {
    const normalized = normalizeSpeciesTraitPicksForSpecies({ "1": ["High Elf"] }, elfLike)
    expect(normalized["Elven Lineage"]).toEqual(["High Elf"])
    expect(normalized["1"]).toBeUndefined()
  })

  it("keeps name-keyed picks when the trait order changes", () => {
    const reordered = {
      ...elfLike,
      traits: [
        elfLike.traits![1],
        elfLike.traits![0],
        elfLike.traits![2],
      ],
    } as Species
    const normalized = normalizeSpeciesTraitPicksForSpecies(
      { "Elven Lineage": ["Wood Elf"] },
      reordered,
    )
    expect(resolveSpeciesTraitPicks(normalized, reordered.traits![0]!, 0)).toEqual(["Wood Elf"])
  })
})
