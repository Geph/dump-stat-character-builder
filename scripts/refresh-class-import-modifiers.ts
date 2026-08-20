/**
 * Re-run the current deterministic enrichment pipeline over every class/subclass
 * source import JSON, persisting linkedModifiers + modifierRefs for future imports.
 *
 * Usage:
 *   node scripts/run-vite-node.mjs scripts/refresh-class-import-modifiers.ts
 *   node scripts/run-vite-node.mjs scripts/refresh-class-import-modifiers.ts --check
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { join, resolve } from "node:path"
import { featureHasSubclassUnlockModifier } from "@/lib/compendium/subclass-unlock-modifier"
import { applySubclassUnlockDefaults } from "@/lib/import/apply-subclass-unlock-defaults"
import { applyClassSpellListsToImport } from "@/lib/import/class-spell-lists"
import type { ImportContent } from "@/lib/import/content-schema"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import { syncModifierRefs } from "@/lib/compendium/linked-modifiers"
import type { Feature } from "@/lib/types"

const IMPORT_ROOT = resolve(
  process.env.DUMP_STAT_IMPORT_JSON_ROOT ??
    "D:/Google Drive/Code Projects/dump stat working files/import-json",
)

function visitFiles(root: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(root)) {
    const path = join(root, entry)
    if (statSync(path).isDirectory()) files.push(...visitFiles(path))
    else files.push(path)
  }
  return files
}

function sourceForPath(path: string, content: ImportContent): string {
  const normalized = path.replaceAll("\\", "/").toLowerCase()
  if (normalized.includes("/kibbles tasty/")) return "Kibbles Tasty"
  if (normalized.includes("/mage hand press/")) return "Mage Hand Press"
  if (normalized.includes("/laserllama/")) return "LaserLlama"
  if (normalized.includes("mcdm")) return "MCDM"
  if (normalized.includes("/eberron/")) return "Eberron"
  const explicit = content.classes
    ?.map((cls) => cls.source?.trim())
    .find((source): source is string => Boolean(source))
  return explicit ?? "Custom"
}

function enrichClassImport(content: ImportContent, source: string): ImportContent {
  const withPresets = applyImportEnrichmentPresets(content)
  const withSpellLists = applyClassSpellListsToImport(withPresets)
  const withModifiers = enrichImportContentModifiers(withSpellLists)
  return canonicalizeModifierInstanceIds(
    normalizeFeatureLinks(applySubclassUnlockDefaults(withModifiers, source)),
  ) as ImportContent
}

function semanticModifierKey(value: unknown): string {
  return JSON.stringify(value, (key, item) =>
    key === "id" || key === "instanceId" ? undefined : item,
  )
}

function normalizeFeature(feature: Feature): Feature {
  const linked = feature.linkedModifiers ?? []
  if (!linked.length) return feature
  const seen = new Set<string>()
  const deduped = linked.filter((instance) => {
    const key = semanticModifierKey(instance)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return syncModifierRefs({ ...feature, linkedModifiers: deduped })
}

function removeDuplicateSyntheticSubclassFeatures(features: Feature[]): Feature[] {
  const synthetic = (feature: Feature) =>
    feature.name.trim().toLowerCase() === "subclass" &&
    /^choose a subclass for this class\.$/i.test(feature.description.trim())
  const keep = features.find(
    (feature) => synthetic(feature) && featureHasSubclassUnlockModifier(feature),
  )
  let keptFallback = false
  return features.filter((feature) => {
    if (!synthetic(feature)) return true
    if (keep) return feature === keep
    if (keptFallback) return false
    keptFallback = true
    return true
  })
}

function normalizeFeatureLinks(content: ImportContent): ImportContent {
  return {
    ...content,
    classes: content.classes?.map((cls) => ({
      ...cls,
      features: removeDuplicateSyntheticSubclassFeatures(cls.features as Feature[]).map(
        normalizeFeature,
      ) as typeof cls.features,
    })),
    subclasses: content.subclasses?.map((subclass) => ({
      ...subclass,
      features: (subclass.features as Feature[]).map(normalizeFeature) as typeof subclass.features,
    })),
  }
}

function shortHash(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 16)
}

function canonicalizeModifierInstanceIds(value: unknown): unknown {
  const instanceIds = new Map<string, string>()

  function collect(item: unknown, path: string): void {
    if (Array.isArray(item)) {
      item.forEach((row, index) => collect(row, `${path}[${index}]`))
      return
    }
    if (!item || typeof item !== "object") return
    const row = item as Record<string, unknown>
    for (const key of ["linkedModifiers", "magic_effects"]) {
      const linked = row[key]
      if (!Array.isArray(linked)) continue
      linked.forEach((instance, index) => {
        if (!instance || typeof instance !== "object") return
        const oldId = (instance as { instanceId?: unknown }).instanceId
        if (typeof oldId === "string" && !instanceIds.has(oldId)) {
          instanceIds.set(
            oldId,
            `modinst_import_${shortHash(`${path}:${semanticModifierKey(instance)}:${index}`)}`,
          )
        }
      })
    }
    for (const [key, child] of Object.entries(row)) collect(child, `${path}.${key}`)
  }

  function transform(item: unknown, path: string): unknown {
    if (Array.isArray(item)) {
      return item.map((row, index) => transform(row, `${path}[${index}]`))
    }
    if (!item || typeof item !== "object") return item
    const row = item as Record<string, unknown>
    const next: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(row)) {
      if (key === "isChoice" && child === false) {
        continue
      } else if (key === "instanceId" && typeof child === "string") {
        next[key] =
          instanceIds.get(child) ??
          `modinst_import_${shortHash(`${path}:${semanticModifierKey(row)}`)}`
      } else if (key === "id" && path.includes(".characteristics[")) {
        next[key] = `mod_import_${shortHash(`${path}:${semanticModifierKey(row)}`)}`
      } else {
        next[key] = transform(child, `${path}.${key}`)
      }
    }
    return next
  }

  collect(value, "$")
  return transform(value, "$")
}

function featureRows(content: ImportContent): Feature[] {
  return [
    ...(content.classes ?? []).flatMap((cls) => cls.features as Feature[]),
    ...(content.subclasses ?? []).flatMap((subclass) => subclass.features as Feature[]),
  ]
}

function validateModifierRefs(content: ImportContent, filePath: string): string[] {
  const errors: string[] = []
  for (const feature of featureRows(content)) {
    const linked = feature.linkedModifiers ?? []
    const refs = feature.modifierRefs ?? []
    const expected = linked.map((instance) => instance.catalogRefId)
    if (JSON.stringify(refs) !== JSON.stringify(expected)) {
      errors.push(
        `${filePath}: ${feature.name} modifierRefs ${JSON.stringify(refs)} ` +
          `do not match linkedModifiers ${JSON.stringify(expected)}`,
      )
    }
    if (
      linked.some((instance) =>
        (instance.characteristics ?? []).some(
          (characteristic) => (characteristic as { type?: string }).type === "feature_option_picker",
        ),
      )
    ) {
      errors.push(`${filePath}: ${feature.name} still contains legacy feature_option_picker`)
    }
  }

  for (const cls of content.classes ?? []) {
    if (!(cls.features as Feature[]).some(featureHasSubclassUnlockModifier)) {
      errors.push(`${filePath}: ${cls.name} is missing subclass_unlock metadata`)
    }
  }
  return errors
}

function firstDifference(a: unknown, b: unknown, path = "$"): string | null {
  if (JSON.stringify(a) === JSON.stringify(b)) return null
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let index = 0; index < Math.max(a.length, b.length); index++) {
      const difference = firstDifference(a[index], b[index], `${path}[${index}]`)
      if (difference) return difference
    }
  } else if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = new Set([
      ...Object.keys(a as Record<string, unknown>),
      ...Object.keys(b as Record<string, unknown>),
    ])
    for (const key of keys) {
      const difference = firstDifference(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
        `${path}.${key}`,
      )
      if (difference) return difference
    }
  }
  return `${path}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`
}

function main() {
  const checkOnly = process.argv.includes("--check")
  const explain = process.argv.includes("--explain")
  let filesChecked = 0
  let filesChanged = 0
  let classes = 0
  let subclasses = 0
  let modifierInstances = 0
  const errors: string[] = []

  for (const filePath of visitFiles(IMPORT_ROOT)) {
    let raw: string
    try {
      raw = readFileSync(filePath, "utf8")
    } catch {
      continue
    }
    const parsed = parseImportContentJson(raw)
    if (!parsed || (!(parsed.classes?.length) && !(parsed.subclasses?.length))) continue

    filesChecked++
    classes += parsed.classes?.length ?? 0
    subclasses += parsed.subclasses?.length ?? 0
    const enriched = enrichClassImport(parsed, sourceForPath(filePath, parsed))
    modifierInstances += featureRows(enriched).reduce(
      (sum, feature) => sum + (feature.linkedModifiers?.length ?? 0),
      0,
    )
    errors.push(...validateModifierRefs(enriched, filePath))

    const next = `${JSON.stringify(enriched, null, 2)}\n`
    if (next === raw.replace(/\r\n/g, "\n")) continue
    filesChanged++
    if (checkOnly && explain) {
      console.log(
        `${filePath}: ${firstDifference(JSON.parse(raw) as unknown, enriched) ?? "formatting only"}`,
      )
    }
    if (!checkOnly) writeFileSync(filePath, next, "utf8")
  }

  console.log(
    `${checkOnly ? "Would update" : "Updated"} ${filesChanged}/${filesChecked} files; ` +
      `${classes} classes, ${subclasses} subclasses, ${modifierInstances} linked modifier instances.`,
  )
  if (errors.length) {
    for (const error of errors) console.error(`- ${error}`)
    process.exitCode = 1
  } else if (checkOnly && filesChanged > 0) {
    process.exitCode = 1
  }
}

main()
