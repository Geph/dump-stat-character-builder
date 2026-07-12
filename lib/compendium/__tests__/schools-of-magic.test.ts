import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import {
  collectSpellSchoolsFromImportContent,
  DEFAULT_SPELL_SCHOOL_NAMES,
  diffSpellSchoolEditorRows,
  getSpellSchools,
  mergeImportedSpellSchools,
  normalizeSpellSchoolList,
  resetSpellSchoolsToDefault,
  setSpellSchools,
  SPELL_SCHOOLS_STORAGE_KEY,
} from "@/lib/compendium/schools-of-magic"

describe("spell schools list", () => {
  const store = new Map<string, string>()

  beforeEach(() => {
    store.clear()
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
    })
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("lists the eight SRD schools by default", () => {
    expect(getSpellSchools()).toEqual([...DEFAULT_SPELL_SCHOOL_NAMES])
  })

  it("persists custom schools and resets to defaults", () => {
    setSpellSchools(["Abjuration", "Psionic Powers"])
    expect(getSpellSchools()).toEqual(["Abjuration", "Psionic Powers"])
    expect(store.get(SPELL_SCHOOLS_STORAGE_KEY)).toBeTruthy()
    resetSpellSchoolsToDefault()
    expect(getSpellSchools()).toEqual([...DEFAULT_SPELL_SCHOOL_NAMES])
  })

  it("normalizes blank and duplicate names", () => {
    expect(normalizeSpellSchoolList(["  Evocation ", "evocation", "", "Illusion"])).toEqual([
      "Evocation",
      "Illusion",
    ])
  })

  it("diffs editor rows for renames and removals", () => {
    setSpellSchools(["Abjuration", "Conjuration", "Psionic Powers"])
    const { schools, diff } = diffSpellSchoolEditorRows([
      { originalName: "Abjuration", name: "Warding" },
      { originalName: "Conjuration", name: "Conjuration" },
      { originalName: null, name: "Chronomancy" },
    ])
    expect(schools).toEqual(["Warding", "Conjuration", "Chronomancy"])
    expect(diff.renamed).toEqual([{ from: "Abjuration", to: "Warding" }])
    expect(diff.removed).toContain("Psionic Powers")
  })

  it("collects unique schools from import content and skips placeholders", () => {
    expect(
      collectSpellSchoolsFromImportContent({
        spells: [
          { school: "Evocation" },
          { school: " Chronomancy " },
          { school: "chronomancy" },
          { school: "Unknown" },
          { school: "Other" },
          { school: "Blood Magic" },
          { school: null },
          { school: "  " },
        ],
      }),
    ).toEqual(["Evocation", "Chronomancy", "Blood Magic"])
  })

  it("merges novel schools into the persisted list", () => {
    const added = mergeImportedSpellSchools([
      "Evocation",
      "Duromancy",
      "Void Magic",
      "Sangromancy",
      "Unknown",
    ])
    expect(added).toEqual(["Duromancy", "Void Magic", "Sangromancy"])
    expect(getSpellSchools()).toEqual([
      ...DEFAULT_SPELL_SCHOOL_NAMES,
      "Duromancy",
      "Void Magic",
      "Sangromancy",
    ])
    expect(mergeImportedSpellSchools(["duromancy", "Chronomancy"])).toEqual(["Chronomancy"])
  })
})
