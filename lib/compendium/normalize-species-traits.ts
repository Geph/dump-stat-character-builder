import { enrichSrdSpeciesRow } from "@/lib/compendium/enrich-srd-species"
import { enrichCustomSpeciesRow } from "@/lib/compendium/enrich-custom-species"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { FeatureChoice, Trait } from "@/lib/types"
import bundledSpecies from "@/lib/srd/seed-data/species.json"
import { isSrdSource } from "@/lib/srd/source"
import { withModifierRefs } from "@/lib/compendium/normalize-modifier-refs"

function normalizeStoredLinkedModifiers(raw: unknown): LinkedModifierInstance[] | undefined {
  if (!Array.isArray(raw) || !raw.length) return undefined
  const instances = raw
    .filter(
      (item): item is LinkedModifierInstance =>
        Boolean(item && typeof item === "object" && typeof (item as LinkedModifierInstance).catalogRefId === "string"),
    )
    .map((item) => ({
      instanceId: typeof item.instanceId === "string" ? item.instanceId : `modinst_${Math.random().toString(36).slice(2, 8)}`,
      catalogRefId: item.catalogRefId,
      characteristics: item.characteristics,
      activation: item.activation,
    }))
  return instances.length ? instances : undefined
}

function normalizeChoice(raw: unknown, fallbackCategory: string): FeatureChoice | undefined {
  if (!raw || typeof raw !== "object") return undefined

  const choice = raw as unknown as Record<string, unknown>
  const options = Array.isArray(choice.options)
    ? choice.options
        .filter((option): option is Record<string, unknown> => !!option && typeof option === "object")
        .map((option) => ({
          name: String(option.name ?? "").trim(),
          description: String(option.description ?? "").trim(),
          modifierRefs: Array.isArray(option.modifierRefs)
            ? option.modifierRefs.filter((id): id is string => typeof id === "string")
            : Array.isArray(option.modifier_refs)
              ? option.modifier_refs.filter((id): id is string => typeof id === "string")
              : undefined,
          linkedModifiers: normalizeStoredLinkedModifiers(option.linkedModifiers ?? option.linked_modifiers),
        }))
        .filter((option) => option.name)
    : []

  if (!options.length) return undefined

  const count =
    typeof choice.count === "number" && Number.isFinite(choice.count) && choice.count > 0
      ? choice.count
      : 1

  const category =
    typeof choice.category === "string" && choice.category.trim()
      ? choice.category.trim()
      : fallbackCategory

  return { category, count, options }
}

export function normalizeSpeciesTraits(raw: unknown): Trait[] {
  let traits = raw
  if (typeof traits === "string") {
    try {
      traits = JSON.parse(traits)
    } catch {
      return []
    }
  }

  if (!Array.isArray(traits)) return []

  return traits
    .filter((trait): trait is Record<string, unknown> => !!trait && typeof trait === "object")
    .map((trait) => {
      const name = String(trait.name ?? "").trim()
      const choices = normalizeChoice(trait.choices, name)
      const isChoice = Boolean(trait.isChoice ?? trait.is_choice ?? choices)

      return {
        name,
        description: String(trait.description ?? "").trim(),
        level: typeof trait.level === "number" ? trait.level : undefined,
        isChoice: isChoice && !!choices,
        choices: isChoice && choices ? choices : undefined,
        modifierRefs: Array.isArray(trait.modifierRefs)
          ? trait.modifierRefs.filter((id): id is string => typeof id === "string")
          : Array.isArray(trait.modifier_refs)
            ? trait.modifier_refs.filter((id): id is string => typeof id === "string")
            : undefined,
        linkedModifiers: normalizeStoredLinkedModifiers(trait.linkedModifiers ?? trait.linked_modifiers),
      }
    })
    .filter((trait) => trait.name)
}

const bundledSpeciesByName = new Map(
  (bundledSpecies as { name: string; traits?: unknown }[]).map((species) => [species.name, species]),
)

function speciesHasChoiceTraits(traits: Trait[]): boolean {
  return traits.some((trait) => trait.isChoice && (trait.choices?.options?.length ?? 0) > 0)
}

/** Normalize stored species rows, fill missing SRD choice traits from bundled seed, and apply modifier presets. */
export function enrichSpeciesList<T extends { name: string; traits?: unknown; source?: string | null }>(
  rows: T[],
): T[] {
  return rows.map((row) => {
    let traits = normalizeSpeciesTraits(row.traits)
    let next = { ...withModifierRefs(row), traits } as T & { modifierRefs: string[]; traits: Trait[] }

    if (isSrdSource(row.source)) {
      if (!speciesHasChoiceTraits(traits)) {
        const seed = bundledSpeciesByName.get(row.name)
        if (seed) {
          const seedTraits = normalizeSpeciesTraits(seed.traits)
          if (speciesHasChoiceTraits(seedTraits)) {
            traits = seedTraits
            next = { ...next, traits } as typeof next
          }
        }
      }

      const enriched = enrichSrdSpeciesRow(next as unknown as Record<string, unknown>)
      return {
        ...next,
        traits: (enriched.traits as Trait[] | undefined) ?? next.traits,
        card_image_url:
          (enriched.card_image_url as string | null | undefined) ??
          (next as { card_image_url?: string | null }).card_image_url ??
          null,
        size_options:
          (enriched.size_options as string[] | undefined) ??
          (next as { size_options?: string[] | null }).size_options ??
          null,
        linked_modifiers:
          (enriched.linked_modifiers as LinkedModifierInstance[] | undefined) ??
          (enriched.linkedModifiers as LinkedModifierInstance[] | undefined),
        linkedModifiers:
          (enriched.linkedModifiers as LinkedModifierInstance[] | undefined) ??
          (enriched.linked_modifiers as LinkedModifierInstance[] | undefined),
        modifier_refs:
          (enriched.modifier_refs as string[] | undefined) ??
          (enriched.modifierRefs as string[] | undefined) ??
          next.modifierRefs,
        modifierRefs:
          (enriched.modifierRefs as string[] | undefined) ??
          (enriched.modifier_refs as string[] | undefined) ??
          next.modifierRefs,
      } as T
    }

    const enriched = enrichCustomSpeciesRow(next as unknown as Record<string, unknown>)
    return {
      ...next,
      traits: (enriched.traits as Trait[] | undefined) ?? next.traits,
      card_image_url:
        (enriched.card_image_url as string | null | undefined) ??
        (next as { card_image_url?: string | null }).card_image_url ??
        null,
      size_options:
        (enriched.size_options as string[] | undefined) ??
        (next as { size_options?: string[] | null }).size_options ??
        null,
      linked_modifiers:
        (enriched.linked_modifiers as LinkedModifierInstance[] | undefined) ??
        (enriched.linkedModifiers as LinkedModifierInstance[] | undefined),
      linkedModifiers:
        (enriched.linkedModifiers as LinkedModifierInstance[] | undefined) ??
        (enriched.linked_modifiers as LinkedModifierInstance[] | undefined),
      modifier_refs:
        (enriched.modifier_refs as string[] | undefined) ??
        (enriched.modifierRefs as string[] | undefined) ??
        next.modifierRefs,
      modifierRefs:
        (enriched.modifierRefs as string[] | undefined) ??
        (enriched.modifier_refs as string[] | undefined) ??
        next.modifierRefs,
    } as T
  })
}
