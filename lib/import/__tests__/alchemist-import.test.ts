import { describe, expect, it } from "vitest"
import { aggregateCharacteristics } from "@/lib/compendium/characteristic-modifiers"
import { resolveRechargeRuleAmount } from "@/lib/compendium/normalize-uses-config"
import { aggregateBombFormulaOptions } from "@/lib/builder/aggregate-bomb-formulas"
import { resolveFeatureChoiceOptions } from "@/lib/builder/aggregate-psionic-talents"
import { resolveHeldItemsCap } from "@/lib/character/resolve-held-items-cap"
import { enrichImportChoiceFeatures } from "@/lib/import/enrich-import-choices"
import { enrichAlchemistFeatures } from "@/lib/import/enrich-alchemist-features"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { collectImportProposals } from "@/lib/import/import-proposals"
import { parseCraftableItemsTable } from "@/lib/import/parse-craftable-items-table"
import { parseMulticlassSection } from "@/lib/import/parse-multiclass-section"
import type { ImportContent } from "@/lib/import/content-schema"
import type { CustomAbility } from "@/lib/types"

const alchemistBombProposal = {
  proposal_id: "alchemist_bomb",
  name: "Bomb",
  definition: "Unified Bomb attack and Explode modes.",
  description: "Throw a bomb as a ranged attack or detonate it for an area save.",
  source_type: "class" as const,
  source_name: "Alchemist",
  level_requirement: 1,
  ability_role: "alchemist_bomb" as const,
}

const acidBombFormula = {
  proposal_id: "bomb_formulas",
  name: "Bomb Formulas",
  definition: "Formula options for Bombs.",
  description: "Choose bomb formulas.",
  source_type: "class" as const,
  source_name: "Alchemist",
  level_requirement: 2,
  ability_role: "bomb_formula" as const,
  choices: {
    category: "Bomb Formula",
    count: 1,
    options: [
      {
        name: "Acid Bomb",
        description: "Bomb deals Acid damage instead of Fire.",
        prerequisite: null,
      },
    ],
  },
}

describe("Alchemist unified Bomb import", () => {
  it("wires attack and explode special_attack characteristics on one ability", () => {
    const enriched = enrichAlchemistFeatures({
      import_proposals: { custom_abilities: [alchemistBombProposal] },
    } as unknown as ImportContent)
    const bomb = enriched.import_proposals?.custom_abilities?.[0] as Record<string, unknown>
    const mods = bomb.linkedModifiers as { characteristics?: { type: string; attackVariant?: string }[] }[]
    const chars = mods.flatMap((mod) => mod.characteristics ?? [])
    expect(chars.filter((char) => char.type === "special_attack")).toHaveLength(2)
    expect(chars.some((char) => char.attackVariant === "attack")).toBe(true)
    expect(chars.some((char) => char.attackVariant === "explode")).toBe(true)
    expect(bomb.uses).toMatchObject({
      type: "class_resource",
      classResourceKey: "reagents",
    })
  })

  it("includes Prime Bomb linear scaling fields", () => {
    const enriched = enrichAlchemistFeatures({
      import_proposals: { custom_abilities: [alchemistBombProposal] },
    } as unknown as ImportContent)
    const bomb = enriched.import_proposals?.custom_abilities?.[0] as Record<string, unknown>
    const mods = bomb.linkedModifiers as { characteristics?: Record<string, unknown>[] }[]
    const attack = mods.flatMap((mod) => mod.characteristics ?? []).find((char) => char.attackVariant === "attack")
    expect(attack).toMatchObject({
      resourceScaleKey: "reagents",
      bonusDicePerResource: "1d10",
    })
    expect(attack?.maxResourcesSpentByLevel).toEqual(
      expect.arrayContaining([expect.objectContaining({ level: 5, fixed: 1 })]),
    )
  })

  it("sets Acid Bomb formula damage type to Acid", () => {
    const enriched = enrichAlchemistFeatures({
      import_proposals: {
        custom_abilities: [
          {
            ...acidBombFormula,
            name: "Acid Bomb",
            ability_role: "bomb_formula" as const,
            choices: null,
          } as unknown as (typeof acidBombFormula),
        ],
      },
    } as unknown as ImportContent)
    const formula = enriched.import_proposals?.custom_abilities?.[0] as Record<string, unknown>
    const mods = formula.linkedModifiers as { characteristics?: { damageTypes?: string[] }[] }[]
    const damageTypes = mods.flatMap((mod) => mod.characteristics ?? []).flatMap((char) => char.damageTypes ?? [])
    expect(damageTypes).toContain("Acid")
  })
})

describe("Alchemist choice pickers", () => {
  it("wires Bomb Formulas picker with class_bomb_formulas source", () => {
    const content = enrichImportChoiceFeatures({
      classes: [
        {
          name: "Alchemist",
          description: "",
          hit_die: 8,
          primary_ability: ["Intelligence"],
          features: [
            {
              level: 2,
              name: "Bomb Formulas",
              description: "You learn bomb formulas and can replace one when you finish a Long Rest.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)
    const feature = content.classes?.[0]?.features.find((f) => f.name === "Bomb Formulas")
    expect(feature?.choices?.resourceKey).toBe("bomb_formulas_known")
    expect(feature?.choices?.optionsSource).toBe("class_bomb_formulas")
    expect(feature?.choices?.swappableOnRest).toBe(true)
  })

  it("wires Discoveries picker with class_discoveries source", () => {
    const content = enrichImportChoiceFeatures({
      classes: [
        {
          name: "Alchemist",
          description: "",
          hit_die: 8,
          primary_ability: ["Intelligence"],
          features: [{ level: 5, name: "Discoveries", description: "Choose a Discovery." }],
        },
      ],
    } as unknown as ImportContent)
    const feature = content.classes?.[0]?.features.find((f) => f.name === "Discoveries")
    expect(feature?.choices?.resourceKey).toBe("discoveries_known")
    expect(feature?.choices?.optionsSource).toBe("class_discoveries")
  })

  it("aggregates bomb formula options at build time", () => {
    const customAbilities = [
      {
        id: "1",
        name: "Acid Bomb",
        ability_role: "bomb_formula",
        attached_to_type: "class",
        attached_to_id: "Alchemist",
        source: "Alchemist",
      },
    ] as CustomAbility[]
    const options = aggregateBombFormulaOptions({
      customAbilities,
      classNames: ["Alchemist"],
    })
    expect(options.map((row) => row.name)).toEqual(["Acid Bomb"])
  })
})

describe("Alchemist craftable items and held cap", () => {
  it("parses potion tables from prose", () => {
    const items = parseCraftableItemsTable(`
Healing Potion | 1 | 1
Antitoxin | 2 | 3
    `)
    expect(items).toContainEqual({
      itemName: "Healing Potion",
      resourceCost: 1,
      unlocksAtClassLevel: 1,
      category: "Potion",
    })
    expect(items).toContainEqual({
      itemName: "Antitoxin",
      resourceCost: 2,
      unlocksAtClassLevel: 3,
      category: "Potion",
    })
  })

  it("imports potions table onto Brew Potions feature", () => {
    const enriched = enrichAlchemistFeatures({
      classes: [
        {
          name: "Alchemist",
          description: "",
          hit_die: 8,
          primary_ability: ["Intelligence"],
          features: [
            {
              level: 1,
              name: "Potions",
              description:
                "You can brew the following potions at the Alchemist levels given.\nHealing Potion | 1 | 1",
            },
          ],
        },
      ],
    } as unknown as ImportContent)
    const feature = enriched.classes?.[0]?.features?.[0] as unknown as import("@/lib/types").Feature | undefined
    const chars = (feature?.linkedModifiers ?? []).flatMap(
      (mod: import("@/lib/compendium/linked-modifiers").LinkedModifierInstance) =>
        mod.characteristics ?? [],
    )
    expect(chars.some((char) => char.type === "craftable_items")).toBe(true)
  })

  it("stacks Batch Brewing +2 on held potion cap", () => {
    const enriched = enrichAlchemistFeatures({
      import_proposals: {
        custom_abilities: [
          {
            proposal_id: "batch_brewing",
            name: "Batch Brewing",
            definition: "Hold more potions.",
            description: "You can hold two additional potions.",
            source_type: "class",
            source_name: "Alchemist",
            level_requirement: 5,
            ability_role: "discovery",
          },
        ],
      },
    } as unknown as ImportContent)
    const discovery = enriched.import_proposals?.custom_abilities?.[0] as Record<string, unknown>
    const chars = ((discovery.linkedModifiers as { characteristics?: unknown[] }[]) ?? []).flatMap(
      (mod) => mod.characteristics ?? [],
    )
    const aggregated = aggregateCharacteristics(chars as never[])
    expect(aggregated.heldItemsCapBonus).toBe(2)
    expect(
      resolveHeldItemsCap(aggregated, {
        strength: 0,
        dexterity: 0,
        constitution: 0,
        intelligence: 3,
        wisdom: 0,
        charisma: 0,
      }),
    ).toBe(5)
  })
})

describe("Alchemist Reagent Synthesis recharge", () => {
  it("adds INT-mod short rest recharge capped once per long rest", () => {
    const enriched = enrichAlchemistFeatures({
      import_proposals: {
        class_resources: [
          {
            proposal_id: "reagents",
            class_name: "Alchemist",
            resource_key: "reagents",
            name: "Reagents",
            definition: "Level-scaled reagents.",
            uses: {
              type: "at_level",
              atLevelMode: "multiply_level",
              atLevelTable: [{ level: 1, count: 2 }],
              recharges: [{ rest: "long_rest" }],
            },
          },
        ],
      },
    } as unknown as ImportContent)
    const resource = enriched.import_proposals?.class_resources?.[0]
    expect(resource?.uses.recharges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rest: "short_rest",
          amountFormula: "ability_modifier",
          amountFormulaAbility: "INT",
          maxPerLongRest: 1,
        }),
      ]),
    )
    expect(
      resolveRechargeRuleAmount(
        {
          rest: "short_rest",
          amountFormula: "ability_modifier",
          amountFormulaAbility: "INT",
        },
        5,
        { int: 3 },
      ),
    ).toBe(3)
  })
})

describe("Alchemist import proposals", () => {
  it("splits bomb formula options into one custom ability per formula", () => {
    const content = {
      import_proposals: { custom_abilities: [acidBombFormula] },
    }
    const proposals = collectImportProposals(content)
    expect(proposals.customAbilities.filter((row) => row.abilityRole === "bomb_formula")).toHaveLength(1)
    expect(proposals.customAbilities.find((row) => row.name === "Acid Bomb")?.abilityRole).toBe("bomb_formula")
  })
})

describe("Alchemist multiclass prerequisites", () => {
  it("allows proficiencies-only multiclass with empty prerequisites", () => {
    const parsed = parseMulticlassSection(
      "Multiclassing\nProficiencies Gained: Light armor, simple weapons, alchemist's supplies.",
    )
    expect(parsed?.multiclass_prerequisites).toEqual([])
    expect(parsed?.multiclass_proficiencies_gained.length).toBeGreaterThan(0)
  })
})

describe("enrichImportContentModifiers integration", () => {
  it("runs alchemist enrich after choice wiring", () => {
    const content = enrichImportContentModifiers({
      classes: [
        {
          name: "Alchemist",
          description: "",
          hit_die: 8,
          primary_ability: ["Intelligence"],
          features: [{ level: 2, name: "Bomb Formulas", description: "Swap on long rest." }],
        },
      ],
      import_proposals: { custom_abilities: [alchemistBombProposal] },
    } as unknown as ImportContent)
    expect(content.classes?.[0]?.features?.[0]?.choices?.optionsSource).toBe("class_bomb_formulas")
    const bomb = content.import_proposals?.custom_abilities?.[0] as Record<string, unknown>
    expect(bomb.ability_role).toBe("alchemist_bomb")
  })

  it("resolves bomb formula choices dynamically", () => {
    const feature = {
      level: 2,
      name: "Bomb Formulas",
      isChoice: true,
      choices: {
        category: "Bomb Formula",
        count: 1,
        options: [],
        resourceKey: "bomb_formulas_known",
        optionsSource: "class_bomb_formulas" as const,
      },
    }
    const options = resolveFeatureChoiceOptions(feature as unknown as import("@/lib/types").Feature, {
      customAbilities: [
        {
          id: "acid",
          name: "Acid Bomb",
          ability_role: "bomb_formula",
          attached_to_type: "class",
          attached_to_id: "Alchemist",
          source: "Alchemist",
        } as CustomAbility,
      ],
      featureChoicePicks: {},
      classNames: ["Alchemist"],
      classLevel: 2,
    })
    expect(options.map((row) => row.name)).toEqual(["Acid Bomb"])
  })
})
