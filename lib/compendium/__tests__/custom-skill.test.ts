import { describe, expect, it } from "vitest"
import {
  aggregateCharacteristics,
  collectCustomSkillNames,
  createCharacteristicModifier,
  skillNamesForCheckModifiers,
} from "@/lib/compendium/characteristic-modifiers"
import { buildCustomSkillCatalogEntry, CUSTOM_SKILL_CATALOG_ID } from "@/lib/compendium/custom-skill-catalog"
import { mergeDefaultCatalogEntries } from "@/lib/compendium/modifier-catalog"
import { computeDerivedCharacter } from "@/lib/character/compute-derived"
import { baseInputs } from "@/lib/character/__tests__/fixtures"
describe("custom skill modifier", () => {
  it("includes a permanent catalog entry", () => {
    const catalog = mergeDefaultCatalogEntries([])
    const entry = catalog.find((item) => item.id === CUSTOM_SKILL_CATALOG_ID)
    expect(entry?.name).toBe("Custom Skill")
    expect(entry?.characteristics?.[0]?.type).toBe("custom_skill")
  })

  it("aggregates custom skill proficiency and expertise", () => {
    const mod = createCharacteristicModifier("custom_skill")
    if (mod.type !== "custom_skill") throw new Error("expected custom_skill")
    mod.name = "Psionics"
    mod.ability = "intelligence"
    mod.expertise = true

    const aggregated = aggregateCharacteristics([mod])
    expect(aggregated.customSkills).toEqual([
      { name: "Psionics", ability: "intelligence", expertise: true },
    ])
    expect(aggregated.skills).toContain("Psionics")
    expect(aggregated.skillExpertise).toContain("Psionics")
  })

  it("collects custom skill names for check modifiers", () => {
    const mod = createCharacteristicModifier("custom_skill")
    if (mod.type !== "custom_skill") throw new Error("expected custom_skill")
    mod.name = "Tactics"
    expect(collectCustomSkillNames([mod])).toEqual(["Tactics"])
    expect(skillNamesForCheckModifiers(["Tactics"])).toContain("Tactics")
    expect(skillNamesForCheckModifiers(["Tactics"]).length).toBe(19)
  })

  it("computes bonus like a proficient SRD skill", () => {
    const mod = createCharacteristicModifier("custom_skill")
    if (mod.type !== "custom_skill") throw new Error("expected custom_skill")
    mod.name = "Lore"
    mod.ability = "wisdom"
    mod.expertise = false

    const derived = computeDerivedCharacter(
      baseInputs({
        baseAbilityScores: {
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 14,
          charisma: 10,
        },
        classLevels: [{ classId: "cls", level: 5 }],
        classes: [
          {
            id: "cls",
            name: "Test",
            hit_die: 8,
            saving_throws: [],
            weapon_proficiencies: [],
            armor_proficiencies: [],
            source: "SRD",
            creator_url: null,
            created_at: "",
            enabled: true,
          },
        ],
        primaryClassId: "cls",
        modifierCatalog: mergeDefaultCatalogEntries([]),
        customAbilities: [
          {
            id: "ability-1",
            name: "Loremaster",
            description: null,
            characteristics: null,
            modifier_refs: [],
            linked_modifiers: [
              {
                instanceId: "inst-lore",
                catalogRefId: CUSTOM_SKILL_CATALOG_ID,
                characteristics: [mod],
              },
            ],
            prerequisites: null,
            attached_to_type: null,
            attached_to_id: null,
            uses: null,
            show_in_builder: true,
            ability_role: null,
            casting_time: null,
            range: null,
            duration: null,
            psionic_augments: null,
            icon: null,
            source: "Homebrew",
            creator_url: null,
            created_at: "",
            updated_at: "",
          },
        ],
      }),
    )

    const lore = derived.skills.find((skill) => skill.name === "Lore")
    expect(lore).toMatchObject({
      ability: "wisdom",
      proficient: true,
      expertise: false,
      bonus: 5,
    })
  })

  it("buildCustomSkillCatalogEntry matches catalog id", () => {
    expect(buildCustomSkillCatalogEntry().id).toBe(CUSTOM_SKILL_CATALOG_ID)
  })
})
