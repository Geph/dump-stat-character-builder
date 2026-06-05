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

export { isIndexedDbEmpty, getIndexedDbRowCounts } from "./indexed-db-store"

export async function seedLocalSrd(): Promise<LocalSeedResult> {
  const { classes, subclasses, species, backgrounds, spells, feats, equipment, manifest } =
    getSrdSeedData()

  await upsertByName("classes", classes as Record<string, unknown>[])
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

  await upsertByName("species", species)
  await upsertByName("backgrounds", backgrounds)
  await upsertByName("spells", spells)
  await upsertByName("feats", feats)
  await upsertByName("equipment", equipment)

  const { total, breakdown } = getSrdSeedTotals()
  return { total, breakdown, srdVersion: manifest.version }
}

export async function ensureLocalSrdSeed(): Promise<LocalSeedResult | null> {
  const empty = await isIndexedDbEmpty()
  if (!empty) return null
  return seedLocalSrd()
}
