import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { normalizeBundledSpellReference } from "@/lib/seed-packs/spell-references"
import { SPELL_REFERENCE_IMPORT_NOTICE } from "@/lib/import/spell-reference-placeholder"
import { fillEmptySpellWriteup } from "@/lib/compendium/fill-spell-writeup-from-srd"
import { SRD_SOURCE, SRD_CREATOR_URL } from "@/lib/srd/source"
import srd from "@/lib/srd/seed-data/spells.json"
describe("bundled spell references", () => {
  it("restores every SRD spell's description and attribution after a reference-only class import", () => {
    for (const spell of srd) {
      const reference = normalizeBundledSpellReference({ name: spell.name, description: null, source: "Addon Author" }, srd)
      const restored = fillEmptySpellWriteup(reference)
      expect(restored.description, spell.name).toBe(spell.description)
      expect(restored.source, spell.name).toBe(SRD_SOURCE)
      expect((restored as Record<string, unknown>).creator_url, spell.name).toBe(SRD_CREATOR_URL)
    }
  })

  it("keeps non-SRD WotC names as references without importing their prose", () => {
    for (const name of ["Blade Ward", "Feeblemind"]) {
      const reference = normalizeBundledSpellReference({ name, description: null, source: "Addon Author" }, srd)
      expect(reference.source).toBe("Wizards of the Coast")
      expect(fillEmptySpellWriteup(reference).description).toBe(SPELL_REFERENCE_IMPORT_NOTICE)
    }
    const packs = ["mage-hand-press", "kibbles-tasty"].flatMap((publisher) => {
      const folder = join(process.cwd(), "lib/seed-packs", publisher)
      return readdirSync(folder).filter((name) => name.endsWith(".json")).map((name) =>
        JSON.parse(readFileSync(join(folder, name), "utf8")) as { spells?: Array<{ name: string; description?: string; source?: string }> })
    })
    for (const pack of packs) {
      for (const spell of pack.spells ?? []) {
        expect(spell.description?.trim(), spell.name).toBeTruthy()
        if (spell.source === "Wizards of the Coast") expect(spell.description, spell.name).toBe(SPELL_REFERENCE_IMPORT_NOTICE)
      }
    }
  })
})
