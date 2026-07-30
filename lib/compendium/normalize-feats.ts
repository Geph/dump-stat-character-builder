import { enrichCustomFeatRow } from "@/lib/compendium/enrich-custom-feats"
import { enrichSrdFeatRow } from "@/lib/compendium/enrich-srd-feats"
import { applyFeatRecommendedClasses } from "@/lib/compendium/phb-feat-recommended-classes"
import { readLinkedModifiers } from "@/lib/compendium/linked-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { readModifierRefs } from "@/lib/compendium/normalize-modifier-refs"
import { inferFeatImportFields } from "@/lib/import/infer-feat-import-fields"
import { inferFeatPrerequisiteRules } from "@/lib/import/resolve-feat-prerequisites"
import type { PrerequisiteRule } from "@/lib/import/content-schema"
import { isSrdSource } from "@/lib/srd/source"
import type { Feat, FeatureChoice } from "@/lib/types"

function parseFeatChoices(raw: unknown): FeatureChoice | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const choices = raw as FeatureChoice
  if (!Array.isArray(choices.options)) return undefined
  return choices
}

function parseRecommendedClasses(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  const names = raw.map((v) => String(v ?? "").trim()).filter(Boolean)
  return names.length ? names : null
}

/** Map a stored feat row to runtime Feat shape. */
export function normalizeFeatRow(
  row: Record<string, unknown>,
  catalog: ModifierCatalogEntry[] = [],
): Feat {
  const inferred = inferFeatImportFields({
    name: String(row.name ?? ""),
    description: typeof row.description === "string" ? row.description : null,
    prerequisite: (row.prerequisite as string | null | undefined) ?? null,
    category: (row.category as string | null | undefined) ?? null,
  })
  const prerequisiteRules = inferFeatPrerequisiteRules(
    inferred.prerequisite,
    (row.prerequisite_rules as PrerequisiteRule[] | null | undefined) ?? null,
  )
  const withInferredFields: Record<string, unknown> = {
    ...row,
    category: inferred.category,
    prerequisite: inferred.prerequisite,
    ...(prerequisiteRules.length ? { prerequisite_rules: prerequisiteRules } : {}),
  }
  const base = isSrdSource(withInferredFields.source as string | null | undefined)
    ? enrichSrdFeatRow(withInferredFields)
    : enrichCustomFeatRow(withInferredFields)
  const enriched = applyFeatRecommendedClasses(base)
  return {
    ...(enriched as unknown as Feat),
    recommended_classes: parseRecommendedClasses(
      enriched.recommended_classes ?? enriched.recommendedClasses,
    ),
    isChoice: Boolean(enriched.is_choice ?? enriched.isChoice),
    choices: parseFeatChoices(enriched.choices),
    linkedModifiers: readLinkedModifiers(enriched, catalog),
    modifierRefs: readModifierRefs(enriched),
  }
}

/** Normalize stored feat rows; SRD feats receive linked common modifier presets when missing. */
export function enrichFeatsList<
  T extends {
    name: string
    source?: string | null
    linkedModifiers?: unknown
    linked_modifiers?: unknown
    modifierRefs?: unknown
    modifier_refs?: unknown
  },
>(rows: T[], catalog: ModifierCatalogEntry[] = []): Feat[] {
  return rows.map((row) => normalizeFeatRow(row as unknown as Record<string, unknown>, catalog))
}
