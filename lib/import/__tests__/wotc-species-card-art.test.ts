import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import { buildInitialImportCardArtUrlMap, importCardArtTargetKey } from "@/lib/import/import-card-art"
import { homebrewFixturePath, hasHomebrewFixture } from "@/lib/import/__tests__/homebrew-fixture-path"
import { isHostedDumpstatCardImageUrl } from "@/lib/compendium/card-image"

describe("wotc-species import card art", () => {
  const skip = !hasHomebrewFixture("wotc-species")
  it.skipIf(skip)("auto-assigns bundled previews for species with art (no dumpstat)", () => {
    const path = homebrewFixturePath("wotc-species")!
    const content = parseImportContentJson(readFileSync(path, "utf8"))!
    const map = buildInitialImportCardArtUrlMap(content)
    const expected = [
      "Aasimar (2024)",
      "Aasimar (2022)",
      "Changeling (2024)",
      "Changeling (2022)",
      "Dhakaani Ghaal'dar (Hobgoblin)",
      "Dhakaani Golin'dar (Goblin)",
      "Dhakaani Guul'dar (Bugbear)",
      "Jhorgun'taal (Half-Orc)",
      "Lorwyn Elf",
      "Lorwyn Fairy",
      "Fairy",
      "Elf",
      "Firbolg",
      "Goblin (2022)",
      "Genasi: Air",
      "Genasi: Earth",
      "Genasi: Fire",
      "Genasi: Water",
      "Githyanki",
      "Thri-kreen",
      "Sahuagin",
      "Flamekin",
      "Kithkin",
      "Boggarts",
      "Rimekin",
      "Ruinbound",
    ]
    for (const name of expected) {
      const idx = content.species!.findIndex((s) => s.name === name)
      expect(idx, name).toBeGreaterThanOrEqual(0)
      const url = map[importCardArtTargetKey("species", idx)]
      expect(url, name).toMatch(/\/images\/compendium\/species\//)
      expect(isHostedDumpstatCardImageUrl(url)).toBe(false)
    }
    // MotM vs 2024 distinct
    const i24 = content.species!.findIndex((s) => s.name === "Aasimar (2024)")
    const i22 = content.species!.findIndex((s) => s.name === "Aasimar (2022)")
    expect(map[importCardArtTargetKey("species", i24)]).not.toBe(
      map[importCardArtTargetKey("species", i22)],
    )

    const lorwynFairy = content.species!.findIndex((s) => s.name === "Lorwyn Fairy")
    const fairy = content.species!.findIndex((s) => s.name === "Fairy")
    expect(map[importCardArtTargetKey("species", lorwynFairy)]).toMatch(/lorwyn-fairy\.png$/)
    expect(map[importCardArtTargetKey("species", lorwynFairy)]).not.toBe(
      map[importCardArtTargetKey("species", fairy)],
    )

    const lorwynChangeling = content.species!.findIndex((s) => s.name === "Lorwyn Changeling")
    const changeling2024 = content.species!.findIndex((s) => s.name === "Changeling (2024)")
    expect(map[importCardArtTargetKey("species", lorwynChangeling)]).toMatch(
      /lorwyn-changeling\.png$/,
    )
    expect(map[importCardArtTargetKey("species", lorwynChangeling)]).not.toBe(
      map[importCardArtTargetKey("species", changeling2024)],
    )
  })
})
