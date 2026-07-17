import { describe, expect, it } from "vitest"
import {
  buildCreatureTemplateLookup,
  collectCompanionCandidatesFromClasses,
  resolveCharacterCompanions,
} from "@/lib/character/resolve-companions"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { Creature, CustomAbility } from "@/lib/types"

const CTX = {
  abilityMods: { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 },
  proficiencyBonus: 2,
  spellAttackModifier: null,
  spellSaveDc: null,
  classLevels: [] as { className: string; level: number }[],
}

const WOLF: Creature = {
  id: "creature-wolf",
  name: "Wolf",
  description: null,
  creature_type: "Beast",
  size: "Medium",
  alignment: "Unaligned",
  cr: "1/4",
  stat_block: {
    name: "Wolf",
    ac: { parts: [{ type: "fixed", value: 12 }] },
    hp: { parts: [{ type: "fixed", value: 11 }], label: "2d8 + 2" },
    traits: [{ name: "Pack Tactics", description: "Advantage when allies are near." }],
    actions: [{ name: "Bite", description: "+4 to hit, 1d6 + 2 piercing." }],
  },
  icon: null,
  source: "SRD",
  creator_url: null,
  created_at: "",
}

describe("buildCreatureTemplateLookup", () => {
  it("indexes creatures by normalized name", () => {
    const lookup = buildCreatureTemplateLookup([WOLF])
    expect(lookup.get("wolf")?.name).toBe("Wolf")
  })
})

describe("creature-linked companions", () => {
  const rangerWith = (names: string[]): CharacterClassDetail =>
    ({
      row: { class_id: "ranger", level: 3, subclass_id: null },
      class: {
        name: "Ranger",
        features: [
          { name: "Animal Companion", level: 3, description: "", companion_creature_names: names },
        ],
      },
      subclass: null,
    }) as unknown as CharacterClassDetail

  it("resolves a feature's companion_creature_names from the creatures table", () => {
    const lookup = buildCreatureTemplateLookup([WOLF])
    const candidates = collectCompanionCandidatesFromClasses([rangerWith(["Wolf"])], lookup)
    expect(candidates).toHaveLength(1)
    expect(candidates[0].template.name).toBe("Wolf")
    expect(candidates[0].source.featureName).toBe("Animal Companion")
    expect(candidates[0].source.formName).toBe("Wolf")
  })

  it("ignores names with no matching creature", () => {
    const lookup = buildCreatureTemplateLookup([WOLF])
    const candidates = collectCompanionCandidatesFromClasses([rangerWith(["Griffon"])], lookup)
    expect(candidates).toHaveLength(0)
  })

  it("resolves creatures linked from a custom ability", () => {
    const ability = {
      id: "ability-1",
      name: "Summon Beast",
      description: "",
      attached_to_type: "class",
      attached_to_id: "ranger",
      companion_creature_names: ["Wolf"],
    } as unknown as CustomAbility

    const resolved = resolveCharacterCompanions({
      classDetails: [],
      customAbilities: [ability],
      ctx: CTX,
      creatures: [WOLF],
    })
    expect(resolved.map((r) => r.template.name)).toContain("Wolf")
    const wolf = resolved.find((r) => r.template.name === "Wolf")!
    expect(wolf.ac).toBe(12)
    expect(wolf.maxHp).toBe(11)
  })

  it("does nothing when no creatures are supplied", () => {
    const candidates = collectCompanionCandidatesFromClasses([rangerWith(["Wolf"])])
    expect(candidates).toHaveLength(0)
  })
})
