import { describe, expect, it, vi } from "vitest"
import {
  compendiumBrowseGridClass,
  COMPENDIUM_LIST_CARD_GRADIENT_CLASS,
  COMPENDIUM_PORTRAIT_CARD_GRADIENT_CLASS,
  COMPENDIUM_SPELL_BACKGROUND_CARD_GRADIENT_CLASS,
  DETAIL_OVERLAY_HERO_GRADIENT_CLASS,
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
  it("uses a single column on phones", () => {
    expect(compendiumBrowseGridClass("classes")).toContain("grid-cols-1")
    expect(compendiumBrowseGridClass("feats")).toContain("grid-cols-1")
    expect(compendiumBrowseGridClass("classes")).toContain("md:grid-cols-2")
    expect(compendiumBrowseGridClass("feats")).toContain("md:grid-cols-2")
    expect(compendiumBrowseGridClass("classes")).not.toContain("sm:grid-cols-2")
    expect(compendiumBrowseGridClass("feats")).not.toContain("sm:grid-cols-2")
  })

  it("uses four columns from xl", () => {
    expect(compendiumBrowseGridClass("classes")).toContain("xl:grid-cols-4")
    expect(compendiumBrowseGridClass("species")).toContain("xl:grid-cols-4")
    expect(compendiumBrowseGridClass("subclasses")).toContain("xl:grid-cols-4")
    expect(compendiumBrowseGridClass("spells")).toContain("xl:grid-cols-4")
    expect(compendiumBrowseGridClass("classes")).toContain("lg:grid-cols-3")
    expect(compendiumBrowseGridClass("classes")).not.toContain("lg:grid-cols-4")
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
  it("uses a taller title-band scrim for class portrait cards", () => {
    expect(COMPENDIUM_PORTRAIT_CARD_GRADIENT_CLASS).toContain("rgba(0,0,0,0.8)_0%")
    expect(COMPENDIUM_PORTRAIT_CARD_GRADIENT_CLASS).toContain("rgba(0,0,0,0.8)_30%")
    expect(COMPENDIUM_PORTRAIT_CARD_GRADIENT_CLASS).toContain("transparent_52%")
  })

  it("uses a 60/20/20 scrim ramp for spells and backgrounds", () => {
    expect(COMPENDIUM_SPELL_BACKGROUND_CARD_GRADIENT_CLASS).toContain("rgba(0,0,0,0.8)_0%")
    expect(COMPENDIUM_SPELL_BACKGROUND_CARD_GRADIENT_CLASS).toContain("rgba(0,0,0,0.8)_20%")
    expect(COMPENDIUM_SPELL_BACKGROUND_CARD_GRADIENT_CLASS).toContain("transparent_40%")
  })

  it("uses a taller detail-overlay scrim on phones", () => {
    expect(DETAIL_OVERLAY_HERO_GRADIENT_CLASS).toContain("max-lg:bg-[linear-gradient")
    expect(DETAIL_OVERLAY_HERO_GRADIENT_CLASS).toContain("transparent_48%")
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

  it("hides bundled default portraits when Midjourney graphics are disabled", () => {
    const store = new Map<string, string>([
      ["dump-stat-builder-layout", "visual"],
      ["dumpstat:disable-default-midjourney-graphics", "1"],
    ])
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
    expect(
      resolveCompendiumCardImageUrl(
        { card_image_url: "/images/compendium/classes/fighter.png" },
        "classes",
      ),
    ).toBeNull()
    expect(
      resolveCompendiumCardImageUrl(
        { card_image_url: "https://example.com/custom.png" },
        "classes",
      ),
    ).toBe("https://example.com/custom.png")
    vi.unstubAllGlobals()
  })
})

describe("bundled card art assignment under Compact Only", () => {
  function stubPresentation(mode: "visual-compact" | "compact-only") {
    const store = new Map<string, string>([["dumpstat:app-presentation-mode", mode]])
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
  }

  it("does not assign SRD defaults when Compact Only is selected", async () => {
    const { applySrdCardImage } = await import("@/lib/compendium/card-image")
    stubPresentation("compact-only")
    const row = applySrdCardImage(
      { name: "Elf", source: "SRD" },
      { Elf: "/images/compendium/species/elf.png" },
    )
    expect(row.card_image_url).toBeUndefined()
    vi.unstubAllGlobals()
  })

  it("clears upgradeable bundled urls when Compact Only is selected", async () => {
    const { applyBundledCardImage } = await import("@/lib/compendium/card-image")
    stubPresentation("compact-only")
    const row = applyBundledCardImage(
      { name: "Elf", card_image_url: "/images/compendium/species/elf.png" },
      { Elf: "/images/compendium/species/elf.png" },
    )
    expect(row.card_image_url).toBeNull()
    vi.unstubAllGlobals()
  })

  it("still assigns defaults in Visual + Compact presentation", async () => {
    const { applySrdCardImage } = await import("@/lib/compendium/card-image")
    stubPresentation("visual-compact")
    const row = applySrdCardImage(
      { name: "Elf", source: "SRD" },
      { Elf: "/images/compendium/species/elf.png" },
    )
    expect(row.card_image_url).toBe("/images/compendium/species/elf.png")
    vi.unstubAllGlobals()
  })

  it("does not assign bundled defaults when Midjourney graphics are disabled", async () => {
    const { applySrdCardImage } = await import("@/lib/compendium/card-image")
    const store = new Map<string, string>([
      ["dumpstat:app-presentation-mode", "visual-compact"],
      ["dumpstat:disable-default-midjourney-graphics", "1"],
    ])
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
    const row = applySrdCardImage(
      { name: "Elf", source: "SRD" },
      { Elf: "/images/compendium/species/elf.png" },
    )
    expect(row.card_image_url).toBeUndefined()
    vi.unstubAllGlobals()
  })
})

describe("custom dumpstat card art", () => {
  it("keeps magehandpress dumpstat URLs under /images/ instead of clearing them", async () => {
    const { applyBundledCardImage } = await import("@/lib/compendium/card-image")
    const url = "https://jeffginger.com/dumpstat/images/magehandpress/classes/alchemist.png"
    const row = applyBundledCardImage({ name: "Alchemist", card_image_url: url }, {})
    expect(row.card_image_url).toBe(url)
  })

  it("rewrites legacy magehandpress paths missing /images/", async () => {
    const { normalizeCardImageUrl, rewriteLegacyDumpstatCardImageUrl } = await import(
      "@/lib/compendium/card-image"
    )
    expect(
      rewriteLegacyDumpstatCardImageUrl(
        "https://jeffginger.com/dumpstat/magehandpress/classes/alchemist.png",
      ),
    ).toBe("https://jeffginger.com/dumpstat/images/magehandpress/classes/alchemist.png")
    expect(
      normalizeCardImageUrl("https://jeffginger.com/dumpstat/magehandpress/classes/witch.png"),
    ).toBe("https://jeffginger.com/dumpstat/images/magehandpress/classes/witch.png")
  })

  it("replaces broken kibbles dumpstat hosts with bundled class art", async () => {
    const { enrichClassesList } = await import("@/lib/compendium/normalize-class-data")
    const { SRD_CLASS_CARD_IMAGES_BY_NAME } = await import(
      "@/lib/compendium/class-card-images-defaults"
    )
    const [inventor] = enrichClassesList([
      {
        name: "Inventor",
        source: "Kibbles Tasty",
        features: [],
        card_image_url: "https://jeffginger.com/dumpstat/kibbles/classes/Inventor.png",
      },
    ])
    expect(inventor.card_image_url).toBe(SRD_CLASS_CARD_IMAGES_BY_NAME.Inventor)
  })
})
