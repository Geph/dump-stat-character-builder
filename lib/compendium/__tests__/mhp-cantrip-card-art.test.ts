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

  it("skips cantrips without optimized masters", () => {
    const eye = enrichSpellRowWithBundledCardImage({
      name: "Eye Of Anubis",
      source: "Mage Hand Press",
    })
    expect(eye.card_image_url == null || eye.card_image_url === "").toBe(true)
  })
})
