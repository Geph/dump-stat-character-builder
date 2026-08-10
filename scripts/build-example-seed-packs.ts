/**
 * Build bundled example seed packs under lib/seed-packs/ from Drive import-json.
 *
 * Usage: node scripts/run-vite-node.mjs scripts/build-example-seed-packs.ts
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import {
  applyProposalSelections,
  collectImportProposals,
  defaultProposalSelections,
} from "@/lib/import/import-proposals"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import type { ImportContent } from "@/lib/import/content-schema"
import {
  buildMhpFreeSubclassKeySet,
  isMhpBundledAbilityAllowed,
  isMhpFreeSubclassName,
  MHP_FREE_SUBCLASSES_BY_CLASS,
  normalizeSubclassMatchKey,
} from "@/lib/seed-packs/mage-hand-press-free-subclasses"
import {
  MHP_CLASS_PRESENTATION,
  MHP_CLASSES_STRIP_DESCRIPTION_ONLY,
  MHP_WARDEN_CARD_IMAGE_SLUG,
  MHP_WARDEN_CREATOR_URL,
  mhpClassCardImageUrl,
} from "@/lib/seed-packs/mage-hand-press/class-presentation"

const DRIVE_IMPORT_JSON =
  "d:/Google Drive/Code Projects/dump stat working files/import-json"
const OUT_ROOT = join(process.cwd(), "lib/seed-packs")

type PackFileSpec = {
  /** Filename under the Drive folder (no extension required — Drive files often have none). */
  sourceName: string
  /** Output basename under lib/seed-packs/<pack>/ (always .json). */
  outName: string
  /** When true, filter subclasses/resources to the free MHP allowlist. */
  filterMhpSubclasses?: boolean
}

const KIBBLES_FILES: PackFileSpec[] = [
  { sourceName: "kibbles-crafting-feats", outName: "kibbles-crafting-feats.json" },
  { sourceName: "kibbles-inventor-class", outName: "kibbles-inventor-class.json" },
  { sourceName: "kibbles-occultist-class", outName: "kibbles-occultist-class.json" },
  { sourceName: "kibbles-psion-class", outName: "kibbles-psion-class.json" },
  { sourceName: "kibbles-psionics-custom", outName: "kibbles-psionics-custom.json" },
  { sourceName: "kibbles-spells.json", outName: "kibbles-spells.json" },
  { sourceName: "kibbles-warden-class", outName: "kibbles-warden-class.json" },
]

const MHP_FILES: PackFileSpec[] = [
  { sourceName: "magehandpress-alchemist-class", outName: "magehandpress-alchemist-class.json", filterMhpSubclasses: true },
  { sourceName: "magehandpress-captain-class", outName: "magehandpress-captain-class.json", filterMhpSubclasses: true },
  { sourceName: "magehandpress-craftsman-class", outName: "magehandpress-craftsman-class.json", filterMhpSubclasses: true },
  { sourceName: "magehandpress-gunslinger-class", outName: "magehandpress-gunslinger-class.json", filterMhpSubclasses: true },
  { sourceName: "magehandpress-investigator-class", outName: "magehandpress-investigator-class.json", filterMhpSubclasses: true },
  { sourceName: "magehandpress-martyr-class", outName: "magehandpress-martyr-class.json", filterMhpSubclasses: true },
  { sourceName: "magehandpress-necromancer-class", outName: "magehandpress-necromancer-class.json", filterMhpSubclasses: true },
  { sourceName: "magehandpress-vagabond-class", outName: "magehandpress-vagabond-class.json", filterMhpSubclasses: true },
  { sourceName: "magehandpress-warden-class", outName: "magehandpress-warden-class.json", filterMhpSubclasses: true },
  { sourceName: "magehandpress-warmage-class", outName: "magehandpress-warmage-class.json", filterMhpSubclasses: true },
  { sourceName: "magehandpress-witch-class", outName: "magehandpress-witch-class.json", filterMhpSubclasses: true },
  { sourceName: "magehandpress-masteries-custom", outName: "magehandpress-masteries-custom.json" },
  { sourceName: "magehandpress-spells", outName: "magehandpress-spells.json" },
]

const MHP_ALLOW = buildMhpFreeSubclassKeySet()

function stampSourceDeep(content: ImportContent, source: string): ImportContent {
  const stamp = <T extends Record<string, unknown>>(row: T): T => ({ ...row, source })
  const stampList = <T extends Record<string, unknown>>(rows: T[] | undefined): T[] | undefined =>
    rows?.map(stamp)

  const next: ImportContent = {
    ...content,
    classes: stampList(content.classes as Record<string, unknown>[] | undefined) as typeof content.classes,
    subclasses: stampList(content.subclasses as Record<string, unknown>[] | undefined) as typeof content.subclasses,
    spells: stampList(content.spells as Record<string, unknown>[] | undefined) as typeof content.spells,
    feats: stampList(content.feats as Record<string, unknown>[] | undefined) as typeof content.feats,
    species: stampList(content.species as Record<string, unknown>[] | undefined) as typeof content.species,
    backgrounds: stampList(
      content.backgrounds as Record<string, unknown>[] | undefined,
    ) as typeof content.backgrounds,
    equipment: stampList(
      content.equipment as Record<string, unknown>[] | undefined,
    ) as typeof content.equipment,
    creatures: stampList(
      content.creatures as Record<string, unknown>[] | undefined,
    ) as typeof content.creatures,
    class_resources: stampList(
      content.class_resources as Record<string, unknown>[] | undefined,
    ) as typeof content.class_resources,
  }

  if (Array.isArray((content as { abilities?: unknown[] }).abilities)) {
    ;(next as { abilities?: Record<string, unknown>[] }).abilities = (
      content as { abilities: Record<string, unknown>[] }
    ).abilities.map(stamp)
  }

  return next
}

function filterMhpContent(content: ImportContent, warnings: string[]): ImportContent {
  const className = content.classes?.[0]?.name?.trim() ?? null
  const expected = className ? MHP_FREE_SUBCLASSES_BY_CLASS[className] : null
  if (className && !expected) {
    warnings.push(`No free-subclass allowlist for class "${className}" — keeping zero subclasses`)
  }

  const before = content.subclasses?.length ?? 0
  const keptSubs = (content.subclasses ?? []).filter((sc) => isMhpFreeSubclassName(sc.name, MHP_ALLOW))
  const keptNames = keptSubs.map((sc) => sc.name)
  if (expected) {
    for (const want of expected) {
      const wantKey = normalizeSubclassMatchKey(want)
      if (!keptSubs.some((sc) => normalizeSubclassMatchKey(sc.name ?? "") === wantKey)) {
        warnings.push(`${className}: free subclass "${want}" not found in source JSON`)
      }
    }
  }

  const filterResource = (row: { subclass_name?: string | null }) => {
    const sub = row.subclass_name?.trim()
    if (!sub) return true
    return isMhpFreeSubclassName(sub, MHP_ALLOW)
  }

  const classResources = (content.class_resources ?? []).filter(filterResource)
  const proposals = content.import_proposals
    ? {
        ...content.import_proposals,
        class_resources: (content.import_proposals.class_resources ?? []).filter(filterResource),
        custom_abilities: (content.import_proposals.custom_abilities ?? []).filter((row) =>
          isMhpBundledAbilityAllowed(row, MHP_ALLOW),
        ),
      }
    : undefined

  const abilitiesBefore =
    (content as { abilities?: unknown[] }).abilities?.length ??
    content.import_proposals?.custom_abilities?.length ??
    0
  const abilitiesRaw = (content as { abilities?: MhpAbilityRow[] }).abilities
  const keptAbilities = Array.isArray(abilitiesRaw)
    ? abilitiesRaw.filter((row) => isMhpBundledAbilityAllowed(row, MHP_ALLOW))
    : undefined

  warnings.push(
    `${className ?? "pack"}: subclasses ${before} → ${keptSubs.length} (${keptNames.join(", ") || "none"})`,
  )
  if (keptAbilities) {
    warnings.push(
      `${className ?? "pack"}: abilities ${abilitiesBefore} → ${keptAbilities.length} (paid-subclass rows removed)`,
    )
  }

  const next: ImportContent = {
    ...content,
    subclasses: keptSubs,
    class_resources: classResources.length ? classResources : undefined,
    import_proposals: proposals,
  }
  if (keptAbilities) {
    ;(next as { abilities?: MhpAbilityRow[] }).abilities = keptAbilities
  }
  return next
}

type MhpAbilityRow = {
  source_type?: string | null
  source_name?: string | null
  prerequisite?: string | null
  [key: string]: unknown
}

function applyMhpClassPresentation(content: ImportContent): ImportContent {
  if (!content.classes?.length) return content
  return {
    ...content,
    classes: content.classes.map((cls) => {
      const name = cls.name?.trim() ?? ""
      const baseName = name.replace(/\s*\(.*\)\s*$/, "").trim() || name
      const presentation = MHP_CLASS_PRESENTATION[baseName]
      if (presentation) {
        return {
          ...cls,
          icon: presentation.icon,
          card_blurb: presentation.card_blurb,
          creator_url: presentation.creator_url,
          description: presentation.description,
          card_image_url: mhpClassCardImageUrl(presentation.card_image_slug),
        }
      }
      if ((MHP_CLASSES_STRIP_DESCRIPTION_ONLY as readonly string[]).includes(baseName)) {
        return {
          ...cls,
          description: null,
          creator_url: MHP_WARDEN_CREATOR_URL,
          card_image_url: mhpClassCardImageUrl(MHP_WARDEN_CARD_IMAGE_SLUG),
        }
      }
      return cls
    }),
  }
}

/**
 * Rename colliding class display names for bundled packs.
 * Does not re-prefix resource_key values — feature modifiers already bind to the short keys.
 */
function renameClassDisplayName(content: ImportContent, from: string, to: string): ImportContent {
  if (from === to) return content
  const next: ImportContent = { ...content }
  if (content.classes?.length) {
    next.classes = content.classes.map((row) =>
      row.name === from ? { ...row, name: to } : row,
    )
  }
  if (content.subclasses?.length) {
    next.subclasses = content.subclasses.map((row) =>
      row.class_name === from ? { ...row, class_name: to } : row,
    )
  }
  if (content.class_resources?.length) {
    next.class_resources = content.class_resources.map((row) =>
      row.class_name === from ? { ...row, class_name: to } : row,
    )
  }
  if (content.spells?.length) {
    next.spells = content.spells.map((row) => ({
      ...row,
      classes: row.classes?.map((c) => (c === from ? to : c)) ?? row.classes,
    }))
  }
  const abilities = (content as { abilities?: { source_name?: string | null; name: string }[] }).abilities
  if (abilities?.length) {
    ;(next as { abilities?: typeof abilities }).abilities = abilities.map((row) => ({
      ...row,
      source_name: row.source_name === from ? to : row.source_name,
    }))
  }
  if (content.import_proposals?.class_resources?.length) {
    next.import_proposals = {
      ...content.import_proposals,
      ...next.import_proposals,
      class_resources: content.import_proposals.class_resources.map((row) =>
        row.class_name === from ? { ...row, class_name: to } : row,
      ),
    }
  }
  if (content.import_proposals?.custom_abilities?.length) {
    next.import_proposals = {
      ...next.import_proposals,
      custom_abilities: content.import_proposals.custom_abilities.map((row) => ({
        ...row,
        source_name: row.source_name === from ? to : row.source_name,
      })),
    }
  }
  return next
}

/** Cross-pack class name collisions — label with (source) in the bundled packs. */
const COLLIDING_CLASS_BASE_NAMES = new Set(["warden"])

function applyPackClassCollisionLabels(content: ImportContent, source: string): ImportContent {
  if (!content.classes?.length) return content
  let next = content
  for (const cls of content.classes) {
    const name = cls.name?.trim() ?? ""
    if (!name) continue
    const base = name.replace(/\s*\(.*\)\s*$/, "").trim() || name
    if (!COLLIDING_CLASS_BASE_NAMES.has(base.toLowerCase())) continue
    if (/\(.*\)\s*$/.test(name)) continue
    next = renameClassDisplayName(next, name, `${base} (${source})`)
  }
  return next
}

function prepareFile(
  raw: string,
  source: string,
  options: { filterMhpSubclasses?: boolean; applyMhpPresentation?: boolean },
  warnings: string[],
): ImportContent {
  const parsed = parseImportContentJson(raw)
  if (!parsed) throw new Error("Failed to parse ImportContent JSON")

  let content = parsed
  if (options.filterMhpSubclasses) {
    content = filterMhpContent(content, warnings)
  }

  content = applyImportEnrichmentPresets(content)
  content = enrichImportContentModifiers(content)
  const proposals = collectImportProposals(content)
  content = applyProposalSelections(content, proposals, defaultProposalSelections(proposals))
  content = enrichImportContentModifiers(content)
  if (options.applyMhpPresentation) {
    content = applyMhpClassPresentation(content)
  }
  content = stampSourceDeep(content, source)
  content = applyPackClassCollisionLabels(content, source)
  return content
}

function resolveSourcePath(dir: string, sourceName: string): string {
  const direct = join(dir, sourceName)
  try {
    readFileSync(direct)
    return direct
  } catch {
    // try with/without .json
    const alt = sourceName.endsWith(".json") ? sourceName.slice(0, -5) : `${sourceName}.json`
    return join(dir, alt)
  }
}

function writePack(params: {
  packId: string
  label: string
  source: string
  driveFolder: string
  files: PackFileSpec[]
}) {
  const outDir = join(OUT_ROOT, params.packId)
  mkdirSync(outDir, { recursive: true })

  // Clear prior generated JSON (keep .ts helpers outside this folder).
  for (const existing of readdirSync(outDir)) {
    if (existing.endsWith(".json")) {
      // overwritten below; no delete API needed if we rewrite same names
    }
  }

  const warnings: string[] = []
  const written: { file: string; counts: Record<string, number> }[] = []

  for (const spec of params.files) {
    const srcPath = resolveSourcePath(join(DRIVE_IMPORT_JSON, params.driveFolder), spec.sourceName)
    const raw = readFileSync(srcPath, "utf8")
    const content = prepareFile(
      raw,
      params.source,
      {
        filterMhpSubclasses: spec.filterMhpSubclasses,
        applyMhpPresentation: params.packId === "mage-hand-press" && Boolean(spec.filterMhpSubclasses),
      },
      warnings,
    )
    const outPath = join(outDir, spec.outName)
    writeFileSync(outPath, `${JSON.stringify(content)}\n`, "utf8")

    const counts: Record<string, number> = {}
    for (const key of [
      "classes",
      "subclasses",
      "spells",
      "feats",
      "creatures",
      "equipment",
      "class_resources",
      "abilities",
    ] as const) {
      const n = (content as Record<string, unknown[]>)[key]?.length ?? 0
      if (n) counts[key] = n
    }
    written.push({ file: spec.outName, counts })
    console.log(`  wrote ${params.packId}/${spec.outName}`, counts)
  }

  const missingSubclassNotes = warnings.filter((w) => w.includes("not found in source JSON"))
  const manifest = {
    id: params.packId,
    label: params.label,
    source: params.source,
    version: new Date().toISOString().slice(0, 10),
    files: written.map((w) => w.file),
    notes: [
      ...(params.packId === "mage-hand-press"
        ? [
            "Subclasses filtered to the free allowlist only.",
            "Dancer class file was not present in Drive import-json at build time.",
          ]
        : ["All Kibbles Tasty Drive import-json files included."]),
      ...missingSubclassNotes,
    ],
  }
  writeFileSync(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8")

  if (warnings.length) {
    console.log(`\n[${params.packId}] notes:`)
    for (const w of warnings) console.log(`  - ${w}`)
  }
}

console.log("Building Kibbles Tasty pack…")
writePack({
  packId: "kibbles-tasty",
  label: "Kibbles Tasty",
  source: "Kibbles Tasty",
  driveFolder: "kibbles tasty",
  files: KIBBLES_FILES,
})

console.log("\nBuilding Mage Hand Press pack…")
writePack({
  packId: "mage-hand-press",
  label: "Mage Hand Press",
  source: "Mage Hand Press",
  driveFolder: "mage hand press",
  files: MHP_FILES,
})

console.log("\nDone.")
