import { describe, expect, it } from "vitest"
import { getSubclassesForClass } from "@/lib/builder/choices"
import { getFeatSpellGrantPickerPageSize, getPickerPageSize, getSpellPickerPageSize } from "@/lib/builder/picker-pagination"

describe("getSpellPickerPageSize", () => {
  it("shows 3 rows on narrow screens (2 columns)", () => {
    expect(getSpellPickerPageSize(false)).toBe(6)
  })

  it("shows 3 rows on md+ screens (3 columns)", () => {
    expect(getSpellPickerPageSize(true)).toBe(9)
  })
})

describe("getPickerPageSize", () => {
  it("keeps dense mode at 3 rows for phone and large grids", () => {
    expect(getPickerPageSize("dense", false)).toBe(6)
    expect(getPickerPageSize("dense", true)).toBe(12)
  })

  it("paginates cinematic class/species grids with 2 cols × 3 rows", () => {
    expect(getPickerPageSize("cinematic", false)).toBe(6)
    expect(getPickerPageSize("cinematic", true)).toBe(6)
  })
})

describe("getFeatSpellGrantPickerPageSize", () => {
  it("paginates feat spell grants on narrow phones", () => {
    expect(getFeatSpellGrantPickerPageSize(false)).toBe(6)
    expect(getFeatSpellGrantPickerPageSize(true)).toBe(9)
  })
})

describe("getSubclassesForClass", () => {
  it("deduplicates subclasses for a class", () => {
    const classId = "warlock-id"
    const rows = [
      { id: "fiend-1", class_id: classId, name: "Fiend Patron" },
      { id: "fiend-1", class_id: classId, name: "Fiend Patron" },
      { id: "archfey", class_id: classId, name: "Archfey Patron" },
      { id: "other", class_id: "other-class", name: "Other" },
    ] as const

    expect(
      getSubclassesForClass([...rows] as unknown as import("@/lib/types").Subclass[], classId),
    ).toHaveLength(2)
  })
})
