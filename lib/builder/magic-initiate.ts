import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import {
  MAGIC_INITIATE_SPELL_LISTS,
  magicInitiateListFromFeatGranted,
  type MagicInitiateSpellList,
} from "@/lib/compendium/background-origin-feat"
import { featChoicePickKey, grantedFeatChoicePickKey } from "@/lib/builder/feat-choices"
import type { ModifierPlayerChoiceSlot } from "@/lib/builder/modifier-player-choices"

export const MAGIC_INITIATE_ABILITY_OPTIONS: AbilityScoreKey[] = [
  "intelligence",
  "wisdom",
  "charisma",
]

export { MAGIC_INITIATE_SPELL_LISTS }

/** Default spellcasting ability for a Magic Initiate spell list (2024). */
export function magicInitiateAbilityForSpellList(
  spellList: MagicInitiateSpellList | string | null | undefined,
): AbilityScoreKey {
  const list = (spellList ?? "").trim().toLowerCase()
  if (list === "wizard") return "intelligence"
  if (list === "cleric" || list === "druid") return "wisdom"
  return "intelligence"
}

export function normalizeSpellcastingAbilityPick(
  raw: string | null | undefined,
): AbilityScoreKey | null {
  const value = (raw ?? "").trim().toLowerCase()
  if (value === "intelligence" || value === "int") return "intelligence"
  if (value === "wisdom" || value === "wis") return "wisdom"
  if (value === "charisma" || value === "cha") return "charisma"
  return null
}

/** Canonical Magic Initiate spell-list name, or null if unrecognized. */
export function normalizeMagicInitiateSpellList(
  raw: string | null | undefined,
): MagicInitiateSpellList | null {
  const value = (raw ?? "").trim().toLowerCase()
  if (!value) return null
  return (
    MAGIC_INITIATE_SPELL_LISTS.find((list) => list.toLowerCase() === value) ?? null
  )
}

/** True when this modifier source is a Magic Initiate feat grant/pick. */
export function isMagicInitiateSourceLabel(sourceLabel: string | null | undefined): boolean {
  return /^magic initiate\b/i.test((sourceLabel ?? "").trim())
}

export type MagicInitiateTakenExtras = {
  /** Background origin text such as "Magic Initiate (Cleric)". */
  featGranted?: string | null
  /**
   * Source keys for Magic Initiate takes that may not be in `slots`
   * (level-up only collects the pending feat).
   */
  additionalSourceKeys?: readonly string[]
}

const SPELL_LIST_SLOT_SUFFIX = "::spell_list_class"
const SPELLCASTING_ABILITY_SLOT_SUFFIX = "::spellcasting_ability"

/** Source keys for granted + picked Magic Initiate takes on a character. */
export function magicInitiateSourceKeysForCharacter(
  magicInitiateFeatId: string | null | undefined,
  featureChoicePicks?: Record<string, string[]> | null,
): string[] {
  if (!magicInitiateFeatId) return []
  const keys = [grantedFeatChoicePickKey(magicInitiateFeatId)]
  const seen = new Set(keys)
  for (const [slotKey, values] of Object.entries(featureChoicePicks ?? {})) {
    if (!values.includes(magicInitiateFeatId)) continue
    const sourceKey = featChoicePickKey(slotKey)
    if (seen.has(sourceKey)) continue
    seen.add(sourceKey)
    keys.push(sourceKey)
  }
  return keys
}

/** Chosen Magic Initiate spell list stored on a modifier pick key. */
export function spellListFromMagicInitiatePicks(
  picks: Record<string, string[]> | null | undefined,
  sourceKey?: string | null,
): MagicInitiateSpellList | null {
  const found: MagicInitiateSpellList[] = []
  for (const [key, values] of Object.entries(picks ?? {})) {
    if (!key.endsWith(SPELL_LIST_SLOT_SUFFIX)) continue
    if (sourceKey && !key.startsWith(`${sourceKey}::`)) continue
    const list = normalizeMagicInitiateSpellList(values?.[0])
    if (list) found.push(list)
  }
  if (sourceKey) return found[0] ?? null
  const unique = [...new Set(found)]
  return unique.length === 1 ? unique[0] : null
}

/** Chosen spellcasting ability stored on a Magic Initiate modifier pick key. */
export function spellcastingAbilityFromMagicInitiatePicks(
  picks: Record<string, string[]> | null | undefined,
  sourceKey?: string | null,
): AbilityScoreKey | null {
  for (const [key, values] of Object.entries(picks ?? {})) {
    if (!key.endsWith(SPELLCASTING_ABILITY_SLOT_SUFFIX)) continue
    if (sourceKey && !key.startsWith(`${sourceKey}::`)) continue
    const ability = normalizeSpellcastingAbilityPick(values?.[0])
    if (ability) return ability
  }
  return null
}

function addTakenList(taken: Set<string>, raw: string | null | undefined): void {
  const list = normalizeMagicInitiateSpellList(raw)
  if (list) taken.add(list.toLowerCase())
}

function addTakenListsFromSourceKeys(
  taken: Set<string>,
  picks: Record<string, string[]>,
  sourceKeys: readonly string[],
  currentSlotKey?: string | null,
): void {
  for (const sourceKey of sourceKeys) {
    for (const [key, values] of Object.entries(picks)) {
      if (currentSlotKey && key === currentSlotKey) continue
      if (!key.startsWith(`${sourceKey}::`) || !key.endsWith(SPELL_LIST_SLOT_SUFFIX)) continue
      addTakenList(taken, values?.[0])
    }
  }
}

/**
 * Spell list locked by this Magic Initiate take (origin grant, then modifier picks).
 */
export function resolveMagicInitiateSpellList(params: {
  featName?: string | null
  isOriginFeat?: boolean
  featGranted?: string | null
  originFeatId?: string | null
  featId?: string | null
  sourceKey?: string | null
  picks?: Record<string, string[]> | null
  featureChoicePicks?: Record<string, string[]> | null
}): MagicInitiateSpellList | null {
  const isMagicInitiate =
    params.isOriginFeat || isMagicInitiateSourceLabel(params.featName)
  if (!isMagicInitiate) return null

  if (params.isOriginFeat) {
    const fromGrant = magicInitiateListFromFeatGranted(params.featGranted)
    if (fromGrant) return fromGrant
  }

  const sourceKey =
    params.sourceKey ??
    (params.isOriginFeat && params.originFeatId
      ? grantedFeatChoicePickKey(params.originFeatId)
      : null)
  if (sourceKey) {
    const fromSource = spellListFromMagicInitiatePicks(params.picks, sourceKey)
    if (fromSource) return fromSource
  }

  const featId = params.featId ?? params.originFeatId ?? null
  const sourceKeys = magicInitiateSourceKeysForCharacter(featId, params.featureChoicePicks)
  const fromKeys = sourceKeys
    .map((key) => spellListFromMagicInitiatePicks(params.picks, key))
    .filter((list): list is MagicInitiateSpellList => Boolean(list))
  if (fromKeys.length === 1) return fromKeys[0]
  if (fromKeys.length > 1) return fromKeys[0]

  return spellListFromMagicInitiatePicks(params.picks)
}

function formatSpellcastingAbilityLabel(ability: AbilityScoreKey): string {
  return ability.charAt(0).toUpperCase() + ability.slice(1)
}

/**
 * Rewrite generic Magic Initiate prose so the sheet shows the chosen list (and ability).
 * Keeps the SRD structure; only substitutes the already-made player choice.
 */
export function specializeMagicInitiateDescription(
  description: string | null | undefined,
  options: {
    spellList?: string | null
    spellcastingAbility?: string | null
  } = {},
): string | null | undefined {
  if (!description) return description
  const spellList = normalizeMagicInitiateSpellList(options.spellList)
  const ability = normalizeSpellcastingAbilityPick(options.spellcastingAbility)
  let next = description
  if (spellList) {
    next = next
      .replace(
        /from the Cleric, Druid, or Wizard spell list/gi,
        `from the ${spellList} spell list`,
      )
      .replace(
        /from the same list you selected for this feat's cantrips/gi,
        `from the ${spellList} spell list`,
      )
      .replace(/from the chosen spell list/gi, `from the ${spellList} spell list`)
  }
  if (ability) {
    const label = formatSpellcastingAbilityLabel(ability)
    next = next.replace(
      /Intelligence, Wisdom, or Charisma is your spellcasting ability for this feat's spells \(choose when you select this feat\)/gi,
      `${label} is your spellcasting ability for this feat's spells`,
    )
  }
  return next
}

/**
 * Spell lists already claimed by other Magic Initiate takes.
 * `currentSlotKey` is excluded so the active pick keeps its own option visible.
 */
export function takenMagicInitiateSpellLists(
  slots: readonly ModifierPlayerChoiceSlot[],
  picks: Record<string, string[]>,
  currentSlotKey?: string | null,
  extras?: MagicInitiateTakenExtras,
): Set<string> {
  const taken = new Set<string>()
  for (const slot of slots) {
    if (slot.kind !== "spell_list_class") continue
    if (!isMagicInitiateSourceLabel(slot.sourceLabel)) continue
    if (currentSlotKey && slot.slotKey === currentSlotKey) continue
    addTakenList(taken, picks[slot.slotKey]?.[0])
  }

  for (const [key, values] of Object.entries(picks)) {
    if (currentSlotKey && key === currentSlotKey) continue
    if (!key.includes(":granted:") || !key.endsWith(SPELL_LIST_SLOT_SUFFIX)) continue
    addTakenList(taken, values?.[0])
  }

  addTakenListsFromSourceKeys(
    taken,
    picks,
    extras?.additionalSourceKeys ?? [],
    currentSlotKey,
  )

  const fromGrant = magicInitiateListFromFeatGranted(extras?.featGranted)
  if (fromGrant) taken.add(fromGrant.toLowerCase())
  return taken
}

/**
 * Abilities already claimed by other Magic Initiate takes.
 * Uses an explicit spellcasting_ability pick when present; otherwise infers from the
 * chosen spell list (Wizard→INT, Cleric/Druid→WIS) so background grants lock correctly.
 * `currentSlotKey` is excluded so the active pick keeps its own option visible.
 */
export function takenMagicInitiateAbilities(
  slots: readonly ModifierPlayerChoiceSlot[],
  picks: Record<string, string[]>,
  currentSlotKey?: string | null,
): Set<AbilityScoreKey> {
  const taken = new Set<AbilityScoreKey>()
  const miSourceKeys = new Set(
    slots
      .filter((slot) => isMagicInitiateSourceLabel(slot.sourceLabel))
      .map((slot) => slot.sourceKey),
  )

  for (const sourceKey of miSourceKeys) {
    const abilitySlot = slots.find(
      (slot) =>
        slot.sourceKey === sourceKey &&
        slot.kind === "spellcasting_ability" &&
        isMagicInitiateSourceLabel(slot.sourceLabel),
    )
    if (currentSlotKey && abilitySlot?.slotKey === currentSlotKey) continue

    const explicit = abilitySlot
      ? normalizeSpellcastingAbilityPick(picks[abilitySlot.slotKey]?.[0])
      : null
    if (explicit) {
      taken.add(explicit)
      continue
    }

    const listSlot = slots.find(
      (slot) => slot.sourceKey === sourceKey && slot.kind === "spell_list_class",
    )
    const listName = listSlot ? picks[listSlot.slotKey]?.[0] : null
    if (listName) {
      taken.add(magicInitiateAbilityForSpellList(listName))
    }
  }
  return taken
}

/**
 * Spell-list names already claimed by other Magic Initiate takes (for graying out picker options).
 * `currentSlotKey` is excluded so the active pick keeps its own selection enabled.
 */
export function unavailableMagicInitiateSpellListNames(
  slots: readonly ModifierPlayerChoiceSlot[],
  picks: Record<string, string[]>,
  currentSlotKey?: string | null,
  extras?: MagicInitiateTakenExtras,
): string[] {
  const taken = takenMagicInitiateSpellLists(slots, picks, currentSlotKey, extras)
  return MAGIC_INITIATE_SPELL_LISTS.filter((list) => taken.has(list.toLowerCase()))
}

/**
 * Ability option names already claimed by other Magic Initiate takes (for graying out pickers).
 */
export function unavailableMagicInitiateAbilityNames(
  slots: readonly ModifierPlayerChoiceSlot[],
  picks: Record<string, string[]>,
  currentSlotKey?: string | null,
): string[] {
  const taken = takenMagicInitiateAbilities(slots, picks, currentSlotKey)
  return MAGIC_INITIATE_ABILITY_OPTIONS.filter((ability) => taken.has(ability)).map(
    (ability) => ability.charAt(0).toUpperCase() + ability.slice(1),
  )
}

/**
 * Keep spell-list options intact. Taken lists are grayed out via unavailableOptions in the UI.
 * @deprecated Filtering was replaced by unavailableMagicInitiateSpellListNames; this is a no-op.
 */
export function filterMagicInitiateSpellListSlotOptions(
  slot: ModifierPlayerChoiceSlot,
  _slots: readonly ModifierPlayerChoiceSlot[],
  _picks: Record<string, string[]>,
): ModifierPlayerChoiceSlot {
  return slot
}

/**
 * Keep ability options intact. Taken abilities are grayed out via unavailableOptions in the UI.
 * @deprecated Filtering was replaced by unavailableMagicInitiateAbilityNames; this is a no-op.
 */
export function filterMagicInitiateAbilitySlotOptions(
  slot: ModifierPlayerChoiceSlot,
  _slots: readonly ModifierPlayerChoiceSlot[],
  _picks: Record<string, string[]>,
): ModifierPlayerChoiceSlot {
  return slot
}

/**
 * Whether another Magic Initiate may still be taken (at least one spell list free).
 * 2024 repeatable rule: each take must choose a different class's spell list.
 */
export function canTakeAnotherMagicInitiate(params: {
  slots: readonly ModifierPlayerChoiceSlot[]
  picks: Record<string, string[]>
  /** Spell lists available on Magic Initiate (defaults to Cleric/Druid/Wizard). */
  spellListOptions?: readonly string[]
  featGranted?: string | null
  additionalSourceKeys?: readonly string[]
}): boolean {
  const options = params.spellListOptions?.length
    ? params.spellListOptions
    : MAGIC_INITIATE_SPELL_LISTS
  const taken = takenMagicInitiateSpellLists(params.slots, params.picks, null, {
    featGranted: params.featGranted,
    additionalSourceKeys: params.additionalSourceKeys,
  })
  return options.some((list) => !taken.has(list.trim().toLowerCase()))
}

/**
 * Drop Magic Initiate spell-list picks that duplicate an earlier take.
 * Background / granted takes win over later feat picks.
 */
export function pruneConflictingMagicInitiateSpellListPicks(
  slots: readonly ModifierPlayerChoiceSlot[],
  picks: Record<string, string[]>,
): Record<string, string[]> {
  const listSlots = slots
    .filter(
      (slot) =>
        slot.kind === "spell_list_class" && isMagicInitiateSourceLabel(slot.sourceLabel),
    )
    .slice()
    .sort((a, b) => {
      const aGranted = /:granted:/.test(a.sourceKey) ? 0 : 1
      const bGranted = /:granted:/.test(b.sourceKey) ? 0 : 1
      return aGranted - bGranted
    })
  if (!listSlots.length) return picks

  const claimed = new Set<string>()
  let next = picks
  let changed = false

  for (const slot of listSlots) {
    const list = normalizeMagicInitiateSpellList(picks[slot.slotKey]?.[0])
    if (!list) continue
    const key = list.toLowerCase()
    if (!claimed.has(key)) {
      claimed.add(key)
      continue
    }

    if (!changed) next = { ...picks }
    changed = true
    delete next[slot.slotKey]
    for (const candidate of slots) {
      if (candidate.sourceKey === slot.sourceKey && candidate.kind === "spell") {
        delete next[candidate.slotKey]
      }
    }
  }

  return changed ? next : picks
}
