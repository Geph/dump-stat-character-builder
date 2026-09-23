/**
 * Compact BYO extraction prompt for free / base-tier LLMs.
 * Budget and design rules: docs/byo-prompt-design.md
 */
import type { ImportContentTypeHint } from "@/lib/import/content-type-hints"
import {
  parseClassResourceLabelList,
  type CustomSystemsImportHints,
} from "@/lib/import/custom-systems-import-hints"
import { AI_MECHANIC_KINDS } from "@/lib/import/modifier-wiring-registry"
import { RICH_TEXT_TABLE_HINT } from "@/lib/import/rich-text-import-hints"
import { CLASS_SPELL_LIST_IMPORT_HINT, SPELL_SCHOOL_IMPORT_HINT } from "@/lib/import/class-spell-lists"
import {
  BACKGROUND_LEGACY_IMPORT_HINT,
  CARD_BLURB_IMPORT_HINT,
  CHOICE_EXTRACTION_HINT,
  CREATURE_COMPANION_IMPORT_HINT,
  DUPLICATE_ABILITY_MERGE_HINT,
  FEAT_CATEGORY_IMPORT_HINT,
  MARKER_LEGEND_SCAN_HINT,
  NAME_SOURCE_MATCHING_HINT,
  PREREQUISITE_RULES_IMPORT_HINT,
  SUBCLASS_IMPORT_HINT,
} from "@/lib/import/content-schema"

/** Instruction text (everything before the source delimiter) must stay under this for every content type. */
export const BYO_LITE_PROMPT_MAX_CHARS = 30_000

export type ByoPromptMode = "full" | "lite"

export const LITE_BASE_PROMPT = `You are a D&D 2024 (5.5e) content parser. Convert the source text after the delimiter into JSON for Dump Stat.

Core rules:
1. Extract only what the source contains. Never invent rules, names, or numbers.
2. Copy every rules sentence verbatim into description. Dump Stat reads that exact wording to wire mechanics automatically, so keeping the sentence matters more than anything else in this prompt.
3. Class and subclass features include the level they are gained at.
4. Say "Species", not "Race".
5. If an entry is cut off, keep what is there and end its description with "[Source ends mid-entry]".
6. Use the same exact name string every time you refer to the same thing.`

export const LITE_SOURCE_FIT_HINT = `Source check:
- If the source does not fit this content type (a whole book, several unrelated classes, full spell write-ups inside a class chapter), do not output JSON. Reply in plain language telling the user how to split it.
- Ignore page numbers, running headers, and navigation text.
- Fix PDF paste artifacts: doubled ALL-CAPS letters ("S ST T R R" → "STR"), a stray superscript letter at the end of a name ("Returning WeaponK" → "Returning Weapon"), and tables whose cells ran together.`

const LITE_MECHANIC_SHAPES = [
  'skills: skills ["Stealth"] or choiceCount 2; grantExpertise true for expertise',
  'tool_proficiencies: tools ["Smith\'s Tools"]',
  'armor_proficiencies: armor ["Heavy Armor", "Shields"]; weapon_proficiencies: weaponMode martial_weapons | simple_weapons',
  'saving_throws: savingThrows ["Wisdom"]',
  'languages: languages ["Sylvan"] or languageChoiceCount 1',
  'spells_known: spellNames ["Misty Step"]; one entry per unlock tier with unlocksAtClassLevel',
  "spellcasting_ability: spellcastingAbility intelligence | wisdom | charisma",
  "uses: usesFixed 1, usesRecharge short_rest | long_rest (or usesProficiency true)",
  'damage_resistance: damageTypes ["Fire"]; condition_immunity: conditions ["Charmed"]',
  "speed: speedType walk | fly | swim | climb, speedFeet 30; vision: visionRangeFeet 60, visionType darkvision",
  'ac: acBase 10 + acAbilities ["dexterity", "wisdom"] or acFlatBonus 1',
  'grant_feat: featCategories ["Fighting Style"], featCount 1 (only when the feature grants a feat pick)',
  'grant_creature: creatureNames ["Wolf"]; grant_custom_ability: abilityNames ["Option Name"]',
  'extra_attack: extraAttackCount 1 (attacks beyond the first)',
  'on_hit_trigger: automatic extra damage — triggerOn hit, oncePerTurn true, bonusDice "1d6"',
  'power_rider: optional extra weapon damage — parentPowerNames ["Attack"], weaponDamageMenu true, selectable true, bonusDice "1d8"',
  'replace_feature: replacedFeatureNames ["Old Feature"] when an Improved feature changes cost or action type',
  'special_attack: its own attack or blast — attackProfile melee | ranged | force_save, damageDice "2d6", damageType, saveAbility',
  'temporary_hit_points: amount 5 or amountDice "1d10"; thpTrigger on_activation',
  "check_roll_modifier: checkRollMode advantage | disadvantage | bonus; checkCategory save | skill | ability | attack | initiative",
  'resource_ability_menu: "choose one of the following" — classResourceKey, menuOptions [{ name, description, resourceCost }]',
]

export const LITE_MECHANICS_HINT = `Mechanics (Dump Stat wires these for you)
- Do NOT output linkedModifiers or modifierRefs.
- mechanics[] on a feature, trait, feat, or ability is optional. Add it only when you are confident. Leaving it out is better than guessing field names.
- Allowed kind values: ${AI_MECHANIC_KINDS.join(", ")}. Never invent a kind.
- Every mechanics[] entry needs sourcePhrase (the verbatim rule sentence) and confidence (high | medium | low).
- If nothing fits, use { "kind": "unresolved", "sourcePhrase": "<the rule sentence>" }.
- A player pick between named options is isChoice + choices { category, count, options[] }, not mechanics[].
- A form or state ("while in this form") → declare once on the class or subclass: new_toggles [{ key, name, grantingFeature }]; then put requiresSheetToggle: key on the benefits. Rage, Wild Shape, and Bloodied (below_half_hp) need no declaration.
Common shapes (kind: fields):
${LITE_MECHANIC_SHAPES.map((line) => `- ${line}`).join("\n")}`

export const LITE_CLASS_RESOURCE_HINT = `Class resources (level-table pools)
- Each level-table column that counts something you spend (points, dice, uses) → one class_resources[] row: class_name, resource_key (lowercase snake_case), name (the column header), uses { type: "at_level", atLevelMode: "tier", atLevelTable: [{ level, count }], recharges: [{ rest: "short_rest" }, { rest: "long_rest" }] }. List only the rests the source names.
- Pool refills when you roll Initiative → uses.rechargeOnInitiative: true.
- A die-size column (d8 → d10 → d12) → uses.dieSidesByLevel on the same row.
- A column that is a cap or limit you do not spend (maximum spell level, ritual level, per-use limit) → uses.type "special".
- A pool introduced only by a subclass → also set subclass_name.
- Keep spend sentences in feature text ("expend one Exploit Die") so uses link to the pool.
- Never add class_resources rows for Hit Dice or spell slots. If casting costs HP or points, keep the cost table in the feature and do not invent spell slots.`

export const LITE_CUSTOM_ABILITY_HINT = `Custom ability libraries (maneuvers, exploits, disciplines, invocations, metamagic, upgrades)
- One import_proposals.custom_abilities[] row per option. Section, degree, and list headers are not rows.
- Fields: proposal_id (snake_case), name, ability_role (knack | discipline | psionic_power | class_talent | upgrade — omit if unsure), definition (one line), description (full rules), prerequisite (real prerequisites only), level_requirement, source_type (class | subclass | compendium), source_name, eligible_classes when the source lists classes, execution when there is an Execution / Activation / Trigger line.
- A rule stated once in a section intro (recharge, cost, level gate) applies to every row in that section. Copy it onto each row.
- Talents that belong to one package: nest them in that package's choices { category, count, options[] }.
- Powers with casting headers that the source calls psionic powers are custom abilities (ability_role psionic_power), never spells[]. Keep each augment as its own "<strong>Name (N points):</strong> …" list item.
- Keep spend and cost sentences verbatim ("expend one Exploit Die", "costs 1 sorcery point").
- Do not put the same row in both abilities[] and import_proposals.custom_abilities[].`

export const LITE_BATCHING_HINT = `Long output
- If the complete JSON would be too long to finish in one reply, stop after a complete entry and close every bracket so the JSON is valid.
- After the JSON, write one plain-text line (no braces or brackets): "Continue with: <what is left>".
- When the user replies "continue", return the next part as its own complete JSON object with the same names and source values. For a class, put the core class and class_resources in the first part and subclasses in later parts.
- The user imports each part in order.`

export const LITE_JSON_OUTPUT_RULES = `Output format (required)
- Return valid JSON only: no markdown fences and no text before it. The only text allowed after it is the "Continue with:" line.
- Inside strings, write line breaks as \\n (never a raw line break between quotes).
- Use null for optional fields you do not have. Omit top-level arrays for content types that are not in the source.
- Use short, stable source values ("phb", "eberron", or the publisher's short name), the same on every row.`

export function formatLiteCustomSystemsHint(
  hints: CustomSystemsImportHints | null | undefined,
): string {
  const category = hints?.abilityCategory?.trim() ?? ""
  const resources = parseClassResourceLabelList(hints?.classResourceLabels)
  if (!category && resources.length === 0) return ""
  const lines = ["User labels for this source:"]
  if (category) {
    lines.push(
      `- Ability library section: "${category}". Find the section with this header (or a close synonym); it is a grouping label, not a row.`,
    )
  }
  if (resources.length > 0) {
    lines.push(`- Class resources to look for: ${resources.join("; ")} → class_resources[] with these display names.`)
  }
  return lines.join("\n")
}

const LITE_HINTS_BY_TYPE: Partial<Record<ImportContentTypeHint, string[]>> = {
  classes: [
    CARD_BLURB_IMPORT_HINT,
    CHOICE_EXTRACTION_HINT,
    RICH_TEXT_TABLE_HINT,
    CLASS_SPELL_LIST_IMPORT_HINT,
    SPELL_SCHOOL_IMPORT_HINT,
    LITE_CLASS_RESOURCE_HINT,
    LITE_MECHANICS_HINT,
  ],
  subclasses: [
    CARD_BLURB_IMPORT_HINT,
    SUBCLASS_IMPORT_HINT,
    CHOICE_EXTRACTION_HINT,
    RICH_TEXT_TABLE_HINT,
    LITE_MECHANICS_HINT,
  ],
  species: [CHOICE_EXTRACTION_HINT, LITE_MECHANICS_HINT],
  backgrounds: [BACKGROUND_LEGACY_IMPORT_HINT, PREREQUISITE_RULES_IMPORT_HINT],
  spells: [SPELL_SCHOOL_IMPORT_HINT, RICH_TEXT_TABLE_HINT],
  feats: [FEAT_CATEGORY_IMPORT_HINT, PREREQUISITE_RULES_IMPORT_HINT, CHOICE_EXTRACTION_HINT, LITE_MECHANICS_HINT],
  creatures: [CREATURE_COMPANION_IMPORT_HINT],
  equipment: [],
  languages: [],
  abilities: [
    LITE_CUSTOM_ABILITY_HINT,
    DUPLICATE_ABILITY_MERGE_HINT,
    PREREQUISITE_RULES_IMPORT_HINT,
    LITE_CLASS_RESOURCE_HINT,
    LITE_MECHANICS_HINT,
  ],
  invocations_metamagic: [
    LITE_CUSTOM_ABILITY_HINT,
    MARKER_LEGEND_SCAN_HINT,
    PREREQUISITE_RULES_IMPORT_HINT,
    LITE_MECHANICS_HINT,
  ],
  all: [CHOICE_EXTRACTION_HINT, LITE_CLASS_RESOURCE_HINT, LITE_MECHANICS_HINT],
}

/** Content-type-scoped instruction blocks for the lite prompt (before focus / output rules / template). */
export function liteHintsForContentType(hint: ImportContentTypeHint): string[] {
  return [NAME_SOURCE_MATCHING_HINT, ...(LITE_HINTS_BY_TYPE[hint] ?? LITE_HINTS_BY_TYPE.all ?? [])]
}
