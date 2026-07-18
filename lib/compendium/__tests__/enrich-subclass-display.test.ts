import { describe, expect, it } from "vitest"
import { enrichSubclassDisplayDefaults } from "@/lib/compendium/enrich-subclass-display"
import { SRD_SUBCLASS_CARD_IMAGES_BY_NAME } from "@/lib/compendium/subclass-card-images-defaults"
import { SRD_SUBCLASS_ICONS_BY_NAME } from "@/lib/compendium/subclass-icons-defaults"

describe("enrichSubclassDisplayDefaults", () => {
  it("fills bundled icon and card art for SRD subclasses missing both", () => {
    const row = enrichSubclassDisplayDefaults({
      name: "Oath of Devotion",
      icon: null,
      card_image_url: null,
      source: "D&D 5.5e SRD",
    })
    expect(row.icon).toBe(SRD_SUBCLASS_ICONS_BY_NAME["Oath of Devotion"])
    expect(row.card_image_url).toBe(SRD_SUBCLASS_CARD_IMAGES_BY_NAME["Oath of Devotion"])
  })

  it("keeps custom art and icon when already set", () => {
    const row = enrichSubclassDisplayDefaults({
      name: "Oath of Devotion",
      icon: "custom-icon",
      card_image_url: "https://example.com/custom.png",
      source: "Custom",
    })
    expect(row.icon).toBe("custom-icon")
    expect(row.card_image_url).toBe("https://example.com/custom.png")
  })

  it("leaves homebrew subclasses without bundled art as placeholders", () => {
    const row = enrichSubclassDisplayDefaults({
      name: "Consuming Mind",
      icon: null,
      card_image_url: null,
      source: "KibblesTasty",
    })
    expect(row.card_image_url).toBeNull()
  })
})
