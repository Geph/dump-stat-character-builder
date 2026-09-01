import {
  chosenOptionNames,
  resolveChoicePickLabel,
} from "@/lib/character/chosen-option-label"
import { resolveChoiceOptionDescription } from "@/lib/compendium/choice-option-description"
import { resolveSpeciesTraitPicks } from "@/lib/builder/species-trait-picks"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import {
  formatAsiAllocationSummary,
  getCombinedMilestoneAsiAllocation,
  getAsiPointsUsed,
  isAsiFeat,
  type AsiAllocation,
  type AsiAllocationsByFeatId,
} from "@/lib/builder/asi-allocation"
import { featChoicePickKey, grantedFeatChoicePickKey } from "@/lib/builder/feat-choices"
import { chosenDamageTypesFromCharacteristics } from "@/lib/builder/modifier-player-choices"
import {
  resolveMagicInitiateSpellList,
  specializeMagicInitiateDescription,
  spellcastingAbilityFromMagicInitiatePicks,
} from "@/lib/builder/magic-initiate"
import { parseBackgroundOriginFeat } from "@/lib/compendium/background-origin-feat"
import { isSubclassFeatureGrant, isSubclassUnlockFeature } from "@/lib/builder/subclass-unlock"
import { collectAsiPoolsFromFeat } from "@/lib/character/feat-asi-pools"
import { featureShowsOnSheetTab } from "@/lib/compendium/feature-sheet-display"
import {
  collectReplacedFeatureNames,
  featureIsReplaced,
} from "@/lib/character/replace-feature"
import type { Feat, Feature, Trait } from "@/lib/types"

export type FeatureTabItem = {
  id: string
  name: string
  level?: number | null
  levels?: number[]
  description?: string | null
  chosenNames: string[]
  classId?: string
  feature?: Feature
  collapsedLines?: number
}

export type FeatureTabSection = {
  id: string
  title: string
  items: FeatureTabItem[]
}

/** True when a background row has a narrative feature worth listing on Features. */
export function backgroundFeatureShowsOnFeaturesTab(
  feature: { name?: string | null; description?: string | null } | null | undefined,
): boolean {
  if (!feature) return false
  const name = feature.name?.trim() ?? ""
  if (!name) return false
  const description = feature.description?.trim() ?? ""
  // Synthetic shell from proficiency-choice wiring — not a real feature.
  if (/^background\s+proficiencies$/i.test(name) && !description) return false
  return Boolean(description) || !/^background\s+proficiencies$/i.test(name)
}

/** Class ASI / Feat / Epic Boon milestones — listed under Feats & Boons instead. */
function isFeatMilestoneClassFeature(feature: Pick<Feature, "name">): boolean {
  return /ability\s*score\s*improvement|feat\s*or\s*asi|^asi$|^feat$|^epic\s*boon$|^general\s*feat$/i.test(
    feature.name.trim(),
  )
}

function featureHasGrantFeatModifier(feature: Feature): boolean {
  return (feature.linkedModifiers ?? []).some((instance) => {
    if (/grant_feat/i.test(instance.catalogRefId ?? "")) return true
    return (instance.characteristics ?? []).some((char) => char.type === "grant_feat")
  })
}

/**
 * Class features that are only pick shells — feats live under Feats & Boons, and
 * subclass selection is shown as its own subclass section (or builder pick).
 */
export function classFeatureRedundantOnFeaturesTab(feature: Feature): boolean {
  if (isSubclassUnlockFeature(feature)) return true
  if (isSubclassFeatureGrant(feature)) return true
  if (isFeatMilestoneClassFeature(feature)) return true
  if (featureHasGrantFeatModifier(feature)) return true
  return false
}

function classFeatureShowsOnFeaturesTab(feature: Feature): boolean {
  return featureShowsOnSheetTab(feature) && !classFeatureRedundantOnFeaturesTab(feature)
}

function featDamageTypeChosenNames(
  feat: Feat,
  modifierPlayerPicks: Record<string, string[]> | null | undefined,
): string[] {
  return chosenDamageTypesFromCharacteristics(
    (feat.linkedModifiers ?? []).flatMap((instance) => instance.characteristics ?? []),
    modifierPlayerPicks,
  )
}

/** ASI / half-feat score picks to show beside the feat name on the Features tab. */
export function featAsiChosenSummary(
  feat: Feat,
  allocations: AsiAllocationsByFeatId | null | undefined,
  options?: {
    featIds?: string[]
    feats?: Feat[]
    featureChoicePicks?: Record<string, string[]>
  },
): string {
  const map = allocations ?? {}
  const merged: AsiAllocation = {}

  const merge = (allocation: AsiAllocation | undefined) => {
    if (!allocation) return
    for (const [ability, bonus] of Object.entries(allocation)) {
      if (typeof bonus !== "number" || bonus <= 0) continue
      merged[ability as keyof AsiAllocation] =
        (merged[ability as keyof AsiAllocation] ?? 0) + bonus
    }
  }

  if (isAsiFeat(feat)) {
    const combined = getCombinedMilestoneAsiAllocation(
      map,
      options?.featIds ?? [feat.id],
      options?.feats ?? [feat],
    )
    if (getAsiPointsUsed(combined) > 0) {
      merge(combined)
    } else {
      for (const [key, allocation] of Object.entries(map)) {
        if (
          key.includes(feat.id) ||
          /ability\s*score\s*improvement/i.test(key) ||
          /^feat_slot_/i.test(key)
        ) {
          merge(allocation)
        }
      }
    }
  } else {
    merge(map[feat.id])
    for (const [key, allocation] of Object.entries(map)) {
      if (key === feat.id) continue
      if (key.includes(feat.id)) merge(allocation)
    }
    for (const [slotKey, picks] of Object.entries(options?.featureChoicePicks ?? {})) {
      if (!picks.includes(feat.id)) continue
      for (const grant of collectAsiPoolsFromFeat(feat, featChoicePickKey(slotKey))) {
        merge(map[grant.allocationKey])
      }
    }
  }

  if (getAsiPointsUsed(merged) <= 0) return ""
  return formatAsiAllocationSummary(merged)
}

function dedupeFeaturesByName(features: Feature[]): { feature: Feature; levels: number[] }[] {
  const byName = new Map<string, { feature: Feature; levels: number[] }>()
  const order: string[] = []
  for (const feature of features) {
    const existing = byName.get(feature.name)
    if (existing) {
      if (!existing.levels.includes(feature.level)) existing.levels.push(feature.level)
    } else {
      byName.set(feature.name, { feature, levels: [feature.level] })
      order.push(feature.name)
    }
  }
  for (const entry of byName.values()) entry.levels.sort((a, b) => a - b)
  return order.map((name) => byName.get(name)!)
}

function stripHtmlToPlain(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function normalizeChoiceName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s*\[[^\]]+\]\s*$/, "")
    .replace(/\s+/g, " ")
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** True when the parent is only a short "choose / pick / select" prompt. */
export function isGenericChoicePrompt(text: string | null | undefined): boolean {
  const plain = stripHtmlToPlain(text ?? "")
  if (!plain) return true
  if (plain.length > 120) return false
  return /^(choose|pick|select)\b/i.test(plain)
}

function descriptionAlreadyPresent(parent: string, optionText: string): boolean {
  const parentPlain = stripHtmlToPlain(parent).toLowerCase()
  const optionPlain = stripHtmlToPlain(optionText).toLowerCase()
  if (!parentPlain || !optionPlain) return false
  const needle = optionPlain.length > 48 ? optionPlain.slice(0, 48) : optionPlain
  return parentPlain.includes(needle)
}

function formatChosenOptionBlock(name: string, description: string): string {
  const trimmed = description.trim()
  const plain = stripHtmlToPlain(trimmed)
  if (plain.toLowerCase().startsWith(name.trim().toLowerCase())) return trimmed
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return `<p><strong>${escapeHtmlText(name)}.</strong></p>${trimmed}`
  }
  return `<p><strong>${escapeHtmlText(name)}.</strong> ${trimmed}</p>`
}

export type ChoiceDescriptionSource = {
  name?: string | null
  description?: string | null
  ability_role?: string | null
  linkedModifiers?: import("@/lib/compendium/linked-modifiers").LinkedModifierInstance[] | null
  linked_modifiers?: import("@/lib/compendium/linked-modifiers").LinkedModifierInstance[] | null
}

export type ChoiceDescriptionEntry = {
  description: string
  role?: string | null
}

export type ChoiceDescriptionLookup = Record<string, ChoiceDescriptionEntry[]>

function preferredRolesForChoice(item: {
  choices?: {
    optionsSource?: string | null
    category?: string | null
    resourceKey?: string | null
  } | null
}): string[] {
  const source = item.choices?.optionsSource ?? ""
  const category = item.choices?.category ?? ""
  const resourceKey = item.choices?.resourceKey ?? ""
  if (/dance style/i.test(category) || resourceKey === "dance_styles_known") {
    return ["upgrade"]
  }
  if (source === "class_upgrades") return ["upgrade", "weapon_mastery"]
  if (source === "class_knacks") return ["knack"]
  if (source === "class_bomb_formulas") return ["bomb_formula", "alchemist_bomb"]
  if (source === "class_discoveries") return ["discovery"]
  if (source === "class_talents" || source === "known_discipline_talents") {
    return ["class_talent", "talent_pool"]
  }
  return []
}

/** Name → candidate rules texts for picks that live on custom abilities / feats. */
export function buildChoiceDescriptionLookup(
  sources: ChoiceDescriptionSource[] | null | undefined,
): ChoiceDescriptionLookup {
  const lookup: ChoiceDescriptionLookup = {}
  for (const source of sources ?? []) {
    const name = source.name?.trim()
    if (!name) continue
    const description = resolveChoiceOptionDescription(
      {
        name,
        description: source.description,
        linkedModifiers: source.linkedModifiers ?? source.linked_modifiers,
      },
      null,
    ).trim()
    if (!description) continue
    const entry: ChoiceDescriptionEntry = {
      description,
      role: source.ability_role ?? null,
    }
    const keys = new Set([normalizeChoiceName(name), name.trim().toLowerCase()])
    for (const key of keys) {
      if (!key) continue
      const list = lookup[key] ?? []
      if (list.some((existing) => existing.description === description && existing.role === entry.role)) {
        continue
      }
      list.push(entry)
      lookup[key] = list
    }
  }
  return lookup
}

export function lookupChoiceDescription(
  name: string,
  lookup: ChoiceDescriptionLookup | Record<string, string> | null | undefined,
  preferredRoles: string[] = [],
): string {
  if (!lookup) return ""
  const raw = lookup[name.trim().toLowerCase()] ?? lookup[normalizeChoiceName(name)]
  if (!raw) return ""
  if (typeof raw === "string") return raw.trim()
  if (preferredRoles.length) {
    for (const role of preferredRoles) {
      const match = raw.find((entry) => entry.role === role)
      if (match?.description.trim()) return match.description.trim()
    }
    const unroled = raw.find((entry) => !entry.role?.trim() && entry.description.trim())
    return unroled?.description.trim() ?? ""
  }
  return raw[0]?.description.trim() ?? ""
}

type ChoiceDescriptionItem = {
  description?: string | null
  choices?: {
    optionsSource?: string | null
    category?: string | null
    resourceKey?: string | null
    options?: {
      name: string
      description?: string | null
      linkedModifiers?: import("@/lib/compendium/linked-modifiers").LinkedModifierInstance[] | null
    }[] | null
  } | null
}

function resolveChosenOptionDescription(
  name: string,
  item: ChoiceDescriptionItem,
  lookup?: ChoiceDescriptionLookup | Record<string, string> | null,
): string {
  const needle = normalizeChoiceName(name)
  const inline = (item.choices?.options ?? []).find(
    (option) => normalizeChoiceName(option.name) === needle,
  )
  if (inline) {
    const fromOption = resolveChoiceOptionDescription(inline, item.description).trim()
    if (fromOption) return fromOption
  }
  return lookupChoiceDescription(name, lookup, preferredRolesForChoice(item))
}

/**
 * Feature-card body for a picked choice: keep real picker rules, and always include
 * what the selected option does (inline choices or custom-ability / feat lookup).
 */
export function selectedChoiceDescription(
  item: ChoiceDescriptionItem,
  chosenNames: string[],
  lookup?: ChoiceDescriptionLookup | Record<string, string> | null,
): string | null | undefined {
  if (!chosenNames.length) return item.description
  const blocks: string[] = []
  for (const name of chosenNames) {
    const trimmed = name.trim()
    if (!trimmed) continue
    const description = resolveChosenOptionDescription(trimmed, item, lookup)
    if (!description) continue
    blocks.push(formatChosenOptionBlock(trimmed, description))
  }
  if (!blocks.length) return item.description

  const parent = item.description?.trim() ?? ""
  const uniqueBlocks = parent
    ? blocks.filter((block) => !descriptionAlreadyPresent(parent, block))
    : blocks
  if (!uniqueBlocks.length) return item.description
  if (!parent || isGenericChoicePrompt(parent)) return uniqueBlocks.join("\n\n")
  return `${parent}\n\n${uniqueBlocks.join("\n\n")}`
}

export function buildFeatureTabSections(params: {
  classDetails: CharacterClassDetail[]
  species?: { name: string; traits?: Trait[] | null } | null
  backgroundFeature?: {
    name: string
    description?: string | null
    choices?: { options?: { name: string; description?: string | null }[] | null } | null
  } | null
  originFeat?: Feat | null
  originFeatFallbackName?: string | null
  originFeatFallbackDescription?: string | null
  feats: Feat[]
  featureChoicePicks: Record<string, string[]>
  speciesTraitPicks?: Record<string, string[]>
  asiAllocations?: AsiAllocationsByFeatId | null
  /** All selected feat ids (including ASI slots) for combined milestone ASI. */
  featIds?: string[]
  /** Feat / catalog pick id → display name for Fighting Style chrome, etc. */
  choiceLabelByPickId?: Record<string, string> | null
  /** Spell-list / ability picks for Magic Initiate chrome and specialized prose. */
  modifierPlayerPicks?: Record<string, string[]> | null
  /** Chosen option name → rules text (custom abilities, feats) when choices.options is empty. */
  choiceDescriptionByName?: ChoiceDescriptionLookup | Record<string, string> | null
}): FeatureTabSection[] {
  const sections: FeatureTabSection[] = []
  const picks = params.featureChoicePicks
  const choiceLabelByPickId = params.choiceLabelByPickId
  const choiceDescriptionByName = params.choiceDescriptionByName

  for (const entry of params.classDetails) {
    const classUnlocked = ((entry.class?.features as Feature[] | undefined) ?? []).filter(
      (feature) => feature.level <= entry.row.level,
    )
    const replacedClassNames = collectReplacedFeatureNames(classUnlocked, entry.row.level)
    const classFeatures = classUnlocked.filter(
      (feature) =>
        classFeatureShowsOnFeaturesTab(feature) && !featureIsReplaced(feature, replacedClassNames),
    )
    if (!classFeatures.length) continue
    const sectionId = `class:${entry.row.class_id}`
    sections.push({
      id: sectionId,
      title: `${entry.class?.name ?? "Class"} Features${params.classDetails.length > 1 ? ` (Level ${entry.row.level})` : ""}`,
      items: dedupeFeaturesByName(classFeatures).map(({ feature, levels }) => {
        const chosenNames = chosenOptionNames(feature, entry.row.class_id, picks, {
          labelByPickId: choiceLabelByPickId,
        })
        return {
          id: `${sectionId}:${feature.name}`,
          name: feature.name,
          level: feature.level,
          levels: levels.length > 1 ? levels : undefined,
          description: selectedChoiceDescription(feature, chosenNames, choiceDescriptionByName),
          chosenNames,
          classId: entry.row.class_id,
          feature,
        }
      }),
    })
  }

  for (const entry of params.classDetails) {
    const classUnlocked = ((entry.class?.features as Feature[] | undefined) ?? []).filter(
      (feature) => feature.level <= entry.row.level,
    )
    const subclassUnlocked = ((entry.subclass?.features as Feature[] | undefined) ?? []).filter(
      (feature) => feature.level <= entry.row.level,
    )
    const replacedSubclassNames = collectReplacedFeatureNames(
      [...classUnlocked, ...subclassUnlocked],
      entry.row.level,
    )
    const subclassFeatures = subclassUnlocked.filter(
      (feature) =>
        featureShowsOnSheetTab(feature) && !featureIsReplaced(feature, replacedSubclassNames),
    )
    if (!subclassFeatures.length || !entry.subclass) continue
    const sectionId = `subclass:${entry.row.class_id}`
    sections.push({
      id: sectionId,
      title: `${entry.subclass.name} Features`,
      items: subclassFeatures.map((feature) => {
        const chosenNames = chosenOptionNames(feature, entry.row.class_id, picks, {
          labelByPickId: choiceLabelByPickId,
        })
        return {
          id: `${sectionId}:${feature.name}:${feature.level}`,
          name: feature.name,
          level: feature.level,
          description: selectedChoiceDescription(feature, chosenNames, choiceDescriptionByName),
          chosenNames,
          classId: entry.row.class_id,
          feature,
        }
      }),
    })
  }

  if (params.species?.traits?.length) {
    const sectionId = "species"
    sections.push({
      id: sectionId,
      title: `${params.species.name} Traits`,
      items: params.species.traits.map((trait, index) => {
        const speciesPicks = resolveSpeciesTraitPicks(
          params.speciesTraitPicks ?? {},
          trait,
          index,
        )
        const chosenNames = (
          speciesPicks.length
            ? speciesPicks.map((pick) => resolveChoicePickLabel(pick, choiceLabelByPickId))
            : chosenOptionNames(trait, null, picks, {
                labelByPickId: choiceLabelByPickId,
              })
        ).filter(Boolean)
        return {
          id: `${sectionId}:${trait.name}`,
          name: trait.name,
          description: selectedChoiceDescription(trait, chosenNames, choiceDescriptionByName),
          chosenNames,
        }
      }),
    })
  }

  if (backgroundFeatureShowsOnFeaturesTab(params.backgroundFeature)) {
    const sectionId = "background"
    const backgroundFeature = params.backgroundFeature!
    const chosenNames = chosenOptionNames(backgroundFeature, null, picks, {
      labelByPickId: choiceLabelByPickId,
    })
    sections.push({
      id: sectionId,
      title: "Background Feature",
      items: [
        {
          id: `${sectionId}:feature`,
          name: backgroundFeature.name,
          description: selectedChoiceDescription(backgroundFeature, chosenNames, choiceDescriptionByName),
          chosenNames,
        },
      ],
    })
  }

  const featItems: FeatureTabItem[] = []
  const modifierPlayerPicks = params.modifierPlayerPicks ?? {}
  if (params.originFeat || params.originFeatFallbackName) {
    const parsedFallback = parseBackgroundOriginFeat(params.originFeatFallbackName)
    const featName = params.originFeat?.name ?? parsedFallback?.featName ?? params.originFeatFallbackName ?? "Origin Feat"
    const chosenNames = params.originFeat
      ? chosenOptionNames(params.originFeat, null, picks, { labelByPickId: choiceLabelByPickId })
      : []
    const spellList = resolveMagicInitiateSpellList({
      featName,
      isOriginFeat: true,
      featGranted: params.originFeatFallbackName,
      originFeatId: params.originFeat?.id ?? null,
      picks: modifierPlayerPicks,
      featureChoicePicks: picks,
    })
    const ability = spellcastingAbilityFromMagicInitiatePicks(
      modifierPlayerPicks,
      params.originFeat?.id ? grantedFeatChoicePickKey(params.originFeat.id) : null,
    )
    const description = specializeMagicInitiateDescription(
      params.originFeat
        ? selectedChoiceDescription(params.originFeat, chosenNames, choiceDescriptionByName)
        : params.originFeatFallbackDescription ?? "Granted by your background at 1st level.",
      { spellList, spellcastingAbility: ability },
    )
    const originDamageTypes = params.originFeat
      ? featDamageTypeChosenNames(params.originFeat, modifierPlayerPicks)
      : []
    const originChosen = [
      ...(spellList && !chosenNames.includes(spellList) ? [...chosenNames, spellList] : chosenNames),
      ...originDamageTypes.filter((type) => !chosenNames.includes(type) && type !== spellList),
    ]
    featItems.push({
      id: "feat:origin",
      name: featName,
      description,
      chosenNames: originChosen,
      collapsedLines: 4,
    })
  }
  for (const feat of params.feats) {
    const choiceNames = chosenOptionNames(feat, null, picks, { labelByPickId: choiceLabelByPickId })
    const asiSummary = featAsiChosenSummary(feat, params.asiAllocations, {
      featIds: params.featIds,
      feats: params.feats,
      featureChoicePicks: picks,
    })
    const spellList = resolveMagicInitiateSpellList({
      featName: feat.name,
      featId: feat.id,
      picks: modifierPlayerPicks,
      featureChoicePicks: picks,
    })
    const ability = spellcastingAbilityFromMagicInitiatePicks(modifierPlayerPicks)
    const description = specializeMagicInitiateDescription(
      selectedChoiceDescription(feat, choiceNames, choiceDescriptionByName),
      { spellList, spellcastingAbility: spellList ? ability : null },
    )
    const withList =
      spellList && !choiceNames.includes(spellList) ? [...choiceNames, spellList] : choiceNames
    const damageTypes = featDamageTypeChosenNames(feat, modifierPlayerPicks).filter(
      (type) => !withList.includes(type),
    )
    featItems.push({
      id: `feat:${feat.id}`,
      name: feat.name,
      description,
      chosenNames: [
        ...withList,
        ...damageTypes,
        ...(asiSummary ? [asiSummary] : []),
      ],
      collapsedLines: 4,
    })
  }
  if (featItems.length) {
    sections.push({ id: "feats", title: "Feats & Boons", items: featItems })
  }

  return sections
}

export function featureTabNavLabel(title: string): string {
  return title
    .replace(/ Features(?: \(Level \d+\))?$/i, "")
    .replace(/ Traits$/i, "")
    .replace(/ Feature$/i, "")
    .replace(/^Feats & Boons$/i, "Feats")
}
