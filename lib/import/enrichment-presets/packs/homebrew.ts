import type { ContentSeed, EnrichmentPreset } from "@/lib/import/enrichment-presets/types"
import {
  buildQuarryClassResource,
} from "@/lib/import/enrichment-presets/builders"

const DEFERRED_MECHANICS_NOTE =
  "Mechanic not fully modeled on sheet — see feature description (Dark Lurker check reduction)."

const RAMPAGE_DIE_DEFERRED_NOTE =
  "Rampage Die state is tracked manually: begin at d4, increase one die step after consecutive turns dealing damage (maximum d12), and reset to d4 after a turn without damage or when Incapacitated. Automatic die stepping and Tantrum's initiative/on-damage increases are not yet modeled."

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
          category: "Skills",
          count: 2,
          options: [],
          swappableOnRest: true,
          swapRestType: "long",
        },
      },
      {
        op: "appendDescription",
        text: "Half proficiency bonus (rounded down) on chosen skills until next long rest.",
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
