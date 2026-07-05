import { describe, expect, it } from "vitest"
import { getPickerPageSize, getSpellPickerPageSize } from "@/lib/builder/picker-pagination"

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
})
