/**
 * Walk shipped class/subclass features vs class_resources and report
 * prose that spends or restores a pool without a matching FeatureEffect.
 */
import { canonicalThirdPartyResourceKey } from "@/lib/character/infer-class-resource-spend"
import { THIRD_PARTY_RESOURCE_PATTERNS } from "@/lib/import/third-party-resources"
import { enrichSrdClassList } from "@/lib/compendium/enrich-srd-classes"
import { enrichSrdSubclassRow } from "@/lib/compendium/enrich-srd-subclasses"
import { SRD_CLASS_RESOURCES_BY_NAME } from "@/lib/compendium/class-resources-defaults"
import { loadKibblesTastyPack } from "@/lib/seed-packs/kibbles-tasty/load"
import { loadMageHandPressPack } from "@/lib/seed-packs/mage-hand-press/load"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature, FeatureEffect, FeatureActivation, UsesConfig } from "@/lib/types"
import srdClasses from "@/lib/srd/seed-data/classes.json"
import srdSubclasses from "@/lib/srd/seed-data/subclasses.json"

export type ResourceGraphMiss = {
  class: string
  feature: string
  level: number
  resource: string
  phrase: string
}

export type ResourceGraphOrphanSpend = {
  class: string
  feature: string
  level: number
  resourceKey: string
}

export type ResourceGraphAuditResult = {
  misses: ResourceGraphMiss[]
  orphanSpends: ResourceGraphOrphanSpend[]
}

export function resourceGraphMissKey(row: ResourceGraphMiss): string {
  return `${row.class}|${row.feature}|${row.level}|${row.resource}|${row.phrase}`
}

export function resourceGraphOrphanKey(row: ResourceGraphOrphanSpend): string {
  return `${row.class}|${row.feature}|${row.level}|${row.resourceKey}`
}

export function filterResourceGraphCatalog(
  catalog: readonly ResourceGraphClassInput[],
  classNames: readonly string[] | null | undefined,
): ResourceGraphClassInput[] {
  if (!classNames?.length) return [...catalog]
  const wanted = new Set(classNames.map((name) => name.trim().toLowerCase()).filter(Boolean))
  return catalog.filter((row) => wanted.has(row.name.trim().toLowerCase()))
}

export type ResourceGraphResource = {
  resource_key: string
  name: string
  uses?: UsesConfig | null
  display?: "tracker" | "static" | "hidden" | null
}

export type ResourceGraphClassInput = {
  name: string
  features?: Feature[] | null
  resources?: ResourceGraphResource[] | null
  subclassFeatures?: { subclassName: string; features: Feature[] }[] | null
}

const RESERVED_RESOURCE_KEYS = new Set(["spell_slots", "pact_magic_slots"])

const SPEND_OR_RESTORE_CUE =
  /\b(?:expend(?:s|ed|ing)?|spend(?:s|ing)?|spent|costs?|pay(?:s|ing)?|regain(?:s|ed)?|restore(?:s|d)?|replenish(?:es|ed)?|refresh(?:es|ed)?)\b/i

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function resourceKeysMatch(left: string, right: string): boolean {
  const a = left.trim().toLowerCase()
  const b = right.trim().toLowerCase()
  if (!a || !b) return false
  if (a === b) return true
  const ca = canonicalThirdPartyResourceKey(a)
  const cb = canonicalThirdPartyResourceKey(b)
  if (ca === cb) return true
  return a.endsWith(`_${b}`) || b.endsWith(`_${a}`) || ca.endsWith(`_${cb}`) || cb.endsWith(`_${ca}`)
}

export function isReservedResourceKey(resourceKey: string): boolean {
  const key = resourceKey.trim().toLowerCase()
  return RESERVED_RESOURCE_KEYS.has(key) || RESERVED_RESOURCE_KEYS.has(canonicalThirdPartyResourceKey(key))
}

/** Caps and static columns are not spent; mentioning them is not a wiring miss. */
export function isSpendableClassResource(resource: ResourceGraphResource): boolean {
  if (resource.display === "static" || resource.display === "hidden") return false
  const type = resource.uses?.type
  if (type === "special" || type === "unlimited") return false
  if (isReservedResourceKey(resource.resource_key)) return false
  return true
}

export function aliasesForResource(resource: ResourceGraphResource): string[] {
  const aliases = new Set<string>()
  const name = resource.name.trim()
  const keyWords = resource.resource_key.replace(/_/g, " ").trim()
  if (name) aliases.add(name)
  if (keyWords) aliases.add(keyWords)
  const stripped = name.replace(/\s+(points?|dice|die|uses)$/i, "").trim()
  if (stripped.length >= 3) aliases.add(stripped)
  const pattern = THIRD_PARTY_RESOURCE_PATTERNS.find(
    (entry) =>
      entry.resourceKey === resource.resource_key ||
      resource.resource_key.endsWith(`_${entry.resourceKey}`),
  )
  if (
    pattern?.displayName &&
    (!name || name.toLowerCase() === pattern.displayName.toLowerCase())
  ) {
    aliases.add(pattern.displayName)
  }
  return [...aliases]
    .map((alias) => alias.trim())
    .filter((alias) => alias.length >= 3)
    .sort((a, b) => b.length - a.length)
}

function addKey(into: Set<string>, value: unknown) {
  if (typeof value === "string" && value.trim()) into.add(value.trim())
}

function walkActivationKeys(activation: FeatureActivation | null | undefined, into: Set<string>) {
  if (!activation) return
  addKey(into, activation.spendClassResourceKey)
  for (const effect of activation.effects ?? []) {
    addKey(into, effect.classResourceKey)
  }
}

function walkEffectKeys(effects: FeatureEffect[] | null | undefined, into: Set<string>) {
  for (const effect of effects ?? []) {
    addKey(into, effect.classResourceKey)
  }
}

function walkCharacteristicKeys(characteristic: Record<string, unknown>, into: Set<string>) {
  addKey(into, characteristic.classResourceKey)
  addKey(into, characteristic.resourceKey)
  const uses = characteristic.uses
  if (uses && typeof uses === "object") {
    addKey(into, (uses as { classResourceKey?: string }).classResourceKey)
  }
  const bonusConfig = characteristic.bonusConfig
  if (bonusConfig && typeof bonusConfig === "object") {
    addKey(into, (bonusConfig as { classResourceKey?: string }).classResourceKey)
  }
  const castCost = characteristic.castCost
  if (castCost && typeof castCost === "object") {
    addKey(into, (castCost as { resourceKey?: string }).resourceKey)
  }
  const options = characteristic.options
  if (Array.isArray(options)) {
    for (const option of options) {
      if (option && typeof option === "object") {
        addKey(into, (option as { resourceKey?: string }).resourceKey)
      }
    }
  }
  const menuOptions = characteristic.menuOptions
  if (Array.isArray(menuOptions)) {
    for (const option of menuOptions) {
      if (option && typeof option === "object") {
        addKey(into, (option as { resourceKey?: string }).resourceKey)
      }
    }
  }
}

/** Resource keys this feature already spends or restores in structured wiring. */
export function collectWiredResourceKeys(feature: Feature): Set<string> {
  const keys = new Set<string>()
  addKey(keys, feature.activation?.spendClassResourceKey)
  addKey(keys, feature.limitedUses?.classResourceKey)
  addKey(keys, feature.resourceId)
  walkActivationKeys(feature.activation, keys)
  walkEffectKeys(feature.activation?.effects, keys)

  for (const instance of feature.linkedModifiers ?? []) {
    walkActivationKeys(instance.activation, keys)
    walkEffectKeys(instance.effects, keys)
    for (const characteristic of instance.characteristics ?? []) {
      walkCharacteristicKeys(characteristic as unknown as Record<string, unknown>, keys)
      const rec = characteristic as unknown as {
        type?: string
        damageFromResourceSpend?: boolean
        healFromResourceSpend?: boolean
      }
      if (
        rec.type === "special_attack" &&
        (rec.damageFromResourceSpend || rec.healFromResourceSpend)
      ) {
        addKey(keys, feature.limitedUses?.classResourceKey)
        addKey(keys, feature.activation?.spendClassResourceKey)
      }
    }
  }
  return keys
}

function featureWiresResource(feature: Feature, resourceKey: string): boolean {
  for (const key of collectWiredResourceKeys(feature)) {
    if (resourceKeysMatch(key, resourceKey)) return true
  }
  return false
}

function collectSpendResourceKeys(feature: Feature): string[] {
  const keys = new Set<string>()
  addKey(keys, feature.activation?.spendClassResourceKey)
  if (feature.limitedUses?.type === "class_resource") {
    addKey(keys, feature.limitedUses.classResourceKey)
  }
  const considerEffect = (effect: FeatureEffect) => {
    const key = effect.classResourceKey?.trim()
    if (!key) return
    if (effect.kind === "heal_from_pool") {
      keys.add(key)
      return
    }
    if (effect.kind === "class_resource" && effect.classResourceChange === "reduce") {
      keys.add(key)
    }
  }
  for (const effect of feature.activation?.effects ?? []) considerEffect(effect)
  for (const instance of feature.linkedModifiers ?? []) {
    addKey(keys, instance.activation?.spendClassResourceKey)
    for (const effect of instance.activation?.effects ?? []) considerEffect(effect)
    for (const effect of instance.effects ?? []) considerEffect(effect)
    for (const characteristic of instance.characteristics ?? []) {
      const rec = characteristic as unknown as Record<string, unknown>
      if (rec.type === "resource_ability_menu") addKey(keys, rec.resourceKey ?? rec.classResourceKey)
      if (rec.type === "uses") {
        const uses = rec.uses as { classResourceKey?: string } | undefined
        addKey(keys, uses?.classResourceKey ?? rec.classResourceKey)
      }
      if (
        rec.type === "special_attack" &&
        (rec.damageFromResourceSpend || rec.healFromResourceSpend)
      ) {
        addKey(keys, feature.limitedUses?.classResourceKey)
        addKey(keys, feature.activation?.spendClassResourceKey)
      }
      const castCost = rec.castCost as { resourceKey?: string; amount?: number } | undefined
      if (castCost?.resourceKey && (castCost.amount ?? 0) > 0) addKey(keys, castCost.resourceKey)
    }
  }
  return [...keys]
}

function extractPhrase(text: string, matchIndex: number, matchLength: number): string {
  const before = text.lastIndexOf(".", matchIndex)
  const start = before < 0 ? 0 : before + 1
  const after = text.indexOf(".", matchIndex + matchLength)
  const end = after < 0 ? text.length : after
  return text.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 180)
}

function findResourceMention(
  description: string,
  resource: ResourceGraphResource,
): { phrase: string } | null {
  const text = stripHtml(description)
  if (!text) return null
  for (const alias of aliasesForResource(resource)) {
    const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i")
    const match = pattern.exec(text)
    if (!match || match.index == null) continue
    const window = text.slice(Math.max(0, match.index - 70), match.index + match[0].length + 90)
    if (!SPEND_OR_RESTORE_CUE.test(window) && !/use your\s+/i.test(window)) continue
    const phrase = extractPhrase(text, match.index, match[0].length)
    return { phrase }
  }
  return null
}

function definedKeysForClass(resources: ResourceGraphResource[]): string[] {
  return resources.map((resource) => resource.resource_key.trim()).filter(Boolean)
}

function keyIsDefined(resourceKey: string, defined: string[]): boolean {
  if (isReservedResourceKey(resourceKey)) return true
  return defined.some((candidate) => resourceKeysMatch(candidate, resourceKey))
}

export function auditResourceGraph(classes: readonly ResourceGraphClassInput[]): ResourceGraphAuditResult {
  const misses: ResourceGraphMiss[] = []
  const orphanSpends: ResourceGraphOrphanSpend[] = []
  const seenMiss = new Set<string>()
  const seenOrphan = new Set<string>()

  for (const cls of classes) {
    const className = cls.name.trim()
    if (!className) continue
    const resources = cls.resources ?? []
    const defined = definedKeysForClass(resources)
    const spendable = resources.filter(isSpendableClassResource)
    const featureGroups: { label: string; features: Feature[] }[] = [
      { label: className, features: cls.features ?? [] },
      ...(cls.subclassFeatures ?? []).map((entry) => ({
        label: `${className} · ${entry.subclassName}`,
        features: entry.features,
      })),
    ]

    for (const group of featureGroups) {
      for (const feature of group.features) {
        const featureName = feature.name?.trim() || "(unnamed)"
        const level = Number(feature.level) || 0
        const description = feature.description ?? ""

        for (const resource of spendable) {
          const mention = findResourceMention(description, resource)
          if (!mention) continue
          if (featureWiresResource(feature, resource.resource_key)) continue
          const row: ResourceGraphMiss = {
            class: className,
            feature: group.label === className ? featureName : `${featureName} (${group.label.split(" · ")[1]})`,
            level,
            resource: resource.name || resource.resource_key,
            phrase: mention.phrase,
          }
          const id = `${row.class}|${row.feature}|${row.level}|${row.resource}|${row.phrase}`
          if (seenMiss.has(id)) continue
          seenMiss.add(id)
          misses.push(row)
        }

        for (const resourceKey of collectSpendResourceKeys(feature)) {
          if (keyIsDefined(resourceKey, defined)) continue
          const row: ResourceGraphOrphanSpend = {
            class: className,
            feature: group.label === className ? featureName : `${featureName} (${group.label.split(" · ")[1]})`,
            level,
            resourceKey,
          }
          const id = `${row.class}|${row.feature}|${row.level}|${row.resourceKey}`
          if (seenOrphan.has(id)) continue
          seenOrphan.add(id)
          orphanSpends.push(row)
        }
      }
    }
  }

  misses.sort((a, b) =>
    a.class.localeCompare(b.class) ||
    a.level - b.level ||
    a.feature.localeCompare(b.feature) ||
    a.resource.localeCompare(b.resource) ||
    a.phrase.localeCompare(b.phrase),
  )
  orphanSpends.sort((a, b) =>
    a.class.localeCompare(b.class) ||
    a.level - b.level ||
    a.feature.localeCompare(b.feature) ||
    a.resourceKey.localeCompare(b.resourceKey),
  )
  return { misses, orphanSpends }
}

function resourcesFromSrd(className: string): ResourceGraphResource[] {
  return (SRD_CLASS_RESOURCES_BY_NAME[className] ?? []).map((resource) => ({
    resource_key: resource.id,
    name: resource.name,
    uses: resource.uses,
    display: resource.display,
  }))
}

function resourcesFromImport(
  content: ImportContent,
  className: string,
): ResourceGraphResource[] {
  return (content.class_resources ?? [])
    .filter((row) => String(row.class_name ?? "").trim() === className)
    .map((row) => ({
      resource_key: row.resource_key,
      name: row.name,
      uses: row.uses as UsesConfig | undefined,
    }))
}

function featuresFromUnknown(value: unknown): Feature[] {
  return Array.isArray(value) ? (value as Feature[]) : []
}

function classesFromImportContent(content: ImportContent): ResourceGraphClassInput[] {
  return (content.classes ?? []).map((cls) => {
    const name = String(cls.name ?? "").trim()
    const subclassFeatures = (content.subclasses ?? [])
      .filter((sub) => String(sub.class_name ?? "").trim() === name)
      .map((sub) => ({
        subclassName: String(sub.name ?? "").trim() || "Subclass",
        features: featuresFromUnknown(sub.features),
      }))
    return {
      name,
      features: featuresFromUnknown(cls.features),
      resources: resourcesFromImport(content, name),
      subclassFeatures,
    }
  })
}

/** SRD seed + example seed packs — the catalog the audit snapshots. */
export function collectShippedResourceGraphCatalog(): ResourceGraphClassInput[] {
  const enrichedSrd = enrichSrdClassList(srdClasses as Record<string, unknown>[])
  const srdRows: ResourceGraphClassInput[] = enrichedSrd.map((row) => {
    const name = String(row.name ?? "")
    const subclassFeatures = (srdSubclasses as Record<string, unknown>[])
      .filter((sub) => String(sub.class_name ?? "") === name)
      .map((sub) => {
        const enriched = enrichSrdSubclassRow(sub, name)
        return {
          subclassName: String(sub.name ?? "").trim() || "Subclass",
          features: featuresFromUnknown(enriched.features),
        }
      })
    return {
      name,
      features: featuresFromUnknown(row.features),
      resources: resourcesFromSrd(name),
      subclassFeatures,
    }
  })

  const packRows = [
    ...loadKibblesTastyPack().files.flatMap(classesFromImportContent),
    ...loadMageHandPressPack().files.flatMap(classesFromImportContent),
  ]

  return [...srdRows, ...packRows]
}

export function auditShippedResourceGraph(
  classNames?: readonly string[] | null,
): ResourceGraphAuditResult {
  return auditResourceGraph(
    filterResourceGraphCatalog(collectShippedResourceGraphCatalog(), classNames),
  )
}
