import type { EnrichmentOperation, EnrichmentPreset } from "../types"
import type { FeatureActivation, FeatureEffect, UsesConfig } from "@/lib/types"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import type { ModifierLimitation } from "@/lib/compendium/modifier-limitations"

// Mechanical metadata only. Source descriptions remain in the user's import.
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_")
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never
function char(name: string, characteristic: WithoutId<CharacteristicModifier>, replace: string[] = [characteristic.type]): EnrichmentOperation {
  return { op: "attachNamedPreset", replaceCharacteristicTypes: replace, preset: {
    kind: "char_instance", idKey: `alt_fighter_${slug(name)}`, catalogRefId: `cat_char_${characteristic.type}`,
    characteristics: [{ id: `alt_fighter_${slug(name)}`, ...characteristic }],
  } }
}
function fx(name: string, effect: Omit<FeatureEffect, "id"> | Omit<FeatureEffect, "id">[], replace?: string[]): EnrichmentOperation {
  const effects = Array.isArray(effect) ? effect : [effect]
  return { op: "attachNamedPreset", replaceEffectKinds: replace ?? effects.map((e) => e.kind), preset: {
    kind: "fx_instance", idKey: `alt_fighter_${slug(name)}`, catalogRefId: `cat_fx_${effects[0].kind}`,
    effects: effects.map((e, i) => ({ id: `alt_fighter_${slug(name)}_${i}`, ...e })),
  } }
}
const display: EnrichmentOperation = { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } }
const activate = (activation: FeatureActivation): EnrichmentOperation => ({ op: "setActivation", activation })
function rule(subclass: string, name: string, operations: EnrichmentOperation[]): EnrichmentPreset {
  return { id: `alternate_fighter.${slug(subclass)}.${slug(name)}`, pack: "alternate_fighter", target: "subclass_feature",
    match: { subclassClassName: /^alternate fighter(?:\s*\(.+\))?$/i, sourceName: subclass, name }, operations }
}
const rider = (name: string, parents: string[]): EnrichmentOperation => char(name, {
  type: "power_rider", parentPowerNames: parents, alertSummary: name,
}, ["power_rider"])
const notes = (name: string, prompt: string): EnrichmentOperation => char(`${name}_notes`, {
  type: "player_note", target: "feature", prompt,
}, ["player_note"])
const active = (id: string): ModifierLimitation => ({ id, kind: "sheet_toggle", rule: "requires_active", value: id })
const notIncapacitated: ModifierLimitation = { id: "not_incapacitated", kind: "condition", rule: "blocked_when_has", value: "Incapacitated" }
const tranceLimits: ModifierLimitation[] = [active("battle_trance_active"), notIncapacitated,
  { id: "no_heavy", kind: "armor_type", rule: "requires_not_wearing", value: "Heavy armor" },
  { id: "no_shield", kind: "armor_type", rule: "requires_not_wearing", value: "Shield" }]
const tranceUses: UsesConfig = { type: "fixed", fixedAmount: 1, recharges: [{ rest: "short_rest" }, { rest: "long_rest" }], restoreByResource: { resourceKey: "exploit_dice", resourceAmount: 1, restores: 1 } }

/** Parent-action alerts preserve conditional rules without applying permanent bonuses. */
const RIDERS: [string, string, string[]][] = [
  ["Arcane Knight", "Enchanted Strikes", ["Attack"]],
  ["Arcane Knight", "Arcane Surge", ["Action Surge"]],
  ["Arcane Knight", "Legendary Arcane Knight", ["Attack"]],
  ["Captain", "Strategic Command", ["Second Wind"]],
  ["Captain", "Heroic Surge", ["Action Surge"]],
  ["Captain", "Legendary Captain", ["Action Surge", "Heroic Surge"]],
  ["Knight Errant", "Unyielding Knight", ["Chivalric Mark"]],
  ["Knight Errant", "Perilous Charge", ["Attack"]],
  ["Knight Errant", "Legendary Knight Errant", ["Chivalric Mark", "Noble Guardian"]],
  ["Marksman", "Reliable Shot", ["Attack"]],
  ["Marksman", "Legendary Marksman", ["Deadly Focus"]],
  ["Master at Arms", "Masterful Focus", ["Second Wind", "Action Surge"]],
  ["Ronin", "Swift Strikes", ["Attack"]],
  ["Runecarver", "Elder Insight", ["Rune Carving"]],
  ["Shadowdancer", "Legendary Shadowdancer", ["Conjure Shade"]],
  ["Crusader", "Renewed Fervor", ["Second Wind", "Crusader's Ire"]],
  ["Guardian", "Inspiring Sentinel", ["Second Wind", "Iron Guardian"]],
  ["Guardian", "Stalwart Defender", ["Reposition", "Iron Guardian"]],
  ["Guardian", "Legendary Guardian", ["Iron Guardian"]],
  ["Guerrilla", "Identify Weakness", ["Eye for Talent"]],
  ["Guerrilla", "Unwavering", ["Second Wind", "Action Surge"]],
  ["Hound Master", "Iron Jaws", ["Loyal Hound"]],
  ["Hound Master", "Canine Fury", ["Loyal Hound", "War Hound"]],
  ["Pugilist", "Evasive Footwork", ["Attack", "Unarmed Strike"]],
  ["Quartermaster", "Dependable Ally", ["Attack"]],
  ["Swordsage", "Storm of Steel", ["Battle Trance"]],
  ["Tinker", "Increased Function", ["Inventive Arsenal"]],
  ["Tinker", "Inventive Synergy", ["Inventive Arsenal"]],
  ["Tinker", "Flexible Innovation", ["Inventive Arsenal"]],
  ["Tinker", "Legendary Tinker", ["Inventive Arsenal"]],
  ["Witchblade", "Otherworldly Step", ["Second Wind"]],
  ["Witchblade", "Greater Offering", ["Sanguine Offering"]],
]

export const ALTERNATE_FIGHTER_SUBCLASS_PRESETS: EnrichmentPreset[] = [
  ...RIDERS.map(([subclass, name, parents]) => rule(subclass, name, [rider(name, parents)])),
  rule("Arcane Knight", "Enchanted Armaments", [display, activate({ bonusAction: true }), notes("Enchanted Armaments", "Two bonded weapons or shields")]),
  rule("Knight Errant", "Chivalric Mark", [display, activate({ reaction: true }),
    fx("Chivalric Mark attack", { kind: "weapon_attack", attackStyle: "melee" }),
    notes("Chivalric Mark", "Marked creatures, expiration, and retaliation eligibility")]),
  rule("Knight Errant", "Noble Guardian", [display, activate({ reaction: true }),
    char("Noble Guardian", { type: "resource_ability_menu", resourceKey: "exploit_dice", options: [
      { name: "Interpose", resourceCost: 0, bonusConfig: { mode: "die", dieScaling: "class_resource", classResourceKey: "exploit_dice" } },
    ] }), notes("Noble Guardian", "If the attack still hits, optionally spend one Exploit Die for resistance; no second reaction"),
  ]),
  rule("Marksman", "Quick Shot", [display, activate({ reaction: true, requirements: [{ kind: "custom", text: "On initiative, when not Surprised" }] }),
    fx("Quick Shot", { kind: "weapon_attack", attackStyle: "ranged" }),
    char("Quick Shot initiative", { type: "initiative", mode: "add_proficiency", limitations: [notIncapacitated] }, ["initiative"])]),
  rule("Marksman", "Tactical Reposition", [
    // Replace the detector's unconditional +10 walk speed with a parent-action reminder.
    { ...rider("Tactical Reposition", ["Second Wind"]), replaceCharacteristicTypes: ["speed", "power_rider"] } as EnrichmentOperation,
  ]),
  rule("Marksman", "Deadly Focus", [display, activate({ action: true, noEconomyCost: true }),
    notes("Deadly Focus", "This turn's Focus: movement restriction, first hit, and damage rerolls")]),
  rule("Sylvan Archer", "Sylvan Shot", [display, activate({ bonusAction: true, requirements: [{ kind: "custom", text: "After missing with a ranged weapon; choose a different target in range" }] }),
    fx("Sylvan Shot", { kind: "weapon_attack", attackStyle: "ranged" }), rider("Sylvan Shot", ["Attack", "Enchanted Shot"])]),
  rule("Sylvan Archer", "Enchanted Quiver", [display, activate({ onInitiative: true }),
    notes("Enchanted Quiver", "Recover one Enchanted Shot use on initiative"), rider("Enchanted Quiver", ["Attack"])]),
  rule("Runecarver", "Runic Might", [display, activate({ bonusAction: true }),
    fx("Runic Might Strength", [
      { kind: "check_roll_modifier", checkRollMode: "advantage", checkCategory: "ability", checkAbility: "Strength", limitations: [active("runic_might_active"), notIncapacitated] },
      { kind: "check_roll_modifier", checkRollMode: "advantage", checkCategory: "save", checkAbility: "Strength", limitations: [active("runic_might_active"), notIncapacitated] },
    ]),
    char("Runic Might damage", { type: "power_rider", parentPowerNames: ["Attack"], alertSummary: "Runic Might", weaponDamageMenu: true, selectable: true, weaponScope: "melee", classResourceKey: "exploit_dice", classResourceDieCount: 1, limitations: [active("runic_might_active"), notIncapacitated] }),
    notes("Runic Might", "Size/space, once-per-turn damage, and Second Wind used for extra activations")]),
  rule("Guardian", "Adamant Guardian", [rider("Adamant Guardian", ["Reposition", "Iron Guardian"]),
    char("Adamant Guardian rescue", { type: "modify_custom_ability", abilityNames: ["Daring Rescue"], removeUseLimit: true })]),
  rule("Shadowdancer", "Conjure Shade", [display, activate({ bonusAction: true }),
    notes("Conjure Shade", "Active Shade positions and distance from you")]),
  rule("Shadowdancer", "Dance of Shadows", [display, activate({ action: true }),
    fx("Dance of Shadows", { kind: "movement_option", movementTeleport: true, moveDistanceMode: "fixed", moveDistanceFixed: 30, moveWithoutOpportunityAttacks: true }),
    notes("Dance of Shadows", "Shade exchanged with; bonus-action timing unlocks at Fighter 15")]),
  rule("Shadowdancer", "Transfer Consciousness", [display, activate({ action: true }), notes("Transfer Consciousness", "Second Wind spent, body location, and 10-minute duration")]),
  rule("Shadowdancer", "Dark Sacrifice", [display, activate({ reaction: true }),
    notes("Dark Sacrifice", "Destroyed Shade, protected creature, and damage reduced by your Fighter level")]),
  rule("Shadowdancer", "Restorative Shadows", [display, activate({ action: true, noEconomyCost: true, requirements: [{ kind: "custom", text: "A Shade was destroyed by damage" }] }),
    notes("Restorative Shadows", "Roll two Exploit Dice and apply the resulting temporary HP")]),
  rule("Crusader", "Legendary Crusader", [display, activate({ reaction: true }),
    fx("Legendary Crusader", { kind: "weapon_attack" }), rider("Legendary Crusader", ["Crusader's Ire"])]),
  rule("Guerrilla", "By Land or Sea", [notes("By Land or Sea", "Ignore nonmagical difficult terrain; conditional swimming and climbing"),
    rider("By Land or Sea", ["Second Wind"])]),
  rule("Guerrilla", "Legendary Guerrilla", [display, activate({ onInitiative: true, requirements: [{ kind: "custom", text: "Not Surprised" }] }),
    notes("Legendary Guerrilla", "Apply temporary HP equal to your Fighter level"),
    rider("Legendary Guerrilla", ["Eye for Talent"])]),
  rule("Hound Master", "Loyal Hound", [display, activate({ bonusAction: true }),
    notes("Loyal Hound", "Commands; stabilization costs one Exploit Die and an action, not the command bonus action")]),
  rule("Hound Master", "War Hound", [notes("War Hound", "Hound's learned exploits and separate Exploit Dice")]),
  rule("Hound Master", "Steadfast Companions", [display, activate({ reaction: true }),
    notes("Steadfast Companions", "Special reaction used; companion within 30 feet; chosen saving throw")]),
  rule("Hound Master", "Hound of Legend", [
    rider("Hound of Legend", ["Loyal Hound"])]),
  rule("Pugilist", "Counter Punch", [display, activate({ reaction: true }),
    fx("Counter Punch", { kind: "weapon_attack", attackStyle: "melee" })]),
  rule("Pugilist", "Resolute Strikes", [rider("Resolute Strikes", ["Attack", "Unarmed Strike"])]),
  rule("Pugilist", "Diamond Physique", [char("Diamond Physique", { type: "grant_custom_ability", abilityNames: ["Unbreakable"] }), rider("Diamond Physique", ["Brace Up"])]),
  rule("Pugilist", "Legendary Pugilist", [rider("Legendary Pugilist", ["Attack", "Unarmed Strike"])]),
  rule("Quartermaster", "Rations", [notes("Rations", "Prepared rations, consumers, expiry, and Exploit Dice locked until consumption")]),
  rule("Quartermaster", "Ever Ready", [display, activate({ onInitiative: true, requirements: [{ kind: "custom", text: "Not Surprised" }] }), notes("Ever Ready", "Ration prepared at initiative without a die cost")]),
  rule("Swordsage", "Battle Trance", [display, activate({ bonusAction: true }),
    char("Battle Trance AC", { type: "ac", mode: "flat_bonus", flatBonus: 1, limitations: tranceLimits }, ["ac", "resource_ability_menu"]),
    fx("Battle Trance Acrobatics", { kind: "check_roll_modifier", checkCategory: "skill", checkSkills: ["Acrobatics"], checkRollMode: "advantage", limitations: tranceLimits }, ["check_roll_modifier"]),
    notes("Battle Trance", "Bonus-action Dash; once-per-turn free Swordsage Exploit uses a d4; end when wearing heavy armor or a shield"),
    { op: "setLimitedUses", uses: tranceUses },
    char("Battle Trance uses", { type: "uses", uses: tranceUses }, ["uses"]),
  ]),
  rule("Swordsage", "Mythic Reflexes", [char("Mythic Reflexes AC", { type: "ac", mode: "flat_bonus", flatBonus: 1, limitations: tranceLimits }, ["ac"])]),
  rule("Swordsage", "Reactive Trance", [display, activate({ onInitiative: true, requirements: [{ kind: "custom", text: "Not Surprised or Incapacitated" }] }), rider("Reactive Trance", ["Battle Trance"])]),
  rule("Swordsage", "Legendary Swordsage", [rider("Legendary Swordsage", ["Battle Trance"])]),
  rule("Tinker", "Inventive Arsenal", [notes("Inventive Arsenal", "Schematics assigned to each item and remaining charges")]),
  rule("Witchblade", "Sanguine Offering", [display, activate({ action: true, noEconomyCost: true }),
    rider("Sanguine Offering", ["Attack"]), notes("Sanguine Offering", "Once-per-turn use; self-damage and bonus damage resolved together")]),
  rule("Witchblade", "Legendary Witchblade", [display, activate({ reaction: true }),
    fx("Legendary Witchblade", { kind: "movement_option", movementTeleport: true }),
    notes("Legendary Witchblade", "Slain creature, adjacent destination, and temporary HP from its CR")]),
]
