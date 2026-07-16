import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { applyClassSpellListsToImport } from "@/lib/import/class-spell-lists"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import { getSpellSlotTable } from "@/lib/compendium/spell-slots"
import {
  hasHomebrewFixture,
  homebrewFixturePath,
} from "@/lib/import/__tests__/homebrew-fixture-path"
import type { DndClass } from "@/lib/types"

function loadFixture(name: string) {
  const path = homebrewFixturePath(name)
  if (!path) throw new Error(`Missing homebrew fixture: ${name}`)
  return parseImportContentJson(readFileSync(path, "utf8"))
}

function featureChars(feature: {
  linkedModifiers?: { characteristics?: { type: string }[]; activation?: { effects?: { kind: string }[] } }[]
  isChoice?: boolean
}) {
  const types = (feature.linkedModifiers ?? []).flatMap((m) => (m.characteristics ?? []).map((c) => c.type))
  const effects = (feature.linkedModifiers ?? []).flatMap((m) =>
    (m.activation?.effects ?? []).map((e) => e.kind),
  )
  return { types, effects, isChoice: feature.isChoice === true }
}

describe.runIf(
  hasHomebrewFixture("eberron-artificer-class.json", "eberron-artificer-subclasses.json"),
)("Eberron Artificer local import fixtures", () => {
  it("class JSON has Artificer L1 slots + Tinker's Magic + Flash of Genius wiring after enrich", () => {
    const raw = loadFixture("eberron-artificer-class.json")
    expect(raw).not.toBeNull()
    const content = enrichImportContentModifiers(applyClassSpellListsToImport(raw!))
    const cls = content.classes?.[0]
    expect(cls?.name).toBe("Artificer")
    expect(cls?.spellcasting?.explicit_slot_progression?.[0]).toMatchObject({ level: 1, slots: [2] })

    const table = getSpellSlotTable(
      "Artificer",
      1,
      cls?.spellcasting as DndClass["spellcasting"],
    )
    expect(table?.slotsByLevel[0]).toBe(2)

    const tinker = cls?.features?.find((f) => /tinker/i.test(f.name))
    expect(tinker).toBeTruthy()
    const tinkerChars = featureChars(tinker!)
    expect(tinkerChars.types).toContain("equipment_and_magic_items")

    const flash = cls?.features?.find((f) => f.name === "Flash of Genius")
    const flashChars = featureChars(flash!)
    expect(flashChars.types).toContain("d20_test_reaction")

    const replicate = cls?.features?.find((f) => f.name === "Replicate Magic Item")
    const replicateChars = featureChars(replicate!)
    expect(replicateChars.types).toContain("equipment_and_magic_items")

    expect(content.spells?.some((s) => s.name === "Homunculus Servant" && s.description)).toBe(true)
    expect(cls?.spell_list).toBeUndefined()
  })

  it("subclass JSON wires presets for all five Eberron subclasses", () => {
    const raw = loadFixture("eberron-artificer-subclasses.json")
    expect(raw).not.toBeNull()
    const content = enrichImportContentModifiers(raw!)
    expect(content.subclasses?.map((s) => s.name).sort()).toEqual([
      "Alchemist",
      "Armorer",
      "Artillerist",
      "Battle Smith",
      "Cartographer",
    ])

    const by = (subclass: string, feature: string) =>
      content.subclasses?.find((s) => s.name === subclass)?.features?.find((f) => f.name === feature)

    expect(featureChars(by("Alchemist", "Experimental Elixir")!).types).toContain("uses")
    expect(featureChars(by("Alchemist", "Chemical Mastery")!).types).toEqual(
      expect.arrayContaining(["damage_resistance", "condition_immunity", "spells_known"]),
    )
    expect(by("Armorer", "Armor Model")?.isChoice).toBe(true)
    expect(
      featureChars(by("Artillerist", "Eldritch Cannon")!).isChoice ||
        featureChars(by("Artillerist", "Eldritch Cannon")!).types.length,
    ).toBeTruthy()
    expect(featureChars(by("Battle Smith", "Battle Ready")!).types).toContain("weapon_proficiencies")
    expect(by("Battle Smith", "Steel Defender")?.companion_stat_block?.name).toBe("Steel Defender")
    expect(featureChars(by("Cartographer", "Mapping Magic")!).types).toContain("uses")
    expect(featureChars(by("Cartographer", "Ingenious Movement")!).effects).toContain("movement_option")
  })
})
