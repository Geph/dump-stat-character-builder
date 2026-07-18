import {
  abilitySpecializationChoice,
  abilitySpecializationChoiceKey,
  parseAlternateEffectsCostRows,
  type AlternateEffectsCostRow,
} from "@/lib/import/parse-alternate-effects-table"
import {
  IMPORT_SPELL_NAME_PREFIX,
} from "@/lib/import/resolve-linked-modifier-spells"
import { readLinkedModifiers, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { CustomAbility, Spell } from "@/lib/types"

export type SpellResourceCastCost = {
  resourceKey: string
  amount: number
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function spellNameFromId(spellId: string): string | null {
  if (spellId.startsWith(IMPORT_SPELL_NAME_PREFIX)) {
    return spellId.slice(IMPORT_SPELL_NAME_PREFIX.length).trim() || null
  }
  return null
}

function resolveSpellCatalogId(
  spellIdOrName: string,
  catalogById: Map<string, Pick<Spell, "id" | "name">>,
  catalogByName: Map<string, string>,
): string | null {
  if (catalogById.has(spellIdOrName)) return spellIdOrName
  const fromPlaceholder = spellNameFromId(spellIdOrName)
  if (fromPlaceholder) {
    return catalogByName.get(normalizeName(fromPlaceholder)) ?? null
  }
  return catalogByName.get(normalizeName(spellIdOrName)) ?? null
}

function stripAlternateEffectsSpellsKnown(
  linked: LinkedModifierInstance[],
): LinkedModifierInstance[] {
  return linked
    .map((instance) => {
      const characteristics = (instance.characteristics ?? []).filter(
        (char) =>
          !(char.type === "spells_known" && /alternate\s*effects/i.test(char.label ?? "")),
      )
      if (characteristics.length === (instance.characteristics ?? []).length) return instance
      if (!characteristics.length) return null
      return { ...instance, characteristics }
    })
    .filter((instance): instance is LinkedModifierInstance => instance != null)
}

function costRowsToMap(
  rows: AlternateEffectsCostRow[],
  resourceKey: string,
  catalogByName: Map<string, string>,
  out: Map<string, SpellResourceCastCost>,
): void {
  for (const row of rows) {
    if (row.pointCost <= 0) continue
    for (const name of row.spellNames) {
      const spellId = catalogByName.get(normalizeName(name))
      if (!spellId || out.has(spellId)) continue
      out.set(spellId, { resourceKey, amount: row.pointCost })
    }
  }
}

function collectFromLinkedModifiers(
  linked: LinkedModifierInstance[] | null | undefined,
  catalogById: Map<string, Pick<Spell, "id" | "name">>,
  catalogByName: Map<string, string>,
  out: Map<string, SpellResourceCastCost>,
  defaultResourceKey: string,
): void {
  for (const instance of linked ?? []) {
    for (const char of instance.characteristics ?? []) {
      if (char.type !== "spells_known") continue
      for (const entry of char.spells ?? []) {
        if (!entry.spellId) continue
        const resolvedId = resolveSpellCatalogId(entry.spellId, catalogById, catalogByName)
        if (!resolvedId || out.has(resolvedId)) continue
        if (entry.castCost && entry.castCost.amount > 0) {
          out.set(resolvedId, {
            resourceKey: entry.castCost.resourceKey || defaultResourceKey,
            amount: entry.castCost.amount,
          })
        }
      }
    }
  }
}

/**
 * Collect per-spell class-resource cast costs from unlocked custom abilities
 * (Psion Alternate Effects, specialization replacements, talent grants, etc.).
 *
 * Falls back to re-parsing Alternate Effects tables from ability descriptions when
 * older imports stored spell names without `castCost` metadata.
 */
export function collectSpellResourceCastCosts(params: {
  customAbilities: CustomAbility[]
  featureChoicePicks?: Record<string, string[]>
  spellCatalog: Pick<Spell, "id" | "name">[]
  defaultResourceKey?: string
}): Map<string, SpellResourceCastCost> {
  const defaultResourceKey = params.defaultResourceKey ?? "psi_points"
  const featureChoicePicks = params.featureChoicePicks ?? {}
  const out = new Map<string, SpellResourceCastCost>()
  const catalogById = new Map(params.spellCatalog.map((spell) => [spell.id, spell]))
  const catalogByName = new Map(
    params.spellCatalog.map((spell) => [normalizeName(spell.name), spell.id]),
  )

  for (const ability of params.customAbilities) {
    let linked = readLinkedModifiers(ability as unknown as Record<string, unknown>)
    const specialization = abilitySpecializationChoice(ability)
    let usedSpecializationReplacement = false
    if (specialization?.options?.length) {
      const pickKey = abilitySpecializationChoiceKey(ability.id)
      const pickedName = featureChoicePicks[pickKey]?.[0]
      const picked = pickedName
        ? specialization.options.find((option) => option.name === pickedName)
        : undefined
      if (picked) {
        usedSpecializationReplacement = true
        linked = [
          ...stripAlternateEffectsSpellsKnown(linked),
          ...((picked.linkedModifiers ?? []) as LinkedModifierInstance[]),
        ]
        // Fallback: specialization option description may still hold the cost table.
        if (!(picked.linkedModifiers ?? []).some((instance) =>
          (instance.characteristics ?? []).some(
            (char) =>
              char.type === "spells_known" &&
              (char.spells ?? []).some((entry) => entry.castCost && entry.castCost.amount > 0),
          ),
        )) {
          costRowsToMap(
            parseAlternateEffectsCostRows(picked.description),
            defaultResourceKey,
            catalogByName,
            out,
          )
        }
      }
    }

    collectFromLinkedModifiers(
      linked,
      catalogById,
      catalogByName,
      out,
      defaultResourceKey,
    )

    if (!usedSpecializationReplacement) {
      const hasStructuredCosts = linked.some((instance) =>
        (instance.characteristics ?? []).some(
          (char) =>
            char.type === "spells_known" &&
            (char.spells ?? []).some((entry) => entry.castCost && entry.castCost.amount > 0),
        ),
      )
      if (!hasStructuredCosts) {
        costRowsToMap(
          parseAlternateEffectsCostRows(ability.description),
          defaultResourceKey,
          catalogByName,
          out,
        )
      }
    }
  }

  return out
}

/** Spell IDs granted via resource-cast spells_known (for merging into the combat Spells panel). */
export function collectResourceCastSpellIds(
  costs: Map<string, SpellResourceCastCost>,
): string[] {
  return [...costs.keys()]
}

export function formatResourceKeyDisplayName(resourceKey: string): string {
  return resourceKey
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
