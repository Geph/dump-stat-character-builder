import { describe, expect, it } from "vitest"
import {
  expandCardArtIntoReviewStubs,
  isCardArtOnlyImport,
  isDirectCardArtImageUrl,
  persistCardArtImport,
  sanitizeCardArtEntries,
  syncCardArtEntriesFromContent,
} from "@/lib/import/apply-card-art-import"
import { buildByoExtractionPrompt, IMPORT_JSON_TEMPLATES } from "@/lib/import/byo-import-kit"
import { prepareImportedContent } from "@/lib/import/prepare-import"
import { parseImportContentJsonDetailed } from "@/lib/import/parse-import-content-json"
import { defaultCollisionResolutionMap } from "@/lib/import/import-collisions"
import { IMPORT_CONTENT_TYPE_HINTS } from "@/lib/import/content-type-hints"

describe("Images from URL (card_art) import", () => {
  it("exposes the images content-type hint and template", () => {
    expect(IMPORT_CONTENT_TYPE_HINTS.some((h) => h.value === "images")).toBe(true)
    expect(IMPORT_JSON_TEMPLATES.images).toMatchObject({
      card_art: expect.any(Array),
    })
    const prompt = buildByoExtractionPrompt("images")
    expect(prompt).toContain("card_art")
    expect(prompt).toContain("Hosting images")
    expect(prompt).toContain("fetch_url")
    expect(prompt).toContain("tool_result")
    expect(prompt).toContain("Cap total fetch_url calls at 20")
    expect(prompt).not.toContain("Common Modifier wiring")
    expect(prompt).not.toContain("PDF upload workflow")
  })

  it("accepts only direct image URLs and dedupes card_art rows", () => {
    expect(isDirectCardArtImageUrl("https://cdn.example.com/dancer.png?v=2")).toBe(true)
    expect(isDirectCardArtImageUrl("/images/compendium/classes/dancer.jpg")).toBe(true)
    expect(isDirectCardArtImageUrl("https://example.com/gallery")).toBe(false)
    expect(isDirectCardArtImageUrl("https://example.com/folder/")).toBe(false)

    const sanitized = sanitizeCardArtEntries([
      {
        content_type: "class",
        name: "Warden",
        card_image_url: "https://cdn.example.com/classes/warden.png",
      },
      {
        content_type: "class",
        name: "Warden",
        card_image_url: "https://cdn.example.com/other/warden.png",
      },
      {
        content_type: "subclass",
        name: "Warden",
        class_name: "Ranger",
        card_image_url: "https://cdn.example.com/subclasses/ranger/warden.webp",
      },
      {
        content_type: "class",
        name: "Broken",
        card_image_url: "https://example.com/not-an-image",
      },
    ])
    expect(sanitized.droppedInvalid).toBe(1)
    expect(sanitized.droppedDuplicate).toBe(1)
    expect(sanitized.entries).toHaveLength(2)
    expect(sanitized.entries.map((row) => row.card_image_url)).toEqual([
      "https://cdn.example.com/classes/warden.png",
      "https://cdn.example.com/subclasses/ranger/warden.webp",
    ])
  })

  it("drops invalid card_art URLs when parsing import JSON", () => {
    const parsed = parseImportContentJsonDetailed(
      JSON.stringify({
        card_art: [
          {
            content_type: "class",
            name: "Dancer",
            card_image_url: "https://example.com/dancer.png",
          },
          {
            content_type: "class",
            name: "Hallucinated",
            card_image_url: "https://example.com/classes/dancer",
          },
        ],
      }),
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.content.card_art).toHaveLength(1)
    expect(parsed.content.card_art?.[0]?.name).toBe("Dancer")
  })

  it("parses card_art-only JSON and expands review stubs", () => {
    const parsed = parseImportContentJsonDetailed(
      JSON.stringify({
        card_art: [
          {
            content_type: "class",
            name: "Dancer",
            card_image_url: "https://example.com/dancer.png",
          },
          {
            content_type: "background",
            name: "Folk Hero",
            card_image_url: "https://example.com/folk-hero.webp",
          },
        ],
      }),
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(isCardArtOnlyImport(parsed.content)).toBe(true)
    const expanded = expandCardArtIntoReviewStubs(parsed.content)
    expect(expanded.classes?.[0]).toMatchObject({
      name: "Dancer",
      card_image_url: "https://example.com/dancer.png",
    })
    expect(expanded.backgrounds?.[0]).toMatchObject({
      name: "Folk Hero",
      card_image_url: "https://example.com/folk-hero.webp",
    })
    expect(defaultCollisionResolutionMap([{ id: "c1", kind: "class", incomingName: "Dancer", existingName: "Dancer", suggestedName: "Dancer (Custom)" }], expanded)).toEqual({
      c1: "update",
    })
    expect(defaultCollisionResolutionMap(
      [{ id: "c1", kind: "class", incomingName: "Dancer", existingName: "Dancer", suggestedName: "Dancer (Custom)" }],
      { classes: [{ name: "Fighter", description: null, hit_die: 10, primary_ability: [], features: [] }] },
    )).toEqual({
      c1: "rename",
    })
  })

  it("does not invent Warmage resources from image-only class stubs", () => {
    const prepared = prepareImportedContent({
      card_art: [
        {
          content_type: "class",
          name: "Warmage",
          card_image_url: "https://jeffginger.com/dumpstat/images/magehandpress/classes/warmage.png",
        },
      ],
    })
    expect(prepared.kind).toBe("confirm")
    if (prepared.kind !== "confirm") return
    expect(prepared.proposals.classResources).toEqual([])
    expect(prepared.proposals.customAbilities).toEqual([])
    expect(prepared.pendingContent.class_resources).toBeUndefined()
    expect(prepared.pendingContent.import_proposals).toBeUndefined()
  })

  it("merges card art onto existing rows without replacing other fields", async () => {
    const existing = [
      {
        id: "cls1",
        name: "Dancer",
        hit_die: 8,
        features: [{ level: 1, name: "Dance", description: "Bonus Action." }],
        card_image_url: null,
      },
    ]
    const result = await persistCardArtImport(
      [
        {
          content_type: "class",
          name: "Dancer",
          card_image_url: "https://cdn.example.com/dancer.png",
        },
      ],
      {
        listRows: async () => existing,
        upsertByName: async (_store, rows) => {
          expect(rows[0]).toMatchObject({
            id: "cls1",
            name: "Dancer",
            hit_die: 8,
            card_image_url: "https://cdn.example.com/dancer.png",
          })
          expect((rows[0] as { features: unknown[] }).features).toHaveLength(1)
          return rows
        },
      },
    )
    expect(result.totalImported).toBe(1)
    expect(result.warnings).toEqual([])
  })

  it("prefers review stub URLs when syncing card_art", () => {
    const synced = syncCardArtEntriesFromContent({
      card_art: [
        {
          content_type: "class",
          name: "Dancer",
          card_image_url: "https://example.com/old.png",
        },
      ],
      classes: [
        {
          name: "Dancer",
          description: null,
          hit_die: 8,
          primary_ability: [],
          features: [],
          card_image_url: "https://example.com/new.png",
        },
      ],
    })
    expect(synced[0]?.card_image_url).toBe("https://example.com/new.png")
  })
})
