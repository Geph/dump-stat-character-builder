import { formatFeatDescription } from "@/lib/compendium/feat-description"
import { enrichImportedSubclassRows } from "@/lib/compendium/enrich-import-subclasses"
import { normalizeBackgroundRows } from "@/lib/compendium/normalize-backgrounds"
import { deleteWhere, insertRows, listRows, upsertByName } from "@/lib/db/repository"
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
import {
  normalizeImportMaterialSource,
  type ImportSourceLabel,
} from "@/lib/import/import-material-source"
import { sanitizeImportRowSource } from "@/lib/import/sanitize-import-source"
import { sanitizeImportContentForPersist } from "@/lib/import/sanitize-import-content"
import { classNamesFuzzyMatch, resolveParentClassRow } from "@/lib/import/resolve-parent-class"
import {
  buildClassResourceRowsForClass,
  enrichImportedClassList,
  enrichSubclassFeaturesWithPsiCosts,
  resolvePsiResourceKeyForClass,
  type ClassResourceImportRow,
} from "@/lib/import/enrich-import-classes"
import { buildGatedClassResourceRowsForSubclass } from "@/lib/compendium/subclass-gated-class-resources"
import { normalizeEquipmentRows } from "@/lib/import/normalize-equipment"
import { buildCreaturePersistRows } from "@/lib/import/build-creature-persist-rows"
import { normalizeAbilityImportRows } from "@/lib/import/normalize-ability-import"
import { enrichAbilityImportRows } from "@/lib/import/enrich-ability-import"
import { resolveAbilityAttachmentRow } from "@/lib/import/resolve-ability-attachment"
import type { ImportContent, ImportContentWithAbilities } from "@/lib/import/content-schema"
import type { Feature } from "@/lib/types"

export type { ImportSourceLabel } from "@/lib/import/import-material-source"
export { normalizeImportMaterialSource } from "@/lib/import/import-material-source"

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

import { collectSpellSchoolsFromImportContent } from "@/lib/compendium/schools-of-magic"
import type { PersistImportResult } from "@/lib/import/persist-import-types"
import {
  preferredSourceForPersist,
  type PersistImportOptions,
} from "@/lib/import/persist-import-options"

export type { PersistImportResult } from "@/lib/import/persist-import-types"
export type { PersistImportOptions } from "@/lib/import/persist-import-options"

function normalizeFeatCategory(category: string | null | undefined): string | null {
  const trimmed = category?.trim()
  return trimmed ? trimmed : null
}

async function loadSpellCatalog(): Promise<{ id: string; name: string; source: string | null }[]> {
  const rows = await listRows("spells")
  return rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    source: (row.source as string | null | undefined) ?? null,
  }))
}

function asClassResourceImports(content: ImportContent): ClassResourceImportRow[] | undefined {
  return content.class_resources as ClassResourceImportRow[] | undefined
}

export async function persistImportedContent(
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
  let spellCatalog = await loadSpellCatalog()
  const explicitResources = asClassResourceImports(sanitized)

  if (sanitized.species?.length) {
    await upsertByName(
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
    await upsertByName("classes", enrichedClasses)
    breakdown.classes = enrichedClasses.length
    totalImported += enrichedClasses.length
  }

  if (sanitized.classes?.length || sanitized.class_resources?.length) {
    const preferNames = [
      ...new Set([
        ...(sanitized.classes?.map((c) => c.name) ?? []),
        ...(sanitized.class_resources?.map((r) => r.class_name) ?? []),
      ]),
    ]
    const classData = (await listRows("classes")).map((c) => ({
      id: c.id as string,
      name: c.name as string,
      source: (c.source as string | null) ?? null,
    }))
    const sameSourceNames = classData
      .filter((c) => c.source === source)
      .map((c) => c.name)
    const resolvePrefer = [...new Set([...preferNames, ...sameSourceNames])]

    const classNames = [
      ...new Set([
        ...(sanitized.classes?.map((c) => c.name) ?? []),
        ...(sanitized.class_resources?.map((r) => r.class_name) ?? []),
      ]),
    ]

    let resourceCount = 0
    for (const className of classNames) {
      const parent = resolveParentClassRow(className, classData, { preferNames: resolvePrefer })
      if (!parent) {
        warnings.push(`Skipped class resources — class not found: ${className}`)
        continue
      }
      const classId = parent.id

      const importClassRow =
        enrichedClasses.find((row) => row.name === className) ??
        enrichedClasses.find((row) => row.name === parent.name) ??
        ({ name: parent.name, description: null, features: [] } as unknown as Record<string, unknown>)

      const resourceRows = buildClassResourceRowsForClass(
        importClassRow,
        explicitResources,
        source,
        classId,
      )

      for (const resource of resourceRows) {
        await deleteWhere("class_resources", [
          { op: "eq", column: "class_id", value: classId },
          { op: "eq", column: "resource_key", value: resource.resource_key as string },
        ])
      }
      if (resourceRows.length > 0) {
        await insertRows("class_resources", resourceRows)
        resourceCount += resourceRows.length
      }
    }

    if (resourceCount > 0) {
      breakdown.class_resources = resourceCount
      totalImported += resourceCount
    }
  }

  if (sanitized.spells?.length) {
    await upsertByName("spells", sanitized.spells.map((s) => stampSource({ ...s }, source)))
    breakdown.spells = sanitized.spells.length
    totalImported += sanitized.spells.length
    spellCatalog = await loadSpellCatalog()
    if (enrichedClasses.length) {
      enrichedClasses = withResolvedFeatureSpells(
        enrichedClasses,
        "features",
        spellCatalog,
        preferredSource,
      )
      await upsertByName("classes", enrichedClasses)
    }
    if (sanitized.species?.length) {
      await upsertByName(
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
    const preferNames = [
      ...new Set([
        ...(sanitized.classes?.map((c) => c.name) ?? []),
        ...(sanitized.class_resources?.map((r) => r.class_name) ?? []),
        ...sanitized.subclasses.map((sc) => sc.class_name),
      ]),
    ]
    const classData = (await listRows("classes")).map((c) => ({
      id: c.id as string,
      name: c.name as string,
      source: (c.source as string | null) ?? null,
    }))
    classNameById = new Map(classData.map((c) => [c.id, c.name]))
    const sameSourceNames = classData
      .filter((c) => c.source === source)
      .map((c) => c.name)
    const resolvePrefer = [...new Set([...preferNames, ...sameSourceNames])]

    skippedSubclasses = []
    const subclassesWithIds = sanitized.subclasses
      .map((sc) => {
        const parent = resolveParentClassRow(sc.class_name, classData, {
          preferNames: resolvePrefer,
        })
        if (!parent) {
          skippedSubclasses.push({ name: sc.name, class_name: sc.class_name })
          return null
        }
        return {
          name: sc.name,
          description: sc.description,
          features: sc.features,
          new_toggles: sc.new_toggles ?? null,
          spellcasting: sc.spellcasting ?? null,
          source,
          class_id: parent.id,
          class_name: parent.name,
        }
      })
      .filter((sc): sc is NonNullable<typeof sc> => sc != null)
      .map((sc) => stampSource(sc, source)) as Array<
      Record<string, unknown> & { class_id: string; class_name: string }
    >

    if (skippedSubclasses.length > 0) {
      warnings.push(
        `Skipped ${skippedSubclasses.length} subclass(s) — parent class not found: ${skippedSubclasses.map((s) => `${s.name} (${s.class_name})`).join(", ")}`,
      )
    }

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
            explicitResources?.some((resource) =>
              classNamesFuzzyMatch(resource.class_name, parentClassName),
            ))
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
        await deleteWhere("subclasses", [
          { op: "eq", column: "name", value: sc.name as string },
          { op: "eq", column: "source", value: source },
        ])
      }
      await insertRows("subclasses", enrichedSubclasses)
      breakdown.subclasses = enrichedSubclasses.length
      totalImported += enrichedSubclasses.length

      const gatedResourceRows: Record<string, unknown>[] = []
      for (let index = 0; index < enrichedSubclasses.length; index++) {
        const row = enrichedSubclasses[index]!
        const sourceRow = subclassesWithIds[index]!
        gatedResourceRows.push(
          ...buildGatedClassResourceRowsForSubclass(
            sourceRow.class_id,
            sourceRow.class_name,
            String(row.name ?? ""),
            source,
          ),
        )
      }
      const uniqueGatedByKey = new Map<string, Record<string, unknown>>()
      for (const resource of gatedResourceRows) {
        uniqueGatedByKey.set(
          `${resource.class_id as string}:${resource.resource_key as string}`,
          resource,
        )
      }
      for (const resource of uniqueGatedByKey.values()) {
        await deleteWhere("class_resources", [
          { op: "eq", column: "class_id", value: resource.class_id as string },
          { op: "eq", column: "resource_key", value: resource.resource_key as string },
        ])
      }
      if (uniqueGatedByKey.size > 0) {
        await insertRows("class_resources", [...uniqueGatedByKey.values()])
        breakdown.class_resources = (breakdown.class_resources ?? 0) + uniqueGatedByKey.size
        totalImported += uniqueGatedByKey.size
      }
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
    await upsertByName("backgrounds", backgroundRows)
    breakdown.backgrounds = sanitized.backgrounds.length
    totalImported += sanitized.backgrounds.length
  }

  if (sanitized.feats?.length) {
    const spellCatalog = await loadSpellCatalog()
    const featRows = sanitized.feats.map((f) => {
      const row = f as unknown as Record<string, unknown>
      const linkedModifiers = resolveLinkedModifierSpells(
        (row.linkedModifiers ?? row.linked_modifiers) as import("@/lib/compendium/linked-modifiers").LinkedModifierInstance[] | undefined,
        spellCatalog,
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
    await upsertByName("feats", featRows)

    const existingFeats = (await listRows("feats")).map((row) => ({
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
        await upsertByName("feats", [
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
    await upsertByName("creatures", creatureRows)
    breakdown.creatures = sanitized.creatures.length
    totalImported += sanitized.creatures.length
  }

  if (sanitized.equipment?.length) {
    const equipment = normalizeEquipmentRows(
      sanitized.equipment.map((e) => stampSource({ ...e }, source)) as unknown as Record<string, unknown>[],
    )
    await upsertByName("equipment", equipment)
    breakdown.equipment = sanitized.equipment.length
    totalImported += sanitized.equipment.length
  }

  if ((sanitized as ImportContentWithAbilities).abilities?.length) {
    const rawAbilities = (sanitized as ImportContentWithAbilities).abilities!
    const classIdByName = new Map(
      (await listRows("classes")).map((row) => [row.name as string, row.id as string]),
    )
    const subclassIdByName = new Map(
      (await listRows("subclasses")).map((row) => [row.name as string, row.id as string]),
    )
    const speciesIdByName = new Map(
      (await listRows("species")).map((row) => [row.name as string, row.id as string]),
    )
    const backgroundIdByName = new Map(
      (await listRows("backgrounds")).map((row) => [row.name as string, row.id as string]),
    )
    const featIdByName = new Map(
      (await listRows("feats")).map((row) => [row.name as string, row.id as string]),
    )
    const attachmentMaps = {
      classIdByName,
      subclassIdByName,
      speciesIdByName,
      backgroundIdByName,
      featIdByName,
    }

    const spellCatalog = await loadSpellCatalog()
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
      const withSpells = {
        ...row,
        linked_modifiers: linkedModifiers ?? row.linked_modifiers ?? [],
        linkedModifiers: linkedModifiers ?? row.linkedModifiers ?? [],
        ...(choices !== undefined ? { choices } : {}),
        ...(specializationChoices !== undefined
          ? { specialization_choices: specializationChoices }
          : {}),
      }
      return resolveAbilityAttachmentRow(withSpells, attachmentMaps)
    })

    await upsertByName("custom_abilities", abilityRows)
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
    foundryMeta,
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
