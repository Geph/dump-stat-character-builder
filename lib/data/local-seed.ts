import { enrichSrdClassList } from "@/lib/compendium/enrich-srd-classes"
import { buildSrdClassResourceRows } from "@/lib/compendium/seed-class-resources"
import { ensureModifierCatalog } from "@/lib/compendium/ensure-modifier-catalog"
import { createClient } from "@/lib/db/client"
import { getSrdSeedData, getSrdSeedTotals } from "@/lib/srd/load-seed"
import { LEGACY_SRD_SOURCES } from "@/lib/srd/source"
import {
  deleteIndexedDbRow,
  getAllFromStore,
  isIndexedDbEmpty,
  putRows,
  upsertByName,
} from "./indexed-db-store"

export type LocalSeedResult = {
  total: number
  breakdown: Record<string, number>
  srdVersion: string
}

const SRD_VERSION_STORAGE_KEY = "dump-stat-srd-version"

export { isIndexedDbEmpty, getIndexedDbRowCounts } from "./indexed-db-store"

function readStoredSrdVersion(): string | null {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem(SRD_VERSION_STORAGE_KEY)
}

function writeStoredSrdVersion(version: string): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(SRD_VERSION_STORAGE_KEY, version)
}

async function seedClassResources(classIdMap: Map<string, string>): Promise<void> {
  const existing = await getAllFromStore("class_resources")
  const srdSources = new Set([...LEGACY_SRD_SOURCES, "SRD"])
  for (const row of existing) {
    if (srdSources.has(row.source as string)) {
      await deleteIndexedDbRow("class_resources", row.id as string)
    }
  }

  const rows = buildSrdClassResourceRows(classIdMap).map((row) => ({
    ...row,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }))
  await putRows("class_resources", rows)
}

async function ensureBundledSrdFresh(): Promise<void> {
  const { manifest, species, classes } = getSrdSeedData()
  if (readStoredSrdVersion() === manifest.version) return
  await upsertByName("species", species)
  await upsertByName("classes", enrichSrdClassList(classes as Record<string, unknown>[]))
  const classRows = await getAllFromStore("classes")
  const classIdMap = new Map(classRows.map((c) => [c.name as string, c.id as string]))
  await seedClassResources(classIdMap)
  writeStoredSrdVersion(manifest.version)
}

export async function seedLocalSrd(): Promise<LocalSeedResult> {
  const { classes, subclasses, species, backgrounds, spells, feats, equipment, manifest } =
    getSrdSeedData()

  await upsertByName("classes", enrichSrdClassList(classes as Record<string, unknown>[]))
  const classRows = await getAllFromStore("classes")
  const classIdMap = new Map(classRows.map((c) => [c.name as string, c.id as string]))

  const subclassesWithIds = subclasses
    .map((sc) => ({
      name: sc.name,
      description: sc.description,
      features: sc.features,
      source: sc.source,
      class_id: classIdMap.get(sc.class_name) ?? null,
    }))
    .filter((sc) => sc.class_id !== null) as Record<string, unknown>[]

  for (const source of LEGACY_SRD_SOURCES) {
    const existing = await getAllFromStore("subclasses")
    for (const row of existing) {
      if (row.source === source) {
        await deleteIndexedDbRow("subclasses", row.id as string)
      }
    }
  }
  await putRows("subclasses", subclassesWithIds.map((row) => ({
    ...row,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })))

  await seedClassResources(classIdMap)

  await upsertByName("species", species)
  await upsertByName("backgrounds", backgrounds)
  await upsertByName("spells", spells)
  await upsertByName("feats", feats)
  await upsertByName("equipment", equipment)

  await ensureModifierCatalog(createClient())

  const { total, breakdown } = getSrdSeedTotals()
  writeStoredSrdVersion(manifest.version)
  return { total, breakdown, srdVersion: manifest.version }
}

export async function ensureLocalSrdSeed(): Promise<LocalSeedResult | null> {
  await ensureModifierCatalog(createClient())

  const empty = await isIndexedDbEmpty()
  if (empty) {
    return seedLocalSrd()
  }

  await ensureBundledSrdFresh()
  return null
}
