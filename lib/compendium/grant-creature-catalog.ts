import {
  createModifierId,
  type CreaturePickOnRest,
  type GrantCreatureCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"
import { resolveTierCountAtLevel } from "@/lib/compendium/resolve-uses-config"
import type { UsesAtLevel } from "@/lib/types"
import {
  effectiveLinkedModifiers,
  resolveLinkedModifierInstance,
  type LinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { catalogEntryById } from "@/lib/compendium/modifier-catalog"
import type { Feature } from "@/lib/types"
import type { CustomAbility } from "@/lib/types"

/** Catalog entry for granting Creatures & Companions by name. */
export const GRANT_CREATURE_CATALOG_ID = "cat_char_grant_creature"

export function grantCreatureCharacteristic(
  creatureNames: string[],
  options?: {
    count?: number
    countByLevel?: UsesAtLevel[]
    combinedCrByLevel?: UsesAtLevel[]
    choiceOptions?: string[]
    pickOnRest?: CreaturePickOnRest
    pickerTitle?: string
    polymorph?: boolean
  },
): GrantCreatureCharacteristic {
  return {
    id: createModifierId(),
    type: "grant_creature",
    creatureNames: [...creatureNames],
    ...(options?.choiceOptions?.length ? { choiceOptions: [...options.choiceOptions] } : {}),
    ...(options?.count != null ? { count: options.count } : {}),
    ...(options?.countByLevel?.length ? { countByLevel: [...options.countByLevel] } : {}),
    ...(options?.combinedCrByLevel?.length ? { combinedCrByLevel: [...options.combinedCrByLevel] } : {}),
    ...(options?.pickOnRest ? { pickOnRest: options.pickOnRest } : {}),
    ...(options?.pickerTitle?.trim() ? { pickerTitle: options.pickerTitle.trim() } : {}),
    ...(options?.polymorph ? { polymorph: true } : {}),
  }
}

export function grantCreatureCountAtLevel(
  grant: { count?: number; countByLevel?: UsesAtLevel[] },
  classLevel: number,
): number {
  if (grant.countByLevel?.length) {
    const resolved = resolveTierCountAtLevel(grant.countByLevel, classLevel)
    if (resolved > 0) return resolved
  }
  return grant.count ?? 1
}

/** Combined CR cap at a class level (`count` is the CR number, e.g. 0.25). */
export function grantCreatureCombinedCrAtLevel(
  grant: { combinedCrByLevel?: UsesAtLevel[] },
  classLevel: number,
): number | null {
  if (!grant.combinedCrByLevel?.length) return null
  const resolved = resolveTierCountAtLevel(grant.combinedCrByLevel, classLevel)
  return resolved > 0 ? resolved : null
}

export type ResolvedGrantCreature = {
  catalogEntryId: string
  label: string
  /** Names granted / offered. */
  creatureNames: string[]
  choiceOptions?: string[]
  count: number
  countByLevel?: UsesAtLevel[]
  combinedCrByLevel?: UsesAtLevel[]
  pickOnRest?: CreaturePickOnRest
  pickerTitle?: string
  polymorph?: boolean
}

function creatureNamesFromMod(mod: GrantCreatureCharacteristic): string[] {
  if (mod.choiceOptions?.length) return [...mod.choiceOptions]
  return mod.creatureNames?.length ? [...mod.creatureNames] : []
}

export function grantCreaturesFromLinkedModifiers(
  catalog: ModifierCatalogEntry[],
  instances: LinkedModifierInstance[] | null | undefined,
  legacyRefs?: string[] | null,
): ResolvedGrantCreature[] {
  const linked = effectiveLinkedModifiers(instances, legacyRefs, catalog)
  if (!linked.length) return []
  const grants: ResolvedGrantCreature[] = []

  for (const instance of linked) {
    const entry = catalogEntryById(catalog, instance.catalogRefId)
    const { characteristics } = resolveLinkedModifierInstance(instance, catalog)
    for (const mod of characteristics) {
      if (mod.type !== "grant_creature") continue
      const names = creatureNamesFromMod(mod)
      if (!names.length) continue
      grants.push({
        catalogEntryId: instance.catalogRefId,
        label: entry?.name ?? "Grant Creature / Companion",
        creatureNames: names,
        choiceOptions: mod.choiceOptions?.length ? [...mod.choiceOptions] : undefined,
        count: mod.count ?? (mod.choiceOptions?.length ? 1 : names.length),
        countByLevel: mod.countByLevel?.length ? [...mod.countByLevel] : undefined,
        combinedCrByLevel: mod.combinedCrByLevel?.length ? [...mod.combinedCrByLevel] : undefined,
        pickOnRest: mod.pickOnRest,
        pickerTitle: mod.pickerTitle?.trim() || undefined,
        polymorph: mod.polymorph || undefined,
      })
    }
  }

  return grants
}

/** Collect creature names granted by a feature's linked grant_creature modifiers. */
export function creatureNamesFromFeature(
  feature: Feature,
  catalog: ModifierCatalogEntry[] = [],
): string[] {
  const fromField = feature.companion_creature_names ?? []
  const fromMods = grantCreaturesFromLinkedModifiers(
    catalog,
    feature.linkedModifiers,
    feature.modifierRefs,
  ).flatMap((grant) => grant.creatureNames)
  return [...new Set([...fromField, ...fromMods].map((n) => n.trim()).filter(Boolean))]
}

/** Collect creature names granted by a custom ability. */
export function creatureNamesFromAbility(
  ability: CustomAbility,
  catalog: ModifierCatalogEntry[] = [],
): string[] {
  const row = ability as CustomAbility & {
    companion_creature_names?: string[] | null
    linked_modifiers?: LinkedModifierInstance[] | null
    linkedModifiers?: LinkedModifierInstance[] | null
    modifierRefs?: string[] | null
  }
  const fromField = row.companion_creature_names ?? []
  const instances = row.linked_modifiers ?? row.linkedModifiers
  const fromMods = grantCreaturesFromLinkedModifiers(
    catalog,
    instances,
    row.modifierRefs,
  ).flatMap((grant) => grant.creatureNames)
  return [...new Set([...fromField, ...fromMods].map((n) => n.trim()).filter(Boolean))]
}

/** Collect creature names granted by a spell's summon / grant_creature modifiers. */
export function creatureNamesFromSpell(
  spell: {
    companion_creature_names?: string[] | null
    linkedModifiers?: LinkedModifierInstance[] | null
    linked_modifiers?: LinkedModifierInstance[] | null
    modifierRefs?: string[] | null
  },
  catalog: ModifierCatalogEntry[] = [],
): string[] {
  const fromField = spell.companion_creature_names ?? []
  const instances = spell.linkedModifiers ?? spell.linked_modifiers
  const fromMods = grantCreaturesFromLinkedModifiers(
    catalog,
    instances,
    spell.modifierRefs,
  ).flatMap((grant) => grant.creatureNames)
  return [...new Set([...fromField, ...fromMods].map((n) => n.trim()).filter(Boolean))]
}

/** Resolved grant_creature rows from a spell (preserves choice metadata). */
export function grantCreaturesFromSpell(
  spell: {
    companion_creature_names?: string[] | null
    linkedModifiers?: LinkedModifierInstance[] | null
    linked_modifiers?: LinkedModifierInstance[] | null
    modifierRefs?: string[] | null
  },
  catalog: ModifierCatalogEntry[] = [],
): ResolvedGrantCreature[] {
  const fromMods = grantCreaturesFromLinkedModifiers(
    catalog,
    spell.linkedModifiers ?? spell.linked_modifiers,
    spell.modifierRefs,
  )
  const fromField = (spell.companion_creature_names ?? [])
    .map((n) => n.trim())
    .filter(Boolean)
  if (!fromField.length) return fromMods
  return [
    ...fromMods,
    {
      catalogEntryId: GRANT_CREATURE_CATALOG_ID,
      label: "Grant Creature / Companion",
      creatureNames: fromField,
      count: fromField.length,
    },
  ]
}
