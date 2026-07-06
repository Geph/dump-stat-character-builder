import { NextRequest, NextResponse } from "next/server"
import { requireMutationAuth } from "@/lib/api/require-mutation-auth"
import { getDatabaseConfigError, formatDatabaseError } from "@/lib/db/config"
import { getPool } from "@/lib/db/index"
import { ensureMigrationsApplied } from "@/lib/db/migrate"
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
import { enrichSrdToolList } from "@/lib/compendium/enrich-srd-tools"
import { normalizeBackgroundRows } from "@/lib/compendium/normalize-backgrounds"
import { buildSrdClassResourceRows } from "@/lib/compendium/seed-class-resources"
import { ensureModifierCatalog } from "@/lib/compendium/ensure-modifier-catalog"
import { enrichSrdSpellList } from "@/lib/compendium/enrich-srd-spells"
import { seedSrdEquipment } from "@/lib/compendium/seed-srd-equipment"
import { getSrdSeedData, getSrdSeedTotals } from "@/lib/srd/load-seed"
import { LEGACY_SRD_SOURCES, withSrdCreatorUrlList } from "@/lib/srd/source"
import { asCompendiumRow, asCompendiumRows, castCompendiumRow } from "@/lib/data/types"

export async function POST(request: NextRequest) {
  try {
    const authError = requireMutationAuth(request)
    if (authError) return authError

    const configError = getDatabaseConfigError()
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 })
    }

    const appliedMigrations = await ensureMigrationsApplied(getPool())

    const { classes, subclasses, species, backgrounds, spells, feats, languages, tools } = getSrdSeedData()

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
          .filter((sc) => sc.class_id !== null) as unknown as Record<string, unknown>[],
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
    await upsertByName(
      "backgrounds",
      normalizeBackgroundRows(
        withSrdCreatorUrlList(backgrounds) as Parameters<typeof normalizeBackgroundRows>[0],
      ),
    )
    await upsertByName(
      "spells",
      enrichSrdSpellList(withSrdCreatorUrlList(spells as unknown as Record<string, unknown>[])),
    )
    await upsertByName("feats", enrichSrdFeatList(withSrdCreatorUrlList(feats)))
    await upsertByName("languages", withSrdCreatorUrlList(languages))
    await upsertByName("tools", enrichSrdToolList(withSrdCreatorUrlList(tools)))
    const equipmentSeed = await seedSrdEquipment({
      upsertByName,
      listEquipmentByName: async () => {
        const rows = await listRows("equipment")
        return rows.map((row) => ({
          name: row.name as string,
          id: row.id as string,
        }))
      },
    })

    await ensureModifierCatalog(createClient())

    const { total, breakdown } = getSrdSeedTotals()

    return NextResponse.json({ 
      success: true, 
      total,
      breakdown,
      equipmentSeed,
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
