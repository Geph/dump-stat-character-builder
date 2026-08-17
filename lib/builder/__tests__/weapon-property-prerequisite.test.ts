import { describe, expect, it } from "vitest"
import { isChoicePrerequisiteMet } from "@/lib/builder/choice-prerequisite"
import {
  isUpgradeEligible,
  isWeaponMasteryEligibleForWeapon,
} from "@/lib/builder/upgrade-choices"
import {
  extraMasteriesForWeapon,
  extraWeaponMasterySlotCount,
  normalizeWeaponMasteryPicks,
  setExtraMasteriesForWeapon,
} from "@/lib/character/weapon-mastery-picks"
import type { CustomAbility } from "@/lib/types"

function mastery(
  name: string,
  prerequisites: string,
  extra: Partial<CustomAbility> = {},
): CustomAbility {
  return {
    id: name.toLowerCase(),
    name,
    description: `${name} mastery property.`,
    prerequisites,
    characteristics: null,
    attached_to_type: "class",
    attached_to_id: "Craftsman",
    uses: null,
    show_in_builder: true,
    icon: null,
    source: "magehandpress",
    creator_url: null,
    created_at: "",
    updated_at: "",
    ability_role: "weapon_mastery",
    eligible_classes: ["Craftsman"],
    ...extra,
  }
}

const parry = mastery("Parry", "Melee Weapon, Finesse Property")
const explode = mastery(
  "Explode",
  "Level 5+ Craftsman; Fire Damage, Ranged Weapon [Craftsman Only]",
  { level_requirement: 5 },
)

const rapier = {
  subcategory: "Martial Melee Weapons",
  properties: ["Finesse"],
  damageType: "Piercing",
}

const maul = {
  subcategory: "Martial Melee Weapons",
  properties: ["Heavy", "Two-Handed"],
  damageType: "Bludgeoning",
}

const fireBow = {
  subcategory: "Martial Ranged Weapons",
  properties: ["Ammunition", "Heavy"],
  damageType: "Fire",
}

describe("weapon property prerequisites", () => {
  it("rejects Parry on a Heavy weapon and accepts it on a Finesse melee weapon", () => {
    expect(isWeaponMasteryEligibleForWeapon(parry, 3, maul, ["Craftsman"])).toBe(false)
    expect(isWeaponMasteryEligibleForWeapon(parry, 3, rapier, ["Craftsman"])).toBe(true)
  })

  it("rejects Explode unless the weapon is ranged, deals Fire, and the Craftsman is level 5+", () => {
    expect(isWeaponMasteryEligibleForWeapon(explode, 11, rapier, ["Craftsman"])).toBe(false)
    expect(isWeaponMasteryEligibleForWeapon(explode, 4, fireBow, ["Craftsman"])).toBe(false)
    expect(isWeaponMasteryEligibleForWeapon(explode, 5, fireBow, ["Fighter"])).toBe(false)
    expect(isWeaponMasteryEligibleForWeapon(explode, 5, fireBow, ["Craftsman"])).toBe(true)
  })

  it("still lists mastery properties in the character-level catalog when no weapon is supplied", () => {
    expect(isUpgradeEligible(parry, 1, { classNames: ["Craftsman"] })).toBe(true)
    expect(isUpgradeEligible(explode, 5, { classNames: ["Craftsman"] })).toBe(true)
    expect(isUpgradeEligible(explode, 4, { classNames: ["Craftsman"] })).toBe(false)
  })

  it("skips leftover weapon clauses so Warmage-style named prerequisites still work", () => {
    expect(
      isChoicePrerequisiteMet("Light Cantrip", { classLevel: 2, knownSpellNames: ["Light"] }),
    ).toBe(true)
    expect(
      isChoicePrerequisiteMet("Melee Weapon, Finesse Property", {
        classLevel: 1,
        weapon: maul,
      }),
    ).toBe(false)
  })
})

describe("per-weapon extra mastery picks", () => {
  it("persists extra properties per equipment id across JSON save/reload", () => {
    const saved = setExtraMasteriesForWeapon({}, "rapier-1", ["Parry", "Shift"])
    const reloaded = normalizeWeaponMasteryPicks(JSON.parse(JSON.stringify(saved)))
    expect(extraMasteriesForWeapon(reloaded, "rapier-1")).toEqual(["Parry", "Shift"])
    expect(extraMasteriesForWeapon(reloaded, "maul-1")).toEqual([])
  })

  it("grants one extra slot from Masterwork Weapons and two from Improved Masterwork", () => {
    expect(
      extraWeaponMasterySlotCount([
        { name: "Masterwork Weapons", choices: { resourceKey: "weapon_mastery_extra", count: 1 } },
      ]),
    ).toBe(1)
    expect(
      extraWeaponMasterySlotCount([
        { name: "Masterwork Weapons", choices: { resourceKey: "weapon_mastery_extra", count: 1 } },
        { name: "Improved Masterwork", choices: { resourceKey: "weapon_mastery_extra", count: 2 } },
      ]),
    ).toBe(2)
  })
})
