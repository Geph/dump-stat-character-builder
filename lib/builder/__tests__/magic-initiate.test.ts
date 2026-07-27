import { describe, expect, it } from "vitest"
import {
  canTakeAnotherMagicInitiate,
  filterMagicInitiateAbilitySlotOptions,
  magicInitiateAbilityForSpellList,
  takenMagicInitiateAbilities,
} from "@/lib/builder/magic-initiate"
import type { ModifierPlayerChoiceSlot } from "@/lib/builder/modifier-player-choices"

function abilitySlot(
  sourceKey: string,
  sourceLabel: string,
  slotKey = `${sourceKey}::mod_magic_initiate_ability::spellcasting_ability`,
): ModifierPlayerChoiceSlot {
  return {
    slotKey,
    sourceKey,
    sourceLabel,
    modId: "mod_magic_initiate_ability",
    kind: "spellcasting_ability",
    label: "Spellcasting ability",
    maxCount: 1,
    options: [
      { name: "Intelligence" },
      { name: "Wisdom" },
      { name: "Charisma" },
    ],
  }
}

describe("magic-initiate ability exclusivity", () => {
  it("maps spell lists to default abilities", () => {
    expect(magicInitiateAbilityForSpellList("Wizard")).toBe("intelligence")
    expect(magicInitiateAbilityForSpellList("Cleric")).toBe("wisdom")
    expect(magicInitiateAbilityForSpellList("Druid")).toBe("wisdom")
  })

  it("blocks reusing an ability already taken by another Magic Initiate", () => {
    const slots = [
      abilitySlot("granted:mi", "Magic Initiate"),
      abilitySlot("feat:mi2", "Magic Initiate"),
    ]
    const picks = {
      [slots[0]!.slotKey]: ["Intelligence"],
    }
    const filtered = filterMagicInitiateAbilitySlotOptions(slots[1]!, slots, picks)
    expect(filtered.options?.map((o) => o.name)).toEqual(["Wisdom", "Charisma"])
    expect(takenMagicInitiateAbilities(slots, picks).has("intelligence")).toBe(true)
    expect(canTakeAnotherMagicInitiate({ slots, picks })).toBe(true)
  })

  it("reports no remaining Magic Initiate takes when INT/WIS/CHA are all used", () => {
    const slots = [
      abilitySlot("a", "Magic Initiate"),
      abilitySlot("b", "Magic Initiate"),
      abilitySlot("c", "Magic Initiate"),
    ]
    const picks = {
      [slots[0]!.slotKey]: ["Intelligence"],
      [slots[1]!.slotKey]: ["Wisdom"],
      [slots[2]!.slotKey]: ["Charisma"],
    }
    expect(canTakeAnotherMagicInitiate({ slots, picks })).toBe(false)
  })

  it("infers ability from spell list when ability is not picked yet", () => {
    const listSlot: ModifierPlayerChoiceSlot = {
      slotKey: "granted:mi::mod::spell_list_class",
      sourceKey: "granted:mi",
      sourceLabel: "Magic Initiate",
      modId: "mod_list",
      kind: "spell_list_class",
      label: "Spell list",
      maxCount: 1,
      options: [{ name: "Wizard" }, { name: "Cleric" }, { name: "Druid" }],
    }
    const ability = abilitySlot("granted:mi", "Magic Initiate")
    const second = abilitySlot("feat:mi2", "Magic Initiate")
    const slots = [listSlot, ability, second]
    const picks = { [listSlot.slotKey]: ["Wizard"] }
    const filtered = filterMagicInitiateAbilitySlotOptions(second, slots, picks)
    expect(filtered.options?.map((o) => o.name)).toEqual(["Wisdom", "Charisma"])
  })
})
