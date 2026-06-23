import { FEAT_PICK_CATEGORIES } from "@/lib/compendium/class-feature-metadata"

/** Characteristic / effect kinds BYO LLM may emit in mechanics[] (subset of the Common Modifier catalog). */
export const AI_MECHANIC_KINDS = [
  "skills",
  "tool_proficiencies",
  "armor_proficiencies",
  "weapon_proficiencies",
  "saving_throws",
  "ac",
  "hit_points",
  "attack_roll_modifiers",
  "damage_roll_modifiers",
  "damage_resistance",
  "condition_immunity",
  "speed",
  "vision",
  "uses",
  "check_roll_modifier",
  "extra_attack",
  "grant_feat",
] as const

const FEAT_CATEGORIES_FOR_IMPORT = FEAT_PICK_CATEGORIES.filter((category) =>
  ["Origin", "General", "Fighting Style", "Epic Boon"].includes(category),
)

/** Guidance for BYO LLM and server AI import prompts — how to match Common Modifier catalog entries. */
export const COMMON_MODIFIERS_IMPORT_HINT = `Common Modifier wiring (sheet-tracked effects)

Dump Stat links features, traits, and feats to reusable Common Modifier catalog entries (Skills, AC, Gain a Feat, Limited Uses, etc.). Import builds linkedModifiers automatically — do NOT output linkedModifiers or modifierRefs in your JSON.

Help matching in two ways (use both when helpful):
1. PRIMARY — Keep full mechanical sentences in description. A phrase matcher maps standard wording to catalog entries after import.
2. OPTIONAL — Add mechanics[] on a feature, trait, or feat when wording is unusual or you want an explicit catalog hint. Omit mechanics[] when description phrasing alone is enough.

Feat picks (ASI, Fighting Style, Epic Boon, Origin feat): do NOT use isChoice — preserve "gain/choose a … feat" text in description and/or mechanics[] with kind "grant_feat".
Purely narrative features: no mechanics[] needed.

Catalog reference (generated at import — do not emit these ids in JSON):
- Passive effects: cat_char_<type> — e.g. cat_char_skills, cat_char_ac, cat_char_grant_feat, cat_char_uses, cat_char_speed
- Active effects: cat_fx_<kind> — e.g. cat_fx_extra_attack, cat_fx_check_roll_modifier

Description phrasing the importer recognizes (preserve verbatim when possible):

Skills & expertise (cat_char_skills):
- "You gain proficiency in Stealth and Perception"
- "proficiency in one/two/three skills of your choice"
- "expertise in Stealth"

Tools, armor, weapons, saves:
- "proficiency with smith's tools" / "thieves' tools" (cat_char_tool_proficiencies)
- "proficiency with heavy armor" / "medium armor" / "shields" (cat_char_armor_proficiencies)
- "proficiency with martial weapons" (cat_char_weapon_proficiencies)
- "proficiency in Strength and Constitution saving throws" (cat_char_saving_throws)

Armor Class (cat_char_ac):
- "While you are not wearing armor, your AC equals 10 + your Dexterity modifier + your Wisdom modifier"
- "your AC equals 13 + your Dexterity modifier"
- "+1 bonus to AC while wearing armor" (flat bonus)

Hit points (cat_char_hit_points):
- "hit point maximum increases by 1 per level" / "by 2 for each level"

Attacks & damage:
- "+2 bonus to attack rolls with ranged weapons" (cat_char_attack_roll_modifiers)
- "deal an extra 1d6 fire damage" (cat_char_damage_roll_modifiers)
- "attack twice whenever you take the Attack action" (cat_fx_extra_attack — also use mechanics[] kind extra_attack if phrasing differs)

Resistances & immunities:
- "resistance to fire and cold damage" (cat_char_damage_resistance)
- "immune to the charmed condition" (cat_char_condition_immunity)

Speed & senses:
- "walking speed increases by 10 feet" / "fly speed of 30 feet" (cat_char_speed)
- "darkvision within 60 feet" (cat_char_vision)

Limited uses (cat_char_uses):
- "use this feature 3 times, regaining all expended uses when you finish a long rest"
- "once per short or long rest"
- "a number of times equal to your proficiency bonus, regaining all uses on a long rest"

Advantage on saves/checks:
- "advantage on Constitution saving throws" (cat_fx_check_roll_modifier or preserve exact wording)
- "advantage on Stealth checks"

Gain a Feat (cat_char_grant_feat) — never isChoice for these:
- "You gain a Fighting Style feat of your choice"
- "You gain an Epic Boon feat of your choice"
- "You gain an Origin feat"
- "choose a general feat of your choice"

Optional mechanics[] (per feature/trait/feat):
Allowed kind values: ${AI_MECHANIC_KINDS.join(", ")}
Always include sourcePhrase (quote the rule sentence). Set confidence to "high" when certain.

Field cheat sheet by kind:
- skills: skills ["Stealth"], grantExpertise true/false, or choiceCount for "pick N skills"
- tool_proficiencies: tools ["Smith's Tools"]
- armor_proficiencies: armor ["Heavy Armor", "Shields"]
- weapon_proficiencies: weaponMode "martial_weapons" | "simple_weapons"
- saving_throws: savingThrows ["Strength", "Constitution"]
- ac: acBase 10, acAbilities ["dexterity","wisdom"] OR acFlatBonus 1
- hit_points: hpMode "per_level", hpValue 1
- attack_roll_modifiers: attackBonus 2, attackTarget "ranged" | "melee" | "all"
- damage_roll_modifiers: bonusDice "1d6", damageType "fire"
- damage_resistance: damageTypes ["Fire", "Cold"]
- condition_immunity: conditions ["Charmed"]
- speed: speedType "walk"|"fly"|"swim"|"climb", speedFeet 10
- vision: visionRangeFeet 60
- uses: usesFixed 2, usesRecharge "short_rest"|"long_rest"|"both"; OR usesAbility "WIS" with usesRecharge
- check_roll_modifier: checkRollMode "advantage", checkCategory "save"|"skill", checkAbility "Constitution", checkSkills ["Stealth"]
- extra_attack: no extra fields (Extra Attack feature)
- grant_feat: featCategories ${JSON.stringify(FEAT_CATEGORIES_FOR_IMPORT)} (e.g. ["Fighting Style"]), featCount 1

Example feature with explicit modifier hint:
{
  "level": 2,
  "name": "Fighting Style",
  "description": "You gain a Fighting Style feat of your choice. If you choose Great Weapon Fighting, you can use it with ranged weapons.",
  "mechanics": [
    {
      "kind": "grant_feat",
      "featCategories": ["Fighting Style"],
      "featCount": 1,
      "sourcePhrase": "You gain a Fighting Style feat of your choice.",
      "confidence": "high"
    }
  ]
}`
