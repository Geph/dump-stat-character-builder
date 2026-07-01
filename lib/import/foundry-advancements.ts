import type { ImportContent } from "@/lib/import/content-schema"
import type { FoundryImportMeta } from "@/lib/import/foundry-types"
import { attachFoundryEffectsToRow } from "@/lib/import/map-foundry-active-effects"
import { cleanFoundryHtml } from "@/lib/import/foundry-html"
import { syncModifierRefs } from "@/lib/compendium/linked-modifiers"
import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import { characteristicCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { createModifierInstanceId } from "@/lib/compendium/linked-modifiers"
import type { BonusByLevelEntry } from "@/lib/compendium/bonus-by-level"
import type { ImportModifierMeta } from "@/lib/import/detect-feature-modifiers"

type FoundryItem = Record<string, unknown>
type ClassFeature = NonNullable<ImportContent["classes"]>[number]["features"][number]
type SubclassFeature = NonNullable<ImportContent["subclasses"]>[number]["features"][number]
type SpeciesTrait = NonNullable<ImportContent["species"]>[number]["traits"][number]

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
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

function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export type FoundryUuidIndex = Map<string, FoundryItem>

export function buildFoundryUuidIndex(items: FoundryItem[]): FoundryUuidIndex {
  const index: FoundryUuidIndex = new Map()
  for (const item of items) {
    const id = asString(item._id)
    if (id) index.set(id, item)
    const name = asString(item.name).trim().toLowerCase()
    if (name) index.set(name, item)
  }
  return index
}

export function resolveFoundryUuid(uuid: string, index: FoundryUuidIndex): FoundryItem | null {
  const trimmed = uuid.trim()
  if (!trimmed) return null
  const direct = index.get(trimmed)
  if (direct) return direct

  const suffix = trimmed.split(".").pop()
  if (suffix && index.has(suffix)) return index.get(suffix) ?? null

  const nameKey = trimmed.split(".").pop()?.replace(/[0-9]+$/g, "").toLowerCase()
  if (nameKey && index.has(nameKey)) return index.get(nameKey) ?? null

  return null
}

function mapFeatureItemToClassFeature(
  item: FoundryItem,
  level: number,
  meta: FoundryImportMeta,
): ClassFeature {
  const name = asString(item.name).trim()
  const system = asRecord(item.system)
  const description = cleanFoundryHtml(asRecord(system.description).value)
  const withEffects = attachFoundryEffectsToRow(
    {
      level,
      name,
      description,
      linkedModifiers: undefined as import("@/lib/compendium/linked-modifiers").LinkedModifierInstance[] | undefined,
    },
    asArray(item.effects),
    meta,
  )
  return syncModifierRefs(withEffects) as unknown as ClassFeature
}

function mapFeatureItemToSubclassFeature(
  item: FoundryItem,
  level: number,
  meta: FoundryImportMeta,
): SubclassFeature {
  return mapFeatureItemToClassFeature(item, level, meta)
}

function mapFeatureItemToSpeciesTrait(item: FoundryItem, meta: FoundryImportMeta): SpeciesTrait {
  const name = asString(item.name).trim()
  const system = asRecord(item.system)
  const description = cleanFoundryHtml(asRecord(system.description).value)
  const withEffects = attachFoundryEffectsToRow(
    {
      name,
      description,
      linkedModifiers: undefined as import("@/lib/compendium/linked-modifiers").LinkedModifierInstance[] | undefined,
    },
    asArray(item.effects),
    meta,
  )
  return syncModifierRefs(withEffects) as unknown as SpeciesTrait
}

function scaleValueToDieByLevel(scale: Record<string, unknown>): BonusByLevelEntry[] {
  const rows: BonusByLevelEntry[] = []
  for (const [levelKey, raw] of Object.entries(scale)) {
    const level = asNumber(levelKey)
    if (level == null) continue
    const entry = asRecord(raw)
    const count = asNumber(entry.n) ?? asNumber(entry.number) ?? 1
    const die = asNumber(entry.die) ?? asNumber(entry.faces) ?? 6
    const dieType = (`d${die}` as BonusByLevelEntry["dieType"])
    rows.push({ level, mode: "dice", dieCount: count, dieType })
  }
  rows.sort((a, b) => a.level - b.level)
  return rows
}

function formatScaleValueDescription(title: string, rows: BonusByLevelEntry[]): string {
  if (!rows.length) return title
  const lines = rows.map((row) => {
    if (row.mode === "dice" && row.dieCount && row.dieType) {
      return `Level ${row.level}: ${row.dieCount}${row.dieType}`
    }
    return `Level ${row.level}: +${row.fixed ?? 0}`
  })
  return `${title}\n\n${lines.join("\n")}`
}

function mapScaleValueAdvancement(
  adv: Record<string, unknown>,
  item: FoundryItem,
  meta: FoundryImportMeta,
): ClassFeature | null {
  const config = asRecord(adv.configuration)
  const title = asString(adv.title) || asString(item.name) || asString(config.identifier)
  if (!title) return null

  const scale = asRecord(config.scale)
  const dieByLevel = scaleValueToDieByLevel(scale)
  const level = asNumber(adv.level) ?? 1
  const peak = dieByLevel[dieByLevel.length - 1]
  const peakDice =
    peak?.mode === "dice" && peak.dieCount && peak.dieType
      ? `${peak.dieCount}${peak.dieType}`
      : "1d6"

  const instanceId = createModifierInstanceId()
  const importModifierMeta: ImportModifierMeta[] = [
    {
      instanceId,
      ruleId: "foundry.advancement.scale_value",
      confidence: "high",
      matchedPhrase: `ScaleValue: ${title}`,
      source: "foundry_effect",
    },
  ]

  meta.mapped.advancements += 1
  if (dieByLevel.length > 1) {
    meta.review.push({
      label: "ScaleValue table",
      detail: `${title} has ${dieByLevel.length} tiers — verify level scaling on the sheet`,
      documentName: title,
    })
  }

  const feature: ClassFeature = syncModifierRefs({
    level,
    name: title,
    description: formatScaleValueDescription(
      cleanFoundryHtml(asRecord(asRecord(item.system).description).value) || title,
      dieByLevel,
    ),
    linkedModifiers: [
      charInstance(instanceId, characteristicCatalogRefId("damage_roll_modifiers"), [
        {
          id: modId(instanceId),
          type: "damage_roll_modifiers",
          entries: [
            {
              target: "all",
              bonus: 0,
              bonusDiceWhenModifierIncluded: peakDice,
            },
          ],
          label: title,
        },
      ]),
    ],
    importModifierMeta,
  }) as ClassFeature

  return feature
}

export type AdvancementParseResult = {
  classFeatures: ClassFeature[]
  subclassFeatures: SubclassFeature[]
  speciesTraits: SpeciesTrait[]
  subclassIdentifier: string | null
}

export function parseFoundryAdvancements(
  item: FoundryItem,
  uuidIndex: FoundryUuidIndex,
  meta: FoundryImportMeta,
): AdvancementParseResult {
  const system = asRecord(item.system)
  const advancements = asArray(system.advancement)
  const classFeatures: ClassFeature[] = []
  const subclassFeatures: SubclassFeature[] = []
  const speciesTraits: SpeciesTrait[] = []
  let subclassIdentifier: string | null = null

  for (const raw of advancements) {
    const adv = asRecord(raw)
    const type = asString(adv.type)
    const level = asNumber(adv.level) ?? 1

    if (type === "ItemGrant") {
      const config = asRecord(adv.configuration)
      for (const granted of asArray(config.items)) {
        const grant = asRecord(granted)
        const uuid = asString(grant.uuid)
        const resolved = resolveFoundryUuid(uuid, uuidIndex)
        if (!resolved) {
          meta.review.push({
            label: "Unresolved ItemGrant",
            detail: uuid || "missing uuid",
            documentName: asString(item.name),
          })
          continue
        }
        const resolvedType = asString(resolved.type)
        if (resolvedType === "feature" || resolvedType === "feat") {
          const featureType = asString(asRecord(asRecord(resolved.system).type).value).toLowerCase()
          if (featureType === "subclass") {
            subclassFeatures.push(mapFeatureItemToSubclassFeature(resolved, level, meta))
          } else {
            classFeatures.push(mapFeatureItemToClassFeature(resolved, level, meta))
          }
          meta.mapped.advancements += 1
        }
      }
      continue
    }

    if (type === "ItemChoice") {
      meta.review.push({
        label: "ItemChoice advancement",
        detail: `Level ${level} choices need manual review in compendium`,
        documentName: asString(item.name),
      })
      continue
    }

    if (type === "ScaleValue") {
      const feature = mapScaleValueAdvancement(adv, item, meta)
      if (feature) classFeatures.push(feature)
      continue
    }

    if (type === "Subclass") {
      const config = asRecord(adv.configuration)
      subclassIdentifier = asString(config.identifier) || asString(config.subclass)
      continue
    }

    if (type === "AbilityScoreImprovement") {
      meta.review.push({
        label: "ASI advancement skipped",
        detail: `Level ${level} ability score improvement is a player choice`,
        documentName: asString(item.name),
      })
      continue
    }

    if (type === "HitPoints") {
      continue
    }
  }

  return { classFeatures, subclassFeatures, speciesTraits, subclassIdentifier }
}

export function featureDestination(item: FoundryItem): "feat" | "class_feature" | "subclass_feature" | "species_trait" {
  const systemType = asString(asRecord(asRecord(item.system).type).value).toLowerCase()
  if (systemType === "class") return "class_feature"
  if (systemType === "subclass") return "subclass_feature"
  if (systemType === "race") return "species_trait"
  return "feat"
}

export function mapStandaloneFeatureItem(
  item: FoundryItem,
  meta: FoundryImportMeta,
): {
  feat?: NonNullable<ImportContent["feats"]>[number] & {
    linkedModifiers?: import("@/lib/compendium/linked-modifiers").LinkedModifierInstance[]
    modifierRefs?: string[]
  }
  classFeature?: ClassFeature
  subclassFeature?: SubclassFeature
  speciesTrait?: SpeciesTrait
} {
  const destination = featureDestination(item)
  const system = asRecord(item.system)
  const name = asString(item.name).trim()
  const description = cleanFoundryHtml(asRecord(system.description).value)

  if (destination === "class_feature") {
    const level = asNumber(system.level) ?? 1
    return { classFeature: mapFeatureItemToClassFeature(item, level, meta) }
  }
  if (destination === "subclass_feature") {
    const level = asNumber(system.level) ?? 1
    return { subclassFeature: mapFeatureItemToSubclassFeature(item, level, meta) }
  }
  if (destination === "species_trait") {
    return { speciesTrait: mapFeatureItemToSpeciesTrait(item, meta) }
  }

  let feat: {
    name: string
    description: string | null
    prerequisite: null
    category: "General"
    linkedModifiers?: import("@/lib/compendium/linked-modifiers").LinkedModifierInstance[]
    modifierRefs?: string[]
  } = {
    name,
    description: description || null,
    prerequisite: null,
    category: "General",
  }
  feat = attachFoundryEffectsToRow(feat, asArray(item.effects), meta)
  return { feat: syncModifierRefs(feat) }
}

export function extractFoundrySourceLabel(item: FoundryItem, fallback: string): string {
  const flags = asRecord(item.flags)
  const dnd5e = asRecord(flags.dnd5e)
  const sourceBooks = asArray(dnd5e.sourceBooks)
    .map((entry) => asString(entry))
    .filter(Boolean)
  if (sourceBooks.length) return sourceBooks.join(", ")

  const system = asRecord(item.system)
  const source = asRecord(system.source)
  const book = asString(source.book).trim()
  const label = asString(source.label).trim()
  if (book && label) return `${book}: ${label}`
  if (book) return book
  if (label) return label
  return fallback
}

export function mergeSourceLabels(current: string, next: string): string {
  if (!current || current === "Foundry VTT Import") return next
  if (!next || next === "Foundry VTT Import") return current
  if (current.includes(next)) return current
  return `${current}; ${next}`
}
