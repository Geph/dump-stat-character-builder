import { formatFeatDescription } from "@/lib/compendium/feat-description"
import { enrichImportedSubclassRows } from "@/lib/compendium/enrich-import-subclasses"
import { normalizeBackgroundRows } from "@/lib/compendium/normalize-backgrounds"
import { deleteWhere, insertRows, listRows, upsertByName } from "@/lib/db/repository"
import type { FoundryImportMeta } from "@/lib/import/foundry-types"
import { stripFoundryMeta, type ImportContentWithFoundryMeta } from "@/lib/import/foundry-manifest"
import { buildImportReport, type ImportReport } from "@/lib/import/build-import-report"
import { enrichFeatRowWithPrerequisites } from "@/lib/import/resolve-feat-prerequisites"
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
import type { Feature } from "@/lib/types"

export type ImportSourceLabel = string

export function normalizeImportMaterialSource(value: unknown, fallback = "Custom"): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  const normalized = trimmed.length > 0 ? trimmed.slice(0, 120) : fallback
  return sanitizeImportRowSource(normalized, fallback)
}

function stampSource<T extends Record<string, unknown>>(row: T, importerSource: string): T {
  const existing = "source" in row ? row.source : undefined
  return {
    ...row,
    source: sanitizeImportRowSource(existing, importerSource),
  }
}

export type PersistImportResult = {
  totalImported: number
  breakdown: Record<string, number>
  warnings: string[]
  report?: ImportReport
}

function normalizeFeatCategory(category: string | null | undefined): string | null {
  const trimmed = category?.trim()
  return trimmed ? trimmed : null
}

async function loadSpellCatalog(): Promise<{ id: string; name: string }[]> {
  const rows = await listRows("spells")
  return rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
  }))
}

function asClassResourceImports(content: ImportContent): ClassResourceImportRow[] | undefined {
  return content.class_resources as ClassResourceImportRow[] | undefined
}

export async function persistImportedContent(
  content: ImportContent | ImportContentWithFoundryMeta,
  source: ImportSourceLabel,
): Promise<PersistImportResult> {
  const foundryMeta = (content as ImportContentWithFoundryMeta).foundryImportMeta
  const sanitized = sanitizeImportContentForPersist(stripFoundryMeta(content as ImportContentWithFoundryMeta))
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
    await upsertByName("species", sanitized.species.map((s) => stampSource({ ...s }, source)))
    breakdown.species = sanitized.species.length
    totalImported += sanitized.species.length
  }

  if (sanitized.classes?.length) {
    enrichedClasses = enrichImportedClassList(
      sanitized.classes.map((c) => stampSource({ ...c }, source)),
      explicitResources,
    )
    await upsertByName("classes", enrichedClasses)
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
    const classData = await listRows("classes", {
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
        ({ name: className, description: null, features: [] } as Record<string, unknown>)

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
  }

  if (sanitized.subclasses?.length) {
    const classNames = [...new Set(sanitized.subclasses.map((sc) => sc.class_name))]
    const classData = await listRows("classes", {
      filters: [{ op: "in", column: "name", values: classNames }],
    })
    classNameById = new Map(classData.map((c) => [c.id as string, c.name as string]))
    const classIdMap = new Map(classData.map((c) => [c.name as string, c.id as string]))

    skippedSubclasses = sanitized.subclasses
      .filter((sc) => !classIdMap.get(sc.class_name))
      .map((sc) => ({ name: sc.name, class_name: sc.class_name }))
    if (skippedSubclasses.length > 0) {
      warnings.push(
        `Skipped ${skippedSubclasses.length} subclass(s) — parent class not found: ${skippedSubclasses.map((s) => `${s.name} (${s.class_name})`).join(", ")}`,
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
        if (!shouldLinkPsi) return row

        return {
          ...row,
          features: enrichSubclassFeaturesWithPsiCosts(
            (row.features as Feature[]) ?? [],
            psiKey,
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
    }
  }

  if (sanitized.backgrounds?.length) {
    await upsertByName(
      "backgrounds",
      normalizeBackgroundRows(sanitized.backgrounds.map((b) => stampSource({ ...b }, source))),
    )
    breakdown.backgrounds = sanitized.backgrounds.length
    totalImported += sanitized.backgrounds.length
  }

  if (sanitized.feats?.length) {
    const featRows = sanitized.feats.map((f) => {
      const row = f as Record<string, unknown>
      const linkedModifiers = (row.linkedModifiers ?? row.linked_modifiers) as unknown[] | undefined
      const modifierRefs = (row.modifierRefs ?? row.modifier_refs) as string[] | undefined
      return {
        name: f.name,
        description: f.description ? formatFeatDescription(f.description) : null,
        prerequisite: f.prerequisite ?? null,
        category: normalizeFeatCategory(f.category) ?? "General",
        level_requirement:
          typeof (f as { level_requirement?: unknown }).level_requirement === "number"
            ? (f as { level_requirement: number }).level_requirement
            : null,
        linked_modifiers: linkedModifiers ?? [],
        modifier_refs: modifierRefs ?? [],
        source: sanitizeImportRowSource(f.source, source),
      }
    })
    await upsertByName("feats", featRows)

    const existingFeats = await listRows<{ id: string; name: string }>("feats", "id, name")
    for (const row of featRows) {
      const enriched = enrichFeatRowWithPrerequisites(row, existingFeats)
      if (
        enriched.level_requirement !== row.level_requirement ||
        (enriched.prerequisite_feat_ids?.length ?? 0) > 0
      ) {
        await upsertByName("feats", [
          {
            name: enriched.name,
            level_requirement: enriched.level_requirement,
            prerequisite_feat_ids: enriched.prerequisite_feat_ids ?? [],
          },
        ])
      }
    }

    breakdown.feats = sanitized.feats.length
    totalImported += sanitized.feats.length
  }

  if (sanitized.equipment?.length) {
    const equipment = normalizeEquipmentRows(
      sanitized.equipment.map((e) => stampSource({ ...e }, source)) as Record<string, unknown>[],
    )
    await upsertByName("equipment", equipment)
    breakdown.equipment = sanitized.equipment.length
    totalImported += sanitized.equipment.length
  }

  if (sanitized.abilities?.length) {
    await upsertByName(
      "custom_abilities",
      sanitized.abilities.map((a) => stampSource({ ...a, show_in_builder: true }, source)),
    )
    breakdown.abilities = sanitized.abilities.length
    totalImported += sanitized.abilities.length
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

  return { totalImported, breakdown, warnings, report }
}
