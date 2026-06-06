import type { FeatureChoice, Trait } from "@/lib/types"
import bundledSpecies from "@/lib/srd/seed-data/species.json"
import { isSrdSource } from "@/lib/srd/source"

function normalizeChoice(raw: unknown, fallbackCategory: string): FeatureChoice | undefined {
  if (!raw || typeof raw !== "object") return undefined

  const choice = raw as Record<string, unknown>
  const options = Array.isArray(choice.options)
    ? choice.options
        .filter((option): option is Record<string, unknown> => !!option && typeof option === "object")
        .map((option) => ({
          name: String(option.name ?? "").trim(),
          description: String(option.description ?? "").trim(),
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

/** Normalize stored species rows and fill missing choice traits from bundled SRD seed. */
export function enrichSpeciesList<T extends { name: string; traits?: unknown; source?: string | null }>(
  rows: T[],
): T[] {
  return rows.map((row) => {
    const traits = normalizeSpeciesTraits(row.traits)
    if (speciesHasChoiceTraits(traits)) {
      return { ...row, traits }
    }

    if (!isSrdSource(row.source)) {
      return { ...row, traits }
    }

    const seed = bundledSpeciesByName.get(row.name)
    if (!seed) {
      return { ...row, traits }
    }

    const seedTraits = normalizeSpeciesTraits(seed.traits)
    if (speciesHasChoiceTraits(seedTraits)) {
      return { ...row, traits: seedTraits }
    }

    return { ...row, traits }
  })
}
