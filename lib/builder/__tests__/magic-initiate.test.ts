import { describe, expect, it } from "vitest"
import {
  canTakeAnotherMagicInitiate,
  filterMagicInitiateSpellListSlotOptions,
  magicInitiateAbilityForSpellList,
  pruneConflictingMagicInitiateSpellListPicks,
  takenMagicInitiateSpellLists,
} from "@/lib/builder/magic-initiate"
import type { ModifierPlayerChoiceSlot } from "@/lib/builder/modifier-player-choices"

function listSlot(
  sourceKey: string,
  sourceLabel = "Magic Initiate",
  slotKey = `${sourceKey}::mod_magic_initiate_spells::spell_list_class`,
): ModifierPlayerChoiceSlot {
  return {
    slotKey,
    sourceKey,
    sourceLabel,
    modId: "mod_magic_initiate_spells",
    kind: "spell_list_class",
    label: "Magic Initiate: choose spell list",
    maxCount: 1,
    options: [{ name: "Cleric" }, { name: "Druid" }, { name: "Wizard" }],
  }
}

describe("magic-initiate spell list exclusivity", () => {
  it("maps spell lists to default abilities", () => {
    expect(magicInitiateAbilityForSpellList("Wizard")).toBe("intelligence")
    expect(magicInitiateAbilityForSpellList("Cleric")).toBe("wisdom")
    expect(magicInitiateAbilityForSpellList("Druid")).toBe("wisdom")
  })

  it("blocks reusing a spell list already taken by another Magic Initiate", () => {
    const granted = listSlot("granted:mi")
    const second = listSlot("feat:mi2")
    const slots = [granted, second]
    const picks = { [granted.slotKey]: ["Wizard"] }

    const filtered = filterMagicInitiateSpellListSlotOptions(second, slots, picks)
    expect(filtered.options?.map((o) => o.name)).toEqual(["Cleric", "Druid"])
    expect(takenMagicInitiateSpellLists(slots, picks).has("wizard")).toBe(true)
    expect(canTakeAnotherMagicInitiate({ slots, picks })).toBe(true)
  })

  it("allows Cleric and Druid as separate takes even though both default to Wisdom", () => {
    const first = listSlot("a")
    const second = listSlot("b")
    const slots = [first, second]
    const picks = { [first.slotKey]: ["Cleric"] }

    const filtered = filterMagicInitiateSpellListSlotOptions(second, slots, picks)
    expect(filtered.options?.map((o) => o.name)).toEqual(["Druid", "Wizard"])
  })

  it("reports no remaining Magic Initiate takes when all spell lists are used", () => {
    const slots = [listSlot("a"), listSlot("b"), listSlot("c")]
    const picks = {
      [slots[0]!.slotKey]: ["Wizard"],
      [slots[1]!.slotKey]: ["Cleric"],
      [slots[2]!.slotKey]: ["Druid"],
    }
    expect(canTakeAnotherMagicInitiate({ slots, picks })).toBe(false)
  })

  it("prunes duplicate spell lists in favor of granted takes", () => {
    const granted = listSlot("feat:granted:mi")
    const second = listSlot("feat:pick:mi2")
    const slots = [second, granted]
    const picks = {
      [granted.slotKey]: ["Wizard"],
      [second.slotKey]: ["Wizard"],
    }
    const pruned = pruneConflictingMagicInitiateSpellListPicks(slots, picks)
    expect(pruned[granted.slotKey]).toEqual(["Wizard"])
    expect(pruned[second.slotKey]).toBeUndefined()
  })
})
