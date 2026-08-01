import { describe, expect, it } from "vitest"
import { getSubclassesForClass } from "@/lib/builder/choices"
import {
  getCinematicPickerItemClass,
  getFeatSpellGrantPickerPageSize,
  getPickerPageSize,
  getSpellPickerPageSize,
} from "@/lib/builder/picker-pagination"

describe("getSpellPickerPageSize", () => {
  it("shows 8 spells on narrow phone grids", () => {
    expect(getSpellPickerPageSize(false)).toBe(8)
  })

  it("shows 12 spells on sm+ grids", () => {
    expect(getSpellPickerPageSize(true)).toBe(12)
  })
})

describe("getPickerPageSize", () => {
  it("uses 8 items (2×4) for dense phone/medium and 12 for large grids", () => {
    expect(getPickerPageSize("dense", false)).toBe(8)
    expect(getPickerPageSize("dense", true)).toBe(12)
  })

  it("paginates cinematic class/species grids with 2 cols × 3 rows", () => {
    expect(getPickerPageSize("cinematic", false)).toBe(6)
    expect(getPickerPageSize("cinematic", true)).toBe(6)
  })
})

describe("getCinematicPickerItemClass", () => {
  it("sizes phone swipe slides between full-bleed and the tighter 70% pass", () => {
    expect(getCinematicPickerItemClass()).toContain("max-sm:basis-[82%]")
  })
})

describe("getFeatSpellGrantPickerPageSize", () => {
  it("paginates feat spell grants on narrow phones", () => {
    expect(getFeatSpellGrantPickerPageSize(false)).toBe(6)
    expect(getFeatSpellGrantPickerPageSize(true)).toBe(9)
  })
})

describe("getSubclassesForClass", () => {
  it("deduplicates subclasses for a class by id and name", () => {
    const classId = "warlock-id"
    const rows = [
      { id: "fiend-1", class_id: classId, name: "Fiend Patron" },
      { id: "fiend-1", class_id: classId, name: "Fiend Patron" },
      { id: "fiend-2", class_id: classId, name: "Fiend Patron" },
      { id: "archfey", class_id: classId, name: "Archfey Patron" },
      { id: "other", class_id: "other-class", name: "Other" },
    ] as const

    expect(
      getSubclassesForClass([...rows] as unknown as import("@/lib/types").Subclass[], classId),
    ).toHaveLength(2)
  })
})
