import { describe, expect, it } from "vitest"
import { applyOrder, moveOrderedId, sortPinnedFirst } from "@/lib/character/feature-layout"

describe("feature layout", () => {
  it("applies a saved section order and keeps new ids at the end", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }]
    expect(applyOrder(items, ["c", "a"], (item) => item.id).map((item) => item.id)).toEqual([
      "c",
      "a",
      "b",
    ])
  })

  it("moves an id to another id's slot", () => {
    expect(moveOrderedId(["class", "subclass", "feats"], [], "feats", "class")).toEqual([
      "feats",
      "class",
      "subclass",
    ])
  })

  it("sorts pinned items first without dropping the rest", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }]
    expect(sortPinnedFirst(items, ["c"], (item) => item.id).map((item) => item.id)).toEqual([
      "c",
      "a",
      "b",
    ])
  })
})
