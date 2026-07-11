import { ALCHEMIST_PRESETS, ALCHEMIST_SEEDS } from "@/lib/import/enrichment-presets/packs/alchemist"
import {
  ALTERNATE_RANGER_PRESETS,
  ALTERNATE_RANGER_SEEDS,
  ALTERNATE_SORCERER_PRESETS,
  INVESTIGATOR_PRESETS,
  INVESTIGATOR_SEEDS,
  MONK_PRESETS,
  PSION_PRESETS,
} from "@/lib/import/enrichment-presets/packs/homebrew"
import type {
  ContentSeed,
  EnrichmentHook,
  EnrichmentPreset,
} from "@/lib/import/enrichment-presets/types"

const PRESETS: EnrichmentPreset[] = [
  ...ALCHEMIST_PRESETS,
  ...INVESTIGATOR_PRESETS,
  ...PSION_PRESETS,
  ...MONK_PRESETS,
  ...ALTERNATE_RANGER_PRESETS,
  ...ALTERNATE_SORCERER_PRESETS,
]

const SEEDS: ContentSeed[] = [
  ...ALCHEMIST_SEEDS,
  ...INVESTIGATOR_SEEDS,
  ...ALTERNATE_RANGER_SEEDS,
]

const HOOKS = new Map<string, EnrichmentHook>()

export function registerEnrichmentHook(id: string, hook: EnrichmentHook): void {
  HOOKS.set(id, hook)
}

export function getEnrichmentHook(id: string): EnrichmentHook | undefined {
  return HOOKS.get(id)
}

export function getEnrichmentPresets(): EnrichmentPreset[] {
  return PRESETS
}

export function getContentSeeds(): ContentSeed[] {
  return SEEDS
}

export function listEnrichmentPresetIds(): string[] {
  return PRESETS.map((preset) => preset.id)
}
