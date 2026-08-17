import { describe, expect, it } from "vitest"
import {
  applyUpdateMergesToNamedRows,
  filterNewResourceRows,
  findExistingSubclassRow,
  mergeNamedItems,
  mergeRowForUpdate,
  shouldMergeClassResources,
} from "@/lib/import/merge-collision-update"

describe("mergeNamedItems", () => {
  it("appends incoming items that do not already exist", () => {
    const merged = mergeNamedItems(
      [{ name: "Experimental Elixir" }, { name: "Alchemical Savant" }],
      [{ name: "experimental elixir" }, { name: "Alchemical Homunculus" }],
    )
    expect(merged.map((row) => row.name)).toEqual([
      "Experimental Elixir",
      "Alchemical Savant",
      "Alchemical Homunculus",
    ])
  })
})

describe("mergeRowForUpdate", () => {
  it("keeps existing rules and adds new features and images", () => {
    const merged = mergeRowForUpdate(
      {
        id: "cls-1",
        name: "Alchemist",
        description: "Existing class text",
        hit_die: 8,
        features: [{ name: "Experimental Elixir", description: "Keep me" }],
        card_image_url: "",
        enabled: false,
      },
      {
        name: "Alchemist",
        description: "Incoming wipe text",
        hit_die: 10,
        features: [
          { name: "Experimental Elixir", description: "Should not replace" },
          { name: "Alchemical Homunculus", description: "New" },
        ],
        card_image_url: "https://example.com/alchemist.png",
        enabled: true,
      },
    )
    expect(merged.id).toBe("cls-1")
    expect(merged.description).toBe("Existing class text")
    expect(merged.hit_die).toBe(8)
    expect(merged.enabled).toBe(false)
    expect(merged.card_image_url).toBe("https://example.com/alchemist.png")
    expect(merged.features).toEqual([
      { name: "Experimental Elixir", description: "Keep me" },
      { name: "Alchemical Homunculus", description: "New" },
    ])
  })
})

describe("applyUpdateMergesToNamedRows", () => {
  it("merges only the named update rows", () => {
    const next = applyUpdateMergesToNamedRows(
      [
        { name: "Alchemist", features: [{ name: "New Trick" }] },
        { name: "Warmage", features: [{ name: "Arcane Surge" }] },
      ],
      [
        { id: "a", name: "Alchemist", description: "Keep", features: [{ name: "Old Trick" }] },
        { id: "w", name: "Warmage", description: "Warmage keep", features: [] },
      ],
      ["alchemist"],
    )
    expect(next[0]).toMatchObject({
      id: "a",
      description: "Keep",
      features: [{ name: "Old Trick" }, { name: "New Trick" }],
    })
    expect(next[1]).toEqual({ name: "Warmage", features: [{ name: "Arcane Surge" }] })
  })
})

describe("class resource and subclass helpers", () => {
  it("only returns resource keys that are not already stored", () => {
    expect(
      filterNewResourceRows(
        [
          { resource_key: "alchemist_elixir", name: "Elixir" },
          { resource_key: "alchemist_bomb", name: "Bomb" },
        ],
        [{ resource_key: "alchemist_elixir" }],
      ),
    ).toEqual([{ resource_key: "alchemist_bomb", name: "Bomb" }])
  })

  it("matches update class names case-insensitively", () => {
    expect(shouldMergeClassResources("Alchemist", ["alchemist"])).toBe(true)
    expect(shouldMergeClassResources("Warmage", ["alchemist"])).toBe(false)
  })

  it("finds an existing subclass on the same class", () => {
    const existing = [
      { id: "sc-1", name: "Chimera", class_id: "cls-1" },
      { id: "sc-2", name: "Chimera", class_id: "cls-2" },
    ]
    expect(findExistingSubclassRow(existing, "chimera", "cls-1")?.id).toBe("sc-1")
    expect(findExistingSubclassRow(existing, "Chimera", "missing")).toBeUndefined()
  })
})
