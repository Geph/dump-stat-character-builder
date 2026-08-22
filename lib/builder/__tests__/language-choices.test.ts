import { describe, expect, it } from "vitest"
import {
  applyModifierPlayerPicks,
  modifierPlayerChoiceSlotKey,
  optionsForProficiencyGrantSlot,
  reconcileModifierPlayerPicks,
  type ModifierPlayerChoiceSlot,
} from "@/lib/builder/modifier-player-choices"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import {
  SRD_LANGUAGES,
  SRD_STANDARD_LANGUAGES,
  languageOptionsForPool,
} from "@/lib/compendium/srd-languages"

describe("languageOptionsForPool", () => {
  it("returns the standard table by default", () => {
    const options = languageOptionsForPool("standard")
    expect(options).toEqual([...SRD_STANDARD_LANGUAGES])
  })

  it("returns standard + rare when requested", () => {
    const options = languageOptionsForPool("standard_and_rare")
    expect(options).toEqual([...SRD_LANGUAGES])
  })

  it("excludes already-granted languages (case-insensitive)", () => {
    const options = languageOptionsForPool("standard", ["common"])
    expect(options).not.toContain("Common")
    expect(options).toContain("Dwarvish")
  })
})

describe("applyModifierPlayerPicks — languages", () => {
  const sourceKey = "species:dwarf"
  const mod: CharacteristicModifier = {
    id: "lang-1",
    type: "languages",
    values: ["Common"],
    choiceCount: 2,
    choicePool: "standard",
  }

  it("merges fixed languages with the player's picks (Dwarf: Common + 2)", () => {
    const key = modifierPlayerChoiceSlotKey(sourceKey, mod.id, "language")
    const result = applyModifierPlayerPicks([mod], sourceKey, {
      [key]: ["Dwarvish", "Giant"],
    }) as unknown as unknown as CharacteristicModifier[]
    const resolved = result[0] as CharacteristicModifier & { values: string[]; choiceCount?: number | null }
    expect(resolved.values).toEqual(["Common", "Dwarvish", "Giant"])
    expect(resolved.choiceCount).toBe(0)
  })

  it("supports custom user-defined languages chosen by the player", () => {
    const key = modifierPlayerChoiceSlotKey(sourceKey, mod.id, "language")
    const result = applyModifierPlayerPicks([mod], sourceKey, {
      [key]: ["Thieves' Cant", "Custom Homebrew Tongue"],
    }) as unknown as unknown as CharacteristicModifier[]
    const resolved = result[0] as CharacteristicModifier & { values: string[]; choiceCount?: number | null }
    expect(resolved.values).toContain("Custom Homebrew Tongue")
    expect(resolved.values).toContain("Common")
  })

  it("grants only the fixed languages when the player has not picked yet", () => {
    const result = applyModifierPlayerPicks([mod], sourceKey, {}) as unknown as unknown as CharacteristicModifier[]
    const resolved = result[0] as CharacteristicModifier & { values: string[]; choiceCount?: number | null }
    expect(resolved.values).toEqual(["Common"])
  })

  it("does not duplicate a fixed language if also picked", () => {
    const key = modifierPlayerChoiceSlotKey(sourceKey, mod.id, "language")
    const result = applyModifierPlayerPicks([mod], sourceKey, {
      [key]: ["Common", "Elvish"],
    }) as unknown as unknown as CharacteristicModifier[]
    const resolved = result[0] as CharacteristicModifier & { values: string[]; choiceCount?: number | null }
    expect(resolved.values).toEqual(["Common", "Elvish"])
  })
})

describe("optionsForProficiencyGrantSlot — languages", () => {
  const deftExplorerSlot: ModifierPlayerChoiceSlot = {
    slotKey: "class:ranger:lang:language",
    sourceKey: "class:ranger",
    sourceLabel: "Ranger",
    modId: "lang",
    kind: "language",
    label: "Deft Explorer language",
    maxCount: 1,
    options: languageOptionsForPool("standard").map((name) => ({ name })),
    allowCustom: true,
  }

  it("hides languages the character already knows (e.g. from species)", () => {
    const options = optionsForProficiencyGrantSlot(deftExplorerSlot, {
      proficientSkills: [],
      knownLanguages: ["Common", "Elvish", "Dwarvish"],
    })
    const names = options.map((option) => option.name)
    expect(names).not.toContain("Common")
    expect(names).not.toContain("Elvish")
    expect(names).not.toContain("Dwarvish")
    expect(names).toContain("Giant")
  })

  it("keeps the current selection visible even when already known", () => {
    const options = optionsForProficiencyGrantSlot(deftExplorerSlot, {
      proficientSkills: [],
      knownLanguages: ["Common", "Elvish"],
      currentSelection: ["elvish"],
    })
    expect(options.map((option) => option.name)).toContain("Elvish")
  })
})

describe("reconcileModifierPlayerPicks", () => {
  it("remaps orphaned species language picks onto the current slot key", () => {
    const currentSlot: ModifierPlayerChoiceSlot = {
      slotKey: "species:elf-id:mods::mod_species_languages::language",
      sourceKey: "species:elf-id:mods",
      sourceLabel: "Elf",
      modId: "mod_species_languages",
      kind: "language",
      label: "Languages (Common + two of your choice)",
      maxCount: 2,
    }
    const remapped = reconcileModifierPlayerPicks(
      {
        "species:elf-id:trait:0::mod_old_languages::language": ["Draconic", "Elvish"],
      },
      [currentSlot],
    )
    expect(remapped[currentSlot.slotKey]).toEqual(["Draconic", "Elvish"])
  })
})
