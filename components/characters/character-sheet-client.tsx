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
  Award,
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
  Share2,
  Shield,
  ShieldCheck,
  Info,
  Swords,
  Scroll,
  Wand2,
  Battery,
  Package,
  Star,
  BookOpen,
  Layers,
  Pin,
  Moon,
  Printer,
  RefreshCw,
  GripVertical,
} from "lucide-react"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { findBackgroundGrantedFeat } from "@/lib/compendium/background-display"
import { getEffectiveBackgroundFeatGranted } from "@/lib/compendium/background-origin-feat"
import {
  characterRowToExportItem,
  downloadCharacterExport,
} from "@/lib/character/character-export-format"
import { collectPartyAllyCandidates } from "@/lib/character/party-ally-candidates"
import {
  normalizePartyCharacterIds,
  normalizePartyRow,
  type AdventuringParty,
} from "@/lib/character/party"
import {
  normalizeShareSnapshotRow,
  shareSnapshotHref,
} from "@/lib/character/share-snapshot"
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
import {
  getSkillsInAbilityOrder,
  getSkillsSorted,
  orderSkillsWithPins,
  ABILITY_ABBREVIATIONS,
  type SkillSortMode,
} from "@/lib/compendium/skills"
import { SKILL_DESCRIPTIONS, getSkillDescription } from "@/lib/compendium/skill-descriptions"
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
  advanceRampageDieTurn,
  defaultRampageTurnState,
  normalizeRampageDieSides,
  rampageDieGrantsUncontrollableMind,
  tantrumStepOnDamageTaken,
  tantrumStepOnInitiative,
  type RampageDieState,
  type RampageTurnState,
} from "@/lib/character/rampage-die"
import {
  characterHasUnstoppableRampage,
  characterKnowsTantrum,
  characterKnowsUncontrollableMind,
  empoweredPsionicsDamageBonus,
} from "@/lib/character/unleashed-mind"
import { RampageDieTracker } from "@/components/character-sheet/rampage-die-tracker"
import {
  applyTurnStartTriggers,
  collectTurnStartTriggers,
} from "@/lib/character/collect-turn-start-triggers"
import { getPointPoolSpellcasting } from "@/lib/character/point-pool-spellcasting"
import {
  metamagicOptionsForCharacter,
  manipulateMagicCatalogPickIds,
  mortalMetamagicOptionsFromFeatures,
  resolveSpellCastCost,
} from "@/lib/character/resolve-spell-cast-cost"
import {
  collectResourceCastSpellIds,
  collectSpellResourceCastCosts,
} from "@/lib/character/spell-resource-cast-costs"
import { resolveUsesAtLevel } from "@/lib/compendium/resolve-uses-config"
import { DeathSaveTracker } from "@/components/character-sheet/death-save-tracker"
import { SheetActionsPanel } from "@/components/character-sheet/sheet-actions-panel"
import { SheetEquippedWeaponsPanel } from "@/components/character-sheet/sheet-equipped-weapons-panel"
import { SheetActionEconomyTracker } from "@/components/character-sheet/sheet-action-economy-tracker"
import { SheetStandardActionButtons } from "@/components/character-sheet/sheet-standard-action-buttons"
import { SheetSectionHeading } from "@/components/character-sheet/sheet-section-heading"
import { SheetEquipmentPanel } from "@/components/character-sheet/sheet-equipment-panel"
import { SheetAddEquipmentOverlay } from "@/components/character-sheet/sheet-add-equipment-overlay"
import { SheetRollHistoryProvider } from "@/components/character-sheet/sheet-roll-history-context"
import { ManualRollTrigger } from "@/components/character-sheet/manual-roll-trigger"
import { resolveClassResourcesForClass } from "@/lib/compendium/resolve-class-resources"
import { collectClassResourceSpendKeys } from "@/lib/compendium/class-resource-display"
import { isClassResourceUnlockedForSubclasses } from "@/lib/compendium/subclass-gated-class-resources"
import {
  ClassResourceStaticDisplay,
  partitionResourceTrackerEntries,
} from "@/components/character-sheet/class-resource-static-display"
import type { ClassResource } from "@/lib/types"
import { DEFAULT_ATTUNEMENT_SLOTS, mustAttuneBeforeEquip } from "@/lib/compendium/equipment-attunement"
import { resolveCharacterEquipment } from "@/lib/compendium/equipment-base-selection"
import { collectSheetActions } from "@/lib/character/sheet-actions"
import type { ActionEconomyKind } from "@/lib/character/sheet-actions"
import {
  actionEconomyKindFromCastingTime,
  characterCanRollHitDiceOutsideShortRest,
  emptyActionEconomySpent,
  type ActionEconomySpent,
} from "@/lib/character/action-economy"
import { SHEET_STATUS_ROW, SHEET_BANNER_BADGE, SHEET_BANNER_BUTTON, SHEET_BANNER_CHIP, SHEET_ABILITIES_PANEL, SHEET_COMBAT_PANEL, SHEET_EQUIPMENT_PANEL, SHEET_FEATURES_PANEL, SHEET_DETAILS_PANEL, SHEET_MAIN_CLASS, SHEET_TAB_CONTENT_CLASS, abilityScoreTileClass, abilityScoreModifierFrameClass, abilityScorePillClass } from "@/lib/character/sheet-status-colors"
import { useAppTheme } from "@/components/providers/app-theme-provider"
import { compendiumEditHref } from "@/lib/compendium/edit-href"
import { resolvePsiLimit } from "@/lib/character/resolve-psi-limit"
import { collectAlternateAbilityChecks } from "@/lib/character/alternate-ability-checks"
import { collectSubclassAlwaysPreparedSpells } from "@/lib/character/subclass-granted-spells"
import { featureChoiceKey } from "@/lib/builder/choices"
import { isWeaponMasteryFeature } from "@/lib/compendium/weapon-mastery-choice"
import { resolveFeatureChoiceCount } from "@/lib/compendium/resolve-feature-choice-count"
import { collectSelectedCustomAbilityNames } from "@/lib/builder/picked-custom-abilities"
import { catalogFeatPickIdsFromPicks } from "@/lib/builder/catalog-feat-options"
import { collectKnownDisciplineNames } from "@/lib/builder/aggregate-psionic-talents"
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
  clearExclusiveSheetToggleGroup,
  END_WEAPON_MORPH_TOGGLE_ID,
  GUARDIAN_TACTICS_TOGGLES,
  inactiveSheetToggleLabel,
  PRIMORDIAL_ASPECT_TOGGLES,
  sheetToggleDefinitionsFromNewToggles,
  WEAPON_MORPH_TOGGLES,
  type SheetToggleDefinition,
} from "@/lib/compendium/sheet-toggle-registry"
import {
  createMutationDieGrant,
  stepMutationDie,
  type MutationDieGrant,
} from "@/lib/character/mutation-die"
import {
  createIllusionToken,
  type IllusionTokenKind,
  type IllusionTokenState,
} from "@/lib/character/illusion-tokens"
import {
  activeWeaponMorphOption,
  buildWeaponMorphAttack,
  WEAPON_MORPH_EXCLUSIVE_GROUP,
} from "@/lib/character/weapon-morph"
import { MutationDieTracker } from "@/components/character-sheet/mutation-die-tracker"
import { IllusionTokensPanel } from "@/components/character-sheet/illusion-tokens-panel"
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
import {
  bankBalanceOfPower,
  characterHasBalanceOfPowerMechanic,
  currentBalanceOfPower,
  psionLevelForBalanceOfPower,
  spendBalanceOfPower,
} from "@/lib/character/balance-of-power"
import { perfectedEnhancementBonus as resolvePerfectedEnhancementBonus } from "@/lib/character/perfected-enhancement"
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
import { SheetRestChooser } from "@/components/character-sheet/sheet-rest-chooser"
import { BannerStatusMenu } from "@/components/character-sheet/banner-status-menu"
import { SheetRestOverlay } from "@/components/character-sheet/sheet-rest-overlay"
import { applySheetRest, applyInitiativeResourceRecharge } from "@/lib/character/sheet-rest"
import { buildHitDicePool, recoverHitDiceOnLongRest, spendHitDiceFromPool, totalHitDiceRemaining } from "@/lib/character/hit-dice"
import type { Feature, RestType } from "@/lib/types"
import { weaponTargetFromEquipment } from "@/lib/builder/weapon-property-prerequisite"
import { aggregateWeaponMasteryOptionsForWeapon } from "@/lib/builder/upgrade-choices"
import {
  extraMasteriesForWeapon,
  extraWeaponMasteryPickKey,
  extraWeaponMasterySlotCountFromClassFeatures,
} from "@/lib/character/weapon-mastery-picks"
import type { CharacterCompanionState } from "@/lib/character/companion-stat-block"
import {
  formSelectionsFromState,
  mergeCompanionState,
  resolveCharacterCompanionsDetailed,
  activePolymorphCompanion,
  type CompanionFormGroup,
} from "@/lib/character/resolve-companions"
import { CompanionFormPicker } from "@/components/characters/companion-form-picker"
import { getDerivedCharacterBreakdowns, breakdownLines } from "@/lib/character/get-derived-breakdowns"
import { StatExplainPopover } from "@/components/character-sheet/stat-explain-popover"
import { CompanionStatPanel } from "@/components/character-sheet/companion-stat-panel"
import { CompanionAttackRedirect } from "@/components/character-sheet/companion-attack-redirect"
import { SheetPersistentStatsBar } from "@/components/character-sheet/sheet-persistent-stats-bar"
import { HitDiceTracker } from "@/components/character-sheet/hit-dice-tracker"
import { SheetTabNav, type SheetTab } from "@/components/character-sheet/sheet-tab-nav"
import { SheetTabSectionNav } from "@/components/character-sheet/sheet-tab-section-nav"
import { DurationRemindersPanel } from "@/components/character-sheet/duration-reminders-panel"
import { SkillAbilityLabel } from "@/components/character-sheet/skill-ability-label"
import { useManualSkillAbility } from "@/components/settings/use-manual-skill-ability"
import { setSkillAbilityOverride } from "@/lib/character/skill-ability-overrides"
import { FeatureCardMenu } from "@/components/character-sheet/feature-card-menu"
import { LevelUpWizard } from "@/components/character-sheet/level-up-wizard"
import { withChosenOptionChrome } from "@/lib/character/chosen-option-label"
import {
  applyOrder,
  defaultFeatureLayout,
  loadFeatureLayout,
  moveOrderedId,
  saveFeatureLayout,
  sortPinnedFirst,
  toggleActionPin,
  togglePinnedFeature,
  type FeatureLayoutState,
} from "@/lib/character/feature-layout"
import {
  buildFeatureTabSections,
  featureTabNavLabel,
} from "@/lib/character/feature-tab-sections"
import { rememberLastCharacterId } from "@/lib/site-settings/resume-last-character"
import { createDurationReminder, type DurationReminder } from "@/lib/character/duration-reminders"
import type { SheetActionEntry } from "@/lib/character/sheet-actions"
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

const ABILITY_FULL_LABELS: Record<string, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
}

const SHEET_SELECTABLE_CONDITIONS = SRD_CONDITIONS.filter(
  (condition) => condition.name !== "Exhaustion",
)

const MANUAL_CONCENTRATION = "Concentration: (active)"
const CONCENTRATION_CONDITION_DESCRIPTION =
  "You are concentrating on a spell or effect. Concentration ends if you take damage and fail a Constitution save, cast another concentration spell, or become incapacitated."

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

function normalizeResourceName(value: string): string {
  return value.trim().toLowerCase().replace(/[_\s]+/g, " ")
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

/** Sheet-only display title — ASI features read as Feat or ASI. */
function sheetFeatureDisplayName(name: string): string {
  return /^ability score improvement$/i.test(name.trim()) ? "Feat or ASI" : name
}

const HEROIC_INSPIRATION_TIP =
  "If you have Heroic Inspiration, you can expend it when you roll any die to reroll it. You must use the new roll. You typically gain it from the DM or from features that grant it."

/** A feature/trait card whose body can be accordioned away, leaving just the title row. */
function CollapsibleFeatureCard({
  name,
  level,
  levels,
  description,
  collapsedLines,
  children,
  chosenLabel,
  menu,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  name: string
  level?: number | null
  levels?: number[]
  description?: string | null
  collapsedLines?: number
  children?: React.ReactNode
  chosenLabel?: string | null
  menu?: React.ReactNode
  draggable?: boolean
  onDragStart?: () => void
  onDragOver?: (event: React.DragEvent) => void
  onDrop?: () => void
}) {
  const [open, setOpen] = useState(true)
  const displayName = withChosenOptionChrome(sheetFeatureDisplayName(name), chosenLabel ? [chosenLabel] : [])
  const levelLabel =
    levels && levels.length
      ? levels.map((value) => `Lv ${value}`).join(", ")
      : level != null
        ? `Lv ${level}`
        : null
  return (
    <div
      className="bg-muted rounded-lg text-xs overflow-hidden"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={(event) => {
        event.preventDefault()
        onDrop?.()
      }}
    >
      <div className="flex items-stretch">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-w-0 flex-1 items-center justify-between gap-2 p-2 text-left hover:bg-muted/70 transition-colors"
        aria-expanded={open}
      >
        <span className="font-bold min-w-0">
          {displayName}
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
      {menu ? <div className="flex items-center pr-1">{menu}</div> : null}
      </div>
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
 * (e.g. Circle of the Land's land type). Weapon Mastery is display-only here — swaps happen
 * from the Long Rest overlay.
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

  if (isWeaponMasteryFeature(feature)) {
    return (
      <div className="mt-2 rounded-md border border-border bg-background/60 p-2 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Current weapon masteries
        </p>
        {picks.length ? (
          <div className="flex flex-wrap gap-1.5">
            {picks.map((pick) => (
              <span
                key={pick}
                className="inline-flex rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-foreground"
              >
                {pick}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">None chosen yet.</p>
        )}
        <p className="text-[10px] text-muted-foreground">
          Change these when you finish a {restLabel} (Rest button).
        </p>
      </div>
    )
  }

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
  const [partyForAllies, setPartyForAllies] = useState<AdventuringParty | null>(null)
  const [partyCharacters, setPartyCharacters] = useState<Character[]>([])
  const [shareStatus, setShareStatus] = useState<string | null>(null)
  const [activeConditions, setActiveConditions] = useState<string[]>([])
  const [exhaustionLevel, setExhaustionLevel] = useState(0)
  const [activeSheetToggleIds, setActiveSheetToggleIds] = useState<string[]>([])
  const [sessionHydrated, setSessionHydrated] = useState(false)
  const [acFormulaPick, setAcFormulaPick] = useState<string | null>(null)
  const [conditionDropdownOpen, setConditionDropdownOpen] = useState(false)
  const [sheetMenuOpen, setSheetMenuOpen] = useState(false)
  const [portraitZoomOpen, setPortraitZoomOpen] = useState(false)
  const [bannerRestOpen, setBannerRestOpen] = useState(false)
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
  const [actionEconomySpent, setActionEconomySpent] = useState<ActionEconomySpent>(emptyActionEconomySpent)
  const [usedHitDiceByClassId, setUsedHitDiceByClassId] = useState<Record<string, number>>({})
  const [shortRestHitDiceOpen, setShortRestHitDiceOpen] = useState(false)
  const [restOverlay, setRestOverlay] = useState<{
    rest: RestType
    summary: string[]
  } | null>(null)
  const [realTimeCooldowns, setRealTimeCooldowns] = useState<RealTimeCooldownState>({})
  const [accumulatedResources, setAccumulatedResources] = useState<
    Record<string, AccumulatedResourceState>
  >({})
  const [resourceDieSidesByKey, setResourceDieSidesByKey] = useState<Record<string, number>>({})
  const [rampageTurn, setRampageTurn] = useState<RampageTurnState>(defaultRampageTurnState())
  const [mutationDie, setMutationDie] = useState<MutationDieGrant | null>(null)
  const [fleshWarpAllyBenefitCounts, setFleshWarpAllyBenefitCounts] = useState<
    Record<string, number>
  >({})
  const [illusionTokens, setIllusionTokens] = useState<IllusionTokenState[]>([])
  const [skillSortMode, setSkillSortMode] = useState<SkillSortMode>("ability")
  const [pinnedSkillNames, setPinnedSkillNames] = useState<string[]>([])
  const [pinnedEquipmentIds, setPinnedEquipmentIds] = useState<string[]>([])
  const [durationReminders, setDurationReminders] = useState<DurationReminder[]>([])
  const [skillAbilityOverrides, setSkillAbilityOverrides] = useState<Record<string, AbilityScoreKey>>({})
  const { enabled: manualSkillAbilityEnabled } = useManualSkillAbility()
  const [featureLayout, setFeatureLayout] = useState<FeatureLayoutState>(defaultFeatureLayout)
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  const [sheetReloadKey, setSheetReloadKey] = useState(0)
  const [featureDrag, setFeatureDrag] = useState<{ kind: "section" | "item"; id: string; sectionId?: string } | null>(
    null,
  )
  const featureDragRef = useRef(featureDrag)
  useEffect(() => {
    featureDragRef.current = featureDrag
  }, [featureDrag])
  const [skillsInfoOpen, setSkillsInfoOpen] = useState(false)
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
    if (!id) return
    const loadPartyContext = async () => {
      const db = createClient()
      const { data, error } = await db.from("parties").select("*").order("name")
      if (error || !data) {
        setPartyForAllies(null)
        setPartyCharacters([])
        return
      }
      const parties = asCompendiumRows(data).map((row) => normalizePartyRow(row))
      const matching = parties.find((party) =>
        normalizePartyCharacterIds(party.character_ids).includes(id),
      )
      setPartyForAllies(matching ?? null)
      if (!matching) {
        setPartyCharacters([])
        return
      }
      const memberIds = normalizePartyCharacterIds(matching.character_ids)
      const { data: memberRows } = await db.from("characters").select("*").in("id", memberIds)
      setPartyCharacters(
        asCompendiumRows<Character & Record<string, unknown>>(memberRows) as Character[],
      )
    }
    void loadPartyContext()
  }, [id])

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
        setResourceDieSidesByKey(playState.resourceDieSidesByKey)
        setRampageTurn(playState.rampageTurn)
        setMutationDie(playState.mutationDie)
        setFleshWarpAllyBenefitCounts(playState.fleshWarpAllyBenefitCounts)
        setIllusionTokens(playState.illusionTokens)
        setSkillSortMode(playState.skillSortMode)
        setPinnedSkillNames(playState.pinnedSkillNames)
        setPinnedEquipmentIds(playState.pinnedEquipmentIds)
        setDurationReminders(playState.durationReminders ?? [])
        setSkillAbilityOverrides(playState.skillAbilityOverrides ?? {})
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
  }, [id, sheetReloadKey])

  useEffect(() => {
    if (id) rememberLastCharacterId(id)
  }, [id])

  useEffect(() => {
    if (id) setFeatureLayout(loadFeatureLayout(id))
  }, [id])

  useEffect(() => {
    if (id) saveFeatureLayout(id, featureLayout)
  }, [id, featureLayout])

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
        resourceDieSidesByKey,
        rampageTurn,
        mutationDie,
        fleshWarpAllyBenefitCounts,
        illusionTokens,
        skillSortMode,
        pinnedSkillNames,
        pinnedEquipmentIds,
        durationReminders,
        skillAbilityOverrides,
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
    resourceDieSidesByKey,
    rampageTurn,
    mutationDie,
    fleshWarpAllyBenefitCounts,
    illusionTokens,
    skillSortMode,
    pinnedSkillNames,
    pinnedEquipmentIds,
    durationReminders,
    skillAbilityOverrides,
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
    // Uncontrollable Mind reads the Rampage Die rather than a clicked toggle.
    if (
      resourceDieSidesByKey.rampage_die != null &&
      rampageDieGrantsUncontrollableMind(resourceDieSidesByKey.rampage_die)
    ) {
      effectiveSheetToggles.add("rampage_die_d8_plus")
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
      customAbilities,
      equipmentCatalog,
      equippedArmorId,
      equippedShieldId,
      equippedWeaponId,
      equippedOffHandWeaponId,
      attunedItemIds,
      equipmentBaseSelections,
      activeSheetToggles: effectiveSheetToggles,
      activeConditions,
      skillAbilityOverrides: manualSkillAbilityEnabled ? skillAbilityOverrides : undefined,
    }
  }, [
    character,
    characterFeats,
    equipment,
    equipmentCatalog,
    modifierCatalog,
    featureChoicePicks,
    customAbilities,
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
    resourceDieSidesByKey.rampage_die,
    skillAbilityOverrides,
    manualSkillAbilityEnabled,
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

  const persistLinkedEquipmentChoice = useCallback(
    async (key: string, value: string) => {
      await persistFeatureChoicePicks(key, value ? [value] : [])
      if (!value) return
      const item = (equipmentCatalog.length ? equipmentCatalog : equipment).find(
        (entry) => entry.name.trim().toLowerCase() === value.toLowerCase(),
      )
      if (item && !character?.equipment_ids?.includes(item.id)) {
        await handleAddEquipmentFromCatalog(item, { deductCost: false })
      }
    },
    [
      character?.equipment_ids,
      equipment,
      equipmentCatalog,
      handleAddEquipmentFromCatalog,
      persistFeatureChoicePicks,
    ],
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

  const longRestWeaponMasteryChoices = useMemo(() => {
    const entries: {
      key: string
      className: string
      feature: Feature
      classLevel: number
      picks: string[]
      count: number
    }[] = []
    for (const entry of classDetails) {
      const className = entry.class?.name ?? "Class"
      for (const feature of entry.class?.features ?? []) {
        if ((feature.level ?? 1) > entry.row.level) continue
        if (!isWeaponMasteryFeature(feature)) continue
        if (!feature.choices?.swappableOnRest || !feature.choices.options?.length) continue
        const key = featureChoiceKey(entry.row.class_id, feature.name, feature.level)
        const count = resolveFeatureChoiceCount(
          feature.choices,
          entry.row.level,
          className,
        )
        entries.push({
          key,
          className,
          feature,
          classLevel: entry.row.level,
          picks: featureChoicePicks[key] ?? [],
          count: Math.max(1, count),
        })
      }
    }
    return entries
  }, [classDetails, featureChoicePicks])

  const extraWeaponMasterySlotCount = useMemo(
    () => extraWeaponMasterySlotCountFromClassFeatures(classDetails),
    [classDetails],
  )

  const extraMasteryByWeaponId = useMemo(() => {
    if (!extraWeaponMasterySlotCount) return {}
    const classNames = classDetails
      .map((entry) => entry.class?.name)
      .filter((name): name is string => Boolean(name))
    const classLevel = classDetails.reduce((max, entry) => Math.max(max, entry.row.level), 0)
    const map: Record<
      string,
      { slotCount: number; picks: string[]; options: { name: string; description?: string }[] }
    > = {}
    for (const item of equipment) {
      if (!/weapon/i.test(item.category ?? "")) continue
      map[item.id] = {
        slotCount: extraWeaponMasterySlotCount,
        picks: extraMasteriesForWeapon(featureChoicePicks, item.id),
        options: aggregateWeaponMasteryOptionsForWeapon({
          customAbilities,
          classNames,
          classLevel,
          weapon: weaponTargetFromEquipment(item),
        }),
      }
    }
    return map
  }, [extraWeaponMasterySlotCount, classDetails, equipment, featureChoicePicks, customAbilities])

  const extraWeaponMasteryRestChoices = useMemo(
    () =>
      Object.entries(extraMasteryByWeaponId).map(([equipmentId, control]) => ({
        equipmentId,
        weaponName: equipment.find((item) => item.id === equipmentId)?.name ?? "Weapon",
        slotCount: control.slotCount,
        picks: control.picks,
        options: control.options,
      })),
    [extraMasteryByWeaponId, equipment],
  )

  const persistExtraWeaponMasteries = useCallback(
    (equipmentId: string, names: string[]) => {
      void persistFeatureChoicePicks(extraWeaponMasteryPickKey(equipmentId), names)
    },
    [persistFeatureChoicePicks],
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
    const hasGuardianTactics = classDetails.some((entry) =>
      [...(entry.class?.features ?? []), ...(entry.subclass?.features ?? [])].some((feature) =>
        /^guardian tactics$/i.test(feature.name ?? ""),
      ),
    )
    if (hasGuardianTactics) dynamic.push(...GUARDIAN_TACTICS_TOGGLES)
    // Always available for exclusive-group activation from Weapon Morph Use menu.
    dynamic.push(...WEAPON_MORPH_TOGGLES)
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
        (toggle) =>
          toggle.id !== "below_half_hp" &&
          toggle.id !== "quarry_marked" &&
          !toggle.id.startsWith("weapon_morph_"),
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

  /** Force a toggle on (does not turn it off if already active). Exclusive groups still clear peers. */
  const activateSheetToggle = useCallback(
    (toggleId: string) => {
      if (toggleId === END_WEAPON_MORPH_TOGGLE_ID) {
        setActiveSheetToggleIds((prev) =>
          clearExclusiveSheetToggleGroup(prev, WEAPON_MORPH_EXCLUSIVE_GROUP, sheetToggleDefinitions),
        )
        return
      }
      setActiveSheetToggleIds((prev) => {
        if (prev.includes(toggleId)) return prev
        return applySheetToggleChange(prev, toggleId, sheetToggleDefinitions)
      })
    },
    [sheetToggleDefinitions],
  )

  const spawnIllusionToken = useCallback((kind: IllusionTokenKind) => {
    const next = createIllusionToken({ kind })
    setIllusionTokens((prev) =>
      kind === "projected_self"
        ? [...prev.filter((token) => token.kind !== "projected_self"), next]
        : [...prev, next],
    )
  }, [])

  const grantMutationDieFromAction = useCallback(
    (opts: { autoApplyStrength: boolean; perfected: boolean; targetLabel: string }) => {
      let grant = createMutationDieGrant({
        autoApplyStrength: opts.autoApplyStrength,
        targetLabel: opts.targetLabel,
      })
      if (opts.perfected) grant = stepMutationDie(grant, 1)
      setMutationDie(grant)
      const label = opts.targetLabel.trim()
      if (label && !/^self$/i.test(label)) {
        setFleshWarpAllyBenefitCounts((prev) => ({
          ...prev,
          [label]: (prev[label] ?? 0) + 1,
        }))
      }
    },
    [],
  )

  const markActionEconomy = useCallback((kind: ActionEconomyKind) => {
    setActionEconomySpent((prev) => (prev[kind] ? prev : { ...prev, [kind]: true }))
  }, [])

  const toggleActionEconomy = useCallback((kind: ActionEconomyKind) => {
    setActionEconomySpent((prev) => ({ ...prev, [kind]: !prev[kind] }))
  }, [])

  const resetActionEconomy = useCallback(() => {
    setActionEconomySpent(emptyActionEconomySpent())
  }, [])

  const renderManualToggleButton = useCallback(
    (toggle: { id: string; label: string }) => {
      const active = activeSheetToggleIds.includes(toggle.id)
      const isRagingToggle = toggle.id === "while_raging"
      const isInnateSorceryToggle = toggle.id === "while_innate_sorcery_active"
      const label = active ? toggle.label : inactiveSheetToggleLabel(toggle.label)
      const RagingIcon = active ? Angry : Smile
      return (
        <button
          key={toggle.id}
          type="button"
          aria-pressed={active}
          onClick={() => toggleSheetToggle(toggle.id)}
          className={`min-h-11 w-full shrink-0 whitespace-nowrap rounded-lg border px-3 text-sm font-semibold transition-colors sm:w-auto ${
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
        resourceDieSidesByKey,
        rampageTurn,
        mutationDie,
        fleshWarpAllyBenefitCounts,
        illusionTokens,
        skillSortMode,
        pinnedSkillNames,
        pinnedEquipmentIds,
        durationReminders,
        skillAbilityOverrides,
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
      resourceDieSidesByKey,
      rampageTurn,
      mutationDie,
      fleshWarpAllyBenefitCounts,
      illusionTokens,
      skillSortMode,
      pinnedSkillNames,
      pinnedEquipmentIds,
      durationReminders,
      skillAbilityOverrides,
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
    const seenIds = new Set<string>()
    for (const entry of classDetails) {
      const className = entry.class?.name
      if (!className || !entry.class) continue
      const subclassNames = entry.subclass?.name ? [entry.subclass.name] : []
      const resources = resolveClassResourcesForClass(entry.class)
      for (const resource of resources) {
        if (resource.uses.type === "class_resource") continue
        if (resource.id === "spell_slots") continue
        if (!isClassResourceUnlockedForSubclasses(resource, className, subclassNames)) {
          continue
        }
        const id = `${entry.row.class_id}_${resource.id}`
        if (seenIds.has(id)) continue
        seenIds.add(id)
        entries.push({
          id,
          name:
            classDetails.length > 1 || resources.length > 1
              ? `${resource.name} (${className})`
              : resource.name,
          uses: resource.uses,
          classLevel: entry.row.level,
        })
      }
    }
    for (const featureEntry of collectFeatureUsesResources(classDetails, modifierCatalog)) {
      if (seenIds.has(featureEntry.id)) continue
      seenIds.add(featureEntry.id)
      entries.push(featureEntry)
    }
    return entries
  }, [classDetails, modifierCatalog])

  const hasUnleashedMind = useMemo(
    () =>
      classDetails.some((entry) =>
        /unleashed mind/i.test(entry.subclass?.name ?? ""),
      ),
    [classDetails],
  )
  const classResourceDieSides = useMemo(() => {
    const sides = buildClassResourceDieSidesMap(classDetails, resourceDieSidesByKey)
    // Imported subclass resources live in their own table and may not yet be
    // embedded on an older Psion class row. The subclass itself is sufficient
    // proof that this character owns Rampage Die.
    if (hasUnleashedMind) {
      sides.rampage_die = normalizeRampageDieSides(resourceDieSidesByKey.rampage_die)
    }
    return sides
  }, [classDetails, hasUnleashedMind, resourceDieSidesByKey])
  const rampageDieSides = classResourceDieSides.rampage_die ?? null

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
        byId.set(`${entry.row.class_id}_${resource.id}`, resource)
      }
    }
    return byId
  }, [classDetails])

  const hasFerocityMechanic = useMemo(
    () =>
      classDetails.some(
        (entry) =>
          entry.class &&
          resolveClassResourcesForClass(entry.class).some(
            (resource) => resource.id === "ferocity",
          ),
      ),
    [classDetails],
  )

  const { spendableResourceEntries, staticResourceEntries } = useMemo(() => {
    const { spendable, static: staticEntries } = partitionResourceTrackerEntries(
      resourceEntries,
      classResourcesById,
      classResourceSpendKeys,
    )
    return {
      spendableResourceEntries: spendable,
      // Rampage Die has a dedicated mutable play-state control below; the
      // generic static renderer would always show its baseline d4.
      staticResourceEntries: staticEntries.filter(
        (entry) => entry.resource.id !== "rampage_die",
      ),
    }
  }, [resourceEntries, classResourcesById, classResourceSpendKeys])

  const sheetCustomAbilities = useMemo(() => {
    if (!character) return []
    const selectedAbilityNames = collectSelectedCustomAbilityNames({
      featureChoicePicks,
      grantedCustomAbilityNames: derived?.grantedCustomAbilityNames,
    })
    const knownDisciplineNames = collectKnownDisciplineNames({
      customAbilities,
      featureChoicePicks,
      grantedAbilityNames: derived?.grantedCustomAbilityNames,
    })
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
      selectedAbilityNames,
      knownDisciplineNames,
    })
  }, [
    customAbilities,
    character,
    classDetails,
    characterFeats,
    originFeat,
    equipment,
    featureChoicePicks,
    derived?.grantedCustomAbilityNames,
  ])

  const spellResourceCastCosts = useMemo(
    () =>
      collectSpellResourceCastCosts({
        customAbilities: sheetCustomAbilities,
        featureChoicePicks,
        spellCatalog: spellCatalog.length ? spellCatalog : spells,
      }),
    [sheetCustomAbilities, featureChoicePicks, spellCatalog, spells],
  )

  const resourceCastSpellIds = useMemo(
    () => collectResourceCastSpellIds(spellResourceCastCosts),
    [spellResourceCastCosts],
  )

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
        resourceKey: pool.resource_key,
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
      resourceKey: "sorcery_points",
      available: Math.max(0, maxPoints - usedPoints),
    }
  }, [
    pointPoolClassDetail,
    resourceEntries,
    usedResourcesById,
    usesResolveContext,
  ])

  const availablePointsForResourceKey = useCallback(
    (resourceKey: string | null | undefined): { resourceId: string | null; available: number } => {
      if (!resourceKey) {
        return {
          resourceId: sorceryPointsState?.resourceId ?? null,
          available: sorceryPointsState?.available ?? 0,
        }
      }
      const entry = resourceEntries.find(
        (row) =>
          row.id.endsWith(`_${resourceKey}`) ||
          row.id === resourceKey ||
          normalizeResourceName(row.name) === normalizeResourceName(resourceKey),
      )
      if (!entry) {
        if (sorceryPointsState?.resourceKey === resourceKey) {
          return {
            resourceId: sorceryPointsState.resourceId,
            available: sorceryPointsState.available,
          }
        }
        return { resourceId: null, available: 0 }
      }
      const maxPoints = resolveUsesAtLevel(entry.uses, entry.classLevel, usesResolveContext) ?? 0
      const usedPoints = usedResourcesById[entry.id] ?? 0
      return {
        resourceId: entry.id,
        available: Math.max(0, maxPoints - usedPoints),
      }
    },
    [resourceEntries, usedResourcesById, usesResolveContext, sorceryPointsState],
  )

  const metamagicOptions = useMemo(() => {
    const featIds = [
      ...(character?.feat_ids ?? []),
      ...characterFeats.map((feat) => feat.id),
      ...(originFeat ? [originFeat.id] : []),
      ...catalogFeatPickIdsFromPicks(featureChoicePicks),
    ]
    const fromFeats = metamagicOptionsForCharacter({
      featIds,
      feats: [...characterFeats, ...(originFeat ? [originFeat] : [])],
      customAbilities,
      selectedCustomAbilityNames: sheetCustomAbilities.map((ability) => ability.name),
      spellLevel: selectedSpell?.level ?? 1,
      manipulateMagicPickIds: manipulateMagicCatalogPickIds(featureChoicePicks),
    })
    const fromMortal = mortalMetamagicOptionsFromFeatures(
      classDetails.flatMap((entry) => [
        ...(entry.class?.features ?? []),
        ...(entry.subclass?.features ?? []),
      ]) as Parameters<typeof mortalMetamagicOptionsFromFeatures>[0],
    )
    const seen = new Set(fromFeats.map((row) => row.id))
    const merged = [...fromFeats]
    for (const option of fromMortal) {
      if (seen.has(option.id)) continue
      seen.add(option.id)
      merged.push(option)
    }
    return merged.sort((a, b) => a.name.localeCompare(b.name))
  }, [
    character?.feat_ids,
    characterFeats,
    originFeat,
    customAbilities,
    sheetCustomAbilities,
    selectedSpell?.level,
    classDetails,
    featureChoicePicks,
  ])

  const selectedMetamagic = useMemo(
    () => metamagicOptions.filter((option) => selectedMetamagicIds.includes(option.id)),
    [metamagicOptions, selectedMetamagicIds],
  )

  const spellCastCost = useMemo(() => {
    if (!selectedSpell) return null

    const spellResourceCost = spellResourceCastCosts.get(selectedSpell.id) ?? null
    const pointsState = availablePointsForResourceKey(
      spellResourceCost?.resourceKey ??
        (pointPoolClassDetail?.class
          ? getPointPoolSpellcasting(pointPoolClassDetail.class.spellcasting)?.resource_key
          : null) ??
        sorceryPointsState?.resourceKey,
    )
    const availablePoints = pointsState.available
    const castingClass = primarySpellcaster?.class ?? classDetails[0]?.class ?? null
    const castingLevel = primarySpellcaster?.row.level ?? classDetails[0]?.row.level ?? character?.level ?? 1

    let arcanumAvailable: boolean | undefined
    const pool = castingClass ? getPointPoolSpellcasting(castingClass.spellcasting) : null
    if (pool && !spellResourceCost) {
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
      spellcasting: castingClass?.spellcasting,
      classRow: castingClass ?? { class_resources: null },
      classLevel: castingLevel,
      availablePoints,
      selectedMetamagic,
      ctx: usesResolveContext,
      availableHitDice: totalHitDiceRemaining(
        buildHitDicePool(classDetails, usedHitDiceByClassId),
      ),
      arcanumAvailable,
      spellResourceCost,
      resourceSpendCap:
        spellResourceCost?.resourceKey === "psi_points" ? psiLimit : null,
    })
  }, [
    selectedSpell,
    primarySpellcaster,
    classDetails,
    character?.level,
    sorceryPointsState,
    availablePointsForResourceKey,
    spellResourceCastCosts,
    pointPoolClassDetail,
    resourceEntries,
    usedResourcesById,
    selectedMetamagic,
    usesResolveContext,
    psiLimit,
    usedHitDiceByClassId,
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
    const morph = activeWeaponMorphOption(activeSheetToggleIds)
    if (morph?.kind === "weapon" && derived) {
      const morphAttack = buildWeaponMorphAttack({
        equipment: morph.equipment,
        abilityMods: derived.abilityMods,
        proficiencyBonus: derived.proficiencyBonus,
      })
      if (morphAttack) {
        cards.push({
          weapon: morph.equipment,
          attack: morphAttack,
          hand: "main" as const,
          defaultIncludeAbilityModifier: true,
          abilityModifier: morphAttack.damageAbilityMod,
          note:
            morph.id === "viscera_cannon"
              ? "Weapon Morph · each attack spends 1 HP (ammo)"
              : "Weapon Morph natural weapon",
          ammoHpCost: morph.id === "viscera_cannon" ? 1 : undefined,
          onSpendAmmoHp:
            morph.id === "viscera_cannon"
              ? () => setCurrentHp((hp) => Math.max(0, hp - 1))
              : undefined,
        })
      }
    }
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
    derived?.proficiencyBonus,
    derived,
    characterFeats,
    originFeat,
    activeSheetToggleIds,
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

  const featureTabSections = useMemo(
    () =>
      buildFeatureTabSections({
        classDetails,
        species: character?.species ?? null,
        backgroundFeature: character?.backgrounds?.feature ?? null,
        originFeat,
        originFeatFallbackName: effectiveBackgroundFeatGranted,
        originFeatFallbackDescription: originFeat?.description ?? "Granted by your background at 1st level.",
        feats: characterFeatsForDisplay,
        featureChoicePicks,
      }),
    [
      classDetails,
      character?.species,
      character?.backgrounds?.feature,
      originFeat,
      effectiveBackgroundFeatGranted,
      characterFeatsForDisplay,
      featureChoicePicks,
    ],
  )

  const orderedFeatureSections = useMemo(() => {
    const sections = applyOrder(featureTabSections, featureLayout.sectionOrder, (section) => section.id)
    return sections.map((section) => {
      const orderedItems = applyOrder(
        section.items,
        featureLayout.itemOrderBySection[section.id],
        (item) => item.id,
      )
      return {
        ...section,
        items: sortPinnedFirst(orderedItems, featureLayout.pinnedFeatureIds, (item) => item.id),
      }
    })
  }, [featureTabSections, featureLayout])

  const pinnedSheetActions = useMemo((): SheetActionEntry[] => {
    const actions: SheetActionEntry[] = []
    const itemById = new Map(
      featureTabSections.flatMap((section) => section.items.map((item) => [item.id, item] as const)),
    )
    for (const [featureId, targets] of Object.entries(featureLayout.actionPins)) {
      const item = itemById.get(featureId)
      const name = item?.name ?? featureId.split(":").slice(-1)[0] ?? featureId
      for (const target of targets) {
        actions.push({
          id: `pin:${target}:${featureId}`,
          name: item?.chosenNames.length ? `${name} — ${item.chosenNames.join(", ")}` : name,
          sourceLabel: "Pinned feature",
          kinds: ["action"],
          category: target,
          limitedUses: null,
          classLevel: character?.level ?? 1,
          description: item?.description ?? null,
        })
      }
    }
    return actions
  }, [featureLayout.actionPins, character?.level, featureTabSections])

  const combatActions = useMemo(
    () => [
      ...sheetActions.filter((action) => action.category !== "utility"),
      ...pinnedSheetActions.filter((action) => action.category === "combat"),
    ],
    [sheetActions, pinnedSheetActions],
  )
  const utilityActions = useMemo(
    () => [
      ...sheetActions.filter((action) => action.category === "utility"),
      ...pinnedSheetActions.filter((action) => action.category === "utility"),
    ],
    [sheetActions, pinnedSheetActions],
  )

  const canRollHitDiceOutsideShortRest = useMemo(() => {
    const featNames = [
      ...characterFeats.map((feat) => feat.name),
      ...(originFeat?.name ? [originFeat.name] : []),
      ...(effectiveBackgroundFeatGranted ? [effectiveBackgroundFeatGranted] : []),
    ]
    const featureNames = sheetClassFeatures.map((feature) => feature.name)
    return characterCanRollHitDiceOutsideShortRest({ featNames, featureNames })
  }, [
    characterFeats,
    originFeat,
    effectiveBackgroundFeatGranted,
    sheetClassFeatures,
  ])

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

  const hasBalanceOfPowerMechanic = useMemo(
    () =>
      characterHasBalanceOfPowerMechanic({
        classDetails,
        classResources: classDetails.flatMap((entry) => entry.class?.class_resources ?? []),
      }),
    [classDetails],
  )

  const perfectedEnhancementBonusValue = useMemo(
    () =>
      resolvePerfectedEnhancementBonus({
        classDetails,
        proficiencyBonus: derived?.proficiencyBonus ?? 2,
      }),
    [classDetails, derived?.proficiencyBonus],
  )

  const empoweredPsionicsBonusValue = useMemo(
    () =>
      empoweredPsionicsDamageBonus({
        classDetails,
        intModifier: derived?.abilityMods.intelligence ?? 0,
      }),
    [classDetails, derived?.abilityMods.intelligence],
  )

  /** Feature + talent names used to detect Unleashed Mind riders (Tantrum, Uncontrollable Mind). */
  const unleashedMindKnownNames = useMemo(() => {
    const names: (string | null | undefined)[] = []
    for (const entry of classDetails) {
      for (const feature of [
        ...(entry.class?.features ?? []),
        ...(entry.subclass?.features ?? []),
      ]) {
        names.push(feature.name)
      }
    }
    for (const ability of sheetCustomAbilities) names.push(ability.name)
    return names
  }, [classDetails, sheetCustomAbilities])

  const hasRampageDie = rampageDieSides != null
  const knowsTantrum = useMemo(
    () => characterKnowsTantrum(unleashedMindKnownNames),
    [unleashedMindKnownNames],
  )
  const knowsUncontrollableMind = useMemo(
    () => characterKnowsUncontrollableMind(unleashedMindKnownNames),
    [unleashedMindKnownNames],
  )
  const knowsUnstoppableRampage = useMemo(
    () => characterHasUnstoppableRampage(unleashedMindKnownNames),
    [unleashedMindKnownNames],
  )

  const rampageDieState = useMemo<RampageDieState>(
    () => ({ sides: normalizeRampageDieSides(rampageDieSides), ...rampageTurn }),
    [rampageDieSides, rampageTurn],
  )

  const applyRampageDieState = useCallback((next: RampageDieState) => {
    setResourceDieSidesByKey((prev) => ({ ...prev, rampage_die: next.sides }))
    setRampageTurn({
      dealtDamageThisTurn: next.dealtDamageThisTurn,
      usedDieThisTurn: next.usedDieThisTurn,
      d12RoundsHeld: next.d12RoundsHeld,
    })
  }, [])

  /** Weapon damage rolls and damaging power Uses count as dealing damage this turn. */
  const markRampageDamageDealtThisTurn = useCallback(() => {
    if (!hasRampageDie) return
    setRampageTurn((prev) =>
      prev.dealtDamageThisTurn ? prev : { ...prev, dealtDamageThisTurn: true },
    )
  }, [hasRampageDie])

  const psiResourceEntry = useMemo(
    () => spendableResourceEntries.find((entry) => entry.id.endsWith("_psi_points")) ?? null,
    [spendableResourceEntries],
  )

  const psiPointsAvailable = useMemo(() => {
    if (!psiResourceEntry) return 0
    const max =
      resolveUsesAtLevel(psiResourceEntry.uses, psiResourceEntry.classLevel, usesResolveContext) ?? 0
    return Math.max(0, max - (usedResourcesById[psiResourceEntry.id] ?? 0))
  }, [psiResourceEntry, usedResourcesById, usesResolveContext])

  const spendPsiPoints = useCallback(
    (amount: number) => {
      if (!psiResourceEntry || amount <= 0 || psiPointsAvailable < amount) return false
      setUsedResourcesById((prev) => ({
        ...prev,
        [psiResourceEntry.id]: (prev[psiResourceEntry.id] ?? 0) + amount,
      }))
      return true
    },
    [psiResourceEntry, psiPointsAvailable],
  )

  const handleInitiativeRollWithTantrum = useCallback(() => {
    handleInitiativeRoll()
    if (hasRampageDie && knowsTantrum) {
      applyRampageDieState(tantrumStepOnInitiative(rampageDieState))
    }
  }, [handleInitiativeRoll, hasRampageDie, knowsTantrum, rampageDieState, applyRampageDieState])

  /** Tantrum steps the Rampage Die up when HP drops while the die is d6 or lower. */
  const handleCurrentHpChange = useCallback(
    (nextHp: number) => {
      if (hasRampageDie && knowsTantrum && nextHp < currentHp) {
        applyRampageDieState(tantrumStepOnDamageTaken(rampageDieState))
      }
      setCurrentHp(nextHp)
    },
    [hasRampageDie, knowsTantrum, currentHp, rampageDieState, applyRampageDieState],
  )

  const unstoppableRampageContext = useMemo(() => {
    if (!hasRampageDie || !knowsUnstoppableRampage) return null
    return {
      conModifier: derived?.abilityMods.constitution ?? 0,
      psiAvailable: psiPointsAvailable,
      onSpendPsi: spendPsiPoints,
      onSurvive: () => setCurrentHp(1),
    }
  }, [
    hasRampageDie,
    knowsUnstoppableRampage,
    derived?.abilityMods.constitution,
    psiPointsAvailable,
    spendPsiPoints,
  ])

  const balanceOfPowerCapValue = useMemo(
    () => psionLevelForBalanceOfPower(classDetails),
    [classDetails],
  )

  const bankIntoBalanceOfPower = useCallback(
    (amount: number) => {
      if (!hasBalanceOfPowerMechanic || amount <= 0) return
      setAccumulatedResources((prev) =>
        bankBalanceOfPower({
          accumulated: prev,
          amount,
          max: balanceOfPowerCapValue,
        }),
      )
    },
    [hasBalanceOfPowerMechanic, balanceOfPowerCapValue],
  )

  const handleTurnStart = useCallback(() => {
    setActionEconomySpent(emptyActionEconomySpent())
    if (hasRampageDie) {
      const advanced = advanceRampageDieTurn({
        state: rampageDieState,
        incapacitated: isIncapacitatedByConditions(activeConditions),
      })
      applyRampageDieState(advanced.state)
      if (advanced.exhaustionGained > 0) {
        setExhaustionLevel((level) => clampExhaustionLevel(level + advanced.exhaustionGained))
      }
    }
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
    hasRampageDie,
    rampageDieState,
    applyRampageDieState,
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

      const summary = [...result.summary]
      // Resting ends the fight — the Rampage Die falls back to its d4 baseline.
      if (resourceDieSidesByKey.rampage_die != null) {
        setResourceDieSidesByKey((prev) => ({ ...prev, rampage_die: 4 }))
        setRampageTurn(defaultRampageTurnState())
      }
      if (rest === "long_rest") {
        const pool = buildHitDicePool(classDetails, usedHitDiceByClassId)
        const nextHitDice = recoverHitDiceOnLongRest(usedHitDiceByClassId, pool)
        let recovered = 0
        for (const entry of pool) {
          const beforeSpent = usedHitDiceByClassId[entry.classId] ?? 0
          const afterSpent = nextHitDice[entry.classId] ?? 0
          recovered += Math.max(0, beforeSpent - afterSpent)
        }
        setUsedHitDiceByClassId(nextHitDice)
        setShortRestHitDiceOpen(false)
        setFleshWarpAllyBenefitCounts({})
        setMutationDie(null)
        if (recovered > 0) {
          summary.push(
            `Regained ${recovered} Hit Die${recovered === 1 ? "" : "ce"} (half your total, minimum 1)`,
          )
        }
        summary.push("Cleared Mutation Die and Flesh Warp ally benefit counts")
      }

      setRestOverlay({ rest, summary })
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
      resourceDieSidesByKey.rampage_die,
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

  const companionResolution = useMemo((): {
    rows: ReturnType<typeof mergeCompanionState>
    formGroups: CompanionFormGroup[]
  } => {
    if (!character || !classDetails.length) return { rows: [], formGroups: [] }
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
    const { companions, formGroups } = resolveCharacterCompanionsDetailed({
      classDetails,
      customAbilities: sheetCustomAbilities,
      ctx,
      knownSpells: spells,
      equipment,
      creatures,
      modifierCatalog,
      formSelections: formSelectionsFromState(companionState),
    })
    return { rows: mergeCompanionState(companions, companionState), formGroups }
  }, [character, classDetails, sheetCustomAbilities, companionState, derived, spells, equipment, creatures, modifierCatalog])

  const companionRows = companionResolution.rows
  const companionFormGroups = companionResolution.formGroups
  const visibleSheetTabs = useMemo(() => {
    const tabs: SheetTab[] = ["abilities", "combat", "equipment", "features"]
    if (companionFormGroups.length > 0 || companionRows.length > 0) tabs.push("companions")
    if (sheetCustomAbilities.length > 0) tabs.push("custom")
    tabs.push("details")
    return tabs
  }, [companionFormGroups.length, companionRows.length, sheetCustomAbilities.length])

  useEffect(() => {
    if (!visibleSheetTabs.includes(activeTab)) setActiveTab("abilities")
  }, [activeTab, visibleSheetTabs])

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
      const knownFormsByKey = new Map(
        companionState
          .filter((row) => row.knownForms?.length)
          .map((row) => [row.key, row.knownForms!] as const),
      )
      const next = companionRows.map((row) => {
        const base: CharacterCompanionState = {
          key: row.key,
          currentHp: row.currentHp,
          tempHp: row.tempHp > 0 ? row.tempHp : null,
          ferocity: row.ferocity > 0 ? row.ferocity : null,
          customName: row.displayName !== row.template.name ? row.displayName : null,
          activeConditions: row.activeConditions.length ? row.activeConditions : null,
          polymorphActive: row.polymorphActive ? true : null,
          knownForms: knownFormsByKey.get(row.key) ?? null,
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
      // Selection rows for form groups (e.g. Wild Shape) have no companion row of
      // their own — keep them so the picks survive HP/condition updates.
      for (const [groupKey, forms] of knownFormsByKey) {
        if (!next.some((row) => row.key === groupKey)) {
          next.push({ key: groupKey, currentHp: null, knownForms: forms })
        }
      }
      void persistCompanionState(next)
    },
    [companionRows, companionState, persistCompanionState],
  )

  const setCompanionGroupForms = useCallback(
    (groupKey: string, formNames: string[]) => {
      const others = companionState.filter((row) => row.key !== groupKey)
      const existing = companionState.find((row) => row.key === groupKey)
      void persistCompanionState([
        ...others,
        {
          key: groupKey,
          currentHp: existing?.currentHp ?? null,
          tempHp: existing?.tempHp ?? null,
          ferocity: existing?.ferocity ?? null,
          customName: existing?.customName ?? null,
          activeConditions: existing?.activeConditions ?? null,
          polymorphActive: existing?.polymorphActive ?? null,
          knownForms: formNames.length ? formNames : null,
        },
      ])
    },
    [companionState, persistCompanionState],
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
    if (
      resourceDieSidesByKey.rampage_die != null &&
      rampageDieGrantsUncontrollableMind(resourceDieSidesByKey.rampage_die)
    ) {
      toggles.add("rampage_die_d8_plus")
    }
    return toggles
  }, [activeSheetToggleIds, bloodiedActive, resourceDieSidesByKey.rampage_die])

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

  const allyCandidates = useMemo(() => {
    const byId = new Map(partyCharacters.map((row) => [row.id, row]))
    if (character && !byId.has(character.id)) byId.set(character.id, character)
    const rows = collectPartyAllyCandidates(partyForAllies?.character_ids ?? [], byId, {
      includeSelfId: character?.id,
      includeCompanions: true,
    })
    const maxByKey = new Map(companionRows.map((row) => [row.key, row.maxHp]))
    const tempByKey = new Map(companionRows.map((row) => [row.key, row.tempHp]))
    return rows.map((row) => {
      if (row.kind !== "companion" || row.characterId !== character?.id) return row
      return {
        ...row,
        maxHp: maxByKey.get(row.companionKey) ?? row.maxHp,
        tempHp: tempByKey.get(row.companionKey) ?? row.tempHp,
      }
    })
  }, [partyForAllies, partyCharacters, character, companionRows])

  const healContext = useMemo(() => {
    const mods = derived?.abilityMods ?? {
      strength: 0,
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0,
    }
    return {
      characterLevel: character?.level ?? 1,
      proficiencyBonus:
        derived?.proficiencyBonus ?? Math.floor(((character?.level ?? 1) - 1) / 4) + 2,
      abilityMods: {
        STR: mods.strength ?? 0,
        DEX: mods.dexterity ?? 0,
        CON: mods.constitution ?? 0,
        INT: mods.intelligence ?? 0,
        WIS: mods.wisdom ?? 0,
        CHA: mods.charisma ?? 0,
      },
    }
  }, [character?.level, derived?.proficiencyBonus, derived?.abilityMods])

  const sheetMaxHpForHeal = derived?.maxHp ?? character?.hit_point_max ?? 0
  const applySelfHeal = useCallback(
    (amount: number, kind: "heal" | "temp_hp") => {
      if (kind === "temp_hp") {
        setTempHp((prev) => Math.max(prev, amount))
        return
      }
      setCurrentHp((hp) => Math.min(sheetMaxHpForHeal, hp + amount))
    },
    [sheetMaxHpForHeal],
  )

  const applySelfInspiration = useCallback(() => {
    setHasInspiration(true)
  }, [])

  const applySelfConditions = useCallback((add: string[], remove: string[]) => {
    setActiveConditions((prev) => {
      const next = new Set(prev)
      for (const name of remove) next.delete(name)
      for (const name of add) {
        const trimmed = name.trim()
        if (trimmed) next.add(trimmed)
      }
      return [...next]
    })
  }, [])

  const addDurationReminderFromAction = useCallback((label: string) => {
    setDurationReminders((prev) => [...prev, createDurationReminder(label)])
  }, [])

  const shareClassLabel = useMemo(() => {
    if (classDetails.length) {
      return classDetails
        .map((entry) => `${entry.class?.name ?? "Class"} Level ${entry.row.level}`)
        .join(" · ")
    }
    if (character?.classes?.name) {
      return `${character.classes.name} Level ${character.level}`
    }
    return "Adventurer"
  }, [classDetails, character?.classes?.name, character?.level])

  const createShareSnapshot = useCallback(async () => {
    if (!character) return
    setShareStatus("Creating link…")
    const db = createClient()
    const token =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
        : `${Date.now().toString(36)}`
    const maxHpSnapshot = derived?.maxHp ?? character.hit_point_max ?? 0
    const payload = {
      ...characterRowToExportItem(character as unknown as Record<string, unknown>),
      snapshot: {
        currentHp,
        tempHp,
        maxHp: maxHpSnapshot,
        classLabel: shareClassLabel,
        sharedAt: new Date().toISOString(),
      },
    }
    const { data, error } = await db
      .from("character_snapshots")
      .insert([
        {
          token,
          character_name: character.name,
          payload,
        },
      ])
      .select("*")
    if (error || !data) {
      setShareStatus(error?.message ?? "Could not create share link.")
      return
    }
    const row = normalizeShareSnapshotRow(
      (Array.isArray(data) ? data[0] : data) as Record<string, unknown>,
    )
    const href = shareSnapshotHref(row.token || token)
    const url =
      typeof window !== "undefined" ? `${window.location.origin}${href}` : href
    try {
      await navigator.clipboard.writeText(url)
      setShareStatus("Share link copied")
    } catch {
      setShareStatus(url)
    }
    setSheetMenuOpen(false)
  }, [character, currentHp, tempHp, derived?.maxHp, shareClassLabel])

  const skillsInOrder = useMemo(() => {
    const sorted = getSkillsSorted(skillSortMode)
    return orderSkillsWithPins(sorted, pinnedSkillNames)
  }, [skillSortMode, pinnedSkillNames])
  const srdSkillNameSet = useMemo(
    () => new Set(getSkillsInAbilityOrder().map((skill) => skill.name)),
    [],
  )
  const customSkillRows = useMemo(() => {
    const rows =
      derived?.skills.filter((skill) => skill.proficient && !srdSkillNameSet.has(skill.name)) ?? []
    return orderSkillsWithPins(rows, pinnedSkillNames)
  }, [derived?.skills, srdSkillNameSet, pinnedSkillNames])

  const togglePinnedSkill = useCallback((skillName: string) => {
    setPinnedSkillNames((prev) =>
      prev.includes(skillName) ? prev.filter((name) => name !== skillName) : [...prev, skillName],
    )
  }, [])

  const handleSkillAbilityChange = useCallback(
    (skillName: string, defaultAbility: AbilityScoreKey, ability: AbilityScoreKey | null) => {
      setSkillAbilityOverrides((prev) => setSkillAbilityOverride(prev, skillName, ability, defaultAbility))
    },
    [],
  )

  const togglePinnedEquipment = useCallback((itemId: string) => {
    setPinnedEquipmentIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    )
  }, [])

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
  const morphAcBonus = (() => {
    const morph = activeWeaponMorphOption(activeSheetToggleIds)
    if (morph?.kind !== "shield") return 0
    return typeof morph.equipment.armor_class === "number" ? morph.equipment.armor_class : 2
  })()
  const armorClass =
    (activePolymorph?.ac ?? derived?.armorClass ?? character.armor_class ?? 10) + morphAcBonus
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
  const hitDiceRemainingTotal = totalHitDiceRemaining(hitDicePool)
  const spendHitDiceForAction = (amount: number, preferClassId?: string | null): boolean => {
    const result = spendHitDiceFromPool({
      usedByClassId: usedHitDiceByClassId,
      pool: hitDicePool,
      amount,
      preferClassId,
    })
    if (!result.applied) return false
    setUsedHitDiceByClassId(result.nextUsedByClassId)
    return true
  }
  const savingThrowProficiencies = derived?.savingThrowProficiencies ?? character.classes?.saving_throws ?? []

  const classLabel = shareClassLabel

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
  const vision = derived?.vision ?? []
  const resistances = derived?.resistances ?? []
  const immunities = derived?.immunities ?? []
  const conditionImmunities = derived?.conditionImmunities ?? []
  const movementEffects = derived?.movementEffects ?? null
  const extraTurns = derived?.extraTurns ?? []
  const movementEffectNotes = movementEffects
    ? [
        movementEffects.movementMoveThroughLargerSpaces
          ? "Can move through the space of creatures at least one size larger"
          : null,
        movementEffects.movementHideBehindLargerCreatures
          ? "Can Hide behind creatures at least one size larger than you"
          : null,
        movementEffects.movementDash ? "Can Dash as part of another action" : null,
        movementEffects.movementDisengage ? "Can Disengage without spending an action" : null,
        movementEffects.movementHide ? "Can Hide as part of another action" : null,
        movementEffects.spiderClimb ? "Can climb difficult surfaces (including ceilings) without a check" : null,
      ].filter((note): note is string => Boolean(note))
    : []
  const hasSenseNotes =
    Boolean(telepathy) ||
    Boolean(restReplacement) ||
    magicalSleepImmunity ||
    noSleepRequired ||
    forcedSaveRemaps.length > 0 ||
    movementEffectNotes.length > 0 ||
    extraTurns.length > 0

  const alwaysPreparedSpellIds = (() => {
    const ids = new Set<string>()
    const catalog = spellCatalog.length ? spellCatalog : spells
    for (const detail of classDetails) {
      const features = (detail.subclass?.features as import("@/lib/types").Feature[] | undefined) ?? []
      for (const grant of collectSubclassAlwaysPreparedSpells(features, detail.row.level, catalog, {
        classId: detail.row.class_id,
        featureChoicePicks,
      })) {
        ids.add(grant.spellId)
      }
    }
    for (const id of resourceCastSpellIds) ids.add(id)
    return ids
  })()

  const displayedSpells = (() => {
    const byId = new Map(spells.map((spell) => [spell.id, spell]))
    const catalog = spellCatalog.length ? spellCatalog : spells
    for (const id of alwaysPreparedSpellIds) {
      if (byId.has(id)) continue
      const row = catalog.find((spell) => spell.id === id)
      if (row) byId.set(id, row)
    }
    return [...byId.values()].sort(
      (a, b) => a.level - b.level || a.name.localeCompare(b.name),
    )
  })()

  const hasResourceCastSpells = resourceCastSpellIds.length > 0
  const showSpellsPanel = hasSpellcasting || hasResourceCastSpells || displayedSpells.length > 0

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
  const balanceOfPowerCount = hasBalanceOfPowerMechanic
    ? currentBalanceOfPower(tickAccumulatedResources(accumulatedResources))
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
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                ref={sheetMenuButtonRef}
                type="button"
                onClick={openSheetMenu}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 transition-colors ${SHEET_BANNER_BUTTON.icon} text-muted-foreground`}
                title="Sheet options"
                aria-expanded={sheetMenuOpen}
              >
                <Share2 className="w-4 h-4" />
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
                        void createShareSnapshot()
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <Share2 className="w-4 h-4 shrink-0" />
                      {shareStatus ?? "Share link"}
                    </button>
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
                      <Printer className="w-4 h-4 shrink-0" />
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
            <button
              type="button"
              onClick={() => setLevelUpOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-border bg-card font-bold text-sm hover:border-primary transition-colors"
              title="Level up"
            >
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Level up</span>
            </button>
            <Link
              href={`/builder?edit=${character.id}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Link>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-3 overflow-hidden rounded-2xl max-sm:min-h-0 min-h-[140px]"
        >
          {character.banner_url ? (
            <div className="absolute inset-0 overflow-hidden rounded-2xl max-sm:hidden">
              <img
                src={character.banner_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          ) : null}
          <div
            className={`relative flex flex-col gap-2 p-4 max-sm:gap-1.5 max-sm:p-2.5 ${
              character.banner_url
                ? "bg-gradient-to-br from-primary/20 to-secondary/20 sm:bg-gradient-to-r sm:from-background/90 sm:via-background/75 sm:to-background/60"
                : "bg-gradient-to-br from-primary/20 to-secondary/20"
            }`}
          >
            <div className="absolute right-2.5 top-2.5 z-10 sm:hidden">
              <ManualRollTrigger />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-2.5 max-sm:pr-12 sm:gap-4">
              {character.portrait_url ? (
                <button
                  type="button"
                  onClick={() => setPortraitZoomOpen((open) => !open)}
                  aria-label={portraitZoomOpen ? "Close portrait" : "Enlarge portrait"}
                  className="shrink-0 overflow-hidden rounded-lg border-2 border-background shadow-md focus:outline-none focus:ring-2 focus:ring-primary sm:rounded-xl sm:shadow-lg"
                >
                  <img
                    src={character.portrait_url}
                    alt={character.name}
                    className="h-11 w-11 object-cover sm:h-24 sm:w-24"
                  />
                </button>
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-background bg-card sm:h-24 sm:w-24 sm:rounded-xl">
                  <User className="h-5 w-5 text-muted-foreground sm:h-12 sm:w-12" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-black leading-tight text-foreground sm:text-2xl">{character.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {classDetails.length > 0
                    ? classDetails.map((entry) => (
                        <span
                          key={`${entry.row.class_id}-${entry.row.order}`}
                          className={SHEET_BANNER_BADGE.class}
                        >
                          {entry.class?.name ?? "Class"} {entry.row.level}
                        </span>
                      ))
                    : (
                        <span className={SHEET_BANNER_BADGE.class}>{classLabel}</span>
                      )}
                  {character.species ? (
                    <span className={SHEET_BANNER_BADGE.species}>
                      {character.species.name}
                    </span>
                  ) : null}
                  {character.backgrounds ? (
                    <span className={SHEET_BANNER_BADGE.background}>
                      {character.backgrounds.name}
                    </span>
                  ) : null}
                </div>
              </div>
              </div>

              <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
                <div className="flex min-w-0 flex-wrap items-stretch justify-end gap-1.5 sm:gap-2">
                  <span className="hidden sm:inline-flex">
                    <ManualRollTrigger />
                  </span>
                  <DurationRemindersPanel reminders={durationReminders} onChange={setDurationReminders} />
                  <div className="relative shrink-0">
                    <button
                      ref={conditionButtonRef}
                      type="button"
                      onClick={openConditionMenu}
                      aria-expanded={conditionDropdownOpen}
                      className={`flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-2 text-sm font-semibold transition-colors sm:px-3 ${
                        conditionDropdownOpen ||
                        activeConditions.length > 0 ||
                        exhaustionLevel > 0
                          ? SHEET_BANNER_BUTTON.conditionsActive
                          : SHEET_BANNER_BUTTON.conditionsDefault
                      }`}
                    >
                      Conditions
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
                          <label className="flex min-h-11 items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={activeConditions.some(isConcentrationCondition)}
                              onChange={() => {
                                if (activeConditions.some(isConcentrationCondition)) {
                                  setActiveConditions((prev) => prev.filter((name) => !isConcentrationCondition(name)))
                                } else {
                                  applyConcentration(MANUAL_CONCENTRATION)
                                }
                              }}
                              className="h-4 w-4 rounded accent-destructive shrink-0"
                            />
                            <span className="flex-1 min-w-0">Concentrating</span>
                            <ConditionInfoTip description={CONCENTRATION_CONDITION_DESCRIPTION} />
                          </label>
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
                  <span className="sm:hidden">
                    <BannerStatusMenu
                      activeCount={
                        (hasInspiration ? 1 : 0) +
                        (ragingSheetToggle && activeSheetToggleIds.includes(ragingSheetToggle.id)
                          ? 1
                          : 0) +
                        (innateSorcerySheetToggle &&
                        isSorcerer &&
                        activeSheetToggleIds.includes(innateSorcerySheetToggle.id)
                          ? 1
                          : 0) +
                        secondaryManualSheetToggles.filter((toggle) =>
                          activeSheetToggleIds.includes(toggle.id),
                        ).length
                      }
                    >
                      {(close) => (
                        <>
                          {turnStartTriggers.length || hasRampageDie ? (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                close()
                                handleTurnStart()
                              }}
                              className={`flex w-full items-center gap-2 rounded-md border-2 px-3 py-2.5 text-left text-sm font-semibold ${SHEET_BANNER_BUTTON.rest}`}
                            >
                              <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                              Turn Start
                            </button>
                          ) : null}
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              close()
                              setBannerRestOpen(true)
                            }}
                            className={`flex w-full items-center gap-2 rounded-md border-2 px-3 py-2.5 text-left text-sm font-semibold ${SHEET_BANNER_BUTTON.rest}`}
                          >
                            <Moon className="h-3.5 w-3.5 shrink-0" />
                            Rest
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => setHasInspiration((value) => !value)}
                            aria-pressed={hasInspiration}
                            className={`relative flex w-full items-center gap-2 overflow-hidden rounded-md border-2 px-3 py-2.5 text-left text-sm font-semibold ${
                              hasInspiration
                                ? SHEET_BANNER_BUTTON.inspirationActive
                                : SHEET_BANNER_BUTTON.inspirationIdle
                            }`}
                          >
                            {hasInspiration ? (
                              <span className="pointer-events-none absolute inset-0 inspiration-sparkles" aria-hidden />
                            ) : null}
                            <Sparkles
                              className={`relative h-3.5 w-3.5 shrink-0 ${
                                hasInspiration ? "animate-inspiration-glow" : ""
                              }`}
                            />
                            <span className="relative flex-1">Inspiration</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  role="button"
                                  tabIndex={0}
                                  className="relative inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background/40 hover:text-foreground"
                                  aria-label="What Heroic Inspiration does"
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  <Info className="h-3.5 w-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" sideOffset={6} className="max-w-[260px] text-left">
                                {HEROIC_INSPIRATION_TIP}
                              </TooltipContent>
                            </Tooltip>
                          </button>
                          {ragingSheetToggle ? renderManualToggleButton(ragingSheetToggle) : null}
                          {innateSorcerySheetToggle && isSorcerer
                            ? renderManualToggleButton(innateSorcerySheetToggle)
                            : null}
                          {secondaryManualSheetToggles.map((toggle) =>
                            renderManualToggleButton(toggle),
                          )}
                        </>
                      )}
                    </BannerStatusMenu>
                  </span>
                </div>

                <div className="hidden min-w-0 flex-wrap items-stretch justify-end gap-1.5 sm:flex sm:gap-2">
                  <SheetRestButtons
                    onRest={handleRest}
                    onTurnStart={
                      turnStartTriggers.length || hasRampageDie ? handleTurnStart : undefined
                    }
                  />
                  <div className="relative inline-flex shrink-0">
                    <button
                      type="button"
                      onClick={() => setHasInspiration((value) => !value)}
                      title={hasInspiration ? "Spend Heroic Inspiration" : "Mark Heroic Inspiration"}
                      aria-pressed={hasInspiration}
                      className={`relative inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-lg border-2 px-2.5 py-2 pr-8 text-xs font-semibold transition-colors sm:px-3 sm:pr-9 sm:text-sm ${
                        hasInspiration
                          ? SHEET_BANNER_BUTTON.inspirationActive
                          : SHEET_BANNER_BUTTON.inspirationIdle
                      }`}
                    >
                      {hasInspiration ? (
                        <span className="pointer-events-none absolute inset-0 inspiration-sparkles" aria-hidden />
                      ) : null}
                      <Sparkles
                        className={`relative h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4 ${
                          hasInspiration ? "animate-inspiration-glow" : ""
                        }`}
                      />
                      <span className="relative">Inspiration</span>
                    </button>
                    <span className="absolute right-0.5 top-1/2 z-10 -translate-y-1/2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-background/40 hover:text-foreground"
                            aria-label="What Heroic Inspiration does"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={6} className="max-w-[260px] text-left">
                          {HEROIC_INSPIRATION_TIP}
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </div>
                  {ragingSheetToggle ? renderManualToggleButton(ragingSheetToggle) : null}
                  {innateSorcerySheetToggle && isSorcerer
                    ? renderManualToggleButton(innateSorcerySheetToggle)
                    : null}
                  {secondaryManualSheetToggles.map((toggle) => renderManualToggleButton(toggle))}
                </div>

                <SheetRestChooser
                  open={bannerRestOpen}
                  onClose={() => setBannerRestOpen(false)}
                  onRest={handleRest}
                />

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
              </div>
            </div>

            {(exhaustionLevel > 0 || bloodiedActive || activeConditions.length > 0) ? (
              <div className="flex w-full flex-wrap items-center justify-end gap-1">
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
                          ? CONCENTRATION_CONDITION_DESCRIPTION
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
              </div>
            ) : null}
          </div>
        </motion.div>

        <SheetTabNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          visibleTabs={visibleSheetTabs}
        />
        <SheetTabSectionNav
          sections={
            activeTab === "abilities"
              ? [
                  { id: "sheet-skills", label: "Skills" },
                  { id: "sheet-scores", label: "Abilities" },
                  { id: "sheet-proficiencies", label: "Prof." },
                  { id: "sheet-utility-actions", label: "Actions" },
                ]
              : activeTab === "combat"
                ? [
                    { id: "sheet-combat-stats", label: "Stats" },
                    { id: "sheet-combat-actions", label: "Actions" },
                    { id: "sheet-spells", label: "Spells" },
                    { id: "sheet-saves", label: "Saves" },
                  ]
                : activeTab === "features"
                  ? orderedFeatureSections.map((section) => ({
                      id: `feature-section-${section.id}`,
                      label: featureTabNavLabel(section.title),
                    }))
                  : []
          }
        />

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className={SHEET_TAB_CONTENT_CLASS}
        >
          <div className={activeTab === "abilities" ? "space-y-3" : "hidden print-sheet-section space-y-3"}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[11fr_5fr_4fr]">
                <div id="sheet-skills" className={`${SHEET_ABILITIES_PANEL.skills} rounded-xl p-3 border border-border min-w-0`}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <SheetSectionHeading gameIcon="diploma" size="xs" as="h3" className="mb-0">
                        Skills
                      </SheetSectionHeading>
                      <button
                        type="button"
                        onClick={() => setSkillsInfoOpen(true)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Skill explanations"
                        title="What each skill is used for"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {(
                        [
                          { mode: "ability" as const, label: "By ability" },
                          { mode: "alpha" as const, label: "A–Z" },
                        ] as const
                      ).map((option) => {
                        const active = skillSortMode === option.mode
                        return (
                          <button
                            key={option.mode}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setSkillSortMode(option.mode)}
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                              active
                                ? "border-primary/50 bg-primary/15 text-primary"
                                : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-1 md:min-h-[300px]">
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
                      const governingAbility = derivedSkill?.ability ?? skill.ability
                      const mod =
                        derivedSkill?.bonus ??
                        abilityMods[governingAbility] +
                          (isProficient ? proficiencyBonus * (hasExpertise ? 2 : 1) : 0)
                      const pinned = pinnedSkillNames.includes(skill.name)
                      return (
                        <div
                          key={skill.name}
                          className={`flex justify-between items-center gap-2 px-2 py-0.5 max-md:min-h-[4.125rem] max-md:py-2.5 rounded text-xs ${
                            isProficient ? SHEET_STATUS_ROW.skillProficient : SHEET_STATUS_ROW.muted
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => togglePinnedSkill(skill.name)}
                              title={pinned ? "Unpin skill" : "Pin skill to top"}
                              aria-label={pinned ? `Unpin ${skill.name}` : `Pin ${skill.name}`}
                              aria-pressed={pinned}
                              className={`hidden max-sm:inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors ${
                                pinned
                                  ? "text-primary bg-primary/10 hover:bg-primary/15"
                                  : "text-muted-foreground/70 hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              {pinned ? (
                                <Pin className="h-4 w-4 fill-current" aria-hidden />
                              ) : (
                                <Pin className="h-4 w-4" aria-hidden />
                              )}
                            </button>
                            <span className="flex min-w-0 items-baseline gap-1 max-md:text-sm">
                              <span className="truncate">{skill.name}</span>
                              <SkillAbilityLabel
                                skillName={skill.name}
                                defaultAbility={skill.ability}
                                currentAbility={governingAbility}
                                enabled={manualSkillAbilityEnabled}
                                onSelect={(ability) =>
                                  handleSkillAbilityChange(skill.name, skill.ability, ability)
                                }
                              />
                            </span>
                          </div>
                          <span className="flex items-center gap-1 shrink-0">
                            {hasExpertise && <SkillExpertiseIndicator />}
                            <span className="font-bold tabular-nums w-7 text-right max-md:text-sm">
                              {formatMod(mod)}
                            </span>
                            <D20RollButton
                              modifier={mod}
                              title={`Roll ${skill.name}`}
                              size="md"
                              className="md:h-7 md:min-w-7"
                              skillProficient={isProficient}
                              featureBonusesIncluded={Boolean(derivedSkill)}
                              rollContext={{
                                kind: "skill",
                                skillName: skill.name,
                                ability: governingAbility as AbilityScoreKey,
                              }}
                            />
                          </span>
                        </div>
                      )
                    })}
                    {customSkillRows.map((skill) => {
                      const pinned = pinnedSkillNames.includes(skill.name)
                      const defaultAbility = skill.defaultAbility ?? skill.ability
                      return (
                      <div
                        key={skill.name}
                        className={`flex justify-between items-center gap-2 px-2 py-0.5 max-md:min-h-[4.125rem] max-md:py-2.5 rounded text-xs ${SHEET_STATUS_ROW.skillCustom}`}
                      >
                        <div className="flex min-w-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => togglePinnedSkill(skill.name)}
                            title={pinned ? "Unpin skill" : "Pin skill to top"}
                            aria-label={pinned ? `Unpin ${skill.name}` : `Pin ${skill.name}`}
                            aria-pressed={pinned}
                            className={`hidden max-sm:inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors ${
                              pinned
                                ? "text-primary bg-primary/10 hover:bg-primary/15"
                                : "text-muted-foreground/70 hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            {pinned ? (
                              <Pin className="h-4 w-4 fill-current" aria-hidden />
                            ) : (
                              <Pin className="h-4 w-4" aria-hidden />
                            )}
                          </button>
                          <span className="flex min-w-0 items-baseline gap-1 max-md:text-sm">
                            <span className="truncate">{skill.name}</span>
                            <SkillAbilityLabel
                              skillName={skill.name}
                              defaultAbility={defaultAbility}
                              currentAbility={skill.ability}
                              enabled={manualSkillAbilityEnabled}
                              onSelect={(ability) =>
                                handleSkillAbilityChange(skill.name, defaultAbility, ability)
                              }
                            />
                          </span>
                        </div>
                        <span className="flex items-center gap-1 shrink-0">
                          {skill.expertise && <SkillExpertiseIndicator />}
                          <span className="font-bold tabular-nums w-7 text-right max-md:text-sm">
                            {formatMod(skill.bonus)}
                          </span>
                          <D20RollButton
                            modifier={skill.bonus}
                            title={`Roll ${skill.name}`}
                            size="md"
                            className="md:h-7 md:min-w-7"
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
                      )
                    })}
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
                      <span className="flex items-center gap-1 shrink-0">
                        <span className="font-bold tabular-nums">{passiveInsight}</span>
                        <StatExplainPopover
                          title="Passive Insight"
                          total={passiveInsight}
                          contributions={
                            statBreakdowns
                              ? breakdownLines(statBreakdowns, "passiveInsight")
                              : undefined
                          }
                        />
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2 px-2 py-1.5 rounded text-xs bg-secondary/10 font-medium min-w-0">
                      <span className="truncate">Passive Investigation</span>
                      <span className="flex items-center gap-1 shrink-0">
                        <span className="font-bold tabular-nums">{passiveInvestigation}</span>
                        <StatExplainPopover
                          title="Passive Investigation"
                          total={passiveInvestigation}
                          contributions={
                            statBreakdowns
                              ? breakdownLines(statBreakdowns, "passiveInvestigation")
                              : undefined
                          }
                        />
                      </span>
                    </div>
                  </div>
                </div>

                <div id="sheet-scores" className={`${SHEET_ABILITIES_PANEL.abilityScores} rounded-xl p-3 border border-border min-w-0`}>
                  <SheetSectionHeading gameIcon="mighty-force" size="xs" as="h3">
                    Ability Scores
                  </SheetSectionHeading>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ABILITY_SCORE_KEYS.map((key) => {
                      const score = effectiveScores[key]
                      const mod = abilityMods[key]
                      return (
                        <div key={key} className={abilityScoreTileClass(theme)}>
                          <p className="text-[13.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground sm:hidden">
                            {ABILITY_FULL_LABELS[key]}
                          </p>
                          <p className="hidden text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground sm:block">
                            {ABILITY_LABELS[key]}
                          </p>
                          <div className={abilityScoreModifierFrameClass(theme)}>
                            <span className="text-xl font-black tabular-nums leading-none text-foreground">
                              {getAbilityModifier(score)}
                            </span>
                          </div>
                          <div className="relative mt-2 flex w-full items-center justify-center px-1">
                            <span
                              className="pointer-events-none absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-border/80"
                              aria-hidden
                            />
                            <span
                              className="pointer-events-none absolute left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-border/80 bg-card"
                              aria-hidden
                            />
                            <span
                              className="pointer-events-none absolute right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-border/80 bg-card"
                              aria-hidden
                            />
                            <span className={abilityScorePillClass(theme, key)}>{score}</span>
                          </div>
                          <div className="mt-1.5 flex justify-center">
                            <D20RollButton
                              modifier={mod}
                              title={`${ABILITY_LABELS[key]} ability check`}
                              layout="stack"
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
                    {(character.size ?? character.species?.size) ? (
                      <div className="flex justify-between items-center gap-2 px-2 py-1.5 rounded text-xs bg-secondary/10 font-medium">
                        <span className="shrink-0">Size</span>
                        <span className="font-bold">{character.size ?? character.species?.size}</span>
                      </div>
                    ) : null}
                    {hitDicePool.length > 0 ? (
                      <HitDiceTracker
                        pool={hitDicePool}
                        conMod={abilityMods.constitution}
                        currentHp={currentHp}
                        maxHp={maxHp}
                        allowRollHeal={canRollHitDiceOutsideShortRest}
                        onHeal={(amount) =>
                          setCurrentHp((hp) => Math.min(maxHp, hp + amount))
                        }
                        onSetSpent={(classId, spent) =>
                          setUsedHitDiceByClassId((prev) => {
                            const next = { ...prev }
                            if (spent <= 0) delete next[classId]
                            else next[classId] = spent
                            return next
                          })
                        }
                      />
                    ) : null}
                  </div>
                </div>

                <div id="sheet-proficiencies" className={`${SHEET_ABILITIES_PANEL.proficiencies} rounded-xl p-3 border border-border min-w-0`}>
                  <SheetSectionHeading gameIcon="classical-knowledge" size="xs" as="h3">
                    Proficiencies
                  </SheetSectionHeading>
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
                      {vision.length > 0 && (
                        <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Senses</p>
                          <div className="flex flex-wrap gap-1.5">
                            {vision.map((entry) => (
                              <span
                                key={`vision-${entry.type}`}
                                className="px-2 py-0.5 bg-muted text-foreground rounded-full text-xs"
                              >
                                {entry.type} {entry.rangeFeet} ft.
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {(resistances.length > 0 || immunities.length > 0 || conditionImmunities.length > 0) && (
                        <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5 space-y-2">
                          {resistances.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">
                                Resistances
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {resistances.map((item) => (
                                  <span
                                    key={`resist-${item}`}
                                    className="px-2 py-0.5 bg-muted text-foreground rounded-full text-xs"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {immunities.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">
                                Immunities
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {immunities.map((item) => (
                                  <span
                                    key={`immune-${item}`}
                                    className="px-2 py-0.5 bg-muted text-foreground rounded-full text-xs"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {conditionImmunities.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">
                                Condition Immunities
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {conditionImmunities.map((item) => (
                                  <span
                                    key={`cond-immune-${item}`}
                                    className="px-2 py-0.5 bg-muted text-foreground rounded-full text-xs"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
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
                          {movementEffectNotes.map((note) => (
                            <p key={`movement-note-${note}`} className="text-xs text-foreground">
                              {note}
                            </p>
                          ))}
                          {extraTurns.map((entry, index) => (
                            <p key={`extra-turn-${index}`} className="text-xs text-foreground">
                              {entry.label?.trim() ||
                                `Extra turn${entry.firstRoundOnly ? " (first round of combat)" : ""}`}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <div className={`${SHEET_ABILITIES_PANEL.actions} rounded-xl p-3 border border-border`}>
                <div id="sheet-utility-actions" className="flex items-center justify-between gap-2 mb-2">
                  <SheetSectionHeading icon={Swords} className="mb-0">
                    Actions
                  </SheetSectionHeading>
                  <DefaultActionsButton onClick={() => setDefaultActionsContext("abilities")} />
                </div>
                {utilityActions.length ? (
                  <SheetActionsPanel
                    actions={utilityActions}
                    usedByActionId={usedActionUsesById}
                    onUsedChange={setUsedActionUsesById}
                    playerNoteValues={featureChoicePicks}
                    onPlayerNoteChange={(key, value) =>
                      void persistFeatureChoicePicks(key, value.trim() ? [value] : [])
                    }
                    onEquipmentChoiceChange={(key, value) =>
                      void persistLinkedEquipmentChoice(key, value)
                    }
                    resolveContext={usesResolveContext}
                    resourceEntries={resourceEntries}
                    usedResourcesById={usedResourcesById}
                    onResourceUsedChange={setUsedResourcesById}
                    incapacitated={incapacitated}
                    psiLimit={psiLimit}
                    hitDiceRemaining={hitDiceRemainingTotal}
                    onSpendHitDice={spendHitDiceForAction}
                    onActivateSheetToggle={activateSheetToggle}
                    onSpawnIllusionToken={spawnIllusionToken}
                    onGrantMutationDie={grantMutationDieFromAction}
                    onMarkEconomy={markActionEconomy}
                    characterId={character.id}
                    onApplySelfHeal={applySelfHeal}
                    onApplySelfInspiration={applySelfInspiration}
                    onApplySelfConditions={applySelfConditions}
                    onAddDurationReminder={addDurationReminderFromAction}
                    onApplyCompanionState={patchCompanionState}
                    perfectedEnhancementBonus={perfectedEnhancementBonusValue}
                    empoweredPsionicsBonus={empoweredPsionicsBonusValue}
                    onMarkDamageDealt={markRampageDamageDealtThisTurn}
                    onBankBalanceOfPower={
                      hasBalanceOfPowerMechanic ? bankIntoBalanceOfPower : undefined
                    }
                    allyCandidates={allyCandidates}
                    healContext={healContext}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No non-combat actions from your features or traits. Use Standard Action Rules for
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

          <div className={activeTab === "details" ? "" : "hidden print-sheet-section"}>
            <div className={`${SHEET_DETAILS_PANEL} rounded-xl p-4 border border-border`}>
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Scroll className="h-4 w-4 text-primary" aria-hidden />
                Character Details
              </h2>
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
          </div>

          <div className={activeTab === "combat" ? "space-y-3" : "hidden print-sheet-section space-y-3"}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[7fr_3fr] md:items-start">
                <div className="space-y-3 min-w-0">
                <div id="sheet-combat-stats" className={`${SHEET_COMBAT_PANEL.combatStats} rounded-xl p-3 border border-border min-w-0 overflow-hidden`}>
                  <SheetSectionHeading icon={Shield}>Combat Stats</SheetSectionHeading>
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
                    onCurrentHpChange={handleCurrentHpChange}
                    onTempHpChange={setTempHp}
                    hitDicePool={hitDicePool}
                    conMod={abilityMods.constitution}
                    showShortRestHitDice={shortRestHitDiceOpen}
                    allowRollHealHitDice={canRollHitDiceOutsideShortRest}
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
                    onSetHitDiceSpent={(classId, spent) =>
                      setUsedHitDiceByClassId((prev) => {
                        const next = { ...prev }
                        if (spent <= 0) delete next[classId]
                        else next[classId] = spent
                        return next
                      })
                    }
                    onInitiativeRoll={handleInitiativeRollWithTantrum}
                    formatMod={formatMod}
                  />
                </div>

                  <div className={`${SHEET_COMBAT_PANEL.actions} rounded-xl p-3 border border-border flex flex-col min-h-0`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <SheetSectionHeading icon={Swords} className="mb-0">
                        Actions
                      </SheetSectionHeading>
                      <DefaultActionsButton onClick={() => setDefaultActionsContext("combat")} />
                    </div>
                    <SheetActionEconomyTracker
                      spent={actionEconomySpent}
                      onToggle={toggleActionEconomy}
                      onReset={resetActionEconomy}
                      disabled={incapacitated}
                    />
                    <SheetStandardActionButtons
                      disabled={incapacitated}
                      onUse={(kind) => markActionEconomy(kind)}
                    />
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 min-w-0">
                      <SheetEquippedWeaponsPanel
                        weapons={equippedWeaponCards}
                        buildInputs={characterBuildInputs}
                        weaponProficiencies={derived?.weaponProficiencies ?? []}
                        extraMasteryByWeaponId={extraMasteryByWeaponId}
                        onExtraMasteryChange={persistExtraWeaponMasteries}
                        onAttackRoll={() => markActionEconomy("action")}
                        onDamageRoll={markRampageDamageDealtThisTurn}
                      />
                      <div id="sheet-combat-actions">
                      <SheetActionsPanel
                        actions={combatActions}
                        usedByActionId={usedActionUsesById}
                        onUsedChange={setUsedActionUsesById}
                        playerNoteValues={featureChoicePicks}
                        onPlayerNoteChange={(key, value) =>
                          void persistFeatureChoicePicks(key, value.trim() ? [value] : [])
                        }
                        onEquipmentChoiceChange={(key, value) =>
                          void persistLinkedEquipmentChoice(key, value)
                        }
                        resolveContext={usesResolveContext}
                        resourceEntries={resourceEntries}
                        usedResourcesById={usedResourcesById}
                        onResourceUsedChange={setUsedResourcesById}
                        incapacitated={incapacitated}
                        psiLimit={psiLimit}
                        hitDiceRemaining={hitDiceRemainingTotal}
                        onSpendHitDice={spendHitDiceForAction}
                        onActivateSheetToggle={activateSheetToggle}
                        onSpawnIllusionToken={spawnIllusionToken}
                        onGrantMutationDie={grantMutationDieFromAction}
                        onMarkEconomy={markActionEconomy}
                        characterId={character.id}
                        onApplySelfHeal={applySelfHeal}
                        onApplySelfInspiration={applySelfInspiration}
                        onApplySelfConditions={applySelfConditions}
                        onAddDurationReminder={addDurationReminderFromAction}
                        onApplyCompanionState={patchCompanionState}
                        perfectedEnhancementBonus={perfectedEnhancementBonusValue}
                        empoweredPsionicsBonus={empoweredPsionicsBonusValue}
                        onMarkDamageDealt={markRampageDamageDealtThisTurn}
                        onBankBalanceOfPower={
                          hasBalanceOfPowerMechanic ? bankIntoBalanceOfPower : undefined
                        }
                        allyCandidates={allyCandidates}
                        healContext={healContext}
                        singleColumn={false}
                      />
                    </div>
                    {!equippedWeaponCards.length && !combatActions.length ? (
                      <p className="text-xs text-muted-foreground italic">
                        No action-economy abilities listed.
                      </p>
                    ) : null}
                  </div>

                {showSpellsPanel && (
                  <div id="sheet-spells" className={`${SHEET_COMBAT_PANEL.spells} rounded-xl p-3 border border-border min-w-0`}>
                    <SheetSectionHeading icon={Wand2}>Spells</SheetSectionHeading>
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
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-1.5">
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
                                        title={
                                          spellResourceCastCosts.has(spell.id)
                                            ? "Granted by a discipline / feature (cast with class resource)"
                                            : "Always prepared by your subclass"
                                        }
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
              </div>

                <div className="space-y-3 min-w-0">
                <div id="sheet-saves" className={`${SHEET_COMBAT_PANEL.savingThrows} rounded-xl p-3 border border-border`}>
                  <SheetSectionHeading icon={ShieldCheck}>Saving Throws</SheetSectionHeading>
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-1.5 min-w-0">
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
                              className={`flex justify-between items-center gap-2 px-2.5 py-2 rounded text-xs min-h-[2.75rem] ${
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
                    <DeathSaveTracker
                      variant="inline"
                      deathSaves={deathSaves}
                      onDeathSavesChange={setDeathSaves}
                    />
                  </div>
                </div>

                  <div className={`${SHEET_COMBAT_PANEL.spellcastingResources} rounded-xl p-3 border border-border`}>
                    <SheetSectionHeading icon={Battery}>
                      {hasSpellcasting ? "Spellcasting & Resources" : "Resources"}
                    </SheetSectionHeading>
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
                            spellSlotTables={spellSlotTables}
                            usedSpellSlotsByKey={usedSpellSlotsByKey}
                            onUsedSpellSlotsChange={setUsedSpellSlotsByKey}
                          />
                        )}
                        {staticResourceEntries.length > 0 && (
                          <ClassResourceStaticDisplay
                            entries={staticResourceEntries}
                            resolveContext={usesResolveContext}
                          />
                        )}
                        {hasRampageDie && (
                          <RampageDieTracker
                            state={rampageDieState}
                            onStateChange={applyRampageDieState}
                            knowsTantrum={knowsTantrum}
                            knowsUncontrollableMind={knowsUncontrollableMind}
                            unstoppable={unstoppableRampageContext}
                          />
                        )}
                        {(mutationDie != null ||
                          Object.keys(fleshWarpAllyBenefitCounts).length > 0 ||
                          sheetActions.some((action) => /^flesh warp$/i.test(action.name))) && (
                          <MutationDieTracker
                            grant={mutationDie}
                            allyBenefitCounts={fleshWarpAllyBenefitCounts}
                            onGrantChange={setMutationDie}
                            onAllyBenefitCountsChange={setFleshWarpAllyBenefitCounts}
                            constitutionMod={abilityMods.constitution}
                          />
                        )}
                        {(illusionTokens.length > 0 ||
                          sheetActions.some((action) =>
                            /^(?:projected self|imaginary ally)$/i.test(action.name),
                          )) && (
                          <IllusionTokensPanel
                            tokens={illusionTokens}
                            onChange={setIllusionTokens}
                            spellAttackModifier={spellAttackMod}
                            intelligenceMod={abilityMods.intelligence}
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
                        {hasBalanceOfPowerMechanic && (
                          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                                Balance of Power
                              </p>
                              <span className="text-[10px] tabular-nums text-muted-foreground">
                                {balanceOfPowerCount} / {balanceOfPowerCapValue}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mb-2">
                              Banks automatically when a psionic power restores HP or grants temp HP.
                              Decay after 1 minute. Expend on a damage roll to add that much damage to
                              one target.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={balanceOfPowerCount <= 0}
                                onClick={() => {
                                  const result = spendBalanceOfPower({
                                    accumulated: accumulatedResources,
                                  })
                                  setAccumulatedResources(result.accumulated)
                                }}
                                className="text-xs font-semibold rounded-md border border-amber-500/40 px-2 py-1 disabled:opacity-40"
                              >
                                Expend pool on damage
                              </button>
                              <button
                                type="button"
                                disabled={balanceOfPowerCount >= balanceOfPowerCapValue}
                                onClick={() => bankIntoBalanceOfPower(1)}
                                className="text-xs font-semibold rounded-md border border-amber-500/40 px-2 py-1 disabled:opacity-40"
                              >
                                Bank +1 (manual)
                              </button>
                            </div>
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
                          !staticResourceEntries.length &&
                          rampageDieSides == null && (
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

          <div className={activeTab === "equipment" ? "space-y-3" : "hidden print-sheet-section space-y-3"}>
              <div className={`${SHEET_EQUIPMENT_PANEL} rounded-xl p-3 border border-border`}>
                <SheetSectionHeading icon={Package}>Gear</SheetSectionHeading>
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
                  pinnedEquipmentIds={pinnedEquipmentIds}
                  onTogglePinnedEquipment={togglePinnedEquipment}
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

          <div
            id="sheet-features"
            className={
              activeTab === "features"
                ? `${SHEET_TAB_CONTENT_CLASS} columns-1 sm:columns-2 gap-3 [&>section]:mb-3 [&>section]:break-inside-avoid`
                : `hidden print-sheet-section ${SHEET_TAB_CONTENT_CLASS} columns-1 sm:columns-2 gap-3 [&>section]:mb-3 [&>section]:break-inside-avoid`
            }
          >
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
              {orderedFeatureSections.map((section) => (
                <section
                  key={section.id}
                  id={`feature-section-${section.id}`}
                  className={`${SHEET_FEATURES_PANEL} rounded-xl p-3 border border-border`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    const drag = featureDragRef.current
                    if (!drag || drag.kind !== "section" || drag.id === section.id) return
                    setFeatureLayout((prev) => ({
                      ...prev,
                      sectionOrder: moveOrderedId(
                        featureTabSections.map((entry) => entry.id),
                        prev.sectionOrder,
                        drag.id,
                        section.id,
                      ),
                    }))
                    setFeatureDrag(null)
                  }}
                >
                  <div
                    className="mb-2 flex cursor-grab items-center gap-1 active:cursor-grabbing"
                    draggable
                    onDragStart={() => setFeatureDrag({ kind: "section", id: section.id })}
                  >
                    <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <SheetSectionHeading
                      className="mb-0 flex-1"
                      icon={
                        section.id === "species"
                          ? User
                          : section.id === "background"
                            ? BookOpen
                            : section.id === "feats"
                              ? Star
                              : Layers
                      }
                    >
                      {section.title}
                    </SheetSectionHeading>
                  </div>
                  <div className="space-y-2">
                    {section.items.map((item) => (
                      <CollapsibleFeatureCard
                        key={item.id}
                        name={item.name}
                        level={item.level}
                        levels={item.levels}
                        description={item.description}
                        collapsedLines={item.collapsedLines}
                        chosenLabel={item.chosenNames.join(", ") || undefined}
                        draggable
                        onDragStart={() =>
                          setFeatureDrag({ kind: "item", id: item.id, sectionId: section.id })
                        }
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          const drag = featureDragRef.current
                          if (!drag || drag.kind !== "item" || drag.sectionId !== section.id) return
                          if (drag.id === item.id) return
                          setFeatureLayout((prev) => ({
                            ...prev,
                            itemOrderBySection: {
                              ...prev.itemOrderBySection,
                              [section.id]: moveOrderedId(
                                section.items.map((entry) => entry.id),
                                prev.itemOrderBySection[section.id],
                                drag.id,
                                item.id,
                              ),
                            },
                          }))
                          setFeatureDrag(null)
                        }}
                        menu={
                          <FeatureCardMenu
                            pinned={featureLayout.pinnedFeatureIds.includes(item.id)}
                            actionPins={featureLayout.actionPins[item.id] ?? []}
                            onTogglePin={() =>
                              setFeatureLayout((prev) => togglePinnedFeature(prev, item.id))
                            }
                            onToggleAction={(target) =>
                              setFeatureLayout((prev) => toggleActionPin(prev, item.id, target))
                            }
                          />
                        }
                      >
                        {item.feature && item.classId ? (
                          <RestSwappableChoiceControl
                            feature={item.feature}
                            classId={item.classId}
                            picks={
                              featureChoicePicks[
                                featureChoiceKey(item.classId, item.feature.name, item.feature.level)
                              ] ?? []
                            }
                            onChange={(key, next) => void persistFeatureChoicePicks(key, next)}
                          />
                        ) : null}
                      </CollapsibleFeatureCard>
                    ))}
                  </div>
                </section>
              ))}
          </div>

          <div className={activeTab === "companions" ? "space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1" : "hidden print-sheet-section space-y-3"}>
              {companionFormGroups.map((group) => (
                <CompanionFormPicker
                  key={group.key}
                  group={group}
                  onChange={(formNames) => setCompanionGroupForms(group.key, formNames)}
                />
              ))}
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
                        {hasFerocityMechanic && !companion.polymorph ? (
                          <div className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-foreground">Ferocity</p>
                              <span className="text-sm font-black tabular-nums">
                                {companion.ferocity}
                              </span>
                            </div>
                            {companion.ferocity >= 10 ? (
                              <p className="text-[10px] font-semibold text-destructive">
                                Rampage check: DC {5 + companion.ferocity}
                              </p>
                            ) : null}
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                disabled={companion.ferocity <= 0}
                                onClick={() =>
                                  patchCompanionState(companion.key, {
                                    ferocity: Math.max(0, companion.ferocity - 1),
                                  })
                                }
                                className="rounded border border-border px-2 py-1 text-[10px] font-semibold disabled:opacity-40"
                              >
                                Spend 1
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  patchCompanionState(companion.key, {
                                    ferocity: companion.ferocity + 1,
                                  })
                                }
                                className="rounded border border-border px-2 py-1 text-[10px] font-semibold"
                              >
                                +1 nearby hostile
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  patchCompanionState(companion.key, {
                                    ferocity:
                                      companion.ferocity + Math.floor(Math.random() * 4) + 1,
                                  })
                                }
                                className="rounded border border-border px-2 py-1 text-[10px] font-semibold"
                              >
                                Roll +1d4
                              </button>
                              <button
                                type="button"
                                disabled={companion.ferocity <= 0}
                                onClick={() =>
                                  patchCompanionState(companion.key, { ferocity: 0 })
                                }
                                className="rounded border border-border px-2 py-1 text-[10px] font-semibold disabled:opacity-40"
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        ) : null}
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

          <div className={activeTab === "custom" ? "" : "hidden print-sheet-section"}>
            <div className="bg-card rounded-xl p-3 border border-border">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <SheetSectionHeading icon={Sparkles} className="mb-0">
                  Custom Abilities
                </SheetSectionHeading>
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
          </div>
        </motion.div>
      </main>

      <AnimatePresence>
        {skillsInfoOpen ? (
          <motion.div
            key="skills-info"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
            onClick={() => setSkillsInfoOpen(false)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-border bg-card p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSkillsInfoOpen(false)}
                className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 className="pr-8 text-lg font-black text-foreground">Skills</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Common uses for each skill (SRD). Your DM may call for other checks.
              </p>
              <ul className="mt-4 space-y-3">
                {getSkillsInAbilityOrder().map((skill) => (
                  <li key={skill.name} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                    <p className="text-sm font-bold text-foreground">
                      {skill.name}{" "}
                      <span className="font-semibold text-muted-foreground">
                        ({ABILITY_ABBREVIATIONS[skill.ability]})
                      </span>
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground leading-snug">
                      {getSkillDescription(skill.name) ?? SKILL_DESCRIPTIONS[skill.name] ?? "—"}
                    </p>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        ) : null}
        {restOverlay ? (
          <SheetRestOverlay
            key="sheet-rest"
            rest={restOverlay.rest}
            summary={restOverlay.summary}
            onClose={() => setRestOverlay(null)}
            hitDicePool={hitDicePool}
            conMod={abilityMods.constitution}
            currentHp={currentHp}
            maxHp={maxHp}
            onHeal={(amount) => setCurrentHp((hp) => Math.min(maxHp, hp + amount))}
            onSpendDice={(classId, count) =>
              setUsedHitDiceByClassId((prev) => ({
                ...prev,
                [classId]: (prev[classId] ?? 0) + count,
              }))
            }
            weaponMasteryChoices={
              restOverlay.rest === "long_rest" ? longRestWeaponMasteryChoices : []
            }
            onWeaponMasteryChange={(key, next) => void persistFeatureChoicePicks(key, next)}
            extraWeaponMasteryChoices={
              restOverlay.rest === "long_rest" ? extraWeaponMasteryRestChoices : []
            }
            onExtraWeaponMasteryChange={persistExtraWeaponMasteries}
          />
        ) : null}
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
            playerNoteValues={featureChoicePicks}
            onPlayerNoteChange={(key, value) =>
              void persistFeatureChoicePicks(key, value.trim() ? [value] : [])
            }
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
            empoweredRerollCap={Math.max(1, abilityMods.charisma ?? 0)}
            onCast={(result) => {
              markActionEconomy(
                actionEconomyKindFromCastingTime(selectedSpell.casting_time, {
                  quickened: selectedMetamagicIds.some((id) => {
                    const option = metamagicOptions.find((row) => row.id === id)
                    return option?.effectHint === "quicken"
                  }),
                }),
              )
              if (result.concentrationApplied) {
                applyConcentration(result.concentrationApplied)
              }
              if ((result.hitDiceSpent ?? 0) > 0) {
                spendHitDiceForAction(result.hitDiceSpent!)
              }
              if (result.psiPointsSpent) {
                const spendKey =
                  spellCastCost?.resourceKey ??
                  sorceryPointsState?.resourceKey ??
                  null
                const spResourceId =
                  availablePointsForResourceKey(spendKey).resourceId ??
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
              spellCastCost?.mode === "resource" ||
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
      {levelUpOpen && character ? (
        <LevelUpWizard
          characterId={character.id}
          open
          onClose={() => setLevelUpOpen(false)}
          onComplete={() => setSheetReloadKey((value) => value + 1)}
        />
      ) : null}
      <SiteFooter />
    </div>
      </SheetRollProvider>
    </SheetRollHistoryProvider>
  )
}
