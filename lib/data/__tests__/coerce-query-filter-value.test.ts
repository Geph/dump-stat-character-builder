import { describe, expect, it } from "vitest"
import { coerceQueryFilterValue } from "@/lib/data/coerce-query-filter-value"

describe("coerceQueryFilterValue", () => {
  it("coerces boolean and numeric URL param strings", () => {
    expect(coerceQueryFilterValue("true")).toBe(true)
    expect(coerceQueryFilterValue("false")).toBe(false)
    expect(coerceQueryFilterValue("1")).toBe(1)
    expect(coerceQueryFilterValue("0")).toBe(0)
    expect(coerceQueryFilterValue("null")).toBeNull()
    expect(coerceQueryFilterValue("Discipline Talents")).toBe("Discipline Talents")
  })
})
