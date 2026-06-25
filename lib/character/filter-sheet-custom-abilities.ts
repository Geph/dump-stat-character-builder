import { isCommonModifiersCatalogEntry } from "@/lib/compendium/modifier-catalog"
import {
  ELDRITCH_INVOCATIONS_CATALOG_ID,
  METAMAGIC_OPTIONS_CATALOG_ID,
} from "@/lib/compendium/system-option-catalogs"
import type { CustomAbility } from "@/lib/types"

export type CharacterSheetAbilityContext = {
  classIds: string[]
  classNames: string[]
  subclassIds: string[]
  subclassNames: string[]
  speciesId: string | null
  speciesName: string | null
  backgroundId: string | null
  backgroundName: string | null
  featIds: string[]
  featNames: string[]
  equipmentIds: string[]
  equipmentCategories: string[]
  spellIds: string[]
}

/** System option catalogs keyed to a class name fragment (case-insensitive). */
const SYSTEM_CATALOG_CLASS_NAME: Record<string, string> = {
  [METAMAGIC_OPTIONS_CATALOG_ID]: "sorcerer",
  [ELDRITCH_INVOCATIONS_CATALOG_ID]: "warlock",
}

type AbilityImportMeta = CustomAbility & {
  source_type?: string | null
  source_name?: string | null
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

function nameMatches(candidates: string[], target: string): boolean {
  const needle = normalizeName(target)
  if (!needle) return false
  return candidates.some((candidate) => {
    const hay = normalizeName(candidate)
    return hay === needle || hay.includes(needle) || needle.includes(hay)
  })
}

function hasClassName(ctx: CharacterSheetAbilityContext, classFragment: string): boolean {
  return nameMatches(ctx.classNames, classFragment)
}

function matchesImportSource(ability: AbilityImportMeta, ctx: CharacterSheetAbilityContext): boolean {
  const sourceType = ability.source_type?.trim()
  const sourceName = ability.source_name?.trim()
  if (!sourceType || !sourceName) return true

  switch (sourceType) {
    case "class":
      return nameMatches(ctx.classNames, sourceName)
    case "subclass":
      return nameMatches(ctx.subclassNames, sourceName)
    case "species":
      return (
        (ctx.speciesId != null && ctx.speciesId === sourceName) ||
        nameMatches(ctx.speciesName ? [ctx.speciesName] : [], sourceName)
      )
    case "background":
      return (
        (ctx.backgroundId != null && ctx.backgroundId === sourceName) ||
        nameMatches(ctx.backgroundName ? [ctx.backgroundName] : [], sourceName)
      )
    case "feat":
      return ctx.featIds.includes(sourceName) || nameMatches(ctx.featNames, sourceName)
    case "item":
      return ctx.equipmentIds.includes(sourceName) || nameMatches(ctx.equipmentCategories, sourceName)
    default:
      return true
  }
}

function matchesAttachment(
  attachType: string,
  attachId: string,
  ctx: CharacterSheetAbilityContext,
): boolean {
  switch (attachType) {
    case "class":
      return ctx.classIds.includes(attachId)
    case "species":
      return ctx.speciesId === attachId
    case "background":
      return ctx.backgroundId === attachId
    case "feat":
      return ctx.featIds.includes(attachId)
    case "equipment":
      return (
        ctx.equipmentIds.includes(attachId) ||
        ctx.equipmentCategories.some((category) => normalizeName(category) === normalizeName(attachId))
      )
    case "spell":
      return ctx.spellIds.includes(attachId)
    case "ability":
      return true
    default:
      return false
  }
}

export function customAbilityAppliesOnCharacterSheet(
  ability: CustomAbility,
  ctx: CharacterSheetAbilityContext,
): boolean {
  if (isCommonModifiersCatalogEntry(ability)) return false

  const catalogClass = SYSTEM_CATALOG_CLASS_NAME[ability.id]
  if (catalogClass) {
    return hasClassName(ctx, catalogClass)
  }

  if (ability.is_system) return false

  const attachType = ability.attached_to_type?.trim()
  const attachId = ability.attached_to_id?.trim()

  if (!attachType || !attachId) {
    return matchesImportSource(ability as AbilityImportMeta, ctx)
  }

  return matchesAttachment(attachType, attachId, ctx)
}

export function filterCustomAbilitiesForCharacterSheet(
  abilities: CustomAbility[],
  ctx: CharacterSheetAbilityContext,
): CustomAbility[] {
  return abilities.filter((ability) => customAbilityAppliesOnCharacterSheet(ability, ctx))
}
