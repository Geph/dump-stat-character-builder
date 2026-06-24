import { readFileSync, existsSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"
import { normalizeAiImportContent } from "@/lib/import/import-content-ai-schema"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { IMPORT_JSON_TEMPLATES } from "@/lib/import/byo-import-kit"
import {
  collectReferencedSpellNames,
  listMissingReferencedSpellNames,
} from "@/lib/import/collect-referenced-spell-names"
import {
  combineImportContents,
  enrichSubclassSpellTablesOnImport,
} from "@/lib/import/merge-import-content"
import { parseSubclassSpellTable } from "@/lib/import/subclass-spell-table"
import { collectImportModifierReview } from "@/lib/import/import-modifier-previews"

const FIXTURE_DIR = join(
  "d:",
  "Google Drive",
  "Code Projects",
  "dump stat working files",
  "JSON imports",
)

function loadJson(name: string) {
  const path = join(FIXTURE_DIR, name)
  if (!existsSync(path)) throw new Error(`Missing fixture: ${path}`)
  return normalizeAiImportContent(JSON.parse(readFileSync(path, "utf8")))
}

describe("combineImportContents", () => {
  it("merges BYO template spells, class, and subclass payloads", () => {
    const combined = combineImportContents([
      normalizeAiImportContent(IMPORT_JSON_TEMPLATES.spells as Record<string, unknown>),
      normalizeAiImportContent(IMPORT_JSON_TEMPLATES.classes as Record<string, unknown>),
      normalizeAiImportContent(IMPORT_JSON_TEMPLATES.subclasses as Record<string, unknown>),
    ])
    expect(combined.spells?.length).toBeGreaterThan(0)
    expect(combined.classes?.[0]?.name).toBe("Fighter")
    expect(combined.subclasses?.[0]?.name).toBe("Champion")
  })
})

describe("merge import spell libraries", () => {
  it("parses Red Magic Spells table from witch-subclasses.json", () => {
    const witch = loadJson("witch-subclasses.json")
    const redMagic = witch.subclasses
      ?.find((sc) => sc.name === "Red Magic")
      ?.features?.find((f) => f.name === "Red Magic Spells")
    expect(redMagic).toBeTruthy()
    const parsed = parseSubclassSpellTable(redMagic!.description ?? "")
    expect(parsed?.rows.length).toBe(4)
    expect(parsed?.rows[0]?.spellNames).toEqual(
      expect.arrayContaining(["Burning Hands", "Hex: Imperil", "Scorching Ray"]),
    )
  })

  it("combines witch subclasses with valdas and kibbles spell libraries", () => {
    const combined = combineImportContents([
      loadJson("witch-subclasses.json"),
      loadJson("kibbles-spells-parsed.json"),
      loadJson("valdas-spells-201-231.json"),
    ])

    expect(combined.subclasses?.length).toBeGreaterThanOrEqual(9)
    expect(combined.spells?.length).toBeGreaterThan(100)

    const attached = (combined.spells ?? []).find((s) => /exhume/i.test(s.name))
    expect(attached?.classes).toEqual(expect.arrayContaining(["Witch"]))

    const hollowing = (combined.spells ?? []).find((s) => /hollowing curse/i.test(s.name))
    expect(hollowing?.classes).toEqual(expect.arrayContaining(["Witch"]))

    const rubyEye = (combined.spells ?? []).find((s) => /ruby-eye curse/i.test(s.name))
    expect(rubyEye?.classes).toEqual(expect.arrayContaining(["Witch"]))
  })

  it("wires subclass spell tables after spell libraries are combined", () => {
    const combined = combineImportContents([
      loadJson("witch-subclasses.json"),
      loadJson("kibbles-spells-parsed.json"),
      loadJson("valdas-spells-201-231.json"),
    ])

    const enriched = enrichImportContentModifiers(combined)
    const redMagic = enriched.subclasses
      ?.find((sc) => sc.name === "Red Magic")
      ?.features?.find((f) => f.name === "Red Magic Spells")

    expect(
      (redMagic?.linkedModifiers ?? []).some((mod) =>
        (mod.characteristics ?? []).some((char) => char.type === "spells_known"),
      ),
    ).toBe(true)

    const review = collectImportModifierReview(enriched)
    expect(
      review.some(
        (row) =>
          row.sourceLabel === "Subclass: Red Magic (Witch)" &&
          row.featureName === "Red Magic Spells" &&
          row.status === "wired",
      ),
    ).toBe(true)
  })

  it("reports homebrew gaps when supplements lack referenced spells", () => {
    const witch = loadJson("witch-subclasses.json")
    const refs = collectReferencedSpellNames(witch)
    const missing = listMissingReferencedSpellNames(
      witch,
      (witch.spells ?? []).map((s) => s.name),
    )
    expect(refs.length).toBeGreaterThan(50)
    expect(missing).toContain("Exhume")
    expect(missing).toContain("Hollowing Curse")

    const combined = combineImportContents([witch, loadJson("valdas-spells-201-231.json")])
    const stillMissing = listMissingReferencedSpellNames(
      combined,
      (combined.spells ?? []).map((s) => s.name),
    )
    expect(stillMissing).not.toContain("Exhume")
    expect(stillMissing).not.toContain("Hollowing Curse")
    // SRD spells stay missing from import bundles until compendium merge at persist.
    expect(stillMissing).toContain("Burning Hands")
    expect(stillMissing).toContain("Fireball")
  })

  it("normalizes kibbles spell component objects", () => {
    const kibbles = loadJson("kibbles-spells-parsed.json")
    const sample = kibbles.spells?.[0]
    expect(sample?.components).toEqual(expect.arrayContaining(["V", "S"]))
  })
})

describe("enrichSubclassSpellTablesOnImport", () => {
  it("links black magic spells when definitions are present", () => {
    const combined = combineImportContents([
      loadJson("witch-subclasses.json"),
      loadJson("valdas-spells-201-231.json"),
    ])
    const enriched = enrichSubclassSpellTablesOnImport(combined)
    const blackMagic = enriched.subclasses
      ?.find((sc) => sc.name === "Black Magic")
      ?.features?.find((f) => f.name === "Black Magic Spells")
    const spellsKnown = (blackMagic?.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "spells_known")
    expect((spellsKnown?.spells ?? []).some((s) => /exhume/i.test(String(s.spellId)))).toBe(true)
  })
})
