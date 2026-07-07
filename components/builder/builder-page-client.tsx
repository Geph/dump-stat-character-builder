"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { GameIcon } from "@/components/game-icon-picker"
import { createClient } from "@/lib/db/client"
import { loadBuilderCompendium } from "@/lib/data/builder-compendium-cache"
import { asCompendiumRow, asCompendiumRows } from "@/lib/data/types"
import { characterSheetHref } from "@/lib/compendium/edit-href"
import { pageFloatingHintClass, pageStepStripClass } from "@/lib/compendium/editor-field-styles"
import {
  filterEnabled,
  filterEnabledIds,
  pickEnabledId,
} from "@/lib/compendium/compendium-enabled"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Upload,
  X,
  Wand2,
  Search,
  Info,
  Heart,
  Sparkles,
  Plus,
  Minus,
  Eye,
  LayoutGrid,
  Coins,
  Backpack,
  UserCircle,
  Shield,
  Dices,
} from "lucide-react"
import {
  aggregateCharacteristics,
  normalizeCharacteristics,
  ABILITY_SCORE_KEYS,
} from "@/lib/compendium/characteristic-modifiers"
import {
  buildCharacterSaveSnapshot,
  computeDerivedCharacter,
} from "@/lib/character/compute-derived"
import {
  findBackgroundGrantedFeat,
  formatBackgroundAbilityBonuses,
} from "@/lib/compendium/background-display"
import {
  getEffectiveBackgroundFeatGranted,
  isLegacyBackground,
  legacyBackgroundOriginFeatPickKey,
  magicInitiateListFromFeatGranted,
} from "@/lib/compendium/background-origin-feat"
import { OriginFeatGrantedSelect } from "@/components/compendium/origin-feat-granted-select"
import { normalizeFeatCategory } from "@/lib/builder/feat-selection"
import {
  applyBackgroundProficienciesToDraft,
  getEffectiveArmorProficiencies,
  getEffectiveWeaponProficiencies,
  mergeProficiencyLists,
  normalizeBackgroundProficiencies,
  type BackgroundProficiencies,
} from "@/lib/compendium/background-proficiencies"
import {
  isArmorItem,
  isShieldItem,
  isWeaponItem,
} from "@/lib/compendium/combat-stats"
import { resolveSpellcastingAbilityKey } from "@/lib/compendium/spell-slots"
import { BuilderStepNav } from "@/components/builder/builder-step-nav"
import { PickerGridPagination } from "@/components/builder/picker-grid-pagination"
import { EquipmentShoppingPanel } from "@/components/builder/equipment-shopping-panel"
import { BackgroundDetailStrip } from "@/components/compendium/background-detail-strip"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import { ClampedRichText } from "@/components/character-sheet/expandable-description"
import { CompendiumSelectionCard } from "@/components/compendium/compendium-selection-card"
import { CompendiumDenseSelectionCard } from "@/components/compendium/compendium-dense-selection-card"
import { ClassDetailFeatureList } from "@/components/compendium/class-detail-feature-list"
import { ClassComplexityDisplay } from "@/components/compendium/class-complexity-display"
import {
  SpeciesDetailTraitList,
  splitSpeciesTraits,
} from "@/components/compendium/species-detail-trait-list"
import { StartingEquipmentPackagePicker } from "@/components/builder/starting-equipment-package-picker"
import { SwipeVisualPicker } from "@/components/builder/swipe-visual-picker"
import {
  BuilderSpellCompactPick,
  SpellSelectionCard,
} from "@/components/builder/spell-selection-card"
import { compendiumCardBlurb, getCompendiumCardBlurb, getCompendiumCardImageUrl } from "@/lib/compendium/card-image"
import { buildCustomSkillIconByName } from "@/lib/compendium/skill-icons"
import { getClassDetailBaseFeatures } from "@/lib/builder/class-detail-features"
import { getClassDetailHeroBadges } from "@/lib/builder/class-detail-badges"
import {
  suggestEquipmentLoadout,
} from "@/lib/builder/equipment-loadout"
import {
  getBackgroundStartingEquipmentGroups,
  getBackgroundStartingGold,
} from "@/lib/compendium/background-equipment"
import { getCompendiumItemAccentColor, compendiumAccentColorStyles } from "@/lib/compendium/theme-colors"
import { cn } from "@/lib/utils"
import { getCompendiumItemIcon } from "@/lib/compendium/content-types"
import { MultiSelectChoices } from "@/components/builder/multi-select-choices"
import { CatalogFeatMultiPicker } from "@/components/builder/catalog-feat-multi-picker"
import { WeaponMasteryChoices } from "@/components/builder/weapon-mastery-choices"
import {
  buildWeaponMasteryDescriptionsLookup,
  weaponMasteryCatalogEntriesFromAbilities,
} from "@/lib/compendium/weapon-mastery"
import { isWeaponMasteryFeature } from "@/lib/compendium/weapon-mastery-choice"
import { AsiAllocator } from "@/components/builder/asi-allocator"
import { AbilityScoreCards } from "@/components/builder/ability-score-cards"
import {
  classNeedsSubclass,
  featureChoiceKey,
  buildSkillPickSources,
  getSubclassesForClass,
  getTakenSkills,
  SUBCLASS_LEVEL,
  validateClassStepChoices,
  validateOriginStepChoices,
  collectClassStepBlockers,
  collectOriginStepBlockers,
  proficientSkillsInBuilder,
} from "@/lib/builder/choices"
import { resolveFeatureChoiceCount } from "@/lib/compendium/resolve-feature-choice-count"
import { getBuilderLayout, layoutToCardViewMode } from "@/lib/site-settings/builder-layout"
import {
  clearBuilderDraft,
  loadBuilderDraft,
  normalizePreviewTab,
  saveBuilderDraft,
  type BuilderDraftSnapshot,
  type BuilderPreviewTab,
} from "@/lib/builder/draft-storage"
import { characterToBuilderState } from "@/lib/builder/character-to-draft"
import { buildBuilderPicksFromSnapshot } from "@/lib/builder/builder-picks"
import {
  collectFeatPickSlotKeys,
  collectMaxLevelFeatPickSlotKeys,
} from "@/lib/builder/feat-pick-keys"
import { partitionToolProficiencies } from "@/lib/compendium/partition-tool-proficiencies"
import {
  computeStartingCharacterGold,
  findEquipmentByName,
  getEquipmentCostGp,
  getStartingEquipmentGroups,
  isGoldOnlyOption,
  resolvePackageEquipmentIds,
  sumEquipmentGoldCost,
} from "@/lib/builder/equipment-utils"
import {
  canSelectSpell,
  countSelectedSpells,
  getSpellLimits,
  mergeSpellPicks,
} from "@/lib/builder/spell-limits"
import {
  catalogFeatPickOptions,
  isCatalogFeatPickId,
  slotUsesCatalogFeatPicks,
} from "@/lib/builder/catalog-feat-options"
import {
  distributeCatalogFeatPicksToSlots,
  groupCatalogFeatPickSlots,
  readCatalogFeatPicksFromSlots,
} from "@/lib/builder/catalog-feat-pick-groups"
import { getFeatPickSlots } from "@/lib/builder/class-feat-features"
import {
  buildFeatSelectionEntries,
  featChoicePickKey,
  grantedFeatChoicePickKey,
  validateFeatModifierChoices,
  collectFeatModifierChoiceBlockers,
} from "@/lib/builder/feat-choices"
import { getSpeciesFeatPickSlots } from "@/lib/builder/species-feat-options"
import { getBackgroundFeatPickSlots } from "@/lib/builder/background-feat-options"
import { FeatModifierChoicePicker } from "@/components/builder/feat-modifier-choice-picker"
import { ClassLevelInput } from "@/components/builder/class-level-input"
import { ModifierPlayerChoicePanel } from "@/components/builder/modifier-player-choice-panel"
import {
  clearModifierPicksForSource,
  collectModifierPlayerChoiceSlots,
  setModifierPlayerPickValue,
  speciesModsSourceKey,
  speciesTraitSourceKey,
  validateModifierPlayerChoices,
  collectModifierPlayerChoiceBlockers,
  nonSpellModifierPlayerChoiceSlots,
  spellModifierPlayerChoiceSlots,
} from "@/lib/builder/modifier-player-choices"
import {
  allAbilityScorePoolAllocationsValid,
  collectAbilityScorePoolGrants,
  shouldUseLegacyMilestoneAsiUi,
} from "@/lib/builder/ability-score-pools"
import {
  BACKGROUND_ASI_KEY,
  BACKGROUND_ASI_TOTAL_POINTS,
  getBackgroundAbilityGrant,
  getBackgroundAsiHelpText,
  isValidBackgroundAsiAllocation,
} from "@/lib/builder/background-asi"
import { collectBuilderModifierRefIds } from "@/lib/compendium/builder-modifier-refs"
import { collectSubclassAlwaysPreparedSpellIds } from "@/lib/character/subclass-granted-spells"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import {
  buildOwnedFeatIds,
  isFeatEligibleForCategories,
} from "@/lib/builder/feat-selection"
import {
  allSelectedAsiAllocationsValid,
  COMBINED_MILESTONE_ASI_KEY,
  countMilestoneAsiFeats,
  getAsiPointsUsed,
  getCombinedMilestoneAsiAllocation,
  isAsiFeat,
  milestoneAsiPointTotal,
  trimAsiAllocation,
  withCombinedMilestoneAsiAllocation,
} from "@/lib/builder/asi-allocation"
import { generateRandomCharacterDetails } from "@/lib/builder/random-character-details"
import {
  getCinematicPickerContainerClass,
  getCinematicSpellPickerContainerClass,
  paginateList,
} from "@/lib/builder/picker-pagination"
import { resolveSpellCardImageUrl } from "@/lib/compendium/enrich-srd-spells"
import {
  BUILDER_ABILITY_NAMES,
  BUILDER_EMPTY_CHARACTER,
  BUILDER_STANDARD_ARRAY,
  BUILDER_STEPS,
  BUILDER_STEP_IDS,
} from "@/lib/builder/builder-constants"
import { formatSpellListGroupLabel } from "@/lib/compendium/spell-slots"
import {
  formatMulticlassAbilityIssue,
  getMulticlassAbilityIssues,
  multiclassAbilityRequirementsMet,
  registerClassAdded,
  resolvePrimaryAfterRemoval,
  resolvePrimaryClassId,
} from "@/lib/builder/primary-class"
import {
  getClassSkillPickRequirement,
  getMulticlassToolPickRequirement,
  multiclassProficiencySummary,
} from "@/lib/builder/multiclass-proficiencies"
import { resolveFeatureChoiceOptions } from "@/lib/builder/aggregate-psionic-talents"
import { validateKnackSelectionChange } from "@/lib/builder/knack-choices"
import { validateUpgradeSelectionChange } from "@/lib/builder/upgrade-choices"
import {
  useIsMediumPickerScreen,
  useIsPhonePickerScreen,
  usePickerPageSize,
  useSpellPickerPageSize,
} from "@/hooks/use-picker-page-size"
import {
  MAX_PORTRAIT_FILE_BYTES,
  MAX_PORTRAIT_FILE_MB,
  formatImageUploadHint,
  normalizePortraitUrl,
  normalizeBannerUrl,
} from "@/lib/portrait"
import type {
  DndClass,
  Species,
  Background,
  Spell,
  Equipment,
  CharacterDraft,
  CustomAbility,
  Subclass,
  Character,
  Feat,
} from "@/lib/types"

const CompendiumDetailOverlay = dynamic(
  () =>
    import("@/components/compendium/compendium-detail-overlay").then((mod) => ({
      default: mod.CompendiumDetailOverlay,
    })),
)

const ABILITY_NAMES = BUILDER_ABILITY_NAMES

type AbilityName = (typeof ABILITY_NAMES)[number]

type StandardArrayAssignments = Partial<Record<AbilityName, number>>

const STANDARD_ARRAY = BUILDER_STANDARD_ARRAY
const STANDARD_ARRAY_UNASSIGNED_SCORE = 10

function standardAssignmentsFromCharacter(
  scores: Pick<CharacterDraft, AbilityName>,
): StandardArrayAssignments {
  const assignments: StandardArrayAssignments = {}
  const usedValues = new Set<number>()
  for (const name of ABILITY_NAMES) {
    const value = scores[name]
    if (!(STANDARD_ARRAY as readonly number[]).includes(value) || usedValues.has(value)) continue
    assignments[name] = value
    usedValues.add(value)
  }
  return assignments
}

function isStandardArrayComplete(assignments: StandardArrayAssignments): boolean {
  return ABILITY_NAMES.every((name) => assignments[name] != null)
}

const ABILITY_GAME_ICONS: Record<(typeof ABILITY_NAMES)[number], string> = {
  strength: "muscle-up",
  dexterity: "dodge",
  constitution: "heart-plus",
  intelligence: "brain",
  wisdom: "third-eye",
  charisma: "charm",
}

const PREVIEW_STAT_ICONS = {
  speed: "running-shoe",
  initiative: "lightning-arc",
  proficiency: "medal",
  passivePerception: "all-seeing-eye",
} as const

const PREVIEW_SECTION_ICONS = {
  skills: "skills",
  saves: "shield-reflect",
  proficiencies: "bookshelf",
} as const

type AbilityMethod = "pointbuy" | "standard" | "roll" | "custom"

const EMPTY_CHARACTER = BUILDER_EMPTY_CHARACTER

export default function BuilderPageClient() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [maxStepReached, setMaxStepReached] = useState(1)
  const [saving, setSaving] = useState(false)
  
  // Content from database
  const [classes, setClasses] = useState<DndClass[]>([])
  const [subclasses, setSubclasses] = useState<Subclass[]>([])
  const [species, setSpecies] = useState<Species[]>([])
  const [backgrounds, setBackgrounds] = useState<Background[]>([])
  const [spells, setSpells] = useState<Spell[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [feats, setFeats] = useState<Feat[]>([])
  const [featsLoadError, setFeatsLoadError] = useState<string | null>(null)
  const [customAbilities, setCustomAbilities] = useState<CustomAbility[]>([])
  const [modifierCatalog, setModifierCatalog] = useState<ModifierCatalogEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Character draft
  const [character, setCharacter] = useState<CharacterDraft>(EMPTY_CHARACTER)

  // Ability score generation method
  const [abilityMethod, setAbilityMethod] = useState<AbilityMethod>("pointbuy")
  const [standardArrayAssignments, setStandardArrayAssignments] = useState<StandardArrayAssignments>({})
  const [pointsRemaining, setPointsRemaining] = useState(27)
  
  // Search state for each step
  const [classSearch, setClassSearch] = useState("")
  const [classPickerPage, setClassPickerPage] = useState(0)
  const [speciesSearch, setSpeciesSearch] = useState("")
  const [speciesPickerPage, setSpeciesPickerPage] = useState(0)
  const [backgroundSearch, setBackgroundSearch] = useState("")
  const [backgroundPickerPage, setBackgroundPickerPage] = useState(0)
  const [spellSearch, setSpellSearch] = useState("")
  const [equipmentSearch, setEquipmentSearch] = useState("")
  const [equipmentFilterCategory, setEquipmentFilterCategory] = useState("all")
  const [spellFilterLevelByClassId, setSpellFilterLevelByClassId] = useState<Record<string, string>>({})
  const [spellLevelPages, setSpellLevelPages] = useState<Record<string, number>>({})
  const [startingEquipmentOptionIndex, setStartingEquipmentOptionIndex] = useState<number | null>(null)
  const [backgroundStartingEquipmentOptionIndex, setBackgroundStartingEquipmentOptionIndex] =
    useState<number | null>(null)
  const [goldPurchasedEquipmentIds, setGoldPurchasedEquipmentIds] = useState<string[]>([])
  const [cardViewMode, setCardViewMode] = useState<"dense" | "cinematic">("cinematic")
  const pickerPageSize = usePickerPageSize(cardViewMode)
  const spellPickerPageSize = useSpellPickerPageSize()
  const isPhonePickerScreen = useIsPhonePickerScreen()
  const isMediumPickerScreen = useIsMediumPickerScreen()
  const useSwipeVisualPicker = cardViewMode === "cinematic" && isPhonePickerScreen
  const useCinematicPortraitCards = cardViewMode === "cinematic" && isMediumPickerScreen
  
  // Details modal state
  const [detailsModal, setDetailsModal] = useState<{
    type: "class" | "species" | "background" | "spell" | "equipment" | "feat" | null
    item: DndClass | Species | Background | Spell | Equipment | Feat | null
  }>({ type: null, item: null })
  
  // Preview tabs
  const [previewTab, setPreviewTab] = useState<BuilderPreviewTab>("summary")
  const [mobilePanel, setMobilePanel] = useState<"steps" | "preview">("steps")
  const [equippedArmorId, setEquippedArmorId] = useState<string | null>(null)
  const [equippedShieldId, setEquippedShieldId] = useState<string | null>(null)
  const [equippedWeaponId, setEquippedWeaponId] = useState<string | null>(null)
  
  // Multiclass support - tracks class levels
  const [classLevels, setClassLevels] = useState<{ classId: string; level: number }[]>([])
  const [primaryClassId, setPrimaryClassId] = useState<string | null>(null)
  const [classAddOrder, setClassAddOrder] = useState<string[]>([])
  const [subclassByClassId, setSubclassByClassId] = useState<Record<string, string>>({})
  const [classSkillPicks, setClassSkillPicks] = useState<Record<string, string[]>>({})
  const [classToolPicks, setClassToolPicks] = useState<Record<string, string[]>>({})
  const [featureChoicePicks, setFeatureChoicePicks] = useState<Record<string, string[]>>({})
  const [featChoicePicks, setFeatChoicePicks] = useState<Record<string, string[]>>({})
  const [modifierPlayerPicks, setModifierPlayerPicks] = useState<Record<string, string[]>>({})
  const [speciesTraitPicks, setSpeciesTraitPicks] = useState<Record<string, string[]>>({})
  const [spellPicksByClassId, setSpellPicksByClassId] = useState<Record<string, string[]>>({})
  const [asiAllocationsByFeatId, setAsiAllocationsByFeatId] = useState<
    Record<string, Partial<Record<(typeof ABILITY_NAMES)[number], number>>>
  >({})
  
  // Current HP tracker
  const [currentHp, setCurrentHp] = useState<number | null>(null)
  const [tempHp, setTempHp] = useState(0)
  const [draftReady, setDraftReady] = useState(false)
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null)
  const [editIdParam, setEditIdParam] = useState<string | null>(null)
  const editHydratedRef = useRef(false)
  const [editHydrated, setEditHydrated] = useState(false)

  const activeClassLevels = Array.isArray(classLevels) ? classLevels : []
  const activeClassAddOrder = Array.isArray(classAddOrder) ? classAddOrder : []

  useEffect(() => {
    if (Array.isArray(classLevels)) return
    setClassLevels(
      character.class_id
        ? [{ classId: character.class_id, level: Math.max(1, character.level || 1) }]
        : [],
    )
  }, [classLevels, character.class_id, character.level])

  const applyBuilderSnapshot = (snapshot: Omit<BuilderDraftSnapshot, "version" | "savedAt">) => {
    setCurrentStep(snapshot.currentStep)
    setMaxStepReached(snapshot.maxStepReached)
    setCharacter(snapshot.character)
    setAbilityMethod(snapshot.abilityMethod)
    setPointsRemaining(snapshot.pointsRemaining)
    setClassSearch(snapshot.classSearch)
    setSpeciesSearch(snapshot.speciesSearch)
    setBackgroundSearch(snapshot.backgroundSearch)
    setSpellSearch(snapshot.spellSearch)
    setEquipmentSearch(snapshot.equipmentSearch)
    setEquipmentFilterCategory(snapshot.equipmentFilterCategory ?? "all")
    setSpellFilterLevelByClassId(snapshot.spellFilterLevelByClassId ?? {})
    setSpellLevelPages(snapshot.spellLevelPages ?? {})
    setStartingEquipmentOptionIndex(snapshot.startingEquipmentOptionIndex ?? null)
    setBackgroundStartingEquipmentOptionIndex(
      snapshot.backgroundStartingEquipmentOptionIndex ?? null,
    )
    setGoldPurchasedEquipmentIds(snapshot.goldPurchasedEquipmentIds ?? [])
    setCardViewMode(snapshot.cardViewMode ?? layoutToCardViewMode(getBuilderLayout()))
    setPreviewTab(normalizePreviewTab(snapshot.previewTab))
    setMobilePanel(snapshot.mobilePanel)
    setEquippedArmorId(snapshot.equippedArmorId)
    setEquippedShieldId(snapshot.equippedShieldId)
    setEquippedWeaponId(snapshot.equippedWeaponId)
    const restoredClassLevels =
      Array.isArray(snapshot.classLevels) && snapshot.classLevels.length > 0
        ? snapshot.classLevels
        : snapshot.character.class_id
          ? [
              {
                classId: snapshot.character.class_id,
                level: snapshot.character.level > 0 ? snapshot.character.level : 1,
              },
            ]
          : []
    setClassLevels(restoredClassLevels)
    setPrimaryClassId(
      snapshot.primaryClassId ??
        snapshot.character.class_id ??
        restoredClassLevels[0]?.classId ??
        null,
    )
    setClassAddOrder(
      snapshot.classAddOrder?.length
        ? snapshot.classAddOrder
        : restoredClassLevels.map((entry) => entry.classId),
    )
    setSubclassByClassId(snapshot.subclassByClassId ?? {})
    setClassSkillPicks(snapshot.classSkillPicks)
    setClassToolPicks(snapshot.classToolPicks ?? {})
    setFeatureChoicePicks(snapshot.featureChoicePicks)
    setFeatChoicePicks(snapshot.featChoicePicks ?? {})
    setModifierPlayerPicks(snapshot.modifierPlayerPicks ?? {})
    setSpeciesTraitPicks(snapshot.speciesTraitPicks)
    setSpellPicksByClassId(snapshot.spellPicksByClassId ?? {})
    setAsiAllocationsByFeatId(snapshot.asiAllocationsByFeatId ?? {})
    setStandardArrayAssignments(
      snapshot.standardArrayAssignments ??
        (snapshot.abilityMethod === "standard"
          ? standardAssignmentsFromCharacter(snapshot.character)
          : {}),
    )
    setCurrentHp(snapshot.currentHp)
    setTempHp(snapshot.tempHp)
    setEditingCharacterId(snapshot.editingCharacterId ?? null)
  }

  const clearClassChoices = (classId: string) => {
    setSubclassByClassId((prev) => {
      const next = { ...prev }
      delete next[classId]
      return next
    })
    setClassSkillPicks((prev) => {
      const next = { ...prev }
      delete next[classId]
      return next
    })
    setClassToolPicks((prev) => {
      const next = { ...prev }
      delete next[classId]
      return next
    })
    setFeatureChoicePicks((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        if (key.startsWith(`${classId}:`)) delete next[key]
      }
      return next
    })
    setSpellPicksByClassId((prev) => {
      const next = { ...prev }
      delete next[classId]
      return next
    })
  }

  const syncPrimaryClassToCharacter = (nextPrimaryId: string | null) => {
    setPrimaryClassId(nextPrimaryId)
    setCharacter((prev) => ({
      ...prev,
      class_id: nextPrimaryId,
      subclass_id: nextPrimaryId ? (subclassByClassId[nextPrimaryId] ?? null) : null,
    }))
  }

  const removeClassFromBuild = (classId: string, nextLevels: { classId: string; level: number }[]) => {
    clearClassChoices(classId)
    const remainingIds = new Set(nextLevels.map((entry) => entry.classId))
    const nextPrimary = resolvePrimaryAfterRemoval(
      classId,
      primaryClassId,
      activeClassAddOrder,
      remainingIds,
    )
    setClassLevels(nextLevels)
    syncPrimaryClassToCharacter(nextPrimary)
  }

  const addClassToBuild = (classId: string) => {
    const registration = registerClassAdded(classId, primaryClassId, activeClassAddOrder)
    setClassAddOrder(registration.classAddOrder)
    syncPrimaryClassToCharacter(registration.primaryClassId)
    setClassLevels((prev) => [...prev, { classId, level: 1 }])
  }

  const resetCharacter = () => {
    setCharacter({ ...EMPTY_CHARACTER })
    setClassLevels([])
    setPrimaryClassId(null)
    setClassAddOrder([])
    setSubclassByClassId({})
    setClassSkillPicks({})
    setClassToolPicks({})
    setFeatureChoicePicks({})
    setSpeciesTraitPicks({})
    setSpellPicksByClassId({})
    setAsiAllocationsByFeatId({})
    setStandardArrayAssignments({})
    setAbilityMethod("pointbuy")
    setPointsRemaining(27)
    setClassSearch("")
    setSpeciesSearch("")
    setBackgroundSearch("")
    setSpellSearch("")
    setEquipmentSearch("")
    setEquipmentFilterCategory("all")
    setSpellFilterLevelByClassId({})
    setSpellLevelPages({})
    setStartingEquipmentOptionIndex(null)
    setBackgroundStartingEquipmentOptionIndex(null)
    setGoldPurchasedEquipmentIds([])
    setCardViewMode("cinematic")
    setCurrentHp(null)
    setTempHp(0)
    setEquippedArmorId(null)
    setEquippedShieldId(null)
    setEquippedWeaponId(null)
    setEditingCharacterId(null)
    setMobilePanel("steps")
    setCurrentStep(1)
    setMaxStepReached(1)
    clearBuilderDraft()
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setEditIdParam(params.get("edit"))
  }, [])

  useEffect(() => {
    setClassPickerPage(0)
  }, [classSearch])

  useEffect(() => {
    setSpeciesPickerPage(0)
  }, [speciesSearch])

  useEffect(() => {
    setBackgroundPickerPage(0)
  }, [backgroundSearch])

  useEffect(() => {
    setClassPickerPage(0)
    setSpeciesPickerPage(0)
    setBackgroundPickerPage(0)
  }, [cardViewMode, pickerPageSize])

  useEffect(() => {
    setSpellLevelPages({})
  }, [spellPickerPageSize])

  useEffect(() => {
    if (editIdParam) {
      setCardViewMode(layoutToCardViewMode(getBuilderLayout()))
      return
    }
    const draft = loadBuilderDraft()
    if (draft) {
      applyBuilderSnapshot(draft)
    } else {
      setCardViewMode(layoutToCardViewMode(getBuilderLayout()))
    }
    setEditHydrated(true)
    setDraftReady(true)
  }, [editIdParam])

  useEffect(() => {
    if (loading || !editIdParam || editHydratedRef.current) return

    const hydrateFromCharacter = async () => {
      const db = createClient()
      const { data, error } = await db
        .from("characters")
        .select("*")
        .eq("id", editIdParam)
        .single()

      if (error || !data) {
        alert(error?.message ?? "Could not load character for editing.")
        return
      }

      editHydratedRef.current = true
      clearBuilderDraft()

      const saved = data as Character
      const dndClass = classes.find((c) => c.id === saved.class_id)
      const background = backgrounds.find((b) => b.id === saved.background_id)
      applyBuilderSnapshot(
        characterToBuilderState(saved, {
          dndClass,
          background,
          allClasses: classes,
          spells,
        }),
      )
      setEditHydrated(true)
      setDraftReady(true)
    }

    void hydrateFromCharacter()
  }, [loading, editIdParam, classes, backgrounds, spells])

  useEffect(() => {
    if (!draftReady) return
    saveBuilderDraft({
      currentStep,
      maxStepReached,
      character,
      abilityMethod,
      pointsRemaining,
      classSearch,
      speciesSearch,
      backgroundSearch,
      spellSearch,
      equipmentSearch,
      equipmentFilterCategory,
      spellFilterLevelByClassId,
      spellLevelPages,
      startingEquipmentOptionIndex,
      backgroundStartingEquipmentOptionIndex,
      goldPurchasedEquipmentIds,
      cardViewMode,
      previewTab,
      mobilePanel,
      equippedArmorId,
      equippedShieldId,
      equippedWeaponId,
      classLevels: activeClassLevels,
      primaryClassId,
      classAddOrder: activeClassAddOrder,
      subclassByClassId,
      classSkillPicks,
      classToolPicks,
      featureChoicePicks,
      featChoicePicks,
      modifierPlayerPicks,
      speciesTraitPicks,
      spellPicksByClassId,
      asiAllocationsByFeatId,
      standardArrayAssignments,
      editingCharacterId,
      currentHp,
      tempHp,
    })
  }, [
    draftReady,
    currentStep,
    maxStepReached,
    character,
    abilityMethod,
    pointsRemaining,
    classSearch,
    speciesSearch,
    backgroundSearch,
    spellSearch,
    equipmentSearch,
    equipmentFilterCategory,
    spellFilterLevelByClassId,
    spellLevelPages,
    startingEquipmentOptionIndex,
    backgroundStartingEquipmentOptionIndex,
    goldPurchasedEquipmentIds,
    cardViewMode,
    previewTab,
    mobilePanel,
    equippedArmorId,
    equippedShieldId,
    equippedWeaponId,
    classLevels,
    primaryClassId,
    classAddOrder,
    subclassByClassId,
    classSkillPicks,
    classToolPicks,
    featureChoicePicks,
    featChoicePicks,
    modifierPlayerPicks,
    speciesTraitPicks,
    spellPicksByClassId,
    asiAllocationsByFeatId,
    standardArrayAssignments,
    editingCharacterId,
    currentHp,
    tempHp,
  ])

  useEffect(() => {
    const fetchContent = async () => {
      const db = createClient()
      const payload = await loadBuilderCompendium(db)

      setModifierCatalog(payload.modifierCatalog)
      setClasses(payload.classes)
      setSubclasses(payload.subclasses)
      setSpecies(payload.species)
      setBackgrounds(payload.backgrounds)
      setFeatsLoadError(payload.featsLoadError)
      setFeats(payload.feats)
      setSpells(payload.spells)
      setEquipment(payload.equipment)
      setCustomAbilities(payload.customAbilities)
      setLoading(false)
    }

    fetchContent()
  }, [])

  // Calculate point buy cost
  const getPointCost = (score: number) => {
    if (score <= 13) return score - 8
    if (score === 14) return 7
    if (score === 15) return 9
    return 0
  }

  const updateAbilityScore = (ability: typeof ABILITY_NAMES[number], delta: number) => {
    const currentScore = character[ability]
    const newScore = currentScore + delta

    if (newScore < 8 || newScore > 15) return

    if (abilityMethod === "pointbuy") {
      const currentCost = getPointCost(currentScore)
      const newCost = getPointCost(newScore)
      const costDiff = newCost - currentCost

      if (pointsRemaining - costDiff < 0) return
      setPointsRemaining(pointsRemaining - costDiff)
    }

    setCharacter({ ...character, [ability]: newScore })
  }

  const setCustomAbilityScore = (ability: (typeof ABILITY_NAMES)[number], raw: string) => {
    if (raw === "") return
    const parsed = parseInt(raw, 10)
    if (!Number.isFinite(parsed)) return
    setCharacter({ ...character, [ability]: Math.min(30, Math.max(1, parsed)) })
  }

  const assignStandardArrayValue = (ability: AbilityName, value: number) => {
    setStandardArrayAssignments((prev) => {
      const current = prev[ability]
      const next = { ...prev }
      if (current === value) {
        delete next[ability]
        setCharacter((characterPrev) => ({
          ...characterPrev,
          [ability]: STANDARD_ARRAY_UNASSIGNED_SCORE,
        }))
      } else {
        next[ability] = value
        setCharacter((characterPrev) => ({ ...characterPrev, [ability]: value }))
      }
      return next
    })
  }

  const isStandardValueUsedElsewhere = (ability: AbilityName, value: number) =>
    ABILITY_NAMES.some(
      (name) => name !== ability && standardArrayAssignments[name] === value,
    )

  const applyStandardArray = () => {
    setStandardArrayAssignments({})
    setCharacter((prev) => ({
      ...prev,
      strength: STANDARD_ARRAY_UNASSIGNED_SCORE,
      dexterity: STANDARD_ARRAY_UNASSIGNED_SCORE,
      constitution: STANDARD_ARRAY_UNASSIGNED_SCORE,
      intelligence: STANDARD_ARRAY_UNASSIGNED_SCORE,
      wisdom: STANDARD_ARRAY_UNASSIGNED_SCORE,
      charisma: STANDARD_ARRAY_UNASSIGNED_SCORE,
    }))
  }

  const rollAbilities = () => {
    const rollStat = () => {
      const rolls = Array(4).fill(0).map(() => Math.floor(Math.random() * 6) + 1)
      rolls.sort((a, b) => b - a)
      return rolls.slice(0, 3).reduce((a, b) => a + b, 0)
    }
    
    setCharacter({
      ...character,
      strength: rollStat(),
      dexterity: rollStat(),
      constitution: rollStat(),
      intelligence: rollStat(),
      wisdom: rollStat(),
      charisma: rollStat(),
    })
  }

  const patchCharacter = useCallback((patch: Partial<CharacterDraft>) => {
    setCharacter((prev) => ({ ...prev, ...patch }))
  }, [])

  const handlePortraitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_PORTRAIT_FILE_BYTES) {
      alert(`Image must be ${MAX_PORTRAIT_FILE_MB} MB or smaller.`)
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      patchCharacter({ portrait_url: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_PORTRAIT_FILE_BYTES) {
      alert(`Image must be ${MAX_PORTRAIT_FILE_MB} MB or smaller.`)
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      patchCharacter({ banner_url: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  const applyRandomCharacterDetails = () => {
    const generated = generateRandomCharacterDetails()
    setCharacter((prev) => ({
      ...prev,
      ...generated,
      name: prev.name.trim() ? prev.name : generated.name,
    }))
  }

  const selectedClass = classes.find(c => c.id === character.class_id)
  const selectedSpecies = species.find(s => s.id === character.species_id)
  const selectedBackground = backgrounds.find(b => b.id === character.background_id)
  const effectiveBackgroundFeatGranted = getEffectiveBackgroundFeatGranted(
    selectedBackground,
    featureChoicePicks,
  )
  const backgroundGrantedFeat = findBackgroundGrantedFeat(
    effectiveBackgroundFeatGranted,
    feats,
  )
  const grantedFeatIds = backgroundGrantedFeat?.id ? [backgroundGrantedFeat.id] : []
  const backgroundAbilityGrant = getBackgroundAbilityGrant(selectedBackground)
  const originFeats = useMemo(
    () =>
      feats
        .filter((feat) => normalizeFeatCategory(feat.category) === "Origin")
        .map((feat) => ({ id: feat.id, name: feat.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [feats],
  )
  
  // Calculate total level from all class levels
  const totalLevel = activeClassLevels.length > 0 
    ? activeClassLevels.reduce((sum, cl) => sum + cl.level, 0)
      : character.level

  const featPickSlots = getFeatPickSlots(
    activeClassLevels,
    classes,
    modifierCatalog,
    totalLevel,
    subclasses,
    subclassByClassId,
  )
  const { catalogGroups: classCatalogFeatGroups, regularSlots: regularClassFeatSlots } = useMemo(
    () => groupCatalogFeatPickSlots(featPickSlots),
    [featPickSlots],
  )
  const speciesFeatPickSlots = useMemo(
    () => getSpeciesFeatPickSlots(selectedSpecies, speciesTraitPicks, modifierCatalog),
    [selectedSpecies, speciesTraitPicks, modifierCatalog],
  )
  const backgroundFeatPickSlots = useMemo(
    () => getBackgroundFeatPickSlots(selectedBackground, modifierCatalog),
    [selectedBackground, modifierCatalog],
  )
  const allFeatPickSlotKeys = useMemo(
    () => [
      ...featPickSlots.map((slot) => slot.key),
      ...speciesFeatPickSlots.map((slot) => slot.key),
      ...backgroundFeatPickSlots.map((slot) => slot.key),
    ],
    [featPickSlots, speciesFeatPickSlots, backgroundFeatPickSlots],
  )
  const activeFeatPickSlotKeys = useMemo(
    () =>
      collectFeatPickSlotKeys({
        classLevels: activeClassLevels,
        classes,
        catalog: modifierCatalog,
        totalLevel,
        subclasses,
        subclassByClassId,
        species: selectedSpecies,
        speciesTraitPicks,
        background: selectedBackground,
      }),
    [
      activeClassLevels,
      classes,
      modifierCatalog,
      totalLevel,
      subclasses,
      subclassByClassId,
      selectedSpecies,
      speciesTraitPicks,
      selectedBackground,
    ],
  )
  const maxLevelFeatPickSlotKeys = useMemo(
    () =>
      collectMaxLevelFeatPickSlotKeys({
        classLevels: activeClassLevels,
        classes,
        catalog: modifierCatalog,
        subclasses,
        subclassByClassId,
        species: selectedSpecies,
        speciesTraitPicks,
        background: selectedBackground,
      }),
    [
      activeClassLevels,
      classes,
      modifierCatalog,
      subclasses,
      subclassByClassId,
      selectedSpecies,
      speciesTraitPicks,
      selectedBackground,
    ],
  )
  const ownedFeatIds = useMemo(
    () =>
      buildOwnedFeatIds({
        featureChoicePicks,
        pickSlotKeys: allFeatPickSlotKeys,
        grantedFeatIds,
      }),
    [featureChoicePicks, allFeatPickSlotKeys, grantedFeatIds],
  )
  const weaponMasteryDescriptions = useMemo(
    () =>
      buildWeaponMasteryDescriptionsLookup(
        weaponMasteryCatalogEntriesFromAbilities(customAbilities),
      ),
    [customAbilities],
  )
  const featSelectionEntries = useMemo(
    () =>
      buildFeatSelectionEntries({
        featPickSlots,
        speciesFeatPickSlots,
        backgroundFeatPickSlots,
        featureChoicePicks,
        grantedFeatIds,
      }),
    [featPickSlots, speciesFeatPickSlots, backgroundFeatPickSlots, featureChoicePicks, grantedFeatIds],
  )
  const requiredFeatSlots = featPickSlots.length
  const classSelectedFeatIds = featPickSlots.map((slot) => featureChoicePicks[slot.key]?.[0] ?? "")
  const speciesSelectedFeatIds = speciesFeatPickSlots.map(
    (slot) => featureChoicePicks[slot.key]?.[0] ?? "",
  )
  const selectedFeatIds = [...classSelectedFeatIds, ...speciesSelectedFeatIds].filter(Boolean)
  const selectedFeatCount = classSelectedFeatIds.filter(Boolean).length
  const hasCatalogFeatPickOptions = useMemo(
    () =>
      featPickSlots.some(
        (slot) =>
          slotUsesCatalogFeatPicks(slot.featCategories) &&
          catalogFeatPickOptions(slot.featCategories, customAbilities).length > 0,
      ),
    [featPickSlots, customAbilities],
  )
  const milestoneAsiFeatCount = countMilestoneAsiFeats(selectedFeatIds, feats)
  const milestoneAsiTotalPoints = milestoneAsiPointTotal(milestoneAsiFeatCount)
  const milestoneAsiAllocation = getCombinedMilestoneAsiAllocation(
    asiAllocationsByFeatId,
    selectedFeatIds,
    feats,
  )
  const abilityScorePoolGrants = collectAbilityScorePoolGrants({
    catalog: modifierCatalog,
    species: selectedSpecies,
    speciesTraitPicks,
    feats,
    selectedFeatIds,
    grantedFeatIds,
    featSelectionEntries,
    featChoicePicks,
    classLevels: activeClassLevels,
    classes,
    subclasses,
    subclassByClassId,
    featureChoicePicks,
  })
  const showLegacyMilestoneAsi = shouldUseLegacyMilestoneAsiUi({
    milestoneAsiFeatCount,
    grants: abilityScorePoolGrants,
    featSelectionEntries,
    feats,
  })

  // If level drops, clear feat picks that no longer apply (keep class feature choices).
  useEffect(() => {
    if (!editHydrated) return
    const validKeys = activeFeatPickSlotKeys
    setFeatureChoicePicks((prev) => {
      const next: Record<string, string[]> = {}
      let changed = false
      for (const [key, picks] of Object.entries(prev)) {
        if (validKeys.has(key) || !maxLevelFeatPickSlotKeys.has(key)) {
          next[key] = picks
        } else {
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [
    editHydrated,
    [...activeFeatPickSlotKeys].sort().join("|"),
    [...maxLevelFeatPickSlotKeys].sort().join("|"),
  ])

  useEffect(() => {
    const validKeys = new Set(featSelectionEntries.map((entry) => entry.choicePickKey))
    setFeatChoicePicks((prev) => {
      const next: Record<string, string[]> = {}
      let changed = false
      for (const [key, picks] of Object.entries(prev)) {
        if (validKeys.has(key)) {
          next[key] = picks
        } else {
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [featSelectionEntries.map((entry) => entry.choicePickKey).join("|")])

  const modifierPlayerChoiceSlots = useMemo(
    () =>
      collectModifierPlayerChoiceSlots({
        featEntries: featSelectionEntries,
        feats,
        featChoicePicks,
        catalog: modifierCatalog,
        customAbilities,
        classLevels: activeClassLevels,
        classes,
        subclasses,
        subclassByClassId,
        featureChoicePicks,
        species: selectedSpecies,
        speciesTraitPicks,
      }),
    [
      featSelectionEntries,
      feats,
      featChoicePicks,
      modifierCatalog,
      customAbilities,
      activeClassLevels,
      classes,
      subclasses,
      subclassByClassId,
      featureChoicePicks,
      selectedSpecies,
      speciesTraitPicks,
    ],
  )

  useEffect(() => {
    if (!editHydrated) return
    const validKeys = new Set(modifierPlayerChoiceSlots.map((slot) => slot.slotKey))
    setModifierPlayerPicks((prev) => {
      const next: Record<string, string[]> = {}
      let changed = false
      for (const [key, picks] of Object.entries(prev)) {
        if (validKeys.has(key)) {
          next[key] = picks
        } else {
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [editHydrated, modifierPlayerChoiceSlots.map((slot) => slot.slotKey).join("|")])

  useEffect(() => {
    const spellList = magicInitiateListFromFeatGranted(effectiveBackgroundFeatGranted)
    if (!spellList || !backgroundGrantedFeat?.id) return

    const sourceKey = grantedFeatChoicePickKey(backgroundGrantedFeat.id)
    const listSlot = modifierPlayerChoiceSlots.find(
      (slot) => slot.sourceKey === sourceKey && slot.kind === "spell_list_class",
    )
    if (!listSlot) return

    setModifierPlayerPicks((prev) => {
      if (prev[listSlot.slotKey]?.[0] === spellList) return prev
      return { ...prev, [listSlot.slotKey]: [spellList] }
    })
  }, [
    effectiveBackgroundFeatGranted,
    backgroundGrantedFeat?.id,
    modifierPlayerChoiceSlots,
  ])

  const featPickSlotKeys = featPickSlots.map((slot) => slot.key).join("|")

  // Once Origin is chosen, enforce feat prerequisites for class feature feat picks.
  useEffect(() => {
    if (selectedFeatCount === 0) return
    const classIds = activeClassLevels.map((cl) => cl.classId)
    const context = {
      totalLevel,
      classIds,
      feats,
      ownedFeatIds,
      speciesId: character.species_id,
      backgroundId: character.background_id,
    }

    setFeatureChoicePicks((prev) => {
      const nextPicks = { ...prev }
      let changed = false
      for (const slot of featPickSlots) {
        const pickedId = nextPicks[slot.key]?.[0]
        if (!pickedId) continue
        if (isCatalogFeatPickId(pickedId)) continue
        const feat = feats.find((f) => f.id === pickedId)
        if (
          !feat ||
          !isFeatEligibleForCategories(feat, slot.featCategories, slot.milestoneLevel, {
            ...context,
            currentSlotFeatId: pickedId,
          })
        ) {
          nextPicks[slot.key] = []
          changed = true
        }
      }
      if (changed) {
        window.setTimeout(() => {
          alert("One or more selected feats no longer meet prerequisites. Please reselect.")
        }, 0)
        return nextPicks
      }
      return prev
    })
  }, [
    character.species_id,
    character.background_id,
    totalLevel,
    classLevels,
    feats,
    ownedFeatIds,
    selectedFeatCount,
    featPickSlotKeys,
  ])

  useEffect(() => {
    if (!showLegacyMilestoneAsi || milestoneAsiTotalPoints <= 0) {
      setAsiAllocationsByFeatId((prev) => {
        if (!prev[COMBINED_MILESTONE_ASI_KEY]) return prev
        const next = { ...prev }
        delete next[COMBINED_MILESTONE_ASI_KEY]
        return next
      })
      return
    }
    const allocation = getCombinedMilestoneAsiAllocation(
      asiAllocationsByFeatId,
      selectedFeatIds,
      feats,
    )
    if (getAsiPointsUsed(allocation) <= milestoneAsiTotalPoints) return
    setAsiAllocationsByFeatId((prev) =>
      withCombinedMilestoneAsiAllocation(
        prev,
        trimAsiAllocation(allocation, milestoneAsiTotalPoints),
      ),
    )
  }, [
    asiAllocationsByFeatId,
    selectedFeatIds,
    feats,
    milestoneAsiTotalPoints,
    showLegacyMilestoneAsi,
  ])

  useEffect(() => {
    if (!abilityScorePoolGrants.length) return
    setAsiAllocationsByFeatId((prev) => {
      let changed = false
      const next = { ...prev }
      for (const grant of abilityScorePoolGrants) {
        const current = next[grant.allocationKey]
        if (!current) continue
        const trimmed = trimAsiAllocation(current, grant.points)
        if (JSON.stringify(trimmed) !== JSON.stringify(current)) {
          next[grant.allocationKey] = trimmed
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [abilityScorePoolGrants.map((grant) => `${grant.allocationKey}:${grant.points}`).join("|")])
  
  // Get proficiency bonus based on total level
  const proficiencyBonus = Math.floor((totalLevel - 1) / 4) + 2
  
  // Get all classes the character has levels in
  const resolvedPrimaryClassId = resolvePrimaryClassId(
    primaryClassId,
    activeClassAddOrder,
    activeClassLevels,
  )
  const characterClasses = activeClassLevels
    .map((cl) => {
      const found = classes.find((c) => c.id === cl.classId)
      if (!found) return null
      return { ...found, level: cl.level }
    })
    .filter((c): c is DndClass & { level: number } => c != null)

  const primaryClass =
    (resolvedPrimaryClassId
      ? characterClasses.find((cls) => cls.id === resolvedPrimaryClassId)
      : undefined) ??
    (characterClasses.length > 0 ? characterClasses[0] : selectedClass)

  const equipmentClass = primaryClass ?? selectedClass
  const startingEquipmentGroups = getStartingEquipmentGroups(equipmentClass)
  const classStartingGold = equipmentClass?.starting_gold ?? 0
  const backgroundStartingEquipmentGroups =
    getBackgroundStartingEquipmentGroups(selectedBackground)
  const backgroundStartingGold = getBackgroundStartingGold(selectedBackground)
  const selectedStartingOption =
    startingEquipmentOptionIndex != null && startingEquipmentGroups[0]
      ? startingEquipmentGroups[0].options[startingEquipmentOptionIndex]
      : null
  const selectedBackgroundStartingOption =
    backgroundStartingEquipmentOptionIndex != null && backgroundStartingEquipmentGroups[0]
      ? backgroundStartingEquipmentGroups[0].options[backgroundStartingEquipmentOptionIndex]
      : null
  const useGoldEquipment =
    selectedStartingOption != null &&
    isGoldOnlyOption(selectedStartingOption, classStartingGold)
  const useBackgroundGoldEquipment =
    selectedBackgroundStartingOption != null &&
    isGoldOnlyOption(selectedBackgroundStartingOption, backgroundStartingGold)
  const inGoldShoppingMode = useGoldEquipment || useBackgroundGoldEquipment

  const packageEquipmentIds = useMemo(() => {
    const ids: string[] = []
    if (selectedStartingOption && !useGoldEquipment) {
      ids.push(...resolvePackageEquipmentIds(selectedStartingOption.items ?? [], equipment))
    }
    if (selectedBackgroundStartingOption && !useBackgroundGoldEquipment) {
      for (const id of resolvePackageEquipmentIds(
        selectedBackgroundStartingOption.items ?? [],
        equipment,
      )) {
        if (!ids.includes(id)) ids.push(id)
      }
    }
    return ids
  }, [
    selectedStartingOption,
    selectedBackgroundStartingOption,
    useGoldEquipment,
    useBackgroundGoldEquipment,
    equipment,
  ])

  const totalGoldBudget =
    (useGoldEquipment ? classStartingGold : 0) +
    (useBackgroundGoldEquipment ? backgroundStartingGold : 0)
  const goldSpent = useMemo(
    () => sumEquipmentGoldCost(goldPurchasedEquipmentIds, equipment),
    [goldPurchasedEquipmentIds, equipment],
  )
  const goldRemaining = totalGoldBudget - goldSpent

  useEffect(() => {
    if (!inGoldShoppingMode && goldPurchasedEquipmentIds.length > 0) {
      setGoldPurchasedEquipmentIds([])
    }
  }, [inGoldShoppingMode, goldPurchasedEquipmentIds.length])

  useEffect(() => {
    if (!draftReady) return
    const preserveLoadedEquipment =
      editingCharacterId != null &&
      startingEquipmentOptionIndex == null &&
      backgroundStartingEquipmentOptionIndex == null &&
      !inGoldShoppingMode
    if (preserveLoadedEquipment) return

    const merged = [
      ...new Set([
        ...packageEquipmentIds,
        ...(inGoldShoppingMode ? goldPurchasedEquipmentIds : []),
      ]),
    ]
    setCharacter((prev) => {
      if (
        prev.equipment_ids.length === merged.length &&
        prev.equipment_ids.every((id) => merged.includes(id))
      ) {
        return prev
      }
      return { ...prev, equipment_ids: merged }
    })
  }, [
    draftReady,
    editingCharacterId,
    startingEquipmentOptionIndex,
    backgroundStartingEquipmentOptionIndex,
    packageEquipmentIds,
    goldPurchasedEquipmentIds,
    inGoldShoppingMode,
  ])

  useEffect(() => {
    if (!draftReady) return
    const suggestion = suggestEquipmentLoadout(character.equipment_ids, equipment)
    setEquippedArmorId((prev) => {
      const item = equipment.find((entry) => entry.id === prev)
      if (prev && character.equipment_ids.includes(prev) && item && isArmorItem(item)) {
        return prev
      }
      return suggestion.armorId
    })
    setEquippedShieldId((prev) => {
      const item = equipment.find((entry) => entry.id === prev)
      if (prev && character.equipment_ids.includes(prev) && item && isShieldItem(item)) {
        return prev
      }
      return suggestion.shieldId
    })
    setEquippedWeaponId((prev) => {
      const item = equipment.find((entry) => entry.id === prev)
      if (prev && character.equipment_ids.includes(prev) && item && isWeaponItem(item)) {
        return prev
      }
      return suggestion.weaponId
    })
  }, [draftReady, character.equipment_ids, equipment])

  const toggleGoldPurchasedEquipment = (itemId: string, checked: boolean) => {
    if (checked) {
      const item = equipment.find((entry) => entry.id === itemId)
      if (!item) return
      const nextCost = goldSpent + getEquipmentCostGp(item)
      if (nextCost > totalGoldBudget) return
      setGoldPurchasedEquipmentIds((prev) =>
        prev.includes(itemId) ? prev : [...prev, itemId],
      )
        } else {
      setGoldPurchasedEquipmentIds((prev) => prev.filter((id) => id !== itemId))
    }
  }

  const selectStartingEquipmentOption = (index: number) => {
    setStartingEquipmentOptionIndex(index)
  }

  const selectBackgroundStartingEquipmentOption = (index: number) => {
    setBackgroundStartingEquipmentOptionIndex(index)
  }

  const pickerGridClass =
    cardViewMode === "cinematic"
      ? getCinematicPickerContainerClass()
      : "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 px-1 py-2"
  const cinematicPickerPaginationClass = useSwipeVisualPicker ? "max-sm:hidden" : undefined

  const compactPickerLayout = (cardViewMode === "dense" ? "compact" : "default") as "compact" | "default"
  const skillPickerLayout = (cardViewMode === "cinematic" ? "visual" : "compact") as "visual" | "compact"
  const asiAllocatorVariant = cardViewMode === "cinematic" ? "visual" : "default"
  const selectedBackgroundCardImage = selectedBackground
    ? getCompendiumCardImageUrl(selectedBackground)
    : null
  const customSkillIconByName = useMemo(
    () => buildCustomSkillIconByName(customAbilities),
    [customAbilities],
  )

  const skillPickSources = buildSkillPickSources({
    backgroundSkills: selectedBackground?.skill_proficiencies,
    classSkillPicks,
    featureChoicePicks,
    speciesTraitPicks,
  })

  const spellcastingClasses =
    characterClasses.filter((c) => c.spellcasting).length > 0
      ? characterClasses.filter((c) => c.spellcasting)
      : selectedClass?.spellcasting
        ? [selectedClass]
        : []
  const mergedSpellIds = mergeSpellPicks(spellPicksByClassId)

  const builderCharacteristicMods = [
    ...collectBuilderModifierRefIds({
      catalog: modifierCatalog,
      species: selectedSpecies,
      speciesTraitPicks,
      background: selectedBackground,
      feats,
      selectedFeatIds,
      grantedFeatIds,
      featSelectionEntries,
      featChoicePicks,
      modifierPlayerPicks,
      classLevels: activeClassLevels,
      classes,
      subclasses,
      subclassByClassId,
      featureChoicePicks,
      customAbilities,
    }),
  ]
  const aggregatedCharacteristics = aggregateCharacteristics(builderCharacteristicMods)
  const modifierExpertisePickerProps = {
    proficientSkills: proficientSkillsInBuilder({
      backgroundSkills: selectedBackground?.skill_proficiencies,
      classSkillPicks,
      featureChoicePicks,
      speciesTraitPicks,
      modifierGrantedSkills: aggregatedCharacteristics.skills,
    }),
    proficientTools: [
      ...new Set([
        ...aggregatedCharacteristics.toolProficiencies,
        ...Object.values(classToolPicks).flat(),
        ...normalizeBackgroundProficiencies(
          selectedBackground?.proficiencies as BackgroundProficiencies | null,
          selectedBackground?.tool_proficiencies,
        ).tools,
      ]),
    ],
    existingExpertiseSkills: aggregatedCharacteristics.skillExpertise,
    choiceLayout: compactPickerLayout,
    skillPickerLayout,
    skillIconByName: customSkillIconByName,
  }
  const featGrantedSpellIds = aggregatedCharacteristics.spellsKnown.flatMap((entry) => entry.spellIds)
  const subclassGrantedSpellIds = collectSubclassAlwaysPreparedSpellIds(
    activeClassLevels.map((cl) => ({
      subclass: subclasses.find((sc) => sc.id === subclassByClassId[cl.classId]) ?? null,
      classLevel: cl.level,
    })),
    spells,
  )
  const grantedSpellIds = [...new Set([...featGrantedSpellIds, ...subclassGrantedSpellIds])]
  const allSpellIds = [...new Set([...mergedSpellIds, ...grantedSpellIds])]

  const characterDerived = useMemo(
    () =>
      computeDerivedCharacter({
        baseAbilityScores: {
          strength: character.strength,
          dexterity: character.dexterity,
          constitution: character.constitution,
          intelligence: character.intelligence,
          wisdom: character.wisdom,
          charisma: character.charisma,
        },
        asiAllocations: asiAllocationsByFeatId,
        background: selectedBackground ?? null,
        species: selectedSpecies ?? null,
        classLevels: activeClassLevels,
        classes,
        subclasses,
        subclassByClassId,
        primaryClassId: resolvedPrimaryClassId,
        classAddOrder: activeClassAddOrder,
        classSkillPicks,
        classToolPicks,
        featureChoicePicks,
        speciesTraitPicks,
        featChoicePicks,
        modifierPlayerPicks,
        selectedFeatIds,
        grantedFeatIds,
        featSelectionEntries,
        extraSkillProficiencies: character.skill_proficiencies ?? [],
        extraToolProficiencies: character.tool_proficiencies ?? [],
        extraWeaponProficiencies: character.weapon_proficiencies ?? [],
        extraArmorProficiencies: character.armor_proficiencies ?? [],
        languages: character.languages ?? ["Common"],
        equipment,
        equippedArmorId,
        equippedShieldId,
        equippedWeaponId,
        modifierCatalog,
        feats,
        customAbilities,
      }),
    [
      character.strength,
      character.dexterity,
      character.constitution,
      character.intelligence,
      character.wisdom,
      character.charisma,
      character.skill_proficiencies,
      character.tool_proficiencies,
      character.weapon_proficiencies,
      character.armor_proficiencies,
      character.languages,
      asiAllocationsByFeatId,
      selectedBackground,
      selectedSpecies,
      classLevels,
      classes,
      subclasses,
      subclassByClassId,
      resolvedPrimaryClassId,
      classAddOrder,
      classSkillPicks,
      classToolPicks,
      featureChoicePicks,
      speciesTraitPicks,
      featChoicePicks,
      modifierPlayerPicks,
      selectedFeatIds,
      grantedFeatIds,
      featSelectionEntries,
      equipment,
      equippedArmorId,
      equippedShieldId,
      equippedWeaponId,
      modifierCatalog,
      feats,
      customAbilities,
    ],
  )

  const effectiveAbilityScores = characterDerived.abilityScores
  const abilityMods = characterDerived.abilityMods

  const multiclassAbilityIssues = getMulticlassAbilityIssues({
    classLevels: activeClassLevels,
    classes,
    primaryClassId: resolvedPrimaryClassId,
    classAddOrder: activeClassAddOrder,
    abilityScores: effectiveAbilityScores,
  })
  const meetsMulticlassRequirements = multiclassAbilityRequirementsMet({
    classLevels: activeClassLevels,
    classes,
    primaryClassId: resolvedPrimaryClassId,
    classAddOrder: activeClassAddOrder,
    abilityScores: effectiveAbilityScores,
  })

  const effectiveSkillProficiencies = characterDerived.skillProficiencies
  const effectiveSkillExpertise = characterDerived.skillExpertise
  const effectiveToolProficiencies = characterDerived.toolProficiencies
  const partitionedToolProficiencies = useMemo(
    () => partitionToolProficiencies(effectiveToolProficiencies),
    [effectiveToolProficiencies],
  )
  const effectiveWeaponProficiencies = characterDerived.weaponProficiencies
  const effectiveArmorProficiencies = characterDerived.armorProficiencies
  const savingThrowProficiencies = characterDerived.savingThrowProficiencies
  const maxHp = characterDerived.maxHp
  const armorClass = characterDerived.armorClass
  const speed = characterDerived.speed
  const passivePerception = characterDerived.passivePerception
  const initiative = characterDerived.initiative
  
  // Darkvision from species traits + characteristic modifiers
  const speciesDarkvision = parseInt(
    selectedSpecies?.traits?.find((t) => t.name.toLowerCase().includes("darkvision"))
      ?.description?.match(/(\d+)/)?.[1] || "0",
    10,
  )
  const characteristicDarkvision = aggregatedCharacteristics.vision
    .filter((v) => v.type.toLowerCase().includes("darkvision"))
    .reduce((max, v) => Math.max(max, v.rangeFeet), 0)
  const darkvision = Math.max(speciesDarkvision, characteristicDarkvision).toString()

  const resistanceDisplay = [
    ...aggregatedCharacteristics.resistances,
    ...((selectedSpecies?.traits ?? [])
      .filter(
        (t) =>
          t.name.toLowerCase().includes("resistance") ||
          t.description?.toLowerCase().includes("resistance to"),
      )
      .map((t) => t.name)),
  ]
  const immunityDisplay = aggregatedCharacteristics.immunities

  const saveCharacter = async () => {
    if (!meetsMulticlassRequirements) {
      alert(
        "Multiclass ability requirements are not met. Each additional class requires 13+ in its primary ability and in your primary class's primary ability.",
      )
      return
    }

    setSaving(true)
    try {
      const db = createClient()
      const calculatedLevel =
        activeClassLevels.length > 0
          ? activeClassLevels.reduce((sum, cl) => sum + cl.level, 0)
          : character.level

      const buildInputs = {
        baseAbilityScores: {
          strength: character.strength,
          dexterity: character.dexterity,
          constitution: character.constitution,
          intelligence: character.intelligence,
          wisdom: character.wisdom,
          charisma: character.charisma,
        },
        asiAllocations: asiAllocationsByFeatId,
        background: backgrounds.find((b) => b.id === character.background_id) ?? null,
        species: species.find((s) => s.id === character.species_id) ?? null,
        classLevels: activeClassLevels,
        classes,
        subclasses,
        subclassByClassId,
        primaryClassId: resolvedPrimaryClassId,
        classAddOrder: activeClassAddOrder,
        classSkillPicks,
        classToolPicks,
        featureChoicePicks,
        speciesTraitPicks,
        featChoicePicks,
        modifierPlayerPicks,
        selectedFeatIds,
        grantedFeatIds,
        featSelectionEntries,
        extraSkillProficiencies: character.skill_proficiencies ?? [],
        extraToolProficiencies: character.tool_proficiencies ?? [],
        extraWeaponProficiencies: character.weapon_proficiencies ?? [],
        extraArmorProficiencies: character.armor_proficiencies ?? [],
        languages: character.languages ?? ["Common"],
        equipment,
        equippedArmorId,
        equippedShieldId,
        equippedWeaponId,
        modifierCatalog,
        feats,
        customAbilities,
      }
      const derived = computeDerivedCharacter(buildInputs)
      const snapshot = buildCharacterSaveSnapshot(buildInputs, derived)

      const validClassId = pickEnabledId(resolvedPrimaryClassId ?? character.class_id, classes)
      const validSpeciesId = pickEnabledId(character.species_id, species)
      const validBackgroundId = pickEnabledId(character.background_id, backgrounds)
      const staleRefs: string[] = []
      if (character.class_id && !validClassId) staleRefs.push("class")
      if (character.species_id && !validSpeciesId) staleRefs.push("species")
      if (character.background_id && !validBackgroundId) staleRefs.push("background")
      const staleSubclass = snapshot.character_classes.some(
        (row) => row.subclass_id && !pickEnabledId(row.subclass_id, subclasses),
      )
      if (staleSubclass) staleRefs.push("subclass")

      if (staleRefs.length > 0) {
        alert(
          `Your draft still points at old compendium IDs (${staleRefs.join(", ")}). ` +
            "That usually happens after reseeding the database. Re-select your class, subclass, species, and background, then save again.",
        )
        return
      }

      const validSubclassId =
        validClassId && subclassByClassId[validClassId]
          ? pickEnabledId(subclassByClassId[validClassId], subclasses)
          : null

      const characterData: Record<string, unknown> = {
        name: character.name.trim() || "Unnamed",
        level: calculatedLevel,
        class_id: validClassId,
        subclass_id: validSubclassId,
        species_id: validSpeciesId,
        background_id: validBackgroundId,
        size: validSpeciesId ? (character.size ?? selectedSpecies?.size ?? null) : null,
        strength: snapshot.strength,
        dexterity: snapshot.dexterity,
        constitution: snapshot.constitution,
        intelligence: snapshot.intelligence,
        wisdom: snapshot.wisdom,
        charisma: snapshot.charisma,
        alignment: character.alignment ?? null,
        personality_traits: character.personality_traits || null,
        ideals: character.ideals || null,
        bonds: character.bonds || null,
        flaws: character.flaws || null,
        backstory: character.backstory || null,
        appearance: character.appearance ?? null,
        portrait_url: normalizePortraitUrl(character.portrait_url),
        banner_url: normalizeBannerUrl(character.banner_url),
        skill_proficiencies: snapshot.skill_proficiencies,
        skill_expertise: snapshot.skill_expertise,
        tool_proficiencies: snapshot.tool_proficiencies,
        weapon_proficiencies: snapshot.weapon_proficiencies,
        armor_proficiencies: snapshot.armor_proficiencies,
        languages: snapshot.languages,
        equipment_ids: filterEnabledIds(character.equipment_ids, equipment),
        gold: inGoldShoppingMode
          ? goldRemaining
          : editingCharacterId
            ? Math.max(0, character.gold ?? 0)
            : computeStartingCharacterGold({
                inGoldShoppingMode,
                goldRemaining,
                classOption: selectedStartingOption,
                backgroundOption: selectedBackgroundStartingOption,
              }),
        spell_ids: filterEnabledIds(allSpellIds, spells),
        feat_ids: filterEnabledIds(ownedFeatIds, feats),
        feat_choice_picks: featChoicePicks,
        feature_choice_picks: featureChoicePicks,
        modifier_player_picks: modifierPlayerPicks,
        builder_picks: buildBuilderPicksFromSnapshot({
          classSkillPicks,
          classToolPicks,
          spellPicksByClassId,
          speciesTraitPicks,
          startingEquipmentOptionIndex,
          backgroundStartingEquipmentOptionIndex,
          goldPurchasedEquipmentIds,
        }),
        asi_allocations: asiAllocationsByFeatId,
        character_classes: snapshot.character_classes.map((row) => ({
          ...row,
          subclass_id: row.subclass_id
            ? pickEnabledId(row.subclass_id, subclasses)
            : null,
        })),
        class_add_order: snapshot.class_add_order,
        hit_point_max: snapshot.hit_point_max,
        hit_points: currentHp ?? snapshot.hit_point_max,
        armor_class: snapshot.armor_class,
        equipped_armor_id: equippedArmorId,
        equipped_shield_id: equippedShieldId,
        equipped_weapon_id: equippedWeaponId,
        speed: snapshot.speed,
        initiative: snapshot.initiative,
        proficiency_bonus: snapshot.proficiency_bonus,
      }

      if (!editingCharacterId) {
        characterData.local_id = `local_${Date.now()}`
      }

      const { data, error } = editingCharacterId
        ? await db.from("characters").update(characterData).eq("id", editingCharacterId).select().single()
        : await db.from("characters").insert([characterData]).select().single()

      const savedRow = asCompendiumRow<{ id: string }>(data)
      if (error?.message || !savedRow?.id) {
        const message =
          error?.message ??
          (editingCharacterId
            ? "Character record not found. If you cleared the database, open the builder fresh and create a new character."
            : "Save completed without a character id. Refresh the page and try again.")
        console.error("Error saving character:", message, { error, data })
        alert(message)
        return
      }

      clearBuilderDraft()
      router.push(characterSheetHref(savedRow.id))
    } catch (err) {
      console.error("Error saving character:", err)
      alert(err instanceof Error ? err.message : "Failed to save character. Please try again.")
    } finally {
      setSaving(false)
    }
  }
  
  // All skills with calculated modifiers
  const SKILLS_DATA: { name: string; ability: keyof typeof abilityMods }[] = [
    { name: "Acrobatics", ability: "dexterity" },
    { name: "Animal Handling", ability: "wisdom" },
    { name: "Arcana", ability: "intelligence" },
    { name: "Athletics", ability: "strength" },
    { name: "Deception", ability: "charisma" },
    { name: "History", ability: "intelligence" },
    { name: "Insight", ability: "wisdom" },
    { name: "Intimidation", ability: "charisma" },
    { name: "Investigation", ability: "intelligence" },
    { name: "Medicine", ability: "wisdom" },
    { name: "Nature", ability: "intelligence" },
    { name: "Perception", ability: "wisdom" },
    { name: "Performance", ability: "charisma" },
    { name: "Persuasion", ability: "charisma" },
    { name: "Religion", ability: "intelligence" },
    { name: "Sleight of Hand", ability: "dexterity" },
    { name: "Stealth", ability: "dexterity" },
    { name: "Survival", ability: "wisdom" },
  ]
  
  const classStepFeatModifierSlots = useMemo(
    () =>
      nonSpellModifierPlayerChoiceSlots(
        modifierPlayerChoiceSlots.filter((slot) =>
          featPickSlots.some(
            (featSlot) => featChoicePickKey(featSlot.key) === slot.sourceKey,
          ),
        ),
      ),
    [modifierPlayerChoiceSlots, featPickSlots],
  )

  const classStepClassFeatureModifierSlots = useMemo(
    () =>
      nonSpellModifierPlayerChoiceSlots(
        modifierPlayerChoiceSlots.filter(
          (slot) =>
            activeClassLevels.some((entry) =>
              slot.sourceKey.startsWith(`${entry.classId}:`),
            ) &&
            !featPickSlots.some(
              (featSlot) => featChoicePickKey(featSlot.key) === slot.sourceKey,
            ),
        ),
      ),
    [modifierPlayerChoiceSlots, activeClassLevels, featPickSlots],
  )

  const classStepAllModifierSlots = useMemo(
    () => [...classStepFeatModifierSlots, ...classStepClassFeatureModifierSlots],
    [classStepFeatModifierSlots, classStepClassFeatureModifierSlots],
  )

  const originStepModifierSlots = useMemo(
    () =>
      nonSpellModifierPlayerChoiceSlots(
        modifierPlayerChoiceSlots.filter(
          (slot) =>
            speciesFeatPickSlots.some(
              (featSlot) => featChoicePickKey(featSlot.key) === slot.sourceKey,
            ) ||
            backgroundFeatPickSlots.some(
              (featSlot) => featChoicePickKey(featSlot.key) === slot.sourceKey,
            ) ||
            (character.species_id != null &&
              slot.sourceKey.startsWith(`species:${character.species_id}:`)) ||
            slot.sourceKey ===
              (backgroundGrantedFeat?.id
                ? grantedFeatChoicePickKey(backgroundGrantedFeat.id)
                : ""),
        ),
      ),
    [
      modifierPlayerChoiceSlots,
      speciesFeatPickSlots,
      backgroundFeatPickSlots,
      character.species_id,
      backgroundGrantedFeat?.id,
    ],
  )

  const spellGrantModifierSlots = useMemo(
    () => spellModifierPlayerChoiceSlots(modifierPlayerChoiceSlots),
    [modifierPlayerChoiceSlots],
  )

  const spellGrantSourceKeys = useMemo(
    () => [...new Set(spellGrantModifierSlots.map((slot) => slot.sourceKey))],
    [spellGrantModifierSlots],
  )

  const classStepFeatSelectionEntries = useMemo(
    () =>
      featSelectionEntries.filter((entry) =>
        featPickSlots.some((slot) => featChoicePickKey(slot.key) === entry.choicePickKey),
      ),
    [featSelectionEntries, featPickSlots],
  )

  const originStepFeatSelectionEntries = useMemo(
    () =>
      featSelectionEntries.filter(
        (entry) =>
          speciesFeatPickSlots.some(
            (slot) => featChoicePickKey(slot.key) === entry.choicePickKey,
          ) ||
          backgroundFeatPickSlots.some(
            (slot) => featChoicePickKey(slot.key) === entry.choicePickKey,
          ) ||
          entry.choicePickKey ===
            (backgroundGrantedFeat?.id
              ? grantedFeatChoicePickKey(backgroundGrantedFeat.id)
              : ""),
      ),
    [
      featSelectionEntries,
      speciesFeatPickSlots,
      backgroundFeatPickSlots,
      backgroundGrantedFeat?.id,
    ],
  )

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return (
          validateClassStepChoices(
            activeClassLevels,
            classes,
            subclasses,
            classSkillPicks,
            subclassByClassId,
            featureChoicePicks,
            resolvedPrimaryClassId,
            activeClassAddOrder,
            classToolPicks,
          ) &&
          selectedFeatCount === requiredFeatSlots &&
          validateFeatModifierChoices(
            feats,
            classStepFeatSelectionEntries,
            featChoicePicks,
          ) &&
          validateModifierPlayerChoices(classStepAllModifierSlots, modifierPlayerPicks)
        )
      case 2:
        return (
          validateOriginStepChoices(
            character.species_id,
            character.background_id,
            selectedSpecies,
            speciesTraitPicks,
            speciesFeatPickSlots.map((slot) => slot.key),
            featureChoicePicks,
            backgroundFeatPickSlots.map((slot) => slot.key),
            selectedBackground,
          ) &&
          validateFeatModifierChoices(
            feats,
            originStepFeatSelectionEntries,
            featChoicePicks,
          ) &&
          validateModifierPlayerChoices(originStepModifierSlots, modifierPlayerPicks)
        )
      case 3:
        return (
          (showLegacyMilestoneAsi
            ? allSelectedAsiAllocationsValid(selectedFeatIds, asiAllocationsByFeatId, feats)
            : true) &&
          allAbilityScorePoolAllocationsValid(abilityScorePoolGrants, asiAllocationsByFeatId) &&
          (!backgroundAbilityGrant.needsChoice ||
            isValidBackgroundAsiAllocation(
              asiAllocationsByFeatId[BACKGROUND_ASI_KEY] ?? {},
              backgroundAbilityGrant.eligible,
            )) &&
          (abilityMethod !== "standard" || isStandardArrayComplete(standardArrayAssignments))
        )
      case BUILDER_STEP_IDS.GEAR: return true
      case BUILDER_STEP_IDS.SPELLS:
        return validateModifierPlayerChoices(spellGrantModifierSlots, modifierPlayerPicks)
      case BUILDER_STEP_IDS.DETAILS: return character.name.trim().length > 0
      default: return false
    }
  }

  const proceedBlockers = useMemo(() => {
    const blockers: string[] = []
    switch (currentStep) {
      case 1:
        blockers.push(
          ...collectClassStepBlockers(
            activeClassLevels,
            classes,
            subclasses,
            classSkillPicks,
            subclassByClassId,
            featureChoicePicks,
            resolvedPrimaryClassId,
            activeClassAddOrder,
            classToolPicks,
          ),
        )
        if (selectedFeatCount < requiredFeatSlots) {
          blockers.push(
            `Choose ${requiredFeatSlots - selectedFeatCount} more class feat${
              requiredFeatSlots - selectedFeatCount === 1 ? "" : "s"
            } (${selectedFeatCount}/${requiredFeatSlots}).`,
          )
        }
        blockers.push(
          ...collectFeatModifierChoiceBlockers(
            feats,
            classStepFeatSelectionEntries,
            featChoicePicks,
          ),
        )
        blockers.push(
          ...collectModifierPlayerChoiceBlockers(
            classStepAllModifierSlots,
            modifierPlayerPicks,
          ),
        )
        break
      case 2:
        blockers.push(
          ...collectOriginStepBlockers(
            character.species_id,
            character.background_id,
            selectedSpecies,
            speciesTraitPicks,
            speciesFeatPickSlots.map((slot) => slot.key),
            featureChoicePicks,
            backgroundFeatPickSlots.map((slot) => slot.key),
            selectedBackground,
          ),
        )
        blockers.push(
          ...collectFeatModifierChoiceBlockers(
            feats,
            originStepFeatSelectionEntries,
            featChoicePicks,
          ),
        )
        blockers.push(
          ...collectModifierPlayerChoiceBlockers(originStepModifierSlots, modifierPlayerPicks),
        )
        break
      case 3:
        if (
          showLegacyMilestoneAsi &&
          !allSelectedAsiAllocationsValid(selectedFeatIds, asiAllocationsByFeatId, feats)
        ) {
          blockers.push("Finish allocating Ability Score Improvement points from feats.")
        }
        if (!allAbilityScorePoolAllocationsValid(abilityScorePoolGrants, asiAllocationsByFeatId)) {
          blockers.push("Finish allocating ability score bonuses from species, background, or feats.")
        }
        if (
          backgroundAbilityGrant.needsChoice &&
          !isValidBackgroundAsiAllocation(
            asiAllocationsByFeatId[BACKGROUND_ASI_KEY] ?? {},
            backgroundAbilityGrant.eligible,
          )
        ) {
          blockers.push("Complete background ability score increases.")
        }
        if (abilityMethod === "standard" && !isStandardArrayComplete(standardArrayAssignments)) {
          blockers.push("Assign every standard array score to an ability.")
        }
        break
      case BUILDER_STEP_IDS.SPELLS:
        blockers.push(
          ...collectModifierPlayerChoiceBlockers(spellGrantModifierSlots, modifierPlayerPicks),
        )
        break
      case BUILDER_STEP_IDS.DETAILS:
        if (character.name.trim().length === 0) {
          blockers.push("Enter a character name.")
        }
        break
      default:
        break
    }
    return blockers
  }, [
    currentStep,
    activeClassLevels,
    classes,
    subclasses,
    classSkillPicks,
    subclassByClassId,
    featureChoicePicks,
    resolvedPrimaryClassId,
    activeClassAddOrder,
    classToolPicks,
    selectedFeatCount,
    requiredFeatSlots,
    feats,
    classStepFeatSelectionEntries,
    featChoicePicks,
    classStepFeatModifierSlots,
    classStepClassFeatureModifierSlots,
    classStepAllModifierSlots,
    modifierPlayerPicks,
    character.species_id,
    character.background_id,
    character.name,
    selectedSpecies,
    speciesTraitPicks,
    speciesFeatPickSlots,
    backgroundFeatPickSlots,
    originStepFeatSelectionEntries,
    originStepModifierSlots,
    showLegacyMilestoneAsi,
    selectedFeatIds,
    asiAllocationsByFeatId,
    abilityScorePoolGrants,
    backgroundAbilityGrant,
    abilityMethod,
    standardArrayAssignments,
    spellGrantModifierSlots,
  ])

  const canSaveCharacter = () =>
    character.name.trim().length > 0 &&
    activeClassLevels.length > 0 &&
    meetsMulticlassRequirements

  const hasSpellStep = spellcastingClasses.length > 0
  const visibleSteps = BUILDER_STEPS.filter(
    (step) => step.id !== BUILDER_STEP_IDS.SPELLS || hasSpellStep,
  )

  const nextVisibleStepId = (stepId: number) =>
    visibleSteps.find((step) => step.id > stepId)?.id ?? null
  const prevVisibleStepId = (stepId: number) =>
    [...visibleSteps].reverse().find((step) => step.id < stepId)?.id ?? null

  const goToStep = (stepId: number) => {
    if (stepId >= 1 && stepId <= maxStepReached) {
      setCurrentStep(stepId)
    }
  }

  const goBackStep = () => {
    const prev = prevVisibleStepId(currentStep)
    if (prev != null) goToStep(prev)
  }

  const advanceStep = () => {
    if (!canProceed()) return
    const next = nextVisibleStepId(currentStep)
    if (next == null) return
    setCurrentStep(next)
    setMaxStepReached((prev) => Math.max(prev, next))
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" })
    })
  }

  // If the character stops being a spellcaster while parked on the Spells step,
  // bounce back to Gear so the user never lands on a hidden step.
  useEffect(() => {
    if (currentStep === BUILDER_STEP_IDS.SPELLS && !hasSpellStep) {
      setCurrentStep(BUILDER_STEP_IDS.GEAR)
    }
  }, [currentStep, hasSpellStep])

  const getAbilityModifier = (score: number) => {
    const mod = Math.floor((score - 10) / 2)
    return mod >= 0 ? `+${mod}` : `${mod}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MainNav />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-8" />
            <div className="h-64 bg-muted rounded-2xl" />
          </div>
        </main>
      <SiteFooter />
      </div>
    )
  }

  return (
    <div id="builder-root" className="min-h-screen bg-background flex flex-col">
      <MainNav />
      
      <div id="builder-steps" className={pageStepStripClass}>
        <div className="max-w-7xl mx-auto px-4 pt-3 pb-1">
          <div className="flex items-center justify-center">
            {visibleSteps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isReachable = step.id <= maxStepReached
              const isComplete = step.id < currentStep || (step.id < maxStepReached && !isActive)
              
              return (
                <div key={step.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => goToStep(step.id)}
                    disabled={!isReachable}
                    className={`flex flex-col items-center flex-shrink-0 transition-opacity ${
                      isReachable ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                    }`}
                    title={isReachable ? `Go to ${step.label}` : "Complete earlier steps first"}
                  >
                    <div
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all ${
                        isComplete
                          ? "bg-success text-success-foreground"
                          : isActive
                          ? "bg-primary text-primary-foreground scale-110"
                          : isReachable
                          ? "bg-muted text-foreground hover:bg-muted/80"
                          : "bg-muted/60 text-muted-foreground"
                      }`}
                    >
                      {isComplete ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-[10px] md:text-xs mt-0.5 font-medium ${
                      isActive ? "text-primary" : isReachable ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {step.label}
                    </span>
                  </button>
                  {index < visibleSteps.length - 1 && (
                    <div className={`w-1.5 h-1.5 sm:w-10 sm:h-1 md:w-14 rounded-full sm:rounded mx-0.5 sm:mx-1 md:mx-2 shrink-0 ${
                      step.id < maxStepReached ? "bg-success/80" : "bg-border/80"
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
          </div>
      </div>
      
      <main id="builder-main" className="max-w-7xl mx-auto px-4 py-8 min-h-[calc(100vh-4rem)] flex-1 w-full">

        {/* Mobile: sticky toggle between step choices and character preview */}
        <div className="lg:hidden sticky top-16 z-40 -mx-4 px-4 py-2 mb-4 flex gap-2 bg-background/95 backdrop-blur-md border-b border-border/60">
          <button
            type="button"
            onClick={() => setMobilePanel("steps")}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              mobilePanel === "steps"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Build
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel("preview")}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              mobilePanel === "preview"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Preview
          </button>
        </div>

        {/* Two-Column Layout */}
        <div id="builder-content" className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[720px]">
          {/* Left Column: Step Content (choices) */}
          <div
            id="builder-step-panel"
            className={`lg:col-span-3 bg-card/80 backdrop-blur-md rounded-2xl border-2 border-border p-6 min-h-[720px] ${
              mobilePanel === "preview" ? "hidden lg:block" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={resetCharacter}
                  className="px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-destructive border border-border hover:border-destructive rounded-lg transition-colors"
                >
                  Clear All
                </button>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    type="button"
                    title="Visual cards"
                    aria-pressed={cardViewMode === "cinematic"}
                    onClick={() => setCardViewMode("cinematic")}
                    className={`flex items-center gap-1 px-2.5 py-2 text-xs font-semibold transition-colors ${
                      cardViewMode === "cinematic"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Visual</span>
                  </button>
                  <button
                    type="button"
                    title="Compact list cards"
                    aria-pressed={cardViewMode === "dense"}
                    onClick={() => setCardViewMode("dense")}
                    className={`flex items-center gap-1 px-2.5 py-2 text-xs font-semibold transition-colors border-l border-border ${
                      cardViewMode === "dense"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Compact</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <BuilderStepNav
                  currentStep={currentStep}
                  canProceed={canProceed()}
                  proceedBlockers={proceedBlockers}
                  canSave={canSaveCharacter()}
                  saving={saving}
                  onBack={goBackStep}
                  onContinue={advanceStep}
                  onSave={saveCharacter}
                  saveLabel={editingCharacterId ? "Save Character" : "Create Character"}
                  lastStep={BUILDER_STEP_IDS.DETAILS}
                />
              </div>
            </div>

            {editingCharacterId && (
              <p className={`${pageFloatingHintClass} mb-4 -mt-2`}>
                Editing an existing character. Changes are saved when you click Save Character on the Details step.
              </p>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
            {/* Step 1: Class Selection */}
            {currentStep === 1 && (
              <div>
                <h2 className="text-2xl font-black text-foreground mb-2">Choose Class & Level</h2>
                <p className={`${pageFloatingHintClass} mb-4`}>Your class determines your combat abilities and special features.</p>
                
                {/* Current Class Levels */}
                {activeClassLevels.length > 0 && (
                  <div className="mb-4 p-3 bg-muted rounded-xl">
                    <p className="text-xs text-muted-foreground mb-2 uppercase font-bold">Current Classes (Total Level: {totalLevel})</p>
                    <div className="space-y-2">
                      {activeClassLevels.map((cl, idx) => {
                        const cls = classes.find(c => c.id === cl.classId)
                        const isPrimary = cl.classId === resolvedPrimaryClassId
                        return (
                          <div
                            key={cl.classId}
                            className={`flex items-center gap-2 rounded-lg p-2 ${
                              isPrimary
                                ? "bg-primary/10 border border-primary/40"
                                : "bg-card border border-border"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-sm text-foreground">{cls?.name}</span>
                              {isPrimary && (
                                <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-primary">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const newLevels = [...activeClassLevels]
                                  if (newLevels[idx].level > 1) {
                                    newLevels[idx].level--
                                    if (newLevels[idx].level < SUBCLASS_LEVEL) {
                                      setSubclassByClassId((prev) => {
                                        const next = { ...prev }
                                        delete next[newLevels[idx].classId]
                                        return next
                                      })
                                    }
                                    setClassLevels(newLevels)
                                  } else {
                                    removeClassFromBuild(cl.classId, activeClassLevels.filter((_, i) => i !== idx))
                                  }
                                }}
                                className="p-1 bg-muted hover:bg-destructive/20 rounded"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <ClassLevelInput
                                value={cl.level}
                                min={1}
                                max={20 - (totalLevel - cl.level)}
                                aria-label={`${cls?.name ?? "Class"} level`}
                                onCommit={(level) => {
                                  const newLevels = [...activeClassLevels]
                                  newLevels[idx] = { ...newLevels[idx], level }
                                  if (level < SUBCLASS_LEVEL) {
                                    setSubclassByClassId((prev) => {
                                      const next = { ...prev }
                                      delete next[newLevels[idx].classId]
                                      return next
                                    })
                                  }
                                  setClassLevels(newLevels)
                                }}
                                className="w-8 text-center font-bold text-sm bg-background border border-border rounded px-0.5 py-0.5 focus:outline-none focus:border-primary"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (totalLevel < 20) {
                                    const newLevels = [...activeClassLevels]
                                    newLevels[idx].level++
                                    setClassLevels(newLevels)
                                  }
                                }}
                                disabled={totalLevel >= 20}
                                className="p-1 bg-muted hover:bg-primary/20 rounded disabled:opacity-30"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                removeClassFromBuild(cl.classId, activeClassLevels.filter((_, i) => i !== idx))
                              }}
                              className="p-1 text-muted-foreground hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search classes..."
                    value={classSearch}
                    onChange={(e) => setClassSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                
                {cardViewMode !== "cinematic" ? (
                  <p className={`${pageFloatingHintClass} text-xs mb-2`}>
                    Click a class to add it, or increase its level if already selected.
                  </p>
                ) : null}

                {(() => {
                  const filteredClasses = classes.filter((cls) =>
                    cls.name.toLowerCase().includes(classSearch.toLowerCase()),
                  )
                  const {
                    items: visibleClasses,
                    pageCount: classPageCount,
                    safePage: safeClassPage,
                  } = paginateList(filteredClasses, classPickerPage, pickerPageSize)
                  const classesToShow = useSwipeVisualPicker ? filteredClasses : visibleClasses

                      return (
                    <>
                      <PickerGridPagination
                        page={safeClassPage}
                        pageCount={classPageCount}
                        onPrevious={() => setClassPickerPage((p) => Math.max(0, p - 1))}
                        onNext={() =>
                          setClassPickerPage((p) => Math.min(classPageCount - 1, p + 1))
                        }
                        previousLabel="Previous classes"
                        nextLabel="Next classes"
                        className={cn("mb-2 mt-0", cinematicPickerPaginationClass)}
                      />
                      <SwipeVisualPicker enabled={useSwipeVisualPicker} className={pickerGridClass}>
                        {classesToShow.map((cls) => {
                          const existingLevel = activeClassLevels.find((cl) => cl.classId === cls.id)
                          const isSelected = !!existingLevel
                          const isPrimary = cls.id === resolvedPrimaryClassId
                          const accent = getCompendiumItemAccentColor(cls as unknown as Record<string, unknown>)
                          const selectClass = () => {
                            if (existingLevel) {
                              if (totalLevel < 20) {
                                setClassLevels(
                                  activeClassLevels.map((cl) =>
                                    cl.classId === cls.id ? { ...cl, level: cl.level + 1 } : cl,
                                  ),
                                )
                              }
                            } else if (totalLevel < 20) {
                              addClassToBuild(cls.id)
                            }
                          }
                          const levelBadge = existingLevel ? (
                            <span className="rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                              Lv {existingLevel.level}
                            </span>
                          ) : undefined

                          if (cardViewMode === "dense") {
                            return (
                              <CompendiumDenseSelectionCard
                                key={cls.id}
                                name={cls.name}
                                subtitle={cls.source || "Custom"}
                                icon={cls.icon}
                                accentColor={accent}
                                selected={isSelected}
                                selectionVariant={isSelected && !isPrimary ? "secondary" : "primary"}
                                disabled={totalLevel >= 20 && !existingLevel}
                                badge={levelBadge}
                                onSelect={selectClass}
                              />
                            )
                          }

                          return (
                            <CompendiumSelectionCard
                              key={cls.id}
                              item={cls}
                              subtitle={cls.source || "Custom"}
                              accentColor={accent}
                              selected={isSelected}
                              selectionVariant={isSelected && !isPrimary ? "secondary" : "primary"}
                              disabled={totalLevel >= 20 && !existingLevel}
                              badge={levelBadge}
                              size="md"
                              cardShape={useCinematicPortraitCards ? "portrait" : "wide"}
                              imageCrop="top"
                              onSelect={selectClass}
                              onLearnMore={() => setDetailsModal({ type: "class", item: cls })}
                            />
                          )
                        })}
                      </SwipeVisualPicker>
                      <PickerGridPagination
                        page={safeClassPage}
                        pageCount={classPageCount}
                        onPrevious={() => setClassPickerPage((p) => Math.max(0, p - 1))}
                        onNext={() =>
                          setClassPickerPage((p) => Math.min(classPageCount - 1, p + 1))
                        }
                        previousLabel="Previous classes"
                        nextLabel="Next classes"
                        className={cinematicPickerPaginationClass}
                      />
                    </>
                  )
                })()}

                {multiclassAbilityIssues.length > 0 && (
                  <div className="mt-4 rounded-xl border border-warning/50 bg-warning/10 p-4">
                    <p className="text-sm font-bold text-warning mb-2">Multiclass ability requirements</p>
                    <ul className="space-y-1 text-xs text-foreground">
                      {multiclassAbilityIssues.map((issue) => (
                        <li key={`${issue.classId}-${issue.role}`}>
                          {formatMulticlassAbilityIssue(issue)}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                      Per SRD p. 25, each class needs 13+ in at least one primary ability. You can
                      continue building, but you must meet these requirements before saving.
                    </p>
                  </div>
                )}

                {activeClassLevels.length > 0 && (
                  <div className="mt-6 space-y-2 border-t border-border pt-6">
                    <h3 className="text-lg font-bold text-foreground">Class Options</h3>
                    <p className={`${pageFloatingHintClass} text-xs mb-2`}>
                      Complete choices for your selected class(es) before continuing.
                    </p>
                    {activeClassLevels.map((entry) => {
                      const cls = classes.find((c) => c.id === entry.classId)
                      if (!cls) return null
                      const isPrimary = entry.classId === resolvedPrimaryClassId
                      const classSubclasses = getSubclassesForClass(subclasses, entry.classId)
                      const eligibleFeatures = (cls.features ?? []).filter(
                        (feature) =>
                          feature.level <= entry.level &&
                          feature.isChoice &&
                          feature.choices &&
                          ((feature.choices.options?.length ?? 0) > 0 ||
                            feature.choices.optionsSource),
                      )

                      return (
                        <div key={entry.classId} className="space-y-1">
                          <p
                            className={`text-sm font-semibold ${
                              isPrimary ? "text-primary" : "text-secondary"
                            }`}
                          >
                            {cls.name} (Level {entry.level})
                            {isPrimary ? " · Primary" : " · Additional (multiclass proficiencies only)"}
                          </p>
                          {!isPrimary && (
                            <p className="text-xs text-muted-foreground mb-2">
                              {multiclassProficiencySummary(cls)}
                            </p>
                          )}

                          {entry.level >= 1 && (() => {
                            const skillReq = getClassSkillPickRequirement(cls, isPrimary)
                            if (!skillReq) return null
                            return (
                            <MultiSelectChoices
                              title={skillReq.label}
                              hint={`Choose ${skillReq.count}${skillReq.isMulticlass ? " (SRD multiclass grant)" : ""} from the list below.`}
                              options={skillReq.options.map((name) => ({ name }))}
                              maxCount={skillReq.count}
                              selected={classSkillPicks[entry.classId] ?? []}
                              unavailableOptions={[
                                ...getTakenSkills(skillPickSources, `class:${entry.classId}`),
                              ]}
                              showSkillInfo
                              layout={skillPickerLayout}
                              skillIconByName={customSkillIconByName}
                              onChange={(selected) =>
                                setClassSkillPicks((prev) => ({
                                  ...prev,
                                  [entry.classId]: selected,
                                }))
                              }
                            />
                            )
                          })()}

                          {entry.level >= 1 && (() => {
                            const toolReq = getMulticlassToolPickRequirement(cls, isPrimary)
                            if (!toolReq) return null
                            return (
                              <MultiSelectChoices
                                title={toolReq.label}
                                hint={`Choose ${toolReq.count} from the list below.`}
                                options={toolReq.options.map((name) => ({ name }))}
                                maxCount={toolReq.count}
                                selected={classToolPicks[entry.classId] ?? []}
                                onChange={(selected) =>
                                  setClassToolPicks((prev) => ({
                                    ...prev,
                                    [entry.classId]: selected,
                                  }))
                                }
                                accentClass="border-secondary bg-secondary/10"
                                layout={compactPickerLayout}
                              />
                            )
                          })()}

                          {classNeedsSubclass(entry.level, classSubclasses.length) && (
                            <div className="mt-4 p-4 bg-muted/40 rounded-xl border border-border">
                              <h4 className="font-bold text-sm text-foreground mb-2">
                                Subclass (Level {SUBCLASS_LEVEL}+)
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {classSubclasses.map((subclass) => {
                                  const isSelected = subclassByClassId[entry.classId] === subclass.id
                                  return (
                                    <button
                                      key={subclass.id}
                                      type="button"
                                      onClick={() =>
                                        setSubclassByClassId((prev) => {
                                          const next = { ...prev, [entry.classId]: subclass.id }
                                          if (entry.classId === resolvedPrimaryClassId) {
                                            setCharacter((characterPrev) => ({
                                              ...characterPrev,
                                              subclass_id: subclass.id,
                                            }))
                                          }
                                          return next
                                        })
                                      }
                                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10"
                                          : "border-border bg-card hover:border-primary/40"
                                      }`}
                                    >
                                      <p className="font-semibold text-sm text-foreground">{subclass.name}</p>
                                      {cardViewMode === "cinematic" && subclass.description && (
                                        <ClampedRichText
                                          html={subclass.description}
                                          lines={2}
                                          className="text-xs mt-1"
                                        />
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {eligibleFeatures.map((feature) => {
                            const key = featureChoiceKey(entry.classId, feature.name, feature.level)
                            const choiceOptions = resolveFeatureChoiceOptions(feature, {
                              customAbilities,
                              featureChoicePicks,
                              classNames: [cls.name],
                              classLevel: entry.level,
                              equipmentCatalog: equipment,
                            })
                            const choiceCount = resolveFeatureChoiceCount(
                              feature.choices!,
                              entry.level,
                              cls.name,
                            )
                            const isWeaponMastery = isWeaponMasteryFeature(feature)
                            const isKnackPool = feature.choices?.optionsSource === "class_knacks"
                            const isUpgradePool = feature.choices?.optionsSource === "class_upgrades"
                            const masteryHint = isWeaponMastery
                              ? `Choose ${choiceCount} weapon type${choiceCount === 1 ? "" : "s"}${feature.choices?.swappableOnRest ? " (swap one on a Long Rest)" : ""}.`
                              : isKnackPool
                                ? `Choose ${choiceCount} Knack${choiceCount === 1 ? "" : "s"}${feature.choices?.swappableOnRest ? " (replace one when you level up)" : ""}.`
                                : isUpgradePool
                                  ? `Choose ${choiceCount} Upgrade${choiceCount === 1 ? "" : "s"}${feature.choices?.swappableOnRest ? " (exchange on level-up per feature rules)" : ""}.`
                              : feature.choices!.optionsSource === "known_discipline_talents"
                                ? `Choose ${choiceCount} psionic talent${choiceCount === 1 ? "" : "s"} from your known disciplines.`
                                : feature.choices!.category
                            const handleFeatureChoiceChange = (selected: string[]) => {
                              if (isKnackPool) {
                                const previous = featureChoicePicks[key] ?? []
                                const validation = validateKnackSelectionChange({
                                  previous,
                                  next: selected,
                                  customAbilities,
                                  classLevel: entry.level,
                                })
                                if (!validation.ok) {
                                  window.alert(validation.message)
                                  return
                                }
                              }
                              if (isUpgradePool) {
                                const validation = validateUpgradeSelectionChange({
                                  next: selected,
                                  customAbilities,
                                  classLevel: entry.level,
                                })
                                if (!validation.ok) {
                                  window.alert(validation.message)
                                  return
                                }
                              }
                              setFeatureChoicePicks((prev) => ({ ...prev, [key]: selected }))
                              setModifierPlayerPicks((prev) =>
                                clearModifierPicksForSource(prev, key),
                              )
                            }
                            return (
                              <div key={key} className="space-y-2">
                                {isWeaponMastery ? (
                                  <WeaponMasteryChoices
                                    title={feature.name}
                                    hint={masteryHint}
                                    options={choiceOptions}
                                    maxCount={choiceCount}
                                    selected={featureChoicePicks[key] ?? []}
                                    unavailableOptions={[
                                      ...getTakenSkills(skillPickSources, `feature:${key}`),
                                    ]}
                                    onChange={handleFeatureChoiceChange}
                                    layout={cardViewMode === "cinematic" ? "visual" : "compact"}
                                    masteryDescriptions={weaponMasteryDescriptions}
                                  />
                                ) : (
                                  <MultiSelectChoices
                                    title={feature.name}
                                    hint={masteryHint}
                                    options={choiceOptions}
                                    maxCount={choiceCount}
                                    selected={featureChoicePicks[key] ?? []}
                                    unavailableOptions={[...getTakenSkills(skillPickSources, `feature:${key}`)]}
                                    showSkillInfo={
                                      feature.choices!.category.toLowerCase().includes("skill")
                                    }
                                    layout={
                                      feature.choices!.category.toLowerCase().includes("skill")
                                        ? skillPickerLayout
                                        : compactPickerLayout
                                    }
                                    skillIconByName={
                                      feature.choices!.category.toLowerCase().includes("skill")
                                        ? customSkillIconByName
                                        : undefined
                                    }
                                    onChange={handleFeatureChoiceChange}
                                    accentClass="border-accent bg-accent/10"
                                  />
                                )}
                                <ModifierPlayerChoicePanel
                                  sourceKey={key}
                                  sourceLabel={`${cls.name}: ${feature.name}`}
                                  slots={modifierPlayerChoiceSlots}
                                  picks={modifierPlayerPicks}
                                  spells={spells}
                                  excludeKinds={["spell"]}
                                  unavailableOptions={[...getTakenSkills(skillPickSources)]}
                                  {...modifierExpertisePickerProps}
                                  onChange={(slotKey, selected) => {
                                    const slot = modifierPlayerChoiceSlots.find(
                                      (entry) => entry.slotKey === slotKey,
                                    )
                                    if (!slot) return
                                    setModifierPlayerPicks((prev) =>
                                      setModifierPlayerPickValue(
                                        prev,
                                        slot,
                                        modifierPlayerChoiceSlots,
                                        selected,
                                      ),
                                    )
                                  }}
                                />
                              </div>
                            )
                          })}

                          {/* Passive class features (Expertise, bonus proficiencies, tool/instrument
                              choices, etc.) that carry player-choice modifiers but aren't isChoice
                              features. The panel renders nothing when a feature has no open slots. */}
                          {(() => {
                            const eligibleKeys = new Set(
                              eligibleFeatures.map((f) =>
                                featureChoiceKey(entry.classId, f.name, f.level),
                              ),
                            )
                            const seen = new Set<string>()
                            return (cls.features ?? [])
                              .filter(
                                (feature) =>
                                  feature.level <= entry.level &&
                                  !eligibleKeys.has(
                                    featureChoiceKey(entry.classId, feature.name, feature.level),
                                  ),
                              )
                              .map((feature) => {
                                const key = featureChoiceKey(
                                  entry.classId,
                                  feature.name,
                                  feature.level,
                                )
                                if (seen.has(key)) return null
                                seen.add(key)
                                return (
                                  <ModifierPlayerChoicePanel
                                    key={key}
                                    sourceKey={key}
                                    sourceLabel={`${cls.name}: ${feature.name}`}
                                    slots={modifierPlayerChoiceSlots}
                                    picks={modifierPlayerPicks}
                                    spells={spells}
                                    excludeKinds={["spell"]}
                                    unavailableOptions={[...getTakenSkills(skillPickSources)]}
                                    {...modifierExpertisePickerProps}
                                    onChange={(slotKey, selected) => {
                                      const slot = modifierPlayerChoiceSlots.find(
                                        (s) => s.slotKey === slotKey,
                                      )
                                      if (!slot) return
                                      setModifierPlayerPicks((prev) =>
                                        setModifierPlayerPickValue(
                                          prev,
                                          slot,
                                          modifierPlayerChoiceSlots,
                                          selected,
                                        ),
                                      )
                                    }}
                                    accentClass="border-accent bg-accent/10"
                                  />
                                )
                              })
                          })()}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Feats granted by class features */}
                {activeClassLevels.length > 0 && requiredFeatSlots > 0 && (
                  <div className="mt-6 p-4 bg-muted/40 rounded-xl border border-border">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">Feats</h3>
                        <p className="text-xs text-muted-foreground">
                          Choose feats granted by linked common modifiers (Gain a Feat with category filters).
                          Ability-score bonuses apply on later steps.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">
                        {selectedFeatCount}/{requiredFeatSlots}
                                </span>
                    </div>

                    {featsLoadError && (
                      <p className="text-xs text-destructive mb-3">
                        Could not load feats from the database ({featsLoadError}). Run{" "}
                        <code className="font-mono">npm run db:migrate</code> and refresh the page.
                      </p>
                    )}
                    {!featsLoadError && feats.length === 0 && !hasCatalogFeatPickOptions && (
                      <p className={`${pageFloatingHintClass} text-xs mb-3`}>
                        No feats in your compendium yet. Seed SRD content from Settings or add feats
                        in the Compendium.
                      </p>
                    )}

                    {classCatalogFeatGroups.map((group) => {
                      const catalogOptions = catalogFeatPickOptions(
                        group.featCategories,
                        customAbilities,
                      )
                      const selectedPickIds = readCatalogFeatPicksFromSlots(
                        group.slots,
                        featureChoicePicks,
                      )

                      return (
                        <CatalogFeatMultiPicker
                          key={group.groupKey}
                          className="mt-3"
                          classPrefix={group.className || undefined}
                          label={group.label}
                          options={catalogOptions}
                          maxCount={group.slots.length}
                          selectedPickIds={selectedPickIds}
                          customAbilities={customAbilities}
                          cardViewMode={cardViewMode}
                          onChange={(nextPickIds) => {
                            const slotPicks = distributeCatalogFeatPicksToSlots(
                              group.slots,
                              nextPickIds,
                            )
                            setFeatureChoicePicks((prev) => ({ ...prev, ...slotPicks }))
                            setFeatChoicePicks((prev) => {
                              const next = { ...prev }
                              for (const slot of group.slots) {
                                delete next[featChoicePickKey(slot.key)]
                              }
                              return next
                            })
                            setModifierPlayerPicks((prev) => {
                              let next = prev
                              for (const slot of group.slots) {
                                next = clearModifierPicksForSource(
                                  next,
                                  featChoicePickKey(slot.key),
                                )
                              }
                              return next
                            })
                          }}
                        />
                      )
                    })}

                    {regularClassFeatSlots.map((slot) => {
                      const pickedId = featureChoicePicks[slot.key]?.[0] ?? null
                      const picked = feats.find((f) => f.id === pickedId) ?? null
                      const featContext = {
                        totalLevel,
                        classIds: activeClassLevels.map((cl) => cl.classId),
                        feats,
                        ownedFeatIds,
                        speciesId: character.species_id,
                        backgroundId: character.background_id,
                        currentSlotFeatId: pickedId,
                      }
                      const eligibleFeats = feats
                        .filter((feat) =>
                          isFeatEligibleForCategories(
                            feat,
                            slot.featCategories,
                            slot.milestoneLevel,
                            featContext,
                          ),
                        )
                        .sort((a, b) => a.name.localeCompare(b.name))

                      const selectPick = (nextId: string | null) => {
                        const choiceKey = featChoicePickKey(slot.key)
                        setFeatureChoicePicks((prev) => ({
                          ...prev,
                          [slot.key]: nextId ? [nextId] : [],
                        }))
                        setFeatChoicePicks((prev) => {
                          if (!nextId) {
                            const next = { ...prev }
                            delete next[choiceKey]
                            return next
                          }
                          if (prev[choiceKey] && pickedId === nextId) return prev
                          const next = { ...prev }
                          delete next[choiceKey]
                          return next
                        })
                        setModifierPlayerPicks((prev) =>
                          clearModifierPicksForSource(prev, choiceKey),
                        )
                      }

                      return (
                        <div key={slot.key} className="mt-3">
                          <p className="text-xs font-bold text-primary uppercase mb-2">
                            {slot.className ? `${slot.className}: ` : ""}
                            {slot.label}
                          </p>
                          <div
                            className={`grid grid-cols-1 ${
                              cardViewMode === "cinematic"
                                ? "sm:grid-cols-2 gap-2"
                                : "sm:grid-cols-2 lg:grid-cols-3 gap-1.5"
                            }`}
                          >
                            {eligibleFeats.map((feat) => {
                              const isSelected = feat.id === pickedId
                              const featCard = (
                                <button
                                  type="button"
                                  onClick={() => selectPick(isSelected ? null : feat.id)}
                                  className={`rounded-lg border-2 text-left transition-all ${
                                    cardViewMode === "cinematic"
                                      ? "flex-1 p-3"
                                      : "w-full px-2.5 py-1.5"
                                  } ${
                                    isSelected
                                      ? "border-secondary bg-secondary/10"
                                      : "border-border bg-card hover:border-secondary/50"
                                  }`}
                                >
                                  <div
                                    className={`flex items-start ${
                                      cardViewMode === "cinematic" ? "gap-2.5" : "gap-2"
                                    }`}
                                  >
                                    {cardViewMode === "cinematic" && (
                                      <GameIcon
                                        name={getCompendiumItemIcon(
                                          "feats",
                                          feat as unknown as unknown as Record<string, unknown>,
                                        )}
                                        className="mt-0.5 h-7 w-7 shrink-0 text-secondary"
                                      />
                                    )}
                                    <div className="min-w-0">
                                      <p
                                        className={`font-semibold text-foreground ${
                                          cardViewMode === "cinematic" ? "text-sm" : "text-xs"
                                        }`}
                                      >
                                        {feat.name}
                                      </p>
                                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                        {feat.level_requirement && feat.level_requirement > 1 && (
                                          <span>Lvl {feat.level_requirement}+</span>
                                        )}
                                        {feat.repeatable && (
                                          <span className="text-primary">Repeatable</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              )

                              if (cardViewMode !== "cinematic") {
                                return <div key={feat.id}>{featCard}</div>
                              }

                              return (
                                <div key={feat.id} className="flex items-stretch gap-1">
                                  {featCard}
                                  {feat.description?.trim() ? (
                                    <button
                                      type="button"
                                      aria-label={`About ${feat.name}`}
                                      onClick={() =>
                                        setDetailsModal({ type: "feat", item: feat })
                                      }
                                      className="shrink-0 self-center rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                                    >
                                      <Info className="h-4 w-4" />
                                    </button>
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                          {eligibleFeats.length === 0 && !featsLoadError && feats.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              No eligible feats for this slot.
                            </p>
                          )}
                          {picked && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Selected:{" "}
                              <span className="font-semibold text-foreground">{picked.name}</span>
                            </p>
                          )}
                          {picked && isAsiFeat(picked) && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Allocate ability increases on the Abilities step.
                            </p>
                          )}
                          {picked?.isChoice && picked.choices?.options?.length ? (
                            <div className="mt-3">
                              <FeatModifierChoicePicker
                                entry={{
                                  featId: picked.id,
                                  choicePickKey: featChoicePickKey(slot.key),
                                }}
                                feat={picked}
                                selected={featChoicePicks[featChoicePickKey(slot.key)] ?? []}
                                onChange={(selected) => {
                                  const choiceKey = featChoicePickKey(slot.key)
                                  setFeatChoicePicks((prev) => ({
                                    ...prev,
                                    [choiceKey]: selected,
                                  }))
                                  setModifierPlayerPicks((prev) =>
                                    clearModifierPicksForSource(prev, choiceKey),
                                  )
                                }}
                                layout={compactPickerLayout}
                              />
                            </div>
                          ) : null}
                          {pickedId && picked ? (
                            <ModifierPlayerChoicePanel
                              sourceKey={featChoicePickKey(slot.key)}
                              sourceLabel={picked.name}
                              slots={modifierPlayerChoiceSlots}
                              picks={modifierPlayerPicks}
                              spells={spells}
                              excludeKinds={["spell"]}
                              unavailableOptions={[...getTakenSkills(skillPickSources)]}
                              {...modifierExpertisePickerProps}
                              onChange={(slotKey, selected) => {
                                const slotEntry = modifierPlayerChoiceSlots.find(
                                  (entry) => entry.slotKey === slotKey,
                                )
                                if (!slotEntry) return
                                setModifierPlayerPicks((prev) =>
                                  setModifierPlayerPickValue(
                                    prev,
                                    slotEntry,
                                    modifierPlayerChoiceSlots,
                                    selected,
                                  ),
                                )
                              }}
                            />
                          ) : null}
                        </div>
                      )
                    })}

                    {selectedFeatCount !== requiredFeatSlots && (
                      <p className="text-xs text-destructive mt-3">
                        Select {requiredFeatSlots - selectedFeatCount} more feat
                        {requiredFeatSlots - selectedFeatCount === 1 ? "" : "s"} to continue.
                      </p>
                    )}
                </div>
                )}
              </div>
            )}

            {/* Step 2: Origin (Species + Background) */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-foreground mb-2">Choose Your Species</h2>
                  <p className={`${pageFloatingHintClass} mb-3`}>Your species grants unique traits and abilities.</p>
                  
                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search species..."
                      value={speciesSearch}
                      onChange={(e) => setSpeciesSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  
                  {(() => {
                    const filteredSpecies = species.filter((sp) =>
                      sp.name.toLowerCase().includes(speciesSearch.toLowerCase()),
                    )
                    const {
                      items: visibleSpecies,
                      pageCount: speciesPageCount,
                      safePage: safeSpeciesPage,
                    } = paginateList(filteredSpecies, speciesPickerPage, pickerPageSize)
                    const speciesToShow = useSwipeVisualPicker ? filteredSpecies : visibleSpecies

                    return (
                      <>
                        <SwipeVisualPicker enabled={useSwipeVisualPicker} className={pickerGridClass}>
                          {speciesToShow.map((sp) => {
                        const accent = getCompendiumItemAccentColor(sp as unknown as Record<string, unknown>)
                        const isSelected = character.species_id === sp.id
                        const selectSpecies = () => {
                          const deselecting = character.species_id === sp.id
                          const nextId = deselecting ? null : sp.id
                          const nextSize = deselecting
                            ? null
                            : (sp.size_options?.[0] ?? sp.size ?? null)
                          setCharacter({ ...character, species_id: nextId, size: nextSize })
                          setSpeciesTraitPicks({})
                          setFeatureChoicePicks((prev) => {
                            const next = { ...prev }
                            for (const key of Object.keys(next)) {
                              if (key.startsWith("species:")) delete next[key]
                            }
                            return next
                          })
                        }
                        if (cardViewMode === "dense") {
                          return (
                            <CompendiumDenseSelectionCard
                        key={sp.id}
                              name={sp.name}
                              subtitle={sp.source || "Custom"}
                              icon={sp.icon}
                              accentColor={accent}
                              selected={isSelected}
                              onSelect={selectSpecies}
                            />
                          )
                        }
                        return (
                      <CompendiumSelectionCard
                        key={sp.id}
                        item={sp}
                        subtitle={sp.source || "Custom"}
                        description={compendiumCardBlurb(sp.description, 100)}
                        accentColor={accent}
                        selected={isSelected}
                        size="md"
                        cardShape={useCinematicPortraitCards ? "portrait" : "wide"}
                        imageCrop="top"
                        onSelect={selectSpecies}
                        onLearnMore={() => setDetailsModal({ type: "species", item: sp })}
                      />
                        )
                      })}
                        </SwipeVisualPicker>
                        <PickerGridPagination
                          page={safeSpeciesPage}
                          pageCount={speciesPageCount}
                          onPrevious={() => setSpeciesPickerPage((p) => Math.max(0, p - 1))}
                          onNext={() =>
                            setSpeciesPickerPage((p) => Math.min(speciesPageCount - 1, p + 1))
                          }
                          previousLabel="Previous species"
                          nextLabel="Next species"
                          className={cinematicPickerPaginationClass}
                        />
                      </>
                    )
                  })()}

                  {selectedSpecies &&
                    ((selectedSpecies.traits ?? []).some(
                      (t) => t.isChoice && (t.choices?.options?.length ?? 0) > 0,
                    ) ||
                      speciesFeatPickSlots.length > 0 ||
                      (selectedSpecies.size_options?.length ?? 0) > 1 ||
                      modifierPlayerChoiceSlots.some((s) =>
                        s.sourceKey.startsWith(`species:${selectedSpecies.id}:`),
                      )) && (
                    <div className="mt-4 space-y-2 border-t border-border pt-4">
                      <h3 className="text-lg font-bold text-foreground">Species Options</h3>
                      {(selectedSpecies.size_options?.length ?? 0) > 1 && (
                        <div className="mb-2">
                          <p className="text-sm font-semibold text-foreground mb-1">Size</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedSpecies.size_options!.map((sizeOption) => {
                              const isSelected =
                                (character.size ?? selectedSpecies.size) === sizeOption
                              return (
                                <button
                                  key={sizeOption}
                                  type="button"
                                  onClick={() =>
                                    setCharacter((prev) => ({ ...prev, size: sizeOption }))
                                  }
                                  className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                                    isSelected
                                      ? "border-secondary bg-secondary/10 text-foreground"
                                      : "border-border bg-card text-muted-foreground hover:border-secondary/50"
                                  }`}
                                >
                                  {sizeOption}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {(selectedSpecies.traits ?? []).map((trait, index) => {
                        if (!trait.isChoice || !(trait.choices?.options?.length ?? 0)) return null
                        const choices = trait.choices!
                        return (
                          <MultiSelectChoices
                            key={`${selectedSpecies.id}-${index}`}
                            title={trait.name}
                            hint={choices.category}
                            options={choices.options}
                            maxCount={choices.count}
                            selected={speciesTraitPicks[String(index)] ?? []}
                            unavailableOptions={[
                              ...getTakenSkills(skillPickSources, `species:${index}`),
                            ]}
                            onChange={(selected) =>
                              setSpeciesTraitPicks((prev) => ({ ...prev, [String(index)]: selected }))
                            }
                            accentClass="border-secondary bg-secondary/10"
                            layout={compactPickerLayout}
                          />
                        )
                      })}
                      {(() => {
                        const onSpeciesModifierChange = (slotKey: string, selected: string[]) => {
                          const slot = modifierPlayerChoiceSlots.find(
                            (entry) => entry.slotKey === slotKey,
                          )
                          if (!slot) return
                          setModifierPlayerPicks((prev) =>
                            setModifierPlayerPickValue(
                              prev,
                              slot,
                              modifierPlayerChoiceSlots,
                              selected,
                            ),
                          )
                        }
                        return (
                          <>
                            <ModifierPlayerChoicePanel
                              sourceKey={speciesModsSourceKey(selectedSpecies.id)}
                              sourceLabel={selectedSpecies.name}
                              slots={modifierPlayerChoiceSlots}
                              picks={modifierPlayerPicks}
                              spells={spells}
                              accentClass="border-secondary bg-secondary/10"
                              unavailableOptions={[
                                ...getTakenSkills(skillPickSources, "species:mods"),
                              ]}
                              {...modifierExpertisePickerProps}
                              onChange={onSpeciesModifierChange}
                            />
                            {(selectedSpecies.traits ?? []).map((trait, index) => (
                              <ModifierPlayerChoicePanel
                                key={`species-mod-${selectedSpecies.id}-${index}`}
                                sourceKey={speciesTraitSourceKey(selectedSpecies.id, index)}
                                sourceLabel={trait.name}
                                slots={modifierPlayerChoiceSlots}
                                picks={modifierPlayerPicks}
                                spells={spells}
                                accentClass="border-secondary bg-secondary/10"
                                unavailableOptions={[
                                  ...getTakenSkills(skillPickSources, `species:trait:${index}`),
                                ]}
                                {...modifierExpertisePickerProps}
                                onChange={onSpeciesModifierChange}
                              />
                            ))}
                          </>
                        )
                      })()}
                      {speciesFeatPickSlots.map((slot) => {
                        const pickedId = featureChoicePicks[slot.key]?.[0] ?? null
                        const picked = feats.find((f) => f.id === pickedId) ?? null
                        const featContext = {
                          totalLevel,
                          classIds: activeClassLevels.map((cl) => cl.classId),
                          feats,
                          ownedFeatIds,
                          speciesId: character.species_id,
                          backgroundId: character.background_id,
                          currentSlotFeatId: pickedId,
                        }
                        const eligible = feats
                          .filter((feat) =>
                            isFeatEligibleForCategories(
                              feat,
                              slot.featCategories,
                              1,
                              featContext,
                            ),
                          )
                          .sort((a, b) => a.name.localeCompare(b.name))

                        return (
                          <div key={slot.key} className="mt-3">
                            <p className="text-xs font-bold text-secondary uppercase mb-2">
                              {slot.label}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {eligible.map((feat) => {
                                const isSelected = feat.id === pickedId
                                return (
                          <button
                                    key={feat.id}
                            type="button"
                                    onClick={() => {
                                      const choiceKey = featChoicePickKey(slot.key)
                                      setFeatureChoicePicks((prev) => ({
                                        ...prev,
                                        [slot.key]: isSelected ? [] : [feat.id],
                                      }))
                                      setFeatChoicePicks((prev) => {
                                        const next = { ...prev }
                                        delete next[choiceKey]
                                        return next
                                      })
                                      setModifierPlayerPicks((prev) =>
                                        clearModifierPicksForSource(prev, choiceKey),
                                      )
                                    }}
                                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                                      isSelected
                                        ? "border-secondary bg-secondary/10"
                                        : "border-border bg-card hover:border-secondary/50"
                                    }`}
                                  >
                                    <p className="font-semibold text-sm text-foreground">{feat.name}</p>
                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                      {feat.level_requirement && feat.level_requirement > 1 && (
                                        <span>Lvl {feat.level_requirement}+</span>
                                      )}
                                      {feat.repeatable && <span className="text-primary">Repeatable</span>}
                                    </div>
                          </button>
                                )
                              })}
                        </div>
                            {eligible.length === 0 && feats.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                No eligible feats for this choice.
                              </p>
                            )}
                            {picked && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Selected:{" "}
                                <span className="font-semibold text-foreground">{picked.name}</span>
                              </p>
                            )}
                            {picked?.isChoice && picked.choices?.options?.length ? (
                              <div className="mt-3">
                                <FeatModifierChoicePicker
                                  entry={{
                                    featId: picked.id,
                                    choicePickKey: featChoicePickKey(slot.key),
                                  }}
                                  feat={picked}
                                  selected={featChoicePicks[featChoicePickKey(slot.key)] ?? []}
                                  onChange={(selected) => {
                                    const choiceKey = featChoicePickKey(slot.key)
                                    setFeatChoicePicks((prev) => ({
                                      ...prev,
                                      [choiceKey]: selected,
                                    }))
                                    setModifierPlayerPicks((prev) =>
                                      clearModifierPicksForSource(prev, choiceKey),
                                    )
                                  }}
                                  layout={compactPickerLayout}
                                />
                  </div>
                            ) : null}
                            {picked ? (
                              <ModifierPlayerChoicePanel
                                sourceKey={featChoicePickKey(slot.key)}
                                sourceLabel={picked.name}
                                slots={modifierPlayerChoiceSlots}
                                picks={modifierPlayerPicks}
                                spells={spells}
                                excludeKinds={["spell"]}
                                {...modifierExpertisePickerProps}
                                onChange={(slotKey, selected) => {
                                  const slot = modifierPlayerChoiceSlots.find(
                                    (entry) => entry.slotKey === slotKey,
                                  )
                                  if (!slot) return
                                  setModifierPlayerPicks((prev) =>
                                    setModifierPlayerPickValue(
                                      prev,
                                      slot,
                                      modifierPlayerChoiceSlots,
                                      selected,
                                    ),
                                  )
                                }}
                              />
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-black text-foreground mb-2">Choose Your Background</h2>
                  <p className={`${pageFloatingHintClass} mb-3`}>Your background provides ability bonuses and a 1st-level feat.</p>
                  
                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search backgrounds..."
                      value={backgroundSearch}
                      onChange={(e) => setBackgroundSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  
                  {(() => {
                    const filteredBackgrounds = backgrounds.filter((bg) =>
                      bg.name.toLowerCase().includes(backgroundSearch.toLowerCase()),
                    )
                    const {
                      items: visibleBackgrounds,
                      pageCount: backgroundPageCount,
                      safePage: safeBackgroundPage,
                    } = paginateList(filteredBackgrounds, backgroundPickerPage, pickerPageSize)

                    return (
                      <>
                        <PickerGridPagination
                          page={safeBackgroundPage}
                          pageCount={backgroundPageCount}
                          onPrevious={() => setBackgroundPickerPage((p) => Math.max(0, p - 1))}
                          onNext={() =>
                            setBackgroundPickerPage((p) => Math.min(backgroundPageCount - 1, p + 1))
                          }
                          previousLabel="Previous backgrounds"
                          nextLabel="Next backgrounds"
                          className={cn("mb-2 mt-0", cinematicPickerPaginationClass)}
                        />
                        <SwipeVisualPicker enabled={useSwipeVisualPicker} className={pickerGridClass}>
                          {visibleBackgrounds.map((bg) => {
                        const grantedFeat = findBackgroundGrantedFeat(bg.feat_granted, feats)
                        const accent = getCompendiumItemAccentColor(bg as unknown as Record<string, unknown>)
                        const isSelected = character.background_id === bg.id
                        const selectBackground = () => {
                          const nextId = character.background_id === bg.id ? null : bg.id
                          const nextBg = nextId ? backgrounds.find((b) => b.id === nextId) : null
                          setCharacter((prev) => {
                            let next: CharacterDraft = { ...prev, background_id: nextId }
                            if (nextBg) {
                              next = applyBackgroundProficienciesToDraft(next, nextBg)
                            } else {
                              next = {
                                ...next,
                                tool_proficiencies: [],
                                weapon_proficiencies: [],
                                armor_proficiencies: [],
                              }
                            }
                            return next
                          })
                          setBackgroundStartingEquipmentOptionIndex(null)
                          setFeatureChoicePicks((prev) => {
                            const next: Record<string, string[]> = {}
                            for (const [key, picks] of Object.entries(prev)) {
                              if (!key.startsWith("background:")) {
                                next[key] = picks
                              }
                            }
                            return next
                          })
                          setFeatChoicePicks((prev) => {
                            const next = { ...prev }
                            for (const key of Object.keys(next)) {
                              if (key.startsWith("feat:granted:")) delete next[key]
                            }
                            return next
                          })
                          setAsiAllocationsByFeatId((prev) => {
                            if (!nextId) {
                              const { [BACKGROUND_ASI_KEY]: _, ...rest } = prev
                              return rest
                            }
                            return { ...prev, [BACKGROUND_ASI_KEY]: {} }
                          })
                        }
                        if (cardViewMode === "dense") {
                          return (
                            <CompendiumDenseSelectionCard
                        key={bg.id}
                              name={bg.name}
                              subtitle={bg.source || "Custom"}
                              icon={bg.icon}
                              accentColor={accent}
                              selected={isSelected}
                              onSelect={selectBackground}
                            />
                          )
                        }
                        return (
                      <CompendiumSelectionCard
                        key={bg.id}
                        item={bg}
                        subtitle={bg.source || "Custom"}
                        description={compendiumCardBlurb(bg.description, 100)}
                        tags={
                          grantedFeat || bg.feat_granted
                            ? [{ label: `FEAT: ${grantedFeat?.name ?? bg.feat_granted}` }]
                            : isLegacyBackground(bg)
                              ? [{ label: "ORIGIN FEAT: your choice", emphasis: true }]
                              : []
                        }
                        accentColor={accent}
                        selected={isSelected}
                        size="md"
                        imageAspect="21/9"
                        onSelect={selectBackground}
                        onLearnMore={() => setDetailsModal({ type: "background", item: bg })}
                      />
                        )
                      })}
                        </SwipeVisualPicker>
                        <PickerGridPagination
                          page={safeBackgroundPage}
                          pageCount={backgroundPageCount}
                          onPrevious={() => setBackgroundPickerPage((p) => Math.max(0, p - 1))}
                          onNext={() =>
                            setBackgroundPickerPage((p) => Math.min(backgroundPageCount - 1, p + 1))
                          }
                          previousLabel="Previous backgrounds"
                          nextLabel="Next backgrounds"
                          className={cinematicPickerPaginationClass}
                        />
                      </>
                    )
                  })()}

                  {selectedBackground && isLegacyBackground(selectedBackground) ? (
                    <div className="mt-4 space-y-2 border-t border-border pt-4">
                      <h3 className="text-lg font-bold text-foreground">Background Origin Feat</h3>
                      <p className="text-sm text-muted-foreground">
                        This background predates fixed Origin feats — choose any 1st-level Origin feat.
                      </p>
                      <OriginFeatGrantedSelect
                        value={
                          featureChoicePicks[
                            legacyBackgroundOriginFeatPickKey(selectedBackground.id)
                          ]?.[0] ?? ""
                        }
                        originFeats={originFeats}
                        onChange={(value) => {
                          const pickKey = legacyBackgroundOriginFeatPickKey(selectedBackground.id)
                          setFeatureChoicePicks((prev) => ({
                            ...prev,
                            [pickKey]: value ? [value] : [],
                          }))
                          setFeatChoicePicks((prev) => {
                            const next = { ...prev }
                            for (const key of Object.keys(next)) {
                              if (key.startsWith("feat:granted:")) delete next[key]
                            }
                            return next
                          })
                          setModifierPlayerPicks((prev) => {
                            const next = { ...prev }
                            for (const key of Object.keys(next)) {
                              if (key.startsWith("feat:granted:")) delete next[key]
                            }
                            return next
                          })
                        }}
                      />
                    </div>
                  ) : null}

                  {selectedBackground && backgroundFeatPickSlots.length > 0 ? (
                    <div className="mt-4 space-y-2 border-t border-border pt-4">
                      <h3 className="text-lg font-bold text-foreground">Background Feat</h3>
                      {backgroundFeatPickSlots.map((slot) => {
                        const pickedId = featureChoicePicks[slot.key]?.[0] ?? null
                        const picked = feats.find((f) => f.id === pickedId) ?? null
                        const featContext = {
                          totalLevel,
                          classIds: activeClassLevels.map((cl) => cl.classId),
                          feats,
                          ownedFeatIds,
                          speciesId: character.species_id,
                          backgroundId: character.background_id,
                          currentSlotFeatId: pickedId,
                        }
                        const eligible = feats
                          .filter((feat) =>
                            isFeatEligibleForCategories(feat, slot.featCategories, 1, featContext),
                          )
                          .sort((a, b) => a.name.localeCompare(b.name))

                        return (
                          <div key={slot.key} className="mt-3">
                            <p className="text-xs font-bold text-accent uppercase mb-2">
                              {slot.label}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {eligible.map((feat) => {
                                const isSelected = feat.id === pickedId
                                return (
                                  <button
                                    key={feat.id}
                                    type="button"
                                    onClick={() => {
                                      const choiceKey = featChoicePickKey(slot.key)
                                      setFeatureChoicePicks((prev) => ({
                                        ...prev,
                                        [slot.key]: isSelected ? [] : [feat.id],
                                      }))
                                      setFeatChoicePicks((prev) => {
                                        const next = { ...prev }
                                        delete next[choiceKey]
                                        return next
                                      })
                                      setModifierPlayerPicks((prev) =>
                                        clearModifierPicksForSource(prev, choiceKey),
                                      )
                                    }}
                                    className={`rounded-lg border-2 text-left transition-all px-2.5 py-1.5 ${
                                      isSelected
                            ? "border-accent bg-accent/10"
                            : "border-border bg-card hover:border-accent/50"
                        }`}
                      >
                                    <p className="font-semibold text-foreground text-xs">
                                      {feat.name}
                                    </p>
                                    {feat.prerequisite ? (
                                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                                        Prereq: {feat.prerequisite}
                                      </p>
                                    ) : null}
                          </button>
                                )
                              })}
                        </div>
                            {eligible.length === 0 && feats.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                No eligible feats for this choice.
                              </p>
                            )}
                            {picked && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Selected:{" "}
                                <span className="font-semibold text-foreground">{picked.name}</span>
                              </p>
                            )}
                            {picked?.isChoice && picked.choices?.options?.length ? (
                              <div className="mt-3">
                                <FeatModifierChoicePicker
                                  entry={{
                                    featId: picked.id,
                                    choicePickKey: featChoicePickKey(slot.key),
                                  }}
                                  feat={picked}
                                  selected={featChoicePicks[featChoicePickKey(slot.key)] ?? []}
                                  onChange={(selected) => {
                                    const choiceKey = featChoicePickKey(slot.key)
                                    setFeatChoicePicks((prev) => ({
                                      ...prev,
                                      [choiceKey]: selected,
                                    }))
                                    setModifierPlayerPicks((prev) =>
                                      clearModifierPicksForSource(prev, choiceKey),
                                    )
                                  }}
                                  layout={compactPickerLayout}
                                />
                  </div>
                            ) : null}
                            {picked ? (
                              <ModifierPlayerChoicePanel
                                sourceKey={featChoicePickKey(slot.key)}
                                sourceLabel={picked.name}
                                slots={modifierPlayerChoiceSlots}
                                picks={modifierPlayerPicks}
                                spells={spells}
                                excludeKinds={["spell"]}
                                unavailableOptions={[...getTakenSkills(skillPickSources)]}
                                {...modifierExpertisePickerProps}
                                onChange={(slotKey, selected) => {
                                  const slot = modifierPlayerChoiceSlots.find(
                                    (entry) => entry.slotKey === slotKey,
                                  )
                                  if (!slot) return
                                  setModifierPlayerPicks((prev) =>
                                    setModifierPlayerPickValue(
                                      prev,
                                      slot,
                                      modifierPlayerChoiceSlots,
                                      selected,
                                    ),
                                  )
                                }}
                              />
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  ) : null}

                  {backgroundGrantedFeat?.isChoice && backgroundGrantedFeat.choices?.options?.length ? (
                    <div className="mt-4 border-t border-border pt-4">
                      <FeatModifierChoicePicker
                        entry={{
                          featId: backgroundGrantedFeat.id,
                          choicePickKey: grantedFeatChoicePickKey(backgroundGrantedFeat.id),
                        }}
                        feat={backgroundGrantedFeat}
                        selected={
                          featChoicePicks[grantedFeatChoicePickKey(backgroundGrantedFeat.id)] ?? []
                        }
                        onChange={(selected) => {
                          const choiceKey = grantedFeatChoicePickKey(backgroundGrantedFeat.id)
                          setFeatChoicePicks((prev) => ({
                            ...prev,
                            [choiceKey]: selected,
                          }))
                          setModifierPlayerPicks((prev) =>
                            clearModifierPicksForSource(prev, choiceKey),
                          )
                        }}
                        layout={compactPickerLayout}
                      />
                    </div>
                  ) : null}
                  {backgroundGrantedFeat ? (
                    <ModifierPlayerChoicePanel
                      sourceKey={grantedFeatChoicePickKey(backgroundGrantedFeat.id)}
                      sourceLabel={backgroundGrantedFeat.name}
                      slots={modifierPlayerChoiceSlots}
                      picks={modifierPlayerPicks}
                      spells={spells}
                      excludeKinds={["spell"]}
                      unavailableOptions={[...getTakenSkills(skillPickSources)]}
                      {...modifierExpertisePickerProps}
                      onChange={(slotKey, selected) => {
                        const slot = modifierPlayerChoiceSlots.find(
                          (entry) => entry.slotKey === slotKey,
                        )
                        if (!slot) return
                        setModifierPlayerPicks((prev) =>
                          setModifierPlayerPickValue(
                            prev,
                            slot,
                            modifierPlayerChoiceSlots,
                            selected,
                          ),
                        )
                      }}
                    />
                  ) : null}
                </div>
              </div>
            )}

            {/* Step 3: Ability Scores */}
            {currentStep === 3 && (
              <div>
                <h2 className="text-2xl font-black text-foreground mb-2">Determine Ability Scores</h2>
                <p className={`${pageFloatingHintClass} mb-6`}>Set your character&apos;s core abilities.</p>

                {/* Method Selection */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {(
                    [
                    { id: "pointbuy", label: "Point Buy" },
                    { id: "standard", label: "Standard Array" },
                      { id: "roll", label: "Roll", dice: true },
                      { id: "custom", label: "Custom" },
                    ] as const
                  ).map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => {
                        setAbilityMethod(method.id)
                        if (method.id === "standard") applyStandardArray()
                        if (method.id === "roll") rollAbilities()
                        if (method.id === "pointbuy") {
                          setPointsRemaining(27)
                          setCharacter({
                            ...character,
                            strength: 8,
                            dexterity: 8,
                            constitution: 8,
                            intelligence: 8,
                            wisdom: 8,
                            charisma: 8,
                          })
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold transition-colors ${
                        abilityMethod === method.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {"dice" in method && method.dice && (
                        <Dices className="w-4 h-4 shrink-0" />
                      )}
                      {method.label}
                    </button>
                  ))}
                </div>

                {abilityMethod === "pointbuy" && (
                  <div className="mb-4 p-3 bg-primary/10 rounded-xl text-center">
                    <span className="font-bold text-primary">Points Remaining: {pointsRemaining}</span>
                  </div>
                )}

                {showLegacyMilestoneAsi && (
                  <div className="mb-6">
                    <AsiAllocator
                      allocation={milestoneAsiAllocation}
                      totalPoints={milestoneAsiTotalPoints}
                      pickCount={milestoneAsiFeatCount}
                      variant={asiAllocatorVariant}
                      onChange={(allocation) =>
                        setAsiAllocationsByFeatId((prev) =>
                          withCombinedMilestoneAsiAllocation(prev, allocation),
                        )
                      }
                    />
                  </div>
                )}

                {abilityScorePoolGrants.map((grant) => (
                  <div key={grant.allocationKey} className="mb-6">
                    <AsiAllocator
                      title={grant.label}
                      allocation={asiAllocationsByFeatId[grant.allocationKey] ?? {}}
                      totalPoints={grant.points}
                      variant={asiAllocatorVariant}
                      onChange={(allocation) =>
                        setAsiAllocationsByFeatId((prev) => ({
                          ...prev,
                          [grant.allocationKey]: allocation,
                        }))
                      }
                    />
                  </div>
                ))}

                {backgroundAbilityGrant.needsChoice && (
                  <div className="mb-6">
                    <AsiAllocator
                      title={`${selectedBackground?.name ?? "Background"} Ability Scores`}
                      allocation={asiAllocationsByFeatId[BACKGROUND_ASI_KEY] ?? {}}
                      totalPoints={BACKGROUND_ASI_TOTAL_POINTS}
                      allowedAbilities={backgroundAbilityGrant.eligible}
                      maxPerAbility={2}
                      helpText={getBackgroundAsiHelpText(backgroundAbilityGrant)}
                      variant={asiAllocatorVariant}
                      headerImageUrl={selectedBackgroundCardImage}
                      onChange={(allocation) =>
                        setAsiAllocationsByFeatId((prev) => ({
                          ...prev,
                          [BACKGROUND_ASI_KEY]: allocation,
                        }))
                      }
                    />
                  </div>
                )}

                {Object.keys(backgroundAbilityGrant.fixed).length > 0 && (
                  <div
                    className={
                      asiAllocatorVariant === "visual"
                        ? "mb-6 overflow-hidden rounded-xl border-2 border-border bg-gradient-to-b from-black via-zinc-950 to-black p-4"
                        : "mb-6 p-3 rounded-lg border border-border bg-card/80"
                    }
                    style={
                      asiAllocatorVariant === "visual"
                        ? {
                            boxShadow:
                              "inset 0 0 0 1px rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.45)",
                          }
                        : undefined
                    }
                  >
                    {asiAllocatorVariant === "visual" && selectedBackgroundCardImage ? (
                      <div className="relative -mx-4 -mt-4 mb-3 aspect-[21/9] max-h-[11.2rem] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedBackgroundCardImage}
                          alt=""
                          className="h-full w-full object-cover object-top"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/45 to-black" />
                      </div>
                    ) : null}
                    <p
                      className={
                        asiAllocatorVariant === "visual"
                          ? "font-serif text-base font-black uppercase tracking-wide text-white"
                          : "text-xs font-bold text-foreground mb-1"
                      }
                    >
                      {selectedBackground?.name ?? "Background"} Ability Scores
                    </p>
                    <p
                      className={
                        asiAllocatorVariant === "visual"
                          ? "mt-1 text-sm text-amber-400/90"
                          : "text-sm text-foreground"
                      }
                    >
                      {formatBackgroundAbilityBonuses(selectedBackground?.ability_bonuses)}
                    </p>
                  </div>
                )}

                {cardViewMode === "cinematic" ? (
                  <AbilityScoreCards
                    method={abilityMethod}
                    scores={{
                      strength: character.strength,
                      dexterity: character.dexterity,
                      constitution: character.constitution,
                      intelligence: character.intelligence,
                      wisdom: character.wisdom,
                      charisma: character.charisma,
                    }}
                    standardAssignments={standardArrayAssignments}
                    standardArray={STANDARD_ARRAY}
                    getModifierLabel={getAbilityModifier}
                    onAdjust={updateAbilityScore}
                    onSetCustom={setCustomAbilityScore}
                    onAssignStandard={assignStandardArrayValue}
                    isStandardValueUsedElsewhere={isStandardValueUsedElsewhere}
                  />
                ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {ABILITY_NAMES.map((ability) => (
                    <div key={ability} className="bg-card rounded-xl p-4 border-2 border-border text-center">
                      <h3 className="font-bold text-foreground capitalize mb-2">{ability}</h3>

                      {abilityMethod === "custom" ? (
                        <div className="flex flex-col items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={character[ability]}
                            onChange={(e) => setCustomAbilityScore(ability, e.target.value)}
                            className="w-20 text-center text-3xl font-black text-foreground px-2 py-1 bg-background border-2 border-border rounded-lg focus:outline-none focus:border-primary"
                          />
                        </div>
                      ) : abilityMethod === "standard" ? (
                        <span className="text-3xl font-black text-foreground w-12 inline-block">
                          {standardArrayAssignments[ability] ?? "—"}
                        </span>
                      ) : (
                      <div className="flex items-center justify-center gap-3">
                          {abilityMethod === "pointbuy" && (
                        <button
                              type="button"
                          onClick={() => updateAbilityScore(ability, -1)}
                          disabled={character[ability] <= 8}
                          className="w-8 h-8 bg-muted rounded-lg font-bold disabled:opacity-30"
                        >
                          -
                        </button>
                          )}
                        <span className="text-3xl font-black text-foreground w-12">
                          {character[ability]}
                        </span>
                          {abilityMethod === "pointbuy" && (
                        <button
                              type="button"
                          onClick={() => updateAbilityScore(ability, 1)}
                              disabled={character[ability] >= 15}
                          className="w-8 h-8 bg-muted rounded-lg font-bold disabled:opacity-30"
                        >
                          +
                        </button>
                          )}
                      </div>
                      )}

                      {abilityMethod === "standard" && (
                        <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                          {STANDARD_ARRAY.map((value) => {
                            const selectedHere = standardArrayAssignments[ability] === value
                            const usedElsewhere = isStandardValueUsedElsewhere(ability, value)
                            const disabled = usedElsewhere && !selectedHere
                            return (
                              <button
                                key={value}
                                type="button"
                                disabled={disabled}
                                aria-pressed={selectedHere}
                                onClick={() => assignStandardArrayValue(ability, value)}
                                className={`min-w-[2.25rem] px-2 py-1 rounded-lg text-sm font-bold transition-colors ${
                                  selectedHere
                                    ? "bg-primary text-primary-foreground"
                                    : disabled
                                      ? "bg-muted/40 text-muted-foreground/40 cursor-not-allowed"
                                      : "bg-muted text-foreground hover:bg-primary/15 hover:text-primary"
                                }`}
                              >
                                {value}
                              </button>
                            )
                          })}
                        </div>
                      )}

                      <p className="text-lg font-bold text-primary mt-2">
                        {abilityMethod === "standard" && standardArrayAssignments[ability] == null
                          ? "—"
                          : getAbilityModifier(
                              abilityMethod === "standard"
                                ? (standardArrayAssignments[ability] ?? STANDARD_ARRAY_UNASSIGNED_SCORE)
                                : character[ability],
                            )}
                      </p>
                    </div>
                  ))}
                </div>
                )}
              </div>
            )}

            {/* Step 4: Gear */}
            {currentStep === BUILDER_STEP_IDS.GEAR && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-foreground mb-2">Select Equipment</h2>
                  <p className={`${pageFloatingHintClass} mb-3`}>
                    Choose starting equipment from your class and background, or take gold to buy gear.
                  </p>

                  {startingEquipmentGroups.length > 0 && (
                    <div className="mb-8">
                      {cardViewMode === "cinematic" ? (
                        startingEquipmentGroups.map((group, gi) => (
                          <StartingEquipmentPackagePicker
                            key={gi}
                            title="Starting Equipment"
                            description={`What does your ${equipmentClass?.name ?? "class"} carry?`}
                            options={group.options ?? []}
                            selectedIndex={startingEquipmentOptionIndex}
                            startingGold={classStartingGold}
                            onSelect={selectStartingEquipmentOption}
                            swipeLayout={useSwipeVisualPicker}
                          />
                        ))
                      ) : (
                        <div className="space-y-3">
                          {startingEquipmentGroups.map((group, gi) => (
                            <div key={gi}>
                              <p className="text-sm font-medium text-foreground mb-2">{group.description}</p>
                              <div className="space-y-2">
                                {(group.options ?? []).map((option, oi) => (
                                  <label
                                    key={oi}
                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                      startingEquipmentOptionIndex === oi
                                        ? "border-primary bg-primary/10"
                                        : "border-border bg-card hover:border-primary/50"
                                    }`}
                                  >
                    <input
                                      type="radio"
                                      name="class-starting-equipment"
                                      checked={startingEquipmentOptionIndex === oi}
                                      onChange={() => selectStartingEquipmentOption(oi)}
                                      className="mt-1"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm text-foreground">{option.label}</p>
                                      {!isGoldOnlyOption(option, classStartingGold) ? (
                                        <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                                          {(option.items ?? []).map((item, ii) => (
                                            <li key={ii}>
                                              {item.quantity > 1 ? `${item.quantity}× ` : ""}
                                              {item.name}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          {classStartingGold} GP to spend
                                        </p>
                                      )}
                  </div>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {backgroundStartingEquipmentGroups.length > 0 && selectedBackground && (
                    <div className="mb-8 border-t border-border pt-6">
                      {cardViewMode === "cinematic" ? (
                        backgroundStartingEquipmentGroups.map((group, gi) => (
                          <StartingEquipmentPackagePicker
                            key={gi}
                            title="Background Equipment"
                            description={`What does your ${selectedBackground.name} background provide?`}
                            options={group.options ?? []}
                            selectedIndex={backgroundStartingEquipmentOptionIndex}
                            startingGold={backgroundStartingGold}
                            onSelect={selectBackgroundStartingEquipmentOption}
                            imageSide="alternate"
                            swipeLayout={useSwipeVisualPicker}
                          />
                        ))
                      ) : (
                        <div className="space-y-3">
                          {backgroundStartingEquipmentGroups.map((group, gi) => (
                            <div key={gi}>
                              <p className="text-sm font-medium text-foreground mb-2">{group.description}</p>
                              <div className="space-y-2">
                                {(group.options ?? []).map((option, oi) => (
                      <label
                                    key={oi}
                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                      backgroundStartingEquipmentOptionIndex === oi
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        <input
                                      type="radio"
                                      name="background-starting-equipment"
                                      checked={backgroundStartingEquipmentOptionIndex === oi}
                                      onChange={() => selectBackgroundStartingEquipmentOption(oi)}
                                      className="mt-1"
                                    />
                        <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm text-foreground">{option.label}</p>
                                      {!isGoldOnlyOption(option, backgroundStartingGold) ? (
                                        <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                                          {(option.items ?? []).map((item, ii) => (
                                            <li key={ii}>
                                              {item.quantity > 1 ? `${item.quantity}× ` : ""}
                                              {item.name}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          {backgroundStartingGold} GP to spend
                                        </p>
                                      )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(packageEquipmentIds.length > 0 || inGoldShoppingMode) && (
                    <div className="space-y-4">
                      {packageEquipmentIds.length > 0 && (
                        <div className="p-3 rounded-lg bg-muted/50 border border-border">
                          <p className="text-xs font-bold text-primary uppercase mb-2 flex items-center gap-1.5">
                            <Backpack className="w-3.5 h-3.5" />
                            Included from packages
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {packageEquipmentIds.map((id) => {
                              const item = equipment.find((e) => e.id === id)
                              if (!item) return null
                              return (
                                <span
                                  key={id}
                                  className="text-xs px-2 py-1 rounded-full bg-primary/10 text-foreground"
                                >
                                  {item.name}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {inGoldShoppingMode && (
                        <EquipmentShoppingPanel
                          equipment={equipment}
                          equipmentSearch={equipmentSearch}
                          onEquipmentSearchChange={setEquipmentSearch}
                          equipmentFilterCategory={equipmentFilterCategory}
                          onEquipmentFilterCategoryChange={setEquipmentFilterCategory}
                          goldPurchasedEquipmentIds={goldPurchasedEquipmentIds}
                          goldSpent={goldSpent}
                          totalGoldBudget={totalGoldBudget}
                          onTogglePurchase={toggleGoldPurchasedEquipment}
                          onShowDetails={(item) => setDetailsModal({ type: "equipment", item })}
                        />
                      )}
                    </div>
                  )}

                  {startingEquipmentGroups.length === 0 &&
                    backgroundStartingEquipmentGroups.length === 0 &&
                    !inGoldShoppingMode && (
                    <p className="text-sm text-muted-foreground italic">
                      No starting equipment packages for this character. Add gear manually from the compendium after creation, or pick a class/background with equipment options.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Spells (skipped when the character has no spells to choose) */}
            {currentStep === BUILDER_STEP_IDS.SPELLS && hasSpellStep && (
                  <div className="space-y-8">
                    <h2 className="text-2xl font-black text-foreground mb-2">Select Spells</h2>

                    {spellGrantSourceKeys.length > 0 ? (
                      <div className="space-y-4">
                        <p className={pageFloatingHintClass}>
                          Feats and class features that grant specific spells (Magic Initiate,
                          Mystic Arcanum, Contact Patron, etc.).
                        </p>
                        {spellGrantSourceKeys.map((sourceKey) => {
                          const slot = spellGrantModifierSlots.find(
                            (entry) => entry.sourceKey === sourceKey,
                          )
                          if (!slot) return null
                          return (
                            <ModifierPlayerChoicePanel
                              key={sourceKey}
                              sourceKey={sourceKey}
                              sourceLabel={slot.sourceLabel}
                              slots={modifierPlayerChoiceSlots}
                              picks={modifierPlayerPicks}
                              spells={spells}
                              kinds={["spell", "spell_list_class"]}
                              {...modifierExpertisePickerProps}
                              onChange={(slotKey, selected) => {
                                const target = modifierPlayerChoiceSlots.find(
                                  (entry) => entry.slotKey === slotKey,
                                )
                                if (!target) return
                                setModifierPlayerPicks((prev) =>
                                  setModifierPlayerPickValue(
                                    prev,
                                    target,
                                    modifierPlayerChoiceSlots,
                                    selected,
                                  ),
                                )
                              }}
                            />
                          )
                        })}
                      </div>
                    ) : null}

                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search spells..."
                        value={spellSearch}
                        onChange={(e) => {
                          setSpellSearch(e.target.value)
                          setSpellLevelPages({})
                        }}
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    
                    {spellcastingClasses.map((casterClass) => {
                      const casterLevel =
                        activeClassLevels.find((cl) => cl.classId === casterClass.id)?.level ?? 1
                      const spellLimits = getSpellLimits(
                        casterClass.spellcasting,
                        casterLevel,
                        casterClass.name,
                      )
                      const classSpellIds = spellPicksByClassId[casterClass.id] ?? []
                      const spellCounts = countSelectedSpells(classSpellIds, spells, casterClass.name)
                      const maxSpellLevel = spellLimits.maxSpellLevel
                      // Spells the character already knows from another source (feat/modifier
                      // grants or another caster class) can't be picked again here.
                      const otherClassPickedIds = Object.entries(spellPicksByClassId)
                        .filter(([classId]) => classId !== casterClass.id)
                        .flatMap(([, ids]) => ids)
                      const alreadyKnownSpellIds = new Set<string>([
                        ...grantedSpellIds,
                        ...otherClassPickedIds,
                      ])
                      // Magical Secrets / Divine Soul etc. grant access to extra class spell
                      // lists. These expand prepared (level 1+) spells, not cantrips.
                      const extraSpellLists = aggregatedCharacteristics.spellListAccess
                      const availableSpells = spells
                        .filter((s) => {
                          if (s.level === 0) return s.classes?.includes(casterClass.name)
                          if (s.level > maxSpellLevel) return false
                          return (
                            s.classes?.includes(casterClass.name) ||
                            s.classes?.some((c) => extraSpellLists.includes(c))
                          )
                        })
                        .filter(
                          (s) => !alreadyKnownSpellIds.has(s.id) || classSpellIds.includes(s.id),
                        )
                        .filter((s) => s.name.toLowerCase().includes(spellSearch.toLowerCase()))

                      const spellsByLevel: Record<number, typeof availableSpells> = {}
                      availableSpells.forEach((s) => {
                        if (!spellsByLevel[s.level]) spellsByLevel[s.level] = []
                        spellsByLevel[s.level].push(s)
                      })
                      
                      const levelFilter = spellFilterLevelByClassId[casterClass.id] ?? "all"
                      const spellLevels = Object.keys(spellsByLevel)
                        .map(Number)
                        .sort((a, b) => a - b)
                      const visibleLevels =
                        levelFilter === "all"
                          ? spellLevels
                          : spellLevels.filter((level) => String(level) === levelFilter)

                      return (
                        <div
                          key={casterClass.id}
                          className="border border-border rounded-xl p-4 bg-card/50"
                        >
                          <p className="font-bold text-foreground mb-1">
                            {casterClass.name} (class level {casterLevel})
                          </p>
                          {extraSpellLists.length > 0 && (
                            <p className="text-xs text-muted-foreground mb-2">
                              Expanded spell access: prepared spells may also be chosen from the{" "}
                              {extraSpellLists
                                .filter((c) => c !== casterClass.name)
                                .join(", ")}{" "}
                              spell list{extraSpellLists.filter((c) => c !== casterClass.name).length === 1 ? "" : "s"}.
                            </p>
                          )}
                          <div className="flex flex-wrap gap-3 mb-3 text-sm">
                            <span className="px-2 py-1 rounded bg-secondary/10 text-foreground">
                              Cantrips: {spellCounts.cantrips} / {spellLimits.cantrips}
                            </span>
                            <span className="px-2 py-1 rounded bg-secondary/10 text-foreground">
                              Prepared (level 1+): {spellCounts.prepared} / {spellLimits.prepared}
                            </span>
                            <span className="px-2 py-1 rounded bg-secondary/10 text-foreground">
                              Max spell level: {spellLimits.maxSpellLevel || "—"}
                            </span>
                          </div>

                          {spellLevels.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Level
                              </label>
                              <select
                                value={levelFilter}
                                onChange={(e) => {
                                  setSpellFilterLevelByClassId((prev) => ({
                                    ...prev,
                                    [casterClass.id]: e.target.value,
                                  }))
                                  setSpellLevelPages({})
                                }}
                                className="bg-card border-2 border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                              >
                                <option value="all">All levels</option>
                                {spellLevels.map((level) => (
                                  <option key={level} value={String(level)}>
                                    {formatSpellListGroupLabel(level)}
                                  </option>
                                ))}
                              </select>
                              {levelFilter !== "all" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSpellFilterLevelByClassId((prev) => ({
                                      ...prev,
                                      [casterClass.id]: "all",
                                    }))
                                    setSpellLevelPages({})
                                  }}
                                  className="px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                                >
                                  Show all levels
                                </button>
                              )}
                            </div>
                          )}

                          <div className="space-y-4">
                            {visibleLevels.map((level) => {
                              const levelSpells = spellsByLevel[level] ?? []
                              const pageKey = `${casterClass.id}:${level}`
                              const page = spellLevelPages[pageKey] ?? 0
                              const {
                                items: pageItems,
                                pageCount,
                                safePage,
                              } = paginateList(levelSpells, page, spellPickerPageSize)

                              const spellPickerSwipe =
                                cardViewMode === "cinematic" && useSwipeVisualPicker
                              const spellsToShow = spellPickerSwipe ? levelSpells : pageItems

                              return (
                                <div key={`${casterClass.id}-${level}`}>
                              <p className="text-xs font-bold text-primary uppercase mb-2">
                                    {formatSpellListGroupLabel(level)}
                                    <span className="text-muted-foreground font-normal ml-1">
                                      ({levelSpells.length})
                                    </span>
                              </p>
                              <SwipeVisualPicker
                                enabled={spellPickerSwipe}
                                className={
                                  cardViewMode === "cinematic"
                                    ? getCinematicSpellPickerContainerClass()
                                    : "grid grid-cols-2 md:grid-cols-3 gap-2"
                                }
                              >
                                    {spellsToShow.map((spell) => {
                                      const selected = classSpellIds.includes(spell.id)
                                      const selectable = canSelectSpell(
                                        spell,
                                        classSpellIds,
                                        spells,
                                        spellLimits,
                                        casterClass.name,
                                      )
                                      const toggleSpellPick = () => {
                                        if (!selectable && !selected) return
                                        setSpellPicksByClassId((prev) => {
                                          const current = prev[casterClass.id] ?? []
                                          const next = selected
                                            ? current.filter((id) => id !== spell.id)
                                            : [...current, spell.id]
                                          return { ...prev, [casterClass.id]: next }
                                        })
                                      }
                                      const openSpellDetails = () =>
                                        setDetailsModal({ type: "spell", item: spell })

                                      if (
                                        cardViewMode === "cinematic" &&
                                        resolveSpellCardImageUrl(spell)
                                      ) {
                                        const accent = getCompendiumItemAccentColor(
                                          spell as unknown as Record<string, unknown>,
                                        )
                                        return (
                                          <SpellSelectionCard
                                            key={spell.id}
                                            spell={spell}
                                            accentColor={accent}
                                            selected={selected}
                                            selectable={selectable}
                                            onToggle={toggleSpellPick}
                                            onDetails={openSpellDetails}
                                          />
                                        )
                                      }

                                      return (
                                        <BuilderSpellCompactPick
                                          key={spell.id}
                                          spell={spell}
                                          selected={selected}
                                          selectable={selectable}
                                          onToggle={toggleSpellPick}
                                          onDetails={openSpellDetails}
                                        />
                                      )
                                    })}
                              </SwipeVisualPicker>
                                  {pageCount > 1 && (
                                    <PickerGridPagination
                                      className={spellPickerSwipe ? "max-sm:hidden" : undefined}
                                      page={safePage}
                                      pageCount={pageCount}
                                      onPrevious={() =>
                                        setSpellLevelPages((prev) => ({
                                          ...prev,
                                          [pageKey]: Math.max(0, safePage - 1),
                                        }))
                                      }
                                      onNext={() =>
                                        setSpellLevelPages((prev) => ({
                                          ...prev,
                                          [pageKey]: Math.min(pageCount - 1, safePage + 1),
                                        }))
                                      }
                                      previousLabel={`Previous ${formatSpellListGroupLabel(level)}`}
                                      nextLabel={`Next ${formatSpellListGroupLabel(level)}`}
                                    />
                                  )}
                            </div>
                              )
                            })}
                          {availableSpells.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No spells found for {casterClass.name}.
                            </p>
                          )}
                          </div>
                        </div>
                      )
                    })}
              </div>
            )}

            {/* Step 6: Character Details */}
            {currentStep === BUILDER_STEP_IDS.DETAILS && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                <h2 className="text-2xl font-black text-foreground mb-2">Character Details</h2>
                    <p className={pageFloatingHintClass}>Give your character a name and personality.</p>
                  </div>
                  <button
                    type="button"
                    onClick={applyRandomCharacterDetails}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-border bg-card text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Wand2 className="w-4 h-4" />
                    Randomly generate
                  </button>
                </div>

                {multiclassAbilityIssues.length > 0 && (
                  <div className="rounded-xl border border-warning/50 bg-warning/10 p-4">
                    <p className="text-sm font-bold text-warning mb-2">Cannot save yet</p>
                    <ul className="space-y-1 text-xs text-foreground">
                      {multiclassAbilityIssues.map((issue) => (
                        <li key={`details-${issue.classId}-${issue.role}`}>
                          {formatMulticlassAbilityIssue(issue)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Portrait & banner uploads */}
                <div className="flex flex-col lg:flex-row gap-6 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                    {character.portrait_url ? (
                      <div className="relative">
                        <img
                          src={character.portrait_url}
                          alt="Portrait"
                          className="w-32 h-32 rounded-2xl object-cover border-4 border-border"
                        />
                        <button
                            onClick={() => patchCharacter({ portrait_url: null })}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                        <label className="w-32 h-32 bg-muted rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors px-2 text-center">
                        <Upload className="w-8 h-8 text-muted-foreground mb-1" />
                          <span className="text-xs font-medium text-foreground">Portrait</span>
                          <span className="text-[10px] leading-tight text-muted-foreground mt-1">
                            {formatImageUploadHint("portrait")}
                          </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePortraitUpload}
                          className="sr-only"
                        />
                      </label>
                    )}
                    </div>

                    <div className="relative flex-1 min-w-[200px]">
                      {character.banner_url ? (
                        <div className="relative">
                          <img
                            src={character.banner_url}
                            alt="Banner"
                            className="w-full h-32 rounded-2xl object-cover border-4 border-border"
                          />
                          <button
                            onClick={() => patchCharacter({ banner_url: null })}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="w-full h-32 bg-muted rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors px-4 text-center">
                          <Upload className="w-8 h-8 text-muted-foreground mb-1" />
                          <span className="text-xs font-medium text-foreground">Landscape banner (optional)</span>
                          <span className="text-[10px] leading-tight text-muted-foreground mt-1">
                            {formatImageUploadHint("banner")}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBannerUpload}
                            className="sr-only"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-2">Character Name *</label>
                    <input
                      type="text"
                      value={character.name}
                      onChange={(e) => patchCharacter({ name: e.target.value })}
                      placeholder="Enter character name"
                      className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Personality Traits</label>
                    <textarea
                      value={character.personality_traits}
                      onChange={(e) => patchCharacter({ personality_traits: e.target.value })}
                      placeholder="Describe your character's personality..."
                      rows={3}
                      className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Ideals</label>
                    <textarea
                      value={character.ideals}
                      onChange={(e) => patchCharacter({ ideals: e.target.value })}
                      placeholder="What principles guide your character?"
                      rows={3}
                      className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Bonds</label>
                    <textarea
                      value={character.bonds}
                      onChange={(e) => patchCharacter({ bonds: e.target.value })}
                      placeholder="What connections matter most to your character?"
                      rows={3}
                      className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Flaws</label>
                    <textarea
                      value={character.flaws}
                      onChange={(e) => patchCharacter({ flaws: e.target.value })}
                      placeholder="What weaknesses does your character have?"
                      rows={3}
                      className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Backstory</label>
                  <textarea
                    value={character.backstory}
                    onChange={(e) => patchCharacter({ backstory: e.target.value })}
                    placeholder="Tell your character's story..."
                    rows={5}
                    className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

            <div className="flex flex-col items-end gap-2 mt-6 pt-4 border-t border-border">
              <BuilderStepNav
                currentStep={currentStep}
                canProceed={canProceed()}
                proceedBlockers={proceedBlockers}
                canSave={canSaveCharacter()}
                saving={saving}
                onBack={goBackStep}
                onContinue={advanceStep}
                onSave={saveCharacter}
                saveLabel={editingCharacterId ? "Save Character" : "Create Character"}
                lastStep={BUILDER_STEP_IDS.DETAILS}
              />
            </div>
          </div>

          {/* Right Column: Character Sheet Preview */}
          <div
            id="builder-preview"
            className={`lg:col-span-2 ${mobilePanel === "steps" ? "hidden lg:block" : ""}`}
          >
            <div className="builder-preview-panel bg-card rounded-2xl border-2 border-border p-4 lg:sticky lg:top-24 flex flex-col min-h-[720px] lg:h-[calc(100vh-7rem)] lg:min-h-0">
              {/* Header with name, classes and hit die */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-black text-foreground truncate" style={{ fontFamily: "var(--font-display)" }}>
                  {character.name || "New Character"}
                </h3>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">Lv</span>
                  <span className="text-xl font-black text-warning">{totalLevel}</span>
                  {primaryClass && (
                    <span className="px-1.5 py-0.5 bg-destructive/10 text-destructive text-[10px] font-bold rounded ml-1">
                      d{primaryClass.hit_die}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Class & Origin line */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3 flex-wrap">
                {characterClasses.length > 0 ? (
                  characterClasses.map((cls, i) => (
                    <span key={`${cls.id ?? "class"}-${i}`}>
                      {i > 0 && <span className="mx-1">/</span>}
                      <span
                        className={
                          cls.id === resolvedPrimaryClassId
                            ? "text-primary font-medium"
                            : "text-secondary font-medium"
                        }
                      >
                        {cls.name} {cls.level}
                      </span>
                    </span>
                  ))
                ) : primaryClass ? (
                  <span className="text-primary font-medium">{primaryClass.name}</span>
                ) : null}
                {selectedSpecies && <span className="mx-1">-</span>}
                {selectedSpecies && <span>{selectedSpecies.name}</span>}
                {selectedBackground && <span className="mx-1">-</span>}
                {selectedBackground && <span>{selectedBackground.name}</span>}
              </div>
              
              {/* Preview Tabs */}
              <div className="flex gap-1 mb-3 border-b border-border">
                {[
                  { id: "summary", label: "Summary", icon: UserCircle },
                  { id: "features", label: "Features", icon: Sparkles },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setPreviewTab(tab.id as typeof previewTab)}
                    className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${
                      previewTab === tab.id
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <tab.icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                ))}
              </div>
              
              <div className="flex-1 min-h-0 flex flex-col">
              {/* Summary Tab */}
              {previewTab === "summary" && (
                <div className="space-y-3">
                  {/* Ability Scores - horizontal row */}
                  <div className="grid grid-cols-6 gap-1">
                    {ABILITY_NAMES.map((ability) => {
                      const score = effectiveAbilityScores[ability]
                      const mod = abilityMods[ability]
                      return (
                        <div key={ability} className="text-center">
                          <GameIcon
                            name={ABILITY_GAME_ICONS[ability]}
                            className="w-4 h-4 mx-auto text-primary mb-0.5"
                          />
                          <p className="text-[8px] text-muted-foreground uppercase font-bold">{ability.slice(0, 3)}</p>
                          <p className="text-sm font-black text-foreground">{score}</p>
                          <p className="text-[10px] text-primary font-bold">{mod >= 0 ? `+${mod}` : mod}</p>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Two column layout */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Left column - Skills */}
                    <div className="space-y-2">
                      {/* Skills */}
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <GameIcon name={PREVIEW_SECTION_ICONS.skills} className="w-4 h-4 text-muted-foreground shrink-0" />
                          <p className="text-sm text-muted-foreground uppercase font-bold">Skills</p>
                        </div>
                        <div className="grid grid-cols-1 gap-0.5 text-xs">
                          {SKILLS_DATA.map((skill) => {
                            const isProficient = effectiveSkillProficiencies.includes(skill.name)
                            const hasExpertise = effectiveSkillExpertise.includes(skill.name)
                            const mod =
                              abilityMods[skill.ability] +
                              (isProficient ? proficiencyBonus * (hasExpertise ? 2 : 1) : 0)
                            const abilityAbbr = skill.ability.slice(0, 3).toUpperCase()
                            return (
                              <div key={skill.name} className={`flex justify-between ${isProficient ? "text-foreground font-bold" : "text-muted-foreground"}`}>
                                <span>{skill.name} <span className="text-[8px] opacity-60">({abilityAbbr})</span></span>
                                <span>{mod >= 0 ? `+${mod}` : mod}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right column - Combat Stats */}
                    <div className="space-y-2">
                      {/* Top row: AC and HP */}
                      <div className="grid grid-cols-2 gap-1">
                        <div className="p-1.5 bg-muted/50 rounded-lg text-center">
                          <Shield className="w-3 h-3 mx-auto text-secondary mb-0.5" />
                          <p className="text-[7px] text-muted-foreground uppercase">AC</p>
                          <p className="text-base font-black text-secondary">{armorClass}</p>
                        </div>
                        <div className="p-1.5 bg-muted/50 rounded-lg text-center">
                          <Heart className="w-3 h-3 mx-auto text-destructive mb-0.5" />
                          <p className="text-[7px] text-muted-foreground uppercase">HP</p>
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={Number.isFinite(maxHp) ? maxHp : undefined}
                              value={currentHp ?? maxHp}
                              onChange={(e) => {
                                const next = parseInt(e.target.value, 10)
                                const cap = Number.isFinite(maxHp) ? maxHp : 999
                                setCurrentHp(
                                  Number.isNaN(next)
                                    ? 0
                                    : Math.min(cap, Math.max(0, next)),
                                )
                              }}
                              className="w-12 text-center bg-background border border-border rounded px-1 py-0.5 text-sm font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <span className="text-[10px] text-muted-foreground">/ {maxHp}</span>
                          </div>
                          {tempHp > 0 && <p className="text-[8px] text-cyan">+{tempHp}</p>}
                        </div>
                        <div className="p-1.5 bg-muted/50 rounded-lg text-center">
                          <Eye className="w-3 h-3 mx-auto text-cyan mb-0.5" />
                          <p className="text-[7px] text-muted-foreground uppercase">Darkvision</p>
                          <p className="text-base font-black text-cyan">{Number(darkvision) > 0 ? `${darkvision} ft` : "—"}</p>
                        </div>
                      </div>
                      
                      {/* Second row: Speed and Initiative */}
                      <div className="grid grid-cols-2 gap-1">
                        <div className="p-1.5 bg-muted/50 rounded-lg text-center">
                          <GameIcon name={PREVIEW_STAT_ICONS.speed} className="w-3 h-3 mx-auto text-accent mb-0.5" />
                          <p className="text-[7px] text-muted-foreground uppercase">Speed</p>
                          <p className="text-base font-black text-accent">{speed} ft</p>
                        </div>
                        <div className="p-1.5 bg-muted/50 rounded-lg text-center">
                          <GameIcon name={PREVIEW_STAT_ICONS.initiative} className="w-3 h-3 mx-auto text-lime mb-0.5" />
                          <p className="text-[7px] text-muted-foreground uppercase">Initiative</p>
                          <p className="text-base font-black text-lime">{initiative >= 0 ? `+${initiative}` : initiative}</p>
                        </div>
                      </div>
                      
                      {/* Third row: Proficiency and Passive Perception */}
                      <div className="grid grid-cols-2 gap-1">
                        <div className="p-1.5 bg-muted/50 rounded-lg text-center">
                          <GameIcon name={PREVIEW_STAT_ICONS.proficiency} className="w-3 h-3 mx-auto text-lime mb-0.5" />
                          <p className="text-[7px] text-muted-foreground uppercase">Proficiency</p>
                          <p className="text-base font-black text-lime">+{proficiencyBonus}</p>
                        </div>
                        <div className="p-1.5 bg-muted/50 rounded-lg text-center">
                          <GameIcon
                            name={PREVIEW_STAT_ICONS.passivePerception}
                            className="w-3 h-3 mx-auto text-foreground mb-0.5"
                          />
                          <p className="text-[7px] text-muted-foreground uppercase">Pass. Perc.</p>
                          <p className="text-base font-black text-foreground">{passivePerception}</p>
                        </div>
                      </div>

                      {/* Saving Throws */}
                      <div className="p-2 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <GameIcon name={PREVIEW_SECTION_ICONS.saves} className="w-4 h-4 text-muted-foreground shrink-0" />
                          <p className="text-sm text-muted-foreground uppercase font-bold">Saves</p>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 text-[9px]">
                          {ABILITY_NAMES.map((ability) => {
                            const isProficient = savingThrowProficiencies.includes(ability.charAt(0).toUpperCase() + ability.slice(1))
                            const mod = abilityMods[ability] + (isProficient ? proficiencyBonus : 0)
                            return (
                              <div key={ability} className={`flex justify-between ${isProficient ? "text-foreground font-bold" : "text-muted-foreground"}`}>
                                <span>{ability.slice(0, 3).toUpperCase()}</span>
                                <span>{mod >= 0 ? `+${mod}` : mod}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {primaryClass?.spellcasting &&
                        (() => {
                          const spellKey = resolveSpellcastingAbilityKey(primaryClass.spellcasting.ability)
                          if (!spellKey) return null
                          const spellMod = abilityMods[spellKey]
                          return (
                    <div className="p-2 bg-magenta/10 rounded-lg">
                              <p className="text-[9px] text-magenta uppercase font-bold mb-1">
                                Spellcasting ({primaryClass.spellcasting.ability})
                              </p>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div>
                          <p className="text-[8px] text-muted-foreground">Spell Save DC</p>
                                  <p className="text-lg font-black text-magenta">
                                    {8 + proficiencyBonus + spellMod}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] text-muted-foreground">Spell Attack</p>
                                  <p className="text-lg font-black text-magenta">
                                    +{proficiencyBonus + spellMod}
                          </p>
                        </div>
                      </div>
                    </div>
                          )
                        })()}
                  </div>
                  </div>
                </div>
              )}
              
              {/* Features Tab */}
              {previewTab === "features" && (
                <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
                  {/* Class Features */}
                  {characterClasses.length > 0 ? (
                    characterClasses.map((cls, i) => (
                      <div key={`${cls.id ?? "class"}-${i}`}>
                        <p className="text-[9px] text-primary uppercase font-bold mb-1">{cls.name} Features</p>
                        <div className="space-y-1">
                          {(cls.features ?? [])
                            .filter((f) => f.level <= cls.level)
                            .map((feature, i) => (
                            <div key={i} className="p-1.5 bg-muted/30 rounded text-[10px]">
                              <p className="font-bold text-foreground">{feature.name} <span className="text-muted-foreground">(Lv {feature.level})</span></p>
                              <ClampedRichText html={feature.description} lines={2} className="text-[10px]" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : primaryClass?.features ? (
                    <div>
                      <p className="text-[9px] text-primary uppercase font-bold mb-1">{primaryClass.name} Features</p>
                      <div className="space-y-1">
                        {(primaryClass.features ?? [])
                          .filter((f) => f.level <= totalLevel)
                          .map((feature, i) => (
                          <div key={i} className="p-1.5 bg-muted/30 rounded text-[10px]">
                            <p className="font-bold text-foreground">{feature.name} <span className="text-muted-foreground">(Lv {feature.level})</span></p>
                            <ClampedRichText html={feature.description} lines={2} className="text-[10px]" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Select a class to see features</p>
                  )}
                  
                  {/* Species Traits */}
                  {selectedSpecies?.traits && selectedSpecies.traits.length > 0 && (
                    <div>
                      <p className="text-[9px] text-secondary uppercase font-bold mb-1">{selectedSpecies.name} Traits</p>
                      <div className="space-y-1">
                        {selectedSpecies.traits.map((trait, i) => (
                          <div key={i} className="p-1.5 bg-muted/30 rounded text-[10px]">
                            <p className="font-bold text-foreground">{trait.name}</p>
                            <ClampedRichText html={trait.description} lines={2} className="text-[10px]" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Background Feature */}
                  {selectedBackground?.feature && (
                    <div>
                      <p className="text-[9px] text-accent uppercase font-bold mb-1">Background Feature</p>
                      <div className="p-1.5 bg-muted/30 rounded text-[10px]">
                        <p className="font-bold text-foreground">{selectedBackground.feature.name}</p>
                        <ClampedRichText
                          html={selectedBackground.feature.description}
                          lines={3}
                          className="text-[10px]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Origin feat from background */}
                  {effectiveBackgroundFeatGranted && (
                    <div>
                      <p className="text-[9px] text-lime uppercase font-bold mb-1">Origin Feat</p>
                      <div className="p-1.5 bg-muted/30 rounded text-[10px]">
                        <p className="font-bold text-foreground">
                          {backgroundGrantedFeat?.name ?? effectiveBackgroundFeatGranted}
                        </p>
                        <ClampedRichText
                          html={backgroundGrantedFeat?.description}
                          lines={2}
                          className="text-[10px]"
                          fallback="Granted by your background at 1st level."
                        />
                      </div>
                </div>
              )}
              
                  {/* Level-based feats */}
                  {selectedFeatIds.filter(Boolean).length > 0 && (
                    <div>
                      <p className="text-[9px] text-warning uppercase font-bold mb-1">General Feats & Epic Boons</p>
                      <div className="space-y-1">
                        {selectedFeatIds.filter(Boolean).map((featId) => {
                          const feat = feats.find((f) => f.id === featId)
                          if (!feat) return null
                          return (
                            <div key={featId} className="p-1.5 bg-muted/30 rounded text-[10px]">
                              <p className="font-bold text-foreground">{feat.name}</p>
                              <ClampedRichText html={feat.description} lines={2} className="text-[10px]" />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold mb-1">Proficiencies</p>
                    <div className="space-y-1">
                      <div className="p-1.5 bg-muted/30 rounded text-[10px]">
                        <p className="font-bold text-foreground">Weapons</p>
                        <p className="text-muted-foreground italic">
                          {effectiveWeaponProficiencies.join(", ") || "None"}
                        </p>
                          </div>
                      <div className="p-1.5 bg-muted/30 rounded text-[10px]">
                        <p className="font-bold text-foreground">Armor</p>
                        <p className="text-muted-foreground italic">
                          {effectiveArmorProficiencies.join(", ") || "None"}
                        </p>
                      </div>
                      <div className="p-1.5 bg-muted/30 rounded text-[10px] space-y-1">
                        <div>
                          <p className="font-bold text-foreground">Tools</p>
                          <p className="text-muted-foreground italic">
                            {partitionedToolProficiencies.tools.join(", ") || "None"}
                      </p>
                    </div>
                        <div>
                          <p className="font-bold text-foreground">Instruments</p>
                          <p className="text-muted-foreground italic">
                            {partitionedToolProficiencies.instruments.join(", ") || "None"}
                          </p>
                </div>
            </div>
                      <div className="p-1.5 bg-muted/30 rounded text-[10px]">
                        <p className="font-bold text-foreground">Languages</p>
                        <p className="text-muted-foreground italic">
                          {(character.languages ?? []).join(", ") || "None"}
                        </p>
          </div>
        </div>
              </div>
              
                    <div>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold mb-1">Resistances</p>
                    <div className="p-1.5 bg-muted/30 rounded text-[10px]">
                      <p className="text-muted-foreground italic">
                        {resistanceDisplay.length > 0 ? resistanceDisplay.join(", ") : "None"}
                      </p>
                    </div>
                  </div>

                  {immunityDisplay.length > 0 && (
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold mb-1">Immunities</p>
                      <div className="p-1.5 bg-muted/30 rounded text-[10px]">
                        <p className="text-muted-foreground italic">{immunityDisplay.join(", ")}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
                  </div>
                          </div>
                      </div>
                    </div>
      </main>
      
      {/* Details overlay */}
      {detailsModal.item && detailsModal.type && (() => {
        const item = detailsModal.item
        const accent = getCompendiumItemAccentColor(item as unknown as Record<string, unknown>)
        const close = () => setDetailsModal({ type: null, item: null })

        if (detailsModal.type === "class") {
          const cls = item as DndClass
          const accentStyles = compendiumAccentColorStyles(accent)
          const baseFeatures = getClassDetailBaseFeatures(cls)
          const classSubclasses = subclasses
            .filter((subclass) => subclass.class_id === cls.id)
            .sort((a, b) => a.name.localeCompare(b.name))
          return (
            <CompendiumDetailOverlay
              open
              onClose={close}
              item={cls}
              imageCrop="top"
              panelWidth="portrait"
              enableCardImage
              subtitle={cls.source || "Custom"}
              tagline={getCompendiumCardBlurb(cls).toUpperCase()}
              tags={[
                ...(cls.primary_ability?.length
                  ? [{ label: cls.primary_ability.join(" • ").toUpperCase(), emphasis: true }]
                  : []),
                { label: `D${cls.hit_die} HIT DIE` },
                ...getClassDetailHeroBadges(cls),
              ]}
              accentColor={accent}
              detailScroll={false}
            >
              <div className="grid h-full grid-cols-2 gap-3 overflow-hidden md:gap-4">
                <div className="min-w-0 overflow-hidden">
                  <p className={cn("text-[10px] font-bold uppercase tracking-widest", accentStyles.cardFooterText)}>
                    Class highlights
                  </p>
                  <h3 className="font-serif text-sm font-bold text-white">How it feels to play</h3>
                  <p className="mt-1 text-[11px] leading-snug text-white/75 line-clamp-3">
                    {getCompendiumCardBlurb(cls) || compendiumCardBlurb(cls.description)}
                  </p>
                  <ClassComplexityDisplay cls={cls} className="mt-2" labelClassName={accentStyles.cardFooterText} />
                </div>
                <div className="min-w-0 overflow-hidden">
                  <h3 className="font-serif text-sm font-bold text-white">Class features</h3>
                  {baseFeatures.length > 0 ? (
                    <div className="mt-1">
                      <ClassDetailFeatureList
                        features={baseFeatures}
                        accentClassName={accentStyles.cardFooterText}
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-white/70">No class features listed.</p>
                  )}
                  {classSubclasses.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {classSubclasses.map((subclass) => (
                        <li key={subclass.id} className="min-w-0">
                          <p className="text-[11px] font-semibold leading-tight text-white/90">
                            {subclass.name}
                            <span className="ml-1 text-[9px] font-bold uppercase tracking-wide text-white/45">
                              Subclass
                            </span>
                          </p>
                          {subclass.description ? (
                            <p className="text-[10px] leading-snug text-white/60 line-clamp-1">
                              {compendiumCardBlurb(subclass.description)}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </CompendiumDetailOverlay>
          )
        }

        if (detailsModal.type === "species") {
          const sp = item as Species
          const accentStyles = compendiumAccentColorStyles(accent)
          const traits = sp.traits ?? []
          const [traitsColA, traitsColB] = splitSpeciesTraits(traits)
          const speedFt =
            typeof sp.speed === "object" ? sp.speed.walking ?? 30 : sp.speed ?? 30
          return (
            <CompendiumDetailOverlay
              open
              onClose={close}
              item={sp}
              imageCrop="top"
              panelWidth="portrait-species"
              enableCardImage
              subtitle={sp.source || "Custom"}
              tagline={getCompendiumCardBlurb(sp).toUpperCase()}
              accentColor={accent}
              detailScroll={false}
            >
              <div className="grid h-full gap-3 overflow-hidden md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.1fr)_minmax(0,1.05fr)] md:gap-4">
                <div className="min-w-0 overflow-hidden">
                  <p className={cn("text-[10px] font-bold uppercase tracking-widest", accentStyles.cardFooterText)}>
                    Species highlights
                  </p>
                  <h3 className="font-serif text-sm font-bold text-white">What sets them apart</h3>
                  <p className="mt-1 text-[11px] leading-snug text-white/75 line-clamp-4">
                    {getCompendiumCardBlurb(sp) || compendiumCardBlurb(sp.description)}
                  </p>
                  <dl className="mt-3 space-y-1 text-[10px] text-white/65">
                    <div className="flex gap-2">
                      <dt className="font-bold uppercase tracking-wide text-white/45">Size</dt>
                      <dd>{String(sp.size || "Medium")}</dd>
                </div>
                    <div className="flex gap-2">
                      <dt className="font-bold uppercase tracking-wide text-white/45">Speed</dt>
                      <dd>{speedFt} ft.</dd>
                    </div>
                  </dl>
                </div>
                <div className="min-w-0 overflow-hidden">
                  <h3 className="font-serif text-sm font-bold text-white">Traits</h3>
                  {traitsColA.length > 0 ? (
                    <div className="mt-1">
                      <SpeciesDetailTraitList traits={traitsColA} />
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-white/70">No traits listed.</p>
                  )}
                </div>
                <div className="min-w-0 overflow-hidden">
                  {traitsColB.length > 0 ? (
                    <div className="mt-5">
                      <SpeciesDetailTraitList traits={traitsColB} />
                    </div>
                  ) : traitsColA.length === 0 ? (
                    <p className="mt-5 text-[11px] text-white/70">No traits listed.</p>
                  ) : null}
                </div>
              </div>
            </CompendiumDetailOverlay>
          )
        }

        if (detailsModal.type === "background") {
          const bg = item as Background
          return (
            <CompendiumDetailOverlay
              open
              onClose={close}
              item={bg}
              enableCardImage
              subtitle={bg.source || "Custom"}
              tags={bg.feat_granted ? [{ label: `FEAT: ${bg.feat_granted}`, emphasis: true }] : []}
              accentColor={accent}
              detailScroll={false}
            >
              <BackgroundDetailStrip background={bg} feats={feats} spells={spells} />
            </CompendiumDetailOverlay>
          )
        }

        if (detailsModal.type === "spell") {
          const spell = item as Spell
          return (
            <CompendiumDetailOverlay
              open
              onClose={close}
              item={spell}
              subtitle={spell.school}
              imageCrop="top"
              panelWidth={cardViewMode === "cinematic" ? "portrait-spell" : "default"}
              tags={[
                { label: spell.level === 0 ? "CANTRIP" : `LEVEL ${spell.level}`, emphasis: true },
                ...(spell.concentration ? [{ label: "CONCENTRATION" }] : []),
              ]}
              accentColor={accent}
            >
              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                <div><span className="text-white/50">Casting Time:</span> {spell.casting_time}</div>
                <div><span className="text-white/50">Range:</span> {spell.range}</div>
                <div><span className="text-white/50">Duration:</span> {spell.duration}</div>
                <div><span className="text-white/50">Components:</span> {spell.components?.join(", ")}</div>
              </div>
              <RichTextContent html={spell.description} />
            </CompendiumDetailOverlay>
          )
        }

        if (detailsModal.type === "equipment") {
          const eq = item as Equipment
          return (
            <CompendiumDetailOverlay
              open
              onClose={close}
              item={eq}
              enableCardImage={false}
              subtitle={eq.category}
              accentColor={accent}
            >
              {eq.description && <RichTextContent html={eq.description} className="text-sm" />}
            </CompendiumDetailOverlay>
          )
        }

        if (detailsModal.type === "feat") {
          const feat = item as Feat
          return (
            <CompendiumDetailOverlay
              open
              onClose={close}
              item={feat}
              enableCardImage={false}
              subtitle={feat.category ?? feat.source ?? "Feat"}
              tags={[
                ...(feat.category
                  ? [{ label: feat.category.toUpperCase(), emphasis: true }]
                  : []),
                ...(feat.level_requirement && feat.level_requirement > 1
                  ? [{ label: `LEVEL ${feat.level_requirement}+` }]
                  : []),
                ...(feat.repeatable ? [{ label: "REPEATABLE" }] : []),
              ]}
              accentColor={accent}
            >
              {feat.description?.trim() ? (
                <RichTextContent html={feat.description} />
              ) : (
                <p className="text-sm text-white/70">No description available.</p>
              )}
              {feat.prerequisite?.trim() && (
                <div className="mt-4">
                  <p className="text-xs uppercase text-white/50 mb-1">Prerequisite</p>
                  <p className="text-sm">{feat.prerequisite}</p>
                </div>
              )}
            </CompendiumDetailOverlay>
          )
        }

        return null
      })()}
    </div>
  )
}
