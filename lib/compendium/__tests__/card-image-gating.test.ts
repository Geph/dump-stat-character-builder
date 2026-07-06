import { describe, expect, it } from "vitest"
import {
  compendiumItemSupportsCardImage,
  compendiumTabSupportsCardImage,
  resolveCompendiumCardImageUrl,
} from "@/lib/compendium/card-image"
import { COMMON_MODIFIERS_CATALOG_ID } from "@/lib/compendium/modifier-catalog"

describe("compendiumTabSupportsCardImage", () => {
  it("allows card art on supported tabs", () => {
    expect(compendiumTabSupportsCardImage("classes")).toBe(true)
    expect(compendiumTabSupportsCardImage("subclasses")).toBe(true)
    expect(compendiumTabSupportsCardImage("species")).toBe(true)
    expect(compendiumTabSupportsCardImage("backgrounds")).toBe(true)
    expect(compendiumTabSupportsCardImage("magic_items")).toBe(true)
    expect(compendiumTabSupportsCardImage("abilities")).toBe(true)
  })

  it("disallows card art on other tabs", () => {
    expect(compendiumTabSupportsCardImage("spells")).toBe(false)
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

describe("resolveCompendiumCardImageUrl", () => {
  const item = { card_image_url: "https://example.com/art.png" }

  it("returns null for unsupported tabs even when url is set", () => {
    expect(resolveCompendiumCardImageUrl(item, "spells")).toBeNull()
    expect(resolveCompendiumCardImageUrl(item, "feats")).toBeNull()
  })

  it("returns url for supported tabs", () => {
    expect(resolveCompendiumCardImageUrl(item, "classes")).toBe(item.card_image_url)
    expect(resolveCompendiumCardImageUrl(item, "magic_items")).toBe(item.card_image_url)
  })
})
