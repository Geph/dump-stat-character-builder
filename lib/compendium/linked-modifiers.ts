import {
  createModifierId,
  normalizeCharacteristics,
  type CharacteristicModifier,
} from "@/lib/compendium/characteristic-modifiers"
import {
  catalogEntryById,
  type ModifierCatalogEntry,
} from "@/lib/compendium/modifier-catalog"
import type { FeatureActivation } from "@/lib/types"

import type { UsesConfig } from "@/lib/types"

export type LinkedModifierInstance = {
  instanceId: string
  catalogRefId: string
  characteristics?: CharacteristicModifier[]
  activation?: FeatureActivation | null
}

/** Stored on migrated inline-only modifier instances (characteristics live on the instance). */
export const MIGRATED_INLINE_CATALOG_ID = "cat_migrated_inline"

export function appendInlineCharacteristicsAsLinked(
  linked: LinkedModifierInstance[],
  inline: CharacteristicModifier[] | null | undefined,
  uses?: UsesConfig | null,
): LinkedModifierInstance[] {
  const normalized = normalizeCharacteristics(inline ?? null, uses ?? null)
  if (!normalized.length) return linked
  if (linked.some((item) => item.catalogRefId === MIGRATED_INLINE_CATALOG_ID)) {
    return linked
  }
  return [
    ...linked,
    {
      instanceId: createModifierInstanceId(),
      catalogRefId: MIGRATED_INLINE_CATALOG_ID,
      characteristics: normalized,
    },
  ]
}

export function createModifierInstanceId(): string {
  return `modinst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function cloneCharacteristics(mods: CharacteristicModifier[]): CharacteristicModifier[] {
  return normalizeCharacteristics(
    mods.map((mod) => ({
      ...JSON.parse(JSON.stringify(mod)),
      id: createModifierId(),
    })),
    null,
  )
}

function cloneActivation(activation: FeatureActivation | null | undefined): FeatureActivation | null {
  if (!activation) return null
  return JSON.parse(JSON.stringify(activation))
}

export function createLinkedModifierFromCatalog(entry: ModifierCatalogEntry): LinkedModifierInstance {
  return {
    instanceId: createModifierInstanceId(),
    catalogRefId: entry.id,
    characteristics: entry.characteristics?.length
      ? cloneCharacteristics(entry.characteristics)
      : undefined,
    activation: cloneActivation(entry.activation),
  }
}

export function linkedModifiersFromRefs(
  refIds: string[] | undefined | null,
  catalog: ModifierCatalogEntry[],
): LinkedModifierInstance[] {
  if (!refIds?.length) return []
  return refIds
    .map((refId) => {
      const entry = catalogEntryById(catalog, refId)
      if (!entry) return null
      return createLinkedModifierFromCatalog(entry)
    })
    .filter((item): item is LinkedModifierInstance => item != null)
}

export function normalizeLinkedModifiers(
  raw: unknown,
  catalog: ModifierCatalogEntry[],
  legacyRefs?: string[] | null,
): LinkedModifierInstance[] {
  if (Array.isArray(raw) && raw.length) {
    return raw
      .filter(
        (item): item is LinkedModifierInstance =>
          Boolean(item && typeof item === "object" && typeof (item as LinkedModifierInstance).catalogRefId === "string"),
      )
      .map((item) => ({
        instanceId: item.instanceId ?? createModifierInstanceId(),
        catalogRefId: item.catalogRefId,
        characteristics: item.characteristics?.length
          ? normalizeCharacteristics(item.characteristics, null)
          : undefined,
        activation: item.activation !== undefined ? item.activation : undefined,
      }))
  }
  return linkedModifiersFromRefs(legacyRefs, catalog)
}

export function modifierRefsFromLinked(linked: LinkedModifierInstance[]): string[] {
  return linked.map((instance) => instance.catalogRefId)
}

export function syncModifierRefs<T extends { linkedModifiers?: LinkedModifierInstance[]; modifierRefs?: string[] }>(
  patch: T,
): T & { modifierRefs: string[] } {
  const linked = patch.linkedModifiers ?? []
  return {
    ...patch,
    modifierRefs: linked.length ? modifierRefsFromLinked(linked) : patch.modifierRefs ?? [],
  }
}

export function resolveLinkedModifierInstance(
  instance: LinkedModifierInstance,
  catalog: ModifierCatalogEntry[],
): { characteristics: CharacteristicModifier[]; activation: FeatureActivation | null } {
  const entry = catalogEntryById(catalog, instance.catalogRefId)
  const characteristics = instance.characteristics?.length
    ? normalizeCharacteristics(instance.characteristics, null)
    : normalizeCharacteristics(entry?.characteristics ?? [], null)
  const activation =
    instance.activation !== undefined ? (instance.activation ?? null) : (entry?.activation ?? null)
  return { characteristics, activation }
}

export function resolveLinkedModifiers(
  instances: LinkedModifierInstance[],
  catalog: ModifierCatalogEntry[],
): { characteristics: CharacteristicModifier[]; activations: FeatureActivation[] } {
  const characteristics: CharacteristicModifier[] = []
  const activations: FeatureActivation[] = []
  for (const instance of instances) {
    const resolved = resolveLinkedModifierInstance(instance, catalog)
    characteristics.push(...resolved.characteristics)
    if (resolved.activation) activations.push(resolved.activation)
  }
  return { characteristics, activations }
}

/** Copy feature-level action/bonus/reaction flags onto each linked modifier instance. */
export function syncFeatureActivationTiming(
  featureActivation: FeatureActivation | null | undefined,
  instances: LinkedModifierInstance[],
): LinkedModifierInstance[] {
  const timing = {
    action: Boolean(featureActivation?.action),
    bonusAction: Boolean(featureActivation?.bonusAction),
    reaction: Boolean(featureActivation?.reaction),
    onInitiative: Boolean(featureActivation?.onInitiative),
    onDropToZeroHp: Boolean(featureActivation?.onDropToZeroHp),
    onFailedSave: Boolean(featureActivation?.onFailedSave),
    onSuccessfulSave: Boolean(featureActivation?.onSuccessfulSave),
    oncePerTurn: Boolean(featureActivation?.oncePerTurn),
    spendClassResourceKey: featureActivation?.spendClassResourceKey ?? null,
    spendClassResourceAmount: featureActivation?.spendClassResourceAmount ?? null,
    usesExistingClassFeature: Boolean(featureActivation?.usesExistingClassFeature),
    existingClassFeatureName: featureActivation?.existingClassFeatureName ?? null,
  }
  return instances.map((instance) => {
    const base = instance.activation ?? {}
    return {
      ...instance,
      activation: {
        ...base,
        ...timing,
        effects: base.effects,
        effect: base.effect,
      },
    }
  })
}

export function effectiveLinkedModifiers(
  linked: LinkedModifierInstance[] | undefined | null,
  legacyRefs: string[] | undefined | null,
  catalog: ModifierCatalogEntry[],
): LinkedModifierInstance[] {
  if (linked?.length) return linked
  return linkedModifiersFromRefs(legacyRefs, catalog)
}

export function readLinkedModifiers(
  row: Record<string, unknown> | null | undefined,
  catalog: ModifierCatalogEntry[],
): LinkedModifierInstance[] {
  if (!row) return []
  const raw = row.linkedModifiers ?? row.linked_modifiers
  const legacyRefs = Array.isArray(row.modifierRefs)
    ? row.modifierRefs
    : Array.isArray(row.modifier_refs)
      ? row.modifier_refs
      : undefined
  const linked = normalizeLinkedModifiers(raw, catalog, legacyRefs as string[] | undefined)
  const inline = row.benefits ?? row.characteristics
  const uses = row.uses as UsesConfig | null | undefined
  return appendInlineCharacteristicsAsLinked(
    linked,
    inline as CharacteristicModifier[] | undefined,
    uses,
  )
}
