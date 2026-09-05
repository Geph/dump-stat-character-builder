import { describe, expect, it } from "vitest"
import {
  mergeIncomingSpellsWithExisting,
  spellRowsToUpsertForClassLists,
} from "@/lib/import/merge-spell-persist"

describe("mergeIncomingSpellsWithExisting", () => {
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
