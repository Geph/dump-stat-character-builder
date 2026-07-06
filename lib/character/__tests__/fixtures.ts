import type { CharacterBuildInputs } from "@/lib/character/types"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { Background, DndClass, Equipment, Feat } from "@/lib/types"

function acAbilityMod(
  id: string,
  abilities: ("DEX" | "CON" | "WIS")[],
  base = 10,
): CharacteristicModifier {
  return {
    id,
    type: "ac",
    mode: "ability_modifiers",
    base,
    abilities,
  }
}

export function linked(chars: CharacteristicModifier[]): LinkedModifierInstance[] {
  return [
    {
      instanceId: `modinst_${chars[0]?.id ?? "test"}`,
      catalogRefId: "cat_test",
      characteristics: chars,
    },
  ]
}

function attackRangedBonus(id: string, bonus: number): CharacteristicModifier {
  return {
    id,
    type: "attack_roll_modifiers",
    entries: [{ bonus, target: "ranged" }],
  } as unknown as unknown as CharacteristicModifier
}

function expertiseSkills(id: string, skills: string[]): CharacteristicModifier {
  return {
    id,
    type: "skills",
    entries: skills.map((skill) => ({ skill, expertise: true })),
    grantExpertise: true,
  } as unknown as unknown as CharacteristicModifier
}

export function toolExpertise(id: string): CharacteristicModifier {
  return {
    id,
    type: "tool_proficiencies",
    values: [],
    grantExpertise: true,
  } as unknown as unknown as CharacteristicModifier
}

export const shieldEquipment = {
  id: "shield",
  name: "Shield",
  category: "Armor",
  subcategory: "Shield",
  armor_class: 2,
  cost: null,
  weight: 6,
  properties: [],
  description: null,
  icon: null,
  source: "SRD",
  creator_url: null,
  created_at: "",
} as unknown as unknown as Equipment

export const longbowEquipment = {
  id: "longbow",
  name: "Longbow",
  category: "Weapon",
  subcategory: "Martial Ranged",
  damage: "1d8",
  damage_type: "Piercing",
  cost: null,
  weight: 2,
  properties: ["Ammunition", "Heavy", "Two-handed"],
  description: null,
  icon: null,
  source: "SRD",
  creator_url: null,
  created_at: "",
} as unknown as unknown as Equipment

export const chainMailEquipment = {
  id: "chain-mail",
  name: "Chain Mail",
  category: "Armor",
  subcategory: "Heavy Armor",
  armor_class: 16,
  cost: null,
  weight: 55,
  properties: [],
  description: null,
  icon: null,
  source: "SRD",
  creator_url: null,
  created_at: "",
} as unknown as unknown as Equipment

const barbarianClass = {
  id: "class_barbarian",
  name: "Barbarian",
  description: "",
    card_image_url: null,
  hit_die: 12,
  primary_ability: ["Strength"],
  saving_throws: ["Strength", "Constitution"],
  skill_choices: { count: 2, options: ["Athletics", "Perception"] },
  weapon_proficiencies: ["Simple weapons", "Martial weapons"],
  armor_proficiencies: ["Light armor", "Medium armor", "Shields"],
  features: [
    {
      name: "Unarmored Defense",
      level: 1,
      description: "",
      linkedModifiers: linked([acAbilityMod("barb_ud", ["DEX", "CON"])]),
    },
  ],
  spellcasting: null,
  starting_equipment: [],
  icon: null,
  accent_color: null,
  source: "SRD",
  creator_url: null,
  created_at: "",
} as unknown as unknown as DndClass

const rogueClass = {
  id: "class_rogue",
  name: "Rogue",
  description: "",
    card_image_url: null,
  hit_die: 8,
  primary_ability: ["Dexterity"],
  saving_throws: ["Dexterity", "Intelligence"],
  skill_choices: { count: 4, options: ["Stealth", "Perception", "Acrobatics"] },
  weapon_proficiencies: ["Simple weapons"],
  armor_proficiencies: ["Light armor"],
  tool_proficiencies: ["Thieves' tools"],
  features: [
    {
      name: "Expertise",
      level: 1,
      description: "",
      linkedModifiers: linked([expertiseSkills("rogue_exp", ["Stealth", "Perception"])]),
    },
  ],
  spellcasting: null,
  starting_equipment: [],
  icon: null,
  accent_color: null,
  source: "SRD",
  creator_url: null,
  created_at: "",
} as unknown as unknown as DndClass

const fighterClass = {
  id: "class_fighter",
  name: "Fighter",
  description: "",
    card_image_url: null,
  hit_die: 10,
  primary_ability: ["Strength"],
  saving_throws: ["Strength", "Constitution"],
  skill_choices: { count: 2, options: ["Athletics", "Perception"] },
  weapon_proficiencies: ["Simple weapons", "Martial weapons"],
  armor_proficiencies: ["All armor", "Shields"],
  features: [],
  spellcasting: null,
  starting_equipment: [],
  icon: null,
  accent_color: null,
  source: "SRD",
  creator_url: null,
  created_at: "",
} as unknown as unknown as DndClass

const archeryFeat = {
  id: "feat_archery",
  name: "Archery",
  description: "",
  category: "Fighting Style",
  level_requirement: null,
  prerequisite: null,
  prerequisite_feat_ids: null,
  prerequisite_class_ids: null,
  prerequisite_species_ids: null,
  prerequisite_background_ids: null,
  repeatable: false,
  benefits: [],
  linkedModifiers: linked([attackRangedBonus("archery", 2)]),
  icon: null,
  source: "SRD",
  creator_url: null,
  created_at: "",
} as unknown as unknown as Feat

const soldierBackground = {
  id: "bg_soldier",
  name: "Soldier",
  description: "",
  ability_bonuses: { strength: 0, constitution: 0, dexterity: 0 },
  skill_proficiencies: ["Athletics"],
  tool_proficiencies: [],
  feat_granted: null,
  starting_gold: null,
  starting_equipment: null,
  starting_equipment_groups: null,
  proficiencies: null,
  equipment: [],
  icon: null,
  source: "SRD",
  creator_url: null,
  created_at: "",
} as unknown as unknown as Background

export function baseInputs(partial: Partial<CharacterBuildInputs>): CharacterBuildInputs {
  return {
    baseAbilityScores: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    asiAllocations: {},
    background: null,
    species: null,
    classLevels: [],
    classes: [],
    subclasses: [],
    subclassByClassId: {},
    primaryClassId: null,
    classSkillPicks: {},
    classToolPicks: {},
    featureChoicePicks: {},
    speciesTraitPicks: {},
    featChoicePicks: {},
    modifierPlayerPicks: {},
    selectedFeatIds: [],
    grantedFeatIds: [],
    featSelectionEntries: [],
    extraSkillProficiencies: [],
    extraToolProficiencies: [],
    extraWeaponProficiencies: [],
    extraArmorProficiencies: [],
    languages: ["Common"],
    equipment: [],
    equippedArmorId: null,
    equippedShieldId: null,
    equippedWeaponId: null,
    modifierCatalog: [],
    feats: [],
    ...partial,
  } as unknown as unknown as CharacterBuildInputs
}

/** Barbarian 1, DEX 14 (+2), CON 16 (+3), shield, no armor → AC 17, HP 15 */
export function barbarianShieldFixture(): CharacterBuildInputs {
  return baseInputs({
    baseAbilityScores: {
      strength: 16,
      dexterity: 14,
      constitution: 16,
      intelligence: 8,
      wisdom: 10,
      charisma: 8,
    },
    classLevels: [{ classId: barbarianClass.id, level: 1 }],
    classes: [barbarianClass],
    primaryClassId: barbarianClass.id,
    equipment: [shieldEquipment],
    equippedShieldId: shieldEquipment.id,
  })
}

/** Rogue 3, DEX 16 (+3), expertise in Stealth & Perception, both proficient */
export function rogueExpertiseFixture(): CharacterBuildInputs {
  return baseInputs({
    baseAbilityScores: {
      strength: 8,
      dexterity: 16,
      constitution: 14,
      intelligence: 12,
      wisdom: 10,
      charisma: 10,
    },
    classLevels: [{ classId: rogueClass.id, level: 3 }],
    classes: [rogueClass],
    primaryClassId: rogueClass.id,
    extraSkillProficiencies: ["Stealth", "Perception", "Acrobatics"],
  })
}

/** Fighter 1 + Archery, background +2 STR / +1 CON on base 15/14/13 */
export function fighterArcheryBackgroundFixture(): CharacterBuildInputs {
  return baseInputs({
    baseAbilityScores: {
      strength: 15,
      dexterity: 14,
      constitution: 13,
      intelligence: 10,
      wisdom: 10,
      charisma: 8,
    },
    asiAllocations: {
      background_asi: { strength: 2, constitution: 1 },
    },
    background: soldierBackground,
    classLevels: [{ classId: fighterClass.id, level: 1 }],
    classes: [fighterClass],
    primaryClassId: fighterClass.id,
    selectedFeatIds: [archeryFeat.id],
    feats: [archeryFeat],
    equipment: [longbowEquipment],
    equippedWeaponId: longbowEquipment.id,
    extraSkillProficiencies: ["Athletics"],
  })
}

export { barbarianClass, rogueClass, fighterClass, archeryFeat, soldierBackground }
