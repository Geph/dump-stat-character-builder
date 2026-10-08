import { describe, expect, it } from "vitest"
import srdSpells from "@/lib/srd/seed-data/spells.json"
import { SpellImportSchema } from "@/lib/import/content-schema"
import { normalizeSpellImportRow } from "@/lib/import/normalize-spell-import"
import { SPELL_REFERENCE_IMPORT_NOTICE } from "@/lib/import/spell-reference-placeholder"
import { normalizeBundledSpellReference } from "@/lib/seed-packs/spell-references"
import { CLASS_SPELL_LIST_IMPORT_HINT } from "@/lib/import/class-spell-lists"
import { SRD_SOURCE, SRD_CREATOR_URL, withSrdCreatorUrl } from "@/lib/srd/source"
import {
  mergeIncomingSpellsWithExisting,
  spellRowsToUpsertForClassLists,
} from "@/lib/import/merge-spell-persist"

describe("mergeIncomingSpellsWithExisting", () => {
  it("shows an import instruction for references and replaces it with real source content", () => {
    const stub = normalizeSpellImportRow({ name: "Example", level: 1 })
    expect(stub.description).toBe(SPELL_REFERENCE_IMPORT_NOTICE)
    const [filled] = mergeIncomingSpellsWithExisting([{ name: "Example", description: "An authored description.", source: "Author", creator_url: "https://example.com" }], [stub])
    expect(filled).toMatchObject({ description: "An authored description.", source: "Author", creator_url: "https://example.com" })
    const [preserved] = mergeIncomingSpellsWithExisting([stub], [filled])
    expect(preserved.description).toBe(filled.description)
    expect(normalizeBundledSpellReference({ name: "Blade Ward", description: null, source: "Mage Hand Press" }, srdSpells)).toMatchObject({ description: SPELL_REFERENCE_IMPORT_NOTICE, source: "Wizards of the Coast" })
  })
  it("retains publisher links through spell normalization and schema parsing", () => {
    const row = SpellImportSchema.parse(normalizeSpellImportRow({ name: "Example Ward", source: "Original Author", creator_url: "https://example.com/author" }))
    expect(row.creator_url).toBe("https://example.com/author")
    expect(CLASS_SPELL_LIST_IMPORT_HINT).toContain("Class-list membership is not authorship")
  })
  it("keeps every bundled SRD description and attribution through a publisher list import", () => {
    for (const spell of srdSpells) {
      expect(spell.description.trim(), spell.name).not.toBe("")
      expect(spell.source, spell.name).toBe(SRD_SOURCE)
      const [merged] = mergeIncomingSpellsWithExisting([
        { name: spell.name, description: null, source: "Other Publisher", creator_url: "https://example.com", classes: ["Custom Class"] },
      ], [withSrdCreatorUrl(spell)])
      expect(merged.description, spell.name).toBe(spell.description)
      expect(merged.source, spell.name).toBe(SRD_SOURCE)
      expect(merged.creator_url, spell.name).toBe(SRD_CREATOR_URL)
    }
  })

  it("restores the author of a non-SRD write-up over a misattributed empty stub", () => {
    const [merged] = mergeIncomingSpellsWithExisting([
      { name: "Example Ward", description: "Complete rules.", source: "Original Author", creator_url: "https://example.com/author" },
    ], [
      { id: "keep-me", name: "Example Ward", description: null, source: "Class Publisher", creator_url: "https://example.com/class", classes: ["Custom Class"] },
    ])
    expect(merged).toMatchObject({ id: "keep-me", source: "Original Author", creator_url: "https://example.com/author", description: "Complete rules.", classes: ["Custom Class"] })
  })

  it("does not retain the old creator link on an explicit publisher replacement", () => {
    const [merged] = mergeIncomingSpellsWithExisting([
      { name: "Alarm", description: "Revised rules.", source: "Custom", creator_url: null },
    ], [{ name: "Alarm", source: SRD_SOURCE, creator_url: SRD_CREATOR_URL }], { replaceSourceNames: ["Alarm"] })
    expect(merged.creator_url).toBeNull()
  })
  it("unions class tags and keeps the richer SRD write-up", () => {
    const existing = [
      {
        id: "srd-alarm",
        name: "Alarm",
        description: "Set a magical alarm.",
        classes: ["Wizard", "Ranger"],
        source: "SRD",
      },
    ]
    const incoming = [
      {
        name: "Alarm",
        description: null,
        classes: ["Investigator"],
        source: "Mage Hand Press",
      },
    ]
    const [merged] = mergeIncomingSpellsWithExisting(incoming, existing)
    expect(merged.id).toBe("srd-alarm")
    expect(merged.description).toBe("Set a magical alarm.")
    expect(merged.source).toBe("SRD")
    expect(merged.classes).toEqual(["Investigator", "Ranger", "Wizard"])
  })

  it("keeps an SRD source when a later Mage Hand Press list stub is merged", () => {
    const existing = [
      {
        id: "srd-chill",
        name: "Chill Touch",
        description: "Channeling the chill of the grave.",
        source: "D&D 5.5e SRD",
        classes: ["Wizard"],
      },
    ]
    const incoming = [
      {
        name: "Chill Touch",
        description: null,
        classes: ["Necromancer"],
        source: "Mage Hand Press",
      },
    ]
    const [merged] = mergeIncomingSpellsWithExisting(incoming, existing)
    expect(merged.source).toBe("D&D 5.5e SRD")
    expect(merged.description).toBe("Channeling the chill of the grave.")
    expect(merged.classes).toEqual(["Necromancer", "Wizard"])
  })

  it("replaces source only when the importer explicitly overwrites that spell", () => {
    const existing = [
      {
        id: "srd-chill",
        name: "Chill Touch",
        description: "Channeling the chill of the grave.",
        source: "D&D 5.5e SRD",
        classes: ["Wizard"],
      },
    ]
    const incoming = [
      {
        name: "Chill Touch",
        description: "Homebrew chill rewrite.",
        classes: ["Necromancer"],
        source: "Mage Hand Press",
      },
    ]
    const [kept] = mergeIncomingSpellsWithExisting(incoming, existing)
    expect(kept.source).toBe("D&D 5.5e SRD")
    const [replaced] = mergeIncomingSpellsWithExisting(incoming, existing, {
      replaceSourceNames: ["chill touch"],
    })
    expect(replaced.source).toBe("Mage Hand Press")
    expect(replaced.description).toBe("Homebrew chill rewrite.")
  })

  it("restores an SRD source onto a stub that previously stole the catalog row", () => {
    const existing = [
      {
        id: "stolen",
        name: "Acid Splash",
        description: null,
        source: "Mage Hand Press",
        classes: ["Necromancer"],
      },
    ]
    const incoming = [
      {
        name: "Acid Splash",
        description: "You create an acidic bubble.",
        source: "D&D 5.5e SRD",
        classes: ["Wizard"],
      },
    ]
    const [merged] = mergeIncomingSpellsWithExisting(incoming, existing)
    expect(merged.source).toBe("D&D 5.5e SRD")
    expect(merged.description).toBe("You create an acidic bubble.")
    expect(merged.classes).toEqual(["Necromancer", "Wizard"])
  })

  it("keeps existing casting details when a later list stub is null-filled", () => {
    const existing = [
      {
        id: "srd-acid",
        name: "Acid Splash",
        description: "An acidic bubble.",
        casting_time: "Action",
        range: "60 feet",
        duration: "Instantaneous",
        components: ["V", "S"],
        classes: ["Wizard"],
      },
    ]
    const incoming = [
      {
        name: "Acid Splash",
        description: null,
        casting_time: null,
        range: null,
        duration: null,
        components: null,
        classes: ["Necromancer"],
        source: "Mage Hand Press",
      },
    ]
    const [merged] = mergeIncomingSpellsWithExisting(incoming, existing)
    expect(merged.casting_time).toBe("Action")
    expect(merged.range).toBe("60 feet")
    expect(merged.duration).toBe("Instantaneous")
    expect(merged.components).toEqual(["V", "S"])
    expect(merged.description).toBe("An acidic bubble.")
  })

  it("leaves unmatched incoming spells unchanged", () => {
    const incoming = [{ name: "Blood Print", classes: ["Investigator"], description: "A print." }]
    expect(mergeIncomingSpellsWithExisting(incoming, [])).toEqual(incoming)
  })

  it("matches an SRD title to a shorter imported list name", () => {
    const existing = [
      {
        id: "srd-disk",
        name: "Tenser's Floating Disk",
        description: "A floating disc of force.",
        classes: ["Wizard"],
      },
    ]
    const incoming = [{ name: "Floating Disc", classes: ["Investigator"], description: null }]
    const [merged] = mergeIncomingSpellsWithExisting(incoming, existing)
    expect(merged.id).toBe("srd-disk")
    expect(merged.name).toBe("Tenser's Floating Disk")
    expect(merged.description).toBe("A floating disc of force.")
    expect(merged.classes).toEqual(["Investigator", "Wizard"])
  })
})

describe("spellRowsToUpsertForClassLists", () => {
  it("patches linked catalog rows from the class spell_list", () => {
    const { catalogPatches, incoming } = spellRowsToUpsertForClassLists({
      existingSpells: [
        {
          id: "srd-alarm",
          name: "Alarm",
          description: "Set a magical alarm.",
          classes: ["Wizard", "Ranger"],
        },
      ],
      incomingClasses: [{ name: "Inventor", spell_list: ["Alarm", "Grease"] }],
      incomingSpells: [],
    })
    expect(incoming).toEqual([])
    expect(catalogPatches).toEqual([
      expect.objectContaining({
        id: "srd-alarm",
        description: "Set a magical alarm.",
        classes: ["Inventor", "Ranger", "Wizard"],
      }),
    ])
  })
})
