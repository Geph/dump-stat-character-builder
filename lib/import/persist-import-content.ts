import { formatFeatDescription } from "@/lib/compendium/feat-description"
import { enrichImportedSubclassRows } from "@/lib/compendium/enrich-import-subclasses"
import { normalizeBackgroundRows } from "@/lib/compendium/normalize-backgrounds"
import { deleteWhere, insertRows, listRows, upsertByName } from "@/lib/db/repository"
import type { ImportContent } from "@/lib/import/content-schema"
import { buildImportReport, type ImportReport } from "@/lib/import/build-import-report"
import {
  buildClassResourceRowsForClass,
  enrichImportedClassList,
  enrichSubclassFeaturesWithPsiCosts,
  resolvePsiResourceKeyForClass,
  type ClassResourceImportRow,
} from "@/lib/import/enrich-import-classes"
import { normalizeEquipmentRows } from "@/lib/import/normalize-equipment"
import type { Feature } from "@/lib/types"

export type ImportSourceLabel = "Text Import" | "PDF Import"

export type PersistImportResult = {
  totalImported: number
  breakdown: Record<string, number>
  warnings: string[]
  report?: ImportReport
}

function normalizeFeatCategory(
  category: string | null | undefined,
): "Origin" | "General" | "Fighting Style" | "Epic Boon" | null {
  if (!category) return null
  const normalized = category.trim()
  if (
    normalized === "Origin" ||
    normalized === "General" ||
    normalized === "Fighting Style" ||
    normalized === "Epic Boon"
  ) {
    return normalized
  }
  return null
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
  content: ImportContent,
  source: ImportSourceLabel,
): Promise<PersistImportResult> {
  let totalImported = 0
  const breakdown: Record<string, number> = {}
  const warnings: string[] = []
  let enrichedSubclasses: Record<string, unknown>[] = []
  let skippedSubclasses: { name: string; class_name: string }[] = []
  let enrichedClasses: Record<string, unknown>[] = []
  let classNameById = new Map<string, string>()
  let spellCatalog = await loadSpellCatalog()
  const explicitResources = asClassResourceImports(content)

  if (content.species?.length) {
    await upsertByName("species", content.species.map((s) => ({ ...s, source })))
    breakdown.species = content.species.length
    totalImported += content.species.length
  }

  if (content.classes?.length) {
    enrichedClasses = enrichImportedClassList(
      content.classes.map((c) => ({ ...c, source })),
      explicitResources,
    )
    await upsertByName("classes", enrichedClasses)
    breakdown.classes = enrichedClasses.length
    totalImported += enrichedClasses.length
  }

  if (content.classes?.length || content.class_resources?.length) {
    const classNames = [
      ...new Set([
        ...(content.classes?.map((c) => c.name) ?? []),
        ...(content.class_resources?.map((r) => r.class_name) ?? []),
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

  if (content.spells?.length) {
    await upsertByName("spells", content.spells.map((s) => ({ ...s, source })))
    breakdown.spells = content.spells.length
    totalImported += content.spells.length
    spellCatalog = await loadSpellCatalog()
  }

  if (content.subclasses?.length) {
    const classNames = [...new Set(content.subclasses.map((sc) => sc.class_name))]
    const classData = await listRows("classes", {
      filters: [{ op: "in", column: "name", values: classNames }],
    })
    classNameById = new Map(classData.map((c) => [c.id as string, c.name as string]))
    const classIdMap = new Map(classData.map((c) => [c.name as string, c.id as string]))

    skippedSubclasses = content.subclasses
      .filter((sc) => !classIdMap.get(sc.class_name))
      .map((sc) => ({ name: sc.name, class_name: sc.class_name }))
    if (skippedSubclasses.length > 0) {
      warnings.push(
        `Skipped ${skippedSubclasses.length} subclass(s) — parent class not found: ${skippedSubclasses.map((s) => `${s.name} (${s.class_name})`).join(", ")}`,
      )
    }

    const subclassesWithIds = content.subclasses
      .map((sc) => ({
        name: sc.name,
        description: sc.description,
        features: sc.features,
        source,
        class_id: classIdMap.get(sc.class_name) || null,
        class_name: sc.class_name,
      }))
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

  if (content.backgrounds?.length) {
    await upsertByName(
      "backgrounds",
      normalizeBackgroundRows(content.backgrounds.map((b) => ({ ...b, source }))),
    )
    breakdown.backgrounds = content.backgrounds.length
    totalImported += content.backgrounds.length
  }

  if (content.feats?.length) {
    await upsertByName(
      "feats",
      content.feats.map((f) => ({
        name: f.name,
        description: f.description ? formatFeatDescription(f.description) : null,
        prerequisite: f.prerequisite ?? null,
        category: normalizeFeatCategory(f.category),
        source,
      })),
    )
    breakdown.feats = content.feats.length
    totalImported += content.feats.length
  }

  if (content.equipment?.length) {
    const equipment = normalizeEquipmentRows(
      content.equipment.map((e) => ({ ...e, source })) as Record<string, unknown>[],
    )
    await upsertByName("equipment", equipment)
    breakdown.equipment = equipment.length
    totalImported += equipment.length
  }

  if (content.abilities?.length) {
    await upsertByName(
      "custom_abilities",
      content.abilities.map((a) => ({ ...a, source, show_in_builder: true })),
    )
    breakdown.abilities = content.abilities.length
    totalImported += content.abilities.length
  }

  const report = buildImportReport({
    content,
    enrichedClasses,
    enrichedSubclasses,
    classNameById,
    skippedSubclasses,
    spellCatalog,
    totalImported,
    breakdown,
    warnings,
    explicitResources,
  })

  return { totalImported, breakdown, warnings, report }
}
