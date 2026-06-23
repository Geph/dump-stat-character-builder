import { describe, expect, it } from "vitest"
import {
  buildCharacterSaveSnapshot,
  computeDerivedCharacter,
  deriveArmorClassForLoadout,
} from "@/lib/character/compute-derived"
import {
  barbarianShieldFixture,
  chainMailEquipment,
  fighterArcheryBackgroundFixture,
  rogueExpertiseFixture,
} from "@/lib/character/__tests__/fixtures"

describe("computeDerivedCharacter", () => {
  it("Barbarian 1 with shield uses Unarmored Defense + shield", () => {
    const derived = computeDerivedCharacter(barbarianShieldFixture())

    expect(derived.abilityScores.dexterity).toBe(14)
    expect(derived.abilityScores.constitution).toBe(16)
    expect(derived.abilityMods.dexterity).toBe(2)
    expect(derived.abilityMods.constitution).toBe(3)
    expect(derived.armorClass).toBe(17) // 10 + DEX + CON + shield
    expect(derived.maxHp).toBe(15) // d12 + CON
    expect(derived.proficiencyBonus).toBe(2)
    expect(derived.saves.find((s) => s.ability === "strength")?.bonus).toBe(5)
    expect(derived.saves.find((s) => s.ability === "constitution")?.bonus).toBe(5)
  })

  it("Rogue 3 doubles proficiency on expertise skills", () => {
    const derived = computeDerivedCharacter(rogueExpertiseFixture())

    const stealth = derived.skills.find((s) => s.name === "Stealth")
    const perception = derived.skills.find((s) => s.name === "Perception")
    const athletics = derived.skills.find((s) => s.name === "Athletics")

    expect(stealth?.expertise).toBe(true)
    expect(perception?.expertise).toBe(true)
    expect(stealth?.bonus).toBe(7) // DEX +3, expertise × PB 2
    expect(perception?.bonus).toBe(4) // WIS +0, expertise × PB 2
    expect(athletics?.bonus).toBe(-1) // STR -1, not proficient
    expect(derived.skillExpertise).toEqual(
      expect.arrayContaining(["Stealth", "Perception"]),
    )
  })

  it("Fighter 1 with Archery and background ASI applies ability boosts and ranged bonus", () => {
    const inputs = fighterArcheryBackgroundFixture()
    const derived = computeDerivedCharacter(inputs)

    expect(derived.abilityScores.strength).toBe(17)
    expect(derived.abilityScores.constitution).toBe(14)
    expect(derived.abilityMods.strength).toBe(3)
    expect(derived.equippedWeaponAttack?.attackBonus).toBe(6) // DEX +2, PB +2, Archery +2
  })

  it("Defense fighting style only applies while wearing armor", () => {
    const defenseFeat: import("@/lib/types").Feat = {
      id: "feat_defense",
      name: "Defense",
      description: "",
      category: "Fighting Style",
      repeatable: false,
      benefits: [],
      linkedModifiers: [
        {
          instanceId: "modinst_defense",
          catalogRefId: "cat_test",
          characteristics: [
            {
              id: "defense",
              type: "ac",
              mode: "flat_bonus",
              flatBonus: 1,
              requiresArmor: true,
            },
          ],
        },
      ],
      icon: null,
      source: "SRD",
      creator_url: null,
      created_at: "",
      enabled: true,
    }

    const base = fighterArcheryBackgroundFixture()
    const armorOnly = computeDerivedCharacter({
      ...base,
      equipment: [...base.equipment, chainMailEquipment],
      equippedArmorId: chainMailEquipment.id,
    })
    const armorAndDefense = computeDerivedCharacter({
      ...base,
      selectedFeatIds: [defenseFeat.id],
      feats: [defenseFeat],
      equipment: [...base.equipment, chainMailEquipment],
      equippedArmorId: chainMailEquipment.id,
    })
    const unarmoredNoDefense = computeDerivedCharacter(base)
    const unarmoredWithDefense = computeDerivedCharacter({
      ...base,
      selectedFeatIds: [defenseFeat.id],
      feats: [defenseFeat],
    })

    expect(armorAndDefense.armorClass).toBe(armorOnly.armorClass + 1)
    expect(unarmoredWithDefense.armorClass).toBe(unarmoredNoDefense.armorClass)
  })

  it("deriveArmorClassForLoadout matches computeDerivedCharacter for a hypothetical loadout", () => {
    const inputs = fighterArcheryBackgroundFixture()
    const withArmor = {
      ...inputs,
      equipment: [...inputs.equipment, chainMailEquipment],
    }
    const loadout = { armorId: chainMailEquipment.id, shieldId: null, weaponId: null }
    expect(deriveArmorClassForLoadout(withArmor, loadout)).toBe(
      computeDerivedCharacter({
        ...withArmor,
        equippedArmorId: chainMailEquipment.id,
        equippedShieldId: null,
        equippedWeaponId: null,
      }).armorClass,
    )
  })
})

describe("buildCharacterSaveSnapshot", () => {
  it("persists derived proficiencies and expertise from preview", () => {
    const inputs = rogueExpertiseFixture()
    const derived = computeDerivedCharacter(inputs)
    const snapshot = buildCharacterSaveSnapshot(inputs, derived)

    expect(snapshot.skill_expertise).toEqual(
      expect.arrayContaining(["Stealth", "Perception"]),
    )
    expect(snapshot.skill_proficiencies).toEqual(
      expect.arrayContaining(["Stealth", "Perception"]),
    )
    expect(snapshot.hit_point_max).toBe(derived.maxHp)
    expect(snapshot.armor_class).toBe(derived.armorClass)
  })
})

describe("save vs preview invariant", () => {
  it("saved snapshot matches preview for barbarian with shield", () => {
    const inputs = barbarianShieldFixture()
    const preview = computeDerivedCharacter(inputs)
    const saved = buildCharacterSaveSnapshot(inputs, preview)

    expect(saved.armor_class).toBe(preview.armorClass)
    expect(saved.hit_point_max).toBe(preview.maxHp)
    expect(saved.initiative).toBe(preview.initiative)
  })

  it("reloaded sheet recompute matches preview when inputs are restored", () => {
    const inputs = fighterArcheryBackgroundFixture()
    const preview = computeDerivedCharacter(inputs)
    const snapshot = buildCharacterSaveSnapshot(inputs, preview)

    const reloadedInputs = {
      ...inputs,
      baseAbilityScores: {
        strength: snapshot.strength,
        dexterity: snapshot.dexterity,
        constitution: snapshot.constitution,
        intelligence: snapshot.intelligence,
        wisdom: snapshot.wisdom,
        charisma: snapshot.charisma,
      },
      extraSkillProficiencies: snapshot.skill_proficiencies,
      extraToolProficiencies: snapshot.tool_proficiencies,
      extraWeaponProficiencies: snapshot.weapon_proficiencies,
      extraArmorProficiencies: snapshot.armor_proficiencies,
      languages: snapshot.languages,
    }

    const sheetDerived = computeDerivedCharacter(reloadedInputs)

    expect(sheetDerived.abilityScores.strength).toBe(preview.abilityScores.strength)
    expect(sheetDerived.armorClass).toBe(preview.armorClass)
    expect(sheetDerived.maxHp).toBe(preview.maxHp)
    expect(sheetDerived.equippedWeaponAttack?.attackBonus).toBe(
      preview.equippedWeaponAttack?.attackBonus,
    )
  })
})
