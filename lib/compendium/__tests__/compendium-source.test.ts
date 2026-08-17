import { describe, expect, it } from "vitest"
import {
  collectCompendiumSourceOptions,
  compendiumItemSourceKey,
  itemMatchesSourceFilter,
} from "@/lib/compendium/compendium-source"
import {
  groupCompendiumToggleTargets,
  mergeCompendiumToggleTargets,
  type CompendiumToggleTarget,
} from "@/lib/compendium/compendium-toggle"

describe("compendium source filter", () => {
  it("normalizes blank and legacy SRD labels", () => {
    expect(compendiumItemSourceKey(null)).toBe("Custom")
    expect(compendiumItemSourceKey("SRD")).toBe("D&D 5.5e SRD")
    expect(compendiumItemSourceKey("Kibbles Tasty")).toBe("Kibbles Tasty")
  })

  it("collects unique formatted sources", () => {
    expect(
      collectCompendiumSourceOptions([
        { source: "SRD" },
        { source: "D&D 5.5e SRD" },
        { source: "Kibbles Tasty" },
        { source: null },
      ]),
    ).toEqual(["Custom", "D&D 5.5e SRD", "Kibbles Tasty"])
  })

  it("matches a selected source", () => {
    expect(itemMatchesSourceFilter("SRD", "D&D 5.5e SRD")).toBe(true)
    expect(itemMatchesSourceFilter("Kibbles Tasty", "D&D 5.5e SRD")).toBe(false)
    expect(itemMatchesSourceFilter("Custom", "all")).toBe(true)
  })
})

describe("compendium toggle target helpers", () => {
  const subclass = (id: string, name: string): CompendiumToggleTarget => ({
    table: "subclasses",
    contentType: "subclasses",
    id,
    name,
  })

  it("merges dependents and skips already-selected items", () => {
    const primary = {
      table: "classes" as const,
      contentType: "classes" as const,
      id: "psion",
      name: "Psion",
    }
    const merged = mergeCompendiumToggleTargets(
      [[subclass("a", "Chronopath"), subclass("b", "Esper")], [subclass("a", "Chronopath")]],
      new Set([`${primary.table}:${primary.id}`]),
    )
    expect(merged.map((row) => row.id)).toEqual(["a", "b"])
  })

  it("groups related items by type", () => {
    const groups = groupCompendiumToggleTargets([
      subclass("a", "Chronopath"),
      subclass("b", "Esper"),
      {
        table: "class_resources",
        contentType: "class_resources",
        id: "psi",
        name: "Psi Points",
      },
    ])
    expect(groups).toEqual([
      { contentType: "class_resources", label: "Class Resource", names: ["Psi Points"] },
      { contentType: "subclasses", label: "Subclass", names: ["Chronopath", "Esper"] },
    ])
  })
})
