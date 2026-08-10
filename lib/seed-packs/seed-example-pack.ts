import type { ImportContent } from "@/lib/import/content-schema"
import type { ImportSourceLabel } from "@/lib/import/import-material-source"
import type { PersistImportOptions } from "@/lib/import/persist-import-options"
import type { PersistImportResult } from "@/lib/import/persist-import-types"
import { loadExampleSeedPack } from "@/lib/seed-packs/load-pack"
import type { ExampleSeedPackId } from "@/lib/seed-packs/pack-ids"

export type ExampleSeedFileError = {
  fileIndex: number
  fileLabel: string
  message: string
}

export type ExampleSeedPackResult = {
  packId: ExampleSeedPackId
  label: string
  source: string
  version: string
  total: number
  breakdown: Record<string, number>
  warnings: string[]
  /** Per-file failures; seeding continues after each error. */
  errors: ExampleSeedFileError[]
  filesAttempted: number
  filesSucceeded: number
  filesSeeded: number
  partial: boolean
}

export type ExamplePackPersistFn = (
  content: ImportContent,
  source: ImportSourceLabel,
  options?: PersistImportOptions,
) => Promise<PersistImportResult>

export type SeedExamplePackOptions = PersistImportOptions & {
  /** When set, only these file indexes from the pack are persisted (retry failed). */
  onlyFileIndexes?: number[]
}

function mergeBreakdown(
  into: Record<string, number>,
  from: Record<string, number>,
): void {
  for (const [key, value] of Object.entries(from)) {
    into[key] = (into[key] ?? 0) + (value ?? 0)
  }
}

export function labelSeedPackFile(content: ImportContent, index: number): string {
  const className = content.classes?.[0]?.name?.trim()
  if (className) return className
  if (content.spells?.length) return `Spells (${content.spells.length})`
  if (content.feats?.length) return `Feats (${content.feats.length})`
  const abilities = (content as { abilities?: unknown[] }).abilities
  if (abilities?.length) return `Abilities (${abilities.length})`
  if (content.creatures?.length) return `Creatures (${content.creatures.length})`
  return `File ${index + 1}`
}

/**
 * Seed a bundled example pack by persisting each pre-prepared ImportContent file
 * through the same path as a confirmed BYO import.
 *
 * Continues after per-file errors so one bad creature/class does not abort the pack.
 */
export async function seedExamplePack(
  packId: ExampleSeedPackId,
  persist: ExamplePackPersistFn,
  options: SeedExamplePackOptions = {},
): Promise<ExampleSeedPackResult> {
  const loaded = await loadExampleSeedPack(packId)
  const breakdown: Record<string, number> = {}
  const warnings: string[] = []
  const errors: ExampleSeedFileError[] = []
  let total = 0
  let filesSucceeded = 0

  const { onlyFileIndexes, ...persistOptions } = options
  const indexes =
    onlyFileIndexes?.length != null && onlyFileIndexes.length > 0
      ? [...new Set(onlyFileIndexes)].filter((i) => i >= 0 && i < loaded.files.length).sort((a, b) => a - b)
      : loaded.files.map((_, i) => i)

  for (const index of indexes) {
    const file = loaded.files[index]
    const fileLabel = labelSeedPackFile(file, index)
    try {
      const result = await persist(file, loaded.source, {
        ...persistOptions,
        preferSameSourceReplacements: true,
      })
      total += result.totalImported
      mergeBreakdown(breakdown, result.breakdown)
      if (result.warnings?.length) {
        warnings.push(...result.warnings.map((w) => `${fileLabel}: ${w}`))
      }
      filesSucceeded += 1
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push({ fileIndex: index, fileLabel, message })
      warnings.push(`${fileLabel}: failed — ${message}`)
    }
  }

  return {
    packId,
    label: loaded.meta.label,
    source: loaded.source,
    version: loaded.version,
    total,
    breakdown,
    warnings,
    errors,
    filesAttempted: indexes.length,
    filesSucceeded,
    filesSeeded: filesSucceeded,
    partial: errors.length > 0 && filesSucceeded > 0,
  }
}
