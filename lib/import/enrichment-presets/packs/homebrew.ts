import type { ContentSeed, EnrichmentPreset } from "@/lib/import/enrichment-presets/types"
import {
  buildQuarryClassResource,
} from "@/lib/import/enrichment-presets/builders"
import { DND_SKILLS } from "@/lib/compendium/constants"
import { createModifierInstanceId } from "@/lib/compendium/linked-modifiers"
import { characteristicCatalogRefId, effectCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { requiresActiveToggleLimitation } from "@/lib/compendium/modifier-limitations"
import { fxInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import type { Feature, FeatureChoice } from "@/lib/types"

const DEFERRED_MECHANICS_NOTE =
  "Mechanic not fully modeled on sheet — see feature description (Dark Lurker check reduction)."

const RAMPAGE_DIE_SHEET_NOTE =
  "Rampage Die runs on the sheet: Turn Start steps it up after a turn you dealt damage and resets it to d4 after a turn without damage or while Incapacitated. Weapon damage rolls and damaging power uses mark the turn automatically, the die can only be added to one damage roll per turn, and holding d12 for 10 rounds adds a level of Exhaustion."

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
    skipIfCharacteristicTypes: ["on_hit_trigger"],
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
      // Always a Bonus Action. The "action or Bonus Action" wording limits which grimoire
      // spells qualify, so it must not also file this under Actions.
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Sheet: Rushed Incantation always costs a Bonus Action. The action-or-Bonus-Action wording is the eligibility filter for which grimoire spells you may rush, not the cost of rushing them.",
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
  {
    id: "investigator.class.artifact_hoarder_note",
    pack: "investigator",
    target: "subclass_feature",
    match: { subclassClassName: /investigator/i, name: /^artifact hoarder$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Extra Trinkets use is play-time (+1 to your Trinkets pool while this feature applies) — not a separate resource key.",
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
      { op: "setActivation", activation: { action: true, noEconomyCost: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Bank healing/THP from psionic powers and spells into your Balance of Power pool (max = Psion level, 1 min decay). Expend the pool on a damage roll to add that much damage to one target.",
      },
    ],
  },
  {
    id: "psion.subclass.perfected_enhancement",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: /^perfected enhancement$/i },
    skipIfCharacteristicTypes: ["power_rider"],
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "perfected_enhancement_rider",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_perfected_enhancement_rider",
              type: "power_rider",
              parentPowerNames: ["Enhancing Surge"],
              alertSummary:
                "When a psionic power grants temporary HP, add your proficiency bonus to the temp HP one creature gains (sheet applies +PB on psionic-power temp HP grants).",
              label: "Perfected Enhancement",
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "Sheet: when you Use a psionic power that grants temporary hit points, Dump Stat adds your proficiency bonus to one creature's temp HP from that grant.",
      },
    ],
  },
  {
    id: "psion.subclass.boundless_imagination",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: /^boundless imagination$/i },
    operations: [
      {
        op: "setChoices",
        isChoice: true,
        choices: {
          category: "Boundless Imagination",
          count: 1,
          options: [
            {
              name: "Devastating Weapons",
              description: "Its damage becomes 1d12.",
            },
            {
              name: "Psionic Conduit",
              description:
                "You can use psionic powers, spells, and talents through your Astral Construct as if you were in its space.",
            },
            {
              name: "Vivid Existence",
              description:
                "Your Astral Construct fully materializes and automatically uses Solidify at the start of your turn without requiring a command.",
            },
          ],
          swappableOnRest: false,
        },
      },
      {
        op: "attachNamedPreset",
        skipIfCharacteristicTypes: ["power_rider"],
        preset: {
          kind: "char_instance",
          idKey: "boundless_imagination_rider",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_boundless_imagination_rider",
              type: "power_rider",
              parentPowerNames: ["Astral Construct"],
              alertSummary:
                "When you conjure Astral Construct, apply your Boundless Imagination pick (change the benefit as a bonus action for the duration).",
              label: "Boundless Imagination",
            },
          ],
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
    id: "psion.subclass.mind_reader",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: /^mind reader$/i },
    operations: [
      {
        op: "attachNamedPreset",
        skipIfCharacteristicTypes: ["modify_custom_ability"],
        preset: {
          kind: "char_instance",
          idKey: "mind_reader_upgrade",
          catalogRefId: "cat_char_modify_custom_ability",
          characteristics: [
            {
              id: "mod_mind_reader_upgrade",
              type: "modify_custom_ability",
              abilityNames: ["Telepathic Intrusion"],
              addendum:
                "Mind Reader: you can force the target to make an Intelligence saving throw instead of a Wisdom saving throw, deciding when you use the ability. When a creature fails a saving throw against your Telepathic Intrusion you gain a d4; until the end of your next turn you can add or subtract it from an attack roll against that creature, or from a saving throw it makes against another of your psionic powers, deciding before the roll.",
              label: "Mind Reader",
            },
          ],
        },
      },
    ],
  },
  {
    id: "psion.subclass.astral_metastability",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: /^astral metastability$/i },
    operations: [
      {
        op: "attachNamedPreset",
        skipIfCharacteristicTypes: ["modify_custom_ability"],
        preset: {
          kind: "char_instance",
          idKey: "astral_metastability_upgrade",
          catalogRefId: "cat_char_modify_custom_ability",
          characteristics: [
            {
              id: "mod_astral_metastability_upgrade",
              type: "modify_custom_ability",
              abilityNames: ["Astral Construct"],
              addendum:
                "Astral Metastability: this construct does not require concentration to maintain and lasts until dismissed, but you cannot summon another Astral Construct while one is summoned.",
              label: "Astral Metastability",
            },
          ],
        },
      },
    ],
  },
  {
    id: "psion.subclass.phase_dancer",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: /^phase dancer$/i },
    operations: [
      {
        op: "attachNamedPreset",
        skipIfCharacteristicTypes: ["modify_custom_ability"],
        preset: {
          kind: "char_instance",
          idKey: "phase_dancer_upgrade",
          catalogRefId: "cat_char_modify_custom_ability",
          characteristics: [
            {
              id: "mod_phase_dancer_upgrade",
              type: "modify_custom_ability",
              abilityNames: ["Phase Rift"],
              addendum:
                "Phase Dancer: once per turn, using this power automatically gains you one illusory duplicate, as from the Blurring modifier, and your first attack roll before the end of your turn after using it has advantage.",
              label: "Phase Dancer",
            },
          ],
        },
      },
    ],
  },
  {
    id: "psion.subclass.winding_paths",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: /^winding paths$/i },
    operations: [
      {
        op: "attachNamedPreset",
        skipIfCharacteristicTypes: ["modify_custom_ability"],
        preset: {
          kind: "char_instance",
          idKey: "winding_paths_upgrade",
          catalogRefId: "cat_char_modify_custom_ability",
          characteristics: [
            {
              id: "mod_winding_paths_upgrade",
              type: "modify_custom_ability",
              abilityNames: ["Phase Rift"],
              addendum:
                "Winding Paths: this power no longer has to travel in a straight line, though it can pass through a creature's space only once.",
              label: "Winding Paths",
            },
          ],
        },
      },
    ],
  },
  {
    id: "psion.subclass.rampage_die",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: /^(?:rampage die|rampaging power)$/i },
    operations: [
      { op: "appendDescription", text: RAMPAGE_DIE_SHEET_NOTE },
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
    id: "psion.subclass.uncontrollable_mind",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: /^uncontrollable mind$/i },
    operations: [
      {
        op: "attachNamedPreset",
        // The description parses as an unconditional immunity; the real grant only
        // holds while the Rampage Die is d8 or larger.
        replaceCharacteristicTypes: ["condition_immunity"],
        preset: {
          kind: "char_instance",
          idKey: "uncontrollable_mind_immunities",
          catalogRefId: "cat_char_condition_immunity",
          characteristics: [
            {
              id: "mod_uncontrollable_mind_immunities",
              type: "condition_immunity",
              conditions: ["Charmed", "Frightened"],
              label: "Immunity to Charmed and Frightened (Rampage Die d8+)",
              limitations: [requiresActiveToggleLimitation("rampage_die_d8_plus")],
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "The sheet grants Charmed and Frightened immunity only while your Rampage Die is d8 or larger. Resistance to being magically controlled stays a table ruling.",
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
  {
    id: "psion.subclass.full_awakening",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: /^full awakening$/i },
    operations: [
      {
        op: "setActivation",
        activation: { action: true, noEconomyCost: true },
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "setLimitedUses",
        uses: {
          type: "class_resource",
          classResourceKey: "psi_points",
          classResourceAmount: 2,
        },
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "fx_instance",
          idKey: "full_awakening_attacks",
          catalogRefId: effectCatalogRefId("check_roll_modifier"),
          effects: [
            {
              id: modId("full_awakening_attacks"),
              kind: "check_roll_modifier",
              checkRollMode: "advantage",
              checkCategory: "attack",
              label: "Full Awakening: advantage on attacks",
              limitations: [requiresActiveToggleLimitation("full_awakening_active")],
            },
          ],
        },
        skipIfCharacteristicTypes: ["check_roll_modifier"],
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "fx_instance",
          idKey: "full_awakening_saves",
          catalogRefId: effectCatalogRefId("check_roll_modifier"),
          effects: [
            {
              id: modId("full_awakening_saves"),
              kind: "check_roll_modifier",
              checkRollMode: "advantage",
              checkCategory: "save",
              label: "Full Awakening: advantage on saves",
              limitations: [requiresActiveToggleLimitation("full_awakening_active")],
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "Use at the start of your turn (2 psi). Enable Full Awakening on the sheet so attack/save advantage applies until the start of your next turn.",
      },
    ],
  },
  {
    id: "psion.subclass.mind_over_matter",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: /^mind over matter$/i },
    skipIfCharacteristicTypes: ["resource_ability_menu"],
    operations: [
      { op: "setActivation", activation: { action: true, noEconomyCost: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "mind_over_matter_menu",
          catalogRefId: "cat_char_resource_ability_menu",
          characteristics: [
            {
              id: "mod_mind_over_matter_menu",
              type: "resource_ability_menu",
              resourceKey: "psi_points",
              options: [
                {
                  name: "INT save instead (STR/DEX/CON)",
                  description:
                    "When you would make a Strength, Dexterity, or Constitution saving throw, spend 2 psi to make an Intelligence saving throw instead.",
                  resourceCost: 2,
                },
                {
                  name: "Death save = 20",
                  description:
                    "When you make a death saving throw, spend 4 psi before rolling to treat the roll as a 20.",
                  resourceCost: 4,
                },
              ],
              label: "Mind Over Matter — spend psi",
            },
          ],
        },
      },
    ],
  },
  {
    id: "psion.subclass.unstoppable_rampage",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: /^unstoppable rampage$/i },
    skipIfCharacteristicTypes: ["resource_ability_menu"],
    operations: [
      { op: "setActivation", activation: { onDropToZeroHp: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "unstoppable_rampage_menu",
          catalogRefId: "cat_char_resource_ability_menu",
          characteristics: [
            {
              id: "mod_unstoppable_rampage_menu",
              type: "resource_ability_menu",
              resourceKey: "psi_points",
              waiveResourceCost: true,
              options: [
                {
                  name: "Roll Rampage Die",
                  description:
                    "Roll your Rampage Die + CON vs excess damage. If you exceed it, drop to 1 HP instead of 0.",
                  resourceCost: 0,
                },
                {
                  name: "Second Rampage Die (+2 psi)",
                  description: "Spend 2 psi to roll an additional Rampage Die and add it.",
                  resourceCost: 2,
                },
              ],
              label: "Unstoppable Rampage",
            },
          ],
        },
      },
    ],
  },
  {
    id: "psion.subclass.astral_guardian",
    pack: "psion",
    target: "subclass_feature",
    match: { subclassClassName: /psion/i, name: /^astral guardian$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "setLimitedUses",
        uses: {
          type: "class_resource",
          classResourceKey: "psi_points",
          classResourceAmount: 1,
        },
      },
    ],
  },
  // —— Class talents / discipline powers (proposal abilities) ——
  {
    id: "psion.ability.mind_rider",
    pack: "psion",
    target: "proposal_ability",
    match: { name: /^mind rider$/i },
    operations: [
      { op: "setCastingTime", castingTime: "1 action" },
      {
        op: "appendDescription",
        text: "Using this action turns on Mind Rider on the sheet. Name the target creature on the toggle; you are deaf and blind to your own senses. Ally Int/Wis/Cha save advantage stays play-time — turn the toggle off when the link ends.",
      },
      {
        op: "attachNamedPreset",
        skipIfCharacteristicTypes: ["power_rider"],
        preset: {
          kind: "char_instance",
          idKey: "mind_rider_rider",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_mind_rider_rider",
              type: "power_rider",
              parentPowerNames: ["Mind Rider"],
              alertSummary:
                "While linked: fill in the target on the Mind Rider toggle. You are blind/deaf to your own senses; that creature has Advantage on Intelligence, Wisdom, and Charisma saves.",
              label: "Mind Rider",
              limitations: [requiresActiveToggleLimitation("mind_rider_active")],
            },
          ],
        },
      },
    ],
  },
  {
    id: "psion.ability.empowered_strike_rider",
    pack: "psion",
    target: "proposal_ability",
    match: { name: /^empowered strike$/i },
    skipIfCharacteristicTypes: ["power_rider"],
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "empowered_strike_rider",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_empowered_strike_rider",
              type: "power_rider",
              parentPowerNames: ["Attack", "Elemental Blast", "Telekinetic Force"],
              alertSummary:
                "Once/turn on a weapon hit (Attack action): apply augments from a known Elemental Blast or Telekinetic Force without that power's base damage. Open Elemental Blast / Telekinetic Force for the augment list; Psionic Mastery still applies.",
              label: "Empowered Strike",
            },
          ],
        },
      },
    ],
  },
  {
    id: "psion.ability.projected_nightmares",
    pack: "psion",
    target: "proposal_ability",
    match: { name: /^projected nightmares$/i },
    operations: [
      {
        op: "attachNamedPreset",
        skipIfCharacteristicTypes: ["feature_choice_option_grant"],
        preset: {
          kind: "char_instance",
          idKey: "projected_nightmares_option",
          catalogRefId: "cat_char_feature_choice_option_grant",
          characteristics: [
            {
              id: "mod_projected_nightmares_option",
              type: "feature_choice_option_grant",
              targetFeatureName: "Boundless Imagination",
              choiceCategory: "Boundless Imagination",
              options: [
                {
                  name: "Horrifying Nightmare",
                  description:
                    "Chosen creatures that start their turns within 5 feet of your Astral Construct must make a Wisdom saving throw against your Psionics DC or become frightened of it until the start of their next turn. On a successful save, a creature is immune to this effect for 24 hours or until you summon a new Astral Construct.",
                },
              ],
              label: "Projected Nightmares — Horrifying Nightmare",
            },
          ],
        },
      },
      {
        op: "attachNamedPreset",
        skipIfCharacteristicTypes: ["power_rider"],
        preset: {
          kind: "char_instance",
          idKey: "projected_nightmares_rider",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_projected_nightmares_rider",
              type: "power_rider",
              parentPowerNames: ["Astral Construct"],
              alertSummary:
                "If Boundless Imagination is Horrifying Nightmare: chosen creatures starting within 5 ft. of your Astral Construct WIS save or frightened until their next turn.",
              label: "Projected Nightmares",
            },
          ],
        },
      },
    ],
  },
  {
    id: "psion.ability.bile_blast",
    pack: "psion",
    target: "proposal_ability",
    match: { name: /^bile blast$/i },
    skipIfCharacteristicTypes: ["special_attack"],
    operations: [
      { op: "setCastingTime", castingTime: "1 action" },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "bile_blast",
          catalogRefId: "cat_char_special_attack",
          activation: { action: true },
          characteristics: [
            {
              id: "mod_bile_blast",
              type: "special_attack",
              attackName: "Bile Blast",
              icon: "goo-spurt",
              attackProfile: "force_save",
              targetMode: "area",
              areaShape: "cone",
              areaLengthFeet: 15,
              saveAbility: "Dexterity",
              saveDCBase: 8,
              saveHalfDamage: true,
              damageTypes: ["Acid"],
              damageDiceCount: 2,
              damageDieType: "d6",
              damageByLevel: [
                { level: 1, mode: "dice", dieCount: 2, dieType: "d6" },
                { level: 5, mode: "dice", dieCount: 3, dieType: "d6" },
                { level: 11, mode: "dice", dieCount: 4, dieType: "d6" },
                { level: 17, mode: "dice", dieCount: 6, dieType: "d6" },
              ],
              label: "Bile Blast — acid cone",
            },
          ],
        },
      },
    ],
  },
  {
    id: "psion.ability.weapon_morph",
    pack: "psion",
    target: "proposal_ability",
    match: { name: /^weapon morph$/i },
    skipIfCharacteristicTypes: ["resource_ability_menu"],
    operations: [
      { op: "setCastingTime", castingTime: "1 bonus action" },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "weapon_morph_menu",
          catalogRefId: "cat_char_resource_ability_menu",
          activation: { bonusAction: true },
          characteristics: [
            {
              id: "mod_weapon_morph_menu",
              type: "resource_ability_menu",
              resourceKey: "",
              waiveResourceCost: true,
              options: [
                {
                  name: "Bone Spike",
                  description: "Martial melee natural weapon: 1d8 piercing, Finesse.",
                  resourceCost: 0,
                },
                {
                  name: "Chitinous Plating",
                  description: "Shield-like plating: +2 AC while morph is active.",
                  resourceCost: 0,
                },
                {
                  name: "Flesh Club",
                  description: "Martial melee natural weapon: 1d8 bludgeoning.",
                  resourceCost: 0,
                },
                {
                  name: "Sinew Whip",
                  description: "Martial melee natural weapon: 1d6 slashing, Finesse, Reach.",
                  resourceCost: 0,
                },
                {
                  name: "Viscera Cannon",
                  description:
                    "Martial ranged natural weapon: 1d8 acid, 60/180 ft. Each shot costs 1 HP (ammo).",
                  resourceCost: 0,
                },
                {
                  name: "End morph",
                  description: "End Weapon Morph as a bonus action.",
                  resourceCost: 0,
                },
              ],
              label: "Weapon Morph",
            },
          ],
        },
      },
    ],
  },
  {
    id: "psion.ability.slime_excretion",
    pack: "psion",
    target: "proposal_ability",
    match: { name: /^slime excretion$/i },
    operations: [{ op: "setCastingTime", castingTime: "1 action" }],
  },
  {
    id: "psion.ability.advantageous_assault",
    pack: "psion",
    target: "proposal_ability",
    match: { name: /^advantageous assault$/i },
    operations: [
      { op: "setCastingTime", castingTime: "1 bonus action" },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "fx_instance",
          idKey: "advantageous_assault",
          catalogRefId: "cat_fx_bonus_action_attack",
          activation: { bonusAction: true },
          effects: [{ id: modId("advantageous_assault"), kind: "bonus_action_attack" }],
        },
        skipIfCharacteristicTypes: ["bonus_action_attack"],
      },
    ],
  },
  {
    id: "psion.ability.projected_self",
    pack: "psion",
    target: "proposal_ability",
    match: { name: /^projected self$/i },
    operations: [
      { op: "setCastingTime", castingTime: "1 action" },
      {
        op: "appendDescription",
        text: "Sheet: Using this ability spawns a Projected Self illusion token (1 HP). Track concentration, move/cast-from-illusion, and swap reaction on the Combat resources panel.",
      },
    ],
  },
  {
    id: "psion.ability.imaginary_ally",
    pack: "psion",
    target: "proposal_ability",
    match: { name: /^imaginary ally$/i },
    operations: [
      { op: "setCastingTime", castingTime: "1 action" },
      {
        op: "appendDescription",
        text: "Sheet: Using this ability spawns an Imaginary Ally illusion token (1 HP) with a Bonus Action spell-attack proxy (1d8+INT psychic).",
      },
    ],
  },
  {
    id: "psion.ability.flesh_warp",
    pack: "psion",
    target: "proposal_ability",
    match: { name: /^flesh warp$/i },
    operations: [
      { op: "setCastingTime", castingTime: "1 action" },
      {
        op: "appendDescription",
        text: "Sheet: Using this ability grants a Mutation Die (d4) on the Combat resources panel until the start of your next turn. Perfected steps the die up; Muscular auto-applies to Strength without spending. Track ally benefit counts toward CON-mod Exhaustion there.",
      },
    ],
  },
  {
    id: "psion.ability.swollen_muscles",
    pack: "psion",
    target: "proposal_ability",
    match: { name: /^swollen muscles$/i },
    operations: [
      { op: "setCastingTime", castingTime: "1 action" },
      {
        op: "appendDescription",
        text: "Sheet: Using this ability turns on the Swollen Muscles toggle (treat target Strength as equal to your Intelligence until your next turn).",
      },
    ],
  },
  {
    id: "psion.ability.mental_projection",
    pack: "psion",
    target: "proposal_ability",
    match: { name: /^mental projection$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Sheet reminder: harmless illustrative images — no spend. Track duration play-time.",
      },
    ],
  },
  {
    id: "psion.ability.mental_broadcast",
    pack: "psion",
    target: "proposal_ability",
    match: { name: /^mental broadcast$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Sheet reminder: only willing creatures you choose can see your minor illusion / Mental Projection images while this is active — track targets play-time.",
      },
    ],
  },
  {
    id: "psion.ability.psionic_regrowth",
    pack: "psion",
    target: "proposal_ability",
    match: { name: /^psionic regrowth$/i },
    operations: [
      { op: "setCastingTime", castingTime: "1 action" },
      {
        op: "setUses",
        uses: {
          type: "class_resource",
          classResourceKey: "psi_points",
          classResourceAmount: 1,
        },
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "fx_instance",
          idKey: "psionic_regrowth",
          catalogRefId: "cat_fx_heal_self",
          activation: { action: true },
          effects: [
            {
              id: modId("psionic_regrowth"),
              kind: "heal_self",
              healTarget: "choose_ally",
              label: "Psionic Regrowth — spend psi to heal (amount play-time)",
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "Spend psi points to heal; scale healed HP to psi spent play-time if the source scales.",
      },
    ],
  },
  {
    id: "psion.ability.rapid_regeneration",
    pack: "psion",
    target: "proposal_ability",
    match: { name: /^rapid regeneration$/i },
    operations: [
      { op: "setCastingTime", castingTime: "1 bonus action" },
      {
        op: "setUses",
        uses: {
          type: "class_resource",
          classResourceKey: "psi_points",
          classResourceAmount: 1,
        },
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "fx_instance",
          idKey: "rapid_regeneration",
          catalogRefId: "cat_fx_heal_self",
          activation: { bonusAction: true },
          effects: [
            {
              id: modId("rapid_regeneration"),
              kind: "heal_self",
              healTarget: "self",
              label: "Rapid Regeneration — spend psi to heal (amount play-time)",
            },
          ],
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

export const PSION_SEEDS: ContentSeed[] = [
  {
    id: "psion.seed.balance_of_power",
    pack: "psion",
    seedClassResource: {
      className: /psion/i,
      requiresFeatureName: /^balance of power$/i,
      resourceKey: "balance_of_power",
      build: (className) => ({
        class_name: className,
        resource_key: "balance_of_power",
        name: "Balance of Power",
        description:
          "Bank HP restored or temporary HP granted by psionic abilities into this pool (max = Psion level). Expend the pool on a damage roll within 1 minute.",
        uses: {
          type: "at_level",
          atLevelMode: "multiply_level",
          atLevelTable: [{ level: 1, count: 1 }],
          recharges: [{ kind: "real_time", mode: "decay", minutes: 1 }],
        },
      }),
    },
  },
]

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
    match: { className: /alternate\s+ranger/i, name: /^(ranger'?s\s+)?quarry$/i },
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
      requiresFeatureName: /^(ranger'?s\s+)?quarry$/i,
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

/** @deprecated Import from packs/warmage — re-exported for registry compatibility. */
export { WARMAGE_PRESETS } from "@/lib/import/enrichment-presets/packs/warmage"

/** @deprecated Import from packs/dancer — re-exported for registry compatibility. */
export { DANCER_PRESETS } from "@/lib/import/enrichment-presets/packs/dancer"

/** @deprecated Import from packs/vagabond — re-exported for registry compatibility. */
export { VAGABOND_PRESETS } from "@/lib/import/enrichment-presets/packs/vagabond"

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function htmlToPlainFeatureText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim()
}

const MARTYR_SACRIFICE_BENEFITS = ["Sacrificial Strike", "Sacrificial Skill"] as const

/** Pull one named Sacrifice benefit so Strike and Skill can be separate sheet cards. */
export function extractMartyrSacrificeBenefit(
  description: string | null | undefined,
  name: (typeof MARTYR_SACRIFICE_BENEFITS)[number],
): string | null {
  const plain = htmlToPlainFeatureText(description ?? "")
  if (!plain) return null
  const startRe = new RegExp(`${escapeRegExp(name)}\\.?\\s*`, "i")
  const start = plain.search(startRe)
  if (start < 0) return null
  const afterName = plain.slice(start).replace(startRe, "")
  let end = afterName.length
  for (const next of MARTYR_SACRIFICE_BENEFITS) {
    if (next === name) continue
    const idx = afterName.search(new RegExp(`${escapeRegExp(next)}\\.?`, "i"))
    if (idx >= 0 && idx < end) end = idx
  }
  const noteIdx = afterName.search(/Sacrificial Strike\s*\/\s*Sacrificial Skill self-damage/i)
  if (noteIdx >= 0 && noteIdx < end) end = noteIdx
  const body = afterName.slice(0, end).replace(/\s+/g, " ").trim()
  if (!body) return null
  return `<p><strong>${name}.</strong> ${body}</p>`
}

function hideCombinedSacrificeFeature<T extends Feature>(feature: T): T {
  return {
    ...feature,
    sheetDisplay: {
      ...(feature.sheetDisplay ?? {}),
      combatActions: false,
      abilitiesActions: false,
      featuresTab: false,
    },
  }
}

/** Drop leftover 13/17 rows that only say Divine Respite's HD restore amount increases. */
function collapseMartyrDivineRespiteScalingNotes<T extends Feature>(features: T[]): T[] {
  return features.filter((feature) => {
    if (!/^divine respite$/i.test(feature.name)) return true
    const text = feature.description ?? ""
    if (/\bwhen you finish a short rest\b/i.test(text)) return true
    return !/\bincreases to \d+\b/i.test(text)
  })
}

const IMPROVED_STRIKE_FIRST_USE_NOTE =
  "At Martyr level 17, the first time you use your Sacrificial Strike on each of your turns, you can do so without taking a Bonus Action."

function isMartyrImprovedStrikeFirstUseOnly(feature: Feature): boolean {
  const name = feature.name.trim()
  if (/^improved sacrificial strike \(bonus action free\)$/i.test(name)) return true
  if (!/^improved sacrificial strike$/i.test(name)) return false
  const text = feature.description ?? ""
  if (/\bwhen you use this feature\b/i.test(text) || /\btake 10 radiant\b/i.test(text)) return false
  return /\bfirst time you use\b/i.test(text) && /\bwithout taking a bonus action\b/i.test(text)
}

/** Fold the level-17 first-use-free sentence onto Improved Sacrificial Strike. */
function collapseMartyrImprovedSacrificialStrikeNotes<T extends Feature>(features: T[]): T[] {
  const leftover = features.find(isMartyrImprovedStrikeFirstUseOnly)
  const kept = features.filter((feature) => !isMartyrImprovedStrikeFirstUseOnly(feature))
  return kept.map((feature) => {
    if (!/^improved sacrificial strike$/i.test(feature.name)) return feature
    if (/\bwhen you use this feature\b/i.test(feature.description ?? "") === false &&
      /\btake 10 radiant\b/i.test(feature.description ?? "") === false) {
      return feature
    }
    let description = feature.description ?? ""
    if (leftover && !/\bfirst time you use\b/i.test(description)) {
      description = `${description.trim()}\n<p>${IMPROVED_STRIKE_FIRST_USE_NOTE}</p>`
    }
    const activation = feature.activation ?? {}
    if (activation.firstUseNoAction && activation.firstUseNoActionFromLevel === 17 && description === feature.description) {
      return feature
    }
    return {
      ...feature,
      description,
      activation: {
        ...activation,
        firstUseNoAction: true,
        firstUseNoActionFromLevel: 17,
      },
    }
  })
}

/**
 * Martyr's Sacrifice table row bundles two different action economies. Expand it into
 * Sacrificial Strike (Bonus Action) and Sacrificial Skill (Passive) so both live sheets
 * and imports get separate cards without a reimport.
 */
export function expandMartyrSacrificeFeatures<T extends Feature>(
  features: T[],
  className: string,
): T[] {
  if (!/martyr/i.test(className)) return features
  const hasStrike = features.some((feature) => /^sacrificial strike$/i.test(feature.name))
  const hasSkill = features.some((feature) => /^sacrificial skill$/i.test(feature.name))
  if (hasStrike && hasSkill) {
    return collapseMartyrImprovedSacrificialStrikeNotes(
      collapseMartyrDivineRespiteScalingNotes(
        features.map((feature) =>
          /^sacrifice$/i.test(feature.name) &&
          /sacrificial (?:strike|skill)/i.test(feature.description ?? "")
            ? hideCombinedSacrificeFeature(feature)
            : feature,
        ),
      ),
    )
  }

  const expanded: T[] = []
  for (const feature of features) {
    if (!/^sacrifice$/i.test(feature.name)) {
      expanded.push(feature)
      continue
    }
    const strike = extractMartyrSacrificeBenefit(feature.description, "Sacrificial Strike")
    const skill = extractMartyrSacrificeBenefit(feature.description, "Sacrificial Skill")
    if (!strike || !skill) {
      expanded.push(feature)
      continue
    }
    if (!hasStrike) {
      expanded.push({
        ...feature,
        name: "Sacrificial Strike",
        description: strike,
        activation: { bonusAction: true },
        linkedModifiers: undefined,
        sheetDisplay: undefined,
      })
    }
    if (!hasSkill) {
      expanded.push({
        ...feature,
        name: "Sacrificial Skill",
        description: skill,
        activation: undefined,
        linkedModifiers: undefined,
        sheetDisplay: undefined,
      })
    }
  }
  return collapseMartyrImprovedSacrificialStrikeNotes(
    collapseMartyrDivineRespiteScalingNotes(expanded),
  )
}

const SACRIFICIAL_SKILL_ROLLS = [
  { rollKind: "attack" as const, checkCategory: "attack" as const },
  { rollKind: "ability" as const, checkCategory: "ability" as const },
  { rollKind: "skill" as const, checkCategory: "skill" as const },
  { rollKind: "save" as const, checkCategory: "save" as const },
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
        text: "The sheet deducts Hit Point Spellcasting damage from current HP when you cast a level 1+ Martyr spell (bypasses Temporary Hit Points; ignores Resistance and Immunity). Spell Uses are a separate long-rest pool. Do not invent normal spell-slot progression.",
      },
    ],
  },
  {
    id: "martyr.class.miraculous_healing",
    pack: "martyr",
    target: "class_feature",
    match: { className: /martyr/i, name: /^miraculous healing$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true, spendHitDice: 1 } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "attachNamedPreset",
        skipIfEffectKinds: ["heal_self"],
        preset: {
          kind: "fx_instance",
          idKey: "miraculous_healing",
          catalogRefId: "cat_fx_heal_self",
          activation: { bonusAction: true, spendHitDice: 1 },
          effects: [
            {
              id: "mod_miraculous_healing",
              kind: "heal_self",
              healTarget: "self",
              healMode: "hit_dice",
              healDiceCount: 1,
              healAbility: "CON",
              bonusByLevel: [
                { level: 1, mode: "fixed", fixed: 1 },
                { level: 5, mode: "fixed", fixed: 2 },
                { level: 11, mode: "fixed", fixed: 3 },
                { level: 17, mode: "fixed", fixed: 4 },
              ],
              label: "Hit Point Dice + CON",
            },
          ],
        },
      },
    ],
  },
  {
    id: "martyr.class.reprisal",
    pack: "martyr",
    target: "class_feature",
    match: { className: /martyr/i, name: /^reprisal$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "attachNamedPreset",
        skipIfCharacteristicTypes: ["special_attack"],
        preset: {
          kind: "char_instance",
          idKey: "reprisal",
          catalogRefId: "cat_char_special_attack",
          characteristics: [
            {
              id: "mod_reprisal",
              type: "special_attack",
              attackName: "Reprisal",
              icon: "crossed-swords",
              targetMode: "single",
              rangeFeet: 5,
              properties: ["Special"],
              damageTypes: ["Necrotic", "Radiant"],
              chooseDamageType: true,
              damageDiceCount: 1,
              damageDieType: "d6",
              damageByLevel: [
                { level: 1, mode: "dice", dieCount: 1, dieType: "d6" },
                { level: 5, mode: "dice", dieCount: 2, dieType: "d6" },
                { level: 11, mode: "dice", dieCount: 3, dieType: "d6" },
                { level: 17, mode: "dice", dieCount: 4, dieType: "d6" },
              ],
              label: "Reaction: halve incoming damage; 1d6 Necrotic or Radiant",
            },
          ],
        },
      },
    ],
  },
  {
    id: "martyr.class.undying",
    pack: "martyr",
    target: "class_feature",
    match: { className: /martyr/i, name: /^undying$/i },
    operations: [
      {
        op: "setActivation",
        activation: {
          onDropToZeroHp: true,
          alsoActivateFeatureNames: ["Miraculous Healing"],
        },
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
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
  {
    id: "martyr.class.sacrificial_strike",
    pack: "martyr",
    target: "class_feature",
    match: { className: /martyr/i, name: /^sacrificial strike$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true, spendHitPoints: 5 } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "attachNamedPreset",
        skipIfEffectKinds: ["extra_damage_on_hit"],
        preset: {
          kind: "fx_instance",
          idKey: "sacrificial_strike",
          catalogRefId: effectCatalogRefId("extra_damage_on_hit"),
          activation: { bonusAction: true, spendHitPoints: 5 },
          effects: [
            {
              id: "mod_sacrificial_strike",
              kind: "extra_damage_on_hit",
              damageTypes: ["Radiant"],
              bonusConfig: { mode: "fixed", fixed: 10 },
              bonusAmount: 10,
              label: "+10 Radiant (take 5 Radiant)",
            },
          ],
        },
      },
    ],
  },
  {
    id: "martyr.class.sacrificial_skill",
    pack: "martyr",
    target: "class_feature",
    match: { className: /martyr/i, name: /^sacrificial skill$/i },
    operations: [
      { op: "setActivation", activation: { oncePerTurn: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "attachNamedPreset",
        skipIfCharacteristicTypes: ["failed_roll_trigger"],
        preset: {
          kind: "char_instance",
          idKey: "sacrificial_skill",
          catalogRefId: characteristicCatalogRefId("failed_roll_trigger"),
          characteristics: SACRIFICIAL_SKILL_ROLLS.map(({ rollKind, checkCategory }) => ({
            id: `mod_sacrificial_skill_${rollKind}`,
            type: "failed_roll_trigger",
            triggerOn: "fail",
            rollKind,
            targetScope: "self",
            useReaction: false,
            spendResourceKey: "hit_points",
            spendResourceAmount: 10,
            refundResourceOnStillFailed: true,
            label: "When you fail a D20 Test: +5 (take 10 Radiant; no damage if still a failure)",
            effect: {
              catalogRefId: effectCatalogRefId("check_roll_modifier"),
              activation: {
                effects: [
                  {
                    id: `mod_sacrificial_skill_${rollKind}_bonus`,
                    kind: "check_roll_modifier",
                    checkRollMode: "bonus",
                    checkCategory,
                    bonusConfig: { mode: "fixed", fixed: 5 },
                    label: "+5 to the failed D20 Test",
                  },
                ],
              },
            },
          })),
        },
      },
    ],
  },
  {
    id: "martyr.class.divine_respite",
    pack: "martyr",
    target: "class_feature",
    match: { className: /martyr/i, name: /^divine respite$/i, description: /when you finish a short rest/i },
    operations: [
      {
        op: "setSheetDisplay",
        sheetDisplay: {
          abilitiesActions: false,
          combatActions: false,
          featuresTab: true,
          restDialogues: true,
        },
      },
      {
        op: "setLimitedUses",
        uses: { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
      },
      {
        op: "setActivation",
        activation: { action: true, noEconomyCost: true },
      },
      {
        op: "attachNamedPreset",
        skipIfCharacteristicTypes: ["hit_dice_restore"],
        preset: {
          kind: "char_instance",
          idKey: "divine_respite",
          catalogRefId: characteristicCatalogRefId("hit_dice_restore"),
          characteristics: [
            {
              id: "mod_divine_respite",
              type: "hit_dice_restore",
              amount: 3,
              amountByLevel: [
                { level: 9, mode: "fixed", fixed: 3 },
                { level: 13, mode: "fixed", fixed: 6 },
                { level: 17, mode: "fixed", fixed: 10 },
              ],
              restoreOn: "short_rest",
              label: "Divine Respite",
            },
          ],
        },
      },
    ],
  },
  {
    id: "martyr.class.improved_sacrificial_strike",
    pack: "martyr",
    target: "class_feature",
    match: {
      className: /martyr/i,
      name: /^improved sacrificial strike$/i,
      description: /when you use this feature|take 10 radiant/i,
    },
    operations: [
      {
        op: "setSheetDisplay",
        sheetDisplay: { featuresTab: true, combatActions: true, abilitiesActions: false },
      },
      {
        op: "setActivation",
        activation: {
          bonusAction: true,
          spendHitPoints: 10,
          firstUseNoAction: true,
          firstUseNoActionFromLevel: 17,
        },
      },
      {
        op: "attachNamedPreset",
        skipIfCharacteristicTypes: ["replace_feature"],
        replaceCharacteristicTypes: ["power_rider"],
        preset: {
          kind: "char_instance",
          idKey: "improved_sacrificial_strike_replace",
          catalogRefId: characteristicCatalogRefId("replace_feature"),
          characteristics: [
            {
              id: "mod_improved_sacrificial_strike_replace",
              type: "replace_feature",
              replacedFeatureNames: ["Sacrificial Strike"],
              label: "Replaces Sacrificial Strike",
            },
          ],
        },
      },
      {
        op: "attachNamedPreset",
        skipIfEffectKinds: ["extra_damage_on_hit"],
        preset: {
          kind: "fx_instance",
          idKey: "improved_sacrificial_strike",
          catalogRefId: effectCatalogRefId("extra_damage_on_hit"),
          activation: {
            bonusAction: true,
            spendHitPoints: 10,
            firstUseNoAction: true,
            firstUseNoActionFromLevel: 17,
          },
          effects: [
            {
              id: "mod_improved_sacrificial_strike_damage",
              kind: "extra_damage_on_hit",
              damageTypes: ["Radiant"],
              bonusConfig: { mode: "fixed", fixed: 20 },
              bonusAmount: 20,
              label: "+20 Radiant (take 10 Radiant)",
            },
          ],
        },
      },
    ],
  },
  {
    id: "martyr.class.sacrifice_foe",
    pack: "martyr",
    target: "class_feature",
    match: { className: /martyr/i, name: /^sacrifice foe$/i },
    operations: [
      {
        op: "setSheetDisplay",
        sheetDisplay: { featuresTab: true, combatActions: false, abilitiesActions: false },
      },
      {
        op: "attachNamedPreset",
        skipIfCharacteristicTypes: ["power_rider"],
        preset: {
          kind: "char_instance",
          idKey: "sacrifice_foe",
          catalogRefId: characteristicCatalogRefId("power_rider"),
          characteristics: [
            {
              id: "mod_sacrifice_foe",
              type: "power_rider",
              parentPowerNames: ["Sacrificial Strike", "Sacrificial Skill"],
              alertSummary:
                "If the improved attack or damage roll reduces an enemy to 0 Hit Points, you don't take Radiant damage from using Sacrifice.",
              label: "Sacrifice Foe",
            },
          ],
        },
      },
    ],
  },
]

/** Patch already-wired Sacrifice rows so live sheets spend current HP without reimport. */
export function applyMartyrHitPointSpends<T extends Feature>(feature: T, className: string): T {
  if (!/martyr/i.test(className)) return feature
  if (/^sacrificial strike$/i.test(feature.name)) {
    if ((feature.activation?.spendHitPoints ?? 0) > 0) return feature
    return {
      ...feature,
      activation: { ...(feature.activation ?? {}), bonusAction: true, spendHitPoints: 5 },
    }
  }
  if (!/^sacrificial skill$/i.test(feature.name)) return feature
  const modifiers = feature.linkedModifiers
  if (!modifiers?.length) return feature
  let changed = false
  const linkedModifiers = modifiers.map((instance) => ({
    ...instance,
    characteristics: instance.characteristics?.map((characteristic) => {
      if (characteristic.type !== "failed_roll_trigger") return characteristic
      if (characteristic.spendResourceKey === "hit_points" && (characteristic.spendResourceAmount ?? 0) > 0) {
        return characteristic
      }
      changed = true
      return {
        ...characteristic,
        spendResourceKey: "hit_points",
        spendResourceAmount: characteristic.spendResourceAmount ?? 10,
        refundResourceOnStillFailed: true,
      }
    }),
  }))
  return changed ? { ...feature, linkedModifiers } : feature
}

export const NECROMANCER_PRESETS: EnrichmentPreset[] = [
  {
    id: "necromancer.class.thralls",
    pack: "necromancer",
    target: "class_feature",
    match: { className: /necromancer/i, name: /^thralls$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Import Undead Thralls as creatures[] first. Prefer mechanics grant_creature with creatureChoiceOptions for Skeleton, Zombie, Spirit, and other thrall names. Thralls / CR Total columns are control caps (special), not spendable pools — never optionsSource class_upgrades.",
      },
      {
        op: "setSheetDisplay",
        sheetDisplay: { featuresTab: true, restDialogues: true },
      },
    ],
  },
  {
    id: "necromancer.class.dead_space",
    pack: "necromancer",
    target: "class_feature",
    match: { className: /necromancer/i, name: /^dead space$/i },
    operations: [
      { op: "setActivation", activation: { action: true } },
      {
        op: "setSheetDisplay",
        sheetDisplay: { abilitiesActions: true, featuresTab: true },
      },
    ],
  },
  {
    id: "necromancer.class.charnel_touch",
    pack: "necromancer",
    target: "class_feature",
    match: { className: /necromancer/i, name: /^charnel touch$/i },
    operations: [
      { op: "setActivation", activation: { action: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "setLimitedUses",
        uses: {
          type: "class_resource",
          classResourceKey: "charnel_touch",
          classResourceAmount: 5,
          classResourceCostMode: "up_to_proficiency_bonus",
        },
      },
      {
        op: "appendDescription",
        text: "Spend from class_resources.charnel_touch (5 × Necromancer level, long rest). Per-use cap is 5 × Proficiency Bonus — track spend amount play-time.",
      },
    ],
  },
  {
    id: "necromancer.class.dark_arcana",
    pack: "necromancer",
    target: "class_feature",
    match: { className: /necromancer/i, name: /^dark arcana$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Expend a spell slot to restore Charnel Touch points (INT mod + 1d8 per slot level) — play-time restore into the charnel_touch pool.",
      },
    ],
  },
  {
    id: "necromancer.class.undying_servitude",
    pack: "necromancer",
    target: "class_feature",
    match: { className: /necromancer/i, name: /^undying servitude$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "necromancer.class.lichdom",
    pack: "necromancer",
    target: "class_feature",
    match: { className: /necromancer/i, name: /^lichdom$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "lichdom_damage_immunity",
          catalogRefId: "cat_char_damage_immunity",
          characteristics: [
            {
              id: "mod_lichdom_damage_immunity",
              type: "damage_immunity",
              damageTypes: ["Necrotic", "Poison"],
              label: "Lichdom undead immunities",
            },
          ],
        },
        replaceCharacteristicTypes: ["damage_resistance", "damage_immunity"],
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "lichdom_condition_immunity",
          catalogRefId: "cat_char_condition_immunity",
          characteristics: [
            {
              id: "mod_lichdom_condition_immunity",
              type: "condition_immunity",
              conditions: ["Exhaustion", "Poisoned"],
              label: "Lichdom condition immunities",
            },
          ],
        },
        replaceCharacteristicTypes: ["condition_immunity"],
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "lichdom_truesight",
          catalogRefId: "cat_char_vision",
          characteristics: [
            {
              id: "mod_lichdom_truesight",
              type: "vision",
              visionType: "truesight",
              rangeFeet: 120,
              label: "Lichdom Truesight",
            },
          ],
        },
        replaceCharacteristicTypes: ["vision"],
      },
      {
        op: "appendDescription",
        text: "Creature type Undead, Turn Undead immunity, and Spirit Jar rejuvenation stay narrative/play-time.",
      },
    ],
  },
  {
    id: "necromancer.subclass.lazarus_bolt",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^lazarus bolt$/i },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 1,
          recharges: [{ rest: "long_rest" }],
          restoreByResource: { resourceKey: "charnel_touch", resourceAmount: 20, restores: 1 },
        },
      },
      { op: "setActivation", activation: { action: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "necromancer.subclass.vampiric_transformation",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^vampiric transformation$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "vampiric_transformation_mist_speed",
          catalogRefId: "cat_char_speed",
          characteristics: [
            {
              id: "mod_vampiric_transformation_mist_speed",
              type: "speed",
              speedType: "fly",
              mode: "set",
              value: 20,
              customType: "hover",
              requiresSheetToggle: "vampiric_mist_form",
            },
          ],
        },
        replaceCharacteristicTypes: ["speed"],
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "vampiric_transformation_mist_resistance",
          catalogRefId: "cat_char_damage_resistance",
          characteristics: [
            {
              id: "mod_vampiric_transformation_mist_resistance",
              type: "damage_resistance",
              damageTypes: ["Bludgeoning", "Piercing", "Slashing"],
              requiresSheetToggle: "vampiric_mist_form",
            },
          ],
        },
        replaceCharacteristicTypes: ["damage_resistance"],
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "vampiric_transformation_mist_immunity",
          catalogRefId: "cat_char_condition_immunity",
          characteristics: [
            {
              id: "mod_vampiric_transformation_mist_immunity",
              type: "condition_immunity",
              conditions: ["Prone"],
              requiresSheetToggle: "vampiric_mist_form",
            },
          ],
        },
        replaceCharacteristicTypes: ["condition_immunity"],
      },
      { op: "setActivation", activation: { action: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "necromancer.subclass.charnel_aura",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^charnel aura$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "necromancer.subclass.sacrificial_thralls",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^sacrificial thralls$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "necromancer.subclass.tyrant",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^tyrant(?:\s+\[lichdom\])?$/i },
    operations: [
      { op: "setActivation", activation: { action: true, onDropToZeroHp: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "necromancer.subclass.charnel_empower",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^charnel empower$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "charnel_empower_necromancy",
          catalogRefId: "cat_char_on_cast_spell_trigger",
          characteristics: [
            {
              id: "mod_charnel_empower_necromancy",
              type: "on_cast_spell_trigger",
              spellTags: [],
              spellSchool: "Necromancy",
              effect: null,
              label: "Spend Charnel Touch points for equal extra Necrotic damage",
            },
          ],
        },
      },
    ],
  },
  {
    id: "necromancer.subclass.frightening_gaze",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^chilling disposition$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "necromancer.subclass.archlich",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^archlich(?:\s+\[lichdom\])?$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "archlich_paralyzing_touch",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_archlich_paralyzing_touch",
              type: "power_rider",
              parentPowerNames: ["Charnel Touch"],
              alertSummary:
                "Charnel Touch dealing 30+ damage Paralyzes the target until the start of your next turn.",
            },
          ],
        },
        // The prose detector sees Devour Soul's once-per-rest sentence, but that limit must not
        // cap Magic Resistance or Paralyzing Touch on this multi-benefit feature.
        replaceCharacteristicTypes: ["uses"],
      },
      { op: "clearLimitedUses" },
    ],
  },
  {
    id: "necromancer.subclass.thrall_rush",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^thrall rush$/i },
    operations: [
      { op: "setActivation", activation: { onInitiative: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "necromancer.subclass.overcharged_thralls",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^overcharged thralls$/i },
    operations: [
      {
        op: "attachNamedPreset",
        skipIfCharacteristicTypes: ["on_creature_death_trigger"],
        preset: {
          kind: "char_instance",
          idKey: "overcharged_thralls_death",
          catalogRefId: "cat_char_on_creature_death_trigger",
          characteristics: [
            {
              id: "mod_overcharged_thralls_death",
              type: "on_creature_death_trigger",
              creatureFilter: "ally",
              rangeFeet: 120,
              useReaction: false,
              effect: {
                catalogRefId: "cat_fx_class_resource",
                activation: {
                  effects: [
                    {
                      id: "mod_overcharged_thralls_restore",
                      kind: "class_resource",
                      classResourceKey: "charnel_touch",
                      classResourceChange: "increase",
                      label: "Regain Charnel Touch equal to your Necromancer level",
                    },
                  ],
                },
              },
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "When a thrall dies or is released, restore Charnel Touch points equal to your Necromancer level (play-time restore into the charnel_touch pool).",
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "necromancer.subclass.death_knight_extra_attack",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^extra attack$/i },
    operations: [
      {
        op: "attachNamedPreset",
        skipIfCharacteristicTypes: ["power_rider"],
        preset: {
          kind: "char_instance",
          idKey: "death_knight_cantrip_attack",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_death_knight_cantrip_attack",
              type: "power_rider",
              parentPowerNames: ["Attack"],
              alertSummary:
                "You can replace one of the attacks with a cantrip that has a casting time of an action.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "necromancer.subclass.pharaoh_channel_divinity",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^channel divinity$/i },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 2,
          recharges: [{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }],
          useShareKey: "pharaoh_channel_divinity",
          restoreByResource: {
            resourceKey: "charnel_touch",
            resourceAmount: 15,
            restores: 1,
          },
        },
      },
      { op: "setActivation", activation: { action: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "necromancer.subclass.scarab_of_judgement",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^scarab of judgement$/i },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 2,
          recharges: [{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }],
          useShareKey: "pharaoh_channel_divinity",
          restoreByResource: {
            resourceKey: "charnel_touch",
            resourceAmount: 15,
            restores: 1,
          },
        },
      },
      { op: "setActivation", activation: { action: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "necromancer.subclass.mummy_lord_whirlwind",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^mummy lord(?:\s+\[lichdom\])?$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "mummy_lord_whirlwind_reminder",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_mummy_lord_whirlwind_reminder",
              type: "power_rider",
              parentPowerNames: ["Mummy Lord [Lichdom]", "Mummy Lord"],
              alertSummary:
                "Whirlwind of Sand: move 60 feet while immune to damage and listed conditions.",
            },
          ],
        },
        replaceCharacteristicTypes: ["condition_immunity"],
      },
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "necromancer.subclass.necrotoxin",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^necrotoxin$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "necrotoxin_reminder",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_necrotoxin_reminder",
              type: "power_rider",
              parentPowerNames: ["Charnel Touch"],
              alertSummary:
                "Your Poison damage and Poisoned effects ignore Poison Resistance and Poisoned Immunity.",
            },
          ],
        },
        replaceCharacteristicTypes: ["damage_resistance", "condition_immunity"],
      },
    ],
  },
  {
    id: "necromancer.subclass.projectile_spew",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^projectile spew$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "projectile_spew_reminder",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_projectile_spew_reminder",
              type: "power_rider",
              parentPowerNames: ["Charnel Touch"],
              alertSummary:
                "Charnel Touch and Necromancer spells with Touch range gain 10 feet of reach.",
            },
          ],
        },
        replaceCharacteristicTypes: ["weapon_reach_modifier"],
      },
    ],
  },
  {
    id: "necromancer.subclass.corpulent_lich",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^corpulent lich(?:\s+\[lichdom\])?$/i },
    operations: [
      { op: "setActivation", activation: { onDropToZeroHp: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "necromancer.subclass.quick_stitch",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^quick stitch$/i },
    operations: [
      { op: "setActivation", activation: { action: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "necromancer.subclass.spell_stitching",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^spell-stitching$/i },
    operations: [
      { op: "setCastingTime", castingTime: "1 hour (during a Short or Long Rest)" },
      { op: "setSheetDisplay", sheetDisplay: { abilitiesActions: true, featuresTab: true } },
    ],
  },
  {
    id: "necromancer.subclass.patchwork_golem",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^patchwork golem(?:\s+\[lichdom\])?$/i },
    operations: [
      { op: "setActivation", activation: { action: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "necromancer.subclass.umbral_form",
    pack: "necromancer",
    target: "subclass_feature",
    match: { subclassClassName: /necromancer/i, name: /^umbral form$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "umbral_form_reminder",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_umbral_form_reminder",
              type: "power_rider",
              parentPowerNames: ["Umbral Form"],
              alertSummary:
                "While active: attacks against you have Disadvantage; Darkness can conceal you from Darkvision.",
            },
          ],
        },
        replaceCharacteristicTypes: ["damage_resistance", "uses"],
      },
      { op: "clearLimitedUses" },
      { op: "setActivation", activation: { action: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
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
    id: "mhp_warden.subclass.interdict",
    pack: "mhp_warden",
    target: "subclass_feature",
    match: { className: /warden/i, name: /^interdict$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "fx_instance",
          idKey: "interdict_init",
          catalogRefId: "cat_fx_class_resource",
          effects: [
            {
              id: "mod_interdict_init",
              kind: "class_resource",
              classResourceKey: "interrupt",
              classResourceChange: "reset",
              resourceRefreshOnInitiative: true,
              classResourceAmount: 1,
              label: "Regain 1 Interrupt on Initiative",
            },
          ],
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
              icon: "dragon-breath",
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
              icon: "stone-block",
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
