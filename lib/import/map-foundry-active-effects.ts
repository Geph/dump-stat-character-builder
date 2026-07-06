import type { AbilityScoreKey, CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { characteristicCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import {
  charInstance,
  modId,
} from "@/lib/compendium/modifier-instance-builders"
import { createModifierInstanceId } from "@/lib/compendium/linked-modifiers"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { ImportModifierMeta } from "@/lib/import/detect-feature-modifiers"
import type { FoundryImportMeta, FoundryReviewEntry } from "@/lib/import/foundry-types"
import {
  formulaToFlatBonus,
  parseFoundryFormulaValue,
} from "@/lib/import/translate-foundry-formula"

const FOUNDRY_CHANGE_MODES = {
  CUSTOM: 0,
  MULTIPLY: 1,
  ADD: 2,
  DOWNGRADE: 3,
  UPGRADE: 4,
  OVERRIDE: 5,
} as const

const ABILITY_CODE_TO_KEY: Record<string, AbilityScoreKey> = {
  str: "strength",
  dex: "dexterity",
  con: "constitution",
  int: "intelligence",
  wis: "wisdom",
  cha: "charisma",
}

const SKILL_CODE_TO_NAME: Record<string, string> = {
  acr: "Acrobatics",
  ani: "Animal Handling",
  arc: "Arcana",
  ath: "Athletics",
  dec: "Deception",
  his: "History",
  ins: "Insight",
  itm: "Intimidation",
  inv: "Investigation",
  med: "Medicine",
  nat: "Nature",
  prc: "Perception",
  prf: "Performance",
  per: "Persuasion",
  rel: "Religion",
  slt: "Sleight of Hand",
  ste: "Stealth",
  sur: "Survival",
}

const DAMAGE_TYPE_LABELS: Record<string, string> = {
  acid: "Acid",
  bludgeoning: "Bludgeoning",
  cold: "Cold",
  fire: "Fire",
  force: "Force",
  lightning: "Lightning",
  necrotic: "Necrotic",
  piercing: "Piercing",
  poison: "Poison",
  psychic: "Psychic",
  radiant: "Radiant",
  slashing: "Slashing",
  thunder: "Thunder",
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as unknown as Record<string, unknown>)
    : {}
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function changeMode(value: unknown): number {
  if (typeof value === "number") return value
  const named = asString(value).toUpperCase()
  if (named === "ADD") return FOUNDRY_CHANGE_MODES.ADD
  if (named === "MULTIPLY") return FOUNDRY_CHANGE_MODES.MULTIPLY
  if (named === "UPGRADE") return FOUNDRY_CHANGE_MODES.UPGRADE
  if (named === "DOWNGRADE") return FOUNDRY_CHANGE_MODES.DOWNGRADE
  if (named === "OVERRIDE") return FOUNDRY_CHANGE_MODES.OVERRIDE
  return FOUNDRY_CHANGE_MODES.CUSTOM
}

function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export type FoundryEffectMappingResult = {
  linkedModifiers: LinkedModifierInstance[]
  importModifierMeta: ImportModifierMeta[]
  review: FoundryReviewEntry[]
}

function pushReview(
  review: FoundryReviewEntry[],
  label: string,
  detail: string,
  documentName?: string,
): void {
  review.push({ label, detail, documentName })
}

function pushCharacteristic(
  result: FoundryEffectMappingResult,
  effectName: string,
  changeKey: string,
  characteristic: CharacteristicModifier,
  modeLabel: string,
  documentName: string,
): void {
  const instanceId = createModifierInstanceId()
  result.linkedModifiers.push(
    charInstance(instanceId, characteristicCatalogRefId(characteristic.type), [characteristic]),
  )
  result.importModifierMeta.push({
    instanceId,
    ruleId: `foundry.effect.${changeKey}`,
    confidence: "high",
    matchedPhrase: `${effectName}: ${changeKey} (${modeLabel})`,
    source: "foundry_effect",
  })
}

function mapAcChange(
  result: FoundryEffectMappingResult,
  effectName: string,
  changeKey: string,
  mode: number,
  value: unknown,
  documentName: string,
): void {
  const parsed = parseFoundryFormulaValue(value)
  const flat = formulaToFlatBonus(parsed)

  if (mode === FOUNDRY_CHANGE_MODES.OVERRIDE && parsed?.kind === "ac_formula") {
    const abilityCodes = parsed.abilities.map(
      (ability) =>
        ({
          strength: "STR",
          dexterity: "DEX",
          constitution: "CON",
          intelligence: "INT",
          wisdom: "WIS",
          charisma: "CHA",
        })[ability] as "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA",
    )
    const instanceId = createModifierInstanceId()
    const characteristic: CharacteristicModifier = {
      id: modId(instanceId),
      type: "ac",
      mode: "ability_modifiers",
      base: parsed.base,
      abilities: abilityCodes,
      label: `${effectName} AC`,
    }
    result.linkedModifiers.push(
      charInstance(instanceId, characteristicCatalogRefId("ac"), [characteristic]),
    )
    result.importModifierMeta.push({
      instanceId,
      ruleId: "foundry.effect.ac.calc",
      confidence: "high",
      matchedPhrase: `${effectName}: ${String(value)}`,
      source: "foundry_effect",
    })
    return
  }

  if (flat != null && (mode === FOUNDRY_CHANGE_MODES.ADD || mode === FOUNDRY_CHANGE_MODES.UPGRADE)) {
    pushCharacteristic(
      result,
      effectName,
      changeKey,
      {
        id: modId(createModifierInstanceId()),
        type: "ac",
        mode: "flat_bonus",
        flatBonus: flat,
        label:
          mode === FOUNDRY_CHANGE_MODES.UPGRADE
            ? `${effectName} AC bonus (take higher)`
            : `${effectName} AC bonus`,
      },
      mode === FOUNDRY_CHANGE_MODES.UPGRADE ? "UPGRADE" : "ADD",
      documentName,
    )
    return
  }

  pushReview(
    result.review,
    "Unmapped AC effect",
    `${changeKey} mode ${mode} value ${String(value)}`,
    documentName,
  )
}

function mapSpeedChange(
  result: FoundryEffectMappingResult,
  effectName: string,
  changeKey: string,
  mode: number,
  value: unknown,
  documentName: string,
): void {
  const feet = formulaToFlatBonus(parseFoundryFormulaValue(value))
  if (feet == null || (mode !== FOUNDRY_CHANGE_MODES.ADD && mode !== FOUNDRY_CHANGE_MODES.OVERRIDE)) {
    pushReview(result.review, "Unmapped speed effect", `${changeKey} = ${String(value)}`, documentName)
    return
  }
  const speedType = changeKey.includes("fly")
    ? "fly"
    : changeKey.includes("swim")
      ? "swim"
      : changeKey.includes("climb")
        ? "climb"
        : "walk"
  pushCharacteristic(
    result,
    effectName,
    changeKey,
    {
      id: modId(createModifierInstanceId()),
      type: "speed",
      speedType,
      mode: "add",
      value: feet,
      label: `${effectName} ${titleCase(speedType)} speed`,
    },
    mode === FOUNDRY_CHANGE_MODES.OVERRIDE ? "OVERRIDE" : "ADD",
    documentName,
  )
}

function mapHpChange(
  result: FoundryEffectMappingResult,
  effectName: string,
  changeKey: string,
  mode: number,
  value: unknown,
  documentName: string,
): void {
  const parsed = parseFoundryFormulaValue(value)
  const flat = formulaToFlatBonus(parsed)
  if (flat == null) {
    pushReview(result.review, "Unmapped HP effect", `${changeKey} = ${String(value)}`, documentName)
    return
  }
  const perLevel = changeKey.includes("level") || parsed?.kind === "character_level"
  pushCharacteristic(
    result,
    effectName,
    changeKey,
    {
      id: modId(createModifierInstanceId()),
      type: "hit_points",
      mode: perLevel ? "per_level" : "flat",
      value: flat,
      label: perLevel ? `${effectName} HP per level` : `${effectName} HP`,
    },
    mode === FOUNDRY_CHANGE_MODES.UPGRADE ? "UPGRADE" : "ADD",
    documentName,
  )
}

function mapTraitValues(
  result: FoundryEffectMappingResult,
  effectName: string,
  traitKind: "dr" | "di" | "dv" | "ci",
  mode: number,
  value: unknown,
  documentName: string,
): void {
  const values = asArray(value)
    .map((entry) => {
      if (typeof entry === "string") return DAMAGE_TYPE_LABELS[entry.toLowerCase()] ?? titleCase(entry)
      const record = asRecord(entry)
      const key = asString(record.value) || asString(record)
      return DAMAGE_TYPE_LABELS[key.toLowerCase()] ?? titleCase(key)
    })
    .filter(Boolean)

  if (!values.length) {
    pushReview(result.review, `Unmapped ${traitKind.toUpperCase()} effect`, String(value), documentName)
    return
  }

  if (traitKind === "ci") {
    pushCharacteristic(
      result,
      effectName,
      `traits.${traitKind}`,
      {
        id: modId(createModifierInstanceId()),
        type: "condition_immunity",
        conditions: values,
        label: `${effectName} condition immunity`,
      },
      "ADD",
      documentName,
    )
    return
  }

  if (traitKind === "dv") {
    pushReview(
      result.review,
      "Damage vulnerability",
      `${values.join(", ")} — map manually in compendium`,
      documentName,
    )
    return
  }

  const charType = traitKind === "di" ? "damage_immunity" : "damage_resistance"
  pushCharacteristic(
    result,
    effectName,
    `traits.${traitKind}`,
    {
      id: modId(createModifierInstanceId()),
      type: charType,
      damageTypes: values,
      label: `${effectName} ${traitKind === "dr" ? "resistance" : traitKind === "di" ? "immunity" : "vulnerability"}`,
    },
    mode === FOUNDRY_CHANGE_MODES.OVERRIDE ? "OVERRIDE" : "ADD",
    documentName,
  )
}

function mapSkillChange(
  result: FoundryEffectMappingResult,
  effectName: string,
  skillCode: string,
  mode: number,
  value: unknown,
  documentName: string,
): void {
  const skill = SKILL_CODE_TO_NAME[skillCode.toLowerCase()]
  if (!skill) {
    pushReview(result.review, "Unmapped skill effect", skillCode, documentName)
    return
  }
  const bonus = formulaToFlatBonus(parseFoundryFormulaValue(value))
  if (bonus == null && mode !== FOUNDRY_CHANGE_MODES.OVERRIDE) {
    pushReview(result.review, "Unmapped skill bonus", `${skillCode} = ${String(value)}`, documentName)
    return
  }
  pushCharacteristic(
    result,
    effectName,
    `skills.${skillCode}`,
    {
      id: modId(createModifierInstanceId()),
      type: "skills",
      entries: [{ skill, expertise: (bonus ?? 0) >= 2 }],
      label: `${effectName} ${skill}`,
    },
    "ADD",
    documentName,
  )
}

function mapAttackBonus(
  result: FoundryEffectMappingResult,
  effectName: string,
  changeKey: string,
  mode: number,
  value: unknown,
  documentName: string,
): void {
  const bonus = formulaToFlatBonus(parseFoundryFormulaValue(value))
  if (bonus == null) {
    pushReview(result.review, "Unmapped attack bonus", `${changeKey} = ${String(value)}`, documentName)
    return
  }
  const target = changeKey.includes("rwak") || changeKey.includes("rsak") ? "ranged" : "melee"
  pushCharacteristic(
    result,
    effectName,
    changeKey,
    {
      id: modId(createModifierInstanceId()),
      type: "attack_roll_modifiers",
      entries: [{ target, bonus }],
      label: `${effectName} ${target} attack`,
    },
    "ADD",
    documentName,
  )
}

function mapDamageBonus(
  result: FoundryEffectMappingResult,
  effectName: string,
  changeKey: string,
  mode: number,
  value: unknown,
  documentName: string,
): void {
  const raw = asString(value).trim()
  const bonus = formulaToFlatBonus(parseFoundryFormulaValue(value))
  const dieMatch = raw.match(/(\d+)d(\d+)/i)
  pushCharacteristic(
    result,
    effectName,
    changeKey,
    {
      id: modId(createModifierInstanceId()),
      type: "damage_roll_modifiers",
      entries: [
        {
          target: changeKey.includes("rwak") || changeKey.includes("rsak") ? "ranged" : "melee",
          bonus: bonus ?? 0,
          bonusDiceWhenModifierIncluded: dieMatch ? `${dieMatch[1]}d${dieMatch[2]}` : undefined,
        },
      ],
      label: `${effectName} damage`,
    },
    "ADD",
    documentName,
  )
}

function mapVisionChange(
  result: FoundryEffectMappingResult,
  effectName: string,
  sense: string,
  value: unknown,
  documentName: string,
): void {
  const range = formulaToFlatBonus(parseFoundryFormulaValue(value))
  if (range == null) {
    pushReview(result.review, "Unmapped vision effect", `${sense} = ${String(value)}`, documentName)
    return
  }
  const visionType = sense.includes("dark") ? "darkvision" : sense.includes("tremor") ? "tremorsense" : "truesight"
  pushCharacteristic(
    result,
    effectName,
    `senses.${sense}`,
    {
      id: modId(createModifierInstanceId()),
      type: "vision",
      visionType,
      rangeFeet: range,
      label: `${effectName} ${titleCase(visionType)}`,
    },
    "ADD",
    documentName,
  )
}

function mapSingleChange(
  result: FoundryEffectMappingResult,
  effectName: string,
  change: Record<string, unknown>,
  documentName: string,
): void {
  const key = asString(change.key)
  const mode = changeMode(change.mode)
  const value = change.value

  if (!key) return

  if (key === "system.attributes.ac.bonus" || key.endsWith(".ac.bonus")) {
    mapAcChange(result, effectName, key, mode, value, documentName)
    return
  }
  if (key === "system.attributes.ac.calc" || key.endsWith(".ac.calc")) {
    mapAcChange(result, effectName, key, mode, value, documentName)
    return
  }

  if (key.startsWith("system.attributes.movement.")) {
    mapSpeedChange(result, effectName, key, mode, value, documentName)
    return
  }

  if (key.startsWith("system.attributes.hp.")) {
    mapHpChange(result, effectName, key, mode, value, documentName)
    return
  }

  if (key.startsWith("system.traits.dr.")) {
    mapTraitValues(result, effectName, "dr", mode, value, documentName)
    return
  }
  if (key.startsWith("system.traits.di.")) {
    mapTraitValues(result, effectName, "di", mode, value, documentName)
    return
  }
  if (key.startsWith("system.traits.dv.")) {
    mapTraitValues(result, effectName, "dv", mode, value, documentName)
    return
  }
  if (key.startsWith("system.traits.ci.")) {
    mapTraitValues(result, effectName, "ci", mode, value, documentName)
    return
  }

  const skillMatch = key.match(/^system\.skills\.([^.]+)\./)
  if (skillMatch) {
    mapSkillChange(result, effectName, skillMatch[1], mode, value, documentName)
    return
  }

  if (key.includes(".attack") && key.startsWith("system.bonuses.")) {
    mapAttackBonus(result, effectName, key, mode, value, documentName)
    return
  }
  if (key.includes(".damage") && key.startsWith("system.bonuses.")) {
    mapDamageBonus(result, effectName, key, mode, value, documentName)
    return
  }

  if (key.startsWith("system.attributes.senses.")) {
    const sense = key.split(".").pop() ?? "darkvision"
    mapVisionChange(result, effectName, sense, value, documentName)
    return
  }

  if (mode === FOUNDRY_CHANGE_MODES.MULTIPLY || mode === FOUNDRY_CHANGE_MODES.CUSTOM) {
    pushReview(
      result.review,
      "Review Foundry effect",
      `${key} (${mode === FOUNDRY_CHANGE_MODES.MULTIPLY ? "MULTIPLY" : "CUSTOM"}) = ${String(value)}`,
      documentName,
    )
    return
  }

  pushReview(result.review, "Unmapped Foundry effect key", `${key} = ${String(value)}`, documentName)
}

export function mapFoundryActiveEffects(
  effects: unknown[],
  documentName: string,
): FoundryEffectMappingResult {
  const result: FoundryEffectMappingResult = {
    linkedModifiers: [],
    importModifierMeta: [],
    review: [],
  }

  for (const rawEffect of effects) {
    const effect = asRecord(rawEffect)
    if (effect.disabled === true) continue
    const effectName = asString(effect.name) || documentName
    for (const rawChange of asArray(effect.changes)) {
      mapSingleChange(result, effectName, asRecord(rawChange), documentName)
    }
  }

  return result
}

export function mergeFoundryEffectMeta(
  meta: FoundryImportMeta,
  mapping: FoundryEffectMappingResult,
): void {
  meta.mapped.effects += mapping.linkedModifiers.length
  for (const entry of mapping.review) {
    meta.review.push(entry)
  }
}

export function attachFoundryEffectsToRow<
  T extends {
    name: string
    linkedModifiers?: LinkedModifierInstance[]
    modifierRefs?: string[]
    importModifierMeta?: ImportModifierMeta[]
  },
>(row: T, effects: unknown[], meta?: FoundryImportMeta): T {
  const mapping = mapFoundryActiveEffects(effects, row.name)
  if (meta) mergeFoundryEffectMeta(meta, mapping)
  if (!mapping.linkedModifiers.length && !mapping.importModifierMeta.length) {
    return row
  }
  return {
    ...row,
    linkedModifiers: [...(row.linkedModifiers ?? []), ...mapping.linkedModifiers],
    importModifierMeta: [...(row.importModifierMeta ?? []), ...mapping.importModifierMeta],
  }
}
