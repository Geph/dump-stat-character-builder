import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { isSrdSource } from "@/lib/srd/source"
import type { FeatureActivation, UsesConfig } from "@/lib/types"

/** Catalog entry ids from buildDefaultModifierCatalog (cat_char_* / cat_fx_*). */
export const FEAT_MODIFIER_CATALOG = {
  abilityScores: "cat_char_ability_scores",
  skills: "cat_char_skills",
  toolProficiencies: "cat_char_tool_proficiencies",
  initiative: "cat_char_initiative",
  ac: "cat_char_ac",
  attackRollModifiers: "cat_char_attack_roll_modifiers",
  damageRollModifiers: "cat_char_damage_roll_modifiers",
  damageResistance: "cat_char_damage_resistance",
  vision: "cat_char_vision",
  spellsKnown: "cat_char_spells_known",
  spellcastingAbility: "cat_char_spellcasting_ability",
  uses: "cat_char_uses",
  healSelf: "cat_fx_heal_self",
  riderDamage: "cat_fx_rider_damage",
  checkAdvantage: "cat_fx_check_advantage",
  checkBonus: "cat_fx_check_bonus",
  extraAction: "cat_fx_extra_action",
  movementOption: "cat_fx_movement_option",
  selfBuffCaster: "cat_fx_self_buff_caster",
  damageReduction: "cat_fx_damage_reduction",
} as const

function modId(key: string): string {
  return `mod_${key}`
}

function charInstance(
  instanceId: string,
  catalogRefId: string,
  characteristics: CharacteristicModifier[],
): LinkedModifierInstance {
  return { instanceId, catalogRefId, characteristics }
}

function fxInstance(
  instanceId: string,
  catalogRefId: string,
  activation: FeatureActivation,
): LinkedModifierInstance {
  return { instanceId, catalogRefId, activation }
}

function asiPool(instanceId: string, points = 2, label?: string): LinkedModifierInstance {
  return charInstance(instanceId, FEAT_MODIFIER_CATALOG.abilityScores, [
    {
      id: modId(`${instanceId}_asi`),
      type: "ability_scores",
      mode: "asi_pool",
      points,
      bonuses: {},
      label,
    },
  ])
}

function usesInstance(
  instanceId: string,
  uses: UsesConfig,
  label?: string,
): LinkedModifierInstance {
  return charInstance(instanceId, FEAT_MODIFIER_CATALOG.uses, [
    {
      id: modId(`${instanceId}_uses`),
      type: "uses",
      uses,
      label,
    },
  ])
}

type FeatModifierPreset = {
  linkedModifiers: LinkedModifierInstance[]
  repeatable?: boolean
}

/** SRD feat name → common modifier presets (linked catalog entries with inline config). */
export const SRD_FEAT_MODIFIER_PRESETS: Record<string, FeatModifierPreset> = {
  Alert: {
    linkedModifiers: [
      charInstance("modinst_alert_initiative", FEAT_MODIFIER_CATALOG.initiative, [
        {
          id: modId("alert_initiative"),
          type: "initiative",
          mode: "add_proficiency",
          label: "Add proficiency bonus to initiative",
        },
      ]),
    ],
  },
  "Magic Initiate": {
    repeatable: true,
    linkedModifiers: [
      charInstance("modinst_magic_initiate_spells", FEAT_MODIFIER_CATALOG.spellsKnown, [
        {
          id: modId("magic_initiate_spells"),
          type: "spells_known",
          spells: [],
          label: "2 cantrips + 1 level-1 spell (Cleric, Druid, or Wizard list)",
        },
      ]),
      charInstance("modinst_magic_initiate_ability", FEAT_MODIFIER_CATALOG.spellcastingAbility, [
        {
          id: modId("magic_initiate_ability"),
          type: "spellcasting_ability",
          ability: "intelligence",
          label: "Spellcasting ability: INT, WIS, or CHA (chosen with feat)",
        },
      ]),
      usesInstance(
        "modinst_magic_initiate_cast",
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Cast chosen level-1 spell once without a slot",
      ),
    ],
  },
  "Savage Attacker": {
    linkedModifiers: [
      fxInstance("modinst_savage_attacker", FEAT_MODIFIER_CATALOG.riderDamage, {
        action: true,
        effects: [{ id: "fx_savage_attacker", kind: "rider_damage", bonusDice: "reroll weapon damage once per turn" }],
      }),
    ],
  },
  Skilled: {
    repeatable: true,
    linkedModifiers: [
      charInstance("modinst_skilled_skills", FEAT_MODIFIER_CATALOG.skills, [
        {
          id: modId("skilled_skills"),
          type: "skills",
          entries: [],
          label: "Choose 3 skill proficiencies",
        },
      ]),
      charInstance("modinst_skilled_tools", FEAT_MODIFIER_CATALOG.toolProficiencies, [
        {
          id: modId("skilled_tools"),
          type: "tool_proficiencies",
          values: [],
          label: "Or tool proficiencies (3 total skills/tools combined)",
        },
      ]),
    ],
  },
  "Ability Score Improvement": {
    repeatable: true,
    linkedModifiers: [asiPool("modinst_asi", 2, "SRD ASI: +2 to one ability or +1 to two")],
  },
  Grappler: {
    linkedModifiers: [
      asiPool("modinst_grappler_asi", 1, "+1 Strength or Dexterity"),
      fxInstance("modinst_grappler_advantage", FEAT_MODIFIER_CATALOG.checkAdvantage, {
        action: true,
        effects: [
          {
            id: "fx_grappler_advantage",
            kind: "check_advantage",
            checkCategory: "attack",
            grantAdvantage: true,
          },
        ],
      }),
    ],
  },
  Archery: {
    linkedModifiers: [
      charInstance("modinst_archery", FEAT_MODIFIER_CATALOG.attackRollModifiers, [
        {
          id: modId("archery"),
          type: "attack_roll_modifiers",
          entries: [{ bonus: 2, target: "ranged" }],
          label: "+2 to ranged weapon attack rolls",
        },
      ]),
    ],
  },
  Defense: {
    linkedModifiers: [
      charInstance("modinst_defense", FEAT_MODIFIER_CATALOG.ac, [
        {
          id: modId("defense"),
          type: "ac",
          mode: "flat_bonus",
          flatBonus: 1,
          label: "+1 AC while wearing armor",
        },
      ]),
    ],
  },
  "Great Weapon Fighting": {
    linkedModifiers: [
      charInstance("modinst_gwf", FEAT_MODIFIER_CATALOG.damageRollModifiers, [
        {
          id: modId("gwf"),
          type: "damage_roll_modifiers",
          entries: [{ bonus: 0, target: "custom", customTarget: "Two-handed melee (treat 1–2 on damage dice as 3)" }],
          label: "Reroll 1–2 on two-handed/versatile melee damage dice",
        },
      ]),
    ],
  },
  "Two-Weapon Fighting": {
    linkedModifiers: [
      charInstance("modinst_twf", FEAT_MODIFIER_CATALOG.damageRollModifiers, [
        {
          id: modId("twf"),
          type: "damage_roll_modifiers",
          entries: [{ bonus: 0, target: "custom", customTarget: "Light weapon bonus-action attack" }],
          label: "Add ability modifier to light weapon bonus-action attack damage",
        },
      ]),
    ],
  },
  "Boon of Combat Prowess": {
    linkedModifiers: [
      asiPool("modinst_boon_combat_asi", 1, "+1 to one ability score (max 30)"),
      fxInstance("modinst_boon_combat_hit", FEAT_MODIFIER_CATALOG.extraAction, {
        action: true,
        effects: [{ id: "fx_boon_combat", kind: "extra_action" }],
      }),
    ],
  },
  "Boon of Dimensional Travel": {
    linkedModifiers: [
      asiPool("modinst_boon_dim_asi", 1, "+1 to one ability score (max 30)"),
      fxInstance("modinst_boon_dim_travel", FEAT_MODIFIER_CATALOG.movementOption, {
        action: true,
        effects: [{ id: "fx_boon_dim", kind: "movement_option" }],
      }),
    ],
  },
  "Boon of Fate": {
    linkedModifiers: [
      asiPool("modinst_boon_fate_asi", 1, "+1 to one ability score (max 30)"),
      fxInstance("modinst_boon_fate", FEAT_MODIFIER_CATALOG.checkBonus, {
        reaction: true,
        effects: [
          {
            id: "fx_boon_fate",
            kind: "check_bonus",
            checkCategory: "other",
            bonusAmount: null,
          },
        ],
      }),
      usesInstance(
        "modinst_boon_fate_uses",
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "short_rest" }, { rest: "long_rest" }] },
        "Recharges when you roll initiative or finish a rest",
      ),
    ],
  },
  "Boon of Irresistible Offense": {
    linkedModifiers: [
      asiPool("modinst_boon_offense_asi", 1, "+1 Strength or Dexterity (max 30)"),
      charInstance("modinst_boon_offense_resist", FEAT_MODIFIER_CATALOG.damageRollModifiers, [
        {
          id: modId("boon_offense_resist"),
          type: "damage_roll_modifiers",
          entries: [
            {
              bonus: 0,
              target: "custom",
              customTarget: "B/P/S damage ignores resistance",
            },
          ],
          label: "Bludgeoning, Piercing, and Slashing damage ignores Resistance",
        },
      ]),
      fxInstance("modinst_boon_offense_crit", FEAT_MODIFIER_CATALOG.riderDamage, {
        action: true,
        effects: [{ id: "fx_boon_offense_crit", kind: "rider_damage" }],
      }),
    ],
  },
  "Boon of Spell Recall": {
    linkedModifiers: [
      asiPool("modinst_boon_spell_asi", 1, "+1 Intelligence, Wisdom, or Charisma (max 30)"),
      fxInstance("modinst_boon_spell_recall", FEAT_MODIFIER_CATALOG.selfBuffCaster, {
        action: true,
        effects: [{ id: "fx_boon_spell_recall", kind: "self_buff_caster" }],
      }),
    ],
  },
  "Boon of the Night Spirit": {
    linkedModifiers: [
      asiPool("modinst_boon_night_asi", 1, "+1 to one ability score (max 30)"),
      fxInstance("modinst_boon_night_invis", FEAT_MODIFIER_CATALOG.selfBuffCaster, {
        bonusAction: true,
        effects: [{ id: "fx_boon_night_invis", kind: "self_buff_caster" }],
      }),
      charInstance("modinst_boon_night_resist", FEAT_MODIFIER_CATALOG.damageResistance, [
        {
          id: modId("boon_night_resist"),
          type: "damage_resistance",
          damageTypes: [
            "Acid",
            "Bludgeoning",
            "Cold",
            "Fire",
            "Force",
            "Lightning",
            "Necrotic",
            "Piercing",
            "Poison",
            "Slashing",
            "Thunder",
          ],
          label: "Resistance to all damage except Psychic and Radiant (in dim light/darkness)",
        },
      ]),
    ],
  },
  "Boon of Truesight": {
    linkedModifiers: [
      asiPool("modinst_boon_truesight_asi", 1, "+1 to one ability score (max 30)"),
      charInstance("modinst_boon_truesight", FEAT_MODIFIER_CATALOG.vision, [
        {
          id: modId("boon_truesight"),
          type: "vision",
          visionType: "truesight",
          rangeFeet: 60,
          label: "Truesight 60 ft.",
        },
      ]),
    ],
  },
}

function featHasLinkedModifiers(row: Record<string, unknown>): boolean {
  const linked = row.linkedModifiers ?? row.linked_modifiers
  if (Array.isArray(linked) && linked.length > 0) return true
  const refs = row.modifierRefs ?? row.modifier_refs
  return Array.isArray(refs) && refs.length > 0
}

/** Apply SRD common-modifier presets to a feat row when not already configured. */
export function enrichSrdFeatRow(row: Record<string, unknown>): Record<string, unknown> {
  if (!isSrdSource(row.source)) return row
  const name = String(row.name ?? "")
  const preset = SRD_FEAT_MODIFIER_PRESETS[name]
  if (!preset) return row
  if (featHasLinkedModifiers(row)) return row

  const synced = syncModifierRefs({ linkedModifiers: preset.linkedModifiers })
  return {
    ...row,
    linked_modifiers: synced.linkedModifiers,
    linkedModifiers: synced.linkedModifiers,
    modifier_refs: synced.modifierRefs,
    modifierRefs: synced.modifierRefs,
    benefits: row.benefits ?? null,
    repeatable: row.repeatable ?? preset.repeatable ?? false,
  }
}

export function enrichSrdFeatList(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(enrichSrdFeatRow)
}

/** Resolve preset by feat name (for tests / tooling). */
export function presetForFeatName(name: string): FeatModifierPreset | undefined {
  return SRD_FEAT_MODIFIER_PRESETS[name]
}
