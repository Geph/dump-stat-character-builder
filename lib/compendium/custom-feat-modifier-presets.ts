/**
 * Modifier presets for non-SRD feats entered in the compendium (PHB, etc.).
 * No stat text is bundled in the public repo — create feat rows locally with names
 * matching the keys below; linked modifiers apply on load.
 */
import type { FeatModifierPreset } from "@/lib/compendium/feat-modifier-presets"
import {
  acBonus,
  armorProf,
  asiOne,
  attackMod,
  bonusActionAttackFx,
  castSpellFx,
  checkFx,
  damageHalvingReaction,
  damageMod,
  damageReductionFx,
  damageResistanceChoice,
  failedRollTrigger,
  feyShadowTouchedSpells,
  forceSaveFx,
  grantTempHpFx,
  healingDicePool,
  imposeDisadvantageFx,
  modifyCreatureFx,
  movementEffectsPassive,
  onHitTrigger,
  reactionAttackFx,
  riderFx,
  savingThrowChoice,
  savingThrowTrigger,
  skillChoice,
  speedMod,
  spellAbility,
  spellHealing,
  spellsKnown,
  telepathyMod,
  toolProf,
  turnStartFx,
  unarmedDie,
  uses,
  visionMod,
  weaponProf,
} from "@/lib/compendium/feat-modifier-presets"

const LORE_SKILLS = ["Arcana", "History", "Investigation", "Nature", "Religion"] as const
const OBSERVER_SKILLS = ["Insight", "Investigation", "Perception"] as const
const ELEMENTAL_DAMAGE_TYPES = ["Acid", "Cold", "Fire", "Lightning", "Thunder"] as const

/** Non-SRD feat name → common modifier presets (PHB General + Fighting Style feats). */
export const CUSTOM_FEAT_MODIFIER_PRESETS: Record<string, FeatModifierPreset> = {
  Actor: {
    linkedModifiers: [
      asiOne("actor_asi", "+1 Charisma"),
      checkFx(
        "actor_impersonation",
        {
          kind: "check_advantage",
          checkCategory: "skill",
          checkSkills: ["Deception", "Performance"],
        },
        {},
      ),
    ],
  },

  Athlete: {
    linkedModifiers: [
      asiOne("athlete_asi", "+1 Strength or Dexterity"),
      speedMod("athlete_climb", "climb", "equal_to_walk", 0, "Climb Speed equal to your Speed"),
      movementEffectsPassive("athlete_hop_up", {
        label: "Hop Up: stand from Prone using only 5 feet of movement",
      }),
      movementEffectsPassive("athlete_jumping", {
        label: "Jumping: running Long or High Jump after moving only 5 feet",
      }),
    ],
  },

  Charger: {
    linkedModifiers: [
      asiOne("charger_asi", "+1 Strength or Dexterity"),
      speedMod("charger_dash", "walk", "add", 10, "Improved Dash: +10 Speed when you take the Dash action"),
      riderFx("charger_attack", { bonusDice: "1d8 bonus damage or push 10 ft. after 10 ft. charge (once/turn)" }),
    ],
  },

  Chef: {
    linkedModifiers: [
      asiOne("chef_asi", "+1 Constitution or Wisdom"),
      toolProf("chef_utensils", "Cook's Utensils", "Cook's Utensils proficiency"),
      healingDicePool("chef_replenishing", {
        dieType: "d8",
        activation: "action",
        dicePerUseSource: "proficiency",
        label: "Replenishing Meal: extra 1d8 HP when allies eat during Short Rest (4 + PB creatures)",
      }),
      grantTempHpFx("chef_treats", { bonusAction: true }),
    ],
  },

  "Crossbow Expert": {
    linkedModifiers: [
      asiOne("crossbow_expert_asi", "+1 Dexterity"),
      attackMod(
        "crossbow_expert_loading",
        [{ bonus: 0, target: "custom", customTarget: "Ignore Loading on crossbows; load without free hand" }],
        "Ignore Loading",
      ),
      attackMod(
        "crossbow_expert_melee",
        [{ bonus: 0, target: "ranged", customTarget: "No disadvantage within 5 ft. with crossbows" }],
        "Firing in Melee",
      ),
      damageMod(
        "crossbow_expert_dual",
        [
          {
            bonus: 0,
            target: "custom",
            customTarget: "Light crossbow extra attack",
            grantAbilityModifierWhenMissing: true,
          },
        ],
        "Dual Wielding: add ability modifier to light crossbow extra attack damage",
      ),
    ],
  },

  Crusher: {
    linkedModifiers: [
      asiOne("crusher_asi", "+1 Strength or Constitution"),
      onHitTrigger("crusher_push", {
        appliesTo: "bludgeoning",
        label: "Push 5 ft. on bludgeoning hit (once/turn)",
      }),
      onHitTrigger("crusher_crit", {
        triggerOn: "crit",
        appliesTo: "bludgeoning",
        label: "Enhanced Critical: attacks vs. target have Advantage until your next turn",
      }),
    ],
  },

  "Defensive Duelist": {
    linkedModifiers: [
      asiOne("defensive_duelist_asi", "+1 Dexterity"),
      damageReductionFx("defensive_duelist_parry", { reaction: true }),
    ],
  },

  "Dual Wielder": {
    linkedModifiers: [
      asiOne("dual_wielder_asi", "+1 Strength or Dexterity"),
      bonusActionAttackFx("dual_wielder_extra"),
      movementEffectsPassive("dual_wielder_quick_draw", {
        label: "Quick Draw: draw or stow two one-handed weapons when you could draw or stow one",
      }),
    ],
  },

  Durable: {
    linkedModifiers: [
      asiOne("durable_asi", "+1 Constitution"),
      checkFx(
        "durable_defy_death",
        { kind: "check_advantage", checkCategory: "save", checkAbility: "Constitution" },
        {},
      ),
      healingDicePool("durable_recovery", {
        dieType: "d8",
        activation: "bonus_action",
        maxDicePerUse: null,
        label: "Speedy Recovery: Bonus Action to expend one Hit Die and heal",
      }),
    ],
  },

  "Elemental Adept": {
    repeatable: true,
    linkedModifiers: [
      asiOne("elemental_adept_asi", "+1 Intelligence, Wisdom, or Charisma"),
      damageResistanceChoice(
        "elemental_adept_type",
        [...ELEMENTAL_DAMAGE_TYPES],
        "Energy Mastery: choose damage type (ignore resistance; treat 1s as 2s on spell damage dice)",
      ),
      damageMod(
        "elemental_adept_dice",
        [{ bonus: 0, target: "custom", customTarget: "Chosen spell damage type: minimum die result 2" }],
        "Energy Mastery damage dice",
      ),
    ],
  },

  "Fey Touched": {
    linkedModifiers: [
      asiOne("fey_touched_asi", "+1 Intelligence, Wisdom, or Charisma"),
      ...feyShadowTouchedSpells("fey_touched", "Divination or Enchantment", "Misty Step", "Fey Magic"),
    ],
  },

  Grappler: {
    linkedModifiers: [
      asiOne("grappler_asi", "+1 Strength or Dexterity"),
      onHitTrigger("grappler_punch_grab", {
        appliesTo: "unarmed",
        label: "Punch and Grab: damage + grapple on unarmed hit (once/turn)",
      }),
      checkFx(
        "grappler_advantage",
        { kind: "check_advantage", checkCategory: "attack" },
        {},
      ),
      movementEffectsPassive("grappler_fast_wrestler", {
        label: "Fast Wrestler: no extra movement dragging grappled creature your size or smaller",
      }),
    ],
  },

  "Great Weapon Master": {
    linkedModifiers: [
      asiOne("gwm_asi", "+1 Strength"),
      onHitTrigger("gwm_heavy", {
        appliesTo: "heavy",
        label: "Heavy Weapon Mastery: extra damage equal to Proficiency Bonus on hit",
      }),
      bonusActionAttackFx("gwm_hew"),
    ],
  },

  "Heavily Armored": {
    linkedModifiers: [
      asiOne("heavily_armored_asi", "+1 Constitution or Strength"),
      armorProf("heavily_armored", ["Heavy"], "Armor Training: Heavy armor"),
    ],
  },

  "Heavy Armor Master": {
    linkedModifiers: [
      asiOne("heavy_armor_master_asi", "+1 Constitution or Strength"),
      damageReductionFx("heavy_armor_master"),
    ],
  },

  "Inspiring Leader": {
    linkedModifiers: [
      asiOne("inspiring_leader_asi", "+1 Wisdom or Charisma"),
      grantTempHpFx("inspiring_leader", {}),
    ],
  },

  "Keen Mind": {
    linkedModifiers: [
      asiOne("keen_mind_asi", "+1 Intelligence"),
      skillChoice("keen_mind_lore", {
        count: 1,
        entries: LORE_SKILLS.map((skill) => ({ skill, expertise: false })),
        label: "Lore Knowledge: proficiency or Expertise in chosen skill",
      }),
      checkFx("keen_mind_study", { kind: "extra_action" }, { bonusAction: true }),
    ],
  },

  "Lightly Armored": {
    linkedModifiers: [
      asiOne("lightly_armored_asi", "+1 Strength or Dexterity"),
      armorProf("lightly_armored", ["Light", "Shield"], "Armor Training: Light armor and Shields"),
    ],
  },

  "Mage Slayer": {
    linkedModifiers: [
      asiOne("mage_slayer_asi", "+1 Strength or Dexterity"),
      onHitTrigger("mage_slayer_concentration", {
        label: "Concentration Breaker: target has Disadvantage on Concentration save when damaged",
      }),
      failedRollTrigger("mage_slayer_guarded", {
        triggerOn: "fail",
        rollKind: "save",
        label: "Guarded Mind: turn failed INT/WIS/CHA save into success (1/Short or Long Rest)",
      }),
      uses(
        "mage_slayer_guarded_uses",
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "short_rest" }, { rest: "long_rest" }] },
        "Guarded Mind recharge",
      ),
    ],
  },

  "Martial Weapon Training": {
    linkedModifiers: [
      asiOne("martial_weapon_training_asi", "+1 Strength or Dexterity"),
      weaponProf("martial_weapon_training", "martial_weapons", [], "Weapon Proficiency: Martial weapons"),
    ],
  },

  "Medium Armor Master": {
    linkedModifiers: [
      asiOne("medium_armor_master_asi", "+1 Strength or Dexterity"),
      acBonus("medium_armor_master", {
        flatBonus: 0,
        requiresArmor: true,
        label: "Dexterous Wearer: +3 DEX to AC in Medium armor when DEX 16+ (instead of +2)",
      }),
    ],
  },

  "Moderately Armored": {
    linkedModifiers: [
      asiOne("moderately_armored_asi", "+1 Strength or Dexterity"),
      armorProf("moderately_armored", ["Medium"], "Armor Training: Medium armor"),
    ],
  },

  "Mounted Combatant": {
    linkedModifiers: [
      asiOne("mounted_combatant_asi", "+1 Strength, Dexterity, or Wisdom"),
      checkFx(
        "mounted_strike",
        { kind: "check_advantage", checkCategory: "attack" },
        {},
      ),
      damageHalvingReaction("mounted_leap_aside", "Leap Aside: mount takes no damage on successful DEX save vs. half"),
      savingThrowTrigger("mounted_veer", {
        triggerOn: "make",
        useReaction: true,
        label: "Veer: redirect attack from mount to yourself while mounted",
      }),
    ],
  },

  Observant: {
    linkedModifiers: [
      asiOne("observant_asi", "+1 Intelligence or Wisdom"),
      skillChoice("observant_keen", {
        count: 1,
        entries: OBSERVER_SKILLS.map((skill) => ({ skill, expertise: false })),
        label: "Keen Observer: proficiency or Expertise in chosen skill",
      }),
      checkFx("observant_search", { kind: "extra_action" }, { bonusAction: true }),
    ],
  },

  Piercer: {
    linkedModifiers: [
      asiOne("piercer_asi", "+1 Strength or Dexterity"),
      onHitTrigger("piercer_puncture", {
        appliesTo: "piercing",
        label: "Puncture: reroll one piercing damage die (once/turn)",
      }),
      onHitTrigger("piercer_crit", {
        triggerOn: "crit",
        appliesTo: "piercing",
        label: "Enhanced Critical: roll one additional piercing damage die",
      }),
    ],
  },

  Poisoner: {
    linkedModifiers: [
      asiOne("poisoner_asi", "+1 Dexterity or Intelligence"),
      damageMod(
        "poisoner_potent",
        [{ bonus: 0, target: "custom", customTarget: "Poison damage ignores Resistance" }],
        "Potent Poison",
      ),
      toolProf("poisoner_kit", "Poisoner's Kit", "Brew Poison: Poisoner's Kit proficiency"),
      onHitTrigger("poisoner_apply", {
        label: "Apply poison dose (Bonus Action); CON save or 2d8 Poison + Poisoned",
      }),
    ],
  },

  "Polearm Master": {
    linkedModifiers: [
      asiOne("polearm_master_asi", "+1 Strength or Dexterity"),
      bonusActionAttackFx("polearm_master_strike"),
      reactionAttackFx("polearm_master_reactive"),
    ],
  },

  Resilient: {
    linkedModifiers: [
      savingThrowChoice("resilient_save", "Choose ability without save proficiency (+1 ASI and save proficiency)"),
      asiOne("resilient_asi", "+1 to chosen ability (must lack save proficiency)"),
    ],
  },

  "Ritual Caster": {
    linkedModifiers: [
      asiOne("ritual_caster_asi", "+1 Intelligence, Wisdom, or Charisma"),
      spellsKnown("ritual_caster_spells", {
        choiceGrants: [{ level: 1, count: 1 }],
        alwaysPrepared: true,
        label: "Ritual Spells: level-1 Ritual spells equal to Proficiency Bonus (add more when PB increases)",
      }),
      spellAbility("ritual_caster_ability", "Spellcasting ability: ability increased by this feat"),
      uses(
        "ritual_caster_quick",
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Quick Ritual: cast one prepared ritual at normal time without slot (1/Long Rest)",
      ),
    ],
  },

  Sentinel: {
    linkedModifiers: [
      asiOne("sentinel_asi", "+1 Strength or Dexterity"),
      reactionAttackFx("sentinel_guardian"),
      modifyCreatureFx("sentinel_halt", { reaction: true }),
    ],
  },

  "Shadow Touched": {
    linkedModifiers: [
      asiOne("shadow_touched_asi", "+1 Intelligence, Wisdom, or Charisma"),
      ...feyShadowTouchedSpells("shadow_touched", "Illusion or Necromancy", "Invisibility", "Shadow Magic"),
    ],
  },

  Sharpshooter: {
    linkedModifiers: [
      asiOne("sharpshooter_asi", "+1 Dexterity"),
      attackMod(
        "sharpshooter_cover",
        [
          {
            bonus: 0,
            target: "ranged",
            ignoreHalfCover: true,
            treatThreeQuartersCoverAsHalf: true,
          },
        ],
        "Bypass Cover",
        { weaponMasteryOverrides: [] },
      ),
      attackMod(
        "sharpshooter_melee",
        [{ bonus: 0, target: "ranged", customTarget: "No disadvantage within 5 ft. with ranged weapons" }],
        "Firing in Melee",
      ),
      attackMod(
        "sharpshooter_range",
        [{ bonus: 0, target: "ranged", customTarget: "No disadvantage at long range" }],
        "Long Shots",
      ),
    ],
  },

  "Shield Master": {
    linkedModifiers: [
      asiOne("shield_master_asi", "+1 Strength"),
      forceSaveFx("shield_master_bash", { action: true }),
      damageHalvingReaction("shield_master_interpose", "Interpose Shield: no damage on successful DEX save vs. half"),
    ],
  },

  "Skill Expert": {
    linkedModifiers: [
      asiOne("skill_expert_asi", "+1 to one ability score"),
      skillChoice("skill_expert_prof", { allowAnySkill: true, count: 1, label: "Skill Proficiency" }),
      skillChoice("skill_expert_expertise", {
        allowAnySkill: true,
        count: 1,
        grantExpertise: true,
        label: "Expertise in one skill you have proficiency in",
      }),
    ],
  },

  Skulker: {
    linkedModifiers: [
      asiOne("skulker_asi", "+1 Dexterity"),
      visionMod("skulker_blindsight", "blindsight", 10, "Blindsight 10 ft."),
      checkFx(
        "skulker_fog",
        { kind: "check_advantage", checkCategory: "skill", checkSkills: ["Stealth"] },
        {},
      ),
      attackMod(
        "skulker_sniper",
        [{ bonus: 0, target: "custom", customTarget: "Hidden attack miss does not reveal location" }],
        "Sniper",
      ),
    ],
  },

  Slasher: {
    linkedModifiers: [
      asiOne("slasher_asi", "+1 Strength or Dexterity"),
      onHitTrigger("slasher_hamstring", {
        appliesTo: "slashing",
        label: "Hamstring: reduce target Speed by 10 ft. until your next turn (once/turn)",
      }),
      onHitTrigger("slasher_crit", {
        triggerOn: "crit",
        appliesTo: "slashing",
        label: "Enhanced Critical: target has Disadvantage on attacks until your next turn",
      }),
    ],
  },

  Speedy: {
    linkedModifiers: [
      asiOne("speedy_asi", "+1 Dexterity or Constitution"),
      speedMod("speedy_walk", "walk", "add", 10, "Speed Increase: +10 feet"),
      movementEffectsPassive("speedy_dash", {
        movementDash: true,
        label: "Dash over Difficult Terrain: no extra cost when Dashing",
      }),
      checkFx(
        "speedy_agile",
        { kind: "check_disadvantage", checkCategory: "attack", checkRollTargets: ["opportunity_against_you"] },
        {},
      ),
    ],
  },

  "Spell Sniper": {
    linkedModifiers: [
      asiOne("spell_sniper_asi", "+1 Intelligence, Wisdom, or Charisma"),
      attackMod(
        "spell_sniper_cover",
        [
          {
            bonus: 0,
            target: "spell_attack",
            ignoreHalfCover: true,
            treatThreeQuartersCoverAsHalf: true,
          },
        ],
        "Bypass Cover on spell attacks",
      ),
      attackMod(
        "spell_sniper_melee",
        [{ bonus: 0, target: "spell_attack", customTarget: "No disadvantage within 5 ft. on spell attacks" }],
        "Casting in Melee",
      ),
      spellHealing("spell_sniper_range", {
        label: "Increased Range: +60 ft. on spell attack spells with range 10+ ft.",
      }),
    ],
  },

  Telekinetic: {
    linkedModifiers: [
      asiOne("telekinetic_asi", "+1 Intelligence, Wisdom, or Charisma"),
      spellsKnown("telekinetic_mage_hand", {
        spells: [{ spellId: "Mage Hand", alwaysPrepared: true }],
        label: "Minor Telekinesis: Mage Hand without V/S, invisible, +30 ft. range",
      }),
      spellAbility("telekinetic_ability", "Spellcasting ability: ability increased by this feat"),
      modifyCreatureFx("telekinetic_shove", { bonusAction: true }),
    ],
  },

  Telepathic: {
    linkedModifiers: [
      asiOne("telepathic_asi", "+1 Intelligence, Wisdom, or Charisma"),
      telepathyMod("telepathic_utterance", 60, "Telepathic Utterance 60 ft."),
      spellsKnown("telepathic_detect", {
        spells: [{ spellId: "Detect Thoughts", alwaysPrepared: true }],
        label: "Detect Thoughts always prepared",
      }),
      spellAbility("telepathic_ability", "Spellcasting ability: ability increased by this feat"),
      uses(
        "telepathic_detect_cast",
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Cast Detect Thoughts without slot or components (1/Long Rest)",
      ),
    ],
  },

  "War Caster": {
    linkedModifiers: [
      asiOne("war_caster_asi", "+1 Intelligence, Wisdom, or Charisma"),
      checkFx(
        "war_caster_concentration",
        { kind: "check_advantage", checkCategory: "save", checkAbility: "Constitution" },
        {},
      ),
      castSpellFx("war_caster_reactive", { castSpellCastingTime: "action" }, { reaction: true }),
      spellHealing("war_caster_somatic", {
        label: "Somatic Components: cast with weapons or Shield in hands",
      }),
    ],
  },

  "Weapon Master": {
    linkedModifiers: [
      asiOne("weapon_master_asi", "+1 Strength or Dexterity"),
      weaponProf("weapon_master", "specific", [], "Mastery Property: one Simple or Martial weapon kind (change on Long Rest)"),
    ],
  },

  // Fighting Style feats (PHB; SRD subset uses SRD presets when source is SRD)
  Archery: {
    linkedModifiers: [
      attackMod("archery", [{ bonus: 2, target: "ranged" }], "+2 to ranged weapon attack rolls"),
    ],
  },

  "Blind Fighting": {
    linkedModifiers: [visionMod("blind_fighting", "blindsight", 10, "Blindsight 10 ft.")],
  },

  Defense: {
    linkedModifiers: [
      acBonus("defense", { flatBonus: 1, requiresArmor: true, label: "+1 AC while wearing armor" }),
    ],
  },

  Dueling: {
    linkedModifiers: [
      damageMod(
        "dueling",
        [{ bonus: 2, target: "custom", customTarget: "One-handed melee weapon with no other weapons" }],
        "+2 damage with one-handed melee weapon",
      ),
    ],
  },

  "Great Weapon Fighting": {
    linkedModifiers: [
      damageMod(
        "gwf",
        [{ bonus: 0, target: "custom", customTarget: "Two-handed/versatile melee: treat 1–2 on damage dice as 3" }],
        "Great Weapon Fighting",
      ),
    ],
  },

  Interception: {
    linkedModifiers: [damageReductionFx("interception", { reaction: true })],
  },

  Protection: {
    linkedModifiers: [imposeDisadvantageFx("protection")],
  },

  "Thrown Weapon Fighting": {
    linkedModifiers: [
      damageMod(
        "thrown_weapon_fighting",
        [{ bonus: 2, target: "custom", customTarget: "Thrown weapon ranged attacks" }],
        "+2 damage on thrown weapon hits",
      ),
    ],
  },

  "Two-Weapon Fighting": {
    linkedModifiers: [
      damageMod(
        "twf",
        [
          {
            bonus: 0,
            target: "custom",
            customTarget: "Light weapon bonus-action attack",
            grantAbilityModifierWhenMissing: true,
          },
        ],
        "Add ability modifier to light weapon bonus-action damage",
      ),
    ],
  },

  "Unarmed Fighting": {
    linkedModifiers: [
      unarmedDie("unarmed_fighting", "1d6", "Unarmed Strike: 1d6 (+1d8 if no weapons/shield); 1d4 to grappled creature at turn start"),
      turnStartFx(
        "unarmed_fighting_grapple",
        { id: "mod_unarmed_fighting_grapple", kind: "rider_damage", bonusDice: "1d4" },
        { label: "1d4 bludgeoning to one creature Grappled by you at turn start" },
      ),
    ],
  },
}

export function customFeatHasPresetRegistry(featName: string): boolean {
  return featName in CUSTOM_FEAT_MODIFIER_PRESETS
}
