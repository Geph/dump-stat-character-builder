import type { ImportContent } from "@/lib/import/content-schema"
import { enrichSpellRowWithBundledCardImage } from "@/lib/compendium/enrich-srd-spells"
import {
  parsePsionicAugmentsFromDescription,
  type PsionicAugmentsConfig,
} from "@/lib/compendium/parse-psionic-augments"

type RawSpellRow = Record<string, unknown>

function normalizeComponents(raw: unknown): string[] | null {
  if (Array.isArray(raw)) {
    const parts = raw
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean)
    return parts.length ? parts : null
  }
  if (raw && typeof raw === "object") {
    const record = raw as unknown as Record<string, unknown>
    const parts: string[] = []
    if (record.v === true) parts.push("V")
    if (record.s === true) parts.push("S")
    if (record.m === true) parts.push("M")
    if (typeof record.m === "string" && record.m.trim()) parts.push(`M (${record.m.trim()})`)
    return parts.length ? parts : null
  }
  return null
}

function splitSpellDescriptionAndMaterial(description: string | null | undefined): {
  description: string | null
  material: string | null
} {
  if (!description?.trim()) return { description: null, material: null }
  const materialMatch = description.match(/\*\s*-\s*\(([^)]+)\)\s*$/)
  if (!materialMatch) return { description, material: null }
  const material = materialMatch[1].trim()
  const cleaned = description.slice(0, materialMatch.index).trim()
  return {
    description: cleaned || description,
    material: material || null,
  }
}

/** Coerce homebrew / Valda's / Kibbles spell rows into ImportContent spell shape. */
export function normalizeSpellImportRow(raw: RawSpellRow): NonNullable<ImportContent["spells"]>[number] {
  const levelRaw = raw.level
  const level =
    typeof levelRaw === "number" && Number.isFinite(levelRaw)
      ? levelRaw
      : typeof levelRaw === "string"
        ? parseInt(levelRaw, 10) || 0
        : 0

  const classes = Array.isArray(raw.classes)
    ? raw.classes.filter((entry): entry is string => typeof entry === "string")
    : null
  const descriptionRaw = typeof raw.description === "string" ? raw.description : null
  const split = splitSpellDescriptionAndMaterial(descriptionRaw)
  const material =
    typeof raw.material === "string" && raw.material.trim()
      ? raw.material.trim()
      : split.material

  return {
    name: String(raw.name ?? "").trim(),
    level,
    school: typeof raw.school === "string" && raw.school.trim() ? raw.school.trim() : "Unknown",
    casting_time: typeof raw.casting_time === "string" ? raw.casting_time : null,
    range: typeof raw.range === "string" ? raw.range : null,
    components: normalizeComponents(raw.components),
    duration: typeof raw.duration === "string" ? raw.duration : null,
    concentration: raw.concentration === true,
    description: split.description,
    classes: classes?.length ? classes : [],
    psionic_augments: coercePsionicAugments(raw.psionic_augments, descriptionRaw),
    ...(material ? { material } : {}),
  } as NonNullable<ImportContent["spells"]>[number]
}

function coercePsionicAugments(
  raw: unknown,
  description: unknown,
): PsionicAugmentsConfig | null {
  if (raw && typeof raw === "object" && Array.isArray((raw as PsionicAugmentsConfig).augments)) {
    return raw as PsionicAugmentsConfig
  }
  if (typeof description === "string") {
    return parsePsionicAugmentsFromDescription(description)
  }
  return null
}

export function enrichSpellPsionicAugments<T extends { name: string; description?: string | null; psionic_augments?: PsionicAugmentsConfig | null }>(
  spell: T,
): T {
  if (spell.psionic_augments?.augments?.length) return spell
  const parsed = parsePsionicAugmentsFromDescription(spell.description, { powerName: spell.name })
  if (!parsed) return spell
  return { ...spell, psionic_augments: parsed }
}

export function normalizeSpellImportRows(
  rows: RawSpellRow[] | undefined,
): NonNullable<ImportContent["spells"]> {
  if (!rows?.length) return []
  return rows
    .map(normalizeSpellImportRow)
    .map((spell) => enrichSpellPsionicAugments(spell as Parameters<typeof enrichSpellPsionicAugments>[0]))
    .map((row) =>
      enrichSpellRowWithBundledCardImage(row as unknown as Record<string, unknown>),
    )
    .filter((row) => (row as { name: string }).name.length > 0) as unknown as NonNullable<
    ImportContent["spells"]
  >
}
