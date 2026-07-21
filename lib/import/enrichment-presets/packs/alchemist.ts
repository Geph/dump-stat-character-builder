import type { ContentSeed, EnrichmentPreset } from "@/lib/import/enrichment-presets/types"
import { REAGENTS_KEY } from "@/lib/import/enrichment-presets/builders"

function grantNamedAbility(
  abilityName: string,
  idKey: string,
  replaceExtra: string[] = [],
) {
  return {
    op: "attachNamedPreset" as const,
    preset: {
      kind: "char_instance" as const,
      idKey,
      catalogRefId: "cat_char_grant_custom_ability",
      characteristics: [
        {
          id: `char_${idKey}`,
          type: "grant_custom_ability",
          abilityNames: [abilityName],
          label: `Gain ${abilityName}`,
        },
      ],
    },
    replaceCharacteristicTypes: ["grant_custom_ability", ...replaceExtra],
  }
}

export const ALCHEMIST_PRESETS: EnrichmentPreset[] = [
  {
    id: "alchemist.class.bombs",
    pack: "alchemist",
    target: "class_feature",
    match: { className: /alchemist/i, name: /^bombs$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: { kind: "alchemist_bomb" },
        replaceCharacteristicTypes: ["special_attack", "attack_roll_modifiers", "damage_roll_modifiers"],
      },
      {
        op: "appendDescription",
        text: "Intelligent Explosions: when using Explode, add your Intelligence modifier (minimum +1) to the damage roll. Alchemist Save DC = 8 + INT + PB (optional override for Explode).",
      },
    ],
  },
  {
    id: "alchemist.class.potion_brewing",
    pack: "alchemist",
    target: "class_feature",
    match: {
      className: /alchemist/i,
      name: /^potion brewing$/i,
    },
    operations: [
      {
        op: "parseCraftableItemsTable",
        idKey: "alchemist_potions_known",
        label: "Known potions",
        category: "Potion",
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "held_items_cap",
          idKey: "alchemist_held_cap",
          baseAbility: "intelligence",
          flatBonus: 0,
          label: "Brewed potions cap (INT mod, min 1)",
        },
        skipIfCharacteristicTypes: ["held_items_cap"],
      },
    ],
  },
  {
    id: "alchemist.class.potions_table",
    pack: "alchemist",
    target: "class_feature",
    match: {
      className: /alchemist/i,
      description: /brew the following potions|craftable potions|potions table/i,
    },
    operations: [
      {
        op: "parseCraftableItemsTable",
        idKey: "alchemist_potions_known",
        label: "Known potions",
        category: "Potion",
        descriptionGate: /brew the following potions|craftable potions|potions table|brew potions/i,
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
    id: "alchemist.class.prime_bomb",
    pack: "alchemist",
    target: "class_feature",
    match: { className: /alchemist/i, name: /^prime bomb$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "prime_bomb_rider",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "char_prime_bomb_rider",
              type: "power_rider",
              parentPowerNames: ["Bomb", "Bombs"],
              alertSummary:
                "Once/turn: spend Reagents (up to Prime Bomb column) for +1d10 each; Explode radius +5 ft per Reagent.",
            },
          ],
        },
        replaceCharacteristicTypes: ["damage_roll_modifiers", "power_rider"],
      },
    ],
  },
  {
    id: "alchemist.class.improved_bombs",
    pack: "alchemist",
    target: "class_feature",
    match: { className: /alchemist/i, name: /^improved bombs$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Bomb damage dice scale on the Bomb / special_attack damageByLevel table (2d10 at 5, 3d10 at 11, 4d10 at 17).",
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "improved_bombs_rider",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "char_improved_bombs_rider",
              type: "power_rider",
              parentPowerNames: ["Bomb", "Bombs"],
              alertSummary: "Once/turn: improve Bomb damage dice per the Bomb Damage table.",
            },
          ],
        },
        replaceCharacteristicTypes: ["power_rider"],
      },
    ],
  },
  {
    id: "alchemist.class.blast_coating",
    pack: "alchemist",
    target: "class_feature",
    match: { className: /alchemist/i, name: /^blast coating$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "blast_coating",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "char_blast_coating",
              type: "power_rider",
              parentPowerNames: ["Bomb", "Bombs"],
              alertSummary:
                "You automatically succeed on saves vs your own Bombs and take no damage from them.",
            },
          ],
        },
        replaceCharacteristicTypes: ["power_rider"],
      },
    ],
  },
  {
    id: "alchemist.class.potion_mixologist",
    pack: "alchemist",
    target: "class_feature",
    match: { className: /alchemist/i, name: /^potion mixologist$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { abilitiesActions: true } },
      {
        op: "appendDescription",
        text: "Bonus Action: drink two potions at once with no unexpected mixing effects.",
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
    id: "alchemist.class.philosophers_stone",
    pack: "alchemist",
    target: "class_feature",
    match: { className: /alchemist/i, name: /^philosopher[’']?s stone$/i },
    operations: [
      { op: "setActivation", activation: { onInitiative: true } },
      {
        op: "setSheetDisplay",
        sheetDisplay: { combatActions: true, featuresTab: true },
      },
      {
        op: "appendDescription",
        text: "Regenerating Reagents: when you roll Initiative, if you have 5 or fewer Reagents, refill to 6 (fill-to-cap — track on the Reagents tracker). Quick Brewing: brew potions as a Utilize action.",
      },
    ],
  },
  {
    id: "alchemist.class.nuclear_bomb",
    pack: "alchemist",
    target: "class_feature",
    match: { className: /alchemist/i, name: /nuclear bomb/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "nuclear_bomb",
          catalogRefId: "cat_char_special_attack",
          characteristics: [
            {
              id: "char_nuclear_bomb",
              type: "special_attack",
              attackName: "Nuclear Bomb",
              attackProfile: "force_save",
              attackVariant: "explode",
              targetMode: "area",
              areaShape: "sphere",
              areaLengthFeet: 5280,
              properties: ["Destructible"],
              damageTypes: ["Force"],
              damageDiceCount: 10,
              damageDieType: "d10",
              saveAbility: "DEX",
              saveDCBase: 8,
              saveHalfDamage: true,
              label:
                "Destroy Philosopher's Stone: 10d10+100 Force, 1-mile Sphere (must Explode)",
            },
          ],
        },
        replaceCharacteristicTypes: ["special_attack"],
      },
      { op: "setActivation", activation: { action: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
    ],
  },
  {
    id: "alchemist.subclass.magnetic_personality",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^magnetic personality$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { abilitiesActions: true } },
      {
        op: "appendDescription",
        text: "Bonus Action: take the Influence action.",
      },
    ],
  },
  {
    id: "alchemist.subclass.blast_shield",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^blast shield$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "blast_shield",
          catalogRefId: "cat_char_damage_resistance",
          characteristics: [
            {
              id: "char_blast_shield",
              type: "damage_resistance",
              damageTypes: [],
              choiceCount: 1,
              choiceOptions: ["Acid", "Cold", "Fire", "Lightning", "Thunder"],
              label: "Blast Shield — pick one damage type each Short/Long Rest",
            },
          ],
        },
        replaceCharacteristicTypes: ["damage_resistance"],
      },
    ],
  },
  {
    id: "alchemist.subclass.mithridatism",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^mithridatism$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "mithridatism",
          catalogRefId: "cat_char_damage_immunity",
          characteristics: [
            {
              id: "char_mithridatism_damage",
              type: "damage_immunity",
              damageTypes: ["Poison"],
              label: "Immunity to Poison damage",
            },
          ],
        },
        replaceCharacteristicTypes: ["damage_immunity"],
      },
    ],
  },
  {
    id: "alchemist.subclass.shared_mutagen",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^shared mutagen$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "setLimitedUses",
        uses: {
          type: "class_resource",
          classResourceKey: REAGENTS_KEY,
          classResourceAmount: 1,
        },
      },
      {
        op: "appendDescription",
        text: "Bonus Action, 1 Reagent: inject an ally within 5 ft with a Mutagen. One Shared Mutagen at a time.",
      },
    ],
  },
  {
    id: "alchemist.subclass.poisoner",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^poisoner$/i },
    operations: [grantNamedAbility("Alchemy of Poison", "venomsmith_poisoner")],
  },
  {
    id: "alchemist.subclass.laughing_gas_bombs",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^laughing gas bombs$/i },
    operations: [grantNamedAbility("Laughing Gas Bomb", "venomsmith_laughing_gas")],
  },
  {
    id: "alchemist.subclass.pheromone_bomb",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^pheromone bomb/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: { kind: "alchemist_bomb_formula_from_name" },
        replaceCharacteristicTypes: ["special_attack", "condition_immunity", "damage_resistance"],
      },
    ],
  },
  {
    id: "alchemist.subclass.painkiller_bomb",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^painkiller bomb/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: { kind: "alchemist_bomb_formula_from_name" },
        replaceCharacteristicTypes: ["special_attack"],
        skipIfCharacteristicTypes: ["special_attack"],
      },
    ],
  },
  {
    id: "alchemist.subclass.black_powder_bomb",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^black powder bomb/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: { kind: "alchemist_bomb_formula_from_name" },
        replaceCharacteristicTypes: ["special_attack", "damage_resistance"],
      },
    ],
  },
  {
    id: "alchemist.subclass.slime_bomb",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^slime bomb/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: { kind: "alchemist_bomb_formula_from_name" },
        replaceCharacteristicTypes: ["special_attack"],
      },
    ],
  },
  {
    id: "alchemist.subclass.sleep_bomb",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^sleep bomb/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: { kind: "alchemist_bomb_formula_from_name" },
        replaceCharacteristicTypes: ["special_attack", "condition_immunity"],
      },
    ],
  },
  {
    id: "alchemist.subclass.arcano_bomb",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^arcano bomb/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: { kind: "alchemist_bomb_formula_from_name" },
        replaceCharacteristicTypes: ["special_attack"],
      },
    ],
  },
  {
    id: "alchemist.subclass.alchemical_romance",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^alchemical romance$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "alchemical_romance",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "char_alchemical_romance",
              type: "power_rider",
              parentPowerNames: ["Pheromone Bomb"],
              alertSummary:
                "Spend 1–4 Reagents for Dreamy Haze / Extended Charm / Ignore Immunity / Toxic Love.",
            },
          ],
        },
        replaceCharacteristicTypes: ["condition_immunity", "power_rider"],
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
