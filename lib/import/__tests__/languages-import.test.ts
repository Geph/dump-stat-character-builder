import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { buildImportCollisions } from "@/lib/import/import-collisions"
import { collectImportContentPreview } from "@/lib/import/import-content-preview"
import { buildImportStages } from "@/lib/import/import-staging"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import { summarizeImportPreview } from "@/lib/import/prepare-import"
import { applyUpdateMergesToLanguageRows } from "@/lib/import/merge-collision-update"
import {
  hasHomebrewFixture,
  homebrewFixturePath,
} from "@/lib/import/__tests__/homebrew-fixture-path"

const hasLanguageFixtures = hasHomebrewFixture(
  "eberron-languages.json",
  "wotc-languages.json",
)

describe.runIf(hasLanguageFixtures)("languages import", () => {
  it("parses eberron and wotc language packs", () => {
    const eberron = parseImportContentJson(
      readFileSync(homebrewFixturePath("eberron-languages.json")!, "utf8"),
    )
    const wotc = parseImportContentJson(
      readFileSync(homebrewFixturePath("wotc-languages.json")!, "utf8"),
    )

    expect(eberron?.languages?.map((row) => row.name)).toEqual([
      "Goblin",
      "Quori",
      "Giant",
      "Riedran",
    ])
    expect(eberron?.languages?.find((row) => row.name === "Quori")?.pool).toBe("rare")
    expect(wotc?.languages?.length).toBe(15)
    expect(wotc?.languages?.some((row) => row.name === "Astral Cant")).toBe(true)
    expect(wotc?.languages?.some((row) => row.name === "Balok")).toBe(true)
  })

  it("stages languages, previews them, and detects SRD name collisions for Update merges", () => {
    const content = parseImportContentJson(
      readFileSync(homebrewFixturePath("eberron-languages.json")!, "utf8"),
    )!
    expect(buildImportStages(content).map((stage) => stage.id)).toEqual(["languages"])
    expect(summarizeImportPreview(content)).toContain("4 languages")

    const preview = collectImportContentPreview(content)
    expect(preview.map((section) => section.key)).toEqual(["languages"])
    expect(preview[0]?.items[0]?.name).toBe("Goblin")

    const collisions = buildImportCollisions(content, {
      language: [
        { name: "Goblin", source: "D&D 5.5e SRD" },
        { name: "Giant", source: "D&D 5.5e SRD" },
      ],
    })
    expect(collisions.map((row) => row.incomingName).sort()).toEqual(["Giant", "Goblin"])

    const merged = applyUpdateMergesToLanguageRows(
      content.languages!.map((row) => ({
        ...row,
        pool: row.pool === "rare" ? "rare" : "standard",
      })),
      [
        {
          id: "srd-goblin",
          name: "Goblin",
          pool: "standard",
          description: null,
          typical_speakers: "Goblins, orcs, bugbears",
          script: "Dwarvish",
          source: "D&D 5.5e SRD",
        },
      ],
      ["goblin"],
    )
    const goblin = merged.find((row) => row.name === "Goblin")
    expect(goblin?.id).toBe("srd-goblin")
    expect(goblin?.description).toContain("Dhakaani")
    expect(goblin?.source).toBe("Eberron")
  })
})
