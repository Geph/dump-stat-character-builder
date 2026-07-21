import type { EnrichmentPreset } from "@/lib/import/enrichment-presets/types"
import type { ImportContent } from "@/lib/import/content-schema"
import { characteristicCatalogRefId, effectCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { modId } from "@/lib/compendium/modifier-instance-builders"

/** Base Risk Die maneuvers every Gunslinger knows at Risk (level 2). Not a pick pool. */
export const GUNSLINGER_BASE_MANEUVERS = [
  "Bite the Bullet",
  "Blindfire",
  "Dodge Roll",
  "Grazing Shot",
  "Maverick Spirit",
  "Skin of Your Teeth",
] as const

const SKIN_OF_YOUR_TEETH_DESCRIPTION =
  "<p>When a creature you can see hits you with an attack roll, you can take a Reaction and expend one Risk Die to dodge out of harm's way. Roll the die and add the number rolled to your AC against this attack, potentially causing it to miss.</p>"

function grantBaseManeuvers() {
  return {
    op: "attachNamedPreset" as const,
    preset: {
      kind: "char_instance" as const,
      idKey: "gunslinger_risk_maneuvers",
      catalogRefId: "cat_char_grant_custom_ability",
      characteristics: [
        {
          id: modId("gunslinger_risk_maneuvers"),
          type: "grant_custom_ability",
          abilityNames: [...GUNSLINGER_BASE_MANEUVERS],
          label: "Gain Gunslinger Maneuver Options",
        },
      ],
    },
    replaceCharacteristicTypes: ["grant_custom_ability"],
  }
}

function coverIgnorePreset(idKey: string, label: string) {
  return {
    op: "attachNamedPreset" as const,
    preset: {
      kind: "char_instance" as const,
      idKey,
      catalogRefId: characteristicCatalogRefId("attack_roll_modifiers"),
      characteristics: [
        {
          id: modId(idKey),
          type: "attack_roll_modifiers",
          label,
          entries: [
            {
              bonus: 0,
              attackTarget: "ranged",
              ignoreHalfCover: true,
              treatThreeQuartersCoverAsHalf: true,
            },
          ],
        },
      ],
    },
    replaceCharacteristicTypes: ["attack_roll_modifiers"],
  }
}

/**
 * Sanitize Gunslinger import proposals:
 * - Ensure Skin of Your Teeth exists (often dropped — Maneuver Options sit between Deadeye and Gun Tank in the PDF).
 * - Drop Captain/Vagabond-only Battle Die maneuvers that contaminate Gunslinger batches.
 * - Keep base maneuvers as knacks so grant_custom_ability can unlock them.
 */
export function sanitizeGunslingerImportContent(content: ImportContent): ImportContent {
  const hasGunslinger = (content.classes ?? []).some((cls) => /gunslinger/i.test(cls.name ?? ""))
  if (!hasGunslinger) return content

  const proposals = content.import_proposals?.custom_abilities
  if (!proposals?.length && !content.import_proposals) return content

  const kept = (proposals ?? []).filter((ability) => {
    const eligible = ability.eligible_classes
    if (!eligible?.length) return true
    return eligible.some((name) => /gunslinger/i.test(name))
  })

  const hasSkin = kept.some((ability) => /^skin of your teeth$/i.test(ability.name ?? ""))
  const nextAbilities = hasSkin
    ? kept
    : [
        ...kept,
        {
          proposal_id: "skin_of_your_teeth_maneuver",
          name: "Skin of Your Teeth",
          ability_role: "knack" as const,
          definition: "Base Risk Die maneuver, known automatically by all Gunslingers.",
          description: SKIN_OF_YOUR_TEETH_DESCRIPTION,
          execution: "Reaction, expend one Risk Die, when hit by an attack roll",
          eligible_classes: ["Gunslinger"],
          source_type: "class",
          source_name: "Gunslinger",
          level_requirement: 2,
        },
      ]

  // Normalize shared / base maneuver attribution for this class pass.
  const normalized = nextAbilities.map((ability) => {
    if (!GUNSLINGER_BASE_MANEUVERS.some((name) => name.toLowerCase() === ability.name?.toLowerCase())) {
      return ability
    }
    return {
      ...ability,
      ability_role: "knack" as const,
      source_type: ability.source_type === "compendium" ? "class" : ability.source_type,
      source_name: ability.source_type === "compendium" || !ability.source_name ? "Gunslinger" : ability.source_name,
      eligible_classes: ability.eligible_classes?.length
        ? ability.eligible_classes
        : ["Gunslinger"],
      level_requirement: ability.level_requirement ?? 2,
    }
  })

  return {
    ...content,
    import_proposals: {
      ...content.import_proposals,
      custom_abilities: normalized as NonNullable<
        NonNullable<ImportContent["import_proposals"]>["custom_abilities"]
      >,
    },
  }
}

export const GUNSLINGER_PRESETS: EnrichmentPreset[] = [
  {
    id: "gunslinger.class.risk",
    pack: "gunslinger",
    target: "class_feature",
    match: { className: /gunslinger/i, name: /^risk$/i },
    operations: [
      grantBaseManeuvers(),
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "All Gunslingers automatically know Bite the Bullet, Blindfire, Dodge Roll, Grazing Shot, Maverick Spirit, and Skin of Your Teeth (granted as custom abilities — not a Maneuvers Known picker). Subclass [Maneuver] features are additional named options, not pool picks.",
      },
    ],
  },
  {
    id: "gunslinger.class.dire_gambit",
    pack: "gunslinger",
    target: "class_feature",
    match: { className: /gunslinger/i, name: /^dire gambit$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Dump Stat sets Risk Dice rechargeOnInitiative: 1 when this feature is present (regain one die on Initiative). Critical Hit restores remain play-time.",
      },
    ],
  },
  {
    id: "gunslinger.class.deft_maneuver",
    pack: "gunslinger",
    target: "class_feature",
    match: { className: /gunslinger/i, name: /^deft maneuver$/i },
    operations: [
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Extra Bonus Action each turn may only be used to activate a maneuver (play-time / combat panel).",
      },
    ],
  },
  {
    id: "gunslinger.class.cheat_death",
    pack: "gunslinger",
    target: "class_feature",
    match: { className: /gunslinger/i, name: /^cheat death$/i },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 1,
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
          useShareKey: "cheat_death",
        },
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "gunslinger.class.headshot",
    pack: "gunslinger",
    target: "class_feature",
    match: { className: /gunslinger/i, name: /^headshot$/i },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 1,
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
          useShareKey: "headshot",
          restoreByResource: { resourceKey: "risk_dice", resourceAmount: 3, restores: 1 },
        },
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "gunslinger.subclass.maneuver_feature",
    pack: "gunslinger",
    target: "subclass_feature",
    match: {
      subclassClassName: /gunslinger/i,
      name: /\[maneuver\]/i,
    },
    operations: [
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Subclass maneuver — keep \"expend one Risk Die\" phrasing so limited uses link to risk_dice. Not a knack-pool pick.",
      },
    ],
  },
  {
    id: "gunslinger.subclass.creative_trajectory",
    pack: "gunslinger",
    target: "subclass_feature",
    match: { subclassClassName: /gunslinger/i, name: /^creative trajectory$/i },
    operations: [coverIgnorePreset("creative_trajectory", "Creative Trajectory: ignore Half / Three-Quarters Cover")],
  },
  {
    id: "gunslinger.subclass.heavy_gunner",
    pack: "gunslinger",
    target: "subclass_feature",
    match: { subclassClassName: /gunslinger/i, name: /^heavy gunner$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "heavy_gunner_armor",
          catalogRefId: characteristicCatalogRefId("armor_proficiencies"),
          characteristics: [
            {
              id: modId("heavy_gunner_armor"),
              type: "armor_proficiencies",
              armor: ["Medium Armor", "Heavy Armor"],
              label: "Heavy Gunner: Medium and Heavy armor",
            },
          ],
        },
        replaceCharacteristicTypes: ["armor_proficiencies"],
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "heavy_gunner_str_ranged",
          catalogRefId: characteristicCatalogRefId("weapon_ability_override"),
          characteristics: [
            {
              id: modId("heavy_gunner_str_ranged"),
              type: "weapon_ability_override",
              alternateAbility: "strength",
              weaponAbilityAppliesTo: "both",
              weaponAbilityScope: "ranged",
              label: "Heavy Gunner: Strength for ranged attack and damage",
            },
          ],
        },
        replaceCharacteristicTypes: ["weapon_ability_override"],
      },
    ],
  },
  {
    id: "gunslinger.subclass.flash_assault",
    pack: "gunslinger",
    target: "subclass_feature",
    match: { subclassClassName: /gunslinger/i, name: /^flash assault$/i },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 1,
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
          useShareKey: "flash_assault",
          restoreByResource: { resourceKey: "risk_dice", resourceAmount: 2, restores: 1 },
        },
      },
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
    ],
  },
  {
    id: "gunslinger.subclass.pinball_shot",
    pack: "gunslinger",
    target: "subclass_feature",
    match: { subclassClassName: /gunslinger/i, name: /^pinball shot$/i },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 1,
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
          useShareKey: "pinball_shot",
          restoreByResource: { resourceKey: "risk_dice", resourceAmount: 2, restores: 1 },
        },
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
    ],
  },
  {
    id: "gunslinger.subclass.infantry_training",
    pack: "gunslinger",
    target: "subclass_feature",
    match: { subclassClassName: /gunslinger/i, name: /^infantry training$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "infantry_martial_weapons",
          catalogRefId: characteristicCatalogRefId("weapon_proficiencies"),
          characteristics: [
            {
              id: modId("infantry_martial_weapons"),
              type: "weapon_proficiencies",
              weaponMode: "martial_weapons",
              label: "Infantry Training: all Martial weapons",
            },
          ],
        },
        replaceCharacteristicTypes: ["weapon_proficiencies"],
      },
      {
        op: "appendDescription",
        text: "Melee Mastery widens Weapon Mastery picks to Melee weapons (builder choice list). Bayonet / Ignore Loading stay play-time.",
      },
    ],
  },
  {
    id: "gunslinger.subclass.poker_face",
    pack: "gunslinger",
    target: "subclass_feature",
    match: { subclassClassName: /gunslinger/i, name: /^poker face$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "poker_face_gaming",
          catalogRefId: characteristicCatalogRefId("tool_proficiencies"),
          characteristics: [
            {
              id: modId("poker_face_gaming"),
              type: "tool_proficiencies",
              tools: ["Gaming Set"],
              label: "Poker Face: Gaming Sets",
            },
          ],
        },
        replaceCharacteristicTypes: ["tool_proficiencies"],
      },
    ],
  },
  {
    id: "gunslinger.subclass.steely_eyed_aura",
    pack: "gunslinger",
    target: "subclass_feature",
    match: { subclassClassName: /gunslinger/i, name: /^steely-eyed aura$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "fx_instance",
          idKey: "steely_eyed_frightened",
          catalogRefId: effectCatalogRefId("check_roll_modifier"),
          effects: [
            {
              id: modId("steely_eyed_frightened"),
              kind: "check_roll_modifier",
              checkRollMode: "advantage",
              checkCategory: "save",
              checkConditionTypes: ["Frightened"],
              label: "Steely-Eyed Aura: Advantage vs Frightened (self; allies in aura play-time)",
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "Ally Advantage within the Emanation is play-time. Self Frightened saves are sheet-wired.",
      },
    ],
  },
]
