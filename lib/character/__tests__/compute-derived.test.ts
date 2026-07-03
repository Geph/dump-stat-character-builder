import { describe, expect, it } from "vitest"
import {
  buildCharacterSaveSnapshot,
  computeDerivedCharacter,
  deriveArmorClassForLoadout,
} from "@/lib/character/compute-derived"
import {
  barbarianShieldFixture,
  baseInputs,
  chainMailEquipment,
  fighterArcheryBackgroundFixture,
  fighterClass,
  linked,
  rogueExpertiseFixture,
  shieldEquipment,
  toolExpertise,
} from "@/lib/character/__tests__/fixtures"
import type { Equipment, Feat } from "@/lib/types"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"

function linked(chars: CharacteristicModifier[]): LinkedModifierInstance[] {
  return [
    {
      instanceId: `modinst_${chars[0]?.id ?? "test"}`,
      catalogRefId: "cat_test",
      characteristics: chars,
    },
  ]
}

const longswordEquipment: Equipment = {
  id: "longsword",
  name: "Longsword",
  category: "Weapon",
  subcategory: "Martial Melee Weapons",
  properties: { damage: "1d8 Slashing", mastery: "Sap" },
  icon: null,
  source: "SRD",
  creator_url: null,
  created_at: "",
}

const plusOneLongsword: Equipment = {
  id: "plus-one-longsword",
  name: "+1 Longsword",
  category: "Weapon",
  subcategory: "Martial Melee Weapons",
  rarity: "Uncommon",
  magic_item_category: "Weapon",
  requires_attunement: true,
  base_equipment_ids: [longswordEquipment.id],
  selected_base_equipment_id: longswordEquipment.id,
  magic_effects: linked([
    {
      id: "plus_one_attack",
      type: "attack_roll_modifiers",
      entries: [{ bonus: 1, target: "all" }],
    },
    {
      id: "plus_one_damage",
      type: "damage_roll_modifiers",
      entries: [{ bonus: 1, target: "all" }],
    },
  ]),
  icon: null,
  source: "SRD",
  creator_url: null,
  created_at: "",
}

const plusOneShield: Equipment = {
  id: "plus-one-shield",
  name: "+1 Shield",
  category: "Armor",
  subcategory: "Shield",
  armor_class: "+2",
  rarity: "Uncommon",
  magic_item_category: "Armor",
  requires_attunement: true,
  base_equipment_ids: [shieldEquipment.id],
  selected_base_equipment_id: shieldEquipment.id,
  magic_effects: linked([
    { id: "plus_one_shield_ac", type: "ac", mode: "flat_bonus", flatBonus: 1 },
  ]),
  icon: null,
  source: "SRD",
  creator_url: null,
  created_at: "",
}

const plusOneChainMail: Equipment = {
  id: "plus-one-chain-mail",
  name: "+1 Chain Mail",
  category: "Armor",
  subcategory: "Heavy Armor",
  armor_class: "16",
  rarity: "Rare",
  magic_item_category: "Armor",
  requires_attunement: true,
  base_equipment_ids: [chainMailEquipment.id],
  selected_base_equipment_id: chainMailEquipment.id,
  magic_effects: linked([
    {
      id: "plus_one_armor_ac",
      type: "ac",
      mode: "flat_bonus",
      flatBonus: 1,
      requiresArmor: true,
    },
  ]),
  icon: null,
  source: "SRD",
  creator_url: null,
  created_at: "",
}

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

  it("applies +1 weapon magic effects when wielded", () => {
    const base = fighterArcheryBackgroundFixture()
    const inputs = {
      ...base,
      selectedFeatIds: [],
      feats: [],
      classes: [fighterClass],
      classLevels: [{ classId: fighterClass.id, level: 1 }],
      equipment: [longswordEquipment, plusOneLongsword],
      equippedWeaponId: plusOneLongsword.id,
      attunedItemIds: [plusOneLongsword.id],
    }
    const withoutMagic = computeDerivedCharacter({
      ...inputs,
      equippedWeaponId: longswordEquipment.id,
      attunedItemIds: [],
      equipment: [longswordEquipment],
    })
    const withMagic = computeDerivedCharacter(inputs)

    expect(withMagic.equippedWeaponAttack?.attackBonus).toBe(
      (withoutMagic.equippedWeaponAttack?.attackBonus ?? 0) + 1,
    )
    expect(withMagic.equippedWeaponAttack?.damageDisplay).toContain("+ 1")
  })

  it("applies +1 shield magic effects when wielded", () => {
    const base = barbarianShieldFixture()
    const withoutMagic = computeDerivedCharacter(base)
    const withMagic = computeDerivedCharacter({
      ...base,
      equipment: [shieldEquipment, plusOneShield],
      equippedShieldId: plusOneShield.id,
      attunedItemIds: [plusOneShield.id],
    })

    expect(withMagic.armorClass).toBe(withoutMagic.armorClass + 1)
  })

  it("applies +1 armor magic effects when worn", () => {
    const base = fighterArcheryBackgroundFixture()
    const withoutMagic = computeDerivedCharacter({
      ...base,
      equipment: [chainMailEquipment],
      equippedArmorId: chainMailEquipment.id,
      equippedWeaponId: null,
    })
    const withMagic = computeDerivedCharacter({
      ...base,
      equipment: [chainMailEquipment, plusOneChainMail],
      equippedArmorId: plusOneChainMail.id,
      equippedWeaponId: null,
      attunedItemIds: [plusOneChainMail.id],
    })

    expect(withMagic.armorClass).toBe(withoutMagic.armorClass + 1)
  })

  it("does not apply attuned magic item effects without attunement", () => {
    const base = fighterArcheryBackgroundFixture()
    const ringOfProtection: Equipment = {
      id: "ring-protection",
      name: "Ring of Protection",
      category: "Adventuring Gear",
      magic_item_category: "Ring",
      rarity: "Rare",
      requires_attunement: true,
      magic_effects: linked([
        { id: "ring_ac", type: "ac", mode: "flat_bonus", flatBonus: 1 },
      ]),
      icon: null,
      source: "SRD",
      creator_url: null,
      created_at: "",
    }
    const unattuned = computeDerivedCharacter({
      ...base,
      equipment: [...base.equipment, ringOfProtection],
    })
    const attuned = computeDerivedCharacter({
      ...base,
      equipment: [...base.equipment, ringOfProtection],
      attunedItemIds: [ringOfProtection.id],
    })

    expect(attuned.armorClass).toBe(unattuned.armorClass + 1)
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

  it("halves max HP and speed at high exhaustion levels", () => {
    const inputs = fighterArcheryBackgroundFixture()
    const normal = computeDerivedCharacter({ ...inputs, exhaustionLevel: 0 })
    const exhausted = computeDerivedCharacter({ ...inputs, exhaustionLevel: 4 })
    const immobile = computeDerivedCharacter({ ...inputs, exhaustionLevel: 5 })

    expect(exhausted.maxHp).toBe(Math.max(1, Math.floor(normal.maxHp / 2)))
    expect(exhausted.speed).toBe(Math.floor(normal.speed / 2))
    expect(immobile.speed).toBe(0)
  })

  it("doubles proficiency bonus on tool checks with tool expertise", () => {
    const toolExpertiseFeat: Feat = {
      id: "tool-expertise-feat",
      name: "Tool Expertise",
      description: "Double PB on tool checks.",
      linkedModifiers: linked([toolExpertise("tool_expertise")]),
      modifierRefs: [],
      prerequisite: null,
      prerequisite_feat_ids: null,
      prerequisite_class_ids: null,
      prerequisite_species_ids: null,
      prerequisite_background_ids: null,
      benefits: null,
      is_choice: false,
      choices: null,
      repeatable: false,
      icon: null,
      source: "test",
      creator_url: null,
      created_at: "",
    }
    const derived = computeDerivedCharacter(
      baseInputs({
        baseAbilityScores: {
          strength: 10,
          dexterity: 14,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        },
        classLevels: [{ classId: "inventor", level: 10 }],
        extraToolProficiencies: ["Thieves' Tools"],
        grantedFeatIds: [toolExpertiseFeat.id],
        feats: [toolExpertiseFeat],
      }),
    )
    const thieves = derived.tools.find((tool) => /thieves/i.test(tool.name))
    expect(thieves?.expertise).toBe(true)
    expect(thieves?.bonus).toBe(derived.abilityMods.dexterity + derived.proficiencyBonus * 2)
  })
})
