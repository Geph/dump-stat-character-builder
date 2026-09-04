import { choiceCountMet, featureChoiceKey, resolveSubclassUnlockLevel } from "@/lib/builder/choices"
import {
  linkedModifiersForFeat,
  type FeatSelectionEntry,
} from "@/lib/builder/feat-choices"
import {
  isCatalogFeatPickId,
  resolveCatalogFeatPickCharacteristics,
  resolveCatalogFeatPickLabel,
} from "@/lib/builder/catalog-feat-options"
import { pruneConflictingMagicInitiateSpellListPicks } from "@/lib/builder/magic-initiate"
import {
  SKILL_NAMES,
  normalizeCharacteristics,
  type CharacteristicModifier,
  type DamageCharacteristic,
  type SkillsCharacteristic,
  type SpellcastingAbilityCharacteristic,
  type SpellsKnownCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"
import { findChoiceOption } from "@/lib/compendium/feature-choice-target"
import { migrateFeatureOptionPickers } from "@/lib/compendium/feature-option-choice-migration"
import { sanitizeBonusProficienciesFeature } from "@/lib/compendium/enrich-srd-class-features"
import {
  applyExpertisePresetOverride,
  parseExpertiseCountUnlocks,
} from "@/lib/import/apply-expertise-preset-override"
import {
  effectiveLinkedModifiers,
  readLinkedModifiers,
  resolveLinkedModifiers,
} from "@/lib/compendium/linked-modifiers"
import { resolveSpellcastingAbilityKey } from "@/lib/compendium/spell-slots"
import {
  inferSpellListClassNames,
  spellMatchesClassName,
} from "@/lib/compendium/investigator-spell-list"
import { dedupeSpellsByName } from "@/lib/compendium/spell-name-match"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { readModifierRefs } from "@/lib/compendium/normalize-modifier-refs"
import { mergeToolNameLists, toolNamesForPool, type ToolChoicePool } from "@/lib/compendium/tool-options"
import { SRD_TOOL_NAMES, getAllSeedToolNames } from "@/lib/compendium/srd-tools"
import { languageOptionsForPool } from "@/lib/compendium/srd-languages"
import { resolveSpeciesTraitPicks } from "@/lib/builder/species-trait-picks"
import {
  filterSpellsByAllowedSchools,
  spellSchoolsFromChoiceLabel,
} from "@/lib/builder/spell-grant-filters"
import { getSpellLimits } from "@/lib/builder/spell-limits"
import type { CustomAbility, DndClass, Feat, Feature, Spell, Species, Subclass } from "@/lib/types"

export type ModifierPlayerChoiceKind =
  | "skill"
  | "tool"
  | "language"
  | "skill_or_tool"
  | "spell_list_class"
  | "spell"
  | "spellcasting_ability"
  | "damage_type"
  | "saving_throw"
  | "equipment"

export type ModifierPlayerChoiceSlot = {
  slotKey: string
  sourceKey: string
  sourceLabel: string
  modId: string
  kind: ModifierPlayerChoiceKind
  label: string
  maxCount: number
  options?: { name: string; description?: string }[]
  spellLevel?: number
  /** When true, `spellLevel` is an inclusive max (grimoire-style), not an exact match. */
  spellLevelIsMax?: boolean
  /** Class level at which this grant unlocks (grimoire +2 tiers, etc.). */
  unlocksAtClassLevel?: number
  /** When set, only these magic schools may be chosen (Fey/Shadow Touched, etc.). */
  allowedSchools?: string[]
  spellListClassNames?: string[]
  requiresSpellListPick?: boolean
  spellListSlotKey?: string
  sharedChoiceGroup?: string
  sharedChoiceModIds?: string[]
  /** When true, the player may add custom free-text options (e.g. user-defined languages). */
  allowCustom?: boolean
  /**
   * When true, this skill choice grants Expertise on existing proficiencies, so the
   * picker must NOT hide skills already chosen elsewhere in the build.
   */
  grantsExpertise?: boolean
  /**
   * Keen Mind / Observant: the pick grants proficiency, or Expertise if the character
   * already has that skill. The picker must show already-proficient options.
   */
  expertiseIfProficient?: boolean
  /** Tool proficiency pool — drives grouped accordion UI for artisans / musical picks. */
  toolChoicePool?: ToolChoicePool | null
}

const SKILL_NAME_SET = new Set<string>(SKILL_NAMES)
const TOOL_NAME_SET = new Set<string>(getAllSeedToolNames())

export function sharedChoiceSlotKey(sourceKey: string, groupId: string): string {
  return `${sourceKey}::shared::${groupId}`
}

/** Player-chosen resistance/immunity types for a source (Elemental Adept Energy Mastery, etc.). */
export function chosenDamageTypesFromCharacteristics(
  characteristics: readonly CharacteristicModifier[] | null | undefined,
  picks: Record<string, string[]> | null | undefined,
): string[] {
  const chosen: string[] = []
  const seen = new Set<string>()
  for (const characteristic of characteristics ?? []) {
    if (characteristic.type !== "damage_resistance" && characteristic.type !== "damage_immunity") {
      continue
    }
    const damage = characteristic as DamageCharacteristic
    if ((damage.choiceCount ?? 0) <= 0) continue
    const pool = new Set(
      (damage.choiceOptions ?? []).map((name) => name.trim().toLowerCase()).filter(Boolean),
    )
    const modId = damage.id?.trim()
    for (const [key, values] of Object.entries(picks ?? {})) {
      if (!key.includes("damage_type")) continue
      if (modId && !key.includes(`${modId}::damage_type`)) continue
      for (const value of values) {
        const name = value.trim()
        if (!name) continue
        const norm = name.toLowerCase()
        if (seen.has(norm)) continue
        if (pool.size > 0 && !pool.has(norm)) continue
        seen.add(norm)
        chosen.push(name)
      }
    }
  }
  return chosen
}

export function modifierPlayerChoiceSlotKey(
  sourceKey: string,
  modId: string,
  kind: ModifierPlayerChoiceKind,
  grantIndex?: number,
): string {
  if (kind === "spell" && grantIndex !== undefined) {
    return `${sourceKey}::${modId}::spell:${grantIndex}`
  }
  return `${sourceKey}::${modId}::${kind}`
}

export function clearModifierPicksForSource(
  picks: Record<string, string[]>,
  sourceKey: string,
): Record<string, string[]> {
  const prefix = `${sourceKey}::`
  const next = { ...picks }
  let changed = false
  for (const key of Object.keys(next)) {
    if (key.startsWith(prefix)) {
      delete next[key]
      changed = true
    }
  }
  return changed ? next : picks
}

function characteristicsFromLinkedModifiers(
  catalog: ModifierCatalogEntry[],
  linked: import("@/lib/compendium/linked-modifiers").LinkedModifierInstance[] | null | undefined,
  legacyRefs: string[] | null | undefined,
): CharacteristicModifier[] {
  const instances = effectiveLinkedModifiers(linked, legacyRefs, catalog)
  const resolved = instances.length
    ? resolveLinkedModifiers(instances, catalog)
    : { characteristics: [] as CharacteristicModifier[] }
  return normalizeCharacteristics(resolved.characteristics, null)
}

export function characteristicsForFeatSelection(
  feat: Feat,
  choicePickKey: string,
  featChoicePicks: Record<string, string[]>,
  catalog: ModifierCatalogEntry[],
): CharacteristicModifier[] {
  const instances = linkedModifiersForFeat(feat, choicePickKey, featChoicePicks, catalog)
  const refs = feat.modifierRefs ?? readModifierRefs(feat as unknown as unknown as Record<string, unknown>)
  return characteristicsFromLinkedModifiers(catalog, instances, refs)
}

type SlotBuildContext = {
  classSkillList?: string[]
  classLevel?: number
  /** Skip player spell picks that duplicate classes[].spellcasting progression. */
  omitSpellChoiceGrants?: boolean
}

export function isPrimaryClassSpellcastingFeature(name: string | null | undefined): boolean {
  return /^(spellcasting|pact magic)$/i.test((name ?? "").trim())
}

export function classHasNativeSpellPicker(
  cls: Pick<DndClass, "name" | "spellcasting">,
  classLevel: number,
): boolean {
  if (!cls.spellcasting) return false
  const limits = getSpellLimits(cls.spellcasting, classLevel, cls.name)
  return limits.cantrips > 0 || limits.prepared > 0
}

/** Base choiceCount plus later-level unlocks that are active at `classLevel`. */
export function skillChoiceCountAtLevel(
  mod: Pick<SkillsCharacteristic, "choiceCount" | "choiceCountUnlocks">,
  classLevel: number | undefined,
): number {
  let count = mod.choiceCount ?? 0
  for (const unlock of mod.choiceCountUnlocks ?? []) {
    if (classLevel != null && classLevel >= unlock.unlocksAtClassLevel) {
      count += unlock.count
    }
  }
  return count
}

function slotsFromCharacteristic(
  mod: CharacteristicModifier,
  sourceKey: string,
  sourceLabel: string,
  context?: SlotBuildContext,
): ModifierPlayerChoiceSlot[] {
  const slots: ModifierPlayerChoiceSlot[] = []

  if (mod.sharedChoiceGroup && (mod.sharedChoiceCount ?? 0) > 0) {
    return slots
  }

  if (mod.type === "skills") {
    const skillMod = mod as SkillsCharacteristic
    const count = skillChoiceCountAtLevel(skillMod, context?.classLevel)
    if (count <= 0) return slots

    const classSkillList = context?.classSkillList ?? []
    const options =
      skillMod.fromClassSkillList && classSkillList.length > 0
        ? classSkillList.map((name) => ({ name }))
        : skillMod.allowAnySkill
          ? SKILL_NAMES.map((name) => ({ name }))
          : (skillMod.entries ?? []).map((entry) => ({ name: entry.skill }))

    if (options.length === 0) return slots

    slots.push({
      slotKey: modifierPlayerChoiceSlotKey(sourceKey, mod.id, "skill"),
      sourceKey,
      sourceLabel,
      modId: mod.id,
      kind: "skill",
      label: mod.label ?? `Choose ${count} skill${count === 1 ? "" : "s"}`,
      maxCount: count,
      options,
      grantsExpertise: skillMod.grantExpertise ?? false,
      expertiseIfProficient: skillMod.expertiseIfProficient ?? false,
    })
    return slots
  }

  if (mod.type === "tool_proficiencies") {
    const count = mod.choiceCount ?? 0
    if (count <= 0) return slots

    const customPool = (mod.choiceOptions ?? []).filter((name) => name.trim().length > 0)
    const allToolNames = mergeToolNameLists()
    const pool =
      customPool.length > 0
        ? customPool
        : mod.toolChoicePool
          ? toolNamesForPool(mod.toolChoicePool, allToolNames)
          : [...SRD_TOOL_NAMES]

    slots.push({
      slotKey: modifierPlayerChoiceSlotKey(sourceKey, mod.id, "tool"),
      sourceKey,
      sourceLabel,
      modId: mod.id,
      kind: "tool",
      label:
        mod.label ??
        (mod.toolChoicePool === "musical"
          ? `Choose ${count} musical instrument${count === 1 ? "" : "s"}`
          : `Choose ${count} tool${count === 1 ? "" : "s"}`),
      maxCount: count,
      options: pool.map((name) => ({ name })),
      toolChoicePool: mod.toolChoicePool ?? null,
    })
    return slots
  }

  if (mod.type === "languages") {
    const count = mod.choiceCount ?? 0
    if (count <= 0) return slots

    const options = languageOptionsForPool(mod.choicePool, mod.values)

    slots.push({
      slotKey: modifierPlayerChoiceSlotKey(sourceKey, mod.id, "language"),
      sourceKey,
      sourceLabel,
      modId: mod.id,
      kind: "language",
      label: mod.label ?? `Choose ${count} language${count === 1 ? "" : "s"}`,
      maxCount: count,
      options: options.map((name) => ({ name })),
      allowCustom: true,
    })
    return slots
  }

  if (mod.type === "saving_throws") {
    const count = mod.choiceCount ?? 0
    if (count <= 0) return slots

    const pool = (mod.choiceOptions ?? []).filter((name) => name.trim().length > 0)
    const options =
      pool.length > 0
        ? pool
        : mod.values.length > 0
          ? mod.values
          : ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"]

    slots.push({
      slotKey: modifierPlayerChoiceSlotKey(sourceKey, mod.id, "saving_throw"),
      sourceKey,
      sourceLabel,
      modId: mod.id,
      kind: "saving_throw",
      label: mod.label ?? `Choose ${count} saving throw${count === 1 ? "" : "s"}`,
      maxCount: count,
      options: options.map((name) => ({ name })),
    })
    return slots
  }

  if (mod.type === "equipment_and_magic_items" && mod.mode === "create_mundane") {
    const count = mod.choiceCount ?? 0
    const options = (mod.itemOptions ?? []).map((name) => name.trim()).filter(Boolean)
    if (count <= 0 || (options.length === 0 && mod.allowCustom !== true)) return slots

    slots.push({
      slotKey: modifierPlayerChoiceSlotKey(sourceKey, mod.id, "equipment"),
      sourceKey,
      sourceLabel,
      modId: mod.id,
      kind: "equipment",
      label: mod.label ?? `Choose ${count} linked item${count === 1 ? "" : "s"}`,
      maxCount: count,
      options: options.map((name) => ({ name })),
      allowCustom: mod.allowCustom === true,
    })
    return slots
  }

  if (mod.type === "damage_resistance" || mod.type === "damage_immunity") {
    const damageMod = mod as DamageCharacteristic
    const count = damageMod.choiceCount ?? 0
    if (count <= 0) return slots

    const pool = (damageMod.choiceOptions ?? []).filter((name) => name.trim().length > 0)
    if (pool.length === 0) return slots

    slots.push({
      slotKey: modifierPlayerChoiceSlotKey(sourceKey, mod.id, "damage_type"),
      sourceKey,
      sourceLabel,
      modId: mod.id,
      kind: "damage_type",
      label:
        damageMod.label ??
        `Choose ${count} damage type${count === 1 ? "" : "s"} for ${mod.type === "damage_resistance" ? "resistance" : "immunity"}`,
      maxCount: count,
      options: pool.map((name) => ({ name })),
    })
    return slots
  }

  if (mod.type === "spells_known") {
    const spellMod = mod as SpellsKnownCharacteristic
    const grants = spellMod.choiceGrants ?? []
    if (grants.length === 0 || context?.omitSpellChoiceGrants) return slots

    const spellListSlotKey = modifierPlayerChoiceSlotKey(sourceKey, mod.id, "spell_list_class")

    if (spellMod.playerPicksSpellList && (spellMod.spellListClassOptions?.length ?? 0) > 1) {
      slots.push({
        slotKey: spellListSlotKey,
        sourceKey,
        sourceLabel,
        modId: mod.id,
        kind: "spell_list_class",
        label: `${sourceLabel}: choose spell list`,
        maxCount: 1,
        options: spellMod.spellListClassOptions!.map((name) => ({ name })),
      })
    }

    grants.forEach((grant, index) => {
      if (grant.count <= 0) return
      if (grant.unlocksAtClassLevel != null && grant.unlocksAtClassLevel > (context?.classLevel ?? 99)) return
      const upToLevel = grant.upToLevel === true && grant.level > 0
      const allowedSchools = spellSchoolsFromChoiceLabel(spellMod.label)
      slots.push({
        slotKey: modifierPlayerChoiceSlotKey(sourceKey, mod.id, "spell", index),
        sourceKey,
        sourceLabel,
        modId: mod.id,
        kind: "spell",
        label:
          grant.level === 0
            ? `Choose ${grant.count} cantrip${grant.count === 1 ? "" : "s"}`
            : upToLevel
              ? `Choose ${grant.count} spell${grant.count === 1 ? "" : "s"} (up to level ${grant.level})`
              : `Choose ${grant.count} level-${grant.level} spell${grant.count === 1 ? "" : "s"}`,
        maxCount: grant.count,
        spellLevel: grant.level,
        spellLevelIsMax: upToLevel || undefined,
        unlocksAtClassLevel: grant.unlocksAtClassLevel,
        allowedSchools: allowedSchools.length > 0 ? allowedSchools : undefined,
        spellListClassNames:
          grant.classNames ??
          spellMod.spellListClassOptions ??
          inferSpellListClassNames(spellMod.label),
        requiresSpellListPick: spellMod.playerPicksSpellList ?? false,
        spellListSlotKey,
      })
    })
  }

  if (mod.type === "spellcasting_ability") {
    const abilityMod = mod as SpellcastingAbilityCharacteristic
    const options = abilityMod.abilityOptions ?? []
    if (options.length <= 1) return slots

    slots.push({
      slotKey: modifierPlayerChoiceSlotKey(sourceKey, mod.id, "spellcasting_ability"),
      sourceKey,
      sourceLabel,
      modId: mod.id,
      kind: "spellcasting_ability",
      label: abilityMod.label ?? "Choose spellcasting ability",
      maxCount: 1,
      options: options.map((ability) => ({
        name: ability.charAt(0).toUpperCase() + ability.slice(1),
      })),
    })
  }

  return slots
}

function sharedGroupGrantsExpertise(mods: CharacteristicModifier[], groupId: string): boolean {
  return mods.some(
    (mod) =>
      mod.sharedChoiceGroup === groupId &&
      (mod.type === "skills" || mod.type === "tool_proficiencies") &&
      mod.grantExpertise,
  )
}

function slotsFromSharedChoiceGroups(
  mods: CharacteristicModifier[],
  sourceKey: string,
  sourceLabel: string,
): ModifierPlayerChoiceSlot[] {
  const groups = new Map<string, { count: number; modIds: string[]; label?: string }>()

  for (const mod of mods) {
    if (!mod.sharedChoiceGroup || (mod.sharedChoiceCount ?? 0) <= 0) continue
    const groupId = mod.sharedChoiceGroup
    const existing = groups.get(groupId) ?? {
      count: mod.sharedChoiceCount ?? 0,
      modIds: [],
      label: mod.label,
    }
    existing.modIds.push(mod.id)
    if (mod.label) existing.label = mod.label
    groups.set(groupId, existing)
  }

  const slots: ModifierPlayerChoiceSlot[] = []
  for (const [groupId, group] of groups) {
    const count = group.count
    const grantsExpertise = sharedGroupGrantsExpertise(mods, groupId)
    slots.push({
      slotKey: sharedChoiceSlotKey(sourceKey, groupId),
      sourceKey,
      sourceLabel,
      modId: group.modIds[0] ?? groupId,
      kind: "skill_or_tool",
      label:
        group.label ??
        `Choose ${count} skill${count === 1 ? "" : "s"} or tool${count === 1 ? "" : "s"}`,
      maxCount: count,
      sharedChoiceGroup: groupId,
      sharedChoiceModIds: group.modIds,
      options: [
        ...SKILL_NAMES.map((name) => ({ name })),
        ...mergeToolNameLists().map((name) => ({ name })),
      ],
      grantsExpertise,
    })
  }

  return slots
}

function slotsFromCharacteristics(
  mods: CharacteristicModifier[],
  sourceKey: string,
  sourceLabel: string,
  context?: SlotBuildContext,
): ModifierPlayerChoiceSlot[] {
  const slots: ModifierPlayerChoiceSlot[] = []
  for (const mod of mods) {
    slots.push(...slotsFromCharacteristic(mod, sourceKey, sourceLabel, context))
  }
  slots.push(...slotsFromSharedChoiceGroups(mods, sourceKey, sourceLabel))
  return slots
}

function splitSharedChoicePicks(selected: string[]): { skills: string[]; tools: string[] } {
  const skills: string[] = []
  const tools: string[] = []
  for (const name of selected) {
    if (SKILL_NAME_SET.has(name)) skills.push(name)
    else if (TOOL_NAME_SET.has(name)) tools.push(name)
  }
  return { skills, tools }
}

function collectSlotsFromFeature(
  rawFeature: Feature,
  classId: string,
  className: string,
  featureChoicePicks: Record<string, string[]>,
  catalog: ModifierCatalogEntry[],
  context?: SlotBuildContext,
): ModifierPlayerChoiceSlot[] {
  const feature = applyExpertisePresetOverride(
    sanitizeBonusProficienciesFeature(migrateFeatureOptionPickers(rawFeature)),
  )
  const sourceKey = featureChoiceKey(classId, feature.name, feature.level)
  const sourceLabel = `${className}: ${feature.name}`
  const slots: ModifierPlayerChoiceSlot[] = []

  const baseMods = characteristicsFromLinkedModifiers(
    catalog,
    effectiveLinkedModifiers(feature.linkedModifiers, feature.modifierRefs, catalog),
    feature.modifierRefs,
  )
  slots.push(...slotsFromCharacteristics(baseMods, sourceKey, sourceLabel, context))

  if (feature.isChoice && feature.choices?.options?.length) {
    const picked = featureChoicePicks[sourceKey] ?? []
    for (const optionName of picked) {
      const option = findChoiceOption(feature.choices.options, optionName)
      if (!option) continue
      const optionMods = characteristicsFromLinkedModifiers(
        catalog,
        effectiveLinkedModifiers(option.linkedModifiers, option.modifierRefs, catalog),
        option.modifierRefs,
      )
      slots.push(...slotsFromCharacteristics(optionMods, sourceKey, sourceLabel, context))
    }
  }

  return slots
}

function isExpertiseFeatureName(name: string | null | undefined): boolean {
  return (name ?? "").trim().toLowerCase() === "expertise"
}

function expertiseUnlocksAtClassLevel(feature: Feature, classLevel: number): boolean {
  if (
    parseExpertiseCountUnlocks(feature.description ?? "").some(
      (unlock) => unlock.unlocksAtClassLevel === classLevel,
    )
  ) {
    return true
  }
  const overridden = applyExpertisePresetOverride(feature)
  for (const instance of overridden.linkedModifiers ?? []) {
    for (const mod of instance.characteristics ?? []) {
      if (mod.type !== "skills") continue
      if (
        (mod as SkillsCharacteristic).choiceCountUnlocks?.some(
          (unlock) => unlock.unlocksAtClassLevel === classLevel,
        )
      ) {
        return true
      }
    }
  }
  return false
}

/**
 * Class tables repeat Expertise at the level you get more picks (Investigator 9,
 * Bard 9, Rogue 6). That later row is a reminder — the first feature already
 * scales via choiceCountUnlocks. A second wired picker is empty or asks again.
 */
export function shouldSkipRepeatExpertiseSlots(
  feature: Feature,
  siblings: Feature[],
): boolean {
  if (!isExpertiseFeatureName(feature.name)) return false
  const level = feature.level ?? 0
  return siblings.some(
    (other) =>
      other !== feature &&
      isExpertiseFeatureName(other.name) &&
      (other.level ?? 0) < level &&
      expertiseUnlocksAtClassLevel(other, level),
  )
}

/** Spell/skill/tool picks granted by class or subclass feature choices (e.g. Divine Order). */
export function collectClassFeatureModifierPlayerChoiceSlots(params: {
  classLevels: { classId: string; level: number }[]
  classes: DndClass[]
  subclasses: Subclass[]
  subclassByClassId: Record<string, string>
  featureChoicePicks: Record<string, string[]>
  catalog: ModifierCatalogEntry[]
}): ModifierPlayerChoiceSlot[] {
  const { classLevels, classes, subclasses, subclassByClassId, featureChoicePicks, catalog } =
    params
  const slots: ModifierPlayerChoiceSlot[] = []

  for (const entry of classLevels) {
    const cls = classes.find((candidate) => candidate.id === entry.classId)
    if (!cls) continue

    const omitNativeSpellChoices = classHasNativeSpellPicker(cls, entry.level)
    const context: SlotBuildContext = {
      classSkillList: cls.skill_choices?.options ?? [],
      classLevel: entry.level,
    }

    const classFeatures = cls.features ?? []
    for (const feature of classFeatures) {
      if (feature.level > entry.level) continue
      if (shouldSkipRepeatExpertiseSlots(feature, classFeatures)) continue
      slots.push(
        ...collectSlotsFromFeature(
          feature,
          entry.classId,
          cls.name,
          featureChoicePicks,
          catalog,
          {
            ...context,
            omitSpellChoiceGrants:
              omitNativeSpellChoices && isPrimaryClassSpellcastingFeature(feature.name),
          },
        ),
      )
    }

    const subclassId = subclassByClassId[entry.classId]
    if (subclassId && entry.level >= resolveSubclassUnlockLevel(cls)) {
      const subclass = subclasses.find((candidate) => candidate.id === subclassId)
      if (!subclass) continue
      const subclassFeatures = subclass.features ?? []
      for (const feature of subclassFeatures) {
        if (feature.level > entry.level) continue
        if (shouldSkipRepeatExpertiseSlots(feature, subclassFeatures)) continue
        slots.push(
          ...collectSlotsFromFeature(
            feature,
            entry.classId,
            `${cls.name} (${subclass.name})`,
            featureChoicePicks,
            catalog,
            {
              ...context,
              omitSpellChoiceGrants:
                omitNativeSpellChoices && isPrimaryClassSpellcastingFeature(feature.name),
            },
          ),
        )
      }
    }
  }

  return slots
}

export function speciesModsSourceKey(speciesId: string): string {
  return `species:${speciesId}:mods`
}

export function speciesTraitSourceKey(speciesId: string, traitIndex: number): string {
  return `species:${speciesId}:trait:${traitIndex}`
}

/** Skill/tool/language/spell picks granted by a species (species-wide or per trait). */
export function collectSpeciesModifierPlayerChoiceSlots(
  species: Species | null | undefined,
  speciesTraitPicks: Record<string, string[]>,
  catalog: ModifierCatalogEntry[],
  characterLevel?: number,
): ModifierPlayerChoiceSlot[] {
  if (!species) return []
  const slots: ModifierPlayerChoiceSlot[] = []
  const context = characterLevel != null ? { classLevel: characterLevel } : undefined

  const speciesRow = species as unknown as unknown as Record<string, unknown>
  const speciesWide = characteristicsFromLinkedModifiers(
    catalog,
    readLinkedModifiers(speciesRow, catalog),
    readModifierRefs(speciesRow),
  )
  slots.push(
    ...slotsFromCharacteristics(
      speciesWide,
      speciesModsSourceKey(species.id),
      species.name,
      context,
    ),
  )

  species.traits?.forEach((trait, index) => {
    const sourceKey = speciesTraitSourceKey(species.id, index)
    const baseMods = characteristicsFromLinkedModifiers(
      catalog,
      effectiveLinkedModifiers(trait.linkedModifiers, trait.modifierRefs, catalog),
      trait.modifierRefs,
    )
    slots.push(...slotsFromCharacteristics(baseMods, sourceKey, trait.name, context))

    if (trait.isChoice && trait.choices?.options?.length) {
      const picked = resolveSpeciesTraitPicks(speciesTraitPicks, trait, index)
      for (const optionName of picked) {
        const option = trait.choices.options.find((entry) => entry.name === optionName)
        if (!option) continue
        const optionMods = characteristicsFromLinkedModifiers(
          catalog,
          effectiveLinkedModifiers(option.linkedModifiers, option.modifierRefs, catalog),
          option.modifierRefs,
        )
        slots.push(...slotsFromCharacteristics(optionMods, sourceKey, trait.name, context))
      }
    }
  })

  return dedupeModifierPlayerChoiceSlots(slots)
}

/** Tool/language picks granted by a background feature (wired from proficiency choice phrases). */
export function collectBackgroundModifierPlayerChoiceSlots(
  background: import("@/lib/types").Background | null | undefined,
  catalog: ModifierCatalogEntry[],
): ModifierPlayerChoiceSlot[] {
  if (!background?.feature || !background.id) return []
  const mods = characteristicsFromLinkedModifiers(
    catalog,
    effectiveLinkedModifiers(
      background.feature.linkedModifiers,
      background.feature.modifierRefs,
      catalog,
    ),
    background.feature.modifierRefs,
  )
  return slotsFromCharacteristics(
    mods,
    `background:${background.id}:feature`,
    background.name,
  )
}

export function collectModifierPlayerChoiceSlots(params: {
  featEntries: FeatSelectionEntry[]
  feats: Feat[]
  featChoicePicks: Record<string, string[]>
  catalog: ModifierCatalogEntry[]
  customAbilities?: CustomAbility[]
  classLevels?: { classId: string; level: number }[]
  classes?: DndClass[]
  subclasses?: Subclass[]
  subclassByClassId?: Record<string, string>
  featureChoicePicks?: Record<string, string[]>
  species?: Species | null
  speciesTraitPicks?: Record<string, string[]>
  background?: import("@/lib/types").Background | null
}): ModifierPlayerChoiceSlot[] {
  const {
    featEntries,
    feats,
    featChoicePicks,
    catalog,
    customAbilities = [],
    classLevels = [],
    classes = [],
    subclasses = [],
    subclassByClassId = {},
    featureChoicePicks = {},
    species = null,
    speciesTraitPicks = {},
    background = null,
  } = params
  const slots: ModifierPlayerChoiceSlot[] = []

  for (const entry of featEntries) {
    const feat = feats.find((candidate) => candidate.id === entry.featId)
    if (feat) {
      const characteristics = characteristicsForFeatSelection(
        feat,
        entry.choicePickKey,
        featChoicePicks,
        catalog,
      )
      slots.push(...slotsFromCharacteristics(characteristics, entry.choicePickKey, feat.name))
      continue
    }

    if (isCatalogFeatPickId(entry.featId) && customAbilities.length > 0) {
      const label = resolveCatalogFeatPickLabel(entry.featId, customAbilities) ?? "Catalog option"
      const characteristics = resolveCatalogFeatPickCharacteristics(
        entry.featId,
        customAbilities,
        catalog,
      )
      slots.push(...slotsFromCharacteristics(characteristics, entry.choicePickKey, label))
    }
  }

  if (classLevels.length > 0) {
    slots.push(
      ...collectClassFeatureModifierPlayerChoiceSlots({
        classLevels,
        classes,
        subclasses,
        subclassByClassId,
        featureChoicePicks,
        catalog,
      }),
    )
  }

  if (species) {
    const characterLevel = classLevels.reduce((sum, entry) => sum + entry.level, 0)
    slots.push(
      ...collectSpeciesModifierPlayerChoiceSlots(
        species,
        speciesTraitPicks,
        catalog,
        characterLevel > 0 ? characterLevel : undefined,
      ),
    )
  }

  if (background) {
    slots.push(...collectBackgroundModifierPlayerChoiceSlots(background, catalog))
  }

  return dedupeModifierPlayerChoiceSlots(slots)
}

export function applyModifierPlayerPicks(
  mods: CharacteristicModifier[],
  sourceKey: string,
  picks: Record<string, string[]>,
): CharacteristicModifier[] {
  const sharedGroups = new Map<string, CharacteristicModifier[]>()
  for (const mod of mods) {
    if (!mod.sharedChoiceGroup) continue
    const list = sharedGroups.get(mod.sharedChoiceGroup) ?? []
    list.push(mod)
    sharedGroups.set(mod.sharedChoiceGroup, list)
  }

  let result = mods.map((mod) => ({ ...mod }))

  for (const [groupId, groupMods] of sharedGroups) {
    const selected = picks[sharedChoiceSlotKey(sourceKey, groupId)] ?? []
    if (selected.length === 0) continue
    const { skills, tools } = splitSharedChoicePicks(selected)

    result = result.map((mod) => {
      if (mod.sharedChoiceGroup !== groupId) return mod
      if (mod.type === "skills") {
        return {
          ...mod,
          entries: skills.map((skill) => ({ skill, expertise: false })),
          choiceCount: 0,
        }
      }
      if (mod.type === "tool_proficiencies") {
        return { ...mod, values: tools, choiceCount: 0 }
      }
      return mod
    })
  }

  const picked = result.map((mod) => {
    if (mod.sharedChoiceGroup) return mod

    if (mod.type === "skills") {
      const skillMod = mod as SkillsCharacteristic
      const count = skillMod.choiceCount ?? 0
      if (count <= 0) return mod

      const key = modifierPlayerChoiceSlotKey(sourceKey, mod.id, "skill")
      const selected = picks[key] ?? []
      if (selected.length === 0) return mod

      const entries = selected.map((skill) => {
        const poolEntry = skillMod.entries?.find((entry) => entry.skill === skill)
        return (
          poolEntry ?? {
            skill,
            expertise: skillMod.grantExpertise ?? false,
          }
        )
      })
      return { ...skillMod, entries, choiceCount: 0 }
    }

    if (mod.type === "tool_proficiencies") {
      const count = mod.choiceCount ?? 0
      if (count <= 0) return mod

      const key = modifierPlayerChoiceSlotKey(sourceKey, mod.id, "tool")
      const selected = picks[key] ?? []
      if (selected.length === 0) return mod
      return { ...mod, values: selected }
    }

    if (mod.type === "languages") {
      const count = mod.choiceCount ?? 0
      if (count <= 0) return mod

      const key = modifierPlayerChoiceSlotKey(sourceKey, mod.id, "language")
      const selected = picks[key] ?? []
      if (selected.length === 0) return mod
      // Fixed languages (e.g. Common) are granted alongside the player's picks.
      const merged = [...new Set([...mod.values, ...selected])]
      return { ...mod, values: merged, choiceCount: 0 }
    }

    if (mod.type === "saving_throws") {
      const count = mod.choiceCount ?? 0
      if (count <= 0) return mod

      const key = modifierPlayerChoiceSlotKey(sourceKey, mod.id, "saving_throw")
      const selected = picks[key] ?? []
      if (selected.length === 0) return mod
      return { ...mod, values: selected, choiceCount: 0 }
    }

    if (mod.type === "damage_resistance" || mod.type === "damage_immunity") {
      const damageMod = mod as DamageCharacteristic
      const count = damageMod.choiceCount ?? 0
      if (count <= 0) return mod

      const key = modifierPlayerChoiceSlotKey(sourceKey, mod.id, "damage_type")
      const selected = picks[key] ?? []
      if (selected.length === 0) return mod
      const merged = [...new Set([...damageMod.damageTypes, ...selected])]
      return { ...damageMod, damageTypes: merged, choiceCount: 0 }
    }

    if (mod.type === "spells_known") {
      const spellMod = mod as SpellsKnownCharacteristic
      const grants = spellMod.choiceGrants ?? []
      if (grants.length === 0) return mod

      const pickedSpells = [...spellMod.spells]
      for (let index = 0; index < grants.length; index++) {
        const grant = grants[index]
        const key = modifierPlayerChoiceSlotKey(sourceKey, mod.id, "spell", index)
        const selected = picks[key] ?? []
        for (const spellId of selected) {
          if (!spellId) continue
          pickedSpells.push({
            spellId,
            prepared:
              grant.alwaysPrepared ?? spellMod.alwaysPrepared ?? (grant.level > 0 ? true : undefined),
            alwaysPrepared: grant.alwaysPrepared ?? spellMod.alwaysPrepared,
            freeCastPerLongRest: grant.freeCastPerLongRest,
          })
        }
      }

      return { ...spellMod, spells: pickedSpells }
    }

    if (mod.type === "spellcasting_ability") {
      const abilityMod = mod as SpellcastingAbilityCharacteristic
      const options = abilityMod.abilityOptions ?? []
      if (options.length <= 1) return mod

      const key = modifierPlayerChoiceSlotKey(sourceKey, mod.id, "spellcasting_ability")
      const selected = picks[key]?.[0]
      if (!selected) return mod
      const ability = resolveSpellcastingAbilityKey(selected)
      if (!ability) return mod
      return { ...abilityMod, ability }
    }

    return mod
  })

  return applyChosenCastingAbilityToSpells(picked)
}

/**
 * A source that lets the player choose a casting ability (Elven Lineage cantrips, Scion of
 * the Outer Planes) casts its granted spells with that ability, so spell grants from the
 * same source inherit it unless they name one explicitly.
 */
function applyChosenCastingAbilityToSpells(
  mods: CharacteristicModifier[],
): CharacteristicModifier[] {
  const chosen = mods.find(
    (mod): mod is SpellcastingAbilityCharacteristic =>
      mod.type === "spellcasting_ability" && (mod.abilityOptions?.length ?? 0) > 1,
  )
  if (!chosen) return mods

  return mods.map((mod) => {
    if (mod.type !== "spells_known") return mod
    const spellMod = mod as SpellsKnownCharacteristic
    if (spellMod.castingAbility) return mod
    return { ...spellMod, castingAbility: chosen.ability }
  })
}

export function spellOptionsForModifierSlot(
  slot: ModifierPlayerChoiceSlot,
  spells: Spell[],
  picks: Record<string, string[]>,
): Spell[] {
  if (slot.kind !== "spell" || slot.spellLevel === undefined) return []

  let classNames = slot.spellListClassNames ?? []
  if (slot.requiresSpellListPick && slot.spellListSlotKey) {
    const pickedClass = picks[slot.spellListSlotKey]?.[0]
    if (!pickedClass) return []
    classNames = [pickedClass]
  }

  // Spells already chosen in other spell-grant slots can't be picked again.
  const ownPicks = picks[slot.slotKey] ?? []
  const otherSlotSpellIds = new Set<string>()
  for (const [key, ids] of Object.entries(picks)) {
    if (key === slot.slotKey) continue
    if (!key.includes("::spell:")) continue
    for (const id of ids) otherSlotSpellIds.add(id)
  }

  const classSet = new Set(classNames.map((name) => name.toLowerCase()))
  const maxLevel = slot.spellLevel
  return filterSpellsByAllowedSchools(
    dedupeSpellsByName(
      spells.filter((spell) => {
        if (slot.spellLevelIsMax) {
          // Grimoire-style: any leveled spell up to the Ritual Level cap (no cantrips).
          if (spell.level < 1 || spell.level > maxLevel!) return false
        } else if (spell.level !== maxLevel) {
          return false
        }
        if (otherSlotSpellIds.has(spell.id) && !ownPicks.includes(spell.id)) return false
        if (classSet.size === 0) return true
        return classNames.some((className) => spellMatchesClassName(spell, className))
      }),
    ),
    slot.allowedSchools,
  )
}

export function isSpellRelatedModifierSlot(slot: ModifierPlayerChoiceSlot): boolean {
  return slot.kind === "spell" || slot.kind === "spell_list_class"
}

/**
 * Slots to render for one level-up `modifier_choice` step.
 * Bundles Magic Initiate-style grants that unlock together (same unlock level /
 * both unset), but keeps grimoire tiers on separate screens so catch-up picks
 * do not all stack in one panel.
 */
export function modifierPlayerChoiceSlotsForLevelUpStep(
  current: ModifierPlayerChoiceSlot,
  allStepsSlots: ModifierPlayerChoiceSlot[],
): ModifierPlayerChoiceSlot[] {
  const sameUnlock = (slot: ModifierPlayerChoiceSlot) =>
    (slot.unlocksAtClassLevel ?? null) === (current.unlocksAtClassLevel ?? null)

  const bundled = allStepsSlots.filter((slot) => {
    if (slot.sourceKey !== current.sourceKey) return false
    if (slot.slotKey === current.slotKey) return true
    if (slot.kind === "spell_list_class" && current.spellListSlotKey === slot.slotKey) {
      return true
    }
    if (slot.kind === "spellcasting_ability" && slot.modId === current.modId) {
      return true
    }
    if (slot.kind === "spell" && current.kind === "spell" && slot.modId === current.modId) {
      return sameUnlock(slot)
    }
    return false
  })

  if (bundled.some((slot) => slot.slotKey === current.slotKey)) return bundled
  return [current, ...bundled.filter((slot) => slot.slotKey !== current.slotKey)]
}

export function spellModifierPlayerChoiceSlots(
  slots: ModifierPlayerChoiceSlot[],
): ModifierPlayerChoiceSlot[] {
  return slots.filter(isSpellRelatedModifierSlot)
}

export function nonSpellModifierPlayerChoiceSlots(
  slots: ModifierPlayerChoiceSlot[],
): ModifierPlayerChoiceSlot[] {
  return slots.filter((slot) => !isSpellRelatedModifierSlot(slot))
}

export function dedupeModifierPlayerChoiceSlots(
  slots: ModifierPlayerChoiceSlot[],
): ModifierPlayerChoiceSlot[] {
  const seen = new Map<string, number>()
  const deduped: ModifierPlayerChoiceSlot[] = []
  for (const slot of slots) {
    const optionKey =
      slot.kind === "spellcasting_ability"
        ? (slot.options ?? [])
            .map((option) => option.name.trim().toLowerCase())
            .sort()
            .join("|")
        : slot.label
    const key = `${slot.sourceKey}\0${slot.kind}\0${optionKey}\0${slot.maxCount}`
    const existingIndex = seen.get(key)
    if (existingIndex != null) {
      // Prefer the later slot for casting-ability picks (option presets over trait prose detect).
      if (slot.kind === "spellcasting_ability") {
        deduped[existingIndex] = slot
      }
      continue
    }
    seen.set(key, deduped.length)
    deduped.push(slot)
  }
  return deduped
}

export function collectModifierPlayerChoiceBlockers(
  slots: ModifierPlayerChoiceSlot[],
  picks: Record<string, string[]>,
): string[] {
  const blockers: string[] = []
  for (const slot of slots) {
    const selected = picks[slot.slotKey] ?? []
    if (!choiceCountMet(selected, slot.maxCount)) {
      const stepHint = isSpellRelatedModifierSlot(slot) ? " (Spells step)" : ""
      blockers.push(
        `${slot.sourceLabel}: ${slot.label} (${selected.length}/${slot.maxCount})${stepHint}.`,
      )
    }

    if (slot.kind === "spell" && slot.requiresSpellListPick && slot.spellListSlotKey) {
      const listPick = picks[slot.spellListSlotKey]?.[0]
      if (!listPick) {
        blockers.push(`${slot.sourceLabel}: choose a spell list before selecting spells.`)
      }
    }
  }
  return blockers
}

export function validateModifierPlayerChoices(
  slots: ModifierPlayerChoiceSlot[],
  picks: Record<string, string[]>,
): boolean {
  return collectModifierPlayerChoiceBlockers(slots, picks).length === 0
}

function slotKindSuffix(kind: ModifierPlayerChoiceKind): string {
  return `::${kind}`
}

/**
 * Keep picks for current slots. When a slot key changed (mod id / trait index moved),
 * remap orphaned picks onto the matching empty slot instead of dropping them — this is
 * what made Elf languages / lineage ability picks look "reset" on character edit.
 */
export function reconcileModifierPlayerPicks(
  picks: Record<string, string[]>,
  slots: ModifierPlayerChoiceSlot[],
): Record<string, string[]> {
  const validKeys = new Set(slots.map((slot) => slot.slotKey))
  const next: Record<string, string[]> = {}
  const orphans: [string, string[]][] = []

  for (const [key, value] of Object.entries(picks)) {
    if (!Array.isArray(value) || !value.length) continue
    if (validKeys.has(key)) next[key] = value
    else orphans.push([key, value])
  }

  if (!orphans.length) {
    // Still drop empty / invalid keys when nothing to remap.
    if (Object.keys(next).length === Object.keys(picks).length) {
      let identical = true
      for (const key of Object.keys(picks)) {
        if (!validKeys.has(key)) {
          identical = false
          break
        }
      }
      if (identical) return picks
    }
    return next
  }

  const takeOrphan = (predicate: (key: string, value: string[]) => boolean): string[] | null => {
    const index = orphans.findIndex(([key, value]) => predicate(key, value))
    if (index < 0) return null
    const [, value] = orphans[index]!
    orphans.splice(index, 1)
    return value
  }

  for (const slot of slots) {
    if ((next[slot.slotKey] ?? []).length) continue
    const kindSuffix = slotKindSuffix(slot.kind)
    const speciesMatch = slot.sourceKey.match(/^species:([^:]+)/)
    const speciesId = speciesMatch?.[1] ?? null

    const remapped =
      takeOrphan(
        (key) =>
          key.startsWith(`${slot.sourceKey}::`) &&
          (key.endsWith(kindSuffix) || key.includes(`${kindSuffix}:`)),
      ) ??
      (speciesId
        ? takeOrphan(
            (key) =>
              key.startsWith(`species:${speciesId}:`) &&
              (key.endsWith(kindSuffix) || key.includes(`${kindSuffix}:`)),
          )
        : null) ??
      (slot.kind === "language" &&
      slots.filter((candidate) => candidate.kind === "language").length === 1
        ? takeOrphan((key) => key.endsWith("::language") || key.includes("::language:"))
        : null)

    if (remapped?.length) next[slot.slotKey] = remapped
  }

  return next
}

export function setModifierPlayerPickValue(
  picks: Record<string, string[]>,
  slot: ModifierPlayerChoiceSlot,
  allSlots: ModifierPlayerChoiceSlot[],
  selected: string[],
): Record<string, string[]> {
  const next = { ...picks, [slot.slotKey]: selected }

  if (slot.kind === "spell_list_class") {
    for (const candidate of allSlots) {
      if (
        candidate.sourceKey === slot.sourceKey &&
        candidate.modId === slot.modId &&
        candidate.kind === "spell"
      ) {
        delete next[candidate.slotKey]
      }
    }
  }

  return pruneConflictingMagicInitiateSpellListPicks(allSlots, next)
}

export function modifierPlayerChoiceSlotsForSource(
  slots: ModifierPlayerChoiceSlot[],
  sourceKey: string,
): ModifierPlayerChoiceSlot[] {
  return slots.filter((slot) => slot.sourceKey === sourceKey)
}

/** Spell-grant picks from class/subclass features (Mystic Arcanum, Contact Patron, etc.). */
export function classFeatureSpellGrantSlots(
  slots: ModifierPlayerChoiceSlot[],
  classLevels: { classId: string; level: number }[],
  classes: DndClass[],
  subclasses: Subclass[],
  subclassByClassId: Record<string, string>,
): ModifierPlayerChoiceSlot[] {
  const activeSourceKeys = new Set<string>()

  for (const entry of classLevels) {
    const cls = classes.find((row) => row.id === entry.classId)
    if (!cls) continue
    for (const feature of cls.features ?? []) {
      if (feature.level <= entry.level) {
        activeSourceKeys.add(featureChoiceKey(entry.classId, feature.name, feature.level))
      }
    }
    const subclassId = subclassByClassId[entry.classId]
    if (subclassId && entry.level >= resolveSubclassUnlockLevel(cls)) {
      const subclass = subclasses.find((row) => row.id === subclassId)
      for (const feature of subclass?.features ?? []) {
        if (feature.level <= entry.level) {
          activeSourceKeys.add(featureChoiceKey(entry.classId, feature.name, feature.level))
        }
      }
    }
  }

  return slots.filter((slot) => slot.kind === "spell" && activeSourceKeys.has(slot.sourceKey))
}

export function isSkillOrToolOptionName(name: string): boolean {
  return SKILL_NAME_SET.has(name) || TOOL_NAME_SET.has(name)
}

/** Limit proficiency-grant pickers to options the character does not already have. */
export function optionsForProficiencyGrantSlot(
  slot: ModifierPlayerChoiceSlot,
  params: {
    proficientSkills: string[]
    proficientTools?: string[]
    /** Languages already known from any source (species, background, features, etc.). */
    knownLanguages?: string[]
    currentSelection?: string[]
  },
): { name: string; description?: string }[] {
  if (slot.grantsExpertise || slot.expertiseIfProficient) return slot.options ?? []

  const {
    proficientSkills,
    proficientTools = [],
    knownLanguages = [],
    currentSelection = [],
  } = params

  if (slot.kind === "language") {
    const knownSet = new Set(knownLanguages.map((name) => name.trim().toLowerCase()).filter(Boolean))
    const keepSelected = new Set(
      currentSelection.map((name) => name.trim().toLowerCase()).filter(Boolean),
    )
    return (slot.options ?? []).filter((option) => {
      const key = option.name.trim().toLowerCase()
      if (keepSelected.has(key)) return true
      return !knownSet.has(key)
    })
  }

  const proficientSkillSet = new Set(
    proficientSkills.map((name) => name.trim().toLowerCase()).filter(Boolean),
  )
  const proficientToolSet = new Set(
    proficientTools.map((name) => name.trim().toLowerCase()).filter(Boolean),
  )
  const keepSelected = new Set(
    currentSelection.map((name) => name.trim().toLowerCase()).filter(Boolean),
  )

  const baseOptions =
    slot.options ??
    (slot.kind === "skill_or_tool"
      ? [
          ...SKILL_NAMES.map((name) => ({ name })),
          ...mergeToolNameLists().map((name) => ({ name })),
        ]
      : slot.kind === "tool"
        ? mergeToolNameLists().map((name) => ({ name }))
        : SKILL_NAMES.map((name) => ({ name })))

  return baseOptions.filter((option) => {
    const key = option.name.trim().toLowerCase()
    if (keepSelected.has(key)) return true
    if (SKILL_NAME_SET.has(option.name)) {
      return !proficientSkillSet.has(key)
    }
    if (slot.kind === "tool" || slot.kind === "skill_or_tool" || TOOL_NAME_SET.has(option.name)) {
      return !proficientToolSet.has(key)
    }
    return true
  })
}

/** Limit Expertise pickers to proficiencies the character already has. */
export function optionsForExpertiseSlot(
  slot: ModifierPlayerChoiceSlot,
  params: {
    proficientSkills: string[]
    proficientTools?: string[]
    existingExpertiseSkills?: string[]
    currentSelection?: string[]
  },
): { name: string; description?: string }[] {
  if (!slot.grantsExpertise) return slot.options ?? []

  const {
    proficientSkills,
    proficientTools = [],
    existingExpertiseSkills = [],
    currentSelection = [],
  } = params

  const proficientSkillSet = new Set(proficientSkills)
  const proficientToolSet = new Set(proficientTools)
  const alreadyExpert = new Set(
    existingExpertiseSkills.filter((skill) => !currentSelection.includes(skill)),
  )

  const baseOptions =
    slot.kind === "skill_or_tool"
      ? slot.options?.length
        ? slot.options
        : [
            ...SKILL_NAMES.map((name) => ({ name })),
            ...mergeToolNameLists().map((name) => ({ name })),
          ]
      : slot.options?.length
        ? slot.options
        : SKILL_NAMES.map((name) => ({ name }))

  return baseOptions.filter((option) => {
    if (SKILL_NAME_SET.has(option.name)) {
      return proficientSkillSet.has(option.name) && !alreadyExpert.has(option.name)
    }
    if (TOOL_NAME_SET.has(option.name)) {
      return proficientToolSet.has(option.name)
    }
    return false
  })
}
