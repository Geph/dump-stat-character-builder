import { describe, expect, it } from "vitest"
import {
  filterSpellsForBuilder,
  isSpellKeptForBuilderAllowlist,
} from "@/lib/compendium/builder-spell-availability"

describe("filterSpellsForBuilder", () => {
  it("keeps allowlisted Necromancer/Investigator spells that were bulk-disabled", () => {
    const rows = [
      { id: "1", name: "Alarm", enabled: false, source: "Kibbles Tasty" },
      { id: "2", name: "Fireball", enabled: false, source: "Kibbles Tasty" },
      { id: "3", name: "Exhume", enabled: true, source: "Mage Hand Press" },
      { id: "4", name: "Blood Print", enabled: false, source: "Kibbles Tasty" },
    ]

    const next = filterSpellsForBuilder(rows)
    expect(next.map((row) => row.name).sort()).toEqual(["Alarm", "Blood Print", "Exhume"])
    expect(next.find((row) => row.name === "Alarm")?.enabled).toBe(true)
    expect(next.find((row) => row.name === "Blood Print")?.enabled).toBe(true)
    expect(next.some((row) => row.name === "Fireball")).toBe(false)
  })

  it("recognizes Necromancer and Investigator allowlist names", () => {
    expect(isSpellKeptForBuilderAllowlist("Gahoul's Shrieking Skull")).toBe(true)
    expect(isSpellKeptForBuilderAllowlist("Alarm")).toBe(true)
    expect(isSpellKeptForBuilderAllowlist("Fireball")).toBe(false)
  })
})
