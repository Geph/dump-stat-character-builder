import { NextResponse } from "next/server"
import { getDatabaseConfigError, formatDatabaseError } from "@/lib/db/config"
import { getPool } from "@/lib/db/index"
import { runPendingMigrationsOnPool } from "@/lib/db/migrate"
import { createClient } from "@/lib/db/client"
import {
  deleteWhere,
  insertRows,
  listRows,
  upsertByName,
} from "@/lib/db/repository"
import { enrichSrdClassList } from "@/lib/compendium/enrich-srd-classes"
import { enrichSrdSubclassList } from "@/lib/compendium/enrich-srd-subclasses"
import { enrichSrdFeatList } from "@/lib/compendium/enrich-srd-feats"
import { enrichSrdSpeciesList } from "@/lib/compendium/enrich-srd-species"
import { normalizeBackgroundRows } from "@/lib/compendium/normalize-backgrounds"
import { buildSrdClassResourceRows } from "@/lib/compendium/seed-class-resources"
import { ensureModifierCatalog } from "@/lib/compendium/ensure-modifier-catalog"
import { getSrdSeedData, getSrdSeedTotals } from "@/lib/srd/load-seed"
import { LEGACY_SRD_SOURCES, withSrdCreatorUrlList } from "@/lib/srd/source"

export async function POST() {
  try {
    const configError = getDatabaseConfigError()
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 })
    }

    const appliedMigrations = await runPendingMigrationsOnPool(getPool())

    const { classes, subclasses, species, backgrounds, spells, feats, equipment } =
      getSrdSeedData()

    await upsertByName("classes", enrichSrdClassList(withSrdCreatorUrlList(classes)))
    const classData = await listRows("classes")
    const classIdMap = new Map(classData.map((c) => [c.name as string, c.id as string]))
    
    const subclassesWithIds = enrichSrdSubclassList(
      withSrdCreatorUrlList(
        subclasses
          .map((sc) => ({
      name: sc.name,
      description: sc.description,
      features: sc.features,
      source: sc.source,
            class_id: classIdMap.get(sc.class_name) ?? null,
          }))
          .filter((sc) => sc.class_id !== null) as Record<string, unknown>[],
      ),
      new Map([...classIdMap.entries()].map(([name, id]) => [id, name])),
    )

    for (const source of LEGACY_SRD_SOURCES) {
      await deleteWhere("subclasses", [{ op: "eq", column: "source", value: source }])
    }
    await insertRows("subclasses", subclassesWithIds)

    for (const source of [...LEGACY_SRD_SOURCES, "SRD"]) {
      await deleteWhere("class_resources", [{ op: "eq", column: "source", value: source }])
    }
    await insertRows("class_resources", buildSrdClassResourceRows(classIdMap))

    await upsertByName("species", enrichSrdSpeciesList(withSrdCreatorUrlList(species)))
    await upsertByName("backgrounds", normalizeBackgroundRows(withSrdCreatorUrlList(backgrounds)))
    await upsertByName("spells", withSrdCreatorUrlList(spells))
    await upsertByName("feats", enrichSrdFeatList(withSrdCreatorUrlList(feats)))
    await upsertByName("equipment", withSrdCreatorUrlList(equipment))

    await ensureModifierCatalog(createClient())

    const { total, breakdown } = getSrdSeedTotals()

    return NextResponse.json({ 
      success: true, 
      total,
      breakdown,
      srdVersion: getSrdSeedData().manifest.version,
      migrationsApplied: appliedMigrations,
    })
  } catch (error) {
    console.error("Seed error:", error)
    return NextResponse.json(
      {
        error: formatDatabaseError(
          "Seed",
          error instanceof Error ? error.message : "Failed to seed database",
        ),
      },
      { status: 500 },
    )
  }
}
