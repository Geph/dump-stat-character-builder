import { describe, expect, it } from "vitest"
import {
  canTakeAnotherMagicInitiate,
  filterMagicInitiateSpellListSlotOptions,
  magicInitiateAbilityForSpellList,
  magicInitiateSourceKeysForCharacter,
  pruneConflictingMagicInitiateSpellListPicks,
  resolveMagicInitiateSpellList,
  specializeMagicInitiateDescription,
  takenMagicInitiateSpellLists,
  unavailableMagicInitiateSpellListNames,
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

  it("marks a spell list already taken by another Magic Initiate as unavailable", () => {
    const granted = listSlot("granted:mi")
    const second = listSlot("feat:mi2")
    const slots = [granted, second]
    const picks = { [granted.slotKey]: ["Wizard"] }

    const filtered = filterMagicInitiateSpellListSlotOptions(second, slots, picks)
    expect(filtered.options?.map((o) => o.name)).toEqual(["Cleric", "Druid", "Wizard"])
    expect(unavailableMagicInitiateSpellListNames(slots, picks, second.slotKey)).toEqual(["Wizard"])
    expect(takenMagicInitiateSpellLists(slots, picks).has("wizard")).toBe(true)
    expect(canTakeAnotherMagicInitiate({ slots, picks })).toBe(true)
  })

  it("allows Cleric and Druid as separate takes even though both default to Wisdom", () => {
    const first = listSlot("a")
    const second = listSlot("b")
    const slots = [first, second]
    const picks = { [first.slotKey]: ["Cleric"] }

    expect(unavailableMagicInitiateSpellListNames(slots, picks, second.slotKey)).toEqual(["Cleric"])
    expect(
      filterMagicInitiateSpellListSlotOptions(second, slots, picks).options?.map((o) => o.name),
    ).toEqual(["Cleric", "Druid", "Wizard"])
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

  it("treats a background Magic Initiate (Cleric) grant as a taken list", () => {
    const second = listSlot("feat:mi2")
    expect(
      unavailableMagicInitiateSpellListNames([], {}, second.slotKey, {
        featGranted: "Magic Initiate (Cleric)",
      }),
    ).toEqual(["Cleric"])
    expect(
      takenMagicInitiateSpellLists([], {}, null, {
        featGranted: "Magic Initiate (Cleric)",
      }).has("cleric"),
    ).toBe(true)
    expect(
      canTakeAnotherMagicInitiate({
        slots: [],
        picks: {},
        featGranted: "Magic Initiate (Cleric)",
      }),
    ).toBe(true)
  })

  it("counts granted modifier picks even when that take's slot is not in the list", () => {
    const picks = {
      "feat:granted:mi-id::mod_magic_initiate_spells::spell_list_class": ["Wizard"],
    }
    expect(takenMagicInitiateSpellLists([], picks).has("wizard")).toBe(true)
    expect(
      unavailableMagicInitiateSpellListNames([], picks, "feat:new::mod::spell_list_class"),
    ).toEqual(["Wizard"])
  })

  it("resolves origin Cleric from feat_granted without modifier picks", () => {
    expect(
      resolveMagicInitiateSpellList({
        featName: "Magic Initiate",
        isOriginFeat: true,
        featGranted: "Magic Initiate (Cleric)",
      }),
    ).toBe("Cleric")
  })

  it("builds source keys for granted and picked Magic Initiate takes", () => {
    expect(
      magicInitiateSourceKeysForCharacter("mi-id", {
        "class:martyr:L4:Ability Score Improvement": ["mi-id"],
      }),
    ).toEqual(["feat:granted:mi-id", "feat:class:martyr:L4:Ability Score Improvement"])
  })

  it("specializes the generic Magic Initiate prose to the chosen list and ability", () => {
    const generic =
      "You learn two cantrips of your choice from the Cleric, Druid, or Wizard spell list. Intelligence, Wisdom, or Charisma is your spellcasting ability for this feat's spells (choose when you select this feat). Choose a level 1 spell from the same list you selected for this feat's cantrips. You can replace one of the spells from the chosen spell list."
    expect(
      specializeMagicInitiateDescription(generic, {
        spellList: "Cleric",
        spellcastingAbility: "wisdom",
      }),
    ).toBe(
      "You learn two cantrips of your choice from the Cleric spell list. Wisdom is your spellcasting ability for this feat's spells. Choose a level 1 spell from the Cleric spell list. You can replace one of the spells from the Cleric spell list.",
    )
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
