import { describe, expect, it } from "vitest"
import { enrichSpellRowWithBundledCardImage } from "@/lib/compendium/enrich-srd-spells"
import { isDefaultCardArtAvailable } from "@/lib/compendium/available-card-art"

describe("Mage Hand Press cantrip card art", () => {
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
})
