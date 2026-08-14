import { describe, expect, it } from "vitest"
import {
  expandCardArtIntoReviewStubs,
  isCardArtOnlyImport,
  persistCardArtImport,
  syncCardArtEntriesFromContent,
} from "@/lib/import/apply-card-art-import"
import { buildByoExtractionPrompt, IMPORT_JSON_TEMPLATES } from "@/lib/import/byo-import-kit"
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
    expect(prompt).not.toContain("Common Modifier wiring")
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
      c1: "overwrite",
    })
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
