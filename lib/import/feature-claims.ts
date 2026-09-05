import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { ImportContent } from "@/lib/import/content-schema"
import type { ImportModifierMeta } from "@/lib/import/detect-feature-modifiers"
import type { UnresolvedMechanic } from "@/lib/import/parse-ai-mechanics"
import type { Feature } from "@/lib/types"

export const FEATURE_CLAIM_STATUSES = ["wired", "unresolved", "narrative"] as const

export type FeatureClaimStatus = (typeof FEATURE_CLAIM_STATUSES)[number]

/** One atomic mechanical (or narrative) assertion taken from a feature description. */
export type FeatureClaim = {
  id: string
  text: string
  status: FeatureClaimStatus
  /** Linked-modifier instance that satisfied this claim. */
  modifierId?: string | null
  /** Characteristic or effect id on that instance, when known. */
  effectId?: string | null
}

export type FeatureClaimCarrier = Pick<Feature, "name" | "description" | "level" | "linkedModifiers"> & {
  mechanics?: { kind?: string; sourcePhrase?: string }[]
  importModifierMeta?: ImportModifierMeta[]
  unresolvedMechanics?: UnresolvedMechanic[] | null
  claims?: FeatureClaim[] | null
  companion_stat_block?: Feature["companion_stat_block"]
  companion_creature_names?: Feature["companion_creature_names"]
  limitedUses?: Feature["limitedUses"]
  activation?: Feature["activation"]
  sheetDisplay?: Feature["sheetDisplay"]
  isChoice?: boolean
  choices?: Feature["choices"]
}

export type ClaimCount = {
  total: number
  wired: number
  unresolved: number
  narrative: number
}

export type FeatureClaimCoverage = {
  name: string
  level?: number
  claims: FeatureClaim[]
  totals: ClaimCount
}

export type LevelClaimCoverage = {
  level: number
  totals: ClaimCount
  features: FeatureClaimCoverage[]
}

export type ClassClaimCoverageReport = {
  className: string
  kind: "class" | "subclass"
  parentClassName?: string
  totals: ClaimCount
  byLevel: LevelClaimCoverage[]
  features: FeatureClaimCoverage[]
}

const MECHANICAL_RE =
  /\b(you (can|can't|cannot|gain|have|know|prepare|cast|expend|spend|take|make|choose|regain|restore|animate|command|heal|maintain|control|channel|draw|use|add|reduce|increase)|as an? |once you|can't exceed|must |hit points?|damage|attack|saving throw|spell slot|ritual|proficiency|bonus action|reaction|magic action|critical|resistance|immunity|speed|prepared|companion|thrall|undead|extradimensional|recharge|long rest|short rest)\b/i

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "your",
  "you",
  "with",
  "from",
  "that",
  "this",
  "as",
  "by",
  "at",
  "is",
  "are",
  "be",
  "it",
  "its",
  "if",
  "when",
  "can",
  "into",
  "over",
])

const TYPE_HINTS: { type: string; pattern: RegExp }[] = [
  { type: "grant_creature", pattern: /\b(thrall|companion|animate|undead|summon|skeleton|zombie|spirit|rise as)\b/i },
  { type: "special_attack", pattern: /\b(attack|damage|melee|necrotic|touch|hit)\b/i },
  { type: "inventory_container", pattern: /\b(extradimensional|space|corpse|hold up to|linked item)\b/i },
  { type: "uses", pattern: /\b(once you|can't use|long rest|short rest|recharge|expend a)\b/i },
  { type: "spells_known", pattern: /\b(always have|prepared|cantrip|know .{0,40}spell)\b/i },
  { type: "grant_feat", pattern: /\bfeat\b/i },
  { type: "damage_reduction", pattern: /\bno damage if you succeed|half damage if you fail|evasion\b/i },
  { type: "speed", pattern: /\bspeed\b/i },
  { type: "skills", pattern: /\bproficien(?:t|cy)\b/i },
  { type: "healing", pattern: /\b(heal|regain hit points|restore .{0,40}hit points|charnel touch.{0,40}heal)\b/i },
  { type: "ritual", pattern: /\b(ritual|10 minutes|during a short rest)\b/i },
  { type: "command", pattern: /\b(mentally control|without an action|command|take their turns)\b/i },
  { type: "resource", pattern: /\b(pool|points equal|replenish|charnel touch)\b/i },
  { type: "critical", pattern: /\b(critical hit|critical failure|19 or 20)\b/i },
]

function emptyCounts(): ClaimCount {
  return { total: 0, wired: 0, unresolved: 0, narrative: 0 }
}

function addCounts(target: ClaimCount, claim: FeatureClaim): void {
  target.total += 1
  target[claim.status] += 1
}

function sumCounts(rows: ClaimCount[]): ClaimCount {
  return rows.reduce(
    (acc, row) => ({
      total: acc.total + row.total,
      wired: acc.wired + row.wired,
      unresolved: acc.unresolved + row.unresolved,
      narrative: acc.narrative + row.narrative,
    }),
    emptyCounts(),
  )
}

function countsFromClaims(claims: FeatureClaim[]): ClaimCount {
  const totals = emptyCounts()
  for (const claim of claims) addCounts(totals, claim)
  return totals
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n")
    .replace(/<strong>/gi, "")
    .replace(/<\/strong>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\u00a0/g, " ")
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()
}

function significantWords(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
}

function phrasesOverlap(left: string, right: string): boolean {
  const a = normalize(left)
  const b = normalize(right)
  if (!a || !b) return false
  if (a.includes(b) || b.includes(a)) return true
  const wa = significantWords(a)
  const wb = significantWords(b)
  if (!wa.length || !wb.length) return false
  const overlap = wa.filter((word) => wb.includes(word))
  const needed = Math.min(3, Math.min(wa.length, wb.length))
  return overlap.length >= needed
}

function looksMechanical(text: string): boolean {
  return MECHANICAL_RE.test(text)
}

function isTitleFragment(text: string): boolean {
  const trimmed = text.trim().replace(/[.]+$/, "")
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length === 0 || words.length > 5) return false
  if (/\byou can\b/i.test(trimmed) || looksMechanical(trimmed)) return false
  return words.every(
    (word) => /^[A-Z0-9]/.test(word) || /^(and|or|your|the|of|a|an)$/i.test(word),
  )
}

function restoreProtected(text: string): string {
  return text.replace(/\u0001/g, ".")
}

function protectAbbreviations(text: string): string {
  return text
    .replace(/\b([A-Z])\./g, "$1\u0001")
    .replace(/\b(CR|HP|DC|ft|min)\./gi, "$1\u0001")
    .replace(/(\d)\.(\d)/g, "$1\u0001$2")
}

function splitCoordinatedClauses(text: string): string[] {
  const parts = text.split(/,\s+and\s+(?=the |you |each |once |when |as |your )/i)
  if (parts.length < 2) return [text]
  if (parts.every((part) => looksMechanical(part) || significantWords(part).length >= 4)) {
    return parts.map((part) => part.trim()).filter(Boolean)
  }
  return [text]
}

function splitSentences(block: string): string[] {
  const protectedText = protectAbbreviations(block.trim())
  const raw = protectedText
    .split(/(?<=[.!?])\s+(?=[A-Z“"])|(?<=[.!?])\s*\n+|\s*;\s+(?=[A-Z])/g)
    .flatMap((sentence) => sentence.split(/\s+(?:Additionally|In addition),?\s+/i))
    .map((sentence) => restoreProtected(sentence).trim())
    .filter(Boolean)

  const merged: string[] = []
  for (const sentence of raw) {
    if (merged.length && isTitleFragment(merged[merged.length - 1]!)) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${sentence}`.replace(/\s+/g, " ").trim()
      continue
    }
    merged.push(...splitCoordinatedClauses(sentence))
  }
  return merged.map((entry) => entry.replace(/^[•\-]\s*/, "").trim()).filter((entry) => entry.length > 8)
}

function extractHtmlParagraphs(description: string): string[] | null {
  const matches = [...description.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
  if (matches.length < 2) return null
  return matches
    .map((match) => stripHtml(match[1] ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
}

function hasLeadingSectionLabel(block: string): boolean {
  const match = block.match(/^([A-Z][\w'’ /-]{0,40})\.\s+\S/)
  if (!match?.[1]) return false
  return isTitleFragment(`${match[1]}.`)
}

function shouldSentenceSplit(block: string): boolean {
  if (hasLeadingSectionLabel(block)) return false
  return splitSentences(block).length > 1
}

/** Split a feature description into one-verb / one-effect claim texts. */
export function decomposeFeatureDescription(description: string | null | undefined): string[] {
  if (!description?.trim()) return []
  const htmlBlocks = extractHtmlParagraphs(description)
  const blocks =
    htmlBlocks ??
    stripHtml(description)
      .split(/\n+/)
      .map((block) => block.replace(/\s+/g, " ").trim())
      .filter(Boolean)

  const seen = new Set<string>()
  const claims: string[] = []
  for (const block of blocks) {
    const pieces = shouldSentenceSplit(block) ? splitSentences(block) : [block]
    for (const sentence of pieces) {
      const key = normalize(sentence)
      if (!key || seen.has(key)) continue
      seen.add(key)
      claims.push(sentence)
    }
  }
  return claims
}

type WireTarget = {
  modifierId: string
  effectId?: string | null
  phrases: string[]
  types: string[]
}

function effectIdsFromInstance(instance: LinkedModifierInstance): string[] {
  const ids: string[] = []
  for (const characteristic of instance.characteristics ?? []) {
    if (characteristic.id) ids.push(characteristic.id)
  }
  for (const effect of instance.activation?.effects ?? []) {
    if (effect.id) ids.push(effect.id)
  }
  return ids
}

function typesFromInstance(instance: LinkedModifierInstance): string[] {
  const types = new Set<string>()
  for (const characteristic of instance.characteristics ?? []) {
    if (characteristic.type) types.add(characteristic.type)
  }
  for (const effect of instance.activation?.effects ?? []) {
    if (effect.kind) types.add(effect.kind)
  }
  if (instance.catalogRefId) types.add(instance.catalogRefId.replace(/^cat_(?:char|fx)_/, ""))
  return [...types]
}

function collectWireTargets(feature: FeatureClaimCarrier): WireTarget[] {
  const targets: WireTarget[] = []
  const metaByInstance = new Map(
    (feature.importModifierMeta ?? []).map((entry) => [entry.instanceId, entry]),
  )

  for (const instance of feature.linkedModifiers ?? []) {
    const meta = metaByInstance.get(instance.instanceId)
    const types = typesFromInstance(instance)
    const phrases = [
      meta?.matchedPhrase,
      ...(feature.mechanics ?? [])
        .filter((mechanic) => mechanic.sourcePhrase && types.includes(mechanic.kind ?? ""))
        .map((mechanic) => mechanic.sourcePhrase),
    ].filter((phrase): phrase is string => Boolean(phrase?.trim()))
    targets.push({
      modifierId: instance.instanceId,
      effectId: effectIdsFromInstance(instance)[0] ?? null,
      phrases,
      types,
    })
  }

  if (feature.companion_stat_block || (feature.companion_creature_names?.length ?? 0) > 0) {
    targets.push({
      modifierId: "companion_stat_block",
      effectId: null,
      phrases: [feature.name, "companion", "stat block"],
      types: ["grant_creature", "companion"],
    })
  }
  if (feature.limitedUses) {
    targets.push({
      modifierId: `uses:${feature.limitedUses.type ?? "limited"}`,
      effectId: feature.limitedUses.classResourceKey ?? null,
      phrases: ["once you use", "until you finish", "long rest", "short rest"],
      types: ["uses", "resource"],
    })
  }
  if (feature.activation?.action) {
    targets.push({
      modifierId: "activation:action",
      effectId: null,
      phrases: ["as an action", "as a magic action", "magic action"],
      types: ["special_attack", "ritual"],
    })
  }
  if (feature.activation?.bonusAction) {
    targets.push({
      modifierId: "activation:bonus_action",
      effectId: null,
      phrases: ["as a bonus action", "bonus action"],
      types: ["command"],
    })
  }
  if (feature.activation?.reaction) {
    targets.push({
      modifierId: "activation:reaction",
      effectId: null,
      phrases: ["as a reaction", "take a reaction"],
      types: ["uses"],
    })
  }
  if (feature.sheetDisplay?.restDialogues) {
    targets.push({
      modifierId: "sheetDisplay:restDialogues",
      effectId: null,
      phrases: ["ritual", "10 minutes", "short rest"],
      types: ["ritual"],
    })
  }
  if (feature.isChoice && (feature.choices?.options?.length || feature.choices?.optionsSource)) {
    targets.push({
      modifierId: "choices",
      effectId: feature.choices?.optionsSource ?? null,
      phrases: ["choose", "choice"],
      types: ["grant_feat"],
    })
  }

  return targets
}

function hintTypesForClaim(text: string): string[] {
  return TYPE_HINTS.filter((entry) => entry.pattern.test(text)).map((entry) => entry.type)
}

function scoreTarget(claim: string, target: WireTarget): number {
  let score = 0
  for (const phrase of target.phrases) {
    if (phrasesOverlap(claim, phrase)) score += 4
  }
  const hints = hintTypesForClaim(claim)
  for (const hint of hints) {
    if (target.types.includes(hint)) score += 2
  }
  return score
}

function claimId(featureName: string, index: number): string {
  const slug = featureName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "feature"
  return `${slug}::claim::${index + 1}`
}

/**
 * Decompose a feature description and mark each claim wired / unresolved / narrative
 * against the modifiers already attached to the feature.
 */
export function assignFeatureClaims(feature: FeatureClaimCarrier): FeatureClaim[] {
  const texts = decomposeFeatureDescription(feature.description)
  for (const mechanic of feature.mechanics ?? []) {
    const phrase = mechanic.sourcePhrase?.trim()
    if (!phrase) continue
    if (texts.some((text) => phrasesOverlap(text, phrase))) continue
    texts.push(phrase)
  }
  for (const unresolved of feature.unresolvedMechanics ?? []) {
    const phrase = unresolved.sourcePhrase?.trim() || unresolved.raw
    if (!phrase) continue
    if (texts.some((text) => phrasesOverlap(text, phrase))) continue
    texts.push(phrase)
  }

  const targets = collectWireTargets(feature)
  const used = new Set<string>()
  const unresolvedPhrases = (feature.unresolvedMechanics ?? []).map(
    (entry) => entry.sourcePhrase || entry.raw,
  )

  return texts.map((text, index) => {
    const available = targets.filter((target) => !used.has(target.modifierId))
    let best: WireTarget | null = null
    let bestScore = 0
    for (const target of available) {
      const score = scoreTarget(text, target)
      if (score > bestScore) {
        best = target
        bestScore = score
      }
    }

    if (best && bestScore >= 4) {
      used.add(best.modifierId)
      return {
        id: claimId(feature.name, index),
        text,
        status: "wired" as const,
        modifierId: best.modifierId,
        effectId: best.effectId ?? null,
      }
    }

    if (unresolvedPhrases.some((phrase) => phrasesOverlap(text, phrase)) || looksMechanical(text)) {
      return {
        id: claimId(feature.name, index),
        text,
        status: "unresolved" as const,
      }
    }

    return {
      id: claimId(feature.name, index),
      text,
      status: "narrative" as const,
    }
  })
}

function withClaims<T extends FeatureClaimCarrier>(feature: T): T {
  return { ...feature, claims: assignFeatureClaims(feature) }
}

/** Attach (or refresh) claims on every imported feature-like row. */
export function attachImportFeatureClaims(content: ImportContent): ImportContent {
  const next: ImportContent = { ...content }

  if (content.classes?.length) {
    next.classes = content.classes.map((cls) => ({
      ...cls,
      features: (cls.features ?? []).map((feature) =>
        withClaims(feature as FeatureClaimCarrier),
      ) as typeof cls.features,
    }))
  }

  if (content.subclasses?.length) {
    next.subclasses = content.subclasses.map((subclass) => ({
      ...subclass,
      features: (subclass.features ?? []).map((feature) =>
        withClaims(feature as FeatureClaimCarrier),
      ) as typeof subclass.features,
    }))
  }

  if (content.species?.length) {
    next.species = content.species.map((species) => ({
      ...species,
      traits: (species.traits ?? []).map((trait) =>
        withClaims(trait as FeatureClaimCarrier),
      ) as typeof species.traits,
    }))
  }

  if (content.backgrounds?.length) {
    next.backgrounds = content.backgrounds.map((background) => {
      if (!background.feature) return background
      return {
        ...background,
        feature: withClaims(background.feature as FeatureClaimCarrier) as typeof background.feature,
      }
    })
  }

  if (content.feats?.length) {
    next.feats = content.feats.map((feat) => withClaims(feat as FeatureClaimCarrier)) as typeof content.feats
  }

  return next
}

function coverageForFeature(feature: FeatureClaimCarrier): FeatureClaimCoverage {
  const claims = feature.claims ?? assignFeatureClaims(feature)
  return {
    name: feature.name,
    level: feature.level,
    claims,
    totals: countsFromClaims(claims),
  }
}

function groupByLevel(features: FeatureClaimCoverage[]): LevelClaimCoverage[] {
  const levels = new Map<number, FeatureClaimCoverage[]>()
  for (const feature of features) {
    const level = feature.level ?? 0
    const list = levels.get(level) ?? []
    list.push(feature)
    levels.set(level, list)
  }
  return [...levels.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([level, rows]) => ({
      level,
      features: rows,
      totals: sumCounts(rows.map((row) => row.totals)),
    }))
}

/** Per-class (and subclass) claim coverage after enrich. */
export function collectClassClaimCoverage(content: ImportContent): ClassClaimCoverageReport[] {
  const reports: ClassClaimCoverageReport[] = []

  for (const cls of content.classes ?? []) {
    const features = (cls.features ?? []).map((feature) =>
      coverageForFeature(feature as FeatureClaimCarrier),
    )
    reports.push({
      className: cls.name,
      kind: "class",
      totals: sumCounts(features.map((feature) => feature.totals)),
      byLevel: groupByLevel(features),
      features,
    })
  }

  for (const subclass of content.subclasses ?? []) {
    const features = (subclass.features ?? []).map((feature) =>
      coverageForFeature(feature as FeatureClaimCarrier),
    )
    reports.push({
      className: subclass.name,
      kind: "subclass",
      parentClassName: subclass.class_name,
      totals: sumCounts(features.map((feature) => feature.totals)),
      byLevel: groupByLevel(features),
      features,
    })
  }

  return reports
}

function formatCounts(counts: ClaimCount): string {
  return `${counts.total} claims, ${counts.wired} wired, ${counts.unresolved} unresolved, ${counts.narrative} narrative`
}

/** Human-readable coverage report for a CLI or import review. */
export function formatClassClaimCoverageReport(reports: ClassClaimCoverageReport[]): string {
  if (!reports.length) return "No imported classes."
  const lines: string[] = []
  for (const report of reports) {
    const title =
      report.kind === "subclass" && report.parentClassName
        ? `${report.className} (${report.parentClassName} subclass)`
        : report.className
    lines.push(title)
    lines.push(`  ${formatCounts(report.totals)}`)
    for (const level of report.byLevel) {
      lines.push(`  L${level.level}: ${formatCounts(level.totals)}`)
      for (const feature of level.features) {
        lines.push(`    ${feature.name}: ${formatCounts(feature.totals)}`)
      }
    }
    lines.push("")
  }
  return lines.join("\n").trimEnd()
}

export function reportImportClaimCoverage(content: ImportContent): ClassClaimCoverageReport[] {
  return collectClassClaimCoverage(attachImportFeatureClaims(content))
}
