import {
  parseProgressionTableFeatures,
  type ProgressionTableFeature,
} from "@/lib/import/parse-class-progression-table"
import { stripHtml } from "@/lib/import/normalize-equipment"

export type SegmentedClassFeature = {
  level: number
  name: string
  description: string
}

export type ImportClassFeatureRow = {
  level: number
  name: string
  description: string
}

type FeatureHeading = {
  name: string
  start: number
  end: number
}

const PAGE_BREAK_RE = /^--\s*\d+\s+of\s+\d+\s*--\s*$/im
const SECTION_STOP_RE =
  /^(?:Fighting Styles|Spell List|Archetype|Subclass|Equipment|Quick Build|Multiclassing)\b/i

function normalizeFeatureName(name: string): string {
  return name
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function namesMatch(a: string, b: string): boolean {
  const left = normalizeFeatureName(a)
  const right = normalizeFeatureName(b)
  if (left === right) return true
  if (left.startsWith(right) || right.startsWith(left)) return true
  return false
}

function findFeatureHeadings(text: string): FeatureHeading[] {
  const headings: FeatureHeading[] = []
  const lines = text.split("\n")
  let offset = 0

  for (const line of lines) {
    const trimmed = line.trim()
    const duplicated = trimmed.match(/^(.{2,72})\t\1\s*$/)
    if (duplicated) {
      const name = normalizeFeatureName(duplicated[1])
      if (name.length > 1 && !SECTION_STOP_RE.test(name)) {
        headings.push({ name: duplicated[1].trim(), start: offset, end: offset + line.length })
      }
    } else {
      const markdown = trimmed.match(/^#{1,3}\s+(.{2,72})\s*$/)
      if (markdown) {
        headings.push({ name: markdown[1].trim(), start: offset, end: offset + line.length })
      }
    }
    offset += line.length + 1
  }

  return headings.sort((a, b) => a.start - b.start)
}

function extractDescription(text: string, heading: FeatureHeading, nextStart: number): string {
  const raw = text.slice(heading.end, nextStart)
  return stripHtml(raw)
    .replace(PAGE_BREAK_RE, "\n")
    .replace(/\t+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function assignLevelsFromTable(
  segments: SegmentedClassFeature[],
  tableFeatures: ProgressionTableFeature[],
): SegmentedClassFeature[] {
  return segments.map((segment) => {
    const tableMatch = tableFeatures.find((entry) => namesMatch(entry.name, segment.name))
    return tableMatch ? { ...segment, level: tableMatch.level } : segment
  })
}

function buildFeaturesFromTableOnly(
  tableFeatures: ProgressionTableFeature[],
): SegmentedClassFeature[] {
  return tableFeatures.map((entry) => ({
    level: entry.level,
    name: entry.name,
    description: "",
  }))
}

/** Segment class feature prose using PDF title repetition and markdown headings. */
export function segmentClassFeaturesFromText(
  text: string,
  tableFeatures: ProgressionTableFeature[] = parseProgressionTableFeatures(text),
): SegmentedClassFeature[] {
  const headings = findFeatureHeadings(text)
  if (!headings.length) {
    return buildFeaturesFromTableOnly(tableFeatures)
  }

  const segments: SegmentedClassFeature[] = []
  for (let index = 0; index < headings.length; index++) {
    const heading = headings[index]
    const nextStart = headings[index + 1]?.start ?? text.length
    const description = extractDescription(text, heading, nextStart)
    if (!description || description.length < 20) continue
    if (SECTION_STOP_RE.test(heading.name)) continue

    const tableMatch = tableFeatures.find((entry) => namesMatch(entry.name, heading.name))
    segments.push({
      level: tableMatch?.level ?? 1,
      name: heading.name.trim(),
      description,
    })
  }

  const leveled = assignLevelsFromTable(segments, tableFeatures)
  const covered = new Set(leveled.map((feature) => normalizeFeatureName(feature.name)))

  for (const entry of tableFeatures) {
    if (covered.has(normalizeFeatureName(entry.name))) continue
    leveled.push({ level: entry.level, name: entry.name, description: "" })
  }

  return leveled.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
}

export function countMatchedTableFeatures(
  tableFeatures: ProgressionTableFeature[],
  segmented: SegmentedClassFeature[],
): number {
  if (!tableFeatures.length) return 0
  return tableFeatures.filter((entry) =>
    segmented.some(
      (feature) =>
        namesMatch(feature.name, entry.name) && feature.description.trim().length >= 20,
    ),
  ).length
}

export function toImportClassFeatures(features: SegmentedClassFeature[]): ImportClassFeatureRow[] {
  return features
    .filter((feature) => feature.name.trim().length > 0)
    .map((feature) => ({
      level: feature.level,
      name: feature.name,
      description: feature.description,
    }))
}
