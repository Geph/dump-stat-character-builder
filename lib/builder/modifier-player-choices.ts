import { choiceCountMet, featureChoiceKey, SUBCLASS_LEVEL } from "@/lib/builder/choices"
import {
  linkedModifiersForFeat,
  type FeatSelectionEntry,
} from "@/lib/builder/feat-choices"
import {
  isCatalogFeatPickId,
  resolveCatalogFeatPickCharacteristics,
  resolveCatalogFeatPickLabel,
} from "@/lib/builder/catalog-feat-options"
import {
  SKILL_NAMES,
  normalizeCharacteristics,
  type CharacteristicModifier,
  type DamageCharacteristic,
  type SkillsCharacteristic,
  type SpellcastingAbilityCharacteristic,
  type SpellsKnownCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"
import { migrateFeatureOptionPickers } from "@/lib/compendium/feature-option-choice-migration"
import {
  effectiveLinkedModifiers,
  readLinkedModifiers,
  resolveLinkedModifiers,
} from "@/lib/compendium/linked-modifiers"
import { resolveSpellcastingAbilityKey } from "@/lib/compendium/spell-slots"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { readModifierRefs } from "@/lib/compendium/normalize-modifier-refs"
import { SRD_TOOL_NAMES } from "@/lib/compendium/srd-tool-names"
import { languageOptionsForPool } from "@/lib/compendium/srd-languages"
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
}

const SKILL_NAME_SET = new Set<string>(SKILL_NAMES)
const TOOL_NAME_SET = new Set<string>(SRD_TOOL_NAMES)

export function sharedChoiceSlotKey(sourceKey: string, groupId: string): string {
  return `${sourceKey}::shared::${groupId}`
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
  const refs = feat.modifierRefs ?? readModifierRefs(feat as unknown as Record<string, unknown>)
  return characteristicsFromLinkedModifiers(catalog, instances, refs)
}

type SlotBuildContext = { classSkillList?: string[]; classLevel?: number }

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
    const count = skillMod.choiceCount ?? 0
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
    })
    return slots
  }

  if (mod.type === "tool_proficiencies") {
    const count = mod.choiceCount ?? 0
    if (count <= 0) return slots

    const customPool = (mod.choiceOptions ?? []).filter((name) => name.trim().length > 0)
    const pool = customPool.length > 0 ? customPool : [...SRD_TOOL_NAMES]

    slots.push({
      slotKey: modifierPlayerChoiceSlotKey(sourceKey, mod.id, "tool"),
      sourceKey,
      sourceLabel,
      modId: mod.id,
      kind: "tool",
      label: mod.label ?? `Choose ${count} tool${count === 1 ? "" : "s"}`,
      maxCount: count,
      options: pool.map((name) => ({ name })),
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
    if (grants.length === 0) return slots

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
      slots.push({
        slotKey: modifierPlayerChoiceSlotKey(sourceKey, mod.id, "spell", index),
        sourceKey,
        sourceLabel,
        modId: mod.id,
        kind: "spell",
        label:
          grant.level === 0
            ? `Choose ${grant.count} cantrip${grant.count === 1 ? "" : "s"}`
            : `Choose ${grant.count} level-${grant.level} spell${grant.count === 1 ? "" : "s"}`,
        maxCount: grant.count,
        spellLevel: grant.level,
        spellListClassNames: grant.classNames ?? spellMod.spellListClassOptions ?? [],
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
        ...SRD_TOOL_NAMES.map((name) => ({ name })),
      ],
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
  const feature = migrateFeatureOptionPickers(rawFeature)
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
      const option = feature.choices.options.find((entry) => entry.name === optionName)
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

    const context: SlotBuildContext = {
      classSkillList: cls.skill_choices?.options ?? [],
      classLevel: entry.level,
    }

    for (const feature of cls.features ?? []) {
      if (feature.level > entry.level) continue
      slots.push(
        ...collectSlotsFromFeature(
          feature,
          entry.classId,
          cls.name,
          featureChoicePicks,
          catalog,
          context,
        ),
      )
    }

    const subclassId = subclassByClassId[entry.classId]
    if (subclassId && entry.level >= SUBCLASS_LEVEL) {
      const subclass = subclasses.find((candidate) => candidate.id === subclassId)
      if (!subclass) continue
      for (const feature of subclass.features ?? []) {
        if (feature.level > entry.level) continue
        slots.push(
          ...collectSlotsFromFeature(
            feature,
            entry.classId,
            `${cls.name} (${subclass.name})`,
            featureChoicePicks,
            catalog,
            context,
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
): ModifierPlayerChoiceSlot[] {
  if (!species) return []
  const slots: ModifierPlayerChoiceSlot[] = []

  const speciesRow = species as unknown as Record<string, unknown>
  const speciesWide = characteristicsFromLinkedModifiers(
    catalog,
    readLinkedModifiers(speciesRow, catalog),
    readModifierRefs(speciesRow),
  )
  slots.push(
    ...slotsFromCharacteristics(speciesWide, speciesModsSourceKey(species.id), species.name),
  )

  species.traits?.forEach((trait, index) => {
    const sourceKey = speciesTraitSourceKey(species.id, index)
    const baseMods = characteristicsFromLinkedModifiers(
      catalog,
      effectiveLinkedModifiers(trait.linkedModifiers, trait.modifierRefs, catalog),
      trait.modifierRefs,
    )
    slots.push(...slotsFromCharacteristics(baseMods, sourceKey, trait.name))

    if (trait.isChoice && trait.choices?.options?.length) {
      const picked = speciesTraitPicks[String(index)] ?? []
      for (const optionName of picked) {
        const option = trait.choices.options.find((entry) => entry.name === optionName)
        if (!option) continue
        const optionMods = characteristicsFromLinkedModifiers(
          catalog,
          effectiveLinkedModifiers(option.linkedModifiers, option.modifierRefs, catalog),
          option.modifierRefs,
        )
        slots.push(...slotsFromCharacteristics(optionMods, sourceKey, trait.name))
      }
    }
  })

  return dedupeModifierPlayerChoiceSlots(slots)
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
    slots.push(
      ...collectSpeciesModifierPlayerChoiceSlots(species, speciesTraitPicks, catalog),
    )
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

  return result.map((mod) => {
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
        return poolEntry ?? { skill, expertise: false }
      })
      return { ...skillMod, entries }
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
            prepared: grant.level > 0 ? true : undefined,
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
  return spells.filter(
    (spell) =>
      spell.level === slot.spellLevel &&
      spell.classes?.some((className) => classSet.has(className.toLowerCase())) &&
      (!otherSlotSpellIds.has(spell.id) || ownPicks.includes(spell.id)),
  )
}

export function isSpellRelatedModifierSlot(slot: ModifierPlayerChoiceSlot): boolean {
  return slot.kind === "spell" || slot.kind === "spell_list_class"
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
  const seen = new Set<string>()
  const deduped: ModifierPlayerChoiceSlot[] = []
  for (const slot of slots) {
    const key = `${slot.sourceKey}\0${slot.kind}\0${slot.label}\0${slot.maxCount}`
    if (seen.has(key)) continue
    seen.add(key)
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

  return next
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
    if (subclassId && entry.level >= SUBCLASS_LEVEL) {
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
