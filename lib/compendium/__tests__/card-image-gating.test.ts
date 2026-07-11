import { describe, expect, it, vi } from "vitest"
import {
  compendiumBrowseGridClass,
  COMPENDIUM_LIST_CARD_GRADIENT_CLASS,
  COMPENDIUM_PORTRAIT_CARD_GRADIENT_CLASS,
  COMPENDIUM_SPELL_BACKGROUND_CARD_GRADIENT_CLASS,
  compendiumItemSupportsCardImage,
  compendiumPortraitListGradientClass,
  compendiumTabSupportsCardImage,
  compendiumUsesPortraitCardArt,
  hidesCompendiumBrowseCardIcon,
  isCompendiumPortraitGraphicCard,
  usesCompendiumGraphicCardGradient,
  resolveCompendiumCardImageUrl,
} from "@/lib/compendium/card-image"
import { COMMON_MODIFIERS_CATALOG_ID } from "@/lib/compendium/modifier-catalog"

describe("compendiumBrowseGridClass", () => {
  it("uses four columns from lg for portrait card tabs", () => {
    expect(compendiumBrowseGridClass("classes")).toContain("lg:grid-cols-4")
    expect(compendiumBrowseGridClass("species")).toContain("lg:grid-cols-4")
    expect(compendiumBrowseGridClass("subclasses")).toContain("lg:grid-cols-4")
    expect(compendiumBrowseGridClass("spells")).toContain("lg:grid-cols-4")
  })

  it("keeps xl breakpoint for other tabs", () => {
    expect(compendiumBrowseGridClass("feats")).toContain("xl:grid-cols-4")
    expect(compendiumBrowseGridClass("feats")).not.toContain("lg:grid-cols-4")
    expect(compendiumBrowseGridClass("backgrounds")).toContain("xl:grid-cols-4")
  })
})

describe("compendiumUsesPortraitCardArt", () => {
  it("matches classes, species, subclasses, and spells only", () => {
    expect(compendiumUsesPortraitCardArt("classes")).toBe(true)
    expect(compendiumUsesPortraitCardArt("species")).toBe(true)
    expect(compendiumUsesPortraitCardArt("subclasses")).toBe(true)
    expect(compendiumUsesPortraitCardArt("spells")).toBe(true)
    expect(compendiumUsesPortraitCardArt("backgrounds")).toBe(false)
  })
})

describe("isCompendiumPortraitGraphicCard", () => {
  it("uses portrait layout only for portrait tabs with card art", () => {
    const url = "https://example.com/art.png"
    expect(isCompendiumPortraitGraphicCard("classes", url)).toBe(true)
    expect(isCompendiumPortraitGraphicCard("species", url)).toBe(true)
    expect(isCompendiumPortraitGraphicCard("subclasses", url)).toBe(true)
    expect(isCompendiumPortraitGraphicCard("spells", url)).toBe(true)
    expect(isCompendiumPortraitGraphicCard("backgrounds", url)).toBe(false)
    expect(isCompendiumPortraitGraphicCard("backgrounds", null)).toBe(false)
    expect(isCompendiumPortraitGraphicCard("feats", url)).toBe(false)
  })

  it("uses the graphic-card gradient for portrait tabs and widescreen backgrounds with art", () => {
    const url = "https://example.com/art.png"
    expect(usesCompendiumGraphicCardGradient("species", url)).toBe(true)
    expect(usesCompendiumGraphicCardGradient("backgrounds", url)).toBe(true)
    expect(compendiumPortraitListGradientClass("species", url)).toBe(
      COMPENDIUM_PORTRAIT_CARD_GRADIENT_CLASS,
    )
    expect(compendiumPortraitListGradientClass("backgrounds", url)).toBe(
      COMPENDIUM_SPELL_BACKGROUND_CARD_GRADIENT_CLASS,
    )
    expect(compendiumPortraitListGradientClass("spells", url)).toBe(
      COMPENDIUM_SPELL_BACKGROUND_CARD_GRADIENT_CLASS,
    )
    expect(compendiumPortraitListGradientClass("backgrounds", url)).not.toBe(
      COMPENDIUM_LIST_CARD_GRADIENT_CLASS,
    )
    expect(usesCompendiumGraphicCardGradient("feats", url)).toBe(false)
  })
})

describe("hidesCompendiumBrowseCardIcon", () => {
  const url = "https://example.com/art.png"

  it("hides icons for portrait tabs and backgrounds with card art", () => {
    expect(hidesCompendiumBrowseCardIcon("classes", url)).toBe(true)
    expect(hidesCompendiumBrowseCardIcon("species", url)).toBe(true)
    expect(hidesCompendiumBrowseCardIcon("backgrounds", url)).toBe(true)
  })

  it("shows icons when there is no card art or the tab is not graphic", () => {
    expect(hidesCompendiumBrowseCardIcon("backgrounds", null)).toBe(false)
    expect(hidesCompendiumBrowseCardIcon("feats", url)).toBe(false)
    expect(hidesCompendiumBrowseCardIcon("magic_items", url)).toBe(false)
  })
})

describe("compendiumTabSupportsCardImage", () => {
  it("allows card art on supported tabs", () => {
    expect(compendiumTabSupportsCardImage("classes")).toBe(true)
    expect(compendiumTabSupportsCardImage("subclasses")).toBe(true)
    expect(compendiumTabSupportsCardImage("species")).toBe(true)
    expect(compendiumTabSupportsCardImage("spells")).toBe(true)
    expect(compendiumTabSupportsCardImage("backgrounds")).toBe(true)
    expect(compendiumTabSupportsCardImage("magic_items")).toBe(true)
    expect(compendiumTabSupportsCardImage("abilities")).toBe(true)
  })

  it("disallows card art on other tabs", () => {
    expect(compendiumTabSupportsCardImage("feats")).toBe(false)
    expect(compendiumTabSupportsCardImage("equipment")).toBe(false)
    expect(compendiumTabSupportsCardImage("tools")).toBe(false)
    expect(compendiumTabSupportsCardImage("languages")).toBe(false)
    expect(compendiumTabSupportsCardImage("class_resources")).toBe(false)
  })
})

describe("compendiumItemSupportsCardImage", () => {
  it("excludes system modifier catalog abilities", () => {
    expect(
      compendiumItemSupportsCardImage("abilities", {
        id: COMMON_MODIFIERS_CATALOG_ID,
        is_system: true,
      }),
    ).toBe(false)
  })

  it("allows custom abilities", () => {
    expect(
      compendiumItemSupportsCardImage("abilities", {
        id: "custom-ability-id",
        is_system: false,
      }),
    ).toBe(true)
  })
})

describe("compendium graphic card gradient", () => {
  it("uses a 65/15/20 scrim ramp for class portrait cards", () => {
    expect(COMPENDIUM_PORTRAIT_CARD_GRADIENT_CLASS).toContain("rgba(0,0,0,0.8)_0%")
    expect(COMPENDIUM_PORTRAIT_CARD_GRADIENT_CLASS).toContain("transparent_35%")
  })

  it("uses a 60/20/20 scrim ramp for spells and backgrounds", () => {
    expect(COMPENDIUM_SPELL_BACKGROUND_CARD_GRADIENT_CLASS).toContain("rgba(0,0,0,0.8)_0%")
    expect(COMPENDIUM_SPELL_BACKGROUND_CARD_GRADIENT_CLASS).toContain("rgba(0,0,0,0.8)_20%")
    expect(COMPENDIUM_SPELL_BACKGROUND_CARD_GRADIENT_CLASS).toContain("transparent_40%")
  })
})

describe("resolveCompendiumCardImageUrl", () => {
  const item = { card_image_url: "https://example.com/art.png" }

  it("returns null for unsupported tabs even when url is set", () => {
    expect(resolveCompendiumCardImageUrl(item, "feats")).toBeNull()
    expect(resolveCompendiumCardImageUrl(item, "equipment")).toBeNull()
  })

  it("returns url for supported tabs", () => {
    expect(resolveCompendiumCardImageUrl(item, "classes")).toBe(item.card_image_url)
    expect(resolveCompendiumCardImageUrl(item, "spells")).toBe(item.card_image_url)
    expect(resolveCompendiumCardImageUrl(item, "magic_items")).toBe(item.card_image_url)
  })

  it("hides card art when the shared layout preference is compact", () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
    }
    vi.stubGlobal("window", { localStorage: storage })
    vi.stubGlobal("localStorage", storage)
    store.set("dump-stat-builder-layout", "compact")
    expect(resolveCompendiumCardImageUrl(item, "classes")).toBeNull()
    store.set("dump-stat-builder-layout", "visual")
    expect(resolveCompendiumCardImageUrl(item, "classes")).toBe(item.card_image_url)
    vi.unstubAllGlobals()
  })
})
