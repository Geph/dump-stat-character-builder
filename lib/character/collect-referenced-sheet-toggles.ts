import { requiredToggleFromResourceMenu } from "@/lib/character/resource-die-use"
import { characteristicsFromLinkedModifiers } from "@/lib/compendium/builder-modifier-refs"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { expandLegacyLimitations, type LimitationSource } from "@/lib/compendium/modifier-limitations"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { readLinkedModifiers } from "@/lib/compendium/linked-modifiers"
import {
  danceStyleToggleIdForName,
  defaultDancerDanceStyleToggleIds,
  isDanceStyleChoiceFeature,
  isSubclassDanceStyleFeature,
} from "@/lib/character/dancer-dance-styles"
import {
  getSheetToggleDefinition,
  sheetToggleIdActivatedByAction,
  type SheetToggleDefinition,
} from "@/lib/compendium/sheet-toggle-registry"
import { weaponSpellBuffToggleForActionName } from "@/lib/character/weapon-spell-buff"
import type { CustomAbility, Feat, Feature, Species, UsesConfig } from "@/lib/types"
import type { MagicItemPower } from "@/lib/character/magic-item-powers"

function collectFromModifier(
  mod: CharacteristicModifier,
  ids: Set<string>,
  featureName?: string | null,
) {
  for (const limitation of expandLegacyLimitations(mod as LimitationSource)) {
    if (limitation.kind === "sheet_toggle" && limitation.rule === "requires_active") {
      ids.add(limitation.value)
    }
  }

  if ("requiresSheetToggle" in mod && mod.requiresSheetToggle) {
    ids.add(mod.requiresSheetToggle)
  }

  if (mod.type === "attack_roll_modifiers") {
    for (const entry of mod.entries ?? []) {
      for (const limitation of (entry as LimitationSource).limitations ?? []) {
        if (limitation.kind === "sheet_toggle" && limitation.rule === "requires_active") {
          ids.add(limitation.value)
        }
      }
    }
  }

  if (mod.type === "resource_ability_menu") {
    for (const option of mod.options ?? []) {
      const toggle = requiredToggleFromResourceMenu(mod, option, featureName)
      if (toggle) ids.add(toggle)
    }
  }
}

function collectFromCharacteristics(
  mods: CharacteristicModifier[],
  ids: Set<string>,
  featureName?: string | null,
) {
  for (const mod of mods) {
    collectFromModifier(mod, ids, featureName)
  }
}

function classResourceKeyFromRow(row: Record<string, unknown>): string | null {
  const uses = row.limitedUses as UsesConfig | null | undefined
  if (uses && typeof uses === "object" && typeof uses.classResourceKey === "string") {
    return uses.classResourceKey
  }
  return null
}

function collectFromFeatureLike(
  row: Record<string, unknown> | Feature | Feat | null | undefined,
  catalog: ModifierCatalogEntry[],
  ids: Set<string>,
) {
  if (!row) return
  const record = row as Record<string, unknown>
  const name = typeof record.name === "string" ? record.name : ""
  const activated = sheetToggleIdActivatedByAction({
    name,
    classResourceKey: classResourceKeyFromRow(record),
  })
  if (activated) ids.add(activated)
  if (isDanceStyleChoiceFeature({ name, choices: record.choices as Feature["choices"] })) {
    for (const id of defaultDancerDanceStyleToggleIds()) ids.add(id)
  }
  if (isSubclassDanceStyleFeature({ name })) {
    const styleId = danceStyleToggleIdForName(name)
    if (styleId) ids.add(styleId)
  }
  const linked = readLinkedModifiers(row as Parameters<typeof readLinkedModifiers>[0], catalog)
  collectFromCharacteristics(
    characteristicsFromLinkedModifiers(catalog, linked, null),
    ids,
    name,
  )
  for (const instance of linked) {
    for (const effect of instance.activation?.effects ?? []) {
      for (const limitation of expandLegacyLimitations(effect)) {
        if (limitation.kind === "sheet_toggle" && limitation.rule === "requires_active") {
          ids.add(limitation.value)
        }
      }
    }
  }
}

/** Toggle ids referenced by this character's modifiers (class features, gear, etc.). */
export function collectReferencedSheetToggleIds(params: {
  features: Feature[]
  feats: Feat[]
  originFeat?: Feat | null
  species?: Species | null
  customAbilities?: CustomAbility[]
  magicItemPowers?: MagicItemPower[]
  /** Prepared spells / owned items that activate a toggle by name (Magic Weapon, …). */
  extraActionNames?: readonly string[]
  catalog: ModifierCatalogEntry[]
}): Set<string> {
  const ids = new Set<string>()

  for (const feature of params.features) {
    collectFromFeatureLike(feature, params.catalog, ids)
  }
  for (const feat of params.feats) {
    collectFromFeatureLike(feat, params.catalog, ids)
  }
  collectFromFeatureLike(params.originFeat ?? null, params.catalog, ids)

  for (const trait of params.species?.traits ?? []) {
    collectFromFeatureLike(trait as unknown as unknown as Record<string, unknown>, params.catalog, ids)
  }

  for (const ability of params.customAbilities ?? []) {
    collectFromFeatureLike(ability as unknown as unknown as Record<string, unknown>, params.catalog, ids)
  }

  for (const power of params.magicItemPowers ?? []) {
    if (power.toggleId) ids.add(power.toggleId)
    collectFromCharacteristics(power.characteristics ?? [], ids)
  }

  for (const name of params.extraActionNames ?? []) {
    const activated = sheetToggleIdActivatedByAction({ name })
    if (activated) ids.add(activated)
    const weaponBuff = weaponSpellBuffToggleForActionName(name)
    if (weaponBuff) ids.add(weaponBuff)
  }

  return ids
}

/** Build sheet toggle definitions for only toggles this character can use. */
export function buildCharacterSheetToggleDefinitions(
  referencedIds: ReadonlySet<string>,
  dynamic: SheetToggleDefinition[],
): SheetToggleDefinition[] {
  const merged: SheetToggleDefinition[] = []
  const seen = new Set<string>()

  const add = (def: SheetToggleDefinition | null | undefined) => {
    if (!def || seen.has(def.id)) return
    seen.add(def.id)
    merged.push(def)
  }

  for (const id of referencedIds) {
    add(getSheetToggleDefinition(id))
  }

  for (const entry of dynamic) {
    add(entry)
  }

  return merged
}
