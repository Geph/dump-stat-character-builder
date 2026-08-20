/**
 * Populate concise class/subclass card_blurb fields in import JSON sources.
 *
 * Usage:
 *   node scripts/run-vite-node.mjs scripts/populate-class-card-blurbs.ts
 *   node scripts/run-vite-node.mjs scripts/populate-class-card-blurbs.ts --check
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { MHP_CLASS_PRESENTATION } from "@/lib/seed-packs/mage-hand-press/class-presentation"
import { KIBBLES_CLASS_CARD_BLURBS } from "@/lib/seed-packs/kibbles-tasty/class-card-blurbs"
import { SRD_CLASS_CARD_BLURBS } from "@/lib/srd/class-card-blurbs"

const IMPORT_ROOT = resolve(
  process.env.DUMP_STAT_IMPORT_JSON_ROOT ??
    "D:/Google Drive/Code Projects/dump stat working files/import-json",
)
const MAX_LENGTH = 120

const CUSTOM_CLASS_BLURBS: Record<string, string> = {
  Artificer:
    "An inventive spellcaster who creates magical tools, infused items, and specialized arcane technology.",
  Beastheart:
    "A primal warrior who fights beside a bonded monstrous companion and unleashes ferocity-powered exploits.",
  "Alternate Barbarian":
    "A primal warrior who combines supernatural rage with a growing arsenal of martial exploits.",
  "Alternate Fighter":
    "A tactical warrior who fuels martial exploits with combat dice and adapts to any battlefield role.",
  "Alternate Monk":
    "A disciplined martial artist who channels ki through customizable techniques and supernatural movement.",
  "Alternate Ranger":
    "A relentless hunter who marks a quarry, masters wilderness knacks, and blends martial skill with primal magic.",
  "Alternate Rogue":
    "A cunning specialist who combines precision strikes, underworld exploits, and unmatched skill mastery.",
  "Alternate Sorcerer":
    "An innate spellcaster who shapes magic directly through sorcery points, metamagic, and a supernatural origin.",
}

type JsonRecord = Record<string, unknown>

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is JsonRecord => Boolean(entry) && typeof entry === "object")
    : []
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCodePoint(Number(digits)))
    .replace(/&#x([0-9a-f]+);/gi, (_, digits: string) =>
      String.fromCodePoint(Number.parseInt(digits, 16)),
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&mdash;|&ndash;/gi, "—")
}

function plainDescription(value: unknown): string {
  if (typeof value !== "string") return ""
  return decodeEntities(
    value
      .replace(/^\s*<p[^>]*>\s*<strong>[^<]+<\/strong>\s*<\/p>/i, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(?:p|li|h[1-6]|tr)>/gi, ". ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\*\*|__|_/g, ""),
  )
    .replace(/\s+/g, " ")
    .replace(/\.{2,}/g, ".")
    .trim()
}

function fitCardBlurb(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim()
  if (normalized.length <= MAX_LENGTH) return normalized
  const punctuation = [...normalized.matchAll(/[,;—]\s+/g)]
    .map((match) => match.index ?? -1)
    .filter((index) => index >= 50 && index < MAX_LENGTH - 1)
    .at(-1)
  if (punctuation != null) {
    return `${normalized.slice(0, punctuation).replace(/[,:;—-]+$/, "")}.`
  }
  const slice = normalized.slice(0, MAX_LENGTH - 1)
  const wordBoundary = slice.lastIndexOf(" ")
  return `${slice
    .slice(0, wordBoundary >= 70 ? wordBoundary : slice.length)
    .replace(/[,:;—-]+$/, "")
    .replace(/[.!?]?$/, ".")}`
}

const BOILERPLATE =
  /^(?:becoming\b|as a level\b|as a multiclass\b|at \d|starting at\b|when you\b|you gain\b|gain all\b|prerequisite\b|source\b)/i

function sentenceScore(sentence: string, index: number): number {
  let score = Math.min(sentence.length, 120) - index * 18
  if (sentence.length < 35) score -= 80
  if (sentence.length <= MAX_LENGTH) score += 80
  else score -= Math.min(sentence.length - MAX_LENGTH, 120)
  if (BOILERPLATE.test(sentence)) score -= 120
  if (/\b(?:focuses?|embodies|masters?|wields?|channels?|specializes?|combines?|fights?|protects?|hunts?|commands?)\b/i.test(sentence)) {
    score += 35
  }
  if (/\b(?:hit points?|saving throw|proficiency|action|bonus action|reaction|level)\b/i.test(sentence)) {
    score -= 20
  }
  return score
}

function generatedBlurb(row: JsonRecord, kind: "class" | "subclass"): string {
  const description = plainDescription(row.description)
  let sentences = description
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  if (!sentences.length) {
    sentences = records(row.features)
      .map((feature) => plainDescription(feature.description))
      .flatMap((text) => text.split(/(?<=[.!?])\s+/))
      .map((sentence) => sentence.trim())
      .filter(Boolean)
  }

  const best = sentences
    .slice(0, 12)
    .map((sentence, index) => ({ sentence, score: sentenceScore(sentence, index) }))
    .sort((a, b) => b.score - a.score)[0]?.sentence

  if (best) return fitCardBlurb(best)

  const name = String(row.name ?? (kind === "class" ? "This class" : "This subclass")).trim()
  if (kind === "subclass") {
    const parent = String(row.class_name ?? "its parent class").trim()
    return fitCardBlurb(`${name} is a ${parent} subclass with a distinctive suite of specialized features.`)
  }
  return fitCardBlurb(`${name} offers a distinctive mix of combat, exploration, and roleplaying features.`)
}

function curatedClassBlurb(row: JsonRecord, filePath: string): string | null {
  const name = String(row.name ?? "").trim()
  if (!name) return null
  if (filePath.toLowerCase().includes("mage hand press")) {
    return MHP_CLASS_PRESENTATION[name]?.card_blurb ?? null
  }
  if (filePath.toLowerCase().includes("kibbles tasty") && name === "Warden") {
    return KIBBLES_CLASS_CARD_BLURBS.Warden
  }
  return (
    SRD_CLASS_CARD_BLURBS[name] ??
    KIBBLES_CLASS_CARD_BLURBS[name] ??
    CUSTOM_CLASS_BLURBS[name] ??
    null
  )
}

function populateContent(
  content: JsonRecord,
  filePath: string,
): { classes: number; subclasses: number; changed: boolean } {
  let classes = 0
  let subclasses = 0
  let changed = false

  for (const row of records(content.classes)) {
    const existing = typeof row.card_blurb === "string" ? row.card_blurb.trim() : ""
    const keepExisting = existing && !existing.endsWith("…")
    const next = fitCardBlurb(
      keepExisting ? existing : curatedClassBlurb(row, filePath) || generatedBlurb(row, "class"),
    )
    if (row.card_blurb !== next) {
      row.card_blurb = next
      changed = true
    }
    classes++
  }

  for (const row of records(content.subclasses)) {
    const existing = typeof row.card_blurb === "string" ? row.card_blurb.trim() : ""
    const next = fitCardBlurb(existing && !existing.endsWith("…") ? existing : generatedBlurb(row, "subclass"))
    if (row.card_blurb !== next) {
      row.card_blurb = next
      changed = true
    }
    subclasses++
  }

  return { classes, subclasses, changed }
}

function visitFiles(root: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(root)) {
    const path = join(root, entry)
    if (statSync(path).isDirectory()) files.push(...visitFiles(path))
    else files.push(path)
  }
  return files
}

function main() {
  const checkOnly = process.argv.includes("--check")
  let filesChanged = 0
  let classCount = 0
  let subclassCount = 0

  const candidates = [
    ...visitFiles(IMPORT_ROOT),
    resolve("lib/srd/seed-data/classes.json"),
    resolve("lib/srd/seed-data/subclasses.json"),
  ]

  for (const filePath of candidates) {
    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(filePath, "utf8"))
    } catch {
      continue
    }

    const isSrdSeedFile =
      dirname(filePath).replaceAll("\\", "/").endsWith("/lib/srd/seed-data") &&
      (basename(filePath) === "classes.json" || basename(filePath) === "subclasses.json")
    const contents = isSrdSeedFile
      ? [
          basename(filePath) === "classes.json"
            ? ({ classes: parsed } as JsonRecord)
            : ({ subclasses: parsed } as JsonRecord),
        ]
      : Array.isArray(parsed)
      ? parsed.filter((entry): entry is JsonRecord => Boolean(entry) && typeof entry === "object")
      : parsed && typeof parsed === "object"
        ? [parsed as JsonRecord]
        : []

    let changed = false
    for (const content of contents) {
      const result = populateContent(content, filePath)
      classCount += result.classes
      subclassCount += result.subclasses
      changed ||= result.changed
    }
    if (!changed) continue
    filesChanged++
    if (!checkOnly) writeFileSync(filePath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8")
  }

  console.log(
    `${checkOnly ? "Would update" : "Updated"} ${filesChanged} files; checked ${classCount} classes and ${subclassCount} subclasses.`,
  )
  if (checkOnly && filesChanged > 0) process.exitCode = 1
}

main()
