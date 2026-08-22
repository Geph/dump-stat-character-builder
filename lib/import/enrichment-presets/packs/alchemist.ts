import type { ContentSeed, EnrichmentPreset } from "@/lib/import/enrichment-presets/types"
import { REAGENTS_KEY } from "@/lib/import/enrichment-presets/builders"
import {
  retagAlchemistCustomAbility,
  sanitizeAlchemistFeatures,
} from "@/lib/compendium/alchemist-feature-wiring"
import { createModifierInstanceId } from "@/lib/compendium/linked-modifiers"
import { characteristicCatalogRefId, effectCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import { requiresActiveToggleLimitation } from "@/lib/compendium/modifier-limitations"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature, FeatureChoice } from "@/lib/types"

const SPELL_DYNAMOS_KEY = "spell_dynamos"

function bombFormulaRider(idKey: string, formulaName: string) {
  return {
    op: "attachNamedPreset" as const,
    preset: {
      kind: "char_instance" as const,
      idKey,
      catalogRefId: "cat_char_power_rider",
      characteristics: [
        {
          id: `char_${idKey}`,
          type: "power_rider",
          parentPowerNames: ["Bomb", "Bombs"],
          appliesToAttackVariants: ["attack"],
          selectable: true,
          alertSummary: `Add ${formulaName} to a regular (non-primed) Bomb attack.`,
        },
      ],
    },
    replaceCharacteristicTypes: ["special_attack", "power_rider"],
  }
}

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

function mutatedBloodOptions(): FeatureChoice["options"] {
  return (["strength", "dexterity", "constitution"] as const).map((ability) => {
    const label = ability.charAt(0).toUpperCase() + ability.slice(1)
    return {
      name: label,
      description: `+2 ${label} (max 22; 25 while a Mutagen applies to this score).`,
      linkedModifiers: [
        charInstance(createModifierInstanceId(), characteristicCatalogRefId("ability_scores"), [
          {
            id: modId(`mutated_blood_${ability}`),
            type: "ability_scores",
            mode: "fixed",
            bonuses: { [ability]: 2 },
            label: `Mutated Blood: +2 ${label}`,
          },
        ]),
      ],
    }
  })
}

function elementalOozeOptions(): FeatureChoice["options"] {
  return ["Acid", "Cold", "Fire", "Lightning", "Poison", "Thunder"].map((damageType) => ({
    name: damageType,
    description: `Bottled Ooze: Immunity to ${damageType}; heal for half when subjected to that damage.`,
  }))
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
      { op: "setActivation", activation: { action: true, noEconomyCost: true } },
      { op: "setSheetDisplay", sheetDisplay: { abilitiesActions: true, featuresTab: true } },
      {
        op: "parseCraftableItemsTable",
        idKey: "alchemist_potions_known",
        label: "Known potions",
        category: "Potion",
        resourceKey: REAGENTS_KEY,
        includeDistillOptions: true,
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
      name: /^(?!potion brewing$|potion mixologist$).+/i,
      description: /brew the following potions|craftable potions|potions table/i,
    },
    operations: [
      { op: "setActivation", activation: { action: true, noEconomyCost: true } },
      { op: "setSheetDisplay", sheetDisplay: { abilitiesActions: true, featuresTab: true } },
      {
        op: "parseCraftableItemsTable",
        idKey: "alchemist_potions_known",
        label: "Known potions",
        category: "Potion",
        descriptionGate: /brew the following potions|craftable potions|potions table|brew potions/i,
        resourceKey: REAGENTS_KEY,
        includeDistillOptions: true,
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
    // "Empowered Bomb" is the older printing's name for the same Reagent-spending rider.
    match: { className: /alchemist/i, name: /^(?:prime|empowered) bomb$/i },
    operations: [
      // Priming is a mode on Bombs (one primed attack per Attack action), not its own combat card.
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
              appliesToAttackVariants: ["primed"],
              alertSummary:
                "Once per Attack action: replace one Bomb attack with a Primed Bomb and spend Reagents (up to the Prime Bomb column) for +1d10 damage each.",
            },
          ],
        },
        replaceCharacteristicTypes: ["special_attack", "damage_roll_modifiers", "power_rider"],
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: false, featuresTab: true } },
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
      {
        op: "setSheetDisplay",
        sheetDisplay: { combatActions: true, abilitiesActions: false, featuresTab: true },
      },
      {
        op: "appendDescription",
        text: "Bonus Action: drink two potions at once with no unexpected mixing effects.",
      },
    ],
  },
  {
    id: "alchemist.class.reagent_synthesis",
    pack: "alchemist",
    target: "class_feature",
    match: {
      className: /alchemist/i,
      name: /reagent synthesis/i,
    },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "fx_instance",
          idKey: "alchemist_reagent_synthesis",
          catalogRefId: "cat_fx_class_resource",
          effects: [
            {
              id: "mod_alchemist_reagent_synthesis",
              kind: "class_resource",
              classResourceKey: "reagents",
              classResourceChange: "increase",
              classResourceAmountConfig: {
                mode: "ability_modifier",
                ability: "INT",
                minimum: 1,
              },
              resourceRefreshOnRest: "short_rest",
              resourceRefreshOncePerLongRest: true,
              label: "Reagent Synthesis",
            },
          ],
        },
        replaceCharacteristicTypes: [],
      },
    ],
  },
  {
    id: "alchemist.class.philosophers_stone",
    pack: "alchemist",
    target: "class_feature",
    match: { className: /alchemist/i, name: /^philosopher[’']?s stone$/i },
    operations: [
      { op: "setActivation", activation: { action: true, onInitiative: true } },
      {
        op: "setSheetDisplay",
        sheetDisplay: { abilitiesActions: true, featuresTab: true },
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "philosophers_stone_actions",
          catalogRefId: "cat_char_resource_ability_menu",
          characteristics: [
            {
              id: "char_philosophers_stone_actions",
              type: "resource_ability_menu",
              resourceKey: "",
              waiveResourceCost: true,
              options: [
                {
                  name: "Quick Brewing",
                  description: "Brew a potion as a Utilize action instead of taking 10 minutes.",
                  resourceCost: 0,
                  actionKind: "action",
                },
              ],
              label: "Philosopher's Stone actions",
            },
          ],
        },
        replaceCharacteristicTypes: ["resource_ability_menu"],
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
              icon: "nuclear-bomb",
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
    id: "alchemist.subclass.mutagens",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^mutagens$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "mutagens_menu",
          catalogRefId: "cat_char_resource_ability_menu",
          characteristics: [
            {
              id: "char_mutagens_menu",
              type: "resource_ability_menu",
              resourceKey: "",
              waiveResourceCost: true,
              options: [
                { name: "Strength Mutagen", resourceCost: 0 },
                { name: "Dexterity Mutagen", resourceCost: 0 },
                { name: "Constitution Mutagen", resourceCost: 0 },
              ],
              label: "Inject a Mutagen",
            },
          ],
        },
        replaceCharacteristicTypes: ["resource_ability_menu"],
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
    operations: [bombFormulaRider("pheromone_bomb_rider", "Pheromone Bomb")],
  },
  {
    id: "alchemist.subclass.painkiller_bomb",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^painkiller bomb/i },
    operations: [bombFormulaRider("painkiller_bomb_rider", "Painkiller Bomb")],
  },
  {
    id: "alchemist.subclass.black_powder_bomb",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^black powder bomb/i },
    operations: [bombFormulaRider("black_powder_bomb_rider", "Black Powder Bomb")],
  },
  {
    id: "alchemist.subclass.slime_bomb",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^slime bomb/i },
    operations: [bombFormulaRider("slime_bomb_rider", "Slime Bomb")],
  },
  {
    id: "alchemist.subclass.sleep_bomb",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^sleep bomb/i },
    operations: [bombFormulaRider("sleep_bomb_rider", "Sleep Bomb")],
  },
  {
    id: "alchemist.subclass.arcano_bomb",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^arcano bomb/i },
    operations: [bombFormulaRider("arcano_bomb_rider", "Arcano Bomb")],
  },
  {
    id: "alchemist.subclass.alchemical_romance",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^alchemical romance$/i },
    operations: [
      { op: "setActivation", activation: { action: true, noEconomyCost: true } },
      { op: "setSheetDisplay", sheetDisplay: { abilitiesActions: true } },
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
              parentPowerNames: ["Bomb", "Bombs"],
              appliesToAttackVariants: ["attack"],
              alertSummary:
                "When adding Pheromone Bomb: spend 1–4 Reagents for Dreamy Haze / Extended Charm / Ignore Immunity / Toxic Love.",
            },
          ],
        },
        replaceCharacteristicTypes: ["condition_immunity", "power_rider"],
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "alchemical_romance_menu",
          catalogRefId: "cat_char_resource_ability_menu",
          characteristics: [
            {
              id: "char_alchemical_romance_menu",
              type: "resource_ability_menu",
              resourceKey: REAGENTS_KEY,
              options: [
                {
                  name: "Spend 1 Reagent",
                  description: "Choose 1 Alchemical Romance benefit for this Pheromone Bomb.",
                  resourceCost: 1,
                },
                {
                  name: "Spend 2 Reagents",
                  description: "Choose 2 Alchemical Romance benefits for this Pheromone Bomb.",
                  resourceCost: 2,
                },
                {
                  name: "Spend 3 Reagents",
                  description: "Choose 3 Alchemical Romance benefits for this Pheromone Bomb.",
                  resourceCost: 3,
                },
                {
                  name: "Spend 4 Reagents",
                  description: "Choose all 4 Alchemical Romance benefits for this Pheromone Bomb.",
                  resourceCost: 4,
                },
              ],
              label: "Apply while using Pheromone Bomb (no separate Action)",
            },
          ],
        },
        replaceCharacteristicTypes: ["resource_ability_menu"],
      },
      {
        op: "appendDescription",
        text: "Sheet tracking button: using it spends the selected Reagents but does not represent a separate Action; apply the selected benefit as part of Pheromone Bomb.",
      },
    ],
  },
  // --- Tier 1: Apothecary / Venomsmith / Xenoalchemist / Mad Bomber stubs ---
  {
    id: "alchemist.subclass.self_medication",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^self[- ]?medication$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "fx_instance",
          idKey: "self_medication",
          catalogRefId: effectCatalogRefId("check_roll_modifier"),
          effects: [
            {
              id: modId("self_medication_saves"),
              kind: "check_roll_modifier",
              checkRollMode: "advantage",
              checkCategory: "save",
              label: "Self-Medication: Advantage on saves (after healing potion)",
              limitations: [requiresActiveToggleLimitation("self_medication_active")],
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "Sheet toggle: enable Self-Medication after you drink a healing potion (Advantage on saves until the end of your next turn).",
      },
    ],
  },
  {
    id: "alchemist.subclass.concentrated_healing",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^concentrated healing$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "concentrated_healing",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "char_concentrated_healing",
              type: "power_rider",
              parentPowerNames: ["Potion Brewing", "Potions", "Healing Potion", "Potion of Healing"],
              alertSummary:
                "Concentrated Healing: replace up to half the healing dice with their maximum.",
            },
          ],
        },
        replaceCharacteristicTypes: ["power_rider"],
      },
    ],
  },
  {
    id: "alchemist.subclass.alchemical_resurrection",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^alchemical resurrection$/i },
    operations: [
      { op: "setActivation", activation: { action: true, bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { abilitiesActions: true, featuresTab: true } },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "craftable_items_static",
          idKey: "alchemical_resurrection",
          label: "Alchemical Resurrection recipe",
          category: "Potion",
          items: [
            {
              itemName: "Potion of Resurrection",
              resourceCost: 0,
              unlocksAtClassLevel: 1,
              category: "Potion",
            },
          ],
        },
        skipIfCharacteristicTypes: ["craftable_items"],
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "alchemical_resurrection_actions",
          catalogRefId: "cat_char_resource_ability_menu",
          characteristics: [
            {
              id: "char_alchemical_resurrection_actions",
              type: "resource_ability_menu",
              resourceKey: "",
              waiveResourceCost: true,
              options: [
                {
                  name: "Create Potion of Resurrection",
                  description:
                    "Magic action: use 1,000+ GP diamond dust and a Superior or Supreme Healing potion.",
                  resourceCost: 0,
                  actionKind: "action",
                },
                {
                  name: "Administer Potion of Resurrection",
                  description: "Administer the crafted potion as a Bonus Action.",
                  resourceCost: 0,
                  actionKind: "bonus",
                },
              ],
              label: "Potion of Resurrection",
            },
          ],
        },
        replaceCharacteristicTypes: ["resource_ability_menu"],
      },
      {
        op: "appendDescription",
        text: "Magic action: mix diamond dust worth 1,000 GP+ into a Potion of Superior or Supreme Healing to create a Potion of Resurrection (does not become inert after 24 hours).",
      },
    ],
  },
  {
    id: "alchemist.subclass.alchemical_assassin",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^alchemical assassin$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "fx_instance",
          idKey: "alchemical_assassin",
          catalogRefId: effectCatalogRefId("check_roll_modifier"),
          effects: [
            {
              id: modId("alchemical_assassin_conceal"),
              kind: "check_roll_modifier",
              checkRollMode: "advantage",
              checkCategory: "skill",
              checkSkills: ["Sleight of Hand", "Stealth"],
              label: "Alchemical Assassin: Advantage to conceal/use the poison ring",
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "Bonus Action: deal 1 Piercing damage to a creature within 5 ft, subjecting it to contact and injury poisons on the ring.",
      },
    ],
  },
  {
    id: "alchemist.subclass.toxic_recompense",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^toxic recompense$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "toxic_recompense",
          catalogRefId: "cat_char_special_attack",
          characteristics: [
            {
              id: "char_toxic_recompense",
              type: "special_attack",
              attackName: "Toxic Recompense",
              icon: "poison-cloud",
              attackProfile: "force_save",
              attackVariant: "explode",
              targetMode: "single",
              rangeFeet: 5,
              damageTypes: ["Poison"],
              damageDiceCount: 1,
              damageDieType: "d10",
              saveAbility: "CON",
              saveDCBase: 8,
              label:
                "Reaction (melee hit): CON save vs Alchemist DC or Poisoned 1 min; 1d10 Poison at start of turns (repeat save ends)",
            },
          ],
        },
        replaceCharacteristicTypes: ["special_attack"],
      },
    ],
  },
  {
    id: "alchemist.subclass.beguiling_perfume",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^beguiling perfume$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "appendDescription",
        text: "Reaction: when an enemy within 5 ft attacks you, WIS save vs Alchemist DC or choose a new target / lose the attack. Immune 1 hour after taking damage from you.",
      },
    ],
  },
  {
    id: "alchemist.subclass.surgical_strike",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^surgical strike$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 1,
          useShareKey: "surgical_strike",
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
        },
      },
      {
        op: "appendDescription",
        text: "Bonus Action Study: learn creature type; DC 15 INT check (Examine Specimen table). On success learn AC, Immunities, Resistances, or Bloodied. Per creature kind until rest — tracker is 1/rest as a reminder.",
      },
    ],
  },
  {
    id: "alchemist.subclass.overloaded_charge",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^overloaded charge$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "overloaded_charge",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "char_overloaded_charge",
              type: "power_rider",
              parentPowerNames: ["Bomb", "Bombs"],
              appliesToAttackVariants: ["primed"],
              alertSummary:
                "Overloaded Charge: spend PB Reagents to empower → gain +2 Reagents you may spend immediately (can exceed max).",
            },
          ],
        },
        replaceCharacteristicTypes: ["power_rider"],
      },
    ],
  },
  {
    id: "alchemist.subclass.bottled_oozes",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^bottled oozes?$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "bottled_oozes_menu",
          catalogRefId: "cat_char_resource_ability_menu",
          characteristics: [
            {
              id: "char_bottled_oozes_menu",
              type: "resource_ability_menu",
              resourceKey: REAGENTS_KEY,
              options: [
                {
                  name: "Bottled Ooze (Gray Ooze)",
                  description: "Brew a Gray Ooze bottle, then throw it as a Bonus Action.",
                  resourceCost: 2,
                  unlocksAtLevel: 6,
                },
                {
                  name: "Bottled Ooze (Ochre Jelly)",
                  description: "Brew an Ochre Jelly bottle, then throw it as a Bonus Action.",
                  resourceCost: 4,
                  unlocksAtLevel: 9,
                },
                {
                  name: "Bottled Ooze (Gelatinous Cube)",
                  description: "Brew a Gelatinous Cube bottle, then throw it as a Bonus Action.",
                  resourceCost: 4,
                  unlocksAtLevel: 9,
                },
                {
                  name: "Bottled Ooze (Black Pudding)",
                  description: "Brew a Black Pudding bottle, then throw it as a Bonus Action.",
                  resourceCost: 6,
                  unlocksAtLevel: 13,
                },
              ],
              label: "Brew and throw a Bottled Ooze",
            },
          ],
        },
        replaceCharacteristicTypes: ["resource_ability_menu"],
      },
    ],
  },
  {
    id: "alchemist.subclass.restoring_the_golem",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^restoring the golem$/i },
    operations: [
      { op: "setActivation", activation: { action: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
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
        text: "Magic action, 1 Reagent: restore your golem as described by the feature.",
      },
    ],
  },
  {
    id: "alchemist.subclass.its_alive",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^it[’']?s alive!?$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Bonus Action: direct your golem.",
      },
    ],
  },
  {
    id: "alchemist.subclass.arcane_recycler",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^arcane recycler$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 1,
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
        },
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "arcane_recycler_menu",
          catalogRefId: "cat_char_resource_ability_menu",
          characteristics: [
            {
              id: "char_arcane_recycler_menu",
              type: "resource_ability_menu",
              resourceKey: SPELL_DYNAMOS_KEY,
              options: [
                {
                  name: "Capture triggering spell",
                  description: "Restore one expended Spell Dynamo by capturing the triggering spell.",
                  resourceCost: -1,
                  actionKind: "reaction",
                },
              ],
              label: "Arcane Recycler",
            },
          ],
        },
        replaceCharacteristicTypes: ["resource_ability_menu"],
      },
      {
        op: "appendDescription",
        text: "Reaction when targeted by a spell: capture it in an expended Spell Dynamo as described by the feature.",
      },
    ],
  },
  {
    id: "alchemist.subclass.sacrificial_slime",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^sacrificial slime$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "setLimitedUses",
        uses: {
          type: "ability_modifier",
          abilityModifier: "INT",
          recharges: [{ rest: "long_rest" }],
        },
      },
      {
        op: "appendDescription",
        text: "Reaction: have an allied Ooze intercept the triggering attack.",
      },
    ],
  },
  // --- Tier 2: Mutagenist / Dynamo / Mad Bomber / Ooze Rancher ---
  {
    id: "alchemist.subclass.mutated_blood",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^mutated blood$/i },
    operations: [
      {
        op: "setChoices",
        isChoice: true,
        choices: {
          category: "Mutated Blood",
          count: 1,
          options: mutatedBloodOptions(),
          swappableOnRest: true,
          swapRestType: "long",
        },
      },
      {
        op: "appendDescription",
        text: "Chosen score max increases to 22 (25 while a Mutagen applies to that score). Track the raised maximum manually — sheet applies the +2 only.",
      },
    ],
  },
  {
    id: "alchemist.subclass.counter_discharge",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^counter[- ]?discharge$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "setLimitedUses",
        uses: {
          type: "class_resource",
          classResourceKey: SPELL_DYNAMOS_KEY,
          classResourceAmount: 1,
        },
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "fx_instance",
          idKey: "counter_discharge_saves",
          catalogRefId: effectCatalogRefId("check_roll_modifier"),
          effects: [
            {
              id: modId("counter_discharge_saves"),
              kind: "check_roll_modifier",
              checkRollMode: "advantage",
              checkCategory: "save",
              label: "Counter-Discharge: Advantage on saves vs this spell",
              limitations: [requiresActiveToggleLimitation("counter_discharge_active")],
            },
          ],
        },
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "counter_discharge_resist",
          catalogRefId: "cat_char_damage_resistance",
          characteristics: [
            {
              id: "char_counter_discharge_resist",
              type: "damage_resistance",
              damageTypes: ["Spells"],
              label: "Counter-Discharge: Resistance to that spell's damage",
              requiresSheetToggle: "counter_discharge_active",
            },
          ],
        },
        replaceCharacteristicTypes: ["damage_resistance"],
      },
      {
        op: "appendDescription",
        text: "Reaction (spell affecting you within 60 ft): spend 1 Spell Dynamo. Flip Counter-Discharge while resolving the spell for save Advantage + spell-damage Resistance.",
      },
    ],
  },
  {
    id: "alchemist.subclass.elemental_oozes",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^elemental oozes$/i },
    operations: [
      {
        op: "setChoices",
        isChoice: true,
        choices: {
          category: "Elemental Ooze damage type",
          count: 1,
          options: elementalOozeOptions(),
          swappableOnRest: true,
          swapRestType: "long",
        },
      },
      {
        op: "appendDescription",
        text: "When you create a Bottled Ooze, pick its Elemental type (Immunity + heal half). Re-pick on a Long Rest as a reminder of your preferred default — apply at create time.",
      },
    ],
  },
  {
    id: "alchemist.subclass.timed_demolition",
    pack: "alchemist",
    target: "subclass_feature",
    match: { subclassClassName: /alchemist/i, name: /^timed demolition$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "timed_demolition",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "char_timed_demolition",
              type: "power_rider",
              parentPowerNames: ["Bomb", "Bombs"],
              appliesToAttackVariants: ["primed"],
              selectable: true,
              alertSummary:
                "When you prime a Bomb: set a delay (rounds up to 10 min); it Explodes at the end of your turn after that duration. Overlapping blasts: one Bomb of your choice.",
            },
          ],
        },
        replaceCharacteristicTypes: ["power_rider"],
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
    // Throwing a Bomb is free — Alchemist's Supplies make as many as the day needs. Reagents are
    // spent to prime it, which the sheet exposes as the special_attack's resourceScaleKey rider.
    operations: [
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
        op: "attachNamedPreset",
        preset: { kind: "alchemist_bomb" },
      },
    ],
  },
  {
    id: "alchemist.proposal.bomb_formula_upgrade_retag",
    pack: "alchemist",
    target: "proposal_ability",
    match: {
      sourceName: /alchemist/i,
      name: /^(?!bombs?$).*\bbomb\b/i,
      abilityRole: "upgrade",
    },
    operations: [{ op: "setAbilityRole", role: "bomb_formula" }],
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
    id: "alchemist.proposal.discovery_upgrade_retag",
    pack: "alchemist",
    target: "proposal_ability",
    match: {
      sourceName: /alchemist/i,
      abilityRole: "upgrade",
      name: /^(?!.*\bbomb\b).+/i,
    },
    operations: [{ op: "setAbilityRole", role: "discovery" }],
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

function isAlchemistContent(content: ImportContent): boolean {
  return (content.classes ?? []).some((cls) => /alchemist/i.test(cls.name ?? ""))
}

export function sanitizeAlchemistImportContent(content: ImportContent): ImportContent {
  if (!isAlchemistContent(content)) return content

  const classes = (content.classes ?? []).map((cls) => {
    if (!/alchemist/i.test(cls.name ?? "")) return cls
    return {
      ...cls,
      features: sanitizeAlchemistFeatures(
        (cls.features ?? []) as Feature[],
      ) as typeof cls.features,
    }
  })

  const abilities = Array.isArray(content.abilities)
    ? content.abilities.map((ability) => retagAlchemistCustomAbility(ability))
    : content.abilities

  const customAbilities = content.import_proposals?.custom_abilities?.map((ability) =>
    retagAlchemistCustomAbility(ability),
  )

  return {
    ...content,
    classes,
    ...(abilities ? { abilities } : {}),
    ...(customAbilities
      ? {
          import_proposals: {
            ...content.import_proposals,
            custom_abilities: customAbilities,
          },
        }
      : {}),
  }
}
