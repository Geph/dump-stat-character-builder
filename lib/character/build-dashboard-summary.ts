import type { ResourceTrackerEntry } from "@/components/character-sheet/resource-uses-tracker"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { collectFeatureUsesResources } from "@/lib/character/collect-feature-uses-resources"
import { buildInputsFromSavedCharacter, computeDerivedCharacter } from "@/lib/character/compute-derived"
import type { DashboardHydratedCharacter, DashboardCharacterRecord } from "@/lib/character/hydrate-dashboard"
import { filterCustomAbilitiesForCharacterSheet } from "@/lib/character/filter-sheet-custom-abilities"
import {
  mergeCompanionState,
  resolveCharacterCompanions,
} from "@/lib/character/resolve-companions"
import { isFindFamiliarSpell } from "@/lib/character/srd-familiar"
import { normalizeSheetPlayState } from "@/lib/character/sheet-play-state"
import type { DerivedCharacter } from "@/lib/character/types"
import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import { resolveClassResourcesForClass } from "@/lib/compendium/resolve-class-resources"
import {
  getMulticlassSpellSlotTables,
  resolveEffectiveClassSpellcasting,
  resolveSpellcastingAbilityKey,
  spellSlotTableKey,
  type SpellSlotTable,
} from "@/lib/compendium/spell-slots"
import { resolveUsesAtLevel, type ResolveUsesContext } from "@/lib/compendium/resolve-uses-config"
import { getExhaustionDerivedEffects } from "@/lib/srd/exhaustion-effects"
import type { SheetToggleKey } from "@/lib/compendium/sheet-toggle-registry"
import { characterSheetHref } from "@/lib/compendium/edit-href"
import type { DndClass, Subclass } from "@/lib/types"

export type DashboardResourceLine = {
  label: string
  remaining: number
  max: number
}

export type DashboardCompanionSummary = {
  key: string
  name: string
  currentHp: number
  maxHp: number
  ac: number
  polymorph: boolean
}

export type DashboardCharacterSummary = {
  id: string
  name: string
  classLabel: string
  portraitUrl: string | null
  currentHp: number
  maxHp: number
  tempHp: number
  armorClass: number
  passivePerception: number
  speed: number
  conditions: string[]
  abilityScores: Record<AbilityScoreKey, number>
  abilityMods: Record<AbilityScoreKey, number>
  resources: DashboardResourceLine[]
  companions: DashboardCompanionSummary[]
  sheetHref: string
  extraCompanionCount: number
}

const MAX_RESOURCE_LINES = 2
const MAX_VISIBLE_COMPANIONS = 2

function buildClassDetailList(character: DashboardCharacterRecord): CharacterClassDetail[] {
  if (character.class_list?.length) return character.class_list
  if (!character.classes || !character.class_id) return []
  return [
    {
      row: {
        class_id: character.class_id,
        level: character.level,
        subclass_id: character.subclass_id,
        order: 0,
      },
      class: character.classes,
      subclass: character.subclasses ?? null,
    },
  ]
}

function buildClassLabel(classDetails: CharacterClassDetail[], character: DashboardCharacterRecord): string {
  if (classDetails.length) {
    return classDetails
      .map((entry) => `${entry.class?.name ?? "Class"} Level ${entry.row.level}`)
      .join(" · ")
  }
  if (character.classes?.name) return `${character.classes.name} Level ${character.level}`
  return "Adventurer"
}

function buildResourceTrackerEntries(classDetails: CharacterClassDetail[]): ResourceTrackerEntry[] {
  const entries: ResourceTrackerEntry[] = []
  for (const entry of classDetails) {
    const className = entry.class?.name
    if (!className || !entry.class) continue
    const resources = resolveClassResourcesForClass(entry.class)
    for (const resource of resources) {
      if (resource.uses.type === "unlimited" || resource.uses.type === "class_resource") continue
      if (resource.id === "spell_slots") continue
      entries.push({
        id: `${entry.row.class_id}_${resource.id}`,
        name:
          classDetails.length > 1 || resources.length > 1
            ? `${resource.name} (${className})`
            : resource.name,
        uses: resource.uses,
        classLevel: entry.row.level,
      })
    }
  }
  return [...entries, ...collectFeatureUsesResources(classDetails)]
}

function resolveResourceMax(
  entry: ResourceTrackerEntry,
  ctx: ResolveUsesContext,
): number | null {
  if (entry.uses.type === "special") return null
  const max = resolveUsesAtLevel(entry.uses, entry.classLevel, ctx)
  if (max == null || max <= 0) return null
  return max
}

function spellSlotTotals(
  table: SpellSlotTable,
  usedSpellSlotsByKey: Record<string, number[]>,
): { remaining: number; max: number } {
  const key = spellSlotTableKey(table)
  const used = usedSpellSlotsByKey[key] ?? table.slotsByLevel.map(() => 0)
  let max = 0
  let remaining = 0
  for (let index = 0; index < table.slotsByLevel.length; index++) {
    const slotMax = table.slotsByLevel[index] ?? 0
    if (slotMax <= 0) continue
    max += slotMax
    const usedAtLevel = used[index] ?? 0
    remaining += Math.max(0, slotMax - usedAtLevel)
  }
  return { remaining, max }
}

function buildResourceLines(params: {
  classDetails: CharacterClassDetail[]
  derived: DerivedCharacter
  usedResourcesById: Record<string, number>
  usedSpellSlotsByKey: Record<string, number[]>
}): DashboardResourceLine[] {
  const { classDetails, derived, usedResourcesById, usedSpellSlotsByKey } = params
  const resolveContext: ResolveUsesContext = {
    proficiencyBonus: derived.proficiencyBonus,
    abilityModifiers: {
      STR: derived.abilityMods.strength,
      DEX: derived.abilityMods.dexterity,
      CON: derived.abilityMods.constitution,
      INT: derived.abilityMods.intelligence,
      WIS: derived.abilityMods.wisdom,
      CHA: derived.abilityMods.charisma,
    },
  }

  const lines: DashboardResourceLine[] = []

  const spellSlotTables = getMulticlassSpellSlotTables(
    classDetails
      .map((entry) => ({
        className: entry.class?.name ?? "",
        classLevel: entry.row.level,
        spellcasting: resolveEffectiveClassSpellcasting(entry),
      }))
      .filter((entry) => entry.spellcasting),
  )

  const primaryTable = spellSlotTables[0]
  if (primaryTable) {
    const totals = spellSlotTotals(primaryTable, usedSpellSlotsByKey)
    if (totals.max > 0) {
      lines.push({
        label: "Spell slots",
        remaining: totals.remaining,
        max: totals.max,
      })
    }
  }

  const resourceBudget = MAX_RESOURCE_LINES - lines.length
  if (resourceBudget <= 0) return lines.slice(0, MAX_RESOURCE_LINES)

  const sortedClassDetails = [...classDetails].sort((a, b) => b.row.level - a.row.level)
  const trackable: DashboardResourceLine[] = []
  for (const entry of sortedClassDetails) {
    for (const resourceEntry of buildResourceTrackerEntries([entry])) {
      const max = resolveResourceMax(resourceEntry, resolveContext)
      if (max == null) continue
      const used = usedResourcesById[resourceEntry.id] ?? 0
      trackable.push({
        label: resourceEntry.name,
        remaining: Math.max(0, max - used),
        max,
      })
    }
  }

  for (const line of trackable) {
    if (lines.length >= MAX_RESOURCE_LINES) break
    if (lines.some((existing) => existing.label === line.label)) continue
    lines.push(line)
  }

  return lines.slice(0, MAX_RESOURCE_LINES)
}

function buildConditionLabels(
  activeConditions: string[],
  exhaustionLevel: number,
): string[] {
  const labels = [...activeConditions]
  if (exhaustionLevel > 0) labels.push(`Exhaustion ${exhaustionLevel}`)
  return labels
}

function buildCompanionSummaries(
  hydrated: DashboardHydratedCharacter,
  classDetails: CharacterClassDetail[],
  derived: DerivedCharacter,
): { visible: DashboardCompanionSummary[]; extraCount: number } {
  const { character, customAbilities, spells } = hydrated
  const abilityMods = derived.abilityMods
  const proficiencyBonus = derived.proficiencyBonus
  const spellcastingClass =
    classDetails.find((entry) => entry.class?.spellcasting)?.class ?? character.classes
  const spellcastingAbilityLabel =
    spellcastingClass?.spellcasting?.ability ?? character.subclasses?.spellcasting?.ability
  const spellcastingAbilityKey = resolveSpellcastingAbilityKey(spellcastingAbilityLabel)
  const spellAbilityMod = spellcastingAbilityKey ? abilityMods[spellcastingAbilityKey] : 0
  const spellSaveDc = spellcastingAbilityKey ? 8 + proficiencyBonus + spellAbilityMod : null
  const spellAttackMod = spellcastingAbilityKey ? proficiencyBonus + spellAbilityMod : null

  const sheetCustomAbilities = filterCustomAbilitiesForCharacterSheet(customAbilities, {
    classIds: classDetails.map((entry) => entry.row.class_id),
    classNames: classDetails.map((entry) => entry.class?.name).filter(Boolean) as string[],
    subclassIds: classDetails.map((entry) => entry.row.subclass_id).filter(Boolean) as string[],
    subclassNames: classDetails.map((entry) => entry.subclass?.name).filter(Boolean) as string[],
    speciesId: character.species_id ?? null,
    speciesName: character.species?.name ?? null,
    backgroundId: character.background_id ?? null,
    backgroundName: character.backgrounds?.name ?? null,
    featIds: character.feat_ids ?? [],
    featNames: hydrated.feats.map((feat) => feat.name),
    equipmentIds: character.equipment_ids ?? [],
    equipmentCategories: hydrated.equipment.map((item) => item.category),
    spellIds: character.spell_ids ?? [],
  })

  const ctx = {
    abilityMods,
    proficiencyBonus,
    spellAttackModifier: spellAttackMod ?? proficiencyBonus + (abilityMods.intelligence ?? 0),
    spellSaveDc: spellSaveDc ?? 8 + proficiencyBonus + (abilityMods.intelligence ?? 0),
    classLevels: classDetails
      .filter((entry) => entry.class?.name)
      .map((entry) => ({ className: entry.class!.name, level: entry.row.level })),
    ownerMaxHp: derived.maxHp,
    ownerAbilityScores: derived.abilityScores,
    ownerSavingThrowProficiencies: derived.savingThrowProficiencies,
  }

  const hasFindFamiliar = spells.some((spell) => isFindFamiliarSpell(spell.name))
  const spellcastingEntry = classDetails.find((entry) => entry.class?.spellcasting) ?? classDetails[0]
  const findFamiliarSpellSource = hasFindFamiliar
    ? {
        className: spellcastingClass?.name ?? "Spellcaster",
        classId: spellcastingEntry?.row.class_id ?? "spellcaster",
        subclassId: null,
      }
    : null

  const resolved = resolveCharacterCompanions({
    classDetails,
    customAbilities: sheetCustomAbilities,
    ctx,
    findFamiliarSpellSource,
  })
  const merged = mergeCompanionState(resolved, character.companion_state ?? [])

  const summaries: DashboardCompanionSummary[] = merged.map((companion) => ({
    key: companion.key,
    name: companion.displayName,
    currentHp: companion.currentHp,
    maxHp: companion.maxHp,
    ac: companion.ac,
    polymorph: companion.polymorph,
  }))

  return {
    visible: summaries.slice(0, MAX_VISIBLE_COMPANIONS),
    extraCount: Math.max(0, summaries.length - MAX_VISIBLE_COMPANIONS),
  }
}

export function buildDashboardSummary(hydrated: DashboardHydratedCharacter): DashboardCharacterSummary | null {
  const { character, feats, equipment, equipmentCatalog, modifierCatalog } = hydrated
  const classDetails = buildClassDetailList(character)
  if (!classDetails.length) return null

  const playState = normalizeSheetPlayState(character.sheet_state)
  const savedAcPick = character.modifier_player_picks?.ac_formula?.[0] ?? null

  const classesFromDetails = classDetails
    .map((entry) => entry.class)
    .filter((cls): cls is DndClass => Boolean(cls))
  const subclassesFromDetails = classDetails
    .map((entry) => entry.subclass)
    .filter((sub): sub is Subclass => Boolean(sub))

  const baseInputs = buildInputsFromSavedCharacter({
    character,
    classes: classesFromDetails,
    subclasses: subclassesFromDetails,
    species: character.species,
    background: character.backgrounds,
    feats,
    equipment,
    equipmentCatalog,
    modifierCatalog,
  })
  if (!baseInputs) return null

  const baseMaxHp = character.hit_point_max ?? 0
  const exhaustionFx = getExhaustionDerivedEffects(playState.exhaustionLevel)
  const maxHpForHalf =
    exhaustionFx.hpMaxMultiplier < 1
      ? Math.max(1, Math.floor(baseMaxHp * exhaustionFx.hpMaxMultiplier))
      : baseMaxHp
  const currentHp =
    playState.currentHp ?? character.hit_points ?? character.hit_point_max ?? baseMaxHp

  const effectiveSheetToggles = new Set<SheetToggleKey>(playState.activeSheetToggleIds)
  if (maxHpForHalf > 0 && currentHp <= Math.floor(maxHpForHalf / 2)) {
    effectiveSheetToggles.add("below_half_hp")
  }

  const inputs = {
    ...baseInputs,
    exhaustionLevel: playState.exhaustionLevel,
    modifierPlayerPicks: {
      ...baseInputs.modifierPlayerPicks,
      ...(savedAcPick ? { ac_formula: [savedAcPick] } : {}),
    },
    activeSheetToggles: effectiveSheetToggles,
  }

  const derived = computeDerivedCharacter(inputs)
  const { visible, extraCount } = buildCompanionSummaries(hydrated, classDetails, derived)

  return {
    id: character.id,
    name: character.name,
    classLabel: buildClassLabel(classDetails, character),
    portraitUrl: character.portrait_url,
    currentHp,
    maxHp: derived.maxHp,
    tempHp: playState.tempHp,
    armorClass: derived.armorClass,
    passivePerception: derived.passivePerception,
    speed: derived.speed,
    conditions: buildConditionLabels(playState.activeConditions, playState.exhaustionLevel),
    abilityScores: derived.abilityScores,
    abilityMods: derived.abilityMods,
    resources: buildResourceLines({
      classDetails,
      derived,
      usedResourcesById: playState.usedResourcesById,
      usedSpellSlotsByKey: playState.usedSpellSlotsByKey,
    }),
    companions: visible,
    extraCompanionCount: extraCount,
    sheetHref: characterSheetHref(character.id),
  }
}

export function buildDashboardSummaries(
  hydratedRows: DashboardHydratedCharacter[],
): DashboardCharacterSummary[] {
  return hydratedRows
    .map((row) => buildDashboardSummary(row))
    .filter((summary): summary is DashboardCharacterSummary => summary !== null)
}
