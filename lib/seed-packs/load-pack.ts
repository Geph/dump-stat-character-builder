import type { ImportContent } from "@/lib/import/content-schema"
import {
  EXAMPLE_SEED_PACKS,
  type ExampleSeedPackId,
  type ExampleSeedPackMeta,
} from "@/lib/seed-packs/pack-ids"

export type LoadedExampleSeedPack = {
  meta: ExampleSeedPackMeta
  source: string
  version: string
  files: ImportContent[]
}

export async function loadExampleSeedPack(packId: ExampleSeedPackId): Promise<LoadedExampleSeedPack> {
  const meta = EXAMPLE_SEED_PACKS.find((pack) => pack.id === packId)
  if (!meta) throw new Error(`Unknown example seed pack: ${packId}`)

  if (packId === "kibbles-tasty") {
    const { loadKibblesTastyPack } = await import("@/lib/seed-packs/kibbles-tasty/load")
    const loaded = loadKibblesTastyPack()
    return {
      meta,
      source: loaded.source,
      version: loaded.manifest.version,
      files: loaded.files,
    }
  }

  const { loadMageHandPressPack } = await import("@/lib/seed-packs/mage-hand-press/load")
  const loaded = loadMageHandPressPack()
  return {
    meta,
    source: loaded.source,
    version: loaded.manifest.version,
    files: loaded.files,
  }
}
