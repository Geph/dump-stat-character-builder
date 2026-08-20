import { describe, expect, it } from "vitest"
import {
  collectImportContentPreview,
  groupImportContentPreviewBySource,
  stripSkippedImportPreviewItems,
} from "@/lib/import/import-content-preview"
import type { ImportContent } from "@/lib/import/content-schema"

describe("collectImportContentPreview", () => {
  it("summarizes spell and equipment fields for import review", () => {
    const content = {
      spells: [
        {
          name: "Fire Bolt",
          level: 0,
          school: "Evocation",
          casting_time: "1 action",
          range: "120 feet",
          components: ["V", "S"],
          duration: "Instantaneous",
          concentration: false,
          description: "You hurl a mote of fire at a creature or object within range.",
          prerequisite_rules: [{ category: "other" as const, value: "Planescape Campaign" }],
          classes: ["Sorcerer", "Wizard"],
        },
      ],
      equipment: [
        {
          name: "Amulet of Retributive Healing",
          category: "Other",
          subcategory: null,
          description:
            "This amulet has 3 charges and regains 1d3 expended charges daily at dawn.",
          cost: null,
          magic_item_category: "Wondrous Item",
          rarity: "Rare",
          requires_attunement: true,
        },
      ],
    }

    const sections = collectImportContentPreview(content)
    const spells = sections.find((section) => section.key === "spells")
    const equipment = sections.find((section) => section.key === "equipment")

    expect(spells?.items[0]?.name).toBe("Fire Bolt")
    expect(spells?.items[0]?.sectionKey).toBe("spells")
    expect(spells?.items[0]?.sourceIndex).toBe(0)
    expect(spells?.items[0]?.details.some((row) => row.label === "School")).toBe(true)
    expect(spells?.items[0]?.details).toContainEqual({
      label: "Other prerequisite",
      value: "Planescape Campaign",
    })
    expect(equipment?.items[0]?.badges).toContain("Magic item")
    expect(equipment?.items[0]?.details.some((row) => row.value === "Rare")).toBe(true)
    expect(equipment?.items[0]?.descriptionSnippet).toMatch(/3 charges/)
  })

  it("keeps original sourceIndex after sort for subclasses", () => {
    const content = {
      subclasses: [
        { name: "Zebra Path", class_name: "Wizard", features: [] },
        { name: "Alpha Path", class_name: "Wizard", features: [] },
      ],
    } as unknown as ImportContent

    const sections = collectImportContentPreview(content)
    const items = sections.find((section) => section.key === "subclasses")?.items ?? []
    expect(items.map((item) => item.name)).toEqual(["Alpha Path", "Zebra Path"])
    expect(items.map((item) => item.sourceIndex)).toEqual([1, 0])
  })

  it("groups mixed class imports by row source and inherits source for subclasses", () => {
    const content = {
      classes: [
        { name: "Inventor", source: "Kibbles Tasty", hit_die: 8, features: [] },
        { name: "Warmage", source: "Mage Hand Press", hit_die: 8, features: [] },
      ],
      subclasses: [
        { name: "Warsmith", class_name: "Inventor", features: [] },
        { name: "House of Kings", class_name: "Warmage", features: [] },
      ],
    } as unknown as ImportContent

    const sections = collectImportContentPreview(content)
    const groups = groupImportContentPreviewBySource(sections)

    expect(groups.map((group) => group.source)).toEqual(["Kibbles Tasty", "Mage Hand Press"])
    expect(groups[0]?.sections.flatMap((section) => section.items.map((item) => item.name))).toEqual([
      "Inventor",
      "Warsmith",
    ])
    expect(groups[1]?.sections.flatMap((section) => section.items.map((item) => item.name))).toEqual([
      "Warmage",
      "House of Kings",
    ])
  })

  it("keeps a single fallback-source group for source-less imports", () => {
    const content = {
      feats: [{ name: "Alert", description: "Always ready." }],
    } as unknown as ImportContent

    const groups = groupImportContentPreviewBySource(
      collectImportContentPreview(content),
      "Custom Book",
    )
    expect(groups).toHaveLength(1)
    expect(groups[0]?.source).toBe("Custom Book")
  })
})

describe("stripSkippedImportPreviewItems", () => {
  it("drops preview soft-skips without touching other sections", () => {
    const content = {
      species: [
        { name: "Aasimar (2022)", size: "Medium", speed: 30, traits: [] },
        { name: "Elf", size: "Medium", speed: 30, traits: [] },
      ],
      feats: [{ name: "Alert", description: "Always ready." }],
    } as unknown as ImportContent

    const next = stripSkippedImportPreviewItems(content, ["species:0"])
    expect(next.species?.map((row) => row.name)).toEqual(["Elf"])
    expect(next.feats).toHaveLength(1)
  })
})
