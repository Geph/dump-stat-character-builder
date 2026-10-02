import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import { enrichSpellRowWithBundledCardImage } from "@/lib/compendium/enrich-srd-spells"
import { isDefaultCardArtAvailable } from "@/lib/compendium/available-card-art"
import { normalizeSpellImportRows } from "@/lib/import/normalize-spell-import"
import { loadMageHandPressPack } from "@/lib/seed-packs/mage-hand-press/load"

const hasLocalMhpCantripArt = ["force-dart", "hex-abate", "eye-of-anubis", "hex-decay"].every((slug) =>
  fs.existsSync(path.join(process.cwd(), "public/images/compendium/spells", `${slug}.png`)),
)

describe.skipIf(!hasLocalMhpCantripArt)("Mage Hand Press cantrip card art (local-only PNGs)", () => {
  it("assigns local art for seeded MHP cantrip names", () => {
    const forceDart = enrichSpellRowWithBundledCardImage({
      name: "Force Dart",
      source: "Mage Hand Press",
    })
    const hex = enrichSpellRowWithBundledCardImage({
      name: "Hex:abate",
      source: "Mage Hand Press",
    })
    expect(forceDart.card_image_url).toMatch(/\/images\/compendium\/spells\/force-dart\.png$/)
    expect(hex.card_image_url).toMatch(/\/images\/compendium\/spells\/hex-abate\.png$/)
    expect(isDefaultCardArtAvailable(String(forceDart.card_image_url))).toBe(true)
    expect(isDefaultCardArtAvailable(String(hex.card_image_url))).toBe(true)
  })

  it("assigns local art for the latest MHP cantrip masters", () => {
    const cases = [
      ["Eye Of Anubis", "eye-of-anubis"],
      ["Eye Of Ra", "eye-of-ra"],
      ["Moment To Think", "moment-to-think"],
      ["Hex:blood curse", "hex-blood-curse"],
      ["Hex: Decay", "hex-decay"],
      ["Hex:decay", "hex-decay"],
      ["Hex:hallucination", "hex-hallucination"],
      ["Hex:imperil", "hex-imperil"],
      ["Hex:musical interlude", "hex-musical-interlude"],
    ] as const
    for (const [name, slug] of cases) {
      const row = enrichSpellRowWithBundledCardImage({ name, source: "Mage Hand Press" })
      expect(row.card_image_url, name).toMatch(new RegExp(`/images/compendium/spells/${slug}\\.png$`))
      expect(isDefaultCardArtAvailable(String(row.card_image_url)), name).toBe(true)
    }
  })

  it("stamps card art when the MHP seed pack spells are normalized for persist", () => {
    const { files } = loadMageHandPressPack()
    const spellFile = files.find((file) => (file.spells?.length ?? 0) > 0)
    expect(spellFile?.spells?.length).toBeGreaterThan(0)
    const normalized = normalizeSpellImportRows(
      spellFile!.spells as unknown as Record<string, unknown>[],
    )
    const byName = new Map(normalized.map((row) => [row.name, row]))
    for (const name of ["Eye Of Anubis", "Eye Of Ra", "Moment To Think", "Force Dart"] as const) {
      const row = byName.get(name)
      expect(row, name).toBeTruthy()
      expect(row!.card_image_url, name).toMatch(/\/images\/compendium\/spells\/.+\.png$/)
      expect(isDefaultCardArtAvailable(String(row!.card_image_url)), name).toBe(true)
    }
    // These masters exist locally but are not in magehandpress-spells.json yet.
    expect(byName.has("Hex:blood curse")).toBe(false)
    expect(byName.has("Hex:decay")).toBe(false)
  })
})
