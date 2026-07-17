"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { MainNav } from "@/components/main-nav"
import { pageBackLinkClass } from "@/lib/compendium/editor-field-styles"
import { createClient } from "@/lib/db/client"
import {
  Angry,
  ArrowLeft,
  User,
  Smile,
  Sparkles,
  ChevronDown,
  X,
  Pencil,
  Plus,
  PawPrint,
  Save,
  Download,
  Settings,
  Shield,
} from "lucide-react"
import Link from "next/link"
import { findBackgroundGrantedFeat } from "@/lib/compendium/background-display"
import { getEffectiveBackgroundFeatGranted } from "@/lib/compendium/background-origin-feat"
import {
  characterRowToExportItem,
  downloadCharacterExport,
} from "@/lib/character/character-export-format"
import type {
  Character,
  DndClass,
  Species,
  Background,
  Spell,
  Equipment,
  CustomAbility,
  Creature,
  Feat,
  Subclass,
} from "@/lib/types"
import { resolveEquippedItems } from "@/lib/compendium/equipment-magic-modifiers"
import {
  characterHasTwoWeaponFighting,
  defaultOffHandIncludesAbilityMod,
} from "@/lib/compendium/two-weapon-fighting"
import type { SheetToggleKey } from "@/lib/compendium/sheet-toggle-registry"
import { partitionToolProficiencies } from "@/lib/compendium/partition-tool-proficiencies"
import { getSkillsInAbilityOrder, ABILITY_ABBREVIATIONS } from "@/lib/compendium/skills"
import { D20RollButton } from "@/components/character-sheet/d20-roll-button"
import { SheetRollProvider } from "@/components/character-sheet/sheet-roll-context"
import { MagicItemPowersPanel } from "@/components/character-sheet/magic-item-powers-panel"
import { SpellSlotTracker, consumeSpellSlot } from "@/components/character-sheet/spell-slot-tracker"
import {
  getMulticlassSpellSlotTables,
  resolveEffectiveClassSpellcasting,
  isConcentrationCondition,
  getActiveConcentration,
  formatSpellListGroupLabel,
  resolveSpellcastingAbilityKey,
  spellSlotTableKey,
} from "@/lib/compendium/spell-slots"
import {
  buildInputsFromSavedCharacter,
  computeDerivedCharacter,
  deriveArmorClassForLoadout,
} from "@/lib/character/compute-derived"
import { filterDisplaySpeedEntries } from "@/lib/character/resolve-all-speeds"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { ExpandableDescription } from "@/components/character-sheet/expandable-description"
import { ResourceUsesTracker, type ResourceTrackerEntry } from "@/components/character-sheet/resource-uses-tracker"
import { collectFeatureUsesResources } from "@/lib/character/collect-feature-uses-resources"
import { buildClassResourceDieSidesMap } from "@/lib/character/resolve-class-resource-die"
import {
  applyTurnStartTriggers,
  collectTurnStartTriggers,
} from "@/lib/character/collect-turn-start-triggers"
import { getPointPoolSpellcasting } from "@/lib/character/point-pool-spellcasting"
import {
  metamagicOptionsForCharacter,
  resolveSpellCastCost,
} from "@/lib/character/resolve-spell-cast-cost"
import { resolveUsesAtLevel } from "@/lib/compendium/resolve-uses-config"
import { DeathSaveTracker } from "@/components/character-sheet/death-save-tracker"
import { SheetActionsPanel } from "@/components/character-sheet/sheet-actions-panel"
import { SheetEquippedWeaponsPanel } from "@/components/character-sheet/sheet-equipped-weapons-panel"
import { SheetEquipmentPanel } from "@/components/character-sheet/sheet-equipment-panel"
import { SheetAddEquipmentOverlay } from "@/components/character-sheet/sheet-add-equipment-overlay"
import { SheetRollHistoryProvider } from "@/components/character-sheet/sheet-roll-history-context"
import { RollHistoryTrigger } from "@/components/character-sheet/roll-history-trigger"
import { resolveClassResourcesForClass } from "@/lib/compendium/resolve-class-resources"
import { collectClassResourceSpendKeys } from "@/lib/compendium/class-resource-display"
import {
  ClassResourceStaticDisplay,
  partitionResourceTrackerEntries,
} from "@/components/character-sheet/class-resource-static-display"
import type { ClassResource } from "@/lib/types"
import { DEFAULT_ATTUNEMENT_SLOTS, mustAttuneBeforeEquip } from "@/lib/compendium/equipment-attunement"
import { resolveCharacterEquipment } from "@/lib/compendium/equipment-base-selection"
import { collectSheetActions } from "@/lib/character/sheet-actions"
import { SHEET_STATUS_ROW, SHEET_BANNER_BADGE, SHEET_BANNER_BUTTON, SHEET_BANNER_CHIP, SHEET_ABILITIES_PANEL, SHEET_COMBAT_PANEL, SHEET_EQUIPMENT_PANEL, SHEET_FEATURES_PANEL, SHEET_DETAILS_PANEL, SHEET_MAIN_CLASS, SHEET_TAB_CONTENT_CLASS, abilityScoreBoxClass, abilityScoreValueClass } from "@/lib/character/sheet-status-colors"
import { useAppTheme } from "@/components/providers/app-theme-provider"
import { featureShowsOnSheetTab } from "@/lib/compendium/feature-sheet-display"
import { compendiumEditHref } from "@/lib/compendium/edit-href"
import { resolvePsiLimit } from "@/lib/character/resolve-psi-limit"
import { collectAlternateAbilityChecks } from "@/lib/character/alternate-ability-checks"
import { collectSubclassAlwaysPreparedSpells } from "@/lib/character/subclass-granted-spells"
import { featureChoiceKey } from "@/lib/builder/choices"
import { filterCustomAbilitiesForCharacterSheet } from "@/lib/character/filter-sheet-custom-abilities"
import { loadModifierCatalog } from "@/lib/compendium/ensure-modifier-catalog"
import { loadCustomAbilitiesForGameplay } from "@/lib/compendium/load-custom-abilities-for-gameplay"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { suggestEquipmentLoadout } from "@/lib/builder/equipment-loadout"
import { getEquipmentCostGp } from "@/lib/builder/equipment-utils"
import {
  getEffectiveArmorProficiencies,
  getEffectiveWeaponProficiencies,
} from "@/lib/compendium/background-proficiencies"
import { SRD_CONDITIONS, getConditionDescription } from "@/lib/srd/condition-descriptions"
import { isIncapacitatedByConditions } from "@/lib/srd/condition-roll-effects"
import {
  getExhaustionDerivedEffects,
  clampExhaustionLevel,
  EXHAUSTION_MAX_LEVEL,
  getExhaustionEffectSummary,
} from "@/lib/srd/exhaustion-effects"
import { BLOODIED_DESCRIPTION, isBloodied } from "@/lib/character/bloodied"
import { buildIncomingAttackNotes } from "@/lib/character/incoming-attack-notes"
import {
  buildSheetPlayStateFromSheet,
  loadSheetSessionState,
  normalizeSheetPlayState,
  saveSheetSessionState,
} from "@/lib/character/sheet-session-state"
import {
  applySheetToggleChange,
  PRIMORDIAL_ASPECT_TOGGLES,
  sheetToggleDefinitionsFromNewToggles,
  type SheetToggleDefinition,
} from "@/lib/compendium/sheet-toggle-registry"
import {
  buildCharacterSheetToggleDefinitions,
  collectReferencedSheetToggleIds,
} from "@/lib/character/collect-referenced-sheet-toggles"
import {
  currentInfluencePoints,
  characterHasInfluencePointsMechanic,
  influenceCap,
  spendInfluencePoints,
} from "@/lib/character/influence-points"
import { resolveSpecializedElement } from "@/lib/character/resolve-specialized-element"
import { tickAccumulatedResources, type RealTimeCooldownState } from "@/lib/character/real-time-recharge"
import type { AccumulatedResourceState } from "@/lib/character/sheet-play-state"
import { collectMagicItemPowers, magicItemToggleDefinitions } from "@/lib/character/magic-item-powers"
import { applyActivationUsesSpend } from "@/lib/character/magic-item-activation"
import { ABILITY_SCORE_KEYS, resolveUsesConfig, type AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import { ConditionInfoTip } from "@/components/character-sheet/condition-info-tip"
import { SkillExpertiseIndicator } from "@/components/character-sheet/skill-expertise-indicator"
import {
  DefaultActionsButton,
  DefaultActionsOverlay,
} from "@/components/character-sheet/sheet-default-actions-panel"
import { SheetRestButtons } from "@/components/character-sheet/sheet-rest-buttons"
import { applySheetRest, applyInitiativeResourceRecharge } from "@/lib/character/sheet-rest"
import { buildHitDicePool, recoverHitDiceOnLongRest } from "@/lib/character/hit-dice"
import type { Feature, RestType } from "@/lib/types"
import type { CharacterCompanionState } from "@/lib/character/companion-stat-block"
import {
  companionStateFromResolved,
  mergeCompanionState,
  resolveCharacterCompanions,
  activePolymorphCompanion,
} from "@/lib/character/resolve-companions"
import { getDerivedCharacterBreakdowns, breakdownLines } from "@/lib/character/get-derived-breakdowns"
import { StatExplainPopover } from "@/components/character-sheet/stat-explain-popover"
import { isFindFamiliarSpell } from "@/lib/character/srd-familiar"
import { CompanionStatPanel } from "@/components/character-sheet/companion-stat-panel"
import { CompanionAttackRedirect } from "@/components/character-sheet/companion-attack-redirect"
import { SheetPersistentStatsBar, SheetInitiativeBlock } from "@/components/character-sheet/sheet-persistent-stats-bar"
import { SheetTabNav, type SheetTab } from "@/components/character-sheet/sheet-tab-nav"
import { SiteFooter } from "@/components/site-footer"
import { WILD_SHAPE_DIRECTIONS, WILD_SHAPE_GAME_STATISTICS } from "@/lib/character/srd-beast-forms"
import { asCompendiumRow, asCompendiumRows, castCompendiumRow } from "@/lib/data/types"

const SpellDetailOverlay = dynamic(
  () =>
    import("@/components/character-sheet/spell-detail-overlay").then((mod) => ({
      default: mod.SpellDetailOverlay,
    })),
)

const EquipmentDetailOverlay = dynamic(
  () =>
    import("@/components/character-sheet/equipment-detail-overlay").then((mod) => ({
      default: mod.EquipmentDetailOverlay,
    })),
)

interface CharacterWithRelations extends Character {
  classes?: DndClass
  class_list?: CharacterClassDetail[]
  species?: Species
  backgrounds?: Background
  subclasses?: Subclass
}

type CharacterQueryRow = CharacterWithRelations & Record<string, unknown>

function parseCharacterQueryRow(data: unknown): CharacterQueryRow | null {
  return asCompendiumRow<CharacterQueryRow>(data)
}

const ABILITY_LABELS: Record<string, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
}

const SHEET_SELECTABLE_CONDITIONS = SRD_CONDITIONS.filter(
  (condition) => condition.name !== "Exhaustion",
)

const EXHAUSTION_CONDITION = SRD_CONDITIONS.find((condition) => condition.name === "Exhaustion")

const EXHAUSTION_LEVELS = Array.from({ length: EXHAUSTION_MAX_LEVEL + 1 }, (_, level) => level)

function pickInitialPlayState(
  dbState: import("@/lib/character/sheet-play-state").CharacterSheetPlayState | null | undefined,
  sessionState: ReturnType<typeof loadSheetSessionState>,
) {
  const normalizedDb = normalizeSheetPlayState(dbState)
  if (normalizedDb.savedAt) return normalizedDb
  if (sessionState) return sessionState
  return normalizedDb
}

function buildClassDetailList(character: CharacterWithRelations): CharacterClassDetail[] {
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

function CollapsibleDetailField({
  label,
  text,
}: {
  label: string
  text: string | null | undefined
}) {
  const [expanded, setExpanded] = useState(false)
  if (!text?.trim()) return null
  const isLong = text.length > 160
  const display = !isLong || expanded ? text : `${text.slice(0, 160)}…`

  return (
    <div className="border border-border rounded-lg p-3 bg-muted/40">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="text-sm font-bold text-foreground">{label}</h3>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-semibold text-primary hover:underline shrink-0"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{display}</p>
    </div>
  )
}

/**
 * Collapse features that share the same name (e.g. Ability Score Improvement taken at several
 * levels) into a single entry that records every level it was gained. Order is preserved by first
 * appearance, and the first instance's data is used for the card body.
 */
function dedupeFeaturesByName(
  features: import("@/lib/types").Feature[],
): { feature: import("@/lib/types").Feature; levels: number[] }[] {
  const byName = new Map<string, { feature: import("@/lib/types").Feature; levels: number[] }>()
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

/** A feature/trait card whose body can be accordioned away, leaving just the title row. */
function CollapsibleFeatureCard({
  name,
  level,
  levels,
  description,
  collapsedLines,
  children,
}: {
  name: string
  level?: number | null
  levels?: number[]
  description?: string | null
  collapsedLines?: number
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  const levelLabel =
    levels && levels.length
      ? levels.map((value) => `Lv ${value}`).join(", ")
      : level != null
        ? `Lv ${level}`
        : null
  return (
    <div className="bg-muted rounded-lg text-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 p-2 text-left hover:bg-muted/70 transition-colors"
        aria-expanded={open}
      >
        <span className="font-bold min-w-0">
          {name}
          {levelLabel ? (
            <span className="text-muted-foreground font-normal"> ({levelLabel})</span>
          ) : null}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform ${
            open ? "" : "-rotate-90"
          }`}
        />
      </button>
      {open && (description || children) ? (
        <div className="px-2 pb-2">
          {description ? (
            <ExpandableDescription
              text={description}
              className="text-muted-foreground"
              collapsedLines={collapsedLines}
            />
          ) : null}
          {children}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Dropdown control for a feature choice that the rules let you swap when you finish a rest
 * (e.g. Circle of the Land's land type). Changing the selection re-derives the character so the
 * chosen option's effects (spells, resistances, etc.) take effect immediately.
 */
function RestSwappableChoiceControl({
  feature,
  classId,
  picks,
  onChange,
}: {
  feature: import("@/lib/types").Feature
  classId: string
  picks: string[]
  onChange: (key: string, next: string[]) => void
}) {
  const choices = feature.choices
  if (!choices?.swappableOnRest || !choices.options?.length) return null
  const key = featureChoiceKey(classId, feature.name, feature.level)
  const count = Math.max(1, choices.count ?? 1)
  const restLabel = choices.swapRestType === "short" ? "Short Rest" : "Long Rest"

  const setSlot = (index: number, value: string) => {
    const next = [...picks]
    if (value) next[index] = value
    else next.splice(index, 1)
    onChange(key, next.filter(Boolean))
  }

  return (
    <div className="mt-2 rounded-md border border-border bg-background/60 p-2 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {choices.category || "Choice"} · choose on a {restLabel}
      </p>
      {Array.from({ length: count }).map((_, index) => (
        <select
          key={index}
          value={picks[index] ?? ""}
          onChange={(event) => setSlot(index, event.target.value)}
          className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs"
        >
          <option value="">Choose…</option>
          {choices.options!.map((option) => (
            <option key={option.name} value={option.name}>
              {option.name}
            </option>
          ))}
        </select>
      ))}
    </div>
  )
}

export default function CharacterSheetClient({ id }: { id: string }) {
  const { theme } = useAppTheme()
  const [character, setCharacter] = useState<CharacterWithRelations | null>(null)
  const [spells, setSpells] = useState<Spell[]>([])
  const [spellCatalog, setSpellCatalog] = useState<Spell[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [customAbilities, setCustomAbilities] = useState<CustomAbility[]>([])
  const [creatures, setCreatures] = useState<Creature[]>([])
  const [companionState, setCompanionState] = useState<CharacterCompanionState[]>([])
  const [featureChoicePicks, setFeatureChoicePicks] = useState<Record<string, string[]>>({})
  const [characterFeats, setCharacterFeats] = useState<Feat[]>([])
  const [originFeat, setOriginFeat] = useState<Feat | null>(null)
  const [modifierCatalog, setModifierCatalog] = useState<ModifierCatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<SheetTab>("abilities")
  const [currentHp, setCurrentHp] = useState(0)
  const [tempHp, setTempHp] = useState(0)
  const [activeConditions, setActiveConditions] = useState<string[]>([])
  const [exhaustionLevel, setExhaustionLevel] = useState(0)
  const [activeSheetToggleIds, setActiveSheetToggleIds] = useState<string[]>([])
  const [sessionHydrated, setSessionHydrated] = useState(false)
  const [acFormulaPick, setAcFormulaPick] = useState<string | null>(null)
  const [conditionDropdownOpen, setConditionDropdownOpen] = useState(false)
  const [sheetMenuOpen, setSheetMenuOpen] = useState(false)
  const [portraitZoomOpen, setPortraitZoomOpen] = useState(false)
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState("")
  const [characterGold, setCharacterGold] = useState(0)
  const [addEquipmentOpen, setAddEquipmentOpen] = useState(false)
  const [equipmentCatalog, setEquipmentCatalog] = useState<Equipment[]>([])
  const [equippedArmorId, setEquippedArmorId] = useState<string | null>(null)
  const [equippedShieldId, setEquippedShieldId] = useState<string | null>(null)
  const [equippedWeaponId, setEquippedWeaponId] = useState<string | null>(null)
  const [equippedOffHandWeaponId, setEquippedOffHandWeaponId] = useState<string | null>(null)
  const [usedSpellSlotsByKey, setUsedSpellSlotsByKey] = useState<Record<string, number[]>>({})
  const [usedResourcesById, setUsedResourcesById] = useState<Record<string, number>>({})
  const [rechargeCapsByResourceId, setRechargeCapsByResourceId] = useState<Record<string, number>>({})
  const [selectedMetamagicIds, setSelectedMetamagicIds] = useState<string[]>([])
  const [hasInspiration, setHasInspiration] = useState(false)
  const [deathSaves, setDeathSaves] = useState({ successes: 0, failures: 0 })
  const [attunedItemIds, setAttunedItemIds] = useState<string[]>([])
  const [equipmentBaseSelections, setEquipmentBaseSelections] = useState<Record<string, string>>({})
  const [usedActionUsesById, setUsedActionUsesById] = useState<Record<string, number>>({})
  const [usedHitDiceByClassId, setUsedHitDiceByClassId] = useState<Record<string, number>>({})
  const [shortRestHitDiceOpen, setShortRestHitDiceOpen] = useState(false)
  const [realTimeCooldowns, setRealTimeCooldowns] = useState<RealTimeCooldownState>({})
  const [accumulatedResources, setAccumulatedResources] = useState<
    Record<string, AccumulatedResourceState>
  >({})
  const [playStateSaveStatus, setPlayStateSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle")
  const [defaultActionsContext, setDefaultActionsContext] = useState<"abilities" | "combat" | null>(
    null,
  )
  const conditionButtonRef = useRef<HTMLButtonElement>(null)
  const conditionMenuRef = useRef<HTMLDivElement>(null)
  const sheetMenuButtonRef = useRef<HTMLButtonElement>(null)
  const [conditionMenuPos, setConditionMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  )
  const [sheetMenuPos, setSheetMenuPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const fetchCharacter = async () => {
      const db = createClient()

      const { data, error } = await db
        .from("characters")
        .select(`*, classes (*), species (*), backgrounds (*), subclasses (*)`)
        .eq("id", id)
        .single()

      const row = parseCharacterQueryRow(data)
      if (!error && row) {
        setCharacter(row)
        setCharacterGold(typeof row.gold === "number" ? row.gold : 0)
        setEquippedArmorId(row.equipped_armor_id ?? null)
        setEquippedShieldId(row.equipped_shield_id ?? null)
        setEquippedWeaponId(row.equipped_weapon_id ?? null)
        setEquippedOffHandWeaponId(row.equipped_off_hand_weapon_id ?? null)
        setAttunedItemIds(row.attuned_item_ids ?? [])
        setEquipmentBaseSelections(row.equipment_base_selections ?? {})
        setCurrentHp(row.hit_points || row.hit_point_max || 0)
        setCompanionState(row.companion_state ?? [])
        setFeatureChoicePicks(row.feature_choice_picks ?? {})

        const playState = pickInitialPlayState(
          row.sheet_state,
          loadSheetSessionState(id),
        )
        setActiveConditions(playState.activeConditions)
        setExhaustionLevel(playState.exhaustionLevel)
        setActiveSheetToggleIds(playState.activeSheetToggleIds)
        setUsedResourcesById(playState.usedResourcesById)
        setUsedActionUsesById(playState.usedActionUsesById)
        setUsedSpellSlotsByKey(playState.usedSpellSlotsByKey)
        setRechargeCapsByResourceId(playState.rechargeCapsByResourceId)
        setUsedHitDiceByClassId(playState.usedHitDiceByClassId)
        if (playState.currentHp != null) setCurrentHp(playState.currentHp)
        setTempHp(playState.tempHp)
        setDeathSaves(playState.deathSaves)
        setHasInspiration(playState.hasInspiration)
        setRealTimeCooldowns(playState.realTimeCooldowns)
        setAccumulatedResources(tickAccumulatedResources(playState.accumulatedResources))
        setSessionHydrated(true)

        if (row.spell_ids?.length) {
          const { data: spellData } = await db.from("spells").select("*").in("id", row.spell_ids)
          if (spellData) setSpells(asCompendiumRows<Spell & Record<string, unknown>>(spellData) as Spell[])
        }

        const { data: spellCatalogData } = await db.from("spells").select("*")
        if (spellCatalogData) {
          setSpellCatalog(asCompendiumRows<Spell & Record<string, unknown>>(spellCatalogData) as Spell[])
        }

        if (row.equipment_ids?.length) {
          const { data: equipmentData } = await db.from("equipment").select("*").in("id", row.equipment_ids)
          if (equipmentData) {
            setEquipment(asCompendiumRows<Equipment & Record<string, unknown>>(equipmentData) as Equipment[])
          }
        }

        const { data: catalogData } = await db.from("equipment").select("*").order("name")
        if (catalogData) {
          setEquipmentCatalog(asCompendiumRows<Equipment & Record<string, unknown>>(catalogData) as Equipment[])
        }

        const catalog = await loadModifierCatalog(db)
        setModifierCatalog(catalog)
        setCustomAbilities(await loadCustomAbilitiesForGameplay(db))

        const { data: creatureData } = await db.from("creatures").select("*").order("name")
        if (creatureData) {
          setCreatures(asCompendiumRows<Creature & Record<string, unknown>>(creatureData) as Creature[])
        }

        const featIds = (row.feat_ids ?? []).filter(Boolean)
        if (featIds.length) {
          const uniqueFeatIds = [...new Set(featIds)]
          const { data: featData } = await db.from("feats").select("*").in("id", uniqueFeatIds)
          if (featData) {
            const rows = asCompendiumRows<Feat & Record<string, unknown>>(featData) as Feat[]
            const byId = new Map(rows.map((feat) => [feat.id, feat]))
            setCharacterFeats(
              featIds.map((id) => byId.get(id)).filter((feat): feat is Feat => Boolean(feat)),
            )
          }
        }

        const bg = row.backgrounds
        const featurePicks = row.feature_choice_picks ?? {}
        const effectiveOriginGrant = getEffectiveBackgroundFeatGranted(bg, featurePicks)
        if (effectiveOriginGrant) {
          const { data: featCatalog } = await db.from("feats").select("*")
          const resolved = findBackgroundGrantedFeat(
            effectiveOriginGrant,
            asCompendiumRows<Feat & Record<string, unknown>>(featCatalog ?? []) as Feat[],
          )
          if (resolved) {
            const full =
              (featCatalog as unknown as Feat[] | null)?.find((feat) => feat.id === resolved.id) ??
              resolved
            setOriginFeat(full as Feat)
          }
        }
      }
      setLoading(false)
    }

    fetchCharacter()
  }, [id])

  useEffect(() => {
    if (!sessionHydrated) return
    saveSheetSessionState(
      id,
      buildSheetPlayStateFromSheet({
        activeConditions,
        exhaustionLevel,
        activeSheetToggleIds,
        usedResourcesById,
        usedActionUsesById,
        usedSpellSlotsByKey,
        rechargeCapsByResourceId,
        usedHitDiceByClassId,
        currentHp,
        tempHp,
        deathSaves,
        hasInspiration,
        realTimeCooldowns,
        accumulatedResources: tickAccumulatedResources(accumulatedResources),
        savedAt: null,
      }),
    )
  }, [
    id,
    sessionHydrated,
    activeConditions,
    exhaustionLevel,
    activeSheetToggleIds,
    usedResourcesById,
    usedActionUsesById,
    usedSpellSlotsByKey,
    rechargeCapsByResourceId,
    usedHitDiceByClassId,
    currentHp,
    tempHp,
    deathSaves,
    hasInspiration,
    realTimeCooldowns,
    accumulatedResources,
  ])

  const equipmentMagicContext = useMemo(
    () => ({
      equipment,
      equippedArmorId,
      equippedShieldId,
      equippedWeaponId,
      equippedOffHandWeaponId,
      attunedItemIds,
      modifierCatalog,
    }),
    [
      equipment,
      equippedArmorId,
      equippedShieldId,
      equippedWeaponId,
      equippedOffHandWeaponId,
      attunedItemIds,
      modifierCatalog,
    ],
  )

  const magicItemPowers = useMemo(
    () => collectMagicItemPowers(equipmentMagicContext),
    [equipmentMagicContext],
  )

  const characterBuildInputs = useMemo(() => {
    if (!character) return null
    const classList = character.class_list ?? []
    const classesFromList = classList.map((entry) => entry.class).filter(Boolean) as unknown as DndClass[]
    const subclassesFromList = classList
      .map((entry) => entry.subclass)
      .filter(Boolean) as unknown as Subclass[]
    const inputs = buildInputsFromSavedCharacter({
      character,
      classes: classesFromList.length ? classesFromList : character.classes ? [character.classes] : [],
      subclasses: subclassesFromList.length
        ? subclassesFromList
        : character.subclasses
          ? [character.subclasses]
          : [],
      species: character.species,
      background: character.backgrounds,
      feats: characterFeats,
      equipment,
      equipmentCatalog,
      modifierCatalog,
    })
    if (!inputs) return null
    const savedAcPick = character.modifier_player_picks?.ac_formula?.[0] ?? null
    const baseMaxHp = character.hit_point_max ?? 0
    const exhaustionFx = getExhaustionDerivedEffects(exhaustionLevel)
    const maxHpForHalf =
      exhaustionFx.hpMaxMultiplier < 1
        ? Math.max(1, Math.floor(baseMaxHp * exhaustionFx.hpMaxMultiplier))
        : baseMaxHp
    const effectiveSheetToggles = new Set(activeSheetToggleIds)
    if (maxHpForHalf > 0 && currentHp <= Math.floor(maxHpForHalf / 2)) {
      effectiveSheetToggles.add("below_half_hp")
    }
    const resolvedFeatures: Feature[] = []
    for (const entry of classList) {
      const classLevel = entry.row.level ?? 1
      for (const feature of entry.class?.features ?? []) {
        if ((feature.level ?? 1) <= classLevel) resolvedFeatures.push(feature as Feature)
      }
      for (const feature of entry.subclass?.features ?? []) {
        if ((feature.level ?? 1) <= classLevel) resolvedFeatures.push(feature as Feature)
      }
    }
    return {
      ...inputs,
      exhaustionLevel,
      currentHp,
      resolvedFeatures,
      modifierPlayerPicks: {
        ...inputs.modifierPlayerPicks,
        ...(acFormulaPick ?? savedAcPick
          ? { ac_formula: [acFormulaPick ?? savedAcPick!] }
          : {}),
      },
      featureChoicePicks,
      equipmentCatalog,
      equippedArmorId,
      equippedShieldId,
      equippedWeaponId,
      equippedOffHandWeaponId,
      attunedItemIds,
      equipmentBaseSelections,
      activeSheetToggles: effectiveSheetToggles,
      activeConditions,
    }
  }, [
    character,
    characterFeats,
    equipment,
    equipmentCatalog,
    modifierCatalog,
    featureChoicePicks,
    equippedArmorId,
    equippedShieldId,
    equippedWeaponId,
    equippedOffHandWeaponId,
    attunedItemIds,
    equipmentBaseSelections,
    activeSheetToggleIds,
    activeConditions,
    exhaustionLevel,
    currentHp,
    acFormulaPick,
  ])

  const derived = useMemo(() => {
    if (!characterBuildInputs) return null
    return computeDerivedCharacter(characterBuildInputs)
  }, [characterBuildInputs])

  const statBreakdowns = useMemo(() => {
    if (!characterBuildInputs) return undefined
    return getDerivedCharacterBreakdowns(characterBuildInputs)
  }, [characterBuildInputs])

  const persistEquipmentLoadout = useCallback(
    async (next: {
      armorId?: string | null
      shieldId?: string | null
      weaponId?: string | null
      offHandWeaponId?: string | null
    }) => {
      if (!character) return
      const loadout = {
        armorId: next.armorId !== undefined ? next.armorId : equippedArmorId,
        shieldId: next.shieldId !== undefined ? next.shieldId : equippedShieldId,
        weaponId: next.weaponId !== undefined ? next.weaponId : equippedWeaponId,
        offHandWeaponId:
          next.offHandWeaponId !== undefined ? next.offHandWeaponId : equippedOffHandWeaponId,
      }
      const nextAc = characterBuildInputs
        ? deriveArmorClassForLoadout(characterBuildInputs, loadout)
        : character.armor_class
      const db = createClient()
      const { data, error } = await db
        .from("characters")
        .update({
          equipped_armor_id: loadout.armorId,
          equipped_shield_id: loadout.shieldId,
          equipped_weapon_id: loadout.weaponId,
          equipped_off_hand_weapon_id: loadout.offHandWeaponId,
          armor_class: nextAc,
        })
        .eq("id", character.id)
        .select(`*, classes (*), species (*), backgrounds (*), subclasses (*)`)
        .single()
      const row = parseCharacterQueryRow(data)
      if (!error && row) {
        setCharacter(row)
        setEquippedArmorId(loadout.armorId)
        setEquippedShieldId(loadout.shieldId)
        setEquippedWeaponId(loadout.weaponId)
        setEquippedOffHandWeaponId(loadout.offHandWeaponId)
      }
    },
    [character, characterBuildInputs, equippedArmorId, equippedShieldId, equippedWeaponId, equippedOffHandWeaponId],
  )

  const persistGold = useCallback(
    async (gold: number) => {
      if (!character) return
      const nextGold = Math.max(0, gold)
      setCharacterGold(nextGold)
      const db = createClient()
      const { data, error } = await db
        .from("characters")
        .update({ gold: nextGold })
        .eq("id", character.id)
        .select(`*, classes (*), species (*), backgrounds (*), subclasses (*)`)
        .single()
      const row = parseCharacterQueryRow(data)
      if (!error && row) setCharacter(row)
    },
    [character],
  )

  const persistAttunement = useCallback(
    async (nextAttunedIds: string[]) => {
      if (!character) return
      setAttunedItemIds(nextAttunedIds)
      const db = createClient()
      const { data, error } = await db
        .from("characters")
        .update({ attuned_item_ids: nextAttunedIds })
        .eq("id", character.id)
        .select(`*, classes (*), species (*), backgrounds (*), subclasses (*)`)
        .single()
      const row = parseCharacterQueryRow(data)
      if (!error && row) setCharacter(row)
    },
    [character],
  )

  const persistFeatureChoicePicks = useCallback(
    async (key: string, picks: string[]) => {
      if (!character) return
      const next = { ...featureChoicePicks, [key]: picks }
      setFeatureChoicePicks(next)
      const db = createClient()
      await db.from("characters").update({ feature_choice_picks: next }).eq("id", character.id)
    },
    [character, featureChoicePicks],
  )

  const persistBaseSelection = useCallback(
    async (magicItemId: string, baseEquipmentId: string) => {
      if (!character) return
      const nextSelections = { ...equipmentBaseSelections, [magicItemId]: baseEquipmentId }
      setEquipmentBaseSelections(nextSelections)
      const db = createClient()
      const { data, error } = await db
        .from("characters")
        .update({ equipment_base_selections: nextSelections })
        .eq("id", character.id)
        .select(`*, classes (*), species (*), backgrounds (*), subclasses (*)`)
        .single()
      const row = parseCharacterQueryRow(data)
      if (!error && row) setCharacter(row)
    },
    [character, equipmentBaseSelections],
  )

  const openAddEquipmentOverlay = useCallback(async () => {
    const db = createClient()
    const { data } = await db.from("equipment").select("*").order("name")
    if (data) setEquipmentCatalog(data as unknown as Equipment[])
    setAddEquipmentOpen(true)
  }, [])

  const handleAddEquipmentFromCatalog = useCallback(
    async (
      item: Equipment,
      options: { deductCost: boolean; selectedBaseId?: string },
    ) => {
      if (!character) return
      const costGp = options.deductCost ? getEquipmentCostGp(item) : 0
      if (options.deductCost && characterGold < costGp) return

      const nextIds = [...new Set([...(character.equipment_ids ?? []), item.id])]
      const nextGold = options.deductCost ? characterGold - costGp : characterGold
      const nextSelections = { ...equipmentBaseSelections }
      if (options.selectedBaseId) {
        nextSelections[item.id] = options.selectedBaseId
      }

      const db = createClient()
      const { data, error } = await db
        .from("characters")
        .update({
          equipment_ids: nextIds,
          gold: nextGold,
          equipment_base_selections: nextSelections,
        })
        .eq("id", character.id)
        .select(`*, classes (*), species (*), backgrounds (*), subclasses (*)`)
        .single()

      if (error || !data) return

      const row = parseCharacterQueryRow(data)
      if (!row) return

      setCharacter(row)
      setCharacterGold(nextGold)
      setEquipmentBaseSelections(nextSelections)
      setEquipment((prev) => (prev.some((e) => e.id === item.id) ? prev : [...prev, item]))
    },
    [character, characterGold, equipmentBaseSelections],
  )

  useEffect(() => {
    if (!character || !equipment.length) return
    if (equippedArmorId || equippedShieldId || equippedWeaponId || equippedOffHandWeaponId) return
    const suggestion = suggestEquipmentLoadout(character.equipment_ids ?? [], equipment)
    if (suggestion.armorId || suggestion.shieldId || suggestion.weaponId) {
      void persistEquipmentLoadout(suggestion)
    }
  }, [character, equipment, equippedArmorId, equippedShieldId, equippedWeaponId, equippedOffHandWeaponId, persistEquipmentLoadout])

  useEffect(() => {
    if (!character || !equipment.length) return
    const byId = new Map(equipment.map((item) => [item.id, item]))
    const clears: {
      armorId?: string | null
      shieldId?: string | null
      weaponId?: string | null
      offHandWeaponId?: string | null
    } = {}
    const armor = equippedArmorId ? byId.get(equippedArmorId) : undefined
    if (
      equippedArmorId &&
      armor &&
      mustAttuneBeforeEquip(armor) &&
      !attunedItemIds.includes(equippedArmorId)
    ) {
      clears.armorId = null
    }
    const shield = equippedShieldId ? byId.get(equippedShieldId) : undefined
    if (
      equippedShieldId &&
      shield &&
      mustAttuneBeforeEquip(shield) &&
      !attunedItemIds.includes(equippedShieldId)
    ) {
      clears.shieldId = null
    }
    const weapon = equippedWeaponId ? byId.get(equippedWeaponId) : undefined
    if (
      equippedWeaponId &&
      weapon &&
      mustAttuneBeforeEquip(weapon) &&
      !attunedItemIds.includes(equippedWeaponId)
    ) {
      clears.weaponId = null
    }
    const offHandWeapon = equippedOffHandWeaponId ? byId.get(equippedOffHandWeaponId) : undefined
    if (
      equippedOffHandWeaponId &&
      offHandWeapon &&
      mustAttuneBeforeEquip(offHandWeapon) &&
      !attunedItemIds.includes(equippedOffHandWeaponId)
    ) {
      clears.offHandWeaponId = null
    }
    if (Object.keys(clears).length > 0) {
      void persistEquipmentLoadout(clears)
    }
  }, [
    character,
    equipment,
      equippedArmorId,
      equippedShieldId,
      equippedWeaponId,
      equippedOffHandWeaponId,
      attunedItemIds,
    persistEquipmentLoadout,
  ])

  const classDetails = useMemo(
    () => (character ? buildClassDetailList(character) : []),
    [character],
  )

  const sheetClassFeatures = useMemo(() => {
    const features: Feature[] = []
    for (const entry of classDetails) {
      for (const feature of entry.class?.features ?? []) {
        if ((feature.level ?? 1) <= entry.row.level) features.push(feature)
      }
      for (const feature of entry.subclass?.features ?? []) {
        if ((feature.level ?? 1) <= entry.row.level) features.push(feature)
      }
    }
    return features
  }, [classDetails])

  const equipmentById = useMemo(
    () => new Map(equipment.map((item) => [item.id, item])),
    [equipment],
  )

  const referencedSheetToggleIds = useMemo(
    () =>
      collectReferencedSheetToggleIds({
        features: sheetClassFeatures,
        feats: characterFeats,
        originFeat,
        species: character?.species ?? null,
        customAbilities,
        magicItemPowers,
        catalog: modifierCatalog,
      }),
    [
      sheetClassFeatures,
      characterFeats,
      originFeat,
      character?.species,
      customAbilities,
      magicItemPowers,
      modifierCatalog,
    ],
  )

  const sheetToggleDefinitions = useMemo((): SheetToggleDefinition[] => {
    const dynamic: SheetToggleDefinition[] = []
    const hasElementalMind = classDetails.some((entry) =>
      /elemental mind/i.test(entry.subclass?.name ?? ""),
    )
    if (hasElementalMind) dynamic.push(...PRIMORDIAL_ASPECT_TOGGLES)
    dynamic.push(...magicItemToggleDefinitions(magicItemPowers, equipmentById))
    for (const entry of classDetails) {
      dynamic.push(...sheetToggleDefinitionsFromNewToggles(entry.class?.new_toggles))
      dynamic.push(...sheetToggleDefinitionsFromNewToggles(entry.subclass?.new_toggles))
    }
    return buildCharacterSheetToggleDefinitions(referencedSheetToggleIds, dynamic)
  }, [classDetails, referencedSheetToggleIds, magicItemPowers, equipmentById])

  const manualSheetToggles = useMemo(
    () =>
      sheetToggleDefinitions.filter(
        (toggle) => toggle.id !== "below_half_hp" && toggle.id !== "quarry_marked",
      ),
    [sheetToggleDefinitions],
  )

  const ragingSheetToggle = useMemo(
    () => manualSheetToggles.find((toggle) => toggle.id === "while_raging") ?? null,
    [manualSheetToggles],
  )

  const innateSorcerySheetToggle = useMemo(
    () => manualSheetToggles.find((toggle) => toggle.id === "while_innate_sorcery_active") ?? null,
    [manualSheetToggles],
  )

  const isSorcerer = useMemo(
    () => classDetails.some((entry) => /^sorcerer$/i.test(entry.class?.name ?? "")),
    [classDetails],
  )

  const secondaryManualSheetToggles = useMemo(
    () =>
      manualSheetToggles.filter(
        (toggle) => toggle.id !== "while_raging" && toggle.id !== "while_innate_sorcery_active",
      ),
    [manualSheetToggles],
  )

  const specializedElement = useMemo(
    () => resolveSpecializedElement(featureChoicePicks),
    [featureChoicePicks],
  )

  const toggleSheetToggle = useCallback(
    (toggleId: string) => {
      setActiveSheetToggleIds((prev) =>
        applySheetToggleChange(prev, toggleId, sheetToggleDefinitions),
      )
    },
    [sheetToggleDefinitions],
  )

  const renderManualToggleButton = useCallback(
    (toggle: { id: string; label: string }) => {
      const active = activeSheetToggleIds.includes(toggle.id)
      const isRagingToggle = toggle.id === "while_raging"
      const isInnateSorceryToggle = toggle.id === "while_innate_sorcery_active"
      const label = active ? toggle.label : `Not ${toggle.label.toLowerCase()}`
      const RagingIcon = active ? Angry : Smile
      return (
        <button
          key={toggle.id}
          type="button"
          aria-pressed={active}
          onClick={() => toggleSheetToggle(toggle.id)}
          className={`min-h-11 rounded-lg border px-3 text-sm font-semibold transition-colors ${
            active
              ? isInnateSorceryToggle
                ? "border-violet-500/40 bg-violet-500/15 text-violet-800 dark:text-violet-200"
                : SHEET_BANNER_BUTTON.toggleActive
              : SHEET_BANNER_BUTTON.toggleIdle
          }`}
        >
          {isRagingToggle ? (
            <span className="inline-flex items-center gap-1.5">
              <RagingIcon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </span>
          ) : isInnateSorceryToggle ? (
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </span>
          ) : (
            label
          )}
        </button>
      )
    },
    [activeSheetToggleIds, toggleSheetToggle],
  )

  const buildCurrentPlayState = useCallback(
    (savedAt: string | null = null) =>
      buildSheetPlayStateFromSheet({
        activeConditions,
        exhaustionLevel,
        activeSheetToggleIds,
        usedResourcesById,
        usedActionUsesById,
        usedSpellSlotsByKey,
        rechargeCapsByResourceId,
        usedHitDiceByClassId,
        currentHp,
        tempHp,
        deathSaves,
        hasInspiration,
        realTimeCooldowns,
        accumulatedResources: tickAccumulatedResources(accumulatedResources),
        savedAt,
      }),
    [
      activeConditions,
      exhaustionLevel,
      activeSheetToggleIds,
      usedResourcesById,
      usedActionUsesById,
      usedSpellSlotsByKey,
      rechargeCapsByResourceId,
      usedHitDiceByClassId,
      currentHp,
      tempHp,
      deathSaves,
      hasInspiration,
      realTimeCooldowns,
      accumulatedResources,
    ],
  )

  const persistPlayStateToDb = useCallback(async () => {
    if (!character) return
    setPlayStateSaveStatus("saving")
    const savedAt = new Date().toISOString()
    const state = buildCurrentPlayState(savedAt)
    const db = createClient()
    const { data, error } = await db
      .from("characters")
      .update({
        sheet_state: state,
        hit_points: currentHp,
      })
      .eq("id", character.id)
      .select(`*, classes (*), species (*), backgrounds (*), subclasses (*)`)
      .single()
    if (error) {
      setPlayStateSaveStatus("error")
      return
    }
    saveSheetSessionState(character.id, state)
    const row = parseCharacterQueryRow(data)
    if (row) setCharacter(row)
    setPlayStateSaveStatus("saved")
    window.setTimeout(() => setPlayStateSaveStatus("idle"), 2500)
  }, [character, buildCurrentPlayState, currentHp])

  const spellSlotTables = useMemo(() => {
    if (!classDetails.length) return []
    return getMulticlassSpellSlotTables(
      classDetails
        .map((entry) => ({
          className: entry.class?.name ?? "",
          classLevel: entry.row.level,
          spellcasting: resolveEffectiveClassSpellcasting(entry),
        }))
        .filter((entry) => entry.spellcasting),
    )
  }, [classDetails])

  const primarySpellSlotTable = spellSlotTables[0] ?? null

  useEffect(() => {
    if (!spellSlotTables.length) return
    setUsedSpellSlotsByKey((prev) => {
      const next = { ...prev }
      for (const table of spellSlotTables) {
        const key = spellSlotTableKey(table)
        if (!next[key]) next[key] = table.slotsByLevel.map(() => 0)
      }
      return next
    })
  }, [spellSlotTables])

  const resourceEntries = useMemo<ResourceTrackerEntry[]>(() => {
    if (!classDetails.length) return []
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
    return [...entries, ...collectFeatureUsesResources(classDetails, modifierCatalog)]
  }, [classDetails, modifierCatalog])

  const classResourceDieSides = useMemo(
    () => buildClassResourceDieSidesMap(classDetails),
    [classDetails],
  )

  const classResourceSpendKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const entry of classDetails) {
      for (const key of collectClassResourceSpendKeys(entry.class?.features, modifierCatalog)) {
        keys.add(key)
      }
      for (const key of collectClassResourceSpendKeys(entry.subclass?.features, modifierCatalog)) {
        keys.add(key)
      }
    }
    return keys
  }, [classDetails, modifierCatalog])

  const classResourcesById = useMemo(() => {
    const byId = new Map<string, ClassResource>()
    for (const entry of classDetails) {
      if (!entry.class) continue
      for (const resource of resolveClassResourcesForClass(entry.class)) {
        byId.set(resource.id, resource)
      }
    }
    return byId
  }, [classDetails])

  const { spendableResourceEntries, staticResourceEntries } = useMemo(() => {
    const { spendable, static: staticEntries } = partitionResourceTrackerEntries(
      resourceEntries,
      classResourcesById,
      classResourceSpendKeys,
    )
    return {
      spendableResourceEntries: spendable,
      staticResourceEntries: staticEntries,
    }
  }, [resourceEntries, classResourcesById, classResourceSpendKeys])

  const sheetCustomAbilities = useMemo(() => {
    if (!character) return []
    return filterCustomAbilitiesForCharacterSheet(customAbilities, {
      classIds: classDetails.map((entry) => entry.row.class_id),
      classNames: classDetails.map((entry) => entry.class?.name).filter(Boolean) as string[],
      subclassIds: classDetails.map((entry) => entry.row.subclass_id).filter(Boolean) as string[],
      subclassNames: classDetails.map((entry) => entry.subclass?.name).filter(Boolean) as string[],
      speciesId: character.species_id ?? null,
      speciesName: character.species?.name ?? null,
      backgroundId: character.background_id ?? null,
      backgroundName: character.backgrounds?.name ?? null,
      featIds: [
        ...(character.feat_ids ?? []),
        ...characterFeats.map((feat) => feat.id),
        ...(originFeat ? [originFeat.id] : []),
      ],
      featNames: [
        ...characterFeats.map((feat) => feat.name),
        ...(originFeat ? [originFeat.name] : []),
      ],
      equipmentIds: character.equipment_ids ?? [],
      equipmentCategories: equipment.map((item) => item.category),
      spellIds: character.spell_ids ?? [],
    })
  }, [customAbilities, character, classDetails, characterFeats, originFeat, equipment])

  const usesResolveContext = useMemo(
    () => ({
      proficiencyBonus: derived?.proficiencyBonus ?? Math.floor(((character?.level ?? 1) - 1) / 4) + 2,
      abilityModifiers: {
        STR: derived?.abilityMods.strength ?? 0,
        DEX: derived?.abilityMods.dexterity ?? 0,
        CON: derived?.abilityMods.constitution ?? 0,
        INT: derived?.abilityMods.intelligence ?? 0,
        WIS: derived?.abilityMods.wisdom ?? 0,
        CHA: derived?.abilityMods.charisma ?? 0,
      },
    }),
    [derived, character?.level],
  )

  const psiLimit = useMemo(
    () => resolvePsiLimit(classDetails, usesResolveContext),
    [classDetails, usesResolveContext],
  )

  const pointPoolClassDetail = useMemo(() => {
    for (const entry of classDetails) {
      if (entry.class && getPointPoolSpellcasting(entry.class.spellcasting)) return entry
    }
    return null
  }, [classDetails])

  const primarySpellcaster = useMemo(() => {
    if (pointPoolClassDetail) return pointPoolClassDetail
    for (const entry of classDetails) {
      if (entry.class?.spellcasting) return entry
    }
    return null
  }, [classDetails, pointPoolClassDetail])

  const sorceryPointsState = useMemo(() => {
    const pool = pointPoolClassDetail?.class
      ? getPointPoolSpellcasting(pointPoolClassDetail.class.spellcasting)
      : null
    if (pool && pointPoolClassDetail) {
      const resourceId = `${pointPoolClassDetail.row.class_id}_${pool.resource_key}`
      const resourceEntry = resourceEntries.find((entry) => entry.id === resourceId)
      const maxPoints = resourceEntry
        ? resolveUsesAtLevel(resourceEntry.uses, resourceEntry.classLevel, usesResolveContext) ?? 0
        : 0
      const usedPoints = usedResourcesById[resourceId] ?? 0
      return {
        resourceId,
        available: Math.max(0, maxPoints - usedPoints),
      }
    }

    const entry = resourceEntries.find(
      (row) => row.id.endsWith("_sorcery_points") || /^sorcery points/i.test(row.name),
    )
    if (!entry) return null
    const maxPoints = resolveUsesAtLevel(entry.uses, entry.classLevel, usesResolveContext) ?? 0
    const usedPoints = usedResourcesById[entry.id] ?? 0
    return {
      resourceId: entry.id,
      available: Math.max(0, maxPoints - usedPoints),
    }
  }, [
    pointPoolClassDetail,
    resourceEntries,
    usedResourcesById,
    usesResolveContext,
  ])

  const metamagicOptions = useMemo(
    () =>
      metamagicOptionsForCharacter({
        featIds: [
          ...(character?.feat_ids ?? []),
          ...characterFeats.map((feat) => feat.id),
          ...(originFeat ? [originFeat.id] : []),
        ],
        feats: [...characterFeats, ...(originFeat ? [originFeat] : [])],
        customAbilities: sheetCustomAbilities,
        spellLevel: selectedSpell?.level ?? 1,
      }),
    [
      character?.feat_ids,
      characterFeats,
      originFeat,
      sheetCustomAbilities,
      selectedSpell?.level,
    ],
  )

  const selectedMetamagic = useMemo(
    () => metamagicOptions.filter((option) => selectedMetamagicIds.includes(option.id)),
    [metamagicOptions, selectedMetamagicIds],
  )

  const spellCastCost = useMemo(() => {
    if (!selectedSpell || !primarySpellcaster?.class) return null

    const availablePoints = sorceryPointsState?.available ?? 0
    const pool = getPointPoolSpellcasting(primarySpellcaster.class.spellcasting)

    let arcanumAvailable: boolean | undefined
    if (pool) {
      const poolMaxLevel = Math.max(
        0,
        ...Object.keys(pool.cost_by_level)
          .map((key) => parseInt(key, 10))
          .filter((level) => !Number.isNaN(level) && level > 0),
      )
      if (selectedSpell.level > poolMaxLevel) {
        const arcanumEntry = resourceEntries.find((entry) => /innate arcanum/i.test(entry.name))
        if (arcanumEntry) {
          const arcanumMax =
            resolveUsesAtLevel(arcanumEntry.uses, arcanumEntry.classLevel, usesResolveContext) ?? 0
          arcanumAvailable = (usedResourcesById[arcanumEntry.id] ?? 0) < arcanumMax
        } else {
          arcanumAvailable = true
        }
      }
    }

    return resolveSpellCastCost({
      spellLevel: selectedSpell.level,
      spellcasting: primarySpellcaster.class.spellcasting,
      classRow: primarySpellcaster.class,
      classLevel: primarySpellcaster.row.level,
      availablePoints,
      selectedMetamagic,
      ctx: usesResolveContext,
      arcanumAvailable,
    })
  }, [
    selectedSpell,
    primarySpellcaster,
    sorceryPointsState,
    resourceEntries,
    usedResourcesById,
    selectedMetamagic,
    usesResolveContext,
  ])

  useEffect(() => {
    setSelectedMetamagicIds([])
  }, [selectedSpell?.id])

  const sheetActions = useMemo(
    () =>
      collectSheetActions({
        classDetails,
        species: character?.species ?? null,
        backgroundFeature: character?.backgrounds?.feature ?? null,
        customAbilities: sheetCustomAbilities,
        featureChoicePicks,
      }),
    [
      classDetails,
      character?.species,
      character?.backgrounds?.feature,
      sheetCustomAbilities,
      featureChoicePicks,
    ],
  )

  const combatActions = useMemo(
    () => sheetActions.filter((action) => action.category !== "utility"),
    [sheetActions],
  )
  const utilityActions = useMemo(
    () => sheetActions.filter((action) => action.category === "utility"),
    [sheetActions],
  )

  const equippedWeapon = useMemo(() => {
    if (!equippedWeaponId) return null
    const raw = equipment.find((item) => item.id === equippedWeaponId)
    if (!raw) return null
    return resolveCharacterEquipment(raw, equipmentCatalog.length ? equipmentCatalog : equipment, equipmentBaseSelections)
  }, [equipment, equipmentCatalog, equippedWeaponId, equipmentBaseSelections])

  const equippedOffHandWeapon = useMemo(() => {
    if (!equippedOffHandWeaponId) return null
    const raw = equipment.find((item) => item.id === equippedOffHandWeaponId)
    if (!raw) return null
    return resolveCharacterEquipment(raw, equipmentCatalog.length ? equipmentCatalog : equipment, equipmentBaseSelections)
  }, [equipment, equipmentCatalog, equippedOffHandWeaponId, equipmentBaseSelections])

  const equippedWeaponCards = useMemo(() => {
    const hasTwoWeaponFighting = characterHasTwoWeaponFighting([
      ...characterFeats,
      ...(originFeat ? [originFeat] : []),
    ])
    const cards = []
    if (equippedWeapon && derived?.equippedWeaponAttack) {
      cards.push({
        weapon: equippedWeapon,
        attack: derived.equippedWeaponAttack,
        hand: "main" as const,
        defaultIncludeAbilityModifier: true,
        abilityModifier: derived.equippedWeaponAttack.damageAbilityMod,
      })
    }
    if (equippedOffHandWeapon && derived?.equippedOffHandWeaponAttack) {
      const abilityMod = derived.equippedOffHandWeaponAttack.damageAbilityMod
      cards.push({
        weapon: equippedOffHandWeapon,
        attack: derived.equippedOffHandWeaponAttack,
        hand: "off" as const,
        defaultIncludeAbilityModifier: defaultOffHandIncludesAbilityMod(
          abilityMod,
          hasTwoWeaponFighting,
        ),
        abilityModifier: abilityMod,
      })
    }
    return cards
  }, [
    equippedWeapon,
    equippedOffHandWeapon,
    derived?.equippedWeaponAttack,
    derived?.equippedOffHandWeaponAttack,
    derived?.abilityMods,
    characterFeats,
    originFeat,
  ])

  // Tools the character is proficient with are surfaced automatically in the
  // equipment list, even if they were never explicitly purchased/added.
  const proficientToolEquipment = useMemo(() => {
    const normalize = (value: string) =>
      value.toLowerCase().replace(/[\u2018\u2019]/g, "'").trim()
    const profNames = new Set(
      (character?.tool_proficiencies ?? []).map(normalize).filter(Boolean),
    )
    if (!profNames.size || !equipmentCatalog.length) return [] as unknown as Equipment[]
    const ownedIds = new Set(equipment.map((item) => item.id))
    const ownedNames = new Set(equipment.map((item) => normalize(item.name)))
    return equipmentCatalog.filter(
      (item) =>
        item.category === "Tool" &&
        !ownedIds.has(item.id) &&
        !ownedNames.has(normalize(item.name)) &&
        profNames.has(normalize(item.name)),
    )
  }, [character?.tool_proficiencies, equipment, equipmentCatalog])

  const displayedEquipment = useMemo(
    () =>
      proficientToolEquipment.length
        ? [...equipment, ...proficientToolEquipment]
        : equipment,
    [equipment, proficientToolEquipment],
  )

  const effectiveBackgroundFeatGranted = useMemo(
    () =>
      getEffectiveBackgroundFeatGranted(
        character?.backgrounds ?? null,
        character?.feature_choice_picks ?? {},
      ),
    [character?.backgrounds, character?.feature_choice_picks],
  )

  /** General/epic feats for display — excludes the background origin feat when it is also in feat_ids. */
  const characterFeatsForDisplay = useMemo(() => {
    const originName = originFeat?.name ?? effectiveBackgroundFeatGranted ?? null
    const originId = originFeat?.id ?? null
    return characterFeats.filter((feat) => {
      if (originId && feat.id === originId) return false
      if (originName && feat.name.toLowerCase() === originName.toLowerCase()) return false
      return true
    })
  }, [characterFeats, originFeat, effectiveBackgroundFeatGranted])

  const effectiveScores = derived?.abilityScores ?? null

  const toggleCondition = (conditionName: string) => {
    setActiveConditions((prev) =>
      prev.includes(conditionName) ? prev.filter((c) => c !== conditionName) : [...prev, conditionName],
    )
  }

  const applyConcentration = useCallback((conditionName: string) => {
    setActiveConditions((prev) => [
      ...prev.filter((c) => !isConcentrationCondition(c)),
      conditionName,
    ])
  }, [])

  const handleInitiativeRoll = useCallback(() => {
    setUsedResourcesById((prev) =>
      applyInitiativeResourceRecharge(prev, spendableResourceEntries, usesResolveContext),
    )
  }, [spendableResourceEntries, usesResolveContext])

  const turnStartTriggers = useMemo(
    () => collectTurnStartTriggers(classDetails, modifierCatalog),
    [classDetails, modifierCatalog],
  )

  const hasInfluencePointsMechanic = useMemo(
    () => characterHasInfluencePointsMechanic(turnStartTriggers),
    [turnStartTriggers],
  )

  const handleTurnStart = useCallback(() => {
    if (!turnStartTriggers.length) return
    const abilityMods = derived?.abilityMods ?? {
      strength: 0,
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0,
    }
    const result = applyTurnStartTriggers({
      triggers: turnStartTriggers,
      usedResourcesById,
      resourceEntries: spendableResourceEntries,
      resolveContext: usesResolveContext,
      currentHp,
      maxHp: derived?.maxHp ?? character?.hit_point_max ?? 0,
      activeConditions,
      activeSheetToggleIds,
      accumulatedResources,
      abilityMods,
    })
    setUsedResourcesById(result.usedResourcesById)
    setAccumulatedResources(result.accumulatedResources)
    if (result.currentHp !== currentHp) setCurrentHp(result.currentHp)
  }, [
    turnStartTriggers,
    usedResourcesById,
    spendableResourceEntries,
    usesResolveContext,
    currentHp,
    derived?.maxHp,
    derived?.abilityMods,
    character?.hit_point_max,
    activeConditions,
    activeSheetToggleIds,
    accumulatedResources,
  ])

  const handleRest = useCallback(
    (rest: RestType) => {
      const result = applySheetRest({
        rest,
        maxHp: derived?.maxHp ?? character?.hit_point_max ?? 0,
        activeConditions,
        usedSpellSlotsByKey,
        spellSlotTables,
        usedResourcesById,
        resourceEntries: spendableResourceEntries,
        usedActionUsesById,
        sheetActions,
        resolveContext: usesResolveContext,
        rechargeCapsByResourceId,
      })
      setUsedSpellSlotsByKey(result.usedSpellSlotsByKey)
      setUsedResourcesById(result.usedResourcesById)
      setUsedActionUsesById(result.usedActionUsesById)
      if (result.rechargeCapsByResourceId) {
        setRechargeCapsByResourceId(result.rechargeCapsByResourceId)
      }
      if (result.currentHp != null) setCurrentHp(result.currentHp)
      if (result.tempHp != null) setTempHp(result.tempHp)
      if (result.deathSaves) setDeathSaves(result.deathSaves)
      if (result.activeConditions) setActiveConditions(result.activeConditions)
      if (rest === "short_rest") {
        setShortRestHitDiceOpen(true)
      }
      if (rest === "long_rest") {
        const pool = buildHitDicePool(classDetails, usedHitDiceByClassId)
        setUsedHitDiceByClassId(recoverHitDiceOnLongRest(usedHitDiceByClassId, pool))
        setShortRestHitDiceOpen(false)
      }
    },
    [
      derived?.maxHp,
      character?.hit_point_max,
      activeConditions,
      usedSpellSlotsByKey,
      spellSlotTables,
      usedResourcesById,
      spendableResourceEntries,
      usedActionUsesById,
      sheetActions,
      usesResolveContext,
      rechargeCapsByResourceId,
      classDetails,
      usedHitDiceByClassId,
    ],
  )

  const openConditionMenu = () => {
    setSheetMenuOpen(false)
    if (conditionButtonRef.current) {
      const rect = conditionButtonRef.current.getBoundingClientRect()
      setConditionMenuPos({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - 224),
      })
    }
    setConditionDropdownOpen((open) => !open)
  }

  const openSheetMenu = () => {
    setConditionDropdownOpen(false)
    if (sheetMenuButtonRef.current) {
      const rect = sheetMenuButtonRef.current.getBoundingClientRect()
      setSheetMenuPos({ top: rect.bottom + 4, left: Math.max(8, rect.right - 208) })
    }
    setSheetMenuOpen((open) => !open)
  }

  useEffect(() => {
    if (!conditionDropdownOpen) return
    const close = (event: Event) => {
      const target = event.target
      if (target instanceof Node && conditionMenuRef.current?.contains(target)) return
      setConditionDropdownOpen(false)
    }
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => {
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
    }
  }, [conditionDropdownOpen])

  useEffect(() => {
    if (!sheetMenuOpen) return
    const close = () => setSheetMenuOpen(false)
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => {
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
    }
  }, [sheetMenuOpen])

  useEffect(() => {
    const allowed = new Set(sheetToggleDefinitions.map((entry) => entry.id))
    setActiveSheetToggleIds((prev) => {
      const next = prev.filter((id) => allowed.has(id))
      return next.length === prev.length ? prev : next
    })
  }, [sheetToggleDefinitions])

  const companionRows = useMemo(() => {
    if (!character || !classDetails.length) return []
    const abilityMods = derived?.abilityMods ?? {
      strength: 0,
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0,
    }
    const proficiencyBonus =
      derived?.proficiencyBonus ?? Math.floor((character.level - 1) / 4) + 2
    const spellcastingClass =
      classDetails.find((entry) => entry.class?.spellcasting)?.class ?? character.classes
    const spellcastingAbilityLabel =
      spellcastingClass?.spellcasting?.ability ?? character.subclasses?.spellcasting?.ability
    const spellcastingAbilityKey = resolveSpellcastingAbilityKey(spellcastingAbilityLabel)
    const spellAbilityMod = spellcastingAbilityKey ? abilityMods[spellcastingAbilityKey] : 0
    const primarySpellcasting = derived?.spellcasting?.[0]
    const spellSaveDc =
      primarySpellcasting?.saveDc ??
      (spellcastingAbilityKey ? 8 + proficiencyBonus + spellAbilityMod : null)
    const spellAttackMod =
      primarySpellcasting?.attackBonus ??
      (spellcastingAbilityKey ? proficiencyBonus + spellAbilityMod : null)
    const ctx = {
      abilityMods,
      proficiencyBonus,
      spellAttackModifier:
        spellAttackMod ?? proficiencyBonus + (abilityMods.intelligence ?? 0),
      spellSaveDc: spellSaveDc ?? 8 + proficiencyBonus + (abilityMods.intelligence ?? 0),
      classLevels: classDetails
        .filter((entry) => entry.class?.name)
        .map((entry) => ({ className: entry.class!.name, level: entry.row.level })),
      ownerMaxHp: derived?.maxHp,
      ownerAbilityScores: derived?.abilityScores,
      ownerSavingThrowProficiencies: derived?.savingThrowProficiencies,
    }
    const hasFindFamiliar = spells.some((spell) => isFindFamiliarSpell(spell.name))
    const spellcastingEntry =
      classDetails.find((entry) => entry.class?.spellcasting) ?? classDetails[0]
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
      creatures,
      modifierCatalog,
    })
    return mergeCompanionState(resolved, companionState)
  }, [character, classDetails, sheetCustomAbilities, companionState, derived, spells, creatures, modifierCatalog])

  const persistCompanionState = useCallback(
    async (next: CharacterCompanionState[]) => {
      if (!character) return
      setCompanionState(next)
      const db = createClient()
      const { data, error } = await db
        .from("characters")
        .update({ companion_state: next })
        .eq("id", character.id)
        .select(`*, classes (*), species (*), backgrounds (*), subclasses (*)`)
        .single()
      const row = parseCharacterQueryRow(data)
      if (!error && row) setCharacter(row)
    },
    [character],
  )

  const patchCompanionState = useCallback(
    (key: string, patch: Partial<CharacterCompanionState>) => {
      const next = companionRows.map((row) => {
        const base: CharacterCompanionState = {
          key: row.key,
          currentHp: row.currentHp,
          customName: row.displayName !== row.template.name ? row.displayName : null,
          activeConditions: row.activeConditions.length ? row.activeConditions : null,
          polymorphActive: row.polymorphActive ? true : null,
        }
        if (row.key !== key) {
          if (patch.polymorphActive && row.polymorphActive) {
            return { ...base, polymorphActive: null }
          }
          return base
        }
        return {
          ...base,
          ...patch,
          activeConditions:
            patch.activeConditions !== undefined
              ? patch.activeConditions?.length
                ? patch.activeConditions
                : null
              : base.activeConditions,
          polymorphActive:
            patch.polymorphActive !== undefined
              ? patch.polymorphActive
                ? true
                : null
              : base.polymorphActive,
        }
      })
      void persistCompanionState(next)
    },
    [companionRows, persistCompanionState],
  )

  const updateCompanionHp = useCallback(
    (key: string, hp: number) => {
      patchCompanionState(key, { currentHp: hp })
    },
    [patchCompanionState],
  )

  const bloodiedActive = useMemo(() => {
    const hpMax = derived?.maxHp ?? character?.hit_point_max ?? 0
    return isBloodied(currentHp, hpMax)
  }, [derived?.maxHp, character?.hit_point_max, currentHp])

  const activeSheetToggleSet = useMemo(() => {
    const toggles = new Set<SheetToggleKey>(activeSheetToggleIds as SheetToggleKey[])
    if (bloodiedActive) toggles.add("below_half_hp")
    return toggles
  }, [activeSheetToggleIds, bloodiedActive])

  const limitationEquipment = useMemo(
    () =>
      resolveEquippedItems(
        equipment,
        { equippedArmorId, equippedShieldId, equippedWeaponId },
        equipmentBaseSelections ?? {},
        equipmentCatalog,
      ),
    [
      equipment,
      equippedArmorId,
      equippedShieldId,
      equippedWeaponId,
      equipmentBaseSelections,
      equipmentCatalog,
    ],
  )

  const alternateAbilityChecksGated = useMemo(
    () =>
      collectAlternateAbilityChecks({
        classDetails,
        catalog: modifierCatalog,
        limitationContext: {
          activeConditions,
          activeSheetToggles: activeSheetToggleSet,
          equippedArmor: limitationEquipment.armor,
          equippedShield: limitationEquipment.shield,
          currentHp,
        },
      }),
    [
      classDetails,
      modifierCatalog,
      activeConditions,
      activeSheetToggleSet,
      limitationEquipment,
      currentHp,
    ],
  )

  const spellSaveDcEntries = useMemo(() => {
    const casting = derived?.spellcasting ?? []
    return casting.map((entry) => ({
      id: entry.classId,
      className: entry.className,
      label:
        casting.length > 1
          ? `Spell Save DC (${entry.className} · ${ABILITY_LABELS[entry.ability]})`
          : "Spell Save DC",
      dc: entry.saveDc,
      baseDc: entry.saveDc - entry.saveDcFeatureBonus,
      bonus: entry.saveDcFeatureBonus,
      abilityKey: entry.ability,
    }))
  }, [derived?.spellcasting])

  const partitionedToolProficiencies = useMemo(
    () =>
      partitionToolProficiencies(
        derived?.toolProficiencies ?? character?.tool_proficiencies ?? [],
      ),
    [derived?.toolProficiencies, character?.tool_proficiencies],
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MainNav />
        <main className={`${SHEET_MAIN_CLASS} py-6`}>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/4" />
            <div className="h-36 bg-muted rounded-2xl" />
            <div className="h-48 bg-muted rounded-2xl" />
          </div>
        </main>
      </div>
    )
  }

  if (!character || !effectiveScores) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MainNav />
        <main className={`${SHEET_MAIN_CLASS} py-6 text-center`}>
          <h1 className="text-2xl font-bold text-foreground mb-4">Character not found</h1>
          <Link href="/characters" className={pageBackLinkClass}>
            Back to characters
          </Link>
        </main>
      </div>
    )
  }

  const getAbilityModifier = (score: number) => {
    const mod = Math.floor((score - 10) / 2)
    return mod >= 0 ? `+${mod}` : `${mod}`
  }

  const abilityMods = derived?.abilityMods ?? {
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0,
  }

  const proficiencyBonus = derived?.proficiencyBonus ?? Math.floor((character.level - 1) / 4) + 2
  const activePolymorph = activePolymorphCompanion(companionRows)
  const parseSpeedFt = (label?: string | null) => {
    const match = label?.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : null
  }
  const armorClass =
    activePolymorph?.ac ?? derived?.armorClass ?? character.armor_class ?? 10
  const speed =
    (activePolymorph ? parseSpeedFt(activePolymorph.template.speed) : null) ??
    derived?.speed ??
    character.speed ??
    30
  const speedEntries = filterDisplaySpeedEntries(
    derived?.speeds?.length ? derived.speeds : [{ type: "walk", label: "walk", feet: speed }],
  )
  const initiative = derived?.initiative ?? character.initiative ?? abilityMods.dexterity
  const maxHp = derived?.maxHp ?? character.hit_point_max ?? 0
  const hitDicePool = buildHitDicePool(classDetails, usedHitDiceByClassId)
  const savingThrowProficiencies = derived?.savingThrowProficiencies ?? character.classes?.saving_throws ?? []

  const classLabel = classDetails.length
    ? classDetails
        .map((entry) => `${entry.class?.name ?? "Class"} Level ${entry.row.level}`)
        .join(" · ")
    : character.classes?.name
      ? `${character.classes.name} Level ${character.level}`
      : "Adventurer"

  const skillsInOrder = getSkillsInAbilityOrder()
  const srdSkillNameSet = new Set(skillsInOrder.map((skill) => skill.name))
  const customSkillRows =
    derived?.skills.filter((skill) => skill.proficient && !srdSkillNameSet.has(skill.name)) ?? []
  const weaponProficiencies =
    derived?.weaponProficiencies ??
    getEffectiveWeaponProficiencies(
      character.classes?.weapon_proficiencies,
      character.weapon_proficiencies,
    )
  const armorProficiencies =
    derived?.armorProficiencies ??
    getEffectiveArmorProficiencies(
      character.classes?.armor_proficiencies,
      character.armor_proficiencies,
    )
  const spellcastingClass =
    classDetails.find((entry) => entry.class?.spellcasting)?.class ?? character.classes
  const spellcastingAbilityLabel =
    spellcastingClass?.spellcasting?.ability ?? character.subclasses?.spellcasting?.ability
  const spellcastingAbilityKey = resolveSpellcastingAbilityKey(spellcastingAbilityLabel)
  const primarySpellcasting = derived?.spellcasting?.[0]
  const hasSpellcasting = Boolean(
    primarySpellcasting || (spellcastingAbilityLabel && spellcastingAbilityKey),
  )
  const spellAbilityMod =
    primarySpellcasting?.abilityMod ??
    (spellcastingAbilityKey ? abilityMods[spellcastingAbilityKey] : 0)
  const spellAttackMod =
    primarySpellcasting?.attackBonus ??
    (hasSpellcasting ? proficiencyBonus + spellAbilityMod : null)
  const innateSorceryBuffActive =
    isSorcerer && activeSheetToggleSet.has("while_innate_sorcery_active")
  const combatStatHighlightClass = innateSorceryBuffActive
    ? "border border-violet-500/40 bg-violet-500/10"
    : "bg-secondary/10"

  const formatMod = (mod: number) => (mod >= 0 ? `+${mod}` : `${mod}`)

  const passivePerception = derived?.passivePerception ?? 10 + abilityMods.wisdom
  const passiveInsight = derived?.passiveInsight ?? 10 + abilityMods.wisdom
  const passiveInvestigation = derived?.passiveInvestigation ?? 10 + abilityMods.intelligence
  const derivedSaves = derived?.saves ?? []
  const telepathy = derived?.telepathy ?? null
  const restReplacement = derived?.restReplacement ?? null
  const magicalSleepImmunity = derived?.magicalSleepImmunity ?? false
  const noSleepRequired = derived?.noSleepRequired ?? false
  const forcedSaveRemaps = derived?.forcedSaveRemaps ?? []
  const hasSenseNotes =
    Boolean(telepathy) ||
    Boolean(restReplacement) ||
    magicalSleepImmunity ||
    noSleepRequired ||
    forcedSaveRemaps.length > 0

  const alwaysPreparedSpellIds = (() => {
    const ids = new Set<string>()
    if (!spellCatalog.length) return ids
    for (const detail of classDetails) {
      const features = (detail.subclass?.features as import("@/lib/types").Feature[] | undefined) ?? []
      for (const grant of collectSubclassAlwaysPreparedSpells(features, detail.row.level, spellCatalog, {
        classId: detail.row.class_id,
        featureChoicePicks,
      })) {
        ids.add(grant.spellId)
      }
    }
    return ids
  })()

  const displayedSpells = (() => {
    if (!alwaysPreparedSpellIds.size) return spells
    const byId = new Map(spells.map((spell) => [spell.id, spell]))
    for (const id of alwaysPreparedSpellIds) {
      if (byId.has(id)) continue
      const row = spellCatalog.find((spell) => spell.id === id)
      if (row) byId.set(id, row)
    }
    return [...byId.values()]
  })()

  const spellsGroupedByLevel = (() => {
    const groups = new Map<number, Spell[]>()
    for (const spell of displayedSpells) {
      const list = groups.get(spell.level) ?? []
      list.push(spell)
      groups.set(spell.level, list)
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a - b)
      .map(([level, levelSpells]) => ({
        level,
        label: formatSpellListGroupLabel(level),
        spells: levelSpells.sort((a, b) => a.name.localeCompare(b.name)),
      }))
  })()

  const incapacitated = isIncapacitatedByConditions(activeConditions)
  const incomingAttackNotes = buildIncomingAttackNotes({
    activeConditions,
    classFeatures: sheetClassFeatures,
    limitationContext: {
      activeConditions,
      activeSheetToggles: activeSheetToggleSet,
      equippedArmor: limitationEquipment.armor,
      equippedShield: limitationEquipment.shield,
      currentHp,
    },
  })
  const influencePointCount = hasInfluencePointsMechanic
    ? currentInfluencePoints(tickAccumulatedResources(accumulatedResources))
    : 0
  const influencePointCap = hasInfluencePointsMechanic
    ? influenceCap(abilityMods.intelligence)
    : 0

  return (
    <SheetRollHistoryProvider characterId={id}>
      <SheetRollProvider
        value={{
          activeConditions,
          exhaustionLevel,
          incapacitated,
          classFeatures: sheetClassFeatures,
          activeSheetToggles: activeSheetToggleSet,
          equippedArmor: limitationEquipment.armor,
          equippedShield: limitationEquipment.shield,
          currentHp,
          featureEffectContext: {
            proficiencyBonus: derived?.proficiencyBonus ?? Math.floor(((character?.level ?? 1) - 1) / 4) + 2,
            abilityMods: derived?.abilityMods ?? {
              strength: 0,
              dexterity: 0,
              constitution: 0,
              intelligence: 0,
              wisdom: 0,
              charisma: 0,
            },
            characterLevel: character?.level ?? 1,
            currentHp,
            classResourceDieSides,
          },
        }}
      >
    <div className="min-h-screen bg-background flex flex-col">
      <MainNav />

      <main className={SHEET_MAIN_CLASS}>
        <div className="flex items-center justify-between gap-4 mb-3">
          <Link href="/characters" className={pageBackLinkClass}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <Link
            href={`/builder?edit=${character.id}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden mb-3 min-h-[140px]"
        >
          {character.banner_url && (
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <img
                src={character.banner_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          )}
          <div
            className={`relative flex flex-col gap-2 p-4 ${
              character.banner_url
                ? "bg-gradient-to-r from-background/90 via-background/75 to-background/60"
                : "bg-gradient-to-br from-primary/20 to-secondary/20"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
              {character.portrait_url ? (
                <button
                  type="button"
                  onClick={() => setPortraitZoomOpen(true)}
                  className="shrink-0 rounded-xl overflow-hidden border-2 border-background shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <img
                    src={character.portrait_url}
                    alt={character.name}
                    className="h-16 w-16 object-cover sm:h-24 sm:w-24"
                  />
                </button>
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-background bg-card sm:h-24 sm:w-24">
                  <User className="h-8 w-8 text-muted-foreground sm:h-12 sm:w-12" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-black leading-tight text-foreground sm:text-2xl">{character.name}</h1>
                <p className="mt-0.5 text-sm font-bold text-muted-foreground">{classLabel}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {character.species && (
                    <span className={SHEET_BANNER_BADGE.species}>
                      {character.species.name}
                    </span>
                  )}
                  {(character.size ?? character.species?.size) && (
                    <span className={SHEET_BANNER_BADGE.size}>
                      {character.size ?? character.species?.size}
                    </span>
                  )}
                  {character.backgrounds && (
                    <span className={SHEET_BANNER_BADGE.background}>
                      {character.backgrounds.name}
                    </span>
                  )}
                </div>
              </div>
              </div>

              <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <RollHistoryTrigger />
                  <button
                    type="button"
                    onClick={() => setHasInspiration((value) => !value)}
                    title={hasInspiration ? "Spend Heroic Inspiration" : "Mark Heroic Inspiration"}
                    aria-pressed={hasInspiration}
                    className={`flex h-11 w-11 items-center justify-center rounded-lg border-2 transition-colors ${
                      hasInspiration
                        ? SHEET_BANNER_BUTTON.inspirationActive
                        : SHEET_BANNER_BUTTON.inspirationIdle
                    }`}
                  >
                    <Sparkles className="w-5 h-5" />
                  </button>
                  <div className="relative">
                    <button
                      ref={conditionButtonRef}
                      type="button"
                      onClick={openConditionMenu}
                      aria-expanded={conditionDropdownOpen}
                      className={`flex min-h-11 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-sm font-semibold transition-colors sm:px-3 ${
                        conditionDropdownOpen ||
                        activeConditions.length > 0 ||
                        exhaustionLevel > 0
                          ? SHEET_BANNER_BUTTON.conditionsActive
                          : SHEET_BANNER_BUTTON.conditionsDefault
                      }`}
                    >
                      <span className="hidden sm:inline">Conditions</span>
                      <span className="sm:hidden">Cond.</span>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${conditionDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {conditionDropdownOpen && conditionMenuPos && (
                      <>
                        <div
                          className="fixed inset-0 z-[99]"
                          aria-hidden
                          onClick={() => setConditionDropdownOpen(false)}
                        />
                        <div
                          ref={conditionMenuRef}
                          className="fixed w-56 bg-card border border-border rounded-lg shadow-xl z-[100] max-h-80 overflow-y-auto overscroll-contain"
                          style={{ top: conditionMenuPos.top, left: conditionMenuPos.left }}
                        >
                          {SHEET_SELECTABLE_CONDITIONS.map((condition) => (
                            <label
                              key={condition.name}
                              className="flex min-h-11 items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={activeConditions.includes(condition.name)}
                                onChange={() => toggleCondition(condition.name)}
                                className="h-4 w-4 rounded accent-destructive shrink-0"
                              />
                              <span className="flex-1 min-w-0">{condition.name}</span>
                              <ConditionInfoTip description={condition.description} />
                            </label>
                          ))}
                          <div className="border-t border-border px-3 py-2.5">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium flex-1 min-w-0">Exhaustion</span>
                              {EXHAUSTION_CONDITION ? (
                                <ConditionInfoTip description={EXHAUSTION_CONDITION.description} />
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {EXHAUSTION_LEVELS.map((level) => {
                                const selected = exhaustionLevel === level
                                return (
                                  <button
                                    key={level}
                                    type="button"
                                    aria-pressed={selected}
                                    title={getExhaustionEffectSummary(level)}
                                    onClick={() => setExhaustionLevel(clampExhaustionLevel(level))}
                                    className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-bold tabular-nums transition-colors ${
                                      selected
                                        ? "border-amber-500/60 bg-amber-500/20 text-amber-900 dark:text-amber-200"
                                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                                    }`}
                                  >
                                    {level}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {ragingSheetToggle ? renderManualToggleButton(ragingSheetToggle) : null}
                  {innateSorcerySheetToggle && isSorcerer
                    ? renderManualToggleButton(innateSorcerySheetToggle)
                    : null}
                  <div className="relative">
                    <button
                      ref={sheetMenuButtonRef}
                      type="button"
                      onClick={openSheetMenu}
                      className={`flex h-11 w-11 items-center justify-center rounded-lg border-2 transition-colors ${SHEET_BANNER_BUTTON.icon} text-muted-foreground`}
                      title="Sheet options"
                      aria-expanded={sheetMenuOpen}
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    {sheetMenuOpen && sheetMenuPos ? (
                      <>
                        <div
                          className="fixed inset-0 z-[99]"
                          aria-hidden
                          onClick={() => setSheetMenuOpen(false)}
                        />
                        <div
                          className="fixed z-[100] w-52 rounded-lg border border-border bg-card py-1 shadow-xl"
                          style={{ top: sheetMenuPos.top, left: sheetMenuPos.left }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (!character) return
                              downloadCharacterExport(
                                characterRowToExportItem(character as unknown as unknown as Record<string, unknown>),
                              )
                              setSheetMenuOpen(false)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                          >
                            <Download className="w-4 h-4 shrink-0" />
                            Export JSON
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!character || !derived) return
                              void import("@/lib/character/pdf-export").then(({ downloadCharacterPdf }) =>
                                downloadCharacterPdf({
                                  name: character.name,
                                  level: character.level,
                                  classSummary: classLabel,
                                  derived,
                                  breakdowns: statBreakdowns,
                                  sheetUrl:
                                    typeof window !== "undefined"
                                      ? `${window.location.origin}/characters/${character.id}`
                                      : undefined,
                                }),
                              )
                              setSheetMenuOpen(false)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted no-print"
                          >
                            <Download className="w-4 h-4 shrink-0" />
                            Export PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              window.print()
                              setSheetMenuOpen(false)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted no-print"
                          >
                            Print
                          </button>
                          <button
                            type="button"
                            disabled={playStateSaveStatus === "saving"}
                            onClick={() => {
                              void persistPlayStateToDb()
                              setSheetMenuOpen(false)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-60"
                          >
                            <Save className="w-4 h-4 shrink-0" />
                            {playStateSaveStatus === "saving"
                              ? "Saving…"
                              : playStateSaveStatus === "saved"
                                ? "Saved"
                                : playStateSaveStatus === "error"
                                  ? "Save failed"
                                  : "Save state"}
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>

                {(derived?.acFormulaOptions.length ?? 0) > 1 ? (
                  <label className="flex flex-col gap-1 text-xs items-end">
                    <span className="font-semibold text-muted-foreground">AC formula</span>
                    <select
                      value={
                        acFormulaPick ??
                        character.modifier_player_picks?.ac_formula?.[0] ??
                        derived?.acFormulaOptions[0]?.id ??
                        ""
                      }
                      onChange={(event) => setAcFormulaPick(event.target.value)}
                      className={`min-h-11 rounded-lg border px-3 text-sm ${SHEET_BANNER_BUTTON.select}`}
                    >
                      {derived?.acFormulaOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {secondaryManualSheetToggles.length > 0 ? (
                  <div className="flex flex-wrap gap-2 justify-end">
                    {secondaryManualSheetToggles.map((toggle) => renderManualToggleButton(toggle))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex w-full justify-end">
              <div className="flex max-w-2/3 flex-wrap items-center justify-end gap-1">
                {exhaustionLevel > 0 ? (
                  <span className={SHEET_BANNER_CHIP.exhaustion} title={getExhaustionEffectSummary(exhaustionLevel)}>
                    Exhaustion {exhaustionLevel}
                    <ConditionInfoTip
                      description={
                        EXHAUSTION_CONDITION?.description ??
                        getExhaustionEffectSummary(exhaustionLevel)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setExhaustionLevel(0)}
                      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded hover:bg-background/60"
                      aria-label="Clear exhaustion"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ) : null}
                {bloodiedActive ? (
                  <span className={SHEET_BANNER_CHIP.bloodied} title={BLOODIED_DESCRIPTION}>
                    Bloodied
                    <ConditionInfoTip description={BLOODIED_DESCRIPTION} />
                  </span>
                ) : null}
                {activeConditions
                  .filter((condName) => condName !== "Exhaustion")
                  .map((condName) => {
                    const condDescription =
                      getConditionDescription(condName) ??
                      (isConcentrationCondition(condName)
                        ? "You are concentrating on a spell. Concentration ends if you take damage and fail a Constitution save, cast another concentration spell, or become incapacitated."
                        : undefined)
                    return (
                      <span
                        key={condName}
                        className={
                          isConcentrationCondition(condName)
                            ? SHEET_BANNER_CHIP.concentration
                            : SHEET_BANNER_CHIP.condition
                        }
                      >
                        {condName}
                        {condDescription ? (
                          <ConditionInfoTip description={condDescription} />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => toggleCondition(condName)}
                          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded hover:bg-background/60"
                          aria-label={`Remove ${condName}`}
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    )
                  })}
                <SheetRestButtons
                  onRest={handleRest}
                  onTurnStart={turnStartTriggers.length ? handleTurnStart : undefined}
                  compact
                />
              </div>
            </div>
          </div>
        </motion.div>

        <SheetTabNav activeTab={activeTab} onTabChange={setActiveTab} />

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className={SHEET_TAB_CONTENT_CLASS}
        >
          {activeTab === "abilities" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[11fr_5fr_4fr]">
                <div className={`${SHEET_ABILITIES_PANEL.skills} rounded-xl p-3 border border-border min-w-0`}>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Skills</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:min-h-[300px]">
                    {skillsInOrder.map((skill) => {
                      const derivedSkill = derived?.skills.find((entry) => entry.name === skill.name)
                      const isProficient =
                        derivedSkill?.proficient ??
                        character.skill_proficiencies?.includes(skill.name) ??
                        false
                      const hasExpertise =
                        derivedSkill?.expertise ??
                        character.skill_expertise?.includes(skill.name) ??
                        false
                      const mod =
                        derivedSkill?.bonus ??
                        abilityMods[skill.ability] +
                          (isProficient ? proficiencyBonus * (hasExpertise ? 2 : 1) : 0)
                      return (
                        <div
                          key={skill.name}
                          className={`flex justify-between items-center gap-2 px-2 py-1.5 rounded text-xs ${
                            isProficient ? SHEET_STATUS_ROW.skillProficient : SHEET_STATUS_ROW.muted
                          }`}
                        >
                          <span className="truncate min-w-0">
                            {skill.name} ({ABILITY_ABBREVIATIONS[skill.ability]})
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            {hasExpertise && <SkillExpertiseIndicator />}
                            <span className="font-bold tabular-nums w-7 text-right">{formatMod(mod)}</span>
                            <D20RollButton
                              modifier={mod}
                              title={`Roll ${skill.name}`}
                              skillProficient={isProficient}
                              featureBonusesIncluded={Boolean(derivedSkill)}
                              rollContext={{
                                kind: "skill",
                                skillName: skill.name,
                                ability: skill.ability as AbilityScoreKey,
                              }}
                            />
                          </span>
                        </div>
                      )
                    })}
                    {customSkillRows.map((skill) => (
                      <div
                        key={skill.name}
                        className={`flex justify-between items-center gap-2 px-2 py-1.5 rounded text-xs ${SHEET_STATUS_ROW.skillCustom}`}
                      >
                        <span className="truncate min-w-0">
                          {skill.name} (
                          {ABILITY_ABBREVIATIONS[skill.ability as keyof typeof ABILITY_ABBREVIATIONS] ??
                            skill.ability.slice(0, 3).toUpperCase()}
                          )
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          {skill.expertise && <SkillExpertiseIndicator />}
                          <span className="font-bold tabular-nums w-7 text-right">{formatMod(skill.bonus)}</span>
                          <D20RollButton
                            modifier={skill.bonus}
                            title={`Roll ${skill.name}`}
                            skillProficient
                            featureBonusesIncluded
                            rollContext={{
                              kind: "skill",
                              skillName: skill.name,
                              ability: skill.ability,
                            }}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-border grid grid-cols-2 gap-2">
                    <div className="flex justify-between items-center gap-2 px-2 py-1.5 rounded text-xs bg-secondary/10 font-medium min-w-0">
                      <span className="truncate">Proficiency Bonus</span>
                      <span className="font-bold tabular-nums shrink-0">{formatMod(proficiencyBonus)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2 px-2 py-1.5 rounded text-xs bg-secondary/10 font-medium min-w-0">
                      <span className="truncate">Passive Perception</span>
                      <span className="flex items-center gap-1 shrink-0">
                        <span className="font-bold tabular-nums">{passivePerception}</span>
                        <StatExplainPopover
                          title="Passive Perception"
                          total={passivePerception}
                          contributions={
                            statBreakdowns
                              ? breakdownLines(statBreakdowns, "passivePerception")
                              : undefined
                          }
                        />
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2 px-2 py-1.5 rounded text-xs bg-secondary/10 font-medium min-w-0">
                      <span className="truncate">Passive Insight</span>
                      <span className="font-bold tabular-nums shrink-0">{passiveInsight}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2 px-2 py-1.5 rounded text-xs bg-secondary/10 font-medium min-w-0">
                      <span className="truncate">Passive Investigation</span>
                      <span className="font-bold tabular-nums shrink-0">{passiveInvestigation}</span>
                    </div>
                  </div>
                </div>

                <div className={`${SHEET_ABILITIES_PANEL.abilityScores} rounded-xl p-3 border border-border min-w-0`}>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Ability Scores</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {ABILITY_SCORE_KEYS.map((key) => {
                      const score = effectiveScores[key]
                      const mod = abilityMods[key]
                      return (
                        <div key={key} className="text-center">
                          <div className={abilityScoreBoxClass(theme, key)}>
                            <span className={abilityScoreValueClass(theme)}>{score}</span>
                          </div>
                          <p className="text-[10px] font-medium text-foreground mt-0.5">{ABILITY_LABELS[key]}</p>
                          <p className="text-xs font-bold text-primary">{getAbilityModifier(score)}</p>
                          <div className="mt-1 flex justify-center">
                            <D20RollButton
                              modifier={mod}
                              title={`${ABILITY_LABELS[key]} ability check`}
                              rollContext={{ kind: "ability", ability: key }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                    <div
                      className={`flex justify-between items-center gap-2 px-2 rounded text-xs bg-secondary/10 font-medium ${
                        speedEntries.length > 1 ? "py-2 min-h-[2.75rem]" : "py-1.5"
                      }`}
                    >
                      <span className="shrink-0">Speed</span>
                      <span className="flex items-center gap-1 min-w-0">
                        {speedEntries.length > 1 ? (
                          <div className="font-bold tabular-nums leading-snug text-right flex flex-col gap-0.5">
                            {speedEntries.map((entry) => (
                              <span key={entry.type}>
                                {entry.feet} ft {entry.label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="font-bold tabular-nums">{speed} ft</span>
                        )}
                        <StatExplainPopover
                          title="Speed"
                          total={speed}
                          summable={false}
                          contributions={
                            statBreakdowns ? breakdownLines(statBreakdowns, "speed") : undefined
                          }
                        />
                      </span>
                    </div>
                  </div>
                </div>

                <div className={`${SHEET_ABILITIES_PANEL.proficiencies} rounded-xl p-3 border border-border min-w-0`}>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Proficiencies</h3>
                  {!weaponProficiencies.length &&
                  !armorProficiencies.length &&
                  !(character.tool_proficiencies ?? []).length &&
                  !(character.languages ?? []).length &&
                  !hasSenseNotes ? (
                    <span className="text-xs text-muted-foreground">None listed</span>
                  ) : (
                    <div className="space-y-3">
                      {weaponProficiencies.length > 0 && (
                        <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Weapons</p>
                          <div className="flex flex-wrap gap-1.5">
                            {weaponProficiencies.map((item) => (
                              <span
                                key={`weapon-${item}`}
                                className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {armorProficiencies.length > 0 && (
                        <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Armor</p>
                          <div className="flex flex-wrap gap-1.5">
                            {armorProficiencies.map((item) => (
                              <span
                                key={`armor-${item}`}
                                className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {(partitionedToolProficiencies.tools.length > 0 ||
                        partitionedToolProficiencies.instruments.length > 0) && (
                        <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5 space-y-2">
                          {partitionedToolProficiencies.tools.length > 0 ? (
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Tools</p>
                              <div className="flex flex-wrap gap-1.5">
                                {partitionedToolProficiencies.tools.map((item) => (
                                  <span
                                    key={`tool-${item}`}
                                    className="px-2 py-0.5 bg-secondary/20 text-secondary-foreground rounded-full text-xs"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {partitionedToolProficiencies.instruments.length > 0 ? (
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">
                                Musical Instruments
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {partitionedToolProficiencies.instruments.map((item) => (
                                  <span
                                    key={`instrument-${item}`}
                                    className="px-2 py-0.5 bg-secondary/20 text-secondary-foreground rounded-full text-xs"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                      {(character.languages ?? []).length > 0 && (
                        <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Languages</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(character.languages ?? []).map((item) => (
                              <span
                                key={`lang-${item}`}
                                className="px-2 py-0.5 bg-muted text-foreground rounded-full text-xs"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {hasSenseNotes ? (
                        <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5 space-y-1.5">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
                            Senses & Rest
                          </p>
                          {telepathy ? (
                            <p className="text-xs text-foreground">
                              {telepathy.label?.trim() || `Telepathy ${telepathy.rangeFeet} ft.`}
                            </p>
                          ) : null}
                          {restReplacement ? (
                            <p className="text-xs text-foreground">
                              {restReplacement.description ||
                                `${restReplacement.restHours}-hour rest${
                                  restReplacement.replacesLongRest ? " (replaces long rest)" : ""
                                }`}
                            </p>
                          ) : null}
                          {magicalSleepImmunity ? (
                            <p className="text-xs text-foreground">Immune to magical sleep</p>
                          ) : null}
                          {noSleepRequired ? (
                            <p className="text-xs text-foreground">Does not require sleep</p>
                          ) : null}
                          {forcedSaveRemaps.map((remap, index) => (
                            <p
                              key={`forced-save-remap-${remap.fromAbility}-${remap.toAbility}-${index}`}
                              className="text-xs text-foreground"
                            >
                              {remap.label?.trim() ||
                                `Forced saves: ${remap.fromAbility} → ${remap.toAbility} (${remap.scope.replace(/_/g, " ")})`}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <div className={`${SHEET_ABILITIES_PANEL.actions} rounded-xl p-3 border border-border`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h2 className="text-sm font-bold text-foreground">Actions</h2>
                  <DefaultActionsButton onClick={() => setDefaultActionsContext("abilities")} />
                </div>
                {utilityActions.length ? (
                  <SheetActionsPanel
                    actions={utilityActions}
                    usedByActionId={usedActionUsesById}
                    onUsedChange={setUsedActionUsesById}
                    resolveContext={usesResolveContext}
                    resourceEntries={resourceEntries}
                    usedResourcesById={usedResourcesById}
                    onResourceUsedChange={setUsedResourcesById}
                    incapacitated={incapacitated}
                    psiLimit={psiLimit}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No non-combat actions from your features or traits. Use Standard Actions for
                    options like Dash, Hide, and Search.
                  </p>
                )}
              </div>

              {alternateAbilityChecksGated.length > 0 && (
                <div className="bg-card rounded-xl p-3 border border-border">
                  <h2 className="text-sm font-bold text-foreground mb-1">Alternate Ability Checks</h2>
                  <p className="text-xs text-muted-foreground mb-3">
                    Make these skill checks with a different ability modifier.
                  </p>
                  <div className="space-y-3">
                    {alternateAbilityChecksGated.map((entry) => {
                      const altAbilityMod = abilityMods[entry.ability] ?? 0
                      const skillRows =
                        entry.skills.length > 0
                          ? entry.skills
                          : skillsInOrder.map((skill) => skill.name)
                      return (
                        <div
                          key={entry.id}
                          className="rounded-lg border border-border/70 bg-muted/25 p-2.5"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                            <p className="text-xs font-bold text-foreground">
                              {entry.featureName}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              uses {ABILITY_ABBREVIATIONS[entry.ability]}
                              {entry.conditionLabel ? ` · ${entry.conditionLabel}` : ""}
                            </p>
                          </div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                            {skillRows.map((skillName) => {
                              const derivedSkill = derived?.skills.find(
                                (s) => s.name === skillName,
                              )
                              const isProficient =
                                derivedSkill?.proficient ??
                                character.skill_proficiencies?.includes(skillName) ??
                                false
                              const hasExpertise =
                                derivedSkill?.expertise ??
                                character.skill_expertise?.includes(skillName) ??
                                false
                              const mod =
                                altAbilityMod +
                                (isProficient ? proficiencyBonus * (hasExpertise ? 2 : 1) : 0)
                              return (
                                <div
                                  key={skillName}
                                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded text-xs bg-background/60"
                                >
                                  <span className="truncate min-w-0">
                                    {skillName} ({ABILITY_ABBREVIATIONS[entry.ability]})
                                  </span>
                                  <span className="flex items-center gap-1 shrink-0">
                                    <span className="font-bold tabular-nums w-7 text-right">
                                      {formatMod(mod)}
                                    </span>
                                    <D20RollButton
                                      modifier={mod}
                                      title={`Roll ${skillName} (${ABILITY_ABBREVIATIONS[entry.ability]}) — ${entry.featureName}`}
                                      rollContext={{
                                        kind: "skill",
                                        skillName,
                                        ability: entry.ability,
                                      }}
                                    />
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

          {activeTab === "details" && (
            <div className={`${SHEET_DETAILS_PANEL} rounded-xl p-4 border border-border`}>
              <h2 className="text-sm font-bold text-foreground mb-3">Character Details</h2>
              <div className="overflow-hidden">
                {character.portrait_url ? (
                  <button
                    type="button"
                    onClick={() => setPortraitZoomOpen(true)}
                    className="float-left mr-4 mb-2 w-80 sm:w-96 max-w-full sm:max-w-[55%] rounded-xl overflow-hidden border-2 border-border shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <img
                      src={character.portrait_url}
                      alt={character.name}
                      className="w-full h-auto object-cover"
                    />
                  </button>
                ) : null}
                <div className="space-y-3 min-w-0">
                  {character.alignment && (
                    <p className="text-sm">
                      <span className="font-semibold text-foreground">Alignment: </span>
                      <span className="text-muted-foreground">{character.alignment}</span>
                    </p>
                  )}
                  <CollapsibleDetailField label="Personality Traits" text={character.personality_traits} />
                  <CollapsibleDetailField label="Ideals" text={character.ideals} />
                  <CollapsibleDetailField label="Bonds" text={character.bonds} />
                  <CollapsibleDetailField label="Flaws" text={character.flaws} />
                  <CollapsibleDetailField label="Backstory" text={character.backstory} />
                  {!character.alignment &&
                    !character.personality_traits?.trim() &&
                    !character.ideals?.trim() &&
                    !character.bonds?.trim() &&
                    !character.flaws?.trim() &&
                    !character.backstory?.trim() && (
                      <p className="text-sm text-muted-foreground">
                        No character details yet. Use Edit Character to add personality and backstory from the Details step.
                      </p>
                    )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "combat" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[7fr_3fr] md:items-start">
                <div className="space-y-3 min-w-0">
                <div className={`${SHEET_COMBAT_PANEL.combatStats} rounded-xl p-3 border border-border min-w-0 overflow-hidden`}>
                  <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" aria-hidden />
                    Combat Stats
                  </h2>
                  <SheetPersistentStatsBar
                    panel
                    armorClass={armorClass}
                    acBreakdown={derived?.acBreakdown ?? []}
                    statBreakdowns={statBreakdowns}
                    incomingAttackNotes={incomingAttackNotes}
                    initiative={initiative}
                    speed={speed}
                    speeds={speedEntries}
                    maxHp={maxHp}
                    currentHp={currentHp}
                    tempHp={tempHp}
                    onCurrentHpChange={setCurrentHp}
                    onTempHpChange={setTempHp}
                    hitDicePool={hitDicePool}
                    conMod={abilityMods.constitution}
                    showShortRestHitDice={shortRestHitDiceOpen}
                    onShortRestHeal={(amount) => {
                      setCurrentHp((hp) => Math.min(maxHp, hp + amount))
                      setShortRestHitDiceOpen(false)
                    }}
                    onSpendHitDice={(classId, count) =>
                      setUsedHitDiceByClassId((prev) => ({
                        ...prev,
                        [classId]: (prev[classId] ?? 0) + count,
                      }))
                    }
                    onInitiativeRoll={handleInitiativeRoll}
                    formatMod={formatMod}
                  />
                </div>
                <div className={`${SHEET_COMBAT_PANEL.savingThrows} rounded-xl p-3 border border-border`}>
                  <div className="flex flex-col lg:flex-row gap-1 lg:gap-1.5 lg:items-stretch">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 lg:gap-1.5 flex-1 min-w-0">
                      {(["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"] as const).map(
                        (ability) => {
                          const abilityKey = ability.toLowerCase() as AbilityScoreKey
                          const derivedSave = derivedSaves.find((entry) => entry.ability === abilityKey)
                          const isProficient =
                            derivedSave?.proficient ?? savingThrowProficiencies.includes(ability)
                          const mod =
                            derivedSave?.bonus ??
                            abilityMods[abilityKey] + (isProficient ? proficiencyBonus : 0)
                          return (
                            <div
                              key={ability}
                              className={`flex justify-between items-center gap-2 px-2 py-1.5 rounded text-xs min-h-[2.75rem] ${
                                isProficient ? SHEET_STATUS_ROW.saveProficient : SHEET_STATUS_ROW.muted
                              }`}
                            >
                              <span className="min-w-0 font-semibold tabular-nums tracking-wide">
                                {ABILITY_LABELS[ability.toLowerCase()]}
                                {derivedSave?.governingAbility
                                  ? ` (${ABILITY_LABELS[derivedSave.governingAbility]})`
                                  : ""}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-bold tabular-nums">{formatMod(mod)}</span>
                                <D20RollButton
                                  modifier={mod}
                                  title={`Roll ${ability} save`}
                                  rollContext={{
                                    kind: "save",
                                    ability: abilityKey,
                                  }}
                                />
                              </div>
                            </div>
                          )
                        },
                      )}
                    </div>
                    <div className="lg:w-40 xl:w-44 shrink-0 lg:self-stretch min-h-[2.75rem]">
                      <DeathSaveTracker
                        variant="inline"
                        deathSaves={deathSaves}
                        onDeathSavesChange={setDeathSaves}
                      />
                    </div>
                  </div>
                </div>
                <div className={`${SHEET_COMBAT_PANEL.actions} rounded-xl p-3 border border-border flex flex-col min-h-0`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="text-sm font-bold text-foreground">Actions</h2>
                    <DefaultActionsButton onClick={() => setDefaultActionsContext("combat")} />
                  </div>
                  <SheetEquippedWeaponsPanel
                    weapons={equippedWeaponCards}
                    buildInputs={characterBuildInputs}
                    weaponProficiencies={derived?.weaponProficiencies ?? []}
                  />
                  <SheetActionsPanel
                    actions={combatActions}
                    usedByActionId={usedActionUsesById}
                    onUsedChange={setUsedActionUsesById}
                    resolveContext={usesResolveContext}
                    resourceEntries={resourceEntries}
                    usedResourcesById={usedResourcesById}
                    onResourceUsedChange={setUsedResourcesById}
                    incapacitated={incapacitated}
                    psiLimit={psiLimit}
                  />
                  {!equippedWeaponCards.length && !combatActions.length ? (
                    <p className="text-xs text-muted-foreground italic">
                      No action-economy abilities listed.
                    </p>
                  ) : null}
                </div>

                {hasSpellcasting && (
                  <div className={`${SHEET_COMBAT_PANEL.spells} rounded-xl p-3 border border-border min-w-0`}>
                    <h2 className="text-sm font-bold text-foreground mb-2">Spells</h2>
                    {spellsGroupedByLevel.length ? (
                      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                        {spellsGroupedByLevel.map((group) => (
                          <div key={group.level}>
                            <h3 className={`text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5 sticky top-0 ${SHEET_COMBAT_PANEL.spells} py-0.5 z-10`}>
                              {group.label}
                              <span className="ml-1.5 font-medium text-muted-foreground/60 normal-case">
                                ({group.spells.length})
                              </span>
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                              {group.spells.map((spell) => (
                                <button
                                  key={spell.id}
                                  type="button"
                                  onClick={() => setSelectedSpell(spell)}
                                  title={spell.name}
                                  className="flex items-center justify-between gap-1 text-xs pl-2 pr-1.5 py-1.5 bg-muted rounded hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-colors text-left min-w-0"
                                >
                                  <span className="font-medium truncate min-w-0">{spell.name}</span>
                                  <span className="flex items-center gap-1 shrink-0">
                                    {alwaysPreparedSpellIds.has(spell.id) && (
                                      <span
                                        className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400"
                                        title="Always prepared by your subclass"
                                      />
                                    )}
                                    {spell.concentration && (
                                      <span
                                        className="text-[9px] font-bold text-purple-600 dark:text-purple-400"
                                        title="Concentration"
                                      >
                                        C
                                      </span>
                                    )}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No spells prepared</p>
                    )}
                  </div>
                )}
                </div>

                <div className="space-y-3 min-w-0">
                  <div className={`${SHEET_COMBAT_PANEL.initiative} rounded-xl p-3 border border-border`}>
                    <SheetInitiativeBlock
                      initiative={initiative}
                      statBreakdowns={statBreakdowns}
                      onInitiativeRoll={handleInitiativeRoll}
                      formatMod={formatMod}
                    />
                  </div>
                  <div className={`${SHEET_COMBAT_PANEL.spellcastingResources} rounded-xl p-3 border border-border`}>
                    <h2 className="text-sm font-bold text-foreground mb-2 text-left">
                      {hasSpellcasting ? "Spellcasting & Resources" : "Resources"}
                    </h2>
                    <div className="space-y-1">
                      {hasSpellcasting && spellAttackMod != null && Number.isFinite(spellAttackMod) && (
                        <div
                          className={`flex justify-between items-center gap-2 px-2 py-1.5 rounded text-xs font-medium ${combatStatHighlightClass}`}
                        >
                          <span>Spell Attack</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold tabular-nums">{formatMod(spellAttackMod)}</span>
                            <D20RollButton
                              modifier={spellAttackMod}
                              title="Roll spell attack"
                              rollContext={{ kind: "spell_attack" }}
                            />
                          </div>
                        </div>
                      )}
                      {hasSpellcasting && spellSaveDcEntries.length > 0 ? (
                        <div className="space-y-1">
                          {spellSaveDcEntries.map((entry) => {
                            const entryBuffed =
                              innateSorceryBuffActive && /^sorcerer$/i.test(entry.className) && entry.bonus > 0
                            return (
                              <div
                                key={entry.id}
                                className={`flex justify-between items-center gap-2 px-2 py-1.5 rounded text-xs font-medium ${
                                  entryBuffed ? combatStatHighlightClass : "bg-secondary/10"
                                }`}
                              >
                                <span className="min-w-0">{entry.label}</span>
                                <span className="flex items-center gap-1 shrink-0">
                                  <span className="font-bold tabular-nums">{entry.dc}</span>
                                  {spellSaveDcEntries.length === 1 && statBreakdowns ? (
                                    <StatExplainPopover
                                      title="Spell Save DC"
                                      total={entry.dc}
                                      contributions={breakdownLines(statBreakdowns, "spellSaveDc")}
                                    />
                                  ) : null}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                      <div
                        className={
                          hasSpellcasting && (spellAttackMod != null || spellSaveDcEntries.length > 0)
                            ? "pt-2 mt-1 border-t border-border/60"
                            : ""
                        }
                      >
                        {spellSlotTables.length > 0 && (
                          <div className="space-y-3">
                            {spellSlotTables.map((table) => {
                              const key = spellSlotTableKey(table)
                              return (
                                <SpellSlotTracker
                                  key={key}
                                  table={table}
                                  usedByLevel={usedSpellSlotsByKey[key] ?? table.slotsByLevel.map(() => 0)}
                                  onUsedChange={(used) =>
                                    setUsedSpellSlotsByKey((prev) => ({ ...prev, [key]: used }))
                                  }
                                />
                              )
                            })}
                          </div>
                        )}
                        {spendableResourceEntries.length > 0 && (
                          <ResourceUsesTracker
                            entries={spendableResourceEntries}
                            usedById={usedResourcesById}
                            onUsedChange={setUsedResourcesById}
                            resolveContext={usesResolveContext}
                          />
                        )}
                        {staticResourceEntries.length > 0 && (
                          <ClassResourceStaticDisplay
                            entries={staticResourceEntries}
                            resolveContext={usesResolveContext}
                          />
                        )}
                        {hasInfluencePointsMechanic && (influencePointCount > 0 || influencePointCap > 0) && (
                          <div className="mt-3 rounded-lg border border-violet-500/30 bg-violet-500/5 p-2.5">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-xs font-bold text-violet-800 dark:text-violet-200">
                                Influence points
                              </p>
                              <span className="text-[10px] tabular-nums text-muted-foreground">
                                {influencePointCount} / {influencePointCap}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mb-2">
                              Generate on turn start while In combat / high-stakes is on. Decay after 1
                              minute. Spending bypasses Psi Limit when enforced.
                            </p>
                            <button
                              type="button"
                              disabled={influencePointCount <= 0}
                              onClick={() => {
                                const result = spendInfluencePoints({
                                  accumulated: accumulatedResources,
                                  amount: 1,
                                })
                                setAccumulatedResources(result.accumulated)
                              }}
                              className="text-xs font-semibold rounded-md border border-violet-500/40 px-2 py-1 disabled:opacity-40"
                            >
                              Spend 1 Influence
                            </button>
                          </div>
                        )}
                        {specializedElement ? (
                          <p className="mt-2 text-[10px] text-muted-foreground">
                            Element specialization:{" "}
                            <span className="font-semibold capitalize">{specializedElement}</span>
                          </p>
                        ) : null}
                        {!spellSlotTables.length &&
                          !spendableResourceEntries.length &&
                          !staticResourceEntries.length && (
                          <p className="text-xs text-muted-foreground italic">
                            No class resources to track
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "equipment" && (
            <div className="space-y-3">
              <div className={`${SHEET_EQUIPMENT_PANEL} rounded-xl p-3 border border-border`}>
                <h2 className="text-sm font-bold text-foreground mb-2">Equipment</h2>
                <SheetEquipmentPanel
                  equipment={displayedEquipment}
                  catalog={equipmentCatalog.length ? equipmentCatalog : equipment}
                  equipmentBaseSelections={equipmentBaseSelections}
                  onBaseSelectionChange={(magicItemId, baseId) =>
                    void persistBaseSelection(magicItemId, baseId)
                  }
                  gold={characterGold}
                  onGoldChange={(gold) => void persistGold(gold)}
                  onAddEquipment={() => void openAddEquipmentOverlay()}
                  searchQuery={equipmentSearchQuery}
                  onSearchQueryChange={setEquipmentSearchQuery}
                  equippedArmorId={equippedArmorId}
                  equippedShieldId={equippedShieldId}
                  equippedWeaponId={equippedWeaponId}
                  equippedOffHandWeaponId={equippedOffHandWeaponId}
                  attunedItemIds={attunedItemIds}
                  maxAttunementSlots={derived?.attunementSlots ?? DEFAULT_ATTUNEMENT_SLOTS}
                  onEquipArmor={(id) => {
                    if (id) {
                      const item = equipment.find((entry) => entry.id === id)
                      if (
                        item &&
                        mustAttuneBeforeEquip(item) &&
                        !attunedItemIds.includes(id)
                      ) {
                        return
                      }
                    }
                    void persistEquipmentLoadout({ armorId: id })
                  }}
                  onEquipShield={(id) => {
                    if (id) {
                      const item = equipment.find((entry) => entry.id === id)
                      if (
                        item &&
                        mustAttuneBeforeEquip(item) &&
                        !attunedItemIds.includes(id)
                      ) {
                        return
                      }
                    }
                    void persistEquipmentLoadout({ shieldId: id })
                  }}
                  onEquipWeapon={(id) => {
                    if (id) {
                      const item = equipment.find((entry) => entry.id === id)
                      if (
                        item &&
                        mustAttuneBeforeEquip(item) &&
                        !attunedItemIds.includes(id)
                      ) {
                        return
                      }
                    }
                    void persistEquipmentLoadout({ weaponId: id })
                  }}
                  onEquipOffHandWeapon={(id) => {
                    if (id) {
                      const item = equipment.find((entry) => entry.id === id)
                      if (
                        item &&
                        mustAttuneBeforeEquip(item) &&
                        !attunedItemIds.includes(id)
                      ) {
                        return
                      }
                    }
                    void persistEquipmentLoadout({ offHandWeaponId: id })
                  }}
                  onToggleAttune={(itemId) => {
                    if (attunedItemIds.includes(itemId)) {
                      const nextAttuned = attunedItemIds.filter((id) => id !== itemId)
                      void persistAttunement(nextAttuned)
                      const clears: {
                        armorId?: string | null
                        shieldId?: string | null
                        weaponId?: string | null
                        offHandWeaponId?: string | null
                      } = {}
                      if (equippedArmorId === itemId) clears.armorId = null
                      if (equippedShieldId === itemId) clears.shieldId = null
                      if (equippedWeaponId === itemId) clears.weaponId = null
                      if (equippedOffHandWeaponId === itemId) clears.offHandWeaponId = null
                      if (Object.keys(clears).length > 0) {
                        void persistEquipmentLoadout(clears)
                      }
                      return
                    }
                    const cap = derived?.attunementSlots ?? DEFAULT_ATTUNEMENT_SLOTS
                    if (attunedItemIds.length >= cap) return
                    void persistAttunement([...attunedItemIds, itemId])
                  }}
                  onShowDetails={setSelectedEquipment}
                />
              </div>
            </div>
          )}

          {activeTab === "features" && (
            <div className={`${SHEET_TAB_CONTENT_CLASS} columns-1 sm:columns-2 gap-3 [&>section]:mb-3 [&>section]:break-inside-avoid`}>
              {magicItemPowers.length > 0 ? (
                <MagicItemPowersPanel
                  powers={magicItemPowers}
                  activeToggleIds={activeSheetToggleSet}
                  onTogglePower={toggleSheetToggle}
                  resourceEntries={resourceEntries}
                  usedResourcesById={usedResourcesById}
                  resolveContext={usesResolveContext}
                  classDetails={classDetails}
                  onActivatePower={(power) => {
                    if (!power.activationUses) return
                    const next = applyActivationUsesSpend({
                      uses: power.activationUses,
                      resourceEntries,
                      usedResourcesById,
                      classDetails,
                    })
                    if (next) setUsedResourcesById(next)
                  }}
                />
              ) : null}
              {classDetails.map((entry) => {
                const classFeatures = ((entry.class?.features as
                  | import("@/lib/types").Feature[]
                  | undefined)?.filter(
                  (feature) => feature.level <= entry.row.level && featureShowsOnSheetTab(feature),
                ) ?? [])
                if (!classFeatures.length) return null
                const dedupedFeatures = dedupeFeaturesByName(classFeatures)
                return (
                  <section key={entry.row.class_id} className={`${SHEET_FEATURES_PANEL} rounded-xl p-3 border border-border`}>
                    <h2 className="text-sm font-bold mb-2">
                      {entry.class?.name} Features
                      {classDetails.length > 1 ? ` (Level ${entry.row.level})` : ""}
                    </h2>
                    <div className="space-y-2">
                      {dedupedFeatures.map(({ feature, levels }, index) => (
                        <CollapsibleFeatureCard
                          key={`${entry.row.class_id}-${index}`}
                          name={feature.name}
                          level={feature.level}
                          levels={levels.length > 1 ? levels : undefined}
                          description={feature.description}
                        >
                          <RestSwappableChoiceControl
                            feature={feature}
                            classId={entry.row.class_id}
                            picks={
                              featureChoicePicks[
                                featureChoiceKey(entry.row.class_id, feature.name, feature.level)
                              ] ?? []
                            }
                            onChange={(key, next) => void persistFeatureChoicePicks(key, next)}
                          />
                        </CollapsibleFeatureCard>
                      ))}
                    </div>
                  </section>
                )
              })}

              {classDetails.map((entry) => {
                const subclassFeatures =
                  ((entry.subclass?.features as import("@/lib/types").Feature[] | undefined)?.filter(
                    (feature) => feature.level <= entry.row.level && featureShowsOnSheetTab(feature),
                  ) ?? [])
                if (!subclassFeatures.length || !entry.subclass) return null
                return (
                  <section
                    key={`${entry.row.class_id}-subclass`}
                    className={`${SHEET_FEATURES_PANEL} rounded-xl p-3 border border-border`}
                  >
                    <h2 className="text-sm font-bold mb-2">{entry.subclass.name} Features</h2>
                    <div className="space-y-2">
                      {subclassFeatures.map((feature, index) => (
                        <CollapsibleFeatureCard
                          key={index}
                          name={feature.name}
                          level={feature.level}
                          description={feature.description}
                        >
                          <RestSwappableChoiceControl
                            feature={feature}
                            classId={entry.row.class_id}
                            picks={
                              featureChoicePicks[
                                featureChoiceKey(entry.row.class_id, feature.name, feature.level)
                              ] ?? []
                            }
                            onChange={(key, next) => void persistFeatureChoicePicks(key, next)}
                          />
                        </CollapsibleFeatureCard>
                      ))}
                    </div>
                  </section>
                )
              })}

              {character.species?.traits && character.species.traits.length > 0 && (
                <section className={`${SHEET_FEATURES_PANEL} rounded-xl p-3 border border-border`}>
                  <h2 className="text-sm font-bold mb-2">{character.species.name} Traits</h2>
                  <div className="space-y-2">
                    {character.species.traits.map((trait, index) => (
                      <CollapsibleFeatureCard
                        key={index}
                        name={trait.name}
                        description={trait.description}
                      />
                    ))}
                  </div>
                </section>
              )}

              {character.backgrounds?.feature && (
                <section className={`${SHEET_FEATURES_PANEL} rounded-xl p-3 border border-border`}>
                  <h2 className="text-sm font-bold mb-2">Background Feature</h2>
                  <CollapsibleFeatureCard
                    name={character.backgrounds.feature.name}
                    description={character.backgrounds.feature.description}
                  />
                </section>
              )}

              {(originFeat || effectiveBackgroundFeatGranted || characterFeatsForDisplay.length > 0) && (
                <section className={`${SHEET_FEATURES_PANEL} rounded-xl p-3 border border-border`}>
                  <h2 className="text-sm font-bold mb-2">Feats &amp; Boons</h2>
                  <div className="space-y-2">
                    {(originFeat || effectiveBackgroundFeatGranted) && (
                      <CollapsibleFeatureCard
                        name={originFeat?.name ?? effectiveBackgroundFeatGranted ?? "Origin Feat"}
                        description={
                          originFeat?.description ?? "Granted by your background at 1st level."
                        }
                        collapsedLines={4}
                      />
                    )}
                    {characterFeatsForDisplay.map((feat, index) => (
                      <CollapsibleFeatureCard
                        key={`${feat.id}-${index}`}
                        name={feat.name}
                        description={feat.description}
                        collapsedLines={4}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === "companions" && (
            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {companionRows.length > 0 ? (
                <>
                  {companionRows.some((companion) => companion.polymorph) && (
                    <div className="bg-card rounded-xl border border-border p-3 space-y-1.5">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">
                        {WILD_SHAPE_DIRECTIONS.name}
                      </p>
                      <ExpandableDescription
                        text={WILD_SHAPE_DIRECTIONS.description}
                        className="text-[11px] leading-snug text-muted-foreground"
                      />
                      <p className="text-[10px] uppercase font-bold text-muted-foreground pt-1">
                        {WILD_SHAPE_GAME_STATISTICS.name}
                      </p>
                      <ExpandableDescription
                        text={WILD_SHAPE_GAME_STATISTICS.description}
                        className="text-[11px] leading-snug text-muted-foreground"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                    {companionRows.map((companion) => (
                      <div key={companion.key} className="space-y-2">
                        <CompanionStatPanel
                          companion={companion}
                          spellAttackModifier={spellAttackMod}
                          onHpChange={(hp) => updateCompanionHp(companion.key, hp)}
                          onConditionsChange={(conditions) =>
                            patchCompanionState(companion.key, { activeConditions: conditions })
                          }
                          onPolymorphActiveChange={(active) =>
                            patchCompanionState(companion.key, { polymorphActive: active })
                          }
                        />
                        {/astral construct/i.test(companion.template.name) ? (
                          <CompanionAttackRedirect
                            companionName={companion.displayName}
                            companionCurrentHp={companion.currentHp}
                            onApply={(nextHp, overflow) => {
                              updateCompanionHp(companion.key, nextHp)
                              if (overflow > 0) {
                                setCurrentHp((hp) => Math.max(0, hp - overflow))
                              }
                            }}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-card rounded-xl p-6 border border-border text-center">
                  <PawPrint className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-semibold text-foreground">No companions or beast forms yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Companions and beast forms appear when a class or subclass feature includes a
                    stat block (e.g. Steel Defender, Reanimated Companion, or the Druid&apos;s Wild Shape
                    Beast forms). Unlock the feature by level or import the subclass with a full
                    stat-block description.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "custom" && (
            <div className="bg-card rounded-xl p-3 border border-border">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-bold text-foreground">Custom Abilities</h2>
                <Link
                  href={compendiumEditHref("abilities", "new")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Custom Ability
                </Link>
              </div>
              {sheetCustomAbilities.length ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {sheetCustomAbilities.map((ability) => {
                    const uses = resolveUsesConfig(ability.characteristics, ability.uses)
                    return (
                      <div key={ability.id} className="p-2 bg-muted rounded-lg text-xs">
                        <p className="font-bold">{ability.name}</p>
                        {ability.description ? (
                          <ExpandableDescription
                            text={ability.description}
                            className="text-muted-foreground"
                          />
                        ) : null}
                        {uses && uses.type !== "unlimited" && (
                          <p className="text-[10px] text-magenta mt-1">
                            Uses: {uses.type === "fixed" ? uses.fixedAmount : uses.type}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No custom abilities</p>
              )}
            </div>
          )}
        </motion.div>
      </main>

      <AnimatePresence>
        {defaultActionsContext ? (
          <DefaultActionsOverlay
            key="default-actions"
            context={defaultActionsContext}
            onClose={() => setDefaultActionsContext(null)}
          />
        ) : null}
        {selectedEquipment ? (
          <EquipmentDetailOverlay
            key="equipment-detail"
            item={selectedEquipment}
            catalog={equipmentCatalog.length ? equipmentCatalog : equipment}
            baseSelections={equipmentBaseSelections}
            onClose={() => setSelectedEquipment(null)}
          />
        ) : null}
        <SheetAddEquipmentOverlay
          key="add-equipment"
          open={addEquipmentOpen}
          onClose={() => setAddEquipmentOpen(false)}
          catalog={equipmentCatalog}
          ownedIds={character?.equipment_ids ?? []}
          currentGold={characterGold}
          onAddItem={(item, options) => void handleAddEquipmentFromCatalog(item, options)}
        />
        {selectedSpell ? (
          <SpellDetailOverlay
            key="spell-detail"
            spell={selectedSpell}
            spellAttackMod={spellAttackMod}
            activeConcentration={getActiveConcentration(activeConditions)}
            onClose={() => setSelectedSpell(null)}
            psiLimit={psiLimit}
            castCost={spellCastCost}
            metamagicOptions={metamagicOptions}
            selectedMetamagicIds={selectedMetamagicIds}
            onMetamagicChange={setSelectedMetamagicIds}
            onCast={(result) => {
              if (result.concentrationApplied) {
                applyConcentration(result.concentrationApplied)
              }
              if (result.psiPointsSpent) {
                const spResourceId =
                  sorceryPointsState?.resourceId ??
                  (pointPoolClassDetail?.class
                    ? (() => {
                        const pool = getPointPoolSpellcasting(pointPoolClassDetail.class.spellcasting)
                        return pool
                          ? `${pointPoolClassDetail.row.class_id}_${pool.resource_key}`
                          : null
                      })()
                    : null)
                if (spResourceId) {
                  setUsedResourcesById((prev) => ({
                    ...prev,
                    [spResourceId]: (prev[spResourceId] ?? 0) + result.psiPointsSpent!,
                  }))
                }
              }
              if (result.arcanumUsed) {
                const arcanumEntry = resourceEntries.find((entry) =>
                  /innate arcanum/i.test(entry.name),
                )
                if (arcanumEntry) {
                  setUsedResourcesById((prev) => ({
                    ...prev,
                    [arcanumEntry.id]: (prev[arcanumEntry.id] ?? 0) + 1,
                  }))
                }
              }
              if (result.slotUsed && primarySpellSlotTable) {
                const key = spellSlotTableKey(primarySpellSlotTable)
                const used = usedSpellSlotsByKey[key] ?? primarySpellSlotTable.slotsByLevel.map(() => 0)
                const next = consumeSpellSlot(
                  used,
                  primarySpellSlotTable.slotsByLevel,
                  selectedSpell.level,
                )
                if (next) {
                  setUsedSpellSlotsByKey((prev) => ({ ...prev, [key]: next }))
                }
              }
            }}
            canUseSlot={
              selectedSpell.level === 0 ||
              spellCastCost?.mode === "point_pool" ||
              (primarySpellSlotTable != null &&
                (() => {
                  const key = spellSlotTableKey(primarySpellSlotTable)
                  const used = usedSpellSlotsByKey[key] ?? []
                  return (
                    (used[selectedSpell.level - 1] ?? 0) <
                    (primarySpellSlotTable.slotsByLevel[selectedSpell.level - 1] ?? 0)
                  )
                })())
            }
          />
        ) : null}
        {portraitZoomOpen && character.portrait_url ? (
          <motion.div
            key="portrait-zoom"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setPortraitZoomOpen(false)}
          >
            <button
              type="button"
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
              onClick={() => setPortraitZoomOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={character.portrait_url}
              alt={character.name}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <SiteFooter />
    </div>
      </SheetRollProvider>
    </SheetRollHistoryProvider>
  )
}
