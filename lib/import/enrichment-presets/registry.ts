import { ALCHEMIST_PRESETS, ALCHEMIST_SEEDS } from "@/lib/import/enrichment-presets/packs/alchemist"
import { CRAFTSMAN_PRESETS } from "@/lib/import/enrichment-presets/packs/craftsman"
import { DANCER_PRESETS } from "@/lib/import/enrichment-presets/packs/dancer"
import { GUNSLINGER_PRESETS } from "@/lib/import/enrichment-presets/packs/gunslinger"
import { WITCH_PRESETS } from "@/lib/import/enrichment-presets/packs/witch"
import { WARMAGE_PRESETS } from "@/lib/import/enrichment-presets/packs/warmage"
import {
  ALTERNATE_RANGER_PRESETS,
  ALTERNATE_RANGER_SEEDS,
  ALTERNATE_SORCERER_PRESETS,
  ALCHEMIST_PHILOSOPHER_PRESETS,
  INVESTIGATOR_PRESETS,
  INVESTIGATOR_SEEDS,
  MARTYR_PRESETS,
  MHP_WARDEN_PRESETS,
  MHP_WARDEN_SEEDS,
  MONK_PRESETS,
  NECROMANCER_PRESETS,
  PSION_PRESETS,
  VAGABOND_PRESETS,
} from "@/lib/import/enrichment-presets/packs/homebrew"
import type {
  ContentSeed,
  EnrichmentHook,
  EnrichmentPreset,
} from "@/lib/import/enrichment-presets/types"

const PRESETS: EnrichmentPreset[] = [
  ...ALCHEMIST_PRESETS,
  ...ALCHEMIST_PHILOSOPHER_PRESETS,
  ...INVESTIGATOR_PRESETS,
  ...PSION_PRESETS,
  ...MONK_PRESETS,
  ...ALTERNATE_RANGER_PRESETS,
  ...ALTERNATE_SORCERER_PRESETS,
  ...WARMAGE_PRESETS,
  ...DANCER_PRESETS,
  ...CRAFTSMAN_PRESETS,
  ...VAGABOND_PRESETS,
  ...WITCH_PRESETS,
  ...GUNSLINGER_PRESETS,
  ...MARTYR_PRESETS,
  ...NECROMANCER_PRESETS,
  ...MHP_WARDEN_PRESETS,
]

const SEEDS: ContentSeed[] = [
  ...ALCHEMIST_SEEDS,
  ...INVESTIGATOR_SEEDS,
  ...ALTERNATE_RANGER_SEEDS,
  ...MHP_WARDEN_SEEDS,
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
