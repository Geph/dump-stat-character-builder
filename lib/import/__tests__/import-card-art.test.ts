import { describe, expect, it } from "vitest"
import type { ImportContent } from "@/lib/import/content-schema"
import {
  applyImportCardArtUrls,
  buildInitialImportCardArtUrlMap,
  collectImportCardArtTargets,
  importCardArtTargetKey,
} from "@/lib/import/import-card-art"

describe("import-card-art", () => {
  const content: ImportContent = {
    classes: [{ name: "Witch", description: null, hit_die: 8, primary_ability: ["INT"], features: [] }],
    species: [
      {
        name: "Catfolk",
        description: null,
        speed: 30,
        size: "Medium",
        traits: [],
        card_image_url: "https://example.com/catfolk.png",
      },
    ],
    equipment: [
      {
        name: "Rope",
        category: "Adventuring Gear",
        subcategory: null,
        description: null,
      },
      {
        name: "Cloak of Elvenkind",
        category: "Other",
        subcategory: null,
        description: null,
        magic_item_category: "Wondrous Item",
        rarity: "Uncommon",
      },
    ],
  }

  it("collects art-eligible rows and skips mundane equipment", () => {
    const targets = collectImportCardArtTargets(content)
    expect(targets.map((target) => target.key)).toEqual([
      importCardArtTargetKey("classes", 0),
      importCardArtTargetKey("species", 0),
      importCardArtTargetKey("equipment", 1),
    ])
    expect(targets.find((target) => target.section === "species")?.initialUrl).toBe(
      "https://example.com/catfolk.png",
    )
  })

  it("builds an initial URL map from staged content", () => {
    const map = buildInitialImportCardArtUrlMap(content)
    expect(map[importCardArtTargetKey("species", 0)]).toBe("https://example.com/catfolk.png")
    expect(map[importCardArtTargetKey("classes", 0)]).toBe("")
  })

  it("seeds bundled card defaults when the import row has no URL", () => {
    const withKnownNames: ImportContent = {
      classes: [{ name: "Barbarian", description: null, hit_die: 12, primary_ability: ["STR"], features: [] }],
      subclasses: [
        {
          name: "Path of the Berserker",
          class_name: "Barbarian",
          description: null,
          features: [],
        },
      ],
      backgrounds: [
        {
          name: "Acolyte",
          description: null,
          skill_proficiencies: null,
          feat_granted: null,
          ability_bonuses: null,
        },
      ],
    }
    const map = buildInitialImportCardArtUrlMap(withKnownNames)
    expect(map[importCardArtTargetKey("classes", 0)]).toMatch(/\/images\/compendium\/classes\/barbarian\.png$/)
    expect(map[importCardArtTargetKey("subclasses", 0)]).toMatch(
      /\/images\/compendium\/subclasses\/path-of-the-berserker\.png$/,
    )
    expect(map[importCardArtTargetKey("backgrounds", 0)]).toMatch(
      /\/images\/compendium\/backgrounds\/acolyte\.png$/,
    )
  })

  it("prefers an explicit import URL over a bundled default", () => {
    const withOverride: ImportContent = {
      subclasses: [
        {
          name: "Path of the Berserker",
          class_name: "Barbarian",
          description: null,
          features: [],
          card_image_url: "https://example.com/custom-berserker.png",
        },
      ],
    }
    const map = buildInitialImportCardArtUrlMap(withOverride)
    expect(map[importCardArtTargetKey("subclasses", 0)]).toBe(
      "https://example.com/custom-berserker.png",
    )
  })

  it("applies review URLs onto matching rows by stable index keys", () => {
    const urlMap = {
      [importCardArtTargetKey("classes", 0)]: "https://example.com/witch.png",
      [importCardArtTargetKey("equipment", 1)]: "https://example.com/cloak.png",
    }
    const next = applyImportCardArtUrls(content, urlMap)
    expect(next.classes?.[0]?.card_image_url).toBe("https://example.com/witch.png")
    expect(next.species?.[0]?.card_image_url).toBe("https://example.com/catfolk.png")
    expect(next.equipment?.[0]?.card_image_url).toBeUndefined()
    expect(next.equipment?.[1]?.card_image_url).toBe("https://example.com/cloak.png")
  })

  it("clears card art when the review URL is blank", () => {
    const urlMap = {
      [importCardArtTargetKey("species", 0)]: "",
    }
    const next = applyImportCardArtUrls(content, urlMap)
    expect(next.species?.[0]?.card_image_url).toBeNull()
  })
})
