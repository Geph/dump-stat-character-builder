/**
 * One-off audit: run the PHB "extra" subclass Drive JSON files (Abjurer, Path of the Zealot, …)
 * through the real import-enrichment pipeline (`enrichImportContentModifiers`) and report,
 * per feature: whether it produced linkedModifiers, whether AI `mechanics[]` entries all
 * converted, whether choice options wired, and whether a class_resources-style tracked pool
 * (uses) is implied by the prose but missing.
 *
 * Usage: node scripts/run-vite-node.mjs scripts/audit-phb-subclasses.ts
 */
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { auditImportWiring, summarizeFindings } from "@/lib/import/homebrew-import-ops/wiring-rules"
import { collectMissingCreatureGrants } from "@/lib/import/collect-missing-creature-grants"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature } from "@/lib/types"

const DRIVE_DIR =
  "d:/Google Drive/Code Projects/dump stat working files/import-json/phb"

const FILES = readdirSync(DRIVE_DIR).filter((f) => /^phb-.*-subclasses$/.test(f))

type RawSubclass = {
  name: string
  class_name: string
  description?: string
  features: (Feature & { mechanics?: unknown[] })[]
  card_image_url?: string
}

const RESOURCE_PHRASES = [
  /until you finish a (short or long|long|short) rest/i,
  /expend(s|ing)? (a|one) (use|charge)/i,
  /regains? (a|one|all) (use|hit points?)/i,
  /as a bonus action/i,
  /hit point maximum equal to/i,
  /once per turn/i,
  /can'?t use this (feature|ability) again until/i,
]

const NARRATIVE_OK_NAME = /savant$|proficiency|expertise|ritual|cantrip known/i

/**
 * Known narrative-only features with no mechanical modifier hook, confirmed during manual review.
 * Matched by exact name (case-insensitive) so they don't need to fit the NARRATIVE_OK_NAME regex.
 */
const NARRATIVE_OK_EXACT_NAMES = new Set(
  [
    "Hunter's Lore", // Ranger (Hunter): grants narrative monster-lore knowledge, no stat hook.
    "Psychic Spells", // Warlock (Great Old One): damage-type override + no-components rider.
  ].map((n) => n.toLowerCase()),
)

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function summarize(s: string, max = 100): string {
  const plain = stripHtml(s)
  return plain.length > max ? `${plain.slice(0, max)}…` : plain
}

type FeatureFinding = {
  subclass: string
  className: string
  level: number
  name: string
  hasMechanics: boolean
  mechanicsProvided: number
  mechanicsConverted: number
  hasLinkedModifiers: boolean
  isChoice: boolean
  optionsWired: number
  optionsTotal: number
  impliesResource: boolean
  note: string
}

const findings: FeatureFinding[] = []

for (const file of FILES) {
  const path = join(DRIVE_DIR, file)
  const raw = JSON.parse(readFileSync(path, "utf8")) as { subclasses: RawSubclass[] } & Record<string, unknown>
  // Pass the FULL raw payload through (import_proposals, creatures, new_toggles, …) — not just
  // `subclasses` — so companion grants / class_knacks catalogs resolve exactly as they would on
  // a real import.
  const content = raw as unknown as ImportContent

  const wiring = auditImportWiring(raw)
  const wiringSummary = summarizeFindings(wiring)
  if (!wiringSummary.ok || wiringSummary.warns) {
    console.log(`\n[wiring-rules] ${file}: ${wiringSummary.errors} error(s), ${wiringSummary.warns} warn(s)`)
    for (const f of wiring) console.log(`  [${f.severity}] ${f.id}: ${f.message}`)
  }

  const missingCreatures = collectMissingCreatureGrants(content)
  if (missingCreatures.length) {
    console.log(`\n[missing-creatures] ${file}:`)
    for (const mc of missingCreatures) console.log(`  ${mc.name} <- ${mc.sources.join(", ")}`)
  }

  const enriched = enrichImportContentModifiers(content)

  for (let i = 0; i < (enriched.subclasses ?? []).length; i++) {
    const enrichedSc = enriched.subclasses![i]!
    const rawSc = raw.subclasses[i]!
    const features = (enrichedSc.features ?? []) as Feature[]
    const rawFeatures = rawSc.features

    for (let j = 0; j < features.length; j++) {
      const f = features[j]!
      const rf = rawFeatures[j]
      const mechanicsProvided = Array.isArray(rf?.mechanics) ? rf!.mechanics!.length : 0
      const hasLinkedModifiers = Boolean(f.linkedModifiers?.length)
      // Rough re-derive of how many mechanics entries actually produced a detection:
      // importModifierMeta length approximates ruleId-tagged detections (ai + detector combined),
      // so use linkedModifiers count only as a coarse proxy when mechanics were provided.
      const mechanicsConverted = mechanicsProvided > 0 ? (hasLinkedModifiers ? mechanicsProvided : 0) : 0

      const isChoice = Boolean(f.isChoice)
      const options = f.choices?.options ?? []
      const optionsWired = options.filter((o) => Boolean(o.linkedModifiers?.length)).length

      const desc = f.description ?? ""
      const impliesResource = RESOURCE_PHRASES.some((re) => re.test(desc))

      const normalizedName = (f.name ?? "").trim().replace(/[\u2018\u2019\u201B]/g, "'").toLowerCase()
      const looksNarrativeOk =
        NARRATIVE_OK_NAME.test(f.name ?? "") || NARRATIVE_OK_EXACT_NAMES.has(normalizedName)

      let note = ""
      if (!hasLinkedModifiers && !isChoice && !looksNarrativeOk) {
        note = impliesResource
          ? "UNWIRED + implies a tracked resource/uses — needs review"
          : "unwired (no linkedModifiers) — verify narrative-only"
      } else if (mechanicsProvided > 0 && !hasLinkedModifiers) {
        note = "mechanics[] provided but produced NO linkedModifiers (conversion failed)"
      } else if (isChoice && options.length > 0 && optionsWired === 0) {
        note = "choice feature: no option wired any linkedModifiers"
      } else if (isChoice && options.length > 0 && optionsWired < options.length) {
        note = `choice feature: only ${optionsWired}/${options.length} options wired`
      }

      findings.push({
        subclass: rawSc.name,
        className: rawSc.class_name,
        level: f.level ?? 0,
        name: f.name ?? "",
        hasMechanics: mechanicsProvided > 0,
        mechanicsProvided,
        mechanicsConverted,
        hasLinkedModifiers,
        isChoice,
        optionsWired,
        optionsTotal: options.length,
        impliesResource,
        note,
      })
    }
  }
}

console.log(`Audited ${FILES.length} files, ${findings.length} total subclass features.\n`)

const flagged = findings.filter((f) => f.note)
console.log(`Flagged: ${flagged.length}\n`)

const byClass = new Map<string, FeatureFinding[]>()
for (const f of flagged) {
  const key = `${f.className} — ${f.subclass}`
  byClass.set(key, [...(byClass.get(key) ?? []), f])
}

for (const [key, items] of [...byClass.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`## ${key}`)
  for (const item of items.sort((a, b) => a.level - b.level)) {
    console.log(`  L${item.level} ${item.name} — ${item.note}`)
    console.log(`    mechanics: ${item.mechanicsProvided}, linkedModifiers: ${item.hasLinkedModifiers}, choice: ${item.isChoice} (${item.optionsWired}/${item.optionsTotal})`)
  }
}

console.log(`\n\nFull per-feature dump (for spreadsheet-style review):`)
for (const f of findings) {
  console.log(
    [
      f.className,
      f.subclass,
      f.level,
      f.name,
      f.hasMechanics ? "mech" : "-",
      f.hasLinkedModifiers ? "wired" : "UNWIRED",
      f.isChoice ? `choice(${f.optionsWired}/${f.optionsTotal})` : "-",
      f.impliesResource ? "RESOURCE?" : "-",
      f.note,
    ].join(" | "),
  )
}
