import { describe, expect, it } from "vitest"
import { sanitizeImportContentForPersist } from "@/lib/import/sanitize-import-content"
import {
  alignImportParentClassNames,
  classNamesFuzzyMatch,
  resolveParentClassName,
  resolveParentClassRow,
} from "@/lib/import/resolve-parent-class"
import type { ImportContent } from "@/lib/import/content-schema"
import { buildByoExtractionPrompt, IMPORT_JSON_TEMPLATES } from "@/lib/import/byo-import-kit"

describe("resolveParentClassName", () => {
  it("returns exact matches ignoring case and whitespace", () => {
    expect(resolveParentClassName("psion", ["Psion", "Fighter"])).toBe("Psion")
    expect(resolveParentClassName("  Fighter ", ["Fighter"])).toBe("Fighter")
  })

  it("matches designer-prefixed class names uniquely", () => {
    expect(
      resolveParentClassName("Psion", ["KibblesTasty Psion", "Fighter"], {
        preferNames: ["KibblesTasty Psion"],
      }),
    ).toBe("KibblesTasty Psion")
    expect(resolveParentClassName("Psion", ["KibblesTasty Psion"])).toBe("KibblesTasty Psion")
  })

  it("prefers same-batch class names when multiple fuzzy hits exist", () => {
    expect(
      resolveParentClassName("Psion", ["KibblesTasty Psion", "LaserLlama Psion"], {
        preferNames: ["LaserLlama Psion"],
      }),
    ).toBe("LaserLlama Psion")
  })

  it("returns null when fuzzy match is ambiguous without preference", () => {
    expect(resolveParentClassName("Psion", ["KibblesTasty Psion", "LaserLlama Psion"])).toBeNull()
  })

  it("resolves parent rows by id", () => {
    const row = resolveParentClassRow("Psion", [
      { id: "a", name: "Fighter" },
      { id: "b", name: "KibblesTasty Psion" },
    ])
    expect(row).toEqual({ id: "b", name: "KibblesTasty Psion" })
  })

  it("treats suffix forms as fuzzy matches", () => {
    expect(classNamesFuzzyMatch("Psion", "KibblesTasty Psion")).toBe(true)
    expect(classNamesFuzzyMatch("KibblesTasty Psion", "Psion")).toBe(true)
    expect(classNamesFuzzyMatch("Fighter", "Eldritch Knight")).toBe(false)
  })
})

describe("alignImportParentClassNames", () => {
  it("rewrites subclass and resource class_name to match classes[] in the same batch", () => {
    const content = {
      classes: [{ name: "KibblesTasty Psion", description: null, hit_die: 6, features: [] }],
      subclasses: [
        {
          name: "Knowing Mind",
          class_name: "Psion",
          description: null,
          features: [],
        },
      ],
      class_resources: [
        {
          class_name: "Psion",
          resource_key: "psi_points",
          name: "Psi Points",
          uses: { type: "at_level", atLevelMode: "tier", atLevelTable: [{ level: 1, count: 1 }] },
        },
      ],
    } as unknown as ImportContent

    const aligned = alignImportParentClassNames(content)
    expect(aligned.subclasses?.[0]?.class_name).toBe("KibblesTasty Psion")
    expect(aligned.class_resources?.[0]?.class_name).toBe("KibblesTasty Psion")
  })

  it("runs during sanitizeImportContentForPersist", () => {
    const sanitized = sanitizeImportContentForPersist({
      classes: [{ name: "KibblesTasty Psion", description: null, hit_die: 6, features: [] }],
      subclasses: [
        {
          name: "Unleashed Mind",
          class_name: "Psion",
          description: null,
          features: [{ level: 1, name: "Rampage", description: "…" }],
        },
      ],
    } as unknown as ImportContent)

    expect(sanitized.subclasses?.[0]?.class_name).toBe("KibblesTasty Psion")
  })
})

describe("classes BYO template includes subclasses", () => {
  it("documents subclasses[] beside classes[]", () => {
    const template = IMPORT_JSON_TEMPLATES.classes as {
      subclasses?: { name: string; class_name: string }[]
    }
    expect(template.subclasses?.[0]?.class_name).toBe("Fighter")
    expect(buildByoExtractionPrompt("classes")).toContain("subclasses/archetypes/paths")
    expect(buildByoExtractionPrompt("classes")).toContain('"subclasses"')
  })
})
