import { describe, expect, it } from "vitest"
import { normalizeBundledSpellReference } from "@/lib/seed-packs/spell-references"
import { SPELL_REFERENCE_IMPORT_NOTICE } from "@/lib/import/spell-reference-placeholder"
import { fillEmptySpellWriteup } from "@/lib/compendium/fill-spell-writeup-from-srd"
import { SRD_SOURCE, SRD_CREATOR_URL } from "@/lib/srd/source"
import srd from "@/lib/srd/seed-data/spells.json"
import inventor from "@/lib/seed-packs/kibbles-tasty/kibbles-inventor-class.json"
import occultist from "@/lib/seed-packs/kibbles-tasty/kibbles-occultist-class.json"
import psion from "@/lib/seed-packs/kibbles-tasty/kibbles-psion-class.json"
import necromancer from "@/lib/seed-packs/mage-hand-press/magehandpress-necromancer-class.json"

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
    for (const pack of [inventor, occultist, psion, necromancer]) {
      for (const spell of pack.spells) {
        expect(spell.description?.trim(), spell.name).toBeTruthy()
        if (spell.source === "Wizards of the Coast") expect(spell.description, spell.name).toBe(SPELL_REFERENCE_IMPORT_NOTICE)
      }
    }
  })
})
