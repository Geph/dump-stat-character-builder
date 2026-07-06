import {
  parsePsionicAugmentsFromDescription,
  type PsionicAugmentsConfig,
} from "@/lib/compendium/parse-psionic-augments"
import type { FeatureChoice } from "@/lib/types"
import type { ImportContent } from "@/lib/import/content-schema"

type RawAbilityRow = Record<string, unknown>

function coercePsionicAugments(
  raw: unknown,
  description: string | null | undefined,
  name: string,
): PsionicAugmentsConfig | null {
  if (raw && typeof raw === "object" && Array.isArray((raw as PsionicAugmentsConfig).augments)) {
    return raw as PsionicAugmentsConfig
  }
  if (description) {
    return parsePsionicAugmentsFromDescription(description, { powerName: name })
  }
  return null
}

function coerceStringArray(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  const parts = raw.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
  return parts.length ? parts : null
}

function coerceChoices(raw: unknown): FeatureChoice | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as unknown as Record<string, unknown>
  const category = typeof row.category === "string" ? row.category : null
  const count = typeof row.count === "number" ? row.count : null
  const options = Array.isArray(row.options)
    ? row.options
        .filter(
          (entry): entry is { name: string; description: string } =>
            !!entry &&
            typeof entry === "object" &&
            typeof (entry as { name?: unknown }).name === "string" &&
            typeof (entry as { description?: unknown }).description === "string",
        )
        .map((entry) => ({ name: entry.name, description: entry.description }))
    : []
  if (!category || count == null || !options.length) return null
  return {
    category,
    count,
    options,
    ...(typeof row.resourceKey === "string" ? { resourceKey: row.resourceKey } : {}),
    ...(typeof row.optionsSource === "string"
      ? { optionsSource: row.optionsSource as FeatureChoice["optionsSource"] }
      : {}),
  }
}

/** Coerce imported ability rows into a persist-ready shape with psionic fields parsed. */
export function normalizeAbilityImportRow(raw: RawAbilityRow): Record<string, unknown> {
  const name = String(raw.name ?? "").trim()
  const description = typeof raw.description === "string" ? raw.description : null
  const psionic_augments = coercePsionicAugments(raw.psionic_augments, description, name)
  const choices = coerceChoices(raw.choices)
  const components =
    coerceStringArray(raw.components) ??
    (typeof raw.components === "string" ? [raw.components] : null)

  return {
    ...raw,
    name,
    description,
    ...(psionic_augments ? { psionic_augments } : {}),
    ...(typeof raw.casting_time === "string" ? { casting_time: raw.casting_time } : {}),
    ...(typeof raw.range === "string" ? { range: raw.range } : {}),
    ...(components ? { components } : {}),
    ...(typeof raw.duration === "string" ? { duration: raw.duration } : {}),
    ...(raw.concentration === true ? { concentration: true } : {}),
    ...(raw.isChoice === true ? { isChoice: true } : {}),
    ...(choices ? { choices } : {}),
    ...(typeof raw.ability_role === "string" ? { ability_role: raw.ability_role } : {}),
  }
}

export function normalizeAbilityImportRows(
  rows: RawAbilityRow[] | undefined,
): Record<string, unknown>[] {
  if (!rows?.length) return []
  return rows.map(normalizeAbilityImportRow)
}

export function enrichAbilityPsionicAugments<
  T extends { name: string; description?: string | null; psionic_augments?: PsionicAugmentsConfig | null },
>(ability: T): T {
  if (ability.psionic_augments?.augments?.length) return ability
  const parsed = parsePsionicAugmentsFromDescription(ability.description, { powerName: ability.name })
  if (!parsed) return ability
  return { ...ability, psionic_augments: parsed }
}

export type NormalizedAbilityImport = NonNullable<ImportContent["abilities"]>[number]
