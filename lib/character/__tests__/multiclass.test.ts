import { describe, expect, it } from "vitest"
import {
  buildCharacterSaveSnapshot,
  buildInputsFromSavedCharacter,
  computeDerivedCharacter,
} from "@/lib/character/compute-derived"
import { barbarianShieldFixture } from "@/lib/character/__tests__/fixtures"
import type { DndClass } from "@/lib/types"
import type { CharacterBuildInputs } from "@/lib/character/types"

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
  tool_proficiencies: [],
  features: [],
  spellcasting: null,
  source: "SRD",
  creator_url: null,
  created_at: "",
} as unknown as DndClass

const wizardClass = {
  id: "class_wizard",
  name: "Wizard",
  description: "",
    card_image_url: null,
  hit_die: 6,
  primary_ability: ["Intelligence"],
  saving_throws: ["Intelligence", "Wisdom"],
  skill_choices: { count: 2, options: ["Arcana", "History"] },
  weapon_proficiencies: ["Simple weapons"],
  armor_proficiencies: [],
  tool_proficiencies: [],
  features: [],
  spellcasting: { ability: "Intelligence", caster_progression: "full" },
  source: "SRD",
  creator_url: null,
  created_at: "",
} as unknown as DndClass

describe("multiclass persistence", () => {
  it("snapshot stores class rows and reload inputs preserve total level", () => {
    const base = barbarianShieldFixture()
    const inputs = {
      ...base,
      classLevels: [
        { classId: fighterClass.id, level: 5 },
        { classId: wizardClass.id, level: 3 },
      ],
      classes: [fighterClass, wizardClass],
      primaryClassId: fighterClass.id,
      classAddOrder: [fighterClass.id, wizardClass.id],
      subclassByClassId: {},
    }

    const derived = computeDerivedCharacter(inputs as unknown as CharacterBuildInputs)
    const snapshot = buildCharacterSaveSnapshot(inputs, derived)

    expect(snapshot.character_classes).toEqual([
      expect.objectContaining({ class_id: fighterClass.id, level: 5, order: 0 }),
      expect.objectContaining({ class_id: wizardClass.id, level: 3, order: 1 }),
    ])
    expect(snapshot.class_add_order).toEqual([fighterClass.id, wizardClass.id])
    expect(derived.totalLevel).toBe(8)

    const reloaded = buildInputsFromSavedCharacter({
      character: {
        strength: snapshot.strength,
        dexterity: snapshot.dexterity,
        constitution: snapshot.constitution,
        intelligence: snapshot.intelligence,
        wisdom: snapshot.wisdom,
        charisma: snapshot.charisma,
        level: 8,
        class_id: fighterClass.id,
        subclass_id: null,
        character_classes: snapshot.character_classes,
        class_add_order: snapshot.class_add_order,
        species_id: base.species?.id ?? null,
        background_id: base.background?.id ?? null,
        asi_allocations: base.asiAllocations,
        skill_proficiencies: snapshot.skill_proficiencies,
        tool_proficiencies: snapshot.tool_proficiencies,
        weapon_proficiencies: snapshot.weapon_proficiencies,
        armor_proficiencies: snapshot.armor_proficiencies,
        languages: snapshot.languages,
        equipment_ids: [],
        feat_ids: [],
        equipped_armor_id: null,
        equipped_shield_id: null,
        equipped_weapon_id: null,
      },
      classes: [fighterClass, wizardClass] as unknown as DndClass[],
      species: base.species,
      background: base.background,
      feats: [],
      equipment: base.equipment,
      modifierCatalog: base.modifierCatalog,
    })

    expect(reloaded?.classLevels).toEqual([
      { classId: fighterClass.id, level: 5 },
      { classId: wizardClass.id, level: 3 },
    ])
    expect(reloaded?.classAddOrder).toEqual([fighterClass.id, wizardClass.id])
    expect(computeDerivedCharacter(reloaded!).totalLevel).toBe(8)
  })
})
