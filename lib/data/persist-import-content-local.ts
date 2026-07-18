import { upsertByName as upsertByNameLocal } from "@/lib/data/indexed-db-store"
import { formatFeatDescription } from "@/lib/compendium/feat-description"
import { enrichImportedSubclassRows } from "@/lib/compendium/enrich-import-subclasses"
import { normalizeBackgroundRows } from "@/lib/compendium/normalize-backgrounds"
import type { FoundryImportMeta } from "@/lib/import/foundry-types"
import { stripFoundryMeta, type ImportContentWithFoundryMeta } from "@/lib/import/foundry-manifest"
import { buildImportReport, type ImportReport } from "@/lib/import/build-import-report"
import { enrichFeatRowWithPrerequisites } from "@/lib/import/resolve-feat-prerequisites"
import {
  resolveFeatureChoiceLinkedSpells,
  resolveFeatureListLinkedSpells,
  resolveFeatureLinkedSpells,
  resolveLinkedModifierSpells,
} from "@/lib/import/resolve-linked-modifier-spells"
import type { Feature } from "@/lib/types"
import type { ImportSourceLabel } from "@/lib/import/import-material-source"
import { sanitizeImportRowSource } from "@/lib/import/sanitize-import-source"
import { sanitizeImportContentForPersist } from "@/lib/import/sanitize-import-content"
import {
  buildClassResourceRowsForClass,
  enrichImportedClassList,
  enrichSubclassFeaturesWithPsiCosts,
  resolvePsiResourceKeyForClass,
  type ClassResourceImportRow,
} from "@/lib/import/enrich-import-classes"
import { normalizeEquipmentRows } from "@/lib/import/normalize-equipment"
import { buildCreaturePersistRows } from "@/lib/import/build-creature-persist-rows"
import type { ImportContent, ImportContentWithAbilities } from "@/lib/import/content-schema"
import {
  deleteWhereLocal,
  insertRowsLocal,
  listRowsLocal,
} from "@/lib/import/detect-import-collisions-local"
import { collectSpellSchoolsFromImportContent } from "@/lib/compendium/schools-of-magic"
import type { PersistImportResult } from "@/lib/import/persist-import-types"
import {
  preferredSourceForPersist,
  type PersistImportOptions,
} from "@/lib/import/persist-import-options"

function withResolvedFeatureSpells(
  rows: Record<string, unknown>[],
  featureKey: "features" | "traits",
  catalog: { id: string; name: string; source: string | null }[],
  preferredSource?: string | null,
): Record<string, unknown>[] {
  return rows.map((row) => {
    const features = row[featureKey]
    if (!Array.isArray(features)) return row
    return {
      ...row,
      [featureKey]: resolveFeatureListLinkedSpells(
        features as Feature[],
        catalog,
        preferredSource,
      ),
    }
  })
}

function stampSource<T extends Record<string, unknown>>(row: T, importerSource: string): T {
  const existing = "source" in row ? row.source : undefined
  return {
    ...row,
    source: sanitizeImportRowSource(existing, importerSource),
  }
}

function normalizeFeatCategory(category: string | null | undefined): string | null {
  const trimmed = category?.trim()
  return trimmed ? trimmed : null
}

async function loadSpellCatalogLocal(): Promise<
  { id: string; name: string; source: string | null }[]
> {
  const rows = await listRowsLocal("spells")
  return rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    source: (row.source as string | null | undefined) ?? null,
  }))
}

function asClassResourceImports(content: ImportContent): ClassResourceImportRow[] | undefined {
  return content.class_resources as ClassResourceImportRow[] | undefined
}

export async function persistImportedContentLocal(
  content: ImportContent | ImportContentWithFoundryMeta,
  source: ImportSourceLabel,
  options: PersistImportOptions = {},
): Promise<PersistImportResult> {
  const foundryMeta = (content as ImportContentWithFoundryMeta).foundryImportMeta
  const sanitized = sanitizeImportContentForPersist(stripFoundryMeta(content as ImportContentWithFoundryMeta))
  const preferredSource = preferredSourceForPersist(source, options)
  let totalImported = 0
  const breakdown: Record<string, number> = {}
  const warnings: string[] = []
  let enrichedSubclasses: Record<string, unknown>[] = []
  let skippedSubclasses: { name: string; class_name: string }[] = []
  let enrichedClasses: Record<string, unknown>[] = []
  let classNameById = new Map<string, string>()
  let spellCatalog = await loadSpellCatalogLocal()
  const explicitResources = asClassResourceImports(sanitized)

  if (sanitized.species?.length) {
    await upsertByNameLocal(
      "species",
      withResolvedFeatureSpells(
        sanitized.species.map((s) => stampSource({ ...s }, source)),
        "traits",
        spellCatalog,
        preferredSource,
      ),
    )
    breakdown.species = sanitized.species.length
    totalImported += sanitized.species.length
  }

  if (sanitized.classes?.length) {
    enrichedClasses = withResolvedFeatureSpells(
      enrichImportedClassList(
        sanitized.classes.map((c) =>
          stampSource(
            {
              ...c,
              prefer_same_source_replacements: Boolean(options.preferSameSourceReplacements),
            },
            source,
          ),
        ),
        explicitResources,
      ),
      "features",
      spellCatalog,
      preferredSource,
    )
    await upsertByNameLocal("classes", enrichedClasses)
    breakdown.classes = enrichedClasses.length
    totalImported += enrichedClasses.length
  }

  if (sanitized.classes?.length || sanitized.class_resources?.length) {
    const classNames = [
      ...new Set([
        ...(sanitized.classes?.map((c) => c.name) ?? []),
        ...(sanitized.class_resources?.map((r) => r.class_name) ?? []),
      ]),
    ]
    const classData = await listRowsLocal("classes", {
      filters: [{ op: "in", column: "name", values: classNames }],
    })
    const classIdByName = new Map(classData.map((c) => [c.name as string, c.id as string]))

    let resourceCount = 0
    for (const className of classNames) {
      const classId = classIdByName.get(className)
      if (!classId) {
        warnings.push(`Skipped class resources — class not found: ${className}`)
        continue
      }

      const importClassRow =
        enrichedClasses.find((row) => row.name === className) ??
        ({ name: className, description: null, features: [] } as unknown as Record<string, unknown>)

      const resourceRows = buildClassResourceRowsForClass(
        importClassRow,
        explicitResources,
        source,
        classId,
      )

      for (const resource of resourceRows) {
        await deleteWhereLocal("class_resources", [
          { op: "eq", column: "class_id", value: classId },
          { op: "eq", column: "resource_key", value: resource.resource_key as string },
        ])
      }
      if (resourceRows.length > 0) {
        await insertRowsLocal("class_resources", resourceRows)
        resourceCount += resourceRows.length
      }
    }

    if (resourceCount > 0) {
      breakdown.class_resources = resourceCount
      totalImported += resourceCount
    }
  }

  if (sanitized.spells?.length) {
    await upsertByNameLocal("spells", sanitized.spells.map((s) => stampSource({ ...s }, source)))
    breakdown.spells = sanitized.spells.length
    totalImported += sanitized.spells.length
    spellCatalog = await loadSpellCatalogLocal()
    // Re-link class/species spell grants now that same-batch spells exist.
    if (enrichedClasses.length) {
      enrichedClasses = withResolvedFeatureSpells(
        enrichedClasses,
        "features",
        spellCatalog,
        preferredSource,
      )
      await upsertByNameLocal("classes", enrichedClasses)
    }
    if (sanitized.species?.length) {
      await upsertByNameLocal(
        "species",
        withResolvedFeatureSpells(
          sanitized.species.map((s) => stampSource({ ...s }, source)),
          "traits",
          spellCatalog,
          preferredSource,
        ),
      )
    }
  }

  if (sanitized.subclasses?.length) {
    const classNames = [...new Set(sanitized.subclasses.map((sc) => sc.class_name))]
    const classData = await listRowsLocal("classes", {
      filters: [{ op: "in", column: "name", values: classNames }],
    })
    classNameById = new Map(classData.map((c) => [c.id as string, c.name as string]))
    const classIdMap = new Map(classData.map((c) => [c.name as string, c.id as string]))

    skippedSubclasses = sanitized.subclasses
      .filter((sc) => !classIdMap.get(sc.class_name))
      .map((sc) => ({ name: sc.name, class_name: sc.class_name }))
    if (skippedSubclasses.length > 0) {
      warnings.push(
        `Skipped ${skippedSubclasses.length} subclass(es) — parent class not found: ${skippedSubclasses.map((s) => `${s.name} (${s.class_name})`).join(", ")}`,
      )
    }

    const subclassesWithIds = sanitized.subclasses
      .map((sc) => ({
        name: sc.name,
        description: sc.description,
        features: sc.features,
        source,
        class_id: classIdMap.get(sc.class_name) || null,
        class_name: sc.class_name,
      }))
      .map((sc) => stampSource(sc, source))
      .filter((sc) => sc.class_id !== null) as Array<
      Record<string, unknown> & { class_id: string; class_name: string }
    >

    if (subclassesWithIds.length > 0) {
      enrichedSubclasses = enrichImportedSubclassRows(
        subclassesWithIds.map(({ class_name: _className, ...row }) => row),
        classNameById,
        spellCatalog,
        preferredSource,
      )

      enrichedSubclasses = enrichedSubclasses.map((row, index) => {
        const sourceRow = subclassesWithIds[index]
        const parentClassName = sourceRow.class_name
        const psiKey = resolvePsiResourceKeyForClass(parentClassName, explicitResources) ?? "psi_points"
        const importText = JSON.stringify(row.features ?? []).toLowerCase()
        const shouldLinkPsi =
          psiKey &&
          (importText.includes("psi point") ||
            explicitResources?.some((resource) => resource.class_name === parentClassName))
        const withPsi = shouldLinkPsi
          ? {
              ...row,
              features: enrichSubclassFeaturesWithPsiCosts(
                (row.features as Feature[]) ?? [],
                psiKey,
              ),
            }
          : row
        return {
          ...withPsi,
          features: resolveFeatureListLinkedSpells(
            (withPsi.features as Feature[]) ?? [],
            spellCatalog,
            preferredSource,
          ),
        }
      })

      for (const sc of enrichedSubclasses) {
        await deleteWhereLocal("subclasses", [
          { op: "eq", column: "name", value: sc.name as string },
          { op: "eq", column: "source", value: source },
        ])
      }
      await insertRowsLocal("subclasses", enrichedSubclasses)
      breakdown.subclasses = enrichedSubclasses.length
      totalImported += enrichedSubclasses.length
    }
  }

  if (sanitized.backgrounds?.length) {
    const backgroundRows = normalizeBackgroundRows(
      sanitized.backgrounds.map((b) => stampSource({ ...b }, source)),
    ).map((row) => {
      if (!row.feature || typeof row.feature !== "object") return row
      return {
        ...row,
        feature: resolveFeatureLinkedSpells(
          row.feature as Feature,
          spellCatalog,
          preferredSource,
        ),
      }
    })
    await upsertByNameLocal("backgrounds", backgroundRows)
    breakdown.backgrounds = sanitized.backgrounds.length
    totalImported += sanitized.backgrounds.length
  }

  if (sanitized.feats?.length) {
    const featSpellCatalog = await loadSpellCatalogLocal()
    const featRows = sanitized.feats.map((f) => {
      const row = f as unknown as Record<string, unknown>
      const linkedModifiers = resolveLinkedModifierSpells(
        (row.linkedModifiers ?? row.linked_modifiers) as import("@/lib/compendium/linked-modifiers").LinkedModifierInstance[] | undefined,
        featSpellCatalog,
        preferredSource,
      )
      const modifierRefs = (row.modifierRefs ?? row.modifier_refs) as string[] | undefined
      return {
        name: f.name,
        description: f.description ? formatFeatDescription(f.description) : null,
        prerequisite: f.prerequisite ?? null,
        prerequisite_rules: f.prerequisite_rules ?? null,
        category: normalizeFeatCategory(f.category) ?? "General",
        level_requirement:
          typeof (f as { level_requirement?: unknown }).level_requirement === "number"
            ? (f as { level_requirement: number }).level_requirement
            : null,
        linked_modifiers: linkedModifiers ?? [],
        modifier_refs: modifierRefs ?? [],
        source: sanitizeImportRowSource((f as { source?: string | null }).source, source),
        prerequisite_feat_ids: [] as string[],
      }
    })
    await upsertByNameLocal("feats", featRows)

    const existingFeats = (await listRowsLocal("feats")).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      source: ((row.source as string | null | undefined) ?? "") as string,
    }))
    for (const row of featRows) {
      const enriched = enrichFeatRowWithPrerequisites(row, existingFeats, preferredSource)
      if (
        enriched.level_requirement !== row.level_requirement ||
        (enriched.prerequisite_feat_ids?.length ?? 0) > 0 ||
        (enriched.prerequisite_rules?.length ?? 0) > 0
      ) {
        await upsertByNameLocal("feats", [
          {
            name: enriched.name,
            level_requirement: enriched.level_requirement,
            prerequisite_feat_ids: enriched.prerequisite_feat_ids ?? [],
            prerequisite_rules: enriched.prerequisite_rules ?? [],
          },
        ])
      }
    }

    breakdown.feats = sanitized.feats.length
    totalImported += sanitized.feats.length
  }

  if (sanitized.creatures?.length) {
    const creatureRows = buildCreaturePersistRows(sanitized.creatures, source)
    await upsertByNameLocal("creatures", creatureRows)
    breakdown.creatures = sanitized.creatures.length
    totalImported += sanitized.creatures.length
  }

  if (sanitized.equipment?.length) {
    const equipment = normalizeEquipmentRows(
      sanitized.equipment.map((e) => stampSource({ ...e }, source)) as unknown as Record<string, unknown>[],
    )
    await upsertByNameLocal("equipment", equipment)
    breakdown.equipment = sanitized.equipment.length
    totalImported += sanitized.equipment.length
  }

  if ((sanitized as ImportContentWithAbilities).abilities?.length) {
    const rawAbilities = (sanitized as ImportContentWithAbilities).abilities!
    const { enrichAbilityImportRows } = await import("@/lib/import/enrich-ability-import")
    const { normalizeAbilityImportRows } = await import("@/lib/import/normalize-ability-import")
    const abilityRows = enrichAbilityImportRows(
      normalizeAbilityImportRows(
        rawAbilities.map((a) => stampSource({ ...a, show_in_builder: true }, source)),
      ),
    ).map((row) => {
      const linkedModifiers = resolveLinkedModifierSpells(
        (row.linkedModifiers ?? row.linked_modifiers) as
          | import("@/lib/compendium/linked-modifiers").LinkedModifierInstance[]
          | undefined,
        spellCatalog,
        preferredSource,
      )
      const choices = resolveFeatureChoiceLinkedSpells(
        row.choices as Feature["choices"] | undefined,
        spellCatalog,
        preferredSource,
      )
      const specializationChoices = resolveFeatureChoiceLinkedSpells(
        row.specialization_choices as Feature["choices"] | null | undefined,
        spellCatalog,
        preferredSource,
      )
      return {
        ...row,
        linked_modifiers: linkedModifiers ?? row.linked_modifiers ?? [],
        linkedModifiers: linkedModifiers ?? row.linkedModifiers ?? [],
        ...(choices !== undefined ? { choices } : {}),
        ...(specializationChoices !== undefined
          ? { specialization_choices: specializationChoices }
          : {}),
      }
    })
    await upsertByNameLocal("custom_abilities", abilityRows)
    breakdown.abilities = abilityRows.length
    totalImported += abilityRows.length
  }

  const report = buildImportReport({
    content: sanitized,
    enrichedClasses,
    enrichedSubclasses,
    classNameById,
    skippedSubclasses,
    spellCatalog,
    totalImported,
    breakdown,
    warnings,
    explicitResources,
    foundryMeta: foundryMeta as FoundryImportMeta | undefined,
  })

  const discoveredSpellSchools = collectSpellSchoolsFromImportContent(sanitized)
  return {
    totalImported,
    breakdown,
    warnings,
    report,
    ...(discoveredSpellSchools.length > 0 ? { discoveredSpellSchools } : {}),
  }
}
