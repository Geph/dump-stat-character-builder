import { describe, expect, it } from "vitest"
import {
  activeWeaponMorphOption,
  buildWeaponMorphAttack,
  weaponMorphToggleIdForOption,
  WEAPON_MORPH_OPTIONS,
} from "@/lib/character/weapon-morph"

describe("weapon morph", () => {
  it("maps menu option names to exclusive toggles", () => {
    expect(weaponMorphToggleIdForOption("Bone Spike")).toBe("weapon_morph_bone_spike")
    expect(weaponMorphToggleIdForOption("End morph")).toBe("__end_weapon_morph__")
    expect(weaponMorphToggleIdForOption("Unknown")).toBeNull()
  })

  it("resolves the active morph from toggle ids", () => {
    expect(activeWeaponMorphOption(["weapon_morph_sinew_whip"])?.id).toBe("sinew_whip")
    expect(activeWeaponMorphOption([])).toBeNull()
  })

  it("builds attack math for morph weapons", () => {
    const bone = WEAPON_MORPH_OPTIONS.find((option) => option.id === "bone_spike")!
    const attack = buildWeaponMorphAttack({
      equipment: bone.equipment,
      abilityMods: {
        strength: 2,
        dexterity: 4,
        constitution: 0,
        intelligence: 0,
        wisdom: 0,
        charisma: 0,
      },
      proficiencyBonus: 3,
    })
    expect(attack?.attackBonus).toBe(7) // finesse DEX 4 + PB 3
    expect(attack?.damageDisplay).toMatch(/1d8/)
    expect(attack?.attackAbilityMod).toBe(4)
  })
})
