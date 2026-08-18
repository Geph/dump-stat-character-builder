/**
 * Kibbles Tasty species Drive import: choice-option enrichment + detector footguns.
 */
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import { hasHomebrewFixture, homebrewFixturePath } from "./homebrew-fixture-path"

const FIXTURE = "kibbles-species.txt"

type OptionRow = {
  name?: string
  linkedModifiers?: Array<{ characteristics?: Array<{ type?: string; visionType?: string; rangeFeet?: number; values?: string[] }> }>
}
type TraitRow = {
  name?: string
  linkedModifiers?: unknown[]
  isChoice?: boolean
  choices?: { options?: OptionRow[] }
}

describe("Kibbles species wiring", () => {
  const skip = !hasHomebrewFixture(FIXTURE)

  it.skipIf(skip)("enriches Night Mode / Arcane Eye darkvision and fixed Animating Force languages", () => {
    const path = homebrewFixturePath(FIXTURE)!
    const enriched = enrichImportContentModifiers(parseImportContentJson(readFileSync(path, "utf8"))!)

    const iron = enriched.species?.find((s) => s.name === "Ironwrought")
    const modular = (iron?.traits as TraitRow[] | undefined)?.find((t) => t.name === "Modular Design")
    const night = modular?.choices?.options?.find((o) => o.name === "Night Mode")
    expect(JSON.stringify(night?.linkedModifiers)).toMatch(/darkvision|"rangeFeet":60/i)

    const augmented = enriched.species?.find((s) => s.name === "Augmented")
    const abilities = (augmented?.traits as TraitRow[] | undefined)?.find(
      (t) => t.name === "Augmented Abilities",
    )
    const eye = abilities?.choices?.options?.find((o) => o.name === "Arcane Eye")
    expect(JSON.stringify(eye?.linkedModifiers)).toMatch(/darkvision|"rangeFeet":120/i)

    const undead = enriched.species?.find((s) => s.name === "Awakened Undead")
    const force = (undead?.traits as TraitRow[] | undefined)?.find((t) => t.name === "Animating Force")
    const fey = force?.choices?.options?.find((o) => o.name === "Fey Energy")
    const infernal = force?.choices?.options?.find((o) => o.name === "Infernal Energy")
    expect(JSON.stringify(fey?.linkedModifiers)).toMatch(/Sylvan/i)
    expect(JSON.stringify(infernal?.linkedModifiers)).toMatch(/Infernal/i)
  })

  it.skipIf(skip)("wires Farling Skill Absorption skill + artisan tool choices", () => {
    const path = homebrewFixturePath(FIXTURE)!
    const enriched = enrichImportContentModifiers(parseImportContentJson(readFileSync(path, "utf8"))!)
    const farling = enriched.species?.find((s) => s.name === "Farling")
    const absorption = (farling?.traits as TraitRow[] | undefined)?.find(
      (t) => t.name === "Skill Absorption",
    )
    const blob = JSON.stringify(absorption?.linkedModifiers)
    expect(blob).toMatch(/skills/i)
    expect(blob).toMatch(/tool_proficiencies/i)
  })

  it.skipIf(skip)("keeps Remains / Modular / Warped Gift choice shells with option lists", () => {
    const path = homebrewFixturePath(FIXTURE)!
    const enriched = enrichImportContentModifiers(parseImportContentJson(readFileSync(path, "utf8"))!)
    expect(enriched.species?.map((s) => s.name)).toEqual([
      "Awakened Undead",
      "Ironwrought",
      "Farling",
      "Augmented",
      "Warped",
    ])
    const undead = enriched.species?.find((s) => s.name === "Awakened Undead")
    const remains = (undead?.traits as TraitRow[] | undefined)?.find((t) => t.name === "Remains")
    expect(remains?.isChoice).toBe(true)
    expect(remains?.choices?.options?.length).toBe(10)
  })
})
