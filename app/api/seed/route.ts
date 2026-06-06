import { NextResponse } from "next/server"
import { getDatabaseConfigError, formatDatabaseError } from "@/lib/db/config"
import { getPool } from "@/lib/db/index"
import { runPendingMigrationsOnPool } from "@/lib/db/migrate"
import {
  deleteWhere,
  insertRows,
  listRows,
  upsertByName,
} from "@/lib/db/repository"
import { enrichSrdClassList } from "@/lib/compendium/enrich-srd-classes"
import { buildSrdClassResourceRows } from "@/lib/compendium/seed-class-resources"
import { getSrdSeedData, getSrdSeedTotals } from "@/lib/srd/load-seed"
import { LEGACY_SRD_SOURCES } from "@/lib/srd/source"

export async function POST() {
  try {
    const configError = getDatabaseConfigError()
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 })
    }

    const appliedMigrations = await runPendingMigrationsOnPool(getPool())

    const { classes, subclasses, species, backgrounds, spells, feats, equipment } =
      getSrdSeedData()

    await upsertByName("classes", enrichSrdClassList(classes))
    const classData = await listRows("classes")
    const classIdMap = new Map(classData.map((c) => [c.name as string, c.id as string]))

    const subclassesWithIds = subclasses
      .map((sc) => ({
        name: sc.name,
        description: sc.description,
        features: sc.features,
        source: sc.source,
        class_id: classIdMap.get(sc.class_name) ?? null,
      }))
      .filter((sc) => sc.class_id !== null)

    for (const source of LEGACY_SRD_SOURCES) {
      await deleteWhere("subclasses", [{ op: "eq", column: "source", value: source }])
    }
    await insertRows("subclasses", subclassesWithIds)

    for (const source of [...LEGACY_SRD_SOURCES, "SRD"]) {
      await deleteWhere("class_resources", [{ op: "eq", column: "source", value: source }])
    }
    await insertRows("class_resources", buildSrdClassResourceRows(classIdMap))

    await upsertByName("species", species)
    await upsertByName("backgrounds", backgrounds)
    await upsertByName("spells", spells)
    await upsertByName("feats", feats)
    await upsertByName("equipment", equipment)

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
