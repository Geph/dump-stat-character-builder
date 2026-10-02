import { describe, expect, it } from "vitest"
import {
  resolveCompanion,
  resolveCompanionAttack,
  type CompanionAttack,
  type CompanionResolveContext,
  type CompanionSource,
  type CompanionStatBlockTemplate,
} from "@/lib/character/companion-stat-block"
import { buildCreatureTemplateLookup } from "@/lib/character/resolve-companions"
import type { Creature } from "@/lib/types"

const CTX: CompanionResolveContext = {
  abilityMods: { strength: 3, dexterity: 1, constitution: 2, intelligence: 0, wisdom: 0, charisma: 0 },
  proficiencyBonus: 2,
  spellAttackModifier: null,
  spellSaveDc: null,
  classLevels: [],
}

describe("resolveCompanionAttack", () => {
  it("resolves a fixed to-hit bonus and damage formula", () => {
    const attack: CompanionAttack = {
      kind: "melee",
      toHit: { parts: [{ type: "fixed", value: 4 }] },
      reach: "5 ft.",
      damage: [{ dice: "1d6", bonus: { parts: [{ type: "fixed", value: 2 }] }, type: "Piercing" }],
    }
    const resolved = resolveCompanionAttack(attack, CTX)
    expect(resolved.toHitBonus).toBe(4)
    expect(resolved.damage).toEqual([{ formula: "1d6+2", type: "Piercing" }])
    expect(resolved.reach).toBe("5 ft.")
  })

  it("resolves ability modifier + proficiency bonus scale parts (common-modifier composition)", () => {
    const attack: CompanionAttack = {
      kind: "melee",
      toHit: {
        parts: [
          { type: "fixed", value: 0 },
          { type: "scale", ref: { kind: "ability_modifier", ability: "strength" } },
          { type: "scale", ref: { kind: "proficiency_bonus" } },
        ],
      },
      damage: [
        {
          dice: "1d8",
          bonus: { parts: [{ type: "scale", ref: { kind: "ability_modifier", ability: "strength" } }] },
          type: "Slashing",
        },
      ],
    }
    const resolved = resolveCompanionAttack(attack, CTX)
    // STR mod (+3) + PB (+2) = +5
    expect(resolved.toHitBonus).toBe(5)
    expect(resolved.damage).toEqual([{ formula: "1d8+3", type: "Slashing" }])
  })

  it("omits a zero bonus from the damage formula", () => {
    const attack: CompanionAttack = {
      kind: "ranged",
      toHit: { parts: [{ type: "fixed", value: 3 }] },
      range: "80/320 ft.",
      damage: [{ dice: "1d4", type: "Piercing" }],
    }
    const resolved = resolveCompanionAttack(attack, CTX)
    expect(resolved.damage).toEqual([{ formula: "1d4", type: "Piercing" }])
    expect(resolved.range).toBe("80/320 ft.")
  })
})

describe("resolveCompanion structured actions", () => {
  const template: CompanionStatBlockTemplate = {
    name: "Test Wolf",
    ac: { parts: [{ type: "fixed", value: 12 }] },
    hp: { parts: [{ type: "fixed", value: 11 }] },
    traits: [],
    actions: [
      {
        name: "Bite",
        description: "The wolf bites.",
        attack: {
          kind: "melee",
          toHit: { parts: [{ type: "fixed", value: 4 }] },
          reach: "5 ft.",
          damage: [{ dice: "1d6", bonus: { parts: [{ type: "fixed", value: 2 }] }, type: "Piercing" }],
        },
      },
      { name: "Growl", description: "Legacy prose-only action with no structured attack." },
    ],
    cardImageUrl: "/images/compendium/spells/wolf.png",
  }

  const source: CompanionSource = {
    featureName: "Ranger Companion",
    featureLevel: 3,
    className: "Ranger",
    classId: "ranger",
  }

  it("resolves each action's structured attack and passes through the card image", () => {
    const resolved = resolveCompanion(template, source, CTX)
    expect(resolved.cardImageUrl).toBe("/images/compendium/spells/wolf.png")
    expect(resolved.actions).toHaveLength(2)
    expect(resolved.actions[0].resolvedAttack).toEqual({
      kind: "melee",
      toHitBonus: 4,
      reach: "5 ft.",
      range: null,
      damage: [{ formula: "1d6+2", type: "Piercing" }],
    })
    // Legacy (prose-only) actions keep working — no structured attack, sheet falls back to parsing.
    expect(resolved.actions[1].resolvedAttack).toBeNull()
    expect(resolved.bonusActions).toEqual([])
    expect(resolved.legendaryActions).toEqual([])
  })
})

describe("buildCreatureTemplateLookup card art", () => {
  it("stamps the compendium row's card_image_url onto the resolved template", () => {
    const creature: Creature = {
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
        hp: { parts: [{ type: "fixed", value: 11 }] },
        traits: [],
        actions: [],
      },
      icon: null,
      card_image_url: "/images/compendium/species/wolf.png",
      source: "SRD",
      creator_url: null,
      created_at: "",
    }
    const lookup = buildCreatureTemplateLookup([creature])
    expect(lookup.get("wolf")?.cardImageUrl).toBe("/images/compendium/species/wolf.png")
  })
})
