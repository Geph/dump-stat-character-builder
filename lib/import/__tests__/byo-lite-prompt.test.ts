import { describe, expect, it } from "vitest"
import {
  BYO_LITE_PROMPT_MAX_CHARS,
  buildByoExtractionPrompt,
  buildByoFullPrompt,
} from "@/lib/import/byo-import-kit"
import { AI_MECHANIC_KINDS } from "@/lib/import/modifier-wiring-registry"

const CONTENT_TYPES = [
  "classes",
  "subclasses",
  "species",
  "backgrounds",
  "spells",
  "feats",
  "creatures",
  "equipment",
  "abilities",
  "invocations_metamagic",
  "languages",
  "all",
] as const

const lite = (hint: string, options: Parameters<typeof buildByoExtractionPrompt>[1] = {}) =>
  buildByoExtractionPrompt(hint, { ...options, promptMode: "lite" })

describe("BYO lite prompt (entry-level LLM budget)", () => {
  it.each(CONTENT_TYPES)("keeps %s instructions under the lite budget", (hint) => {
    expect(lite(hint).length).toBeLessThanOrEqual(BYO_LITE_PROMPT_MAX_CHARS)
  })

  it("stays under budget with PDF upload, custom systems, and subclass match", () => {
    const withEverything = lite("abilities", {
      pdfUpload: true,
      pageScope: { mode: "range", start: 10, end: 30 },
      customSystems: { abilityCategory: "Exploits", classResourceLabels: "Exploit Dice, Grit" },
    })
    expect(withEverything.length).toBeLessThanOrEqual(BYO_LITE_PROMPT_MAX_CHARS)
    expect(withEverything).toContain('Ability library section: "Exploits"')
    expect(withEverything).toContain("Exploit Dice; Grit")
    expect(withEverything).toContain("PDF upload workflow")

    const subclass = lite("subclasses", { subclassMatch: { className: "Fighter" } })
    expect(subclass.length).toBeLessThanOrEqual(BYO_LITE_PROMPT_MAX_CHARS)
    expect(subclass).toContain("Fighter")
  })

  it("leaves the default full prompt unchanged", () => {
    expect(buildByoExtractionPrompt("classes")).toBe(buildByoExtractionPrompt("classes", { promptMode: "full" }))
    expect(buildByoExtractionPrompt("classes")).toContain("INDEX — Homebrew patterns")
  })

  it("leads with verbatim wording and omits the class-named homebrew index", () => {
    const prompt = lite("classes")
    expect(prompt).toContain("Copy every rules sentence verbatim")
    expect(prompt).not.toContain("INDEX — Homebrew patterns")
    expect(prompt).not.toContain("INDEX — Description phrases")
  })

  it("lists every allowed mechanics kind and the unresolved escape hatch where mechanics apply", () => {
    for (const hint of ["classes", "subclasses", "species", "feats", "abilities", "invocations_metamagic"]) {
      const prompt = lite(hint)
      for (const kind of AI_MECHANIC_KINDS) expect(prompt).toContain(kind)
      expect(prompt).toContain('"kind": "unresolved"')
      expect(prompt).toContain("Do NOT output linkedModifiers")
    }
  })

  it("keeps class essentials: resources, card blurbs, subclasses, and batching", () => {
    const prompt = lite("classes")
    expect(prompt).toContain("class_resources[]")
    expect(prompt).toContain("rechargeOnInitiative")
    expect(prompt).toContain("dieSidesByLevel")
    expect(prompt).toContain("Always emit card_blurb")
    expect(prompt).toContain("subclasses/archetypes/paths")
    expect(prompt).toContain("Continue with:")
    expect(prompt).toContain('"class_resources"')
  })

  it("keeps libraries out of spells[] and propagates section rules", () => {
    const prompt = lite("abilities")
    expect(prompt).toContain("import_proposals.custom_abilities[]")
    expect(prompt).toContain("never spells[]")
    expect(prompt).toContain("applies to every row in that section")
  })

  it("skips modifier guidance for content types that do not use it", () => {
    for (const hint of ["spells", "equipment", "languages", "creatures"]) {
      expect(lite(hint)).not.toContain("Allowed kind values")
    }
  })

  it("puts the source after the delimiter in the full paste", () => {
    const full = buildByoFullPrompt("Second Wind. You regain hit points.", "classes", { promptMode: "lite" })
    const delimiter = full.indexOf("========== SOURCE TEXT TO EXTRACT ==========")
    expect(delimiter).toBeGreaterThan(-1)
    expect(full.indexOf("Second Wind. You regain")).toBeGreaterThan(delimiter)
    expect(full.indexOf("Output format (required)")).toBeLessThan(delimiter)
  })
})
