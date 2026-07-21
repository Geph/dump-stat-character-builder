import type { EnrichmentPreset } from "@/lib/import/enrichment-presets/types"
import { createModifierInstanceId } from "@/lib/compendium/linked-modifiers"
import { characteristicCatalogRefId, effectCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { charInstance, fxInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import { blockedWhenConditionLimitation, requiresActiveToggleLimitation } from "@/lib/compendium/modifier-limitations"
import type { FeatureChoice } from "@/lib/types"

function baneWeaponOptions(): FeatureChoice["options"] {
  return [
    "Aberrations",
    "Celestials",
    "Dragons",
    "Elementals",
    "Fey",
    "Fiends",
    "Giants",
    "Undead",
  ].map((creatureType) => ({
    name: creatureType,
    description: `Extra 1d10 Force damage vs ${creatureType}.`,
    linkedModifiers: [
      charInstance(createModifierInstanceId(), characteristicCatalogRefId("damage_roll_modifiers"), [
        {
          id: modId(`bane_${creatureType.toLowerCase()}`),
          type: "damage_roll_modifiers",
          entries: [
            {
              bonus: 0,
              target: "all",
              customTarget: "1d10 Force",
              onlyVsCreatureTypes: [creatureType],
            },
          ],
          label: `Bane: +1d10 Force vs ${creatureType}`,
        },
      ]),
    ],
  }))
}

function weaponEnchantmentOptions(): FeatureChoice["options"] {
  return [
    {
      name: "Blessed",
      description: "Extra 1d4 Radiant (1d10 vs Fiend/Undead).",
      linkedModifiers: [
        charInstance(createModifierInstanceId(), characteristicCatalogRefId("damage_roll_modifiers"), [
          {
            id: modId("enchant_blessed"),
            type: "damage_roll_modifiers",
            entries: [
              { bonus: 0, target: "all", customTarget: "1d4 Radiant" },
              {
                bonus: 0,
                target: "all",
                customTarget: "1d10 Radiant (vs Fiend/Undead — prefer this die)",
                onlyVsCreatureTypes: ["Fiend", "Undead"],
              },
            ],
            label: "Weapon Enchantment: Blessed",
          },
        ]),
      ],
    },
    {
      name: "Elemental",
      description: "Extra 1d6 Acid/Cold/Fire/Lightning/Thunder (pick when applying).",
      linkedModifiers: [
        charInstance(createModifierInstanceId(), characteristicCatalogRefId("damage_roll_modifiers"), [
          {
            id: modId("enchant_elemental"),
            type: "damage_roll_modifiers",
            entries: [{ bonus: 0, target: "all", customTarget: "1d6 (chosen elemental)" }],
            label: "Weapon Enchantment: Elemental (+1d6 chosen type)",
          },
        ]),
      ],
    },
    {
      name: "Vampiric",
      description: "Extra 1d4 Necrotic; heal equal to that extra damage.",
      linkedModifiers: [
        charInstance(createModifierInstanceId(), characteristicCatalogRefId("damage_roll_modifiers"), [
          {
            id: modId("enchant_vampiric"),
            type: "damage_roll_modifiers",
            entries: [{ bonus: 0, target: "all", customTarget: "1d4 Necrotic" }],
            label: "Weapon Enchantment: Vampiric (+1d4 Necrotic; heal that amount)",
          },
        ]),
      ],
    },
    {
      name: "Venomous",
      description: "Extra 1d8 Poison.",
      linkedModifiers: [
        charInstance(createModifierInstanceId(), characteristicCatalogRefId("damage_roll_modifiers"), [
          {
            id: modId("enchant_venomous"),
            type: "damage_roll_modifiers",
            entries: [{ bonus: 0, target: "all", customTarget: "1d8 Poison" }],
            label: "Weapon Enchantment: Venomous",
          },
        ]),
      ],
    },
  ]
}

function armorEnchantmentOptions(): FeatureChoice["options"] {
  return [
    {
      name: "Adamantine",
      description: "Critical Hits against you become normal hits.",
    },
    {
      name: "Cloaking",
      description: "Hide as a Bonus Action; Advantage on Stealth for Hide in combat.",
      linkedModifiers: [
        fxInstance(createModifierInstanceId(), effectCatalogRefId("check_roll_modifier"), {
          effects: [
            {
              id: modId("enchant_cloaking"),
              kind: "check_roll_modifier",
              checkRollMode: "advantage",
              checkCategory: "skill",
              checkSkills: ["Stealth"],
              label: "Cloaking: Advantage on Stealth (Hide in combat)",
            },
          ],
        }),
      ],
    },
    {
      name: "Resistance",
      description: "Resistance to one of Acid/Cold/Fire/Lightning/Poison/Thunder.",
      linkedModifiers: [
        charInstance(createModifierInstanceId(), characteristicCatalogRefId("damage_resistance"), [
          {
            id: modId("enchant_resistance"),
            type: "damage_resistance",
            damageTypes: [],
            choiceCount: 1,
            choiceOptions: ["Acid", "Cold", "Fire", "Lightning", "Poison", "Thunder"],
            label: "Armor Enchantment: Resistance (pick type)",
          },
        ]),
      ],
    },
    {
      name: "Winged",
      description: "Bonus Action: Fly Speed equal to Speed until end of turn.",
    },
  ]
}

function customizeArmorOptions(): FeatureChoice["options"] {
  return [
    { name: "Cast-Off", description: "Doff this armor as a Utilize action." },
    {
      name: "Climbing",
      description: "Climb Speed equal to Speed.",
      linkedModifiers: [
        charInstance(createModifierInstanceId(), characteristicCatalogRefId("speed"), [
          {
            id: modId("armor_climbing"),
            type: "speed",
            speedType: "climb",
            mode: "equal_to_walk",
            value: 0,
            label: "Climbing armor: Climb Speed = Speed",
          },
        ]),
      ],
    },
    {
      name: "Diving",
      description: "Swim Speed equal to Speed; breathe underwater.",
      linkedModifiers: [
        charInstance(createModifierInstanceId(), characteristicCatalogRefId("speed"), [
          {
            id: modId("armor_diving"),
            type: "speed",
            speedType: "swim",
            mode: "equal_to_walk",
            value: 0,
            label: "Diving armor: Swim Speed = Speed",
          },
        ]),
      ],
    },
    { name: "Integrated", description: "Integrate a weapon or Shield into the armor." },
    { name: "Sleek", description: "No Stealth Disadvantage from this armor." },
  ]
}

/** Uses that scale with Masterwork Bonus (+1/+2/+3/+4) — own tracker, not a spend from the Class Cap. */
const MASTERWORK_SCALED_USES = {
  type: "at_level" as const,
  atLevelMode: "tier" as const,
  atLevelTable: [
    { level: 1, count: 1 },
    { level: 5, count: 2 },
    { level: 13, count: 3 },
    { level: 17, count: 4 },
  ],
}

export const CRAFTSMAN_PRESETS: EnrichmentPreset[] = [
  {
    id: "craftsman.class.expert_crafting",
    pack: "craftsman",
    target: "class_feature",
    match: { className: /craftsman/i, name: /^expert crafting$/i },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 2,
          useShareKey: "instant_crafting",
          recharges: [{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }],
        },
      },
      { op: "setActivation", activation: { action: true } },
      { op: "setSheetDisplay", sheetDisplay: { abilitiesActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Uses tracker is Instant Crafting (2; regain 1 on Short Rest / all on Long Rest). Overnight Crafting and Crafting Tools stay narrative on the Features tab.",
      },
    ],
  },
  {
    id: "craftsman.class.masterwork_weapons",
    pack: "craftsman",
    target: "class_feature",
    match: { className: /craftsman/i, name: /^masterwork weapons$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "masterwork_weapons",
          catalogRefId: "cat_char_attack_roll_modifiers",
          characteristics: [
            {
              id: "char_masterwork_attack",
              type: "attack_roll_modifiers",
              entries: [
                {
                  bonus: 0,
                  target: "all",
                  bonusFromClassResourceKey: "masterwork_bonus",
                  bonusClassResourceScale: "full",
                },
              ],
              label: "Masterwork weapon: +Masterwork Bonus to attack",
              limitations: [requiresActiveToggleLimitation("masterwork_weapon_active")],
            },
          ],
        },
        replaceCharacteristicTypes: ["attack_roll_modifiers"],
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "masterwork_weapons_damage",
          catalogRefId: "cat_char_damage_roll_modifiers",
          characteristics: [
            {
              id: "char_masterwork_damage",
              type: "damage_roll_modifiers",
              entries: [
                {
                  bonus: 0,
                  target: "all",
                  bonusFromClassResourceKey: "masterwork_bonus",
                  bonusClassResourceScale: "full",
                },
              ],
              label: "Masterwork weapon: +Masterwork Bonus to damage",
              limitations: [requiresActiveToggleLimitation("masterwork_weapon_active")],
            },
          ],
        },
        replaceCharacteristicTypes: ["damage_roll_modifiers"],
      },
      { op: "setSheetDisplay", sheetDisplay: { featuresTab: true, combatActions: true } },
      {
        op: "appendDescription",
        text: "Enable Masterwork weapon while attacking with your Masterwork weapon so +Masterwork Bonus applies to attack and damage. Second mastery property: pick on a Long Rest.",
      },
    ],
  },
  {
    id: "craftsman.class.masterwork_armor",
    pack: "craftsman",
    target: "class_feature",
    match: { className: /craftsman/i, name: /^masterwork armor$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "masterwork_armor",
          catalogRefId: "cat_char_ac",
          characteristics: [
            {
              id: "char_masterwork_armor_ac",
              type: "ac",
              mode: "flat_bonus",
              flatBonus: 0,
              flatBonusFromClassResourceKey: "masterwork_bonus",
              flatBonusClassResourceScale: "half_ceil",
              label: "Masterwork armor: +⌈Masterwork Bonus / 2⌉ AC",
              limitations: [requiresActiveToggleLimitation("masterwork_armor_active")],
            },
          ],
        },
        replaceCharacteristicTypes: ["ac"],
      },
      { op: "setSheetDisplay", sheetDisplay: { featuresTab: true } },
      {
        op: "appendDescription",
        text: "Enable Masterwork armor while wearing it. Shields use Armigers' Masterwork Shield, not this feature.",
      },
    ],
  },
  {
    id: "craftsman.class.customize_armor",
    pack: "craftsman",
    target: "class_feature",
    match: { className: /craftsman/i, name: /^customize armor$/i },
    operations: [
      {
        op: "setChoices",
        isChoice: true,
        choices: {
          category: "Armor Customization",
          count: 1,
          options: customizeArmorOptions(),
          swappableOnRest: true,
          swapRestType: "long",
        },
      },
    ],
  },
  {
    id: "craftsman.class.weapon_enchantment",
    pack: "craftsman",
    target: "class_feature",
    match: { className: /craftsman/i, name: /^weapon enchantment$/i },
    operations: [
      {
        op: "setChoices",
        isChoice: true,
        choices: {
          category: "Weapon Enchantment",
          count: 1,
          options: weaponEnchantmentOptions(),
          swappableOnRest: true,
          swapRestType: "long",
        },
      },
      {
        op: "appendDescription",
        text: "Improved Masterwork (17): each enchantment deals two extra dice instead of one — double the listed dice manually.",
      },
    ],
  },
  {
    id: "craftsman.class.armor_enchantment",
    pack: "craftsman",
    target: "class_feature",
    match: { className: /craftsman/i, name: /^armor enchantment$/i },
    operations: [
      {
        op: "setChoices",
        isChoice: true,
        choices: {
          category: "Armor Enchantment",
          count: 1,
          options: armorEnchantmentOptions(),
          swappableOnRest: true,
          swapRestType: "long",
        },
      },
      { op: "setActivation", activation: { bonusAction: true } },
      {
        op: "appendDescription",
        text: "Winged: BA Fly Speed = Speed until end of turn. Adamantine: crits vs you become normal hits (narrative).",
      },
    ],
  },
  {
    id: "craftsman.class.spellwrought_armor",
    pack: "craftsman",
    target: "class_feature",
    match: { className: /craftsman/i, name: /^spellwrought armor$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "fx_instance",
          idKey: "spellwrought_armor",
          catalogRefId: effectCatalogRefId("check_roll_modifier"),
          effects: [
            {
              id: modId("spellwrought_armor"),
              kind: "check_roll_modifier",
              checkRollMode: "bonus",
              checkCategory: "save",
              bonusConfig: {
                mode: "class_resource_count",
                classResourceKey: "masterwork_bonus",
              },
              label: "Spellwrought Armor: +Masterwork Bonus to saves",
              limitations: [requiresActiveToggleLimitation("masterwork_armor_active")],
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "Enable Masterwork armor while wearing it so +Masterwork Bonus applies to saving throws.",
      },
    ],
  },
  {
    id: "craftsman.class.magnum_opus",
    pack: "craftsman",
    target: "class_feature",
    match: { className: /craftsman/i, name: /^magnum opus$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { abilitiesActions: true, featuresTab: true } },
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 1,
          useShareKey: "magnum_opus",
          recharges: [],
        },
      },
      {
        op: "appendDescription",
        text: "Once: create a Very Rare or Legendary magic item. BA call item to hand/body while on the same plane. Free attunement that doesn't count against your limit.",
      },
    ],
  },
  {
    id: "craftsman.class.folded_steel",
    pack: "craftsman",
    target: "class_feature",
    match: { className: /craftsman/i, name: /^folded steel$/i },
    operations: [
      { op: "setSheetDisplay", sheetDisplay: { featuresTab: true } },
      {
        op: "appendDescription",
        text: "On a Long Rest: set Masterwork weapon damage type to Bludgeoning, Cold, Fire, Lightning, Piercing, or Slashing (can't break mastery prerequisites).",
      },
    ],
  },
  {
    id: "craftsman.class.fortify_arsenal",
    pack: "craftsman",
    target: "class_feature",
    match: { className: /craftsman/i, name: /^fortify arsenal$/i },
    operations: [
      { op: "setSheetDisplay", sheetDisplay: { featuresTab: true } },
      {
        op: "appendDescription",
        text: "10 minutes (during Short Rest): Hone Weapons (Adv until first damage) or Reinforce Armor (BPS Resistance until first BPS damage) for up to five items — track in play.",
      },
    ],
  },
  // --- Subclasses ---
  {
    id: "craftsman.subclass.armored_slam",
    pack: "craftsman",
    target: "subclass_feature",
    match: { subclassClassName: /craftsman/i, name: /^armored slam$/i },
    operations: [
      { op: "setActivation", activation: { action: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 2,
          useShareKey: "armored_slam",
          recharges: [{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }],
        },
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "armored_slam",
          catalogRefId: "cat_char_special_attack",
          characteristics: [
            {
              id: "char_armored_slam",
              type: "special_attack",
              attackName: "Armored Slam",
              attackProfile: "force_save",
              targetMode: "single",
              rangeFeet: 5,
              damageTypes: ["Bludgeoning"],
              damageDiceCount: 0,
              damageDieType: "d6",
              saveAbility: "STR",
              saveDCBase: 8,
              saveHalfDamage: true,
              label: "Replace one attack: STR save or take damage = your AC (half on success)",
            },
          ],
        },
        replaceCharacteristicTypes: ["special_attack"],
      },
      {
        op: "appendDescription",
        text: "Damage equals your Armor Class. Colossal Slam (14): +2d10 Force, Prone on fail; regain 1 use on Initiative.",
      },
    ],
  },
  {
    id: "craftsman.subclass.fortify",
    pack: "craftsman",
    target: "subclass_feature",
    match: { subclassClassName: /craftsman/i, name: /^fortify$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "setLimitedUses",
        uses: {
          ...MASTERWORK_SCALED_USES,
          useShareKey: "fortify",
          recharges: [{ rest: "long_rest" }],
        },
      },
      {
        op: "appendDescription",
        text: "BA until start of next turn: +STR or DEX mod to AC (min +1) and Resistance to all damage. Uses scale with Masterwork Bonus (own tracker, Long Rest).",
      },
    ],
  },
  {
    id: "craftsman.subclass.zeroed_sights",
    pack: "craftsman",
    target: "subclass_feature",
    match: { subclassClassName: /craftsman/i, name: /^zeroed sights$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "zeroed_sights",
          catalogRefId: "cat_char_attack_roll_modifiers",
          characteristics: [
            {
              id: "char_zeroed_sights",
              type: "attack_roll_modifiers",
              entries: [
                {
                  bonus: 0,
                  target: "ranged",
                  ignoreHalfCover: true,
                  treatThreeQuartersCoverAsHalf: true,
                },
              ],
              label: "Zeroed Sights: ignore Half and Three-Quarters Cover (Masterwork ranged)",
            },
          ],
        },
        replaceCharacteristicTypes: ["attack_roll_modifiers"],
      },
    ],
  },
  {
    id: "craftsman.subclass.bane_weapons",
    pack: "craftsman",
    target: "subclass_feature",
    match: { subclassClassName: /craftsman/i, name: /^bane weapons$/i },
    operations: [
      {
        op: "setChoices",
        isChoice: true,
        choices: {
          category: "Bane Creature Type",
          count: 1,
          options: baneWeaponOptions(),
          swappableOnRest: true,
          swapRestType: "long",
        },
      },
    ],
  },
  {
    id: "craftsman.subclass.danger_sense",
    pack: "craftsman",
    target: "subclass_feature",
    match: { subclassClassName: /craftsman/i, name: /^danger sense$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "fx_instance",
          idKey: "danger_sense",
          catalogRefId: effectCatalogRefId("check_roll_modifier"),
          effects: [
            {
              id: modId("danger_sense"),
              kind: "check_roll_modifier",
              checkRollMode: "advantage",
              checkCategory: "save",
              checkAbility: "Dexterity",
              limitations: [blockedWhenConditionLimitation("Incapacitated")],
              label: "Danger Sense: Advantage on DEX saves (not while Incapacitated)",
            },
          ],
        },
      },
    ],
  },
  {
    id: "craftsman.subclass.traps",
    pack: "craftsman",
    target: "subclass_feature",
    match: { subclassClassName: /craftsman/i, name: /^traps$/i },
    operations: [
      {
        op: "setChoices",
        isChoice: true,
        choices: {
          category: "Trap",
          count: 1,
          options: [],
          resourceKey: "traps_known",
          optionsSource: "class_upgrades",
        },
      },
      {
        op: "setLimitedUses",
        uses: {
          type: "at_level",
          atLevelMode: "multiply_level",
          atLevelTable: [{ level: 1, count: 1 }],
          useShareKey: "quick_deployment",
          recharges: [{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }],
        },
      },
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "appendDescription",
        text: "Quick Deployment BA uses = Craftsman level (tracker). Trap options come from Trappers' Guild custom_abilities (ability_role upgrade). Damage dice scale 2/3/4 at levels 5/11/17.",
      },
    ],
  },
  {
    id: "craftsman.subclass.power_cell",
    pack: "craftsman",
    target: "subclass_feature",
    match: { subclassClassName: /craftsman/i, name: /^power cell$/i },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "class_resource",
          classResourceKey: "charge_points",
          classResourceAmount: 1,
        },
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Charge Points pool = Craftsman level (import class_resources.charge_points). Shock: expend up to PB Charge Points for +1d6 Lightning each + INT. Lightning weapons: choose Lightning or normal type.",
      },
    ],
  },
  {
    id: "craftsman.subclass.static_charge",
    pack: "craftsman",
    target: "subclass_feature",
    match: { subclassClassName: /craftsman/i, name: /^static charge$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
    ],
  },
  {
    id: "craftsman.subclass.ball_lightning",
    pack: "craftsman",
    target: "subclass_feature",
    match: { subclassClassName: /craftsman/i, name: /^ball lightning$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "setLimitedUses",
        uses: {
          type: "class_resource",
          classResourceKey: "charge_points",
          classResourceAmount: 3,
        },
      },
    ],
  },
  {
    id: "craftsman.subclass.sever_connection",
    pack: "craftsman",
    target: "subclass_feature",
    match: { subclassClassName: /craftsman/i, name: /^sever connection$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "appendDescription",
        text: "Reaction on hit: end attunement to one magic item → +INT to AC until start of next turn; attunement slots −1 until rest.",
      },
    ],
  },
  {
    id: "craftsman.subclass.escape_plan",
    pack: "craftsman",
    target: "subclass_feature",
    match: { subclassClassName: /craftsman/i, name: /^escape plan$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "setLimitedUses",
        uses: {
          ...MASTERWORK_SCALED_USES,
          useShareKey: "escape_plan",
          recharges: [{ rest: "long_rest" }],
        },
      },
    ],
  },
  {
    id: "craftsman.subclass.defensive_disarm",
    pack: "craftsman",
    target: "subclass_feature",
    match: { subclassClassName: /craftsman/i, name: /^defensive disarm$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
    ],
  },
  {
    id: "craftsman.subclass.scorching_steel",
    pack: "craftsman",
    target: "subclass_feature",
    match: { subclassClassName: /craftsman/i, name: /^scorching steel$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
    ],
  },
  {
    id: "craftsman.subclass.ejector_seat",
    pack: "craftsman",
    target: "subclass_feature",
    match: { subclassClassName: /craftsman/i, name: /^ejector seat$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
    ],
  },
  {
    id: "craftsman.subclass.magitech_upgrade",
    pack: "craftsman",
    target: "subclass_feature",
    match: { subclassClassName: /craftsman/i, name: /^magitech upgrade$/i },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          ...MASTERWORK_SCALED_USES,
          useShareKey: "magitech_upgrade",
          recharges: [{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }],
        },
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "appendDescription",
        text: "Uses scale with Masterwork Bonus (own tracker; regain 1 on Short Rest / all on Long Rest).",
      },
    ],
  },
  {
    id: "craftsman.subclass.fire_burst",
    pack: "craftsman",
    target: "subclass_feature",
    match: { subclassClassName: /craftsman/i, name: /^fire burst$/i },
    operations: [
      { op: "setActivation", activation: { action: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "setLimitedUses",
        uses: {
          ...MASTERWORK_SCALED_USES,
          useShareKey: "fire_burst",
          recharges: [{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }],
        },
      },
      {
        op: "appendDescription",
        text: "Cast Fireball centered on yourself (no self damage). Uses scale with Masterwork Bonus.",
      },
    ],
  },
  {
    id: "craftsman.subclass.shining_steel",
    pack: "craftsman",
    target: "subclass_feature",
    match: { subclassClassName: /craftsman/i, name: /^shining steel$/i },
    operations: [
      { op: "setActivation", activation: { onInitiative: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
    ],
  },
  {
    id: "craftsman.subclass.arcane_strike",
    pack: "craftsman",
    target: "subclass_feature",
    match: { subclassClassName: /craftsman/i, name: /^arcane strike$/i },
    operations: [
      {
        op: "appendDescription",
        text: "When you Attack: replace one attack with a Wizard cantrip (action) or Magic action to use a magic item.",
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
    ],
  },
  // --- Proposal ability roles (upgrade picker) ---
  {
    id: "craftsman.proposal.trap_upgrade",
    pack: "craftsman",
    target: "proposal_ability",
    match: {
      sourceName: /trappers'? guild/i,
      name: /^(ball bearings|ballista trap|caltrops|hunting trap|razor wire|trigger bomb)$/i,
    },
    operations: [{ op: "setAbilityRole", role: "upgrade" }],
  },
  {
    id: "craftsman.proposal.mastery_property",
    pack: "craftsman",
    target: "proposal_ability",
    match: {
      sourceName: /craftsman/i,
      name: /^(bludgeon|mounted|parry|scatter|shift|sighted|tension|twinshot|explode|flurry|follow-through|jolt|numb|crush|daze|finisher|puncture|rake|automatic)$/i,
    },
    operations: [{ op: "setAbilityRole", role: "upgrade" }],
  },
]
