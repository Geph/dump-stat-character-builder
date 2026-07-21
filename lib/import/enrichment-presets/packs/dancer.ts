import type { EnrichmentPreset } from "@/lib/import/enrichment-presets/types"
import { effectCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { modId } from "@/lib/compendium/modifier-instance-builders"
import { notWearingArmorLimitation, requiresActiveToggleLimitation } from "@/lib/compendium/modifier-limitations"

const GRACEFUL_DODGE_MENU = {
  kind: "char_instance" as const,
  idKey: "graceful_dodge",
  catalogRefId: "cat_char_resource_ability_menu",
  characteristics: [
    {
      id: "mod_graceful_dodge",
      type: "resource_ability_menu",
      resourceKey: "dance_die",
      options: [
        {
          name: "Graceful Dodge",
          description: "Add your Dance Die to your AC against one attack.",
          resourceCost: 0,
          bonusConfig: {
            mode: "die",
            dieScaling: "class_resource",
            classResourceKey: "dance_die",
          },
        },
      ],
      label: "Graceful Dodge — Dance Die to AC",
    },
  ],
}

export const DANCER_PRESETS: EnrichmentPreset[] = [
  {
    id: "dancer.class.dance",
    pack: "dancer",
    target: "class_feature",
    match: { className: /dancer/i, name: /^dance$/i },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "class_resource",
          classResourceKey: "dances",
          classResourceAmount: 1,
        },
      },
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "attachNamedPreset",
        preset: GRACEFUL_DODGE_MENU,
        skipIfCharacteristicTypes: ["resource_ability_menu"],
      },
      {
        op: "appendDescription",
        text: "While Dance is active, enable the Dancing sheet toggle so Dance Style riders gated with while_dancing apply. Graceful Dodge: spend no pool — roll Dance Die (size from dance_die) and add to AC vs one attack.",
      },
    ],
  },
  {
    id: "dancer.class.graceful_dodge",
    pack: "dancer",
    target: "class_feature",
    match: { className: /dancer/i, name: /^graceful dodge$/i },
    skipIfCharacteristicTypes: ["resource_ability_menu"],
    operations: [
      {
        op: "attachNamedPreset",
        preset: GRACEFUL_DODGE_MENU,
      },
    ],
  },
  {
    id: "dancer.class.dervish_fighting",
    pack: "dancer",
    target: "class_feature",
    match: { className: /dancer/i, name: /^dervish fighting$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "deadly_d4s",
          catalogRefId: "cat_char_weapon_damage_die_override",
          characteristics: [
            {
              id: "char_deadly_d4s",
              type: "weapon_damage_die_override",
              dieSides: 4,
              scope: "weapons",
              label: "Deadly D4s: weapon damage dice become d4s",
            },
          ],
        },
        replaceCharacteristicTypes: ["weapon_damage_die_override"],
      },
      {
        op: "appendDescription",
        text: "Deadly D4s rewrites equipped weapon damage dice to d4s on the sheet. Extra Finesse / Dervish Firearms remain play-time.",
      },
      { op: "setSheetDisplay", sheetDisplay: { featuresTab: true, combatActions: true } },
    ],
  },
  {
    id: "dancer.class.nimble_start",
    pack: "dancer",
    target: "class_feature",
    match: { className: /dancer/i, name: /^nimble start$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "fx_instance",
          idKey: "nimble_start",
          catalogRefId: effectCatalogRefId("check_roll_modifier"),
          effects: [
            {
              id: modId("nimble_start"),
              kind: "check_roll_modifier",
              checkCategory: "other",
              incomingAttackMode: "disadvantage",
              label: "Nimble Start: attacks vs you have Disadvantage (first round)",
              limitations: [requiresActiveToggleLimitation("first_turn_of_combat")],
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "Enable First turn of combat while resolving round 1 so Nimble Start Disadvantage applies.",
      },
    ],
  },
  {
    id: "dancer.class.fast_movement",
    pack: "dancer",
    target: "class_feature",
    match: { className: /dancer/i, name: /^fast movement$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "fast_movement",
          catalogRefId: "cat_char_speed",
          characteristics: [
            {
              id: "char_fast_movement",
              type: "speed",
              speedType: "walk",
              mode: "add",
              value: 10,
              label: "+10 ft. Speed (not Heavy armor)",
              limitations: [notWearingArmorLimitation("Heavy armor")],
            },
          ],
        },
        replaceCharacteristicTypes: ["speed"],
      },
    ],
  },
  {
    id: "dancer.class.multi_target_extra_attack",
    pack: "dancer",
    target: "class_feature",
    match: {
      className: /dancer/i,
      name: /^(three|four|five)-target extra attack$/i,
    },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "multi_target_extra_attack",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "char_multi_target_extra_attack",
              type: "power_rider",
              parentPowerNames: ["Extra Attack", "Attack"],
              alertSummary:
                "Multi-target Extra Attack: extra attacks only if each attack is against a different target (see feature name for count).",
            },
          ],
        },
        replaceCharacteristicTypes: ["power_rider", "extra_attack"],
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "dancer.class.heroic_dance",
    pack: "dancer",
    target: "class_feature",
    match: { className: /dancer/i, name: /^heroic dance$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "heroic_dance",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "char_heroic_dance",
              type: "power_rider",
              parentPowerNames: ["Dance"],
              alertSummary: "When you begin Dance: gain Heroic Inspiration if you don't have it.",
            },
          ],
        },
        replaceCharacteristicTypes: ["power_rider"],
      },
    ],
  },
  {
    id: "dancer.class.graceful_retaliation",
    pack: "dancer",
    target: "class_feature",
    match: { className: /dancer/i, name: /^graceful retaliation$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "appendDescription",
        text: "Reaction (hit or miss within 30 ft): one attack with Light/Finesse weapon or Unarmed Strike after the triggering attack.",
      },
    ],
  },
  {
    id: "dancer.class.freestyle",
    pack: "dancer",
    target: "class_feature",
    match: { className: /dancer/i, name: /^freestyle$/i },
    operations: [
      {
        op: "appendDescription",
        text: "When you begin Dance, choose two Dance Styles (Dance Styles picker count becomes 2 at level 13). Change one style at a time as a Bonus Action.",
      },
    ],
  },
  {
    id: "dancer.class.fierce_start",
    pack: "dancer",
    target: "class_feature",
    match: { className: /dancer/i, name: /^fierce start$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "fierce_start",
          catalogRefId: "cat_char_damage_roll_modifiers",
          characteristics: [
            {
              id: "char_fierce_start",
              type: "damage_roll_modifiers",
              entries: [{ bonus: 0, target: "all" }],
              label: "Fierce Start: +CHA to weapon/Unarmed damage (first round)",
              limitations: [requiresActiveToggleLimitation("first_turn_of_combat")],
            },
          ],
        },
        replaceCharacteristicTypes: ["damage_roll_modifiers"],
      },
      {
        op: "appendDescription",
        text: "Enable First turn of combat on round 1. Add your Charisma modifier to weapon or Unarmed Strike damage that round (label reminder — flat +0 entry is a sheet anchor).",
      },
    ],
  },
  {
    id: "dancer.class.invigorating_dance",
    pack: "dancer",
    target: "class_feature",
    match: { className: /dancer/i, name: /^invigorating dance$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "fx_instance",
          idKey: "invigorating_dance",
          catalogRefId: effectCatalogRefId("grant_temp_hp"),
          effects: [
            {
              id: modId("invigorating_dance"),
              kind: "grant_temp_hp",
              tempHpTrigger: "on_action",
              healMode: "character_level",
              healLevelMultiplier: 1,
              healAbility: "CHA",
              label: "Invigorating Dance: Temp HP = Dancer level + CHA (min 1)",
            },
          ],
        },
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "invigorating_dance_rider",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "char_invigorating_dance_rider",
              type: "power_rider",
              parentPowerNames: ["Dance"],
              alertSummary: "When you begin Dance: Temp HP = level + CHA (minimum 1).",
            },
          ],
        },
        replaceCharacteristicTypes: ["power_rider"],
      },
    ],
  },
  {
    id: "dancer.class.grand_finale",
    pack: "dancer",
    target: "class_feature",
    match: { className: /dancer/i, name: /^grand finale$/i },
    operations: [
      { op: "setActivation", activation: { action: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 1,
          useShareKey: "grand_finale",
          recharges: [{ rest: "long_rest" }],
          restoreByResource: { resourceKey: "dances", resourceAmount: 2, restores: 1 },
        },
      },
      {
        op: "appendDescription",
        text: "Requires Dance active (enable Dancing). Not usable on the first round. Hits crit until end of turn; two extra attacks as a Bonus Action; then Dance ends. Restore by spending 2 Dances.",
      },
    ],
  },
  // --- Subclass stubs ---
  {
    id: "dancer.subclass.team_player",
    pack: "dancer",
    target: "subclass_feature",
    match: { subclassClassName: /dancer/i, name: /^team player$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "fx_instance",
          idKey: "team_player_cheerful",
          catalogRefId: effectCatalogRefId("check_roll_modifier"),
          effects: [
            {
              id: modId("team_player_cheerful"),
              kind: "check_roll_modifier",
              checkRollMode: "advantage",
              checkCategory: "save",
              checkConditionTypes: ["Frightened"],
              label: "Cheerful: Advantage on saves to avoid or end Frightened",
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "Go Team!: when you Help on Athletics or Acrobatics, ally adds your Charisma modifier (track manually on the Help).",
      },
    ],
  },
  {
    id: "dancer.subclass.momentum",
    pack: "dancer",
    target: "subclass_feature",
    match: { subclassClassName: /dancer/i, name: /^(deadly )?momentum$/i },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "class_resource",
          classResourceKey: "momentum",
          classResourceAmount: 1,
        },
      },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "momentum",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "char_momentum",
              type: "power_rider",
              parentPowerNames: ["Dance"],
              alertSummary:
                "Momentum: while Dancing, gain Momentum when leaving reach / moving 15 ft; expend for +Dance Die damage (Deadly Momentum: up to 3, no end-of-turn loss).",
            },
          ],
        },
        replaceCharacteristicTypes: ["power_rider"],
      },
      {
        op: "appendDescription",
        text: "Enable Dancing while Dance is active. Momentum pool appears when this subclass is selected (spend for +Dance Die damage).",
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
    ],
  },
  {
    id: "dancer.subclass.tumbling",
    pack: "dancer",
    target: "subclass_feature",
    match: { subclassClassName: /dancer/i, name: /^tumbling$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "tumbling_speed",
          catalogRefId: "cat_char_speed",
          characteristics: [
            {
              id: "char_tumbling_speed",
              type: "speed",
              speedType: "walk",
              mode: "add",
              value: 10,
              label: "Tumbling +10 ft (while Agile Movement style)",
            },
          ],
        },
        replaceCharacteristicTypes: ["speed"],
      },
      {
        op: "appendDescription",
        text: "While Agile Movement Dance Style is active: fall damage reduction (5× level), ignore Difficult Terrain, +10 Speed. Gate the speed bonus yourself when not on that style.",
      },
    ],
  },
  {
    id: "dancer.subclass.evasive_speed",
    pack: "dancer",
    target: "subclass_feature",
    match: { subclassClassName: /dancer/i, name: /^evasive speed$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "appendDescription",
        text: "Bonus Action Dodge when you have moved 30+ feet this turn.",
      },
    ],
  },
  {
    id: "dancer.subclass.dance_style_feature",
    pack: "dancer",
    target: "subclass_feature",
    match: { subclassClassName: /dancer/i, name: /\[dance style\]/i },
    operations: [
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Dance Style: enable Dancing while your Dance is active. Prefer importing base styles as custom_abilities (ability_role upgrade) for the Dance Styles picker; subclass styles stay as feature cards.",
      },
    ],
  },
  {
    id: "dancer.subclass.twisting_redirection",
    pack: "dancer",
    target: "subclass_feature",
    match: { subclassClassName: /dancer/i, name: /^twisting redirection$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
    ],
  },
  {
    id: "dancer.subclass.parry_and_riposte",
    pack: "dancer",
    target: "subclass_feature",
    match: { subclassClassName: /dancer/i, name: /^parry and riposte$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "appendDescription",
        text: "When you use Graceful Dodge: Reaction to add another Dance Die to AC. At 11+, miss → Graceful Retaliation as part of the same Reaction.",
      },
    ],
  },
  {
    id: "dancer.subclass.redirection",
    pack: "dancer",
    target: "subclass_feature",
    match: { subclassClassName: /dancer/i, name: /^redirection$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
    ],
  },
  {
    id: "dancer.subclass.fencing_maneuvers",
    pack: "dancer",
    target: "subclass_feature",
    match: { subclassClassName: /dancer/i, name: /^fencing maneuvers$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "appendDescription",
        text: "While Dancing: Bonus Action Disarm / En Garde / Lunge (see description).",
      },
    ],
  },
  {
    id: "dancer.subclass.fire_breather",
    pack: "dancer",
    target: "subclass_feature",
    match: { subclassClassName: /dancer/i, name: /^fire breather$/i },
    operations: [
      { op: "setActivation", activation: { action: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "appendDescription",
        text: "Damage = 3× Dance Die + Dancer level (DEX save, half on success). Inferno Breath at 14 improves cone/resistance/Burning — see that feature.",
      },
    ],
  },
  {
    id: "dancer.subclass.encore",
    pack: "dancer",
    target: "subclass_feature",
    match: { subclassClassName: /dancer/i, name: /^encore$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
    ],
  },
  {
    id: "dancer.subclass.swan_song",
    pack: "dancer",
    target: "subclass_feature",
    match: { subclassClassName: /dancer/i, name: /^swan song$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "appendDescription",
        text: "Requires Bloodied + Dancing. Heal to half max; Advantage on first D20 Test each turn until Dance ends.",
      },
    ],
  },
  {
    id: "dancer.subclass.zero_g_kicks",
    pack: "dancer",
    target: "subclass_feature",
    match: { subclassClassName: /dancer/i, name: /^zero-?g kicks$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "appendDescription",
        text: "Reaction on melee miss: move 10 ft without OA. Feather Fall on self is wired via spells_known when present.",
      },
    ],
  },
  {
    id: "dancer.subclass.frictionless_field",
    pack: "dancer",
    target: "subclass_feature",
    match: { subclassClassName: /dancer/i, name: /^frictionless field$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
    ],
  },
  // --- Base Dance Style upgrades (ability_role upgrade) ---
  {
    id: "dancer.proposal.agile_movement",
    pack: "dancer",
    target: "proposal_ability",
    match: { sourceName: /dancer/i, name: /^agile movement$/i },
    operations: [
      { op: "setAbilityRole", role: "upgrade" },
      {
        op: "appendDescription",
        text: "While Dancing: your movement doesn't provoke Opportunity Attacks.",
      },
    ],
  },
  {
    id: "dancer.proposal.elegant_form",
    pack: "dancer",
    target: "proposal_ability",
    match: { sourceName: /dancer/i, name: /^elegant form$/i },
    operations: [
      { op: "setAbilityRole", role: "upgrade" },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "elegant_form",
          catalogRefId: "cat_char_resource_ability_menu",
          characteristics: [
            {
              id: "mod_elegant_form",
              type: "resource_ability_menu",
              resourceKey: "dance_die",
              options: [
                {
                  name: "Elegant Form",
                  description:
                    "When you fail a DEX/CHA check or any save, add Dance Die (while Dancing).",
                  resourceCost: 0,
                  bonusConfig: {
                    mode: "die",
                    dieScaling: "class_resource",
                    classResourceKey: "dance_die",
                  },
                },
              ],
              label: "Elegant Form — Dance Die to a failed DEX/CHA check or any save",
            },
          ],
        },
        skipIfCharacteristicTypes: ["resource_ability_menu"],
      },
      {
        op: "appendDescription",
        text: "Enable Dancing. Use the Elegant Form menu when you fail a DEX or CHA check or any saving throw.",
      },
    ],
  },
  {
    id: "dancer.proposal.spinning_shot",
    pack: "dancer",
    target: "proposal_ability",
    match: { sourceName: /dancer/i, name: /^spinning shot$/i },
    operations: [
      { op: "setAbilityRole", role: "upgrade" },
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "spinning_shot",
          catalogRefId: "cat_char_resource_ability_menu",
          characteristics: [
            {
              id: "mod_spinning_shot",
              type: "resource_ability_menu",
              resourceKey: "dance_die",
              options: [
                {
                  name: "Spinning Shot",
                  description: "Add Dance Die to a ranged weapon attack roll (while Dancing).",
                  resourceCost: 0,
                  bonusConfig: {
                    mode: "die",
                    dieScaling: "class_resource",
                    classResourceKey: "dance_die",
                  },
                },
              ],
              label: "Spinning Shot — Dance Die to ranged weapon attacks",
            },
          ],
        },
        skipIfCharacteristicTypes: ["resource_ability_menu"],
      },
    ],
  },
  {
    id: "dancer.proposal.retaliatory_swipe",
    pack: "dancer",
    target: "proposal_ability",
    match: { sourceName: /dancer/i, name: /^retaliatory swipe$/i },
    operations: [
      { op: "setAbilityRole", role: "upgrade" },
      {
        op: "appendDescription",
        text: "While Dancing: when you take damage from a creature within 5 ft, that attacker takes damage equal to two Dance Dice (weapon or Unarmed type you choose).",
      },
    ],
  },
  {
    id: "dancer.proposal.style_upgrade_role",
    pack: "dancer",
    target: "proposal_ability",
    match: {
      sourceName: /dancer/i,
      name: /^(dueling stance|inspiring chant|pantomime|deadly d4s|momentum|tumbling|evasive speed)$/i,
    },
    operations: [{ op: "setAbilityRole", role: "upgrade" }],
  },
  {
    id: "dancer.subclass.dueling_stance",
    pack: "dancer",
    target: "subclass_feature",
    match: { subclassClassName: /dancer/i, name: /^dueling stance/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "dueling_stance",
          catalogRefId: "cat_char_resource_ability_menu",
          characteristics: [
            {
              id: "mod_dueling_stance",
              type: "resource_ability_menu",
              resourceKey: "dance_die",
              options: [
                {
                  name: "Dueling Stance",
                  description:
                    "Add Dance Die to damage with a one-handed melee weapon (no other weapons; while this style is active).",
                  resourceCost: 0,
                  bonusConfig: {
                    mode: "die",
                    dieScaling: "class_resource",
                    classResourceKey: "dance_die",
                  },
                },
              ],
              label: "Dueling Stance — Dance Die to one-handed melee damage",
              limitations: [requiresActiveToggleLimitation("dance_style_dueling_stance")],
            },
          ],
        },
        skipIfCharacteristicTypes: ["resource_ability_menu"],
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "appendDescription",
        text: "Enable Dance Style: Dueling Stance (and Dancing) while this style is active.",
      },
    ],
  },
  {
    id: "dancer.subclass.inspiring_chant",
    pack: "dancer",
    target: "subclass_feature",
    match: { subclassClassName: /dancer/i, name: /^inspiring chant/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "inspiring_chant",
          catalogRefId: "cat_char_resource_ability_menu",
          characteristics: [
            {
              id: "mod_inspiring_chant",
              type: "resource_ability_menu",
              resourceKey: "dance_die",
              options: [
                {
                  name: "Inspiring Chant",
                  description:
                    "Ally in 10-ft Emanation adds Dance Die to a failed D20 Test (once until your next turn).",
                  resourceCost: 0,
                  bonusConfig: {
                    mode: "die",
                    dieScaling: "class_resource",
                    classResourceKey: "dance_die",
                  },
                },
              ],
              label: "Inspiring Chant — ally adds Dance Die to a failed D20 Test",
              limitations: [requiresActiveToggleLimitation("dance_style_inspiring_chant")],
            },
          ],
        },
        skipIfCharacteristicTypes: ["resource_ability_menu"],
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true } },
      {
        op: "appendDescription",
        text: "Enable Dance Style: Inspiring Chant (and Dancing) while this style is active.",
      },
    ],
  },
  {
    id: "dancer.subclass.pantomime",
    pack: "dancer",
    target: "subclass_feature",
    match: { subclassClassName: /dancer/i, name: /^pantomime/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "fx_instance",
          idKey: "pantomime",
          catalogRefId: effectCatalogRefId("check_roll_modifier"),
          effects: [
            {
              id: modId("pantomime_attack"),
              kind: "check_roll_modifier",
              checkRollMode: "advantage",
              checkCategory: "attack",
              label: "Pantomime: Advantage on first melee attack each turn (while style active)",
              limitations: [requiresActiveToggleLimitation("dance_style_pantomime")],
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "While this Dance Style is active: magically silent; held objects Invisible. Enable Dance Style: Pantomime (and Dancing).",
      },
    ],
  },
]

export default DANCER_PRESETS
