import { describe, expect, it } from "vitest"
import {
  clearWeaponBindingsForToggles,
  isWeaponBoundSpellBuffModifier,
  isWeaponSpellBuffActiveOnWeapon,
  weaponCanReceiveSpellBuff,
  weaponSpellBuffRollBonuses,
  weaponSpellBuffsAvailableToCharacter,
  weaponSpellBuffToggleForActionName,
} from "@/lib/character/weapon-spell-buff"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"

describe("weapon-spell-buff", () => {
  it("maps Magic Weapon and Consecrated Whetstone to the same toggle", () => {
    expect(weaponSpellBuffToggleForActionName("Magic Weapon")).toBe("magic_weapon_active")
    expect(weaponSpellBuffToggleForActionName("Consecrated Whetstone")).toBe("magic_weapon_active")
    expect(weaponSpellBuffToggleForActionName("Elemental Weapon")).toBe("elemental_weapon_active")
  })

  it("applies bonuses only to the bound weapon", () => {
    const mods = [
      {
        id: "atk",
        type: "attack_roll_modifiers",
        requiresSheetToggle: "magic_weapon_active",
        entries: [{ bonus: 1, target: "all" }],
      },
      {
        id: "dmg",
        type: "damage_roll_modifiers",
        requiresSheetToggle: "magic_weapon_active",
        entries: [{ bonus: 1, target: "all" }],
      },
    ] as CharacteristicModifier[]

    expect(isWeaponBoundSpellBuffModifier(mods[0]!)).toBe(true)

    const onBound = weaponSpellBuffRollBonuses({
      mods,
      weaponId: "longsword",
      activeToggleIds: ["magic_weapon_active"],
      bindings: { magic_weapon_active: "longsword" },
    })
    expect(onBound).toEqual({ attack: 1, damage: 1, labels: ["Magic Weapon"] })

    const onOther = weaponSpellBuffRollBonuses({
      mods,
      weaponId: "dagger",
      activeToggleIds: ["magic_weapon_active"],
      bindings: { magic_weapon_active: "longsword" },
    })
    expect(onOther).toEqual({ attack: 0, damage: 0, labels: [] })
  })

  it("clears bindings when reminders end the toggle", () => {
    expect(
      clearWeaponBindingsForToggles(
        { magic_weapon_active: "longsword", mind_rider_active: "owl" },
        ["magic_weapon_active"],
      ),
    ).toEqual({ mind_rider_active: "owl" })
  })

  it("lists Magic Weapon only when this character has the spell or a grant", () => {
    expect(weaponSpellBuffsAvailableToCharacter({})).toEqual([])
    expect(
      weaponSpellBuffsAvailableToCharacter({
        abilityNames: ["Consecrated Whetstone"],
      }).map((buff) => buff.toggleId),
    ).toEqual(["magic_weapon_active"])
    expect(
      weaponSpellBuffsAvailableToCharacter({
        spellNames: ["Magic Weapon"],
      }).map((buff) => buff.toggleId),
    ).toEqual(["magic_weapon_active"])
    expect(
      weaponSpellBuffsAvailableToCharacter({
        spellNames: ["Elemental Weapon"],
      }).map((buff) => buff.toggleId),
    ).toEqual(["elemental_weapon_active"])
    expect(
      weaponSpellBuffsAvailableToCharacter({
        equipmentNames: ["Consecrated Whetstone"],
      }).map((buff) => buff.toggleId),
    ).toEqual(["magic_weapon_active"])
    expect(
      weaponSpellBuffsAvailableToCharacter({
        equipmentNames: ["Longsword"],
        abilityNames: ["Alert"],
      }),
    ).toEqual([])
    expect(
      weaponSpellBuffsAvailableToCharacter({
        activeToggleIds: ["magic_weapon_active"],
      }).map((buff) => buff.toggleId),
    ).toEqual(["magic_weapon_active"])
  })

  it("detects active buffs on a weapon", () => {
    expect(
      isWeaponSpellBuffActiveOnWeapon({
        toggleId: "magic_weapon_active",
        weaponId: "longsword",
        activeToggleIds: ["magic_weapon_active"],
        bindings: { magic_weapon_active: "longsword" },
      }),
    ).toBe(true)
  })

  it("does not apply Magic Weapon to Unarmed Strike", () => {
    expect(weaponCanReceiveSpellBuff({ id: "unarmed-strike", name: "Unarmed Strike" })).toBe(false)
    expect(weaponCanReceiveSpellBuff({ id: "longsword", name: "Longsword" })).toBe(true)
    expect(
      isWeaponSpellBuffActiveOnWeapon({
        toggleId: "magic_weapon_active",
        weaponId: "unarmed-strike",
        activeToggleIds: ["magic_weapon_active"],
        bindings: { magic_weapon_active: "unarmed-strike" },
      }),
    ).toBe(false)
    expect(
      weaponSpellBuffRollBonuses({
        mods: [
          {
            id: "atk",
            type: "attack_roll_modifiers",
            requiresSheetToggle: "magic_weapon_active",
            entries: [{ bonus: 1, target: "all" }],
          },
        ] as CharacteristicModifier[],
        weaponId: "unarmed-strike",
        activeToggleIds: ["magic_weapon_active"],
        bindings: { magic_weapon_active: "unarmed-strike" },
      }),
    ).toEqual({ attack: 0, damage: 0, labels: [] })
  })
})
