import type { ContentSeed, EnrichmentPreset } from "@/lib/import/enrichment-presets/types"
import { REAGENTS_KEY } from "@/lib/import/enrichment-presets/builders"

export const ALCHEMIST_PRESETS: EnrichmentPreset[] = [
  {
    id: "alchemist.class.potions_table",
    pack: "alchemist",
    target: "class_feature",
    match: {
      className: /alchemist/i,
      description: /brew the following potions|craftable potions/i,
    },
    operations: [
      {
        op: "parseCraftableItemsTable",
        idKey: "alchemist_potions_known",
        label: "Known potions",
        category: "Potion",
        descriptionGate: /brew the following potions|craftable potions/i,
      },
    ],
  },
  {
    id: "alchemist.class.held_items",
    pack: "alchemist",
    target: "class_feature",
    match: {
      className: /alchemist/i,
      name: /held potions|held items/i,
    },
    skipIfCharacteristicTypes: ["held_items_cap"],
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "held_items_cap",
          idKey: "alchemist_held_cap",
          baseAbility: "intelligence",
          flatBonus: 0,
          label: "Held potions cap (INT mod)",
        },
      },
    ],
  },
  {
    id: "alchemist.class.reagent_synthesis_note",
    pack: "alchemist",
    target: "class_feature",
    match: {
      className: /alchemist/i,
      name: /reagent synthesis/i,
    },
    operations: [
      {
        op: "appendDescription",
        text: "On a Short Rest, regain Reagents equal to your Intelligence modifier (once per Long Rest).",
      },
    ],
  },
  {
    id: "alchemist.proposal.bomb_role_only",
    pack: "alchemist",
    target: "proposal_ability",
    match: {
      sourceName: /alchemist/i,
      name: /^bomb$/i,
    },
    operations: [{ op: "setAbilityRole", role: "alchemist_bomb" }],
  },
  {
    id: "alchemist.proposal.bomb_attach",
    pack: "alchemist",
    target: "proposal_ability",
    match: {
      sourceName: /alchemist/i,
      name: /^bomb$/i,
    },
    skipIfCharacteristicTypes: ["special_attack"],
    operations: [
      {
        op: "setUses",
        uses: {
          type: "class_resource",
          classResourceKey: REAGENTS_KEY,
          classResourceAmount: 1,
        },
      },
      {
        op: "attachNamedPreset",
        preset: { kind: "alchemist_bomb" },
      },
    ],
  },
  {
    id: "alchemist.proposal.bomb_role_field",
    pack: "alchemist",
    target: "proposal_ability",
    match: {
      sourceName: /alchemist/i,
      abilityRole: "alchemist_bomb",
    },
    operations: [{ op: "setAbilityRole", role: "alchemist_bomb" }],
  },
  {
    id: "alchemist.proposal.bomb_role_attach",
    pack: "alchemist",
    target: "proposal_ability",
    match: {
      sourceName: /alchemist/i,
      abilityRole: "alchemist_bomb",
    },
    skipIfCharacteristicTypes: ["special_attack"],
    operations: [
      {
        op: "setUses",
        uses: {
          type: "class_resource",
          classResourceKey: REAGENTS_KEY,
          classResourceAmount: 1,
        },
      },
      {
        op: "attachNamedPreset",
        preset: { kind: "alchemist_bomb" },
      },
    ],
  },
  {
    id: "alchemist.proposal.bomb_formula_name",
    pack: "alchemist",
    target: "proposal_ability",
    match: {
      sourceName: /alchemist/i,
      name: /\bbomb formula\b/i,
    },
    skipIfCharacteristicTypes: ["special_attack"],
    operations: [
      { op: "setAbilityRole", role: "bomb_formula" },
      {
        op: "attachNamedPreset",
        preset: { kind: "alchemist_bomb_formula_from_name" },
      },
    ],
  },
  {
    id: "alchemist.proposal.bomb_formula_role",
    pack: "alchemist",
    target: "proposal_ability",
    match: {
      sourceName: /alchemist/i,
      abilityRole: "bomb_formula",
    },
    skipIfCharacteristicTypes: ["special_attack"],
    operations: [
      { op: "setAbilityRole", role: "bomb_formula" },
      {
        op: "attachNamedPreset",
        preset: { kind: "alchemist_bomb_formula_from_name" },
      },
    ],
  },
  {
    id: "alchemist.proposal.discovery_batch_brewing",
    pack: "alchemist",
    target: "proposal_ability",
    match: {
      sourceName: /alchemist/i,
      name: /batch brewing/i,
    },
    operations: [
      { op: "setAbilityRole", role: "discovery" },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "held_items_cap",
          idKey: "batch_brewing_cap",
          flatBonus: 2,
          baseAbility: "intelligence",
          label: "Batch Brewing +2 held potions",
        },
      },
    ],
  },
  {
    id: "alchemist.proposal.discovery_double_dose",
    pack: "alchemist",
    target: "proposal_ability",
    match: {
      sourceName: /alchemist/i,
      name: /double dose/i,
    },
    operations: [
      { op: "setAbilityRole", role: "discovery" },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "craftable_items_static",
          idKey: "double_dose_healing",
          label: "Healing potions have two doses",
          category: "Potion",
          items: [
            {
              itemName: "Healing Potion",
              resourceCost: 1,
              unlocksAtClassLevel: 1,
              usesPerItem: 2,
              category: "Potion",
            },
          ],
        },
      },
    ],
  },
  {
    id: "alchemist.proposal.discovery_homunculus",
    pack: "alchemist",
    target: "proposal_ability",
    match: {
      sourceName: /alchemist/i,
      name: /homunculus/i,
    },
    operations: [
      { op: "setAbilityRole", role: "discovery" },
      { op: "parseCompanionStatBlock" },
    ],
  },
  {
    id: "alchemist.proposal.discovery_brewing_uses",
    pack: "alchemist",
    target: "proposal_ability",
    match: {
      sourceName: /alchemist/i,
      name: /discovery|homunculus|batch brewing|double dose|alchemy of/i,
      description: /restricted reagents?|brewing only/i,
    },
    operations: [
      { op: "setAbilityRole", role: "discovery" },
      {
        op: "setUses",
        uses: {
          type: "class_resource",
          classResourceKey: REAGENTS_KEY,
          spendPurpose: "brewing",
        },
      },
    ],
  },
  {
    id: "alchemist.resource.reagents_recharge",
    pack: "alchemist",
    target: "class_resource",
    match: {
      className: /alchemist/i,
      resourceKey: REAGENTS_KEY,
    },
    operations: [{ op: "ensureResourceRecharges", synthesisAbility: "INT", ensureLongRest: true }],
  },
]

export const ALCHEMIST_SEEDS: ContentSeed[] = []
