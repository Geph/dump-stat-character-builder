import { describe, expect, it } from "vitest"
import {
  collectOriginFeatDuplicateBlockers,
  findDuplicateOriginFeatNames,
  originFeatConflictKey,
  resolveOriginFeatOwnership,
  type OriginFeatOwnership,
} from "@/lib/builder/origin-feat-conflicts"
import type { Feat } from "@/lib/types"

function ownership(
  partial: Pick<OriginFeatOwnership, "featId" | "featName"> &
    Partial<OriginFeatOwnership>,
): OriginFeatOwnership {
  return {
    repeatable: false,
    side: "species",
    ...partial,
  }
}

describe("originFeatConflictKey", () => {
  it("strips parenthetical spell-list suffixes", () => {
    expect(originFeatConflictKey("Magic Initiate (Cleric)")).toBe("magic initiate")
    expect(originFeatConflictKey("Alert")).toBe("alert")
  })
})

describe("findDuplicateOriginFeatNames", () => {
  it("flags the same non-repeatable feat from species and background", () => {
    expect(
      findDuplicateOriginFeatNames(
        [ownership({ featId: "alert", featName: "Alert", side: "species" })],
        [ownership({ featId: "alert", featName: "Alert", side: "background" })],
      ),
    ).toEqual(["Alert"])
  })

  it("flags same-named feats even when ids differ", () => {
    expect(
      findDuplicateOriginFeatNames(
        [ownership({ featId: "alert-srd", featName: "Alert", side: "species" })],
        [ownership({ featId: "alert-phb", featName: "Alert", side: "background" })],
      ),
    ).toEqual(["Alert"])
  })

  it("allows repeatable feats on both sides", () => {
    expect(
      findDuplicateOriginFeatNames(
        [
          ownership({
            featId: "mi",
            featName: "Magic Initiate",
            side: "species",
            repeatable: true,
          }),
        ],
        [
          ownership({
            featId: "mi",
            featName: "Magic Initiate",
            side: "background",
            repeatable: true,
          }),
        ],
      ),
    ).toEqual([])
  })

  it("does not flag unrelated feats", () => {
    expect(
      findDuplicateOriginFeatNames(
        [ownership({ featId: "alert", featName: "Alert", side: "species" })],
        [ownership({ featId: "lucky", featName: "Lucky", side: "background" })],
      ),
    ).toEqual([])
  })
})

describe("resolveOriginFeatOwnership", () => {
  it("looks up feats by id", () => {
    const feats = [
      {
        id: "alert",
        name: "Alert",
        repeatable: false,
        category: "Origin",
      } as Feat,
    ]
    expect(resolveOriginFeatOwnership(["alert", ""], feats, "species")).toEqual([
      {
        featId: "alert",
        featName: "Alert",
        repeatable: false,
        side: "species",
      },
    ])
  })
})

describe("collectOriginFeatDuplicateBlockers", () => {
  it("returns a clear blocker message", () => {
    expect(collectOriginFeatDuplicateBlockers(["Alert"])[0]).toMatch(/species and background/)
    expect(collectOriginFeatDuplicateBlockers([])).toEqual([])
  })
})
