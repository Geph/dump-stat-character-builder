import { enrichFeatureWithMechanicalDetection } from "@/lib/compendium/enrich-feature-mechanical-detection"
import {
  CUSTOM_FEAT_MODIFIER_PRESETS,
  customFeatHasPresetRegistry,
} from "@/lib/compendium/custom-feat-modifier-presets"
import type { FeatModifierPreset } from "@/lib/compendium/feat-modifier-presets"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { shouldSkipFeatPreset } from "@/lib/import/resolve-feat-preset-conflict"
import type { Feature } from "@/lib/types"
import { isSrdSource } from "@/lib/srd/source"

function featHasLinkedModifiers(row: Record<string, unknown>): boolean {
  const linked = row.linkedModifiers ?? row.linked_modifiers
  if (Array.isArray(linked) && linked.length > 0) return true
  const refs = row.modifierRefs ?? row.modifier_refs
  return Array.isArray(refs) && refs.length > 0
}

function featHasModifierConfig(row: Record<string, unknown>): boolean {
  if (featHasLinkedModifiers(row)) return true
  if (Boolean(row.is_choice ?? row.isChoice)) {
    const choices = row.choices as { options?: unknown[] } | null | undefined
    return Array.isArray(choices?.options) && choices.options.length > 0
  }
  return false
}

function applyFeatMechanicalDetection(row: Record<string, unknown>): Record<string, unknown> {
  if (Boolean(row.is_choice ?? row.isChoice)) return row
  const description = typeof row.description === "string" ? row.description : ""
  if (!description.trim()) return row

  const name = String(row.name ?? "")
  const linked = (row.linkedModifiers ?? row.linked_modifiers) as LinkedModifierInstance[] | undefined
  const refs = (row.modifierRefs ?? row.modifier_refs) as string[] | undefined
  const detected = enrichFeatureWithMechanicalDetection(
    {
      name,
      description,
      linkedModifiers: Array.isArray(linked) ? linked : undefined,
      modifierRefs: Array.isArray(refs) ? refs : undefined,
    } as Feature,
    {
      contentKind: "feat",
      sourceName: name,
      featureName: name,
    },
  )

  return {
    ...row,
    linked_modifiers: detected.linkedModifiers,
    linkedModifiers: detected.linkedModifiers,
    modifier_refs: detected.modifierRefs,
    modifierRefs: detected.modifierRefs,
  }
}

/** Apply bundled non-SRD feat modifier presets when not already configured. */
export function enrichCustomFeatRow(row: Record<string, unknown>): Record<string, unknown> {
  if (isSrdSource(row.source as string | null | undefined)) return row
  const name = String(row.name ?? "")
  if (!customFeatHasPresetRegistry(name)) return applyFeatMechanicalDetection(row)

  const preset: FeatModifierPreset | undefined = CUSTOM_FEAT_MODIFIER_PRESETS[name]

  if (preset && !featHasModifierConfig(row)) {
    const description = typeof row.description === "string" ? row.description : ""
    if (shouldSkipFeatPreset(name, description, preset)) {
      return applyFeatMechanicalDetection(row)
    }
    if (preset.isChoice && preset.choices) {
      return {
        ...row,
        is_choice: true,
        isChoice: true,
        choices: preset.choices,
        linked_modifiers: [],
        linkedModifiers: [],
        modifier_refs: [],
        modifierRefs: [],
        benefits: row.benefits ?? null,
        repeatable: row.repeatable ?? preset.repeatable ?? false,
      }
    }

    const synced = syncModifierRefs({ linkedModifiers: preset.linkedModifiers ?? [] })
    return applyFeatMechanicalDetection({
      ...row,
      linked_modifiers: synced.linkedModifiers,
      linkedModifiers: synced.linkedModifiers,
      modifier_refs: synced.modifierRefs,
      modifierRefs: synced.modifierRefs,
      benefits: row.benefits ?? null,
      repeatable: row.repeatable ?? preset.repeatable ?? false,
    })
  }

  return applyFeatMechanicalDetection(row)
}

export function enrichCustomFeatList(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(enrichCustomFeatRow)
}

/** Resolve custom preset by feat name (for tests / tooling). */
export function presetForCustomFeatName(name: string): FeatModifierPreset | undefined {
  return CUSTOM_FEAT_MODIFIER_PRESETS[name]
}
