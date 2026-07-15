import { describe, expect, it } from "vitest"
import { sanitizeImportContentForPersist } from "@/lib/import/sanitize-import-content"
import type { ImportContent } from "@/lib/import/content-schema"

describe("sanitizeImportContentForPersist", () => {
  it("hoists new_toggles declared on an individual feature up to the subclass level", () => {
    // The LLM sometimes nests new_toggles inside the feature that needs it instead of on the
    // subclass (sibling of features[]) — ClassFeatureSchema has no new_toggles field, so it
    // would otherwise silently vanish once the feature is normalized for persistence.
    const content = {
      subclasses: [
        {
          name: "Circle of the Sea",
          class_name: "Druid",
          description: null,
          features: [
            {
              level: 10,
              name: "Stormborn",
              description: "Fly Speed while Wrath of the Sea is active.",
              new_toggles: [
                {
                  key: "wrath_of_the_sea_active",
                  name: "Wrath of the Sea Active",
                  grantingFeature: "Wrath of the Sea",
                },
              ],
            },
          ],
        },
      ],
    } as unknown as ImportContent

    const sanitized = sanitizeImportContentForPersist(content)

    expect(sanitized.subclasses?.[0]?.new_toggles).toEqual([
      {
        key: "wrath_of_the_sea_active",
        name: "Wrath of the Sea Active",
        grantingFeature: "Wrath of the Sea",
      },
    ])
    // The stray field is removed from the feature itself once hoisted.
    expect(sanitized.subclasses?.[0]?.features[0]).not.toHaveProperty("new_toggles")
  })

  it("merges feature-level and subclass-level new_toggles without duplicating by key", () => {
    const content = {
      subclasses: [
        {
          name: "Circle of the Stars",
          class_name: "Druid",
          description: null,
          new_toggles: [{ key: "starry_form_active", name: "Starry Form Active", grantingFeature: "Starry Form" }],
          features: [
            {
              level: 10,
              name: "Twinkling Constellations",
              description: "...",
              new_toggles: [
                { key: "starry_form_dragon", name: "Starry Form (Dragon)", grantingFeature: "Starry Form" },
                // duplicate key already declared at the subclass level — should not duplicate
                { key: "starry_form_active", name: "Starry Form Active (dup)", grantingFeature: "Starry Form" },
              ],
            },
          ],
        },
      ],
    } as unknown as ImportContent

    const sanitized = sanitizeImportContentForPersist(content)

    expect(sanitized.subclasses?.[0]?.new_toggles?.map((t) => t.key).sort()).toEqual([
      "starry_form_active",
      "starry_form_dragon",
    ])
  })

  it("leaves subclasses without any new_toggles untouched", () => {
    const content = {
      subclasses: [
        {
          name: "Circle of the Moon",
          class_name: "Druid",
          description: null,
          features: [{ level: 3, name: "Circle Forms", description: "..." }],
        },
      ],
    } as unknown as ImportContent

    const sanitized = sanitizeImportContentForPersist(content)
    expect(sanitized.subclasses?.[0]?.new_toggles).toBeUndefined()
  })
})
