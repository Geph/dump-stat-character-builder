import { choiceCountMet } from "@/lib/builder/choices"
import {
  linkedModifiersForFeat,
  type FeatSelectionEntry,
} from "@/lib/builder/feat-choices"
import { characteristicsFromLinkedModifiers } from "@/lib/compendium/builder-modifier-refs"
import {
  SKILL_NAMES,
  type CharacteristicModifier,
  type SkillsCharacteristic,
  type SpellsKnownCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { readModifierRefs } from "@/lib/compendium/normalize-modifier-refs"
import { SRD_TOOL_NAMES } from "@/lib/compendium/srd-tool-names"
import type { Feat, Spell } from "@/lib/types"

export type ModifierPlayerChoiceKind =
  | "skill"
  | "tool"
  | "skill_or_tool"
  | "spell_list_class"
  | "spell"

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

export function characteristicsForFeatSelection(
  feat: Feat,
  choicePickKey: string,
  featChoicePicks: Record<string, string[]>,
  catalog: ModifierCatalogEntry[],
): CharacteristicModifier[] {
  const instances = linkedModifiersForFeat(feat, choicePickKey, featChoicePicks, catalog)
  const refs = feat.modifierRefs ?? readModifierRefs(feat as unknown as Record<string, unknown>)
  return characteristicsFromLinkedModifiers(catalog, instances, refs, feat.benefits)
}

function slotsFromCharacteristic(
  mod: CharacteristicModifier,
  sourceKey: string,
  sourceLabel: string,
): ModifierPlayerChoiceSlot[] {
  const slots: ModifierPlayerChoiceSlot[] = []

  if (mod.sharedChoiceGroup && (mod.sharedChoiceCount ?? 0) > 0) {
    return slots
  }

  if (mod.type === "skills") {
    const skillMod = mod as SkillsCharacteristic
    const count = skillMod.choiceCount ?? 0
    if (count <= 0) return slots

    const options = skillMod.allowAnySkill
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
    })
    return slots
  }

  if (mod.type === "tool_proficiencies") {
    const count = mod.choiceCount ?? 0
    if (count <= 0) return slots

    slots.push({
      slotKey: modifierPlayerChoiceSlotKey(sourceKey, mod.id, "tool"),
      sourceKey,
      sourceLabel,
      modId: mod.id,
      kind: "tool",
      label: mod.label ?? `Choose ${count} tool${count === 1 ? "" : "s"}`,
      maxCount: count,
      options: SRD_TOOL_NAMES.map((name) => ({ name })),
    })
    return slots
  }

  if (mod.type === "spells_known") {
    const spellMod = mod as SpellsKnownCharacteristic
    const grants = spellMod.choiceGrants ?? []
    if (grants.length === 0) return slots

    const spellListSlotKey = modifierPlayerChoiceSlotKey(sourceKey, mod.id, "spell_list_class")

    if (spellMod.playerPicksSpellList && (spellMod.spellListClassOptions?.length ?? 0) > 0) {
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
): ModifierPlayerChoiceSlot[] {
  const slots: ModifierPlayerChoiceSlot[] = []
  for (const mod of mods) {
    slots.push(...slotsFromCharacteristic(mod, sourceKey, sourceLabel))
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

export function collectModifierPlayerChoiceSlots(params: {
  featEntries: FeatSelectionEntry[]
  feats: Feat[]
  featChoicePicks: Record<string, string[]>
  catalog: ModifierCatalogEntry[]
}): ModifierPlayerChoiceSlot[] {
  const { featEntries, feats, featChoicePicks, catalog } = params
  const slots: ModifierPlayerChoiceSlot[] = []

  for (const entry of featEntries) {
    const feat = feats.find((candidate) => candidate.id === entry.featId)
    if (!feat) continue

    const characteristics = characteristicsForFeatSelection(
      feat,
      entry.choicePickKey,
      featChoicePicks,
      catalog,
    )

    slots.push(...slotsFromCharacteristics(characteristics, entry.choicePickKey, feat.name))
  }

  return slots
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

  const classSet = new Set(classNames.map((name) => name.toLowerCase()))
  return spells.filter(
    (spell) =>
      spell.level === slot.spellLevel &&
      spell.classes?.some((className) => classSet.has(className.toLowerCase())),
  )
}

export function validateModifierPlayerChoices(
  slots: ModifierPlayerChoiceSlot[],
  picks: Record<string, string[]>,
): boolean {
  for (const slot of slots) {
    const selected = picks[slot.slotKey] ?? []
    if (!choiceCountMet(selected, slot.maxCount)) return false

    if (slot.kind === "spell" && slot.requiresSpellListPick && slot.spellListSlotKey) {
      const listPick = picks[slot.spellListSlotKey]?.[0]
      if (!listPick) return false
    }
  }
  return true
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

export function isSkillOrToolOptionName(name: string): boolean {
  return SKILL_NAME_SET.has(name) || TOOL_NAME_SET.has(name)
}
