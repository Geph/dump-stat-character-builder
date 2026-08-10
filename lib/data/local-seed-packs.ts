import { persistImportedContentLocal } from "@/lib/data/persist-import-content-local"
import { ensureModifierCatalog } from "@/lib/compendium/ensure-modifier-catalog"
import { createClient } from "@/lib/db/client"
import {
  seedExamplePack,
  type ExampleSeedPackResult,
  type SeedExamplePackOptions,
} from "@/lib/seed-packs/seed-example-pack"
import type { ExampleSeedPackId } from "@/lib/seed-packs/pack-ids"

export type LocalExampleSeedResult = ExampleSeedPackResult

/** Seed a bundled example pack into IndexedDB (static / browser storage mode). */
export async function seedLocalExamplePack(
  packId: ExampleSeedPackId,
  options: SeedExamplePackOptions = {},
): Promise<LocalExampleSeedResult> {
  await ensureModifierCatalog(createClient())
  return seedExamplePack(packId, persistImportedContentLocal, options)
}
