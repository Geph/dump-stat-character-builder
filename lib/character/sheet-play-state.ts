import type { SheetToggleKey } from "@/lib/compendium/sheet-toggle-registry"
import type { RealTimeCooldownState } from "@/lib/character/real-time-recharge"
import {
  normalizeAllyBenefitCounts,
  normalizeMutationDieGrant,
  type MutationDieGrant,
} from "@/lib/character/mutation-die"
import {
  normalizeIllusionTokens,
  type IllusionTokenState,
} from "@/lib/character/illusion-tokens"
import {
  defaultRampageTurnState,
  normalizeRampageTurnState,
  type RampageTurnState,
} from "@/lib/character/rampage-die"
import {
  normalizeDurationReminders,
  type DurationReminder,
} from "@/lib/character/duration-reminders"
import { normalizeSheetToggleWeaponIds } from "@/lib/character/weapon-spell-buff"
import { normalizeSkillAbilityOverrides } from "@/lib/character/skill-ability-overrides"
import { normalizeContainerInventories } from "@/lib/character/inventory-containers"
import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"

/** Per-resource banked value with optional real-time decay (Influence, Balance of Power). */
export type AccumulatedResourceState = {
  value: number
  /** ISO timestamp when the bank expires to zero. */
  expiresAt: string | null
}

/**
 * Ephemeral combat/play state for the character sheet.
 * Stored in sessionStorage by default; persisted to characters.sheet_state on explicit save.
 */
export type CharacterSheetPlayState = {
  activeConditions: string[]
  exhaustionLevel: number
  activeSheetToggleIds: SheetToggleKey[]
  /** Player-entered context for reminder toggles, keyed by toggle id (e.g. Mind Rider target). */
  sheetToggleNotes: Record<string, string>
  /**
   * Equipment id bound to a sheet toggle (Magic Weapon / Elemental Weapon).
   * Bonuses apply only to that weapon while the toggle is on.
   */
  sheetToggleWeaponIds: Record<string, string>
  usedResourcesById: Record<string, number>
  usedActionUsesById: Record<string, number>
  usedSpellSlotsByKey: Record<string, number[]>
  rechargeCapsByResourceId: Record<string, number>
  /** Hit dice spent since the last long rest, keyed by class id. */
  usedHitDiceByClassId: Record<string, number>
  currentHp: number | null
  tempHp: number
  deathSaves: { successes: number; failures: number }
  hasInspiration: boolean
  realTimeCooldowns: RealTimeCooldownState
  accumulatedResources: Record<string, AccumulatedResourceState>
  /** Runtime die-size overrides for mutable resources (e.g. Rampage Die d4→d12). */
  resourceDieSidesByKey: Record<string, number>
  /** Rampage Die per-turn flags + d12 Exhaustion clock (Unleashed Mind). */
  rampageTurn: RampageTurnState
  /** Flesh Warp Mutation Die grant (target ephemeral die until caster's next turn). */
  mutationDie: MutationDieGrant | null
  /** Ally benefit counts for Flesh Warp exhaustion tracking (label → uses this long rest). */
  fleshWarpAllyBenefitCounts: Record<string, number>
  /** Active Projected Self / Imaginary Ally illusion tokens. */
  illusionTokens: IllusionTokenState[]
  /** Skills box sort: by ability (STR→CHA) or alphabetical. */
  skillSortMode: "ability" | "alpha"
  /** Skill names pinned to the top of the skills list. */
  pinnedSkillNames: string[]
  /** Equipment item ids pinned to the top of the equipment list. */
  pinnedEquipmentIds: string[]
  /**
   * Nested / extradimensional container contents, keyed by resolveInventoryContainers().key
   * (feature:… or equipment:…).
   */
  containerInventories: Record<
    string,
    import("@/lib/character/inventory-containers").ContainerInventoryState
  >
  /** Timed effect reminders shown near conditions. */
  durationReminders: DurationReminder[]
  /** House-rule remaps of which ability governs a skill check. */
  skillAbilityOverrides: Record<string, AbilityScoreKey>
  /** Set when the player last saved play state to the database. */
  savedAt: string | null
}

export function defaultSheetPlayState(): CharacterSheetPlayState {
  return {
    activeConditions: [],
    exhaustionLevel: 0,
    activeSheetToggleIds: [],
    sheetToggleNotes: {},
    sheetToggleWeaponIds: {},
    usedResourcesById: {},
    usedActionUsesById: {},
    usedSpellSlotsByKey: {},
    rechargeCapsByResourceId: {},
    usedHitDiceByClassId: {},
    currentHp: null,
    tempHp: 0,
    deathSaves: { successes: 0, failures: 0 },
    hasInspiration: false,
    realTimeCooldowns: {},
    accumulatedResources: {},
    resourceDieSidesByKey: {},
    rampageTurn: defaultRampageTurnState(),
    mutationDie: null,
    fleshWarpAllyBenefitCounts: {},
    illusionTokens: [],
    skillSortMode: "ability",
    pinnedSkillNames: [],
    pinnedEquipmentIds: [],
    containerInventories: {},
    durationReminders: [],
    skillAbilityOverrides: {},
    savedAt: null,
  }
}

function normalizeResourceDieSides(
  raw: Record<string, number> | null | undefined,
): Record<string, number> {
  if (!raw || typeof raw !== "object") return {}
  return Object.fromEntries(
    Object.entries(raw).filter(
      ([key, sides]) =>
        key.trim().length > 0 && Number.isInteger(sides) && sides >= 2 && sides <= 100,
    ),
  )
}

function normalizeSheetToggleNotes(
  raw: Record<string, string> | null | undefined,
): Record<string, string> {
  if (!raw || typeof raw !== "object") return {}
  return Object.fromEntries(
    Object.entries(raw)
      .filter(
        ([key, value]) =>
          key.trim().length > 0 && typeof value === "string" && value.trim().length > 0,
      )
      .map(([key, value]) => [key, value.trim().slice(0, 200)]),
  )
}

export function normalizeSheetPlayState(
  raw: Partial<CharacterSheetPlayState> | null | undefined,
): CharacterSheetPlayState {
  const base = defaultSheetPlayState()
  if (!raw) return base
  return {
    activeConditions: Array.isArray(raw.activeConditions)
      ? raw.activeConditions.filter((entry): entry is string => typeof entry === "string")
      : base.activeConditions,
    exhaustionLevel:
      typeof raw.exhaustionLevel === "number" ? raw.exhaustionLevel : base.exhaustionLevel,
    activeSheetToggleIds: Array.isArray(raw.activeSheetToggleIds)
      ? raw.activeSheetToggleIds.filter((entry): entry is string => typeof entry === "string")
      : base.activeSheetToggleIds,
    sheetToggleNotes: normalizeSheetToggleNotes(raw.sheetToggleNotes),
    sheetToggleWeaponIds: normalizeSheetToggleWeaponIds(raw.sheetToggleWeaponIds),
    usedResourcesById:
      raw.usedResourcesById && typeof raw.usedResourcesById === "object"
        ? { ...raw.usedResourcesById }
        : base.usedResourcesById,
    usedActionUsesById:
      raw.usedActionUsesById && typeof raw.usedActionUsesById === "object"
        ? { ...raw.usedActionUsesById }
        : base.usedActionUsesById,
    usedSpellSlotsByKey:
      raw.usedSpellSlotsByKey && typeof raw.usedSpellSlotsByKey === "object"
        ? { ...raw.usedSpellSlotsByKey }
        : base.usedSpellSlotsByKey,
    rechargeCapsByResourceId:
      raw.rechargeCapsByResourceId && typeof raw.rechargeCapsByResourceId === "object"
        ? { ...raw.rechargeCapsByResourceId }
        : base.rechargeCapsByResourceId,
    usedHitDiceByClassId:
      raw.usedHitDiceByClassId && typeof raw.usedHitDiceByClassId === "object"
        ? { ...raw.usedHitDiceByClassId }
        : base.usedHitDiceByClassId,
    currentHp: typeof raw.currentHp === "number" ? raw.currentHp : base.currentHp,
    tempHp: typeof raw.tempHp === "number" ? raw.tempHp : base.tempHp,
    deathSaves:
      raw.deathSaves &&
      typeof raw.deathSaves.successes === "number" &&
      typeof raw.deathSaves.failures === "number"
        ? { successes: raw.deathSaves.successes, failures: raw.deathSaves.failures }
        : base.deathSaves,
    hasInspiration: Boolean(raw.hasInspiration),
    realTimeCooldowns:
      raw.realTimeCooldowns && typeof raw.realTimeCooldowns === "object"
        ? { ...raw.realTimeCooldowns }
        : base.realTimeCooldowns,
    accumulatedResources:
      raw.accumulatedResources && typeof raw.accumulatedResources === "object"
        ? { ...raw.accumulatedResources }
        : base.accumulatedResources,
    resourceDieSidesByKey: normalizeResourceDieSides(raw.resourceDieSidesByKey),
    rampageTurn: normalizeRampageTurnState(raw.rampageTurn),
    mutationDie: normalizeMutationDieGrant(raw.mutationDie),
    fleshWarpAllyBenefitCounts: normalizeAllyBenefitCounts(raw.fleshWarpAllyBenefitCounts),
    illusionTokens: normalizeIllusionTokens(raw.illusionTokens),
    skillSortMode: raw.skillSortMode === "alpha" ? "alpha" : "ability",
    pinnedSkillNames: Array.isArray(raw.pinnedSkillNames)
      ? raw.pinnedSkillNames.filter((entry): entry is string => typeof entry === "string")
      : base.pinnedSkillNames,
    pinnedEquipmentIds: Array.isArray(raw.pinnedEquipmentIds)
      ? raw.pinnedEquipmentIds.filter((entry): entry is string => typeof entry === "string")
      : base.pinnedEquipmentIds,
    containerInventories: normalizeContainerInventories(raw.containerInventories),
    durationReminders: normalizeDurationReminders(raw.durationReminders),
    skillAbilityOverrides: normalizeSkillAbilityOverrides(raw.skillAbilityOverrides),
    savedAt: typeof raw.savedAt === "string" ? raw.savedAt : base.savedAt,
  }
}
