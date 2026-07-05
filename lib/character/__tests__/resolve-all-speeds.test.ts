import { describe, expect, it } from "vitest"
import { filterDisplaySpeedEntries } from "@/lib/character/resolve-all-speeds"

describe("filterDisplaySpeedEntries", () => {
  it("shows only walk when alternate speeds are ungranted placeholders", () => {
    expect(
      filterDisplaySpeedEntries([
        { type: "walk", label: "walk", feet: 10 },
        { type: "swim", label: "swim", feet: 0 },
        { type: "climb", label: "climb", feet: 0 },
      ]),
    ).toEqual([{ type: "walk", label: "walk", feet: 10 }])
  })

  it("keeps granted alternate speeds with non-zero feet", () => {
    expect(
      filterDisplaySpeedEntries([
        { type: "walk", label: "walk", feet: 30 },
        { type: "fly", label: "fly", feet: 45 },
        { type: "swim", label: "swim", feet: 30 },
      ]),
    ).toEqual([
      { type: "walk", label: "walk", feet: 30 },
      { type: "fly", label: "fly", feet: 45 },
      { type: "swim", label: "swim", feet: 30 },
    ])
  })
})
