import { enrichFeatureWithMechanicalDetection } from "@/lib/compendium/enrich-feature-mechanical-detection"
import {
  FEAT_MODIFIER_PRESETS,
  type FeatModifierPreset,
} from "@/lib/compendium/feat-modifier-presets"
export { FEAT_MODIFIER_CATALOG, SRD_FEAT_MODIFIER_PRESETS } from "@/lib/compendium/feat-modifier-presets"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { Feature } from "@/lib/types"
import { isOfficialFeatSource } from "@/lib/srd/source"

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

function isLegacySkilledRow(row: Record<string, unknown>): boolean {
  if (String(row.name ?? "") !== "Skilled") return false
  if (Boolean(row.is_choice ?? row.isChoice)) return true
  const linked = (row.linkedModifiers ?? row.linked_modifiers) as LinkedModifierInstance[] | undefined
  if (!Array.isArray(linked)) return false
  return linked.some((item) =>
    item.characteristics?.some(
      (mod) =>
        mod.type === "skills" &&
        (mod as { choiceCount?: number }).choiceCount === 3 &&
        !(mod as { sharedChoiceGroup?: string }).sharedChoiceGroup,
    ),
  )
}

function migrateSkilledRow(row: Record<string, unknown>, preset: FeatModifierPreset): Record<string, unknown> {
  const linked = preset.linkedModifiers ?? []
  return {
    ...row,
    is_choice: false,
    isChoice: false,
    choices: null,
    linked_modifiers: linked,
    linkedModifiers: linked,
    modifier_refs: linked.map((instance) => instance.catalogRefId),
    modifierRefs: linked.map((instance) => instance.catalogRefId),
    benefits: row.benefits ?? null,
    repeatable: row.repeatable ?? preset.repeatable ?? false,
  }
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

/** Apply bundled feat modifier presets when not already configured. */
export function enrichSrdFeatRow(row: Record<string, unknown>): Record<string, unknown> {
  if (!isOfficialFeatSource(row.source as string | null | undefined)) return row
  const name = String(row.name ?? "")
  const preset = FEAT_MODIFIER_PRESETS[name]

  if (name === "Skilled" && isLegacySkilledRow(row) && preset?.linkedModifiers) {
    return applyFeatMechanicalDetection(migrateSkilledRow(row, preset))
  }

  if (preset && !featHasModifierConfig(row)) {
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

export function enrichSrdFeatList(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(enrichSrdFeatRow)
}

/** Resolve preset by feat name (for tests / tooling). */
export function presetForFeatName(name: string): FeatModifierPreset | undefined {
  return FEAT_MODIFIER_PRESETS[name]
}
