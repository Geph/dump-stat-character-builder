/**
 * Name presets for KibblesTasty crafting / Psion / Inventor / Farling / Ironwrought feats.
 * Merged into CUSTOM_FEAT_MODIFIER_PRESETS so import + load enrich apply them.
 */
import type { FeatModifierPreset } from "@/lib/compendium/feat-modifier-presets"
import {
  asiOne,
  bonusActionAttackFx,
  checkFx,
  damageResistanceChoice,
  spellsKnown,
  toolProf,
  uses,
  weaponProf,
  FEAT_MODIFIER_CATALOG,
} from "@/lib/compendium/feat-modifier-presets"
import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"

function toolsPoolChoice(
  key: string,
  count: number,
  label: string,
  options?: {
    toolChoicePool?: "all" | "artisans" | "musical" | "gaming" | "other" | "vehicle"
    grantExpertise?: boolean
  },
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.toolProficiencies, [
    {
      id: modId(key),
      type: "tool_proficiencies",
      values: [],
      choiceCount: count,
      toolChoicePool: options?.toolChoicePool ?? "all",
      grantExpertise: options?.grantExpertise ?? false,
      label,
    },
  ])
}

function skillCheckAlternate(
  key: string,
  ability: "intelligence" | "wisdom",
  label: string,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, "cat_char_skill_check_alternate_ability", [
    {
      id: modId(key),
      type: "skill_check_alternate_ability",
      ability,
      skills: [],
      label,
    },
  ])
}

/** Discipline / talent / upgrade pick shell on a feat. */
function poolChoice(
  category: string,
  optionsSource: NonNullable<import("@/lib/types").FeatureChoice["optionsSource"]>,
  count = 1,
  resourceKey?: string | null,
): Pick<FeatModifierPreset, "isChoice" | "choices"> {
  return {
    isChoice: true,
    choices: {
      category,
      count,
      options: [],
      optionsSource,
      ...(resourceKey ? { resourceKey } : {}),
    },
  }
}

export const KIBBLES_FEAT_MODIFIER_PRESETS: Record<string, FeatModifierPreset> = {
  // —— Crafting ——
  "Adept Poisoner": {
    linkedModifiers: [
      toolProf("adept_poisoner_kit", "Poisoner's Kit", "Poisoner's Kit proficiency"),
      uses(
        "adept_poisoner_doses",
        { type: "proficiency", recharges: [{ rest: "long_rest" }] },
        "Potent poison doses (PB / Long Rest)",
      ),
    ],
  },
  "Expert Alchemist": {
    linkedModifiers: [
      asiOne("expert_alchemist_asi", "+1 Intelligence or Wisdom", ["intelligence", "wisdom"]),
      toolProf("expert_alchemist_tools", "Alchemist's Supplies", "Alchemist's Supplies proficiency"),
    ],
  },
  "Expert Blacksmith": {
    linkedModifiers: [
      asiOne("expert_blacksmith_asi", "+1 Strength", ["strength"]),
      toolProf("expert_blacksmith_tools", "Smith's Tools", "Smith's Tools proficiency"),
    ],
  },
  "Expert Cook": {
    linkedModifiers: [
      asiOne("expert_cook_asi", "+1 Wisdom", ["wisdom"]),
      toolProf("expert_cook_tools", "Cook's Utensils", "Cook's Utensils proficiency"),
    ],
  },
  "Expert Tinkerer": {
    linkedModifiers: [
      asiOne("expert_tinkerer_asi", "+1 Intelligence", ["intelligence"]),
      toolProf("expert_tinkerer_tools", "Tinker's Tools", "Tinker's Tools proficiency"),
    ],
  },
  "Tool Expert": {
    linkedModifiers: [
      asiOne("tool_expert_asi", "+1 to one ability score"),
      toolsPoolChoice("tool_expert_prof", 1, "Tool Proficiency"),
      toolsPoolChoice("tool_expert_expertise", 1, "Expertise with one tool you have proficiency in", {
        grantExpertise: true,
      }),
    ],
  },
  "Ultimate Improviser": {
    linkedModifiers: [
      asiOne("ultimate_improviser_asi", "+1 to one ability score"),
      checkFx(
        "ultimate_improviser_tools",
        {
          kind: "check_bonus",
          checkCategory: "other",
          bonusConfig: { mode: "proficiency", multiplier: 0.5 },
        },
        {},
      ),
    ],
  },
  Resourceful: {
    linkedModifiers: [
      weaponProf("resourceful_improvised", "specific", ["Improvised Weapons"], "Improvised weapon proficiency"),
    ],
  },
  "Old Hand": {
    linkedModifiers: [
      skillCheckAlternate(
        "old_hand_int",
        "intelligence",
        "Use Intelligence for a crafting branch (related tool proficiency)",
      ),
      skillCheckAlternate(
        "old_hand_wis",
        "wisdom",
        "Use Wisdom for a crafting branch (related tool proficiency)",
      ),
    ],
  },
  "Magical Researcher": {
    linkedModifiers: [
      spellsKnown("magical_researcher_scrolls", {
        spells: [],
        label: "Scroll / magic-item crafting (cast scrolls off-list; damage-type swap)",
      }),
    ],
  },
  "Soul Investor": {
    linkedModifiers: [
      uses(
        "soul_investor_infusion",
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Soul-infused magic item (1 at a time; does not count against attunement limit)",
      ),
    ],
  },
  "Wand Slinger": {
    linkedModifiers: [bonusActionAttackFx("wand_slinger_ba_attack")],
  },
  "School Specialist": {
    linkedModifiers: [
      spellsKnown("school_specialist_spell", {
        spells: [],
        choiceGrants: [{ level: 1, count: 1 }, { level: 2, count: 1 }],
        playerPicksSpellList: true,
        label: "Learn one spell of the chosen school",
      }),
      uses(
        "school_specialist_cantrip_ba",
        { type: "proficiency", recharges: [{ rest: "long_rest" }] },
        "School cantrip as Bonus Action (as 1st-level caster; PB / Long Rest)",
      ),
    ],
  },

  // —— Psion ——
  "Psionic Adept": {
    ...poolChoice("Psionic Discipline", "class_disciplines", 1),
    linkedModifiers: [
      uses(
        "psionic_adept_psi",
        {
          type: "fixed",
          fixedAmount: 1,
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
        },
        "1 psi point (empower the gained discipline; Short or Long Rest)",
      ),
    ],
  },
  "Psionic Mind": {
    ...poolChoice("Psionic Talent", "known_discipline_talents", 1),
    linkedModifiers: [],
  },
  "War Psion": {
    linkedModifiers: [
      checkFx(
        "war_psion_concentration",
        {
          kind: "check_advantage",
          checkCategory: "save",
          checkAbility: "constitution",
        },
        {},
      ),
    ],
  },
  "Inner Power": {
    linkedModifiers: [
      uses(
        "inner_power_points",
        {
          type: "fixed",
          fixedAmount: 2,
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
        },
        "+2 psi or ki points (choose which maximum; Short or Long Rest)",
      ),
    ],
  },

  // —— Inventor ——
  "Innovator's Upgrade": {
    ...poolChoice("Upgrade", "class_upgrades", 1, "upgrades"),
    linkedModifiers: [],
  },
  "Innovators Upgrade": {
    ...poolChoice("Upgrade", "class_upgrades", 1, "upgrades"),
    linkedModifiers: [],
  },
  "Mental Adaptability": {
    ...poolChoice("Upgrade", "class_upgrades", 1, "upgrades"),
    linkedModifiers: [
      uses(
        "mental_adaptability_save",
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Roll INT/WIS/CHA saves and use the highest (1 / Long Rest)",
      ),
    ],
  },
  "Rune Expert": {
    ...poolChoice("Runic Mark", "class_upgrades", 1, "upgrades"),
    linkedModifiers: [],
  },

  // —— Ironwrought ——
  Upgraded: {
    ...poolChoice("Upgrade", "class_upgrades", 1, "upgrades"),
    linkedModifiers: [],
  },
  Specialized: {
    isChoice: true,
    choices: {
      category: "Modular Design",
      count: 2,
      options: [],
    },
    linkedModifiers: [
      uses(
        "specialized_modular",
        { type: "fixed", fixedAmount: 2, recharges: [{ rest: "long_rest" }] },
        "Two additional Modular Design options",
      ),
    ],
  },
  Subsystem: {
    linkedModifiers: [
      uses(
        "subsystem_concentration",
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Subsystem maintains concentration on one cantrip",
      ),
    ],
  },

  // —— Farling ——
  "Alien Weapon Training": {
    linkedModifiers: [
      weaponProf(
        "alien_weapon_training",
        "specific",
        [],
        "Proficiency with one weapon of your choice (+ one added property)",
      ),
    ],
  },
  "Aquatic Adaptation": {
    linkedModifiers: [
      asiOne("aquatic_adaptation_asi", "+1 Constitution", ["constitution"]),
      charInstance("modinst_aquatic_adaptation_swim", FEAT_MODIFIER_CATALOG.speed, [
        {
          id: modId("aquatic_adaptation_swim"),
          type: "speed",
          speedType: "swim",
          mode: "set",
          value: 40,
          label: "Swim speed 40 ft.",
        },
      ]),
      damageResistanceChoice(
        "aquatic_adaptation_resist",
        ["Acid", "Cold"],
        "Resistance to acid or cold (choose one)",
      ),
    ],
  },
  "Flexible Form": {
    linkedModifiers: [
      damageResistanceChoice(
        "flexible_form_resist",
        ["Acid", "Cold", "Fire", "Lightning", "Poison"],
        "Adapt resistance (one type; replaces previous from this feat)",
      ),
      spellsKnown("flexible_form_alter_self", {
        spells: [{ spellId: "Alter Self", alwaysPrepared: true }],
        freeCastPerLongRest: [{ spellName: "Alter Self", count: 1 }],
        label: "Alter Self (1 free cast / Short or Long Rest, then slot)",
      }),
    ],
  },
  "Spell Library": {
    linkedModifiers: [
      spellsKnown("spell_library_bonus", {
        spells: [],
        choiceGrants: [{ level: 1, count: 1 }],
        playerPicksSpellList: true,
        label: "Extra spells known/prepared equal to Proficiency Bonus (chosen class)",
      }),
    ],
  },
}
