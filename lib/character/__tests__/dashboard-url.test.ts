import { describe, expect, it } from "vitest"
import {
  DASHBOARD_MAX_CHARACTERS,
  DASHBOARD_MIN_CHARACTERS,
  dashboardHref,
  filterDashboardIds,
  parseDashboardIdsParam,
  serializeDashboardIds,
  validateDashboardSelection,
} from "@/lib/character/dashboard-url"

describe("dashboard-url", () => {
  it("parses, dedupes, and caps ids from the query param", () => {
    expect(parseDashboardIdsParam("a,b,a,c")).toEqual(["a", "b", "c"])
    expect(parseDashboardIdsParam(" one , two ")).toEqual(["one", "two"])
    const many = Array.from({ length: 8 }, (_, index) => `id-${index}`)
    expect(parseDashboardIdsParam(many.join(","))).toHaveLength(DASHBOARD_MAX_CHARACTERS)
  })

  it("serializes ids for shareable URLs", () => {
    expect(serializeDashboardIds(["b", "a", "b"])).toBe("b,a")
    expect(dashboardHref(["alpha", "beta"])).toBe("/dashboard?ids=alpha%2Cbeta")
  })

  it("enforces the 2–6 selection limits", () => {
    expect(validateDashboardSelection(["a"]).ok).toBe(false)
    expect(validateDashboardSelection(["a", "b"]).ok).toBe(true)
    expect(validateDashboardSelection(Array.from({ length: 6 }, (_, i) => `id-${i}`)).ok).toBe(true)
    expect(validateDashboardSelection(Array.from({ length: 7 }, (_, i) => `id-${i}`)).ok).toBe(false)
  })

  it("filters unknown ids against the library", () => {
    const known = new Set(["a", "b"])
    expect(filterDashboardIds(["a", "missing", "b"], known)).toEqual({
      valid: ["a", "b"],
      unknown: ["missing"],
    })
  })

  it("documents min/max constants", () => {
    expect(DASHBOARD_MIN_CHARACTERS).toBe(2)
    expect(DASHBOARD_MAX_CHARACTERS).toBe(6)
  })
})
