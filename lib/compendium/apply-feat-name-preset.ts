import { enrichFeatureWithMechanicalDetection } from "@/lib/compendium/enrich-feature-mechanical-detection"
import {
  CUSTOM_FEAT_MODIFIER_PRESETS,
  customFeatHasPresetRegistry,
} from "@/lib/compendium/custom-feat-modifier-presets"
import {
  FEAT_MODIFIER_PRESETS,
  type FeatModifierPreset,
} from "@/lib/compendium/feat-modifier-presets"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { shouldSkipFeatPreset } from "@/lib/import/resolve-feat-preset-conflict"
import type { Feature } from "@/lib/types"

function featHasLinkedModifiers(row: Record<string, unknown>): boolean {
  const linked = row.linkedModifiers ?? row.linked_modifiers
  if (Array.isArray(linked) && linked.length > 0) return true
  const refs = row.modifierRefs ?? row.modifier_refs
  return Array.isArray(refs) && refs.length > 0
}

function abilityScoresPayload(mod: Record<string, unknown>): string {
  return JSON.stringify({
    mode: mod.mode ?? "fixed",
    points: mod.points ?? null,
    bonuses: mod.bonuses ?? {},
    allowedAbilities: mod.allowedAbilities ?? null,
    label: mod.label ?? null,
  })
}

/**
 * Keep hand-written half-feat ASI wiring authoritative when instance IDs match.
 * Repairs legacy unrestricted 1-point pools (e.g. Actor labeled "+1 Charisma").
 */
function syncPresetAbilityScores(
  row: Record<string, unknown>,
  preset: FeatModifierPreset,
): Record<string, unknown> {
  const linkedRaw = row.linkedModifiers ?? row.linked_modifiers
  if (!Array.isArray(linkedRaw) || !linkedRaw.length) return row
  const presetLinked = preset.linkedModifiers ?? []
  if (!presetLinked.length) return row

  let changed = false
  const linked = linkedRaw.map((instance) => {
    const inst = instance as LinkedModifierInstance
    const presetInst = presetLinked.find((p) => p.instanceId === inst.instanceId)
    const presetAsi = presetInst?.characteristics?.find((c) => c.type === "ability_scores")
    if (!presetAsi || !Array.isArray(inst.characteristics)) return inst

    let instanceChanged = false
    const characteristics = inst.characteristics.map((mod) => {
      if (mod.type !== "ability_scores") return mod
      if (abilityScoresPayload(mod as unknown as Record<string, unknown>) ===
        abilityScoresPayload(presetAsi as unknown as Record<string, unknown>)) {
        return mod
      }
      instanceChanged = true
      return presetAsi
    })
    if (!instanceChanged) return inst
    changed = true
    return { ...inst, characteristics }
  })

  if (!changed) return row
  const synced = syncModifierRefs({ linkedModifiers: linked as LinkedModifierInstance[] })
  return {
    ...row,
    linked_modifiers: synced.linkedModifiers,
    linkedModifiers: synced.linkedModifiers,
    modifier_refs: synced.modifierRefs,
    modifierRefs: synced.modifierRefs,
  }
}

/** Prefer custom (PHB) presets, then SRD presets — by name, independent of source. */
export function resolveFeatNamePreset(name: string): FeatModifierPreset | undefined {
  const normalized = name.replace(/\u2019/g, "'").trim()
  return (
    CUSTOM_FEAT_MODIFIER_PRESETS[name] ??
    CUSTOM_FEAT_MODIFIER_PRESETS[normalized] ??
    FEAT_MODIFIER_PRESETS[name] ??
    FEAT_MODIFIER_PRESETS[normalized]
  )
}

export function featHasNamePreset(name: string): boolean {
  const normalized = name.replace(/\u2019/g, "'").trim()
  return (
    Boolean(resolveFeatNamePreset(name)) ||
    customFeatHasPresetRegistry(name) ||
    customFeatHasPresetRegistry(normalized) ||
    name in FEAT_MODIFIER_PRESETS ||
    normalized in FEAT_MODIFIER_PRESETS
  )
}

export function applyFeatMechanicalDetection(row: Record<string, unknown>): Record<string, unknown> {
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

/**
 * Apply a hand-written feat name preset when the row has no linked modifiers yet.
 * Used by import enrichment, custom load enrich, and SRD load enrich.
 */
export function applyFeatNamePreset(
  row: Record<string, unknown>,
  options?: { forceClearChoiceShell?: boolean },
): Record<string, unknown> {
  const name = String(row.name ?? "")
  const preset = resolveFeatNamePreset(name)
  if (!preset) return row
  if (featHasLinkedModifiers(row)) return syncPresetAbilityScores(row, preset)

  const description = typeof row.description === "string" ? row.description : ""
  if (shouldSkipFeatPreset(name, description, preset)) {
    return applyFeatMechanicalDetection(row)
  }

  if (preset.isChoice && preset.choices) {
    const synced = syncModifierRefs({ linkedModifiers: preset.linkedModifiers ?? [] })
    return {
      ...row,
      is_choice: true,
      isChoice: true,
      choices: preset.choices,
      linked_modifiers: synced.linkedModifiers,
      linkedModifiers: synced.linkedModifiers,
      modifier_refs: synced.modifierRefs,
      modifierRefs: synced.modifierRefs,
      benefits: row.benefits ?? null,
      repeatable: row.repeatable ?? preset.repeatable ?? false,
    }
  }

  const synced = syncModifierRefs({ linkedModifiers: preset.linkedModifiers ?? [] })
  const withPreset = {
    ...row,
    // Drop LLM isChoice shells — presets wire choices via linkedModifiers.
    is_choice: options?.forceClearChoiceShell === false ? row.is_choice ?? row.isChoice : false,
    isChoice: options?.forceClearChoiceShell === false ? row.isChoice ?? row.is_choice : false,
    choices: options?.forceClearChoiceShell === false ? row.choices : null,
    linked_modifiers: synced.linkedModifiers,
    linkedModifiers: synced.linkedModifiers,
    modifier_refs: synced.modifierRefs,
    modifierRefs: synced.modifierRefs,
    benefits: row.benefits ?? null,
    repeatable: row.repeatable ?? preset.repeatable ?? false,
  }
  return applyFeatMechanicalDetection(withPreset)
}
