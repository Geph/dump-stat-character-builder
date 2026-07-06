import {
  enrichSrdMundaneEquipmentList,
  prepareMagicItemsForSeed,
} from "@/lib/compendium/enrich-srd-magic-items"
import { getSrdSeedData } from "@/lib/srd/load-seed"
import { withSrdCreatorUrlList } from "@/lib/srd/source"

type EquipmentNameRow = { name: string; id: string }

export async function seedSrdEquipment(params: {
  upsertByName: (table: "equipment", rows: Record<string, unknown>[]) => Promise<void>
  listEquipmentByName?: () => Promise<EquipmentNameRow[]>
}): Promise<{ mundaneCount: number; magicCount: number }> {
  const { equipment, magicItems } = getSrdSeedData()
  const mundaneRows = enrichSrdMundaneEquipmentList(
    withSrdCreatorUrlList(equipment as unknown as Record<string, unknown>[]),
  )
  await params.upsertByName("equipment", mundaneRows)

  const equipmentRows = params.listEquipmentByName
    ? await params.listEquipmentByName()
    : []
  const nameToId = new Map(equipmentRows.map((row) => [row.name, row.id]))
  const magicRows = prepareMagicItemsForSeed(
    withSrdCreatorUrlList(magicItems as unknown as Record<string, unknown>[]) as never,
    nameToId,
  )

  if (magicRows.length > 0) {
    await params.upsertByName("equipment", magicRows as unknown as Record<string, unknown>[])
  }

  return { mundaneCount: mundaneRows.length, magicCount: magicRows.length }
}
