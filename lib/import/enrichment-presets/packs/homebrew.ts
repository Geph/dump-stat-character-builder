import type { ContentSeed, EnrichmentPreset } from "@/lib/import/enrichment-presets/types"
import {
  buildQuarryClassResource,
} from "@/lib/import/enrichment-presets/builders"
import { DND_SKILLS } from "@/lib/compendium/constants"
import { createModifierInstanceId } from "@/lib/compendium/linked-modifiers"
import { effectCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { fxInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import type { FeatureChoice } from "@/lib/types"

const DEFERRED_MECHANICS_NOTE =
  "Mechanic not fully modeled on sheet — see feature description (Dark Lurker check reduction)."

const RAMPAGE_DIE_DEFERRED_NOTE =
  "Rampage Die state is tracked manually: begin at d4, increase one die step after consecutive turns dealing damage (maximum d12), and reset to d4 after a turn without damage or when Incapacitated. Automatic die stepping and Tantrum's initiative/on-damage increases are not yet modeled."

function curiousMindSkillOptions(): FeatureChoice["options"] {
  return DND_SKILLS.map((skill) => ({
    name: skill,
    // Shared mechanic lives on the feature / picker hint — keep option cards name-only.
    description: "",
    linkedModifiers: [
      fxInstance(createModifierInstanceId(), effectCatalogRefId("check_roll_modifier"), {
        effects: [
          {
            id: modId(`curious_mind_${skill.toLowerCase()}`),
            kind: "check_roll_modifier",
            checkRollMode: "bonus",
            checkCategory: "skill",
            checkSkills: [skill],
            bonusConfig: {
              mode: "proficiency",
              multiplier: 0.5,
              bonusAppliesWhen: "non_proficient_skill_only",
            },
            label: `Curious Mind: +½ PB on ${skill}`,
          },
        ],
      }),
    ],
  }))
}

export const INVESTIGATOR_PRESETS: EnrichmentPreset[] = [
  {
    id: "investigator.class.finisher",
    pack: "investigator",
    target: "class_feature",
    match: { className: /investigator/i, name: /^finisher$/i },
    skipIfCharacteristicTypes: ["on_hit_trigger"],
    operations: [{ op: "attachNamedPreset", preset: { kind: "investigator_finisher" } }],
  },
  {
    id: "investigator.class.improved_finisher",
    pack: "investigator",
    target: "class_feature",
    match: { className: /investigator/i, name: /^improved finisher$/i },
    operations: [{ op: "attachNamedPreset", preset: { kind: "investigator_improved_finisher" } }],
  },
  {
    id: "investigator.class.holy_trinkets",
    pack: "investigator",
    target: "class_feature",
    match: { className: /investigator/i, name: /^holy trinkets$/i },
    operations: [
      { op: "clearLimitedUses" },
      {
        op: "appendDescription",
        text: "When matching trinket items are present in this import (recognized by name), Dump Stat wires them to spend from your shared Trinkets pool. Item text itself must come from your source — Dump Stat does not invent or store those entries.",
      },
    ],
  },
  {
    id: "investigator.class.rushed_incantation",
    pack: "investigator",
    target: "class_feature",
    match: { className: /investigator/i, name: /^rushed incantation$/i },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "class_resource",
          classResourceKey: "rushed_incantation",
          classResourceAmount: 1,
        },
      },
    ],
  },
  {
    id: "investigator.class.exploit_weakness",
    pack: "investigator",
    target: "class_feature",
    match: { className: /investigator/i, name: /^exploit weakness$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Resistance strip until start of your next turn is modeled; single-attack Vulnerability grant (non-doubling carve-out) remains descriptive.",
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "exploit_weakness_resist_strip",
          catalogRefId: "cat_char_damage_roll_modifiers",
          characteristics: [
            {
              id: "mod_exploit_weakness_resist_strip",
              type: "damage_roll_modifiers",
              entries: [{ bonus: 0, target: "all" }],
              label: "Target loses resistances until your next turn (track manually)",
            },
          ],
        },
      },
    ],
  },
  {
    id: "investigator.class.enigma_arcane",
    pack: "investigator",
    target: "class_feature",
    match: { className: /investigator/i, name: /^enigma arcane$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "innate_arcanum",
          tiers: [{ spellLevel: 6, classLevel: 17 }],
        },
      },
    ],
  },
  {
    id: "investigator.class.spellbinder",
    pack: "investigator",
    target: "class_feature",
    match: { className: /investigator/i, name: /^spellbinder$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Import review: chosen grimoire spells with free Rushed Incantation use — descriptive only (no subset cost-exemption primitive).",
      },
    ],
  },
]

export const INVESTIGATOR_SEEDS: ContentSeed[] = []

export const PSION_PRESETS: EnrichmentPreset[] = [
  {
    id: "psion.subclass.climactic_moment",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: "Climactic Moment" },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "special",
          specialDescription: "Influence points (INT mod cap, 1 min decay)",
          recharges: [{ kind: "real_time", mode: "decay", minutes: 1 }],
        },
      },
      { op: "attachNamedPreset", preset: { kind: "climactic_moment_influence" }, skipSyncRefs: true },
    ],
  },
  {
    id: "psion.subclass.shattered_husks",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: "Shattered Husks" },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 1,
          recharges: [
            {
              kind: "real_time",
              mode: "cooldown",
              minutes: 60,
              scope: "per_target",
              period: "rolling",
            },
          ],
        },
      },
    ],
  },
  {
    id: "psion.subclass.planeswalker",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: "Planeswalker" },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 1,
          recharges: [
            {
              kind: "real_time",
              mode: "cooldown",
              minutes: 0,
              period: "calendar_day",
            },
          ],
        },
      },
    ],
  },
  {
    id: "psion.subclass.balance_of_power",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: "Balance of Power" },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "special",
          specialDescription: "Banked healing as bonus damage (1 min expiry)",
          recharges: [{ kind: "real_time", mode: "decay", minutes: 1 }],
        },
      },
    ],
  },
  {
    id: "psion.subclass.practiced_prescience",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: "Practiced Prescience" },
    operations: [
      {
        op: "appendDescription",
        text: "Removes concentration requirement from Precognition's Prescience (display only if concentration not modeled on discipline passive).",
      },
    ],
  },
  {
    id: "psion.subclass.rampage_die",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: /^(?:rampage die|rampaging power)$/i },
    operations: [
      { op: "appendDescription", text: RAMPAGE_DIE_DEFERRED_NOTE },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "rampaging_power_damage",
          catalogRefId: "cat_char_bonus_damage_riders",
          characteristics: [
            {
              id: "mod_rampaging_power_damage",
              type: "bonus_damage_riders",
              riders: [],
              triggerOn: "on_hit",
              automaticBonus: {
                mode: "die",
                dieScaling: "class_resource",
                classResourceKey: "rampage_die",
                dieCount: 1,
              },
              label: "Once per turn: add your current Rampage Die to one damage roll",
            },
          ],
        },
      },
    ],
  },
  {
    id: "psion.subclass.dark_lurker",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: "Dark Lurker" },
    operations: [{ op: "appendDescription", text: DEFERRED_MECHANICS_NOTE }],
  },
  {
    id: "psion.subclass.curious_mind",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: "Curious Mind" },
    operations: [
      {
        op: "setChoices",
        isChoice: true,
        choices: {
          category: "Curious Mind",
          count: 2,
          options: curiousMindSkillOptions(),
          swappableOnRest: true,
          swapRestType: "long",
        },
      },
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 1,
          recharges: [{ rest: "long_rest" }],
        },
      },
    ],
  },
]

/** Psion presets also apply when subclass.class_name is empty — match via optional empty. */
export const PSION_PRESETS_OPEN_CLASS: EnrichmentPreset[] = PSION_PRESETS.map((preset) => ({
  ...preset,
  id: `${preset.id}.open`,
  match: {
    ...preset.match,
    // Applied in apply.ts with a fallback when subclassClassName is empty
  },
}))

export const MONK_PRESETS: EnrichmentPreset[] = [
  {
    id: "monk.class.unarmored_defense",
    pack: "monk",
    target: "class_feature",
    match: {
      className: /\bmonk\b/i,
      classNameExcludeExact: "Monk",
      name: /^unarmored defense$/i,
    },
    skipIfCharacteristicTypes: ["ac"],
    operations: [{ op: "attachNamedPreset", preset: { kind: "monk_unarmored_defense" } }],
  },
  {
    id: "monk.class.remap_focus_to_ki",
    pack: "monk",
    target: "class_feature",
    match: {
      className: /\bmonk\b/i,
      classNameExcludeExact: "Monk",
    },
    operations: [
      {
        op: "remapResourceKeysInModifiers",
        from: "focus_points",
        to: "prefixed:ki_points",
      },
    ],
  },
]

export const ALTERNATE_RANGER_PRESETS: EnrichmentPreset[] = [
  {
    id: "alternate_ranger.class.quarry",
    pack: "alternate_ranger",
    target: "class_feature",
    match: { className: /alternate\s+ranger/i, name: /^quarry$/i },
    skipIfCharacteristicTypes: ["on_hit_trigger"],
    operations: [{ op: "attachNamedPreset", preset: { kind: "quarry_on_hit" } }],
  },
]

export const ALTERNATE_RANGER_SEEDS: ContentSeed[] = [
  {
    id: "alternate_ranger.seed.quarry_resource",
    pack: "alternate_ranger",
    seedClassResource: {
      className: /alternate\s+ranger/i,
      requiresFeatureName: /^quarry$/i,
      resourceKey: "quarry",
      build: buildQuarryClassResource,
    },
  },
]

export const ALTERNATE_SORCERER_PRESETS: EnrichmentPreset[] = [
  {
    id: "alternate_sorcerer.class.innate_arcanum",
    pack: "alternate_sorcerer",
    target: "class_feature",
    match: {
      name: /^innate arcanum$/i,
      requiresPointPool: true,
      classNameWhenNoPointPool: /alternate sorcerer/i,
    },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "innate_arcanum",
          tiers: [
            { spellLevel: 6, classLevel: 11 },
            { spellLevel: 7, classLevel: 13 },
            { spellLevel: 8, classLevel: 15 },
            { spellLevel: 9, classLevel: 17 },
          ],
        },
      },
    ],
  },
  {
    id: "alternate_sorcerer.class.innate_sorcery",
    pack: "alternate_sorcerer",
    target: "class_feature",
    match: { name: /^innate sorcery$/i },
    operations: [{ op: "attachNamedPreset", preset: { kind: "innate_sorcery" } }],
  },
  {
    id: "alternate_sorcerer.class.sorcerous_regeneration",
    pack: "alternate_sorcerer",
    target: "class_feature",
    match: {
      name: /^sorcerous regeneration$/i,
      requiresPointPool: true,
      classNameWhenNoPointPool: /alternate sorcerer/i,
    },
    operations: [
      {
        op: "appendDescriptionTemplate",
        resourceKey: "sorcery_points",
        template:
          "Regain expended {{resource_label}} equal to half your class level (rounded up) once per long rest when you finish a short rest.",
      },
    ],
  },
]

export const WARMAGE_PRESETS: EnrichmentPreset[] = [
  {
    id: "warmage.class.warmage_edge",
    pack: "warmage",
    target: "class_feature",
    match: { className: /warmage/i, name: /^warmage edge$/i },
    skipIfCharacteristicTypes: ["on_cast_spell_trigger"],
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "warmage_edge",
          catalogRefId: "cat_char_on_cast_spell_trigger",
          characteristics: [
            {
              id: "mod_warmage_edge",
              type: "on_cast_spell_trigger",
              spellTags: ["cantrip", "damage"],
              effect: { catalogRefId: "cat_fx_bonus_damage_by_level" },
              label:
                "Warmage Edge: once per turn add INT (and Cantrip Bonus Dice from level 5+) to one cantrip damage roll",
            },
          ],
        },
      },
    ],
  },
  {
    id: "warmage.class.arcane_surge",
    pack: "warmage",
    target: "class_feature",
    match: { className: /warmage/i, name: /^arcane surge$/i },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "class_resource",
          classResourceKey: "arcane_surge",
          classResourceAmount: 1,
        },
      },
      {
        op: "appendDescription",
        text: "Dump Stat tracks Arcane Surge uses on the sheet. Doubling (or tripling on a crit) cantrip damage dice when you surge remains a play-time damage adjustment.",
      },
    ],
  },
  {
    id: "warmage.class.reliable_cantrip",
    pack: "warmage",
    target: "class_feature",
    match: { className: /warmage/i, name: /^reliable cantrip$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Reliable Cantrip minimum damage on a miss or successful save is tracked narratively — apply minimum dice + Edge when resolving the roll.",
      },
    ],
  },
]

/** @deprecated Import from packs/dancer — re-exported for registry compatibility. */
export { DANCER_PRESETS } from "@/lib/import/enrichment-presets/packs/dancer"

export const VAGABOND_PRESETS: EnrichmentPreset[] = [
  {
    id: "vagabond.class.desperate_attack",
    pack: "vagabond",
    target: "class_feature",
    match: {
      className: /vagabond/i,
      name: /^desperate attack$/i,
    },
    operations: [
      {
        op: "appendDescription",
        text: "While you are Bloodied, you have Advantage on attack rolls. Dump Stat gates this with the built-in Bloodied sheet state (below_half_hp).",
      },
    ],
  },
]

export const MARTYR_PRESETS: EnrichmentPreset[] = [
  {
    id: "martyr.class.spellcasting",
    pack: "martyr",
    target: "class_feature",
    match: { className: /martyr/i, name: /^spellcasting$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Hit Point Spellcasting (Radiant self-damage to create a temporary slot) is tracked narratively — apply the Hit Point Spellcasting table damage when you cast. Spell Uses are a separate long-rest pool on the sheet.",
      },
    ],
  },
]

export const NECROMANCER_PRESETS: EnrichmentPreset[] = [
  {
    id: "necromancer.class.thralls",
    pack: "necromancer",
    target: "class_feature",
    match: { className: /necromancer/i, name: /^thralls$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Import Undead Thralls as creatures[] first. Prefer mechanics grant_creature with creatureChoiceOptions for Skeleton, Zombie, Spirit, and other thrall names. Thralls / CR Total columns are control caps (special), not spendable pools.",
      },
    ],
  },
]

export const ALCHEMIST_PHILOSOPHER_PRESETS: EnrichmentPreset[] = []

export const MHP_WARDEN_PRESETS: EnrichmentPreset[] = [
  {
    id: "mhp_warden.class.interrupt",
    pack: "mhp_warden",
    target: "class_feature",
    match: { className: /warden/i, name: /^interrupt$/i },
    operations: [
      {
        op: "setActivation",
        activation: { reaction: true },
      },
      {
        op: "setSheetDisplay",
        sheetDisplay: { combatActions: true },
      },
      {
        op: "setLimitedUses",
        uses: {
          type: "class_resource",
          classResourceKey: "interrupt",
          classResourceAmount: 1,
        },
      },
    ],
  },
  {
    id: "mhp_warden.class.survive",
    pack: "mhp_warden",
    target: "class_feature",
    match: { className: /warden/i, name: /^survive$/i },
    operations: [
      {
        op: "setActivation",
        activation: { onDropToZeroHp: true },
      },
      {
        op: "setSheetDisplay",
        sheetDisplay: { combatActions: true },
      },
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 1,
          useShareKey: "survive",
          recharges: [{ rest: "long_rest" }],
        },
      },
    ],
  },
  {
    id: "mhp_warden.class.guardian_tactics",
    pack: "mhp_warden",
    target: "class_feature",
    match: { className: /warden/i, name: /^guardian tactics$/i },
    operations: [
      {
        op: "setActivation",
        activation: { bonusAction: true },
      },
      {
        op: "setSheetDisplay",
        sheetDisplay: { combatActions: true },
      },
      {
        op: "attachNamedPreset",
        replaceCharacteristicTypes: ["resource_ability_menu"],
        preset: {
          kind: "char_instance",
          idKey: "guardian_tactics",
          catalogRefId: "cat_char_resource_ability_menu",
          characteristics: [
            {
              id: "mod_guardian_tactics",
              type: "resource_ability_menu",
              resourceKey: "guardian_tactics",
              waiveResourceCost: true,
              options: [
                {
                  name: "Block",
                  description:
                    "Bonus Action: choose one ally you can see. Until the start of your next turn, the ally's AC equals your AC if it is lower, while the ally is within 5 feet of you (10 feet with Extended Tactics). Ends early if you or the ally are Incapacitated.",
                  resourceCost: 0,
                },
                {
                  name: "Challenge",
                  description:
                    "Bonus Action: goad an enemy that can see or hear you. Until the start of your next turn, that enemy has Disadvantage on attack rolls against creatures other than you while within 5 feet of you (10 feet with Extended Tactics). Ends early if you are Incapacitated.",
                  resourceCost: 0,
                },
                {
                  name: "Grasp",
                  description:
                    "Bonus Action: block retreat of foes in a 5-foot Emanation from you (10-foot with Extended Tactics) until the start of your next turn. A creature in the Emanation can't willingly move further away unless it first takes the Disengage action. Ends early if you are Incapacitated.",
                  resourceCost: 0,
                },
                {
                  name: "Extended Tactics",
                  description:
                    "Unlocked at Warden 14: Block and Challenge reach 10 feet; Grasp is a 10-foot Emanation. Use the Block / Challenge / Grasp options with the wider ranges.",
                  resourceCost: 0,
                  unlocksAtLevel: 14,
                },
              ],
              label: "Guardian Tactics",
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "Block / Challenge / Grasp ally and enemy effects (AC share, goad, emanation) are play-time. Extended Tactics (14th) is listed on the menu when unlocked and widens those ranges to 10 feet.",
      },
    ],
  },
  {
    id: "mhp_warden.class.extended_tactics",
    pack: "mhp_warden",
    target: "class_feature",
    match: { className: /warden/i, name: /^extended tactics$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Unlocks the Extended Tactics entry on the Guardian Tactics Bonus Action menu (10-foot Block/Challenge reach and Grasp emanation). Track the wider ranges when using Block, Challenge, or Grasp.",
      },
    ],
  },
  {
    id: "mhp_warden.class.unyielding_resolve",
    pack: "mhp_warden",
    target: "class_feature",
    match: { className: /warden/i, name: /^unyielding resolve$/i },
    operations: [
      {
        op: "appendDescription",
        text: "While Bloodied resistance is auto-gated with below_half_hp when the feature text says \"While you are Bloodied\".",
      },
    ],
  },
  // --- Subclass features (parent class_name Warden) ---
  {
    id: "mhp_warden.subclass.roar",
    pack: "mhp_warden",
    target: "subclass_feature",
    match: { className: /warden/i, name: /^roar$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "appendDescription",
        text: "Push and Opportunity Attack denial are play-time; this feature appears as a Bonus Action on the combat actions panel.",
      },
    ],
  },
  {
    id: "mhp_warden.subclass.mortal_metamagic",
    pack: "mhp_warden",
    target: "subclass_feature",
    match: { className: /warden/i, name: /^mortal metamagic$/i },
    operations: [
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, abilitiesActions: true } },
      {
        op: "attachNamedPreset",
        replaceCharacteristicTypes: ["resource_ability_menu"],
        preset: {
          kind: "char_instance",
          idKey: "mortal_metamagic",
          catalogRefId: "cat_char_resource_ability_menu",
          characteristics: [
            {
              id: "mod_mortal_metamagic",
              type: "resource_ability_menu",
              resourceKey: "",
              waiveResourceCost: true,
              options: [
                {
                  name: "Empowered Spell",
                  description:
                    "When you roll damage for a spell, reroll up to your Charisma modifier (minimum 1) of the damage dice; use the new rolls. Can stack with another Metamagic option on the same cast.",
                  resourceCost: 0,
                  hitDiceCost: 1,
                },
                {
                  name: "Quickened Spell",
                  description:
                    "Change a spell with casting time of an action to a Bonus Action for this casting (same turn restrictions as Sorcerer Quickened Spell).",
                  resourceCost: 0,
                  hitDiceCost: 2,
                },
              ],
              label: "Mortal Metamagic (Hit Point Dice)",
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "Spend Hit Point Dice from the sheet Hit Dice tracker when you Use this ability (1 for Empowered, 2 for Quickened). Empowered Spell rerolls happen on the damage roll; Quickened Spell changes casting time to a Bonus Action.",
      },
    ],
  },
  {
    id: "mhp_warden.subclass.arcane_strike",
    pack: "mhp_warden",
    target: "subclass_feature",
    match: { className: /warden/i, name: /^arcane strike$/i },
    operations: [
      {
        op: "setActivation",
        activation: {
          action: true,
          usesExistingClassFeature: true,
          existingClassFeatureName: "Extra Attack",
        },
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "appendDescription",
        text: "When you take the Attack action, replace one attack with a Sorcerer cantrip that has a casting time of an action — shown on the combat actions panel.",
      },
    ],
  },
  {
    id: "mhp_warden.subclass.draconic_vengeance",
    pack: "mhp_warden",
    target: "subclass_feature",
    match: { className: /warden/i, name: /^draconic vengeance$/i },
    operations: [
      {
        op: "setActivation",
        activation: { reaction: true, spendHitDice: 1 },
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "attachNamedPreset",
        replaceCharacteristicTypes: ["special_attack"],
        preset: {
          kind: "char_instance",
          idKey: "draconic_vengeance",
          catalogRefId: "cat_char_special_attack",
          characteristics: [
            {
              id: "mod_draconic_vengeance",
              type: "special_attack",
              attackName: "Draconic Vengeance",
              attackProfile: "force_save",
              targetMode: "area",
              areaShape: "sphere",
              areaLengthFeet: 10,
              rangeFeet: 10,
              properties: [],
              damageTypes: ["Acid", "Cold", "Fire", "Lightning", "Poison"],
              damageDiceCount: 2,
              damageDieType: "d10",
              saveAbility: "Dexterity",
              saveHalfDamage: true,
              label: "Draconic Vengeance — spend 1 Hit Point Die (die size = your Hit Die + CON)",
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "Reaction when you take damage from a creature within 10 feet. Using this spends 1 Hit Point Die from the sheet tracker. Damage is two rolls of your Hit Die + Constitution modifier (choose Acid/Cold/Fire/Lightning/Poison). Spell save DC; half on success.",
      },
    ],
  },
  {
    id: "mhp_warden.subclass.anointed_block",
    pack: "mhp_warden",
    target: "subclass_feature",
    match: { className: /warden/i, name: /^anointed block$/i },
    operations: [
      {
        op: "attachNamedPreset",
        replaceCharacteristicTypes: ["power_rider"],
        preset: {
          kind: "char_instance",
          idKey: "anointed_block",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_anointed_block",
              type: "power_rider",
              parentPowerNames: ["Guardian Tactics"],
              parentMenuOptionNames: ["Block"],
              alertSummary:
                "Chosen ally also adds 1d4 to attack rolls and saving throws while within 5 feet (until start of your next turn).",
            },
          ],
        },
      },
    ],
  },
  {
    id: "mhp_warden.subclass.selfless_survival",
    pack: "mhp_warden",
    target: "subclass_feature",
    match: { className: /warden/i, name: /^selfless survival$/i },
    operations: [
      {
        op: "setActivation",
        activation: {
          onDropToZeroHp: true,
          usesExistingClassFeature: true,
          existingClassFeatureName: "Survive",
        },
      },
      {
        op: "setSheetDisplay",
        sheetDisplay: { combatActions: true },
      },
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 1,
          useShareKey: "survive",
          recharges: [{ rest: "long_rest" }],
        },
      },
      {
        op: "appendDescription",
        text: "Shares the Survive use pool (useShareKey \"survive\"). Expend Survive to drop an ally within 30 feet to 1 HP and heal them for twice your Warden level instead of yourself.",
      },
    ],
  },
  {
    id: "mhp_warden.subclass.battle_tactics",
    pack: "mhp_warden",
    target: "subclass_feature",
    match: { className: /warden/i, name: /^battle tactics$/i },
    operations: [
      {
        op: "setChoices",
        isChoice: true,
        choices: {
          category: "Maneuver",
          count: 1,
          options: [],
          optionsSource: "class_knacks",
          choiceCountByLevel: [
            { level: 3, count: 3 },
            { level: 7, count: 4 },
            { level: 13, count: 5 },
            { level: 19, count: 6 },
          ],
          swappableOnRest: false,
        },
      },
      {
        op: "appendDescription",
        text: "Battle Dice pool comes from the Grey Watchman class_resources proposal (subclass-scoped; gated on the sheet). Import maneuver custom abilities (ability_role knack) before or with this class so picks resolve.",
      },
    ],
  },
  {
    id: "mhp_warden.subclass.unyielding_surge",
    pack: "mhp_warden",
    target: "subclass_feature",
    match: { className: /warden/i, name: /^unyielding surge$/i },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 1,
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
          rechargeOnInitiative: true,
        },
      },
      {
        op: "appendDescription",
        text: "When you become Bloodied (below_half_hp), regain one expended Battle Die. Once per Short/Long Rest or until you roll Initiative again.",
      },
    ],
  },
  {
    id: "mhp_warden.subclass.hold_the_line",
    pack: "mhp_warden",
    target: "subclass_feature",
    match: { className: /warden/i, name: /^hold the line$/i },
    operations: [
      {
        op: "attachNamedPreset",
        replaceCharacteristicTypes: ["power_rider"],
        preset: {
          kind: "char_instance",
          idKey: "hold_the_line",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_hold_the_line",
              type: "power_rider",
              parentPowerNames: ["Guardian Tactics"],
              parentMenuOptionNames: ["Grasp"],
              alertSummary:
                "While in the Grasp Emanation, you and allies have Advantage on Strength, Dexterity, and Constitution saving throws.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "mhp_warden.subclass.deaths_gambit",
    pack: "mhp_warden",
    target: "subclass_feature",
    match: { className: /warden/i, name: /^death'?s gambit$/i },
    operations: [
      {
        op: "attachNamedPreset",
        replaceCharacteristicTypes: ["power_rider"],
        preset: {
          kind: "char_instance",
          idKey: "deaths_gambit",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_deaths_gambit",
              type: "power_rider",
              parentPowerNames: ["Guardian Tactics"],
              parentMenuOptionNames: ["Challenge"],
              alertSummary:
                "After you damage a Challenged enemy, if it has fewer HP than twice your Warden level, it drops to 0 HP.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "mhp_warden.subclass.undying",
    pack: "mhp_warden",
    target: "subclass_feature",
    match: { className: /warden/i, name: /^undying$/i },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 3,
          useShareKey: "survive",
          recharges: [{ rest: "long_rest" }],
        },
      },
      {
        op: "attachNamedPreset",
        replaceCharacteristicTypes: ["power_rider"],
        preset: {
          kind: "char_instance",
          idKey: "undying",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_undying",
              type: "power_rider",
              parentPowerNames: ["Survive"],
              alertSummary: "Survive pool is 3 uses per Long Rest (shared with Survive / Selfless Survival).",
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "Raises the shared Survive pool (useShareKey \"survive\") to 3 uses; regain all on a Long Rest.",
      },
    ],
  },
  {
    id: "mhp_warden.subclass.stonewall",
    pack: "mhp_warden",
    target: "subclass_feature",
    match: { className: /warden/i, name: /^stonewall$/i },
    operations: [
      {
        op: "attachNamedPreset",
        replaceCharacteristicTypes: ["power_rider"],
        preset: {
          kind: "char_instance",
          idKey: "stonewall",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_stonewall",
              type: "power_rider",
              parentPowerNames: ["Guardian Tactics"],
              parentMenuOptionNames: ["Block"],
              alertSummary:
                "While holding a Shield: you and the Block ally reduce B/P/S damage by your Shield's AC bonus until the start of your next turn.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "mhp_warden.subclass.legendary_interruption",
    pack: "mhp_warden",
    target: "subclass_feature",
    match: { className: /warden/i, name: /^legendary interruption$/i },
    operations: [
      {
        op: "attachNamedPreset",
        replaceCharacteristicTypes: ["power_rider"],
        preset: {
          kind: "char_instance",
          idKey: "legendary_interruption",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_legendary_interruption",
              type: "power_rider",
              parentPowerNames: ["Interrupt"],
              alertSummary:
                "You can use Interrupt when an enemy you can see takes a Legendary Action to make an attack, preventing that attack.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "mhp_warden.subclass.thunderblast",
    pack: "mhp_warden",
    target: "subclass_feature",
    match: { className: /warden/i, name: /^thunderblast$/i },
    operations: [
      {
        op: "attachNamedPreset",
        replaceCharacteristicTypes: ["power_rider"],
        preset: {
          kind: "char_instance",
          idKey: "thunderblast",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_thunderblast",
              type: "power_rider",
              parentPowerNames: ["Guardian Tactics"],
              parentMenuOptionNames: ["Grasp"],
              alertSummary:
                "When you use Grasp, each creature you choose in the Emanation takes 1d8 Lightning damage.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "mhp_warden.subclass.grasping_vines",
    pack: "mhp_warden",
    target: "subclass_feature",
    match: { className: /warden/i, name: /^grasping vines$/i },
    operations: [
      {
        op: "attachNamedPreset",
        replaceCharacteristicTypes: ["power_rider"],
        preset: {
          kind: "char_instance",
          idKey: "grasping_vines",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_grasping_vines",
              type: "power_rider",
              parentPowerNames: ["Guardian Tactics"],
              parentMenuOptionNames: ["Grasp"],
              alertSummary:
                "Grasp Emanation is 10 feet for creatures on the ground (15 feet at Warden 14).",
            },
          ],
        },
      },
    ],
  },
  {
    id: "mhp_warden.subclass.verdant_resilience",
    pack: "mhp_warden",
    target: "subclass_feature",
    match: { className: /warden/i, name: /^verdant resilience$/i },
    operations: [
      {
        op: "attachNamedPreset",
        replaceCharacteristicTypes: ["power_rider"],
        preset: {
          kind: "char_instance",
          idKey: "verdant_resilience",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_verdant_resilience",
              type: "power_rider",
              parentPowerNames: ["Survive"],
              alertSummary:
                "When you use Survive, you and allies within 10 feet gain Temporary Hit Points equal to twice your Warden level.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "mhp_warden.subclass.earthshatter",
    pack: "mhp_warden",
    target: "subclass_feature",
    match: { className: /warden/i, name: /^earthshatter$/i },
    operations: [
      {
        op: "setActivation",
        activation: {
          action: true,
          usesExistingClassFeature: true,
          existingClassFeatureName: "Extra Attack",
        },
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "attachNamedPreset",
        replaceCharacteristicTypes: ["special_attack"],
        preset: {
          kind: "char_instance",
          idKey: "earthshatter",
          catalogRefId: "cat_char_special_attack",
          characteristics: [
            {
              id: "mod_earthshatter",
              type: "special_attack",
              attackName: "Earthshatter",
              attackProfile: "force_save",
              targetMode: "area",
              areaShape: "sphere",
              areaLengthFeet: 5,
              rangeFeet: 5,
              properties: [],
              damageTypes: [],
              damageDiceCount: 0,
              damageDieType: "d6",
              saveAbility: "Strength",
              saveHalfDamage: false,
              label: "Earthshatter — replace one Attack; Large or smaller on ground: Str save or Prone (10 ft at 14)",
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "When you take the Attack action, replace one attack with a slam. Each Large or smaller creature you choose on the ground within 5 feet (10 feet at Warden 14) must succeed on a Strength saving throw (DC 8 + Str mod + PB) or fall Prone.",
      },
    ],
  },
]

export const MHP_WARDEN_SEEDS: ContentSeed[] = [
  {
    id: "mhp_warden.seed.guardian_tactics",
    pack: "mhp_warden",
    seedClassResource: {
      className: /warden/i,
      requiresFeatureName: /^guardian tactics$/i,
      resourceKey: "guardian_tactics",
      build: (className) => ({
        class_name: className,
        resource_key: "guardian_tactics",
        name: "Guardian Tactics",
        description:
          "Unlimited Bonus Action menu for Block, Challenge, Grasp, and (at 14th) Extended Tactics range note.",
        uses: { type: "unlimited" },
      }),
    },
  },
]
