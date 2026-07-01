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
  contentKind: "class_feature" | "subclass_feature" | "species_trait" | "feat" | "background_feature"
  sourceName?: string
  featureName?: string
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
  const char = instance.characteristics?.[0]
  if (char) {
    if (char.type === "skills") {
      const skills = char.entries?.map((entry) => entry.skill).sort().join(",") ?? "any"
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
      return `${instance.catalogRefId}:res:${(char.damageTypes ?? char.values ?? []).join(",")}`
    }
    if (char.type === "condition_immunity") {
      return `${instance.catalogRefId}:immune:${(char.conditions ?? char.values ?? []).join(",")}`
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
      return `${instance.catalogRefId}:${char.type}:${(char.values ?? []).join(",")}`
    }
    if (char.type === "weapon_proficiencies") {
      return `${instance.catalogRefId}:weapons:${char.mode}:${(char.values ?? []).join(",")}`
    }
    if (char.type === "saving_throws") {
      return `${instance.catalogRefId}:saves:${(char.values ?? []).join(",")}`
    }
    return `${instance.catalogRefId}:${char.type}`
  }
  const kind = instance.activation?.effects?.[0]?.kind ?? "fx"
  return `${instance.catalogRefId}:${kind}`
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

function detectFeatureModifiersByName(ctx: DetectFeatureContext): DetectedModifier[] {
  const featureName = ctx.featureName?.trim()
  if (!featureName) return []

  const results: DetectedModifier[] = []
  const seenFingerprints = new Set<string>()

  for (const rule of FEATURE_NAME_MODIFIER_RULES) {
    if (!rule.test(featureName, ctx)) continue
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

  return results
}

/** Detect common modifier wiring from freeform feature description text. */
export function detectFeatureModifiers(text: string, ctx: DetectFeatureContext): DetectedModifier[] {
  const normalized = normalizeText(text)
  const all: DetectedModifier[] = []
  const globalFingerprints = new Set<string>()

  for (const detection of detectFeatureModifiersByName(ctx)) {
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
  const existingFingerprints = new Set(existing.map(modifierInstanceFingerprint))
  const toAdd = detections
    .map((entry) => entry.instance)
    .filter((instance) => !existingFingerprints.has(modifierInstanceFingerprint(instance)))

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
