import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import {
  FEATURE_MODIFIER_RULES,
  FEATURE_NAME_MODIFIER_RULES,
  type DetectionConfidence,
  type FeatureModifierRule,
} from "@/lib/import/detect-feature-modifier-rules"
import type { Feature } from "@/lib/types"

export type { DetectionConfidence, FeatureModifierRule }

export type DetectFeatureContext = {
  contentKind:
    | "class_feature"
    | "subclass_feature"
    | "species_trait"
    | "feat"
    | "background_feature"
    | "ability"
  sourceName?: string
  featureName?: string
  /** When set, feature-name rules also match this SRD-standard name (renamed ports). */
  basedOnSrdFeature?: string
  level?: number
  classPrefix?: string
}

export type DetectedModifier = {
  ruleId: string
  confidence: DetectionConfidence
  matchedPhrase: string
  instance: LinkedModifierInstance
}

export type ImportModifierMeta = {
  instanceId: string
  ruleId: string
  confidence: DetectionConfidence
  matchedPhrase: string
  source: "ai" | "detector" | "foundry_effect"
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

function clauseSegments(text: string): string[] {
  const normalized = normalizeText(text)
  if (!normalized) return []
  const parts = normalized.split(/(?<=[.!?;])\s+|\n+/).map((part) => part.trim()).filter(Boolean)
  return parts.length ? parts : [normalized]
}

export function modifierInstanceFingerprint(instance: LinkedModifierInstance): string {
  const normalizeList = (values: string[] | undefined) =>
    (values ?? []).map((value) => value.toLowerCase()).join(",")

  const char = instance.characteristics?.[0]
  if (char) {
    if (char.type === "skills") {
      const skills =
        char.entries?.map((entry) => entry.skill.toLowerCase()).sort().join(",") ?? "any"
      return `${instance.catalogRefId}:skills:${skills}:${char.choiceCount ?? ""}`
    }
    if (char.type === "ac") {
      return `${instance.catalogRefId}:ac:${char.mode}:${char.base ?? ""}:${char.flatBonus ?? ""}:${(char.abilities ?? []).join("+")}`
    }
    if (char.type === "hit_points") {
      return `${instance.catalogRefId}:hp:${char.mode}:${char.value}`
    }
    if (char.type === "attack_roll_modifiers") {
      return `${instance.catalogRefId}:attack:${JSON.stringify(char.entries ?? [])}`
    }
    if (char.type === "damage_resistance") {
      return `${instance.catalogRefId}:res:${normalizeList(char.damageTypes)}`
    }
    if (char.type === "condition_immunity") {
      return `${instance.catalogRefId}:immune:${normalizeList(char.conditions)}`
    }
    if (char.type === "speed") {
      return `${instance.catalogRefId}:speed:${char.speedType}:${char.value}`
    }
    if (char.type === "vision") {
      return `${instance.catalogRefId}:vision:${char.visionType}:${char.rangeFeet}`
    }
    if (char.type === "uses") {
      return `${instance.catalogRefId}:uses:${char.uses?.type}:${char.uses?.fixedAmount ?? ""}:${char.uses?.abilityModifier ?? ""}`
    }
    if (char.type === "tool_proficiencies" || char.type === "armor_proficiencies") {
      return `${instance.catalogRefId}:${char.type}:${normalizeList(char.values)}`
    }
    if (char.type === "weapon_proficiencies") {
      return `${instance.catalogRefId}:weapons:${char.mode}:${normalizeList(char.values)}`
    }
    if (char.type === "saving_throws") {
      return `${instance.catalogRefId}:saves:${normalizeList(char.values)}`
    }
    if (char.type === "languages") {
      return `${instance.catalogRefId}:lang:${normalizeList(char.values)}:${char.choiceCount ?? ""}`
    }
    if (char.type === "spells_known") {
      const spellIds = (char.spells ?? []).map((entry) => entry.spellId).join(",")
      const grants = (char.choiceGrants ?? []).map((g) => `${g.level}x${g.count}`).join("+")
      return `${instance.catalogRefId}:spells:${spellIds}:${grants}`
    }
    return `${instance.catalogRefId}:${char.type}`
  }
  const effects = instance.activation?.effects ?? []
  if (effects.length) {
    const fx = effects[0]
    const category = fx.checkCategory ?? ""
    const ability = fx.checkAbility ?? ""
    const mode = fx.checkRollMode ?? fx.kind ?? "fx"
    if (fx.kind === "check_roll_modifier" || fx.kind?.startsWith("check_")) {
      return `${instance.catalogRefId}:${category}:${ability}:${mode}`
    }
    return `${instance.catalogRefId}:${fx.kind ?? "fx"}`
  }
  return `${instance.catalogRefId}:fx`
}

function proficiencyListValues(instance: LinkedModifierInstance): string[] | null {
  const char = instance.characteristics?.[0]
  if (char?.type !== "armor_proficiencies" && char?.type !== "tool_proficiencies") return null
  return (char.values ?? []).map((value) => value.toLowerCase())
}

/**
 * True when `candidate` matches an existing fingerprint, or (for armor/tool
 * proficiency lists) every value is already covered by existing instances of
 * the same type — so detector partials like "Medium armor" alone do not pile
 * onto a Martial Training preset that already includes Medium armor + Shields.
 */
export function isModifierRedundantAgainst(
  candidate: LinkedModifierInstance,
  existing: LinkedModifierInstance[],
): boolean {
  const fingerprint = modifierInstanceFingerprint(candidate)
  if (existing.some((entry) => modifierInstanceFingerprint(entry) === fingerprint)) {
    return true
  }

  const candidateValues = proficiencyListValues(candidate)
  if (!candidateValues?.length) return false

  const candidateType = candidate.characteristics?.[0]?.type
  const covered = new Set<string>()
  for (const entry of existing) {
    if (entry.characteristics?.[0]?.type !== candidateType) continue
    for (const value of proficiencyListValues(entry) ?? []) covered.add(value)
  }
  return candidateValues.every((value) => covered.has(value))
}

function runRulesOnSegment(
  segment: string,
  ctx: DetectFeatureContext,
  rules: FeatureModifierRule[],
): DetectedModifier[] {
  const results: DetectedModifier[] = []
  const seenFingerprints = new Set<string>()
  const segmentRules = rules.filter((rule) => rule.scope !== "full")

  for (const rule of segmentRules) {
    const match = segment.match(rule.test)
    if (!match) continue
    const instance = rule.build(match, ctx, segment)
    if (!instance) continue
    const fingerprint = modifierInstanceFingerprint(instance)
    if (seenFingerprints.has(fingerprint)) continue
    seenFingerprints.add(fingerprint)
    results.push({
      ruleId: rule.id,
      confidence: rule.confidence,
      matchedPhrase: match[0].trim(),
      instance,
    })
  }

  return results
}

function detectFeatureModifiersByName(
  ctx: DetectFeatureContext,
  description?: string,
): DetectedModifier[] {
  const names = [ctx.featureName, ctx.basedOnSrdFeature]
    .map((name) => name?.trim())
    .filter((name): name is string => Boolean(name))
  const uniqueNames = [...new Set(names)]
  if (!uniqueNames.length) return []

  const results: DetectedModifier[] = []
  const seenFingerprints = new Set<string>()
  const desc = description?.trim() ?? ""

  for (const featureName of uniqueNames) {
    for (const rule of FEATURE_NAME_MODIFIER_RULES) {
      if (!rule.test(featureName, ctx)) continue
      if (
        desc &&
        rule.suppressWhenDescriptionMatches?.some((pattern) => pattern.test(desc))
      ) {
        continue
      }
      const instance = rule.build(ctx)
      if (!instance) continue
      const fingerprint = modifierInstanceFingerprint(instance)
      if (seenFingerprints.has(fingerprint)) continue
      seenFingerprints.add(fingerprint)
      results.push({
        ruleId: rule.id,
        confidence: rule.confidence,
        matchedPhrase: featureName,
        instance,
      })
    }
  }

  return results
}

/** Detect common modifier wiring from freeform feature description text. */
export function detectFeatureModifiers(text: string, ctx: DetectFeatureContext): DetectedModifier[] {
  const normalized = normalizeText(text)
  const all: DetectedModifier[] = []
  const globalFingerprints = new Set<string>()

  for (const detection of detectFeatureModifiersByName(ctx, normalized)) {
    const fp = modifierInstanceFingerprint(detection.instance)
    if (globalFingerprints.has(fp)) continue
    globalFingerprints.add(fp)
    all.push(detection)
  }

  if (!normalized) return all

  const segments = clauseSegments(normalized)
  for (const segment of segments) {
    for (const detection of runRulesOnSegment(segment, ctx, FEATURE_MODIFIER_RULES)) {
      const fp = modifierInstanceFingerprint(detection.instance)
      if (globalFingerprints.has(fp)) continue
      globalFingerprints.add(fp)
      all.push(detection)
    }
  }

  const fullTextRules = FEATURE_MODIFIER_RULES.filter((rule) => rule.scope === "full")
  for (const rule of fullTextRules) {
    const match = normalized.match(rule.test)
    if (!match) continue
    const instance = rule.build(match, ctx, normalized)
    if (!instance) continue
    const fp = modifierInstanceFingerprint(instance)
    if (globalFingerprints.has(fp)) continue
    globalFingerprints.add(fp)
    all.push({
      ruleId: rule.id,
      confidence: rule.confidence,
      matchedPhrase: match[0].trim(),
      instance,
    })
  }

  return all
}

export function mergeDetectionsIntoFeature(
  feature: Feature,
  detections: DetectedModifier[],
): Feature {
  if (!detections.length) return feature

  const existing = feature.linkedModifiers ?? []
  const toAdd = detections
    .map((entry) => entry.instance)
    .filter((instance) => !isModifierRedundantAgainst(instance, existing))

  if (!toAdd.length) return feature

  return syncModifierRefs({
    ...feature,
    linkedModifiers: [...existing, ...toAdd],
  })
}

export function mergeFeatureModifierDetections(
  feature: Feature,
  aiDetections: DetectedModifier[],
  detectorDetections: DetectedModifier[],
): Feature & { importModifierMeta?: ImportModifierMeta[] } {
  let current = feature
  const meta: ImportModifierMeta[] = []
  const seenFingerprints = new Set(
    (feature.linkedModifiers ?? []).map(modifierInstanceFingerprint),
  )

  const applyBatch = (batch: DetectedModifier[], source: ImportModifierMeta["source"]) => {
    for (const detection of batch) {
      const fingerprint = modifierInstanceFingerprint(detection.instance)
      if (seenFingerprints.has(fingerprint)) continue
      if (isModifierRedundantAgainst(detection.instance, current.linkedModifiers ?? [])) continue
      const beforeCount = current.linkedModifiers?.length ?? 0
      current = mergeDetectionsIntoFeature(current, [detection])
      const afterCount = current.linkedModifiers?.length ?? 0
      if (afterCount <= beforeCount) continue
      const added = current.linkedModifiers?.[afterCount - 1]
      if (!added) continue
      seenFingerprints.add(fingerprint)
      meta.push({
        instanceId: added.instanceId,
        ruleId: detection.ruleId,
        confidence: detection.confidence,
        matchedPhrase: detection.matchedPhrase,
        source,
      })
    }
  }

  applyBatch(aiDetections, "ai")
  applyBatch(detectorDetections, "detector")

  if (!meta.length) return current
  return { ...current, importModifierMeta: meta }
}

export function modifierSummaryFromInstance(instance: LinkedModifierInstance): string {
  const char = instance.characteristics?.[0] as CharacteristicModifier | undefined
  if (char?.type === "grant_feat") {
    const categories = char.featCategories?.length ? char.featCategories.join(", ") : "General"
    return char.label ?? `Gain a Feat (${categories})`
  }
  if (char?.label) return char.label
  if (char?.type) return char.type.replace(/_/g, " ")
  const kind = instance.activation?.effects?.[0]?.kind
  return kind ? kind.replace(/_/g, " ") : instance.catalogRefId
}
