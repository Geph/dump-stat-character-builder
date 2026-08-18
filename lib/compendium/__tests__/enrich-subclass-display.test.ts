import { describe, expect, it } from "vitest"
import { enrichSubclassDisplayDefaults } from "@/lib/compendium/enrich-subclass-display"
import { defaultSubclassCardImageUrl } from "@/lib/compendium/subclass-card-images-defaults"
import { SRD_SUBCLASS_ICONS_BY_NAME } from "@/lib/compendium/subclass-icons-defaults"

describe("enrichSubclassDisplayDefaults", () => {
  it("fills bundled icon and card art for SRD subclasses missing both", () => {
    const row = enrichSubclassDisplayDefaults(
      {
        name: "Oath of Devotion",
        icon: null,
        card_image_url: null,
        source: "D&D 5.5e SRD",
      },
      "Paladin",
    )
    expect(row.icon).toBe(SRD_SUBCLASS_ICONS_BY_NAME["Oath of Devotion"])
    expect(row.card_image_url).toBe(defaultSubclassCardImageUrl("Oath of Devotion", "Paladin"))
  })

  it("keeps custom art and icon when already set", () => {
    const row = enrichSubclassDisplayDefaults(
      {
        name: "Oath of Devotion",
        icon: "custom-icon",
        card_image_url: "https://example.com/custom.png",
        source: "Custom",
      },
      "Paladin",
    )
    expect(row.icon).toBe("custom-icon")
    expect(row.card_image_url).toBe("https://example.com/custom.png")
  })

  it("falls back to the parent class icon when the subclass has no assigned icon", () => {
    const dance = enrichSubclassDisplayDefaults(
      {
        name: "College of Dance",
        icon: null,
        card_image_url: null,
        source: "Player's Handbook",
      },
      "Bard",
    )
    expect(dance.icon).toBe("musical-notes")

    const homebrew = enrichSubclassDisplayDefaults(
      {
        name: "Path of the Homebrew",
        icon: null,
        card_image_url: null,
        source: "Custom",
      },
      "Barbarian",
    )
    expect(homebrew.icon).toBe("sharp-axe")
  })

  it("fills Psion named card art with parent class regardless of source", () => {
    const row = enrichSubclassDisplayDefaults(
      {
        name: "Consuming Mind",
        icon: null,
        card_image_url: null,
        source: "KibblesTasty",
      },
      "Psion",
    )
    expect(row.card_image_url).toBe(defaultSubclassCardImageUrl("Consuming Mind", "Psion"))
  })

  it("does not reuse Artificer Reanimator art for Necromancer Reanimator", () => {
    const row = enrichSubclassDisplayDefaults(
      {
        name: "Reanimator",
        icon: null,
        card_image_url: null,
        source: "Mage Hand Press",
      },
      "Necromancer",
    )
    expect(row.card_image_url).toBeNull()
  })

  it("leaves unmapped homebrew subclasses without bundled art as placeholders", () => {
    const row = enrichSubclassDisplayDefaults(
      {
        name: "Path of the Homebrew",
        icon: null,
        card_image_url: null,
        source: "Custom",
      },
      "Barbarian",
    )
    expect(row.card_image_url).toBeNull()
    expect(row.icon).toBe("sharp-axe")
  })
})
