import { describe, expect, it } from "vitest"
import { mergeIncomingSpellsWithExisting } from "@/lib/import/merge-spell-persist"

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
    expect(merged.classes).toEqual(["Wizard", "Ranger", "Investigator"])
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
    expect(merged.classes).toEqual(["Wizard", "Investigator"])
  })
})
