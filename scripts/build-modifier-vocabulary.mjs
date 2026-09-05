#!/usr/bin/env node
/**
 * Generates lib/import/modifier-vocabulary.generated.md from catalog option lists.
 * Semantics come only from declared `hint` (else UNDOCUMENTED). Do not hand-edit the md.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const OUT_REL = "lib/import/modifier-vocabulary.generated.md"
const OUT_PATH = join(ROOT, OUT_REL)
const MAX_LINES = 400

const BASE_FIELDS = new Set([
  "id",
  "type",
  "label",
  "sharedChoiceGroup",
  "sharedChoiceCount",
  "requiresSheetToggle",
  "limitations",
])

const LIST_TYPES = ["languages", "armor_proficiencies", "tool_proficiencies", "saving_throws"]

/** Intent buckets the model searches by. Named groups first, then leftovers from source groups. */
const INTENT_ORDER = [
  "resource spend",
  "roll modifier",
  "grant",
  "trigger",
  "companion",
  "equipment",
  "healing",
  "attack",
  "defense",
  "movement & senses",
  "spellcasting",
  "proficiencies & scores",
  "other",
]

export function repoRoot() {
  return ROOT
}

export function outputPath() {
  return OUT_PATH
}

function extractBalanced(source, openIndex, openCh, closeCh) {
  let depth = 0
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i]
    if (ch === openCh) depth++
    else if (ch === closeCh) {
      depth--
      if (depth === 0) return source.slice(openIndex, i + 1)
    }
  }
  throw new Error(`Unbalanced ${openCh}${closeCh} starting at ${openIndex}`)
}

function extractExportedArray(source, name) {
  const re = new RegExp(`export const ${name}[^=]*=\\s*\\[`)
  const match = re.exec(source)
  if (!match) throw new Error(`Missing export const ${name}`)
  const open = source.indexOf("[", match.index + match[0].length - 1)
  return extractBalanced(source, open, "[", "]")
}

function parseStringArray(raw) {
  const inner = raw.trim()
  if (!inner.startsWith("[")) return []
  return [...inner.matchAll(/"([^"]+)"/g)].map((m) => m[1])
}

function parseOptionObjects(arrayLiteral) {
  const body = arrayLiteral.slice(1, -1)
  const objects = []
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== "{") continue
    const block = extractBalanced(body, i, "{", "}")
    objects.push(block)
    i += block.length - 1
  }
  return objects.map((block) => {
    const value = /\bvalue:\s*("(?:\\.|[^"])*")/.exec(block)?.[1]
    const label = /\blabel:\s*("(?:\\.|[^"])*")/.exec(block)?.[1]
    const hint = /\bhint:\s*("(?:\\.|[^"])*")/.exec(block)?.[1]
    const group = /\bgroup:\s*("(?:\\.|[^"])*")/.exec(block)?.[1]
    const fieldsRaw = /\bfields:\s*(\[[^\]]*\])/.exec(block)?.[1]
    if (!value || !label) {
      throw new Error(`Option missing value/label: ${block.slice(0, 80)}`)
    }
    return {
      value: JSON.parse(value),
      label: JSON.parse(label),
      hint: hint ? JSON.parse(hint) : null,
      group: group ? JSON.parse(group) : null,
      fields: fieldsRaw ? parseStringArray(fieldsRaw) : [],
    }
  })
}

function parseInterfaceFields(block) {
  const required = []
  const optional = []
  const typeIds = []
  const typeLine = /(?:^|\n)\s*type:\s*([^\n]+)/.exec(block)
  if (typeLine) {
    const raw = typeLine[1].replace(/\/\/.*$/, "").trim()
    for (const m of raw.matchAll(/"([a-z0-9_]+)"/g)) typeIds.push(m[1])
    if (/\bListCharacteristicType\b/.test(raw)) typeIds.push(...LIST_TYPES)
  }
  const fieldRe = /(?:^|\n)\s*(?:readonly\s+)?([A-Za-z_][A-Za-z0-9_]*)(\?)?:\s/g
  let match
  while ((match = fieldRe.exec(block))) {
    const name = match[1]
    if (BASE_FIELDS.has(name) || name === "type") continue
    if (match[2]) optional.push(name)
    else required.push(name)
  }
  return { typeIds, required, optional }
}

function parseCharacteristicFields(source) {
  const byType = new Map()
  const re = /export interface (\w+Characteristic)\s+extends\s+\w+\s*\{/g
  let match
  while ((match = re.exec(source))) {
    const open = source.indexOf("{", match.index + match[0].length - 1)
    const block = extractBalanced(source, open, "{", "}")
    const parsed = parseInterfaceFields(block)
    for (const typeId of parsed.typeIds) {
      byType.set(typeId, { required: parsed.required, optional: parsed.optional })
    }
  }
  return byType
}

function placeholderForField(name) {
  if (/^(values|entries|spells|options|damageTypes|conditions|properties|skills|saves|targets|riders|grants|choiceGrants|classNames|featCategories|creatureNames|parentPowerNames|replacedFeatureNames|abilityNames|equipmentNames|itemOptions|contentKinds|attachToEquipmentNames|immuneToNamedSpells)$/.test(name)) {
    return "[]"
  }
  if (/Count|Bonus|Feet|Amount|Slots|Hours|Sides|Value|Radius|Turn/.test(name)) return "0"
  if (/^(mode|ability|die|size|scope|attackProfile|restoreOn|visionType|speedType|dieType|activation|containerName|prompt|target)$/.test(name)) {
    return '""'
  }
  if (/^(polymorph|fromSpells|linkHostItem|allowCustom|canHover|noSleepRequired|replacesLongRest|chooseDamageType)$/.test(name)) {
    return "false"
  }
  return "null"
}

function compactExample(obj) {
  return JSON.stringify(obj).replace(/":/g, '":').replace(/\s+/g, "")
}

function exampleForChar(type, fields) {
  const obj = { type }
  for (const name of fields.required) {
    const raw = placeholderForField(name)
    obj[name] = raw === "[]" ? [] : raw === "null" ? null : raw === "false" ? false : raw === "0" ? 0 : ""
  }
  return compactExample(obj)
}

function exampleForEffect(kind) {
  return compactExample({ kind })
}

function semantics(hint) {
  if (!hint || !hint.trim()) return "UNDOCUMENTED"
  return hint.replace(/\s+/g, " ").trim()
}

function fieldList(names) {
  return names.length ? names.join(", ") : "—"
}

/**
 * Map to intent using only identifiers and declared catalog groups (no invented prose).
 */
function intentOf(entry) {
  const id = entry.value
  const group = entry.group ?? ""
  if (/_trigger$/.test(id) || /_reaction$/.test(id)) return "trigger"
  if (id === "grant_creature" || id === "transform") return "companion"
  if (
    /equipment|inventory_container|player_note|craftable_items|held_items_cap|extra_wield|attunement/.test(
      id,
    )
  ) {
    return "equipment"
  }
  if (/^grant_|feature_choice_|subclass_unlock|catalog_option|modify_custom_ability/.test(id)) {
    return "grant"
  }
  if (
    /uses|class_resource|resource_ability|healing_dice_pool|hit_dice_restore|heal_from_pool|quicken_casting|activate_custom_ability/.test(
      id,
    )
  ) {
    return "resource spend"
  }
  if (
    /roll_modifier|check_roll|initiative|alternate_ability|forced_save_ability|weapon_ability_override/.test(
      id,
    )
  ) {
    return "roll modifier"
  }
  if (group === "resource_casting") return "resource spend"
  if (group === "checks_rolls") return "roll modifier"
  if (group === "healing_temp_hp") return "healing"
  if (group === "bonus_damage" || group === "extra_attacks") return "attack"
  if (group === "defensive") return "defense"
  if (group === "movement") return "movement & senses"
  if (group === "buff_debuff") return "grant"
  if (
    /resistance|immunity|damage_reduction|damage_halving|healing_received|boost_ac|impose_disadvantage/.test(
      id,
    )
  ) {
    return "defense"
  }
  if (
    /special_attack|attack_roll|damage_roll|unarmed|weapon_damage|weapon_reach|bonus_damage|extra_attack|weapon_attack|rider_damage|weapon_sheet_badge/.test(
      id,
    )
  ) {
    return "attack"
  }
  if (/spell|cast_/.test(id)) return "spellcasting"
  if (/speed|vision|telepathy|aura|creature_size|movement_effects/.test(id)) {
    return "movement & senses"
  }
  if (
    /ability_scores|skills|languages|proficienc|saving_throws|custom_skill|ac$|hit_points|ability_score_override/.test(
      id,
    )
  ) {
    return "proficiencies & scores"
  }
  if (id === "rest_replacement") return "resource spend"
  if (id === "extra_turn" || id === "power_rider" || id === "replace_feature" || id === "self_buff_caster") {
    return "other"
  }
  return "other"
}

function formatEntry(entry) {
  const layer = entry.layer
  const fields = entry.fields
  const req = layer === "char" ? fieldList(fields.required) : "—"
  const opt = layer === "char" ? fieldList(fields.optional) : fieldList(fields.optional)
  const example = layer === "char" ? exampleForChar(entry.value, fields) : exampleForEffect(entry.value)
  const meaning = semantics(entry.hint)
  return `- \`${entry.value}\` (${layer}) ${entry.label} — ${meaning} · req: ${req} · opt: ${opt} · \`${example}\``
}

export function buildModifierVocabularyMarkdown() {
  const charSource = readFileSync(join(ROOT, "lib/compendium/characteristic-modifiers.ts"), "utf8")
  const effectSource = readFileSync(join(ROOT, "lib/compendium/class-feature-metadata.ts"), "utf8")

  const charOptions = parseOptionObjects(extractExportedArray(charSource, "CHARACTERISTIC_MODIFIER_TYPE_OPTIONS"))
  const effectOptions = parseOptionObjects(extractExportedArray(effectSource, "ACTION_EFFECT_OPTIONS"))
  const fieldMap = parseCharacteristicFields(charSource)

  const entries = [
    ...charOptions.map((opt) => ({
      ...opt,
      layer: "char",
      fields: fieldMap.get(opt.value) ?? { required: [], optional: [] },
    })),
    ...effectOptions.map((opt) => ({
      ...opt,
      layer: "fx",
      fields: { required: [], optional: opt.fields },
    })),
  ]

  const missingFields = charOptions.filter((opt) => !fieldMap.has(opt.value)).map((opt) => opt.value)
  if (missingFields.length) {
    throw new Error(`No interface fields for: ${missingFields.join(", ")}`)
  }

  const grouped = new Map(INTENT_ORDER.map((name) => [name, []]))
  for (const entry of entries) {
    const intent = intentOf(entry)
    if (!grouped.has(intent)) grouped.set(intent, [])
    grouped.get(intent).push(entry)
  }

  const lines = [
    "# Modifier vocabulary (generated)",
    "",
    "Do not edit. Regenerated by `scripts/build-modifier-vocabulary.mjs` from",
    "`CHARACTERISTIC_MODIFIER_TYPE_OPTIONS` and `ACTION_EFFECT_OPTIONS`.",
    "Semantics = declared `hint`, or UNDOCUMENTED when the option has none.",
    "char = CharacteristicModifier `type`. fx = FeatureEffect `kind`.",
    "",
  ]

  for (const intent of INTENT_ORDER) {
    const rows = grouped.get(intent) ?? []
    if (!rows.length) continue
    lines.push(`## ${intent}`, "")
    for (const entry of rows) lines.push(formatEntry(entry))
    lines.push("")
  }

  const text = `${lines.join("\n").trimEnd()}\n`
  const lineCount = text.split("\n").length
  if (lineCount > MAX_LINES) {
    throw new Error(`${OUT_REL} would be ${lineCount} lines (cap ${MAX_LINES})`)
  }
  return { text, lineCount, entries }
}

export function writeModifierVocabulary() {
  const { text, lineCount, entries } = buildModifierVocabularyMarkdown()
  writeFileSync(OUT_PATH, text, "utf8")
  return { path: OUT_PATH, lineCount, count: entries.length }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  if (process.argv.includes("--print")) {
    process.stdout.write(buildModifierVocabularyMarkdown().text)
  } else {
    const result = writeModifierVocabulary()
    console.log(`Wrote ${result.path} (${result.count} entries, ${result.lineCount} lines)`)
  }
}
