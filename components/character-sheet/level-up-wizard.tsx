"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUp, Check, ChevronLeft, ChevronRight, Dices, X } from "lucide-react"
import { AsiAllocator } from "@/components/builder/asi-allocator"
import { FeatModifierChoicePicker } from "@/components/builder/feat-modifier-choice-picker"
import { ModifierPlayerChoicePanel } from "@/components/builder/modifier-player-choice-panel"
import { MultiSelectChoices } from "@/components/builder/multi-select-choices"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import { createClient } from "@/lib/db/client"
import {
  attachClassDetails,
  normalizeCharacterClassRows,
  type CharacterClassDetail,
} from "@/lib/character/character-classes"
import { collectAsiPoolsFromFeat } from "@/lib/character/feat-asi-pools"
import {
  levelUpFeatAllocationPrefix,
  levelUpFeatSlotKey,
  mergeLevelUpFeatPersist,
  normalizeAsiAllocationsMap,
} from "@/lib/character/level-up-feat"
import {
  averageHpGain,
  rollHitDie,
  rolledHpGain,
} from "@/lib/character/level-up-improvements"
import { loadModifierCatalog } from "@/lib/compendium/ensure-modifier-catalog"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import {
  buildLevelUpPlan,
  countReplacedPicks,
  spellsEligibleForLevelUp,
  type LevelUpPlan,
} from "@/lib/character/level-up-plan"
import { resolveFeatureChoiceOptions } from "@/lib/builder/aggregate-psionic-talents"
import {
  isAsiFeat,
  isValidAsiAllocation,
  type AsiAllocation,
  type AsiAllocationsByFeatId,
} from "@/lib/builder/asi-allocation"
import {
  featChoicePickKey,
  validateFeatModifierChoices,
} from "@/lib/builder/feat-choices"
import { isFeatEligibleForCategories } from "@/lib/builder/feat-selection"
import {
  magicInitiateSourceKeysForCharacter,
  takenMagicInitiateSpellLists,
} from "@/lib/builder/magic-initiate"
import { getEffectiveBackgroundFeatGranted } from "@/lib/compendium/background-origin-feat"
import {
  clearModifierPicksForSource,
  collectModifierPlayerChoiceSlots,
  optionsForExpertiseSlot,
  optionsForProficiencyGrantSlot,
  setModifierPlayerPickValue,
  validateModifierPlayerChoices,
} from "@/lib/builder/modifier-player-choices"
import {
  isSkillProficiencyChoice,
  mergeSkillProficiencyNames,
  resolveSkillChoiceOptions,
  type SkillChoiceOption,
} from "@/lib/builder/skill-overlap"
import {
  characterHasFightingStyleAccess,
  levelUpFeatCategories,
} from "@/lib/builder/fighting-style-access"
import {
  resolveChoiceOptionDescription,
  shouldShowNamedChoiceSummaries,
} from "@/lib/compendium/choice-option-description"
import { mergeAlchemistDiscoveryPicks } from "@/lib/compendium/alchemist-feature-wiring"
import { normalizeBuilderPicks } from "@/lib/builder/builder-picks"
import { withChosenOptionChrome } from "@/lib/character/chosen-option-label"
import { enrichFeatsList } from "@/lib/compendium/normalize-feats"
import { enrichClassesList } from "@/lib/compendium/normalize-class-data"
import { enrichSpeciesList } from "@/lib/compendium/normalize-species-traits"
import { asCompendiumRows } from "@/lib/data/types"
import type {
  Character,
  CustomAbility,
  DndClass,
  Equipment,
  Feat,
  Species,
  Spell,
  Subclass,
} from "@/lib/types"
import { ABILITY_SCORE_KEYS, type AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import { LevelUpSubclassPicker } from "@/components/character-sheet/level-up-subclass-picker"
import { CompendiumDetailOverlay } from "@/components/compendium/compendium-detail-overlay"
import { spellCastingDetailRows, spellDetailOverlayTags } from "@/lib/compendium/spell-detail-tags"
import { getCompendiumItemAccentColor } from "@/lib/compendium/theme-colors"
import { useBuilderLayout } from "@/components/settings/use-builder-layout"
import { useIsPhonePickerScreen } from "@/hooks/use-picker-page-size"
import { cn } from "@/lib/utils"

type LevelUpWizardProps = {
  characterId: string
  open: boolean
  onClose: () => void
  onComplete?: () => void
}

type Loaded = {
  character: Character
  classDetails: CharacterClassDetail[]
  subclasses: Subclass[]
  feats: Feat[]
  spells: Spell[]
  equipment: Equipment[]
  customAbilities: CustomAbility[]
  modifierCatalog: ModifierCatalogEntry[]
  species: Species | null
  featGranted: string | null
}

type HpMethod = "average" | "roll"

function conModFromScore(score: number): number {
  return Math.floor((score - 10) / 2)
}

/** Constitution after pending ASI allocations (so HP gain uses the bump from this level). */
function constitutionAfterAsi(
  character: Character,
  allocations: AsiAllocationsByFeatId,
): number {
  let score = character.constitution ?? 10
  for (const allocation of Object.values(allocations)) {
    score += allocation.constitution ?? 0
  }
  return score
}

export function LevelUpWizard({ characterId, open, onClose, onComplete }: LevelUpWizardProps) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [classId, setClassId] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [choicePicks, setChoicePicks] = useState<Record<string, string[]>>({})
  const [modifierPicks, setModifierPicks] = useState<Record<string, string[]>>({})
  const [subclassId, setSubclassId] = useState<string | null>(null)
  const [featIdsByStep, setFeatIdsByStep] = useState<Record<string, string>>({})
  const [featAsiAllocations, setFeatAsiAllocations] = useState<AsiAllocationsByFeatId>({})
  const [featChoicePicks, setFeatChoicePicks] = useState<Record<string, string[]>>({})
  const [spellIds, setSpellIds] = useState<string[]>([])
  const [cantripIds, setCantripIds] = useState<string[]>([])
  const [hpMethod, setHpMethod] = useState<HpMethod>("average")
  const [hpNatural, setHpNatural] = useState<number | null>(null)
  const { layout: builderLayout } = useBuilderLayout()
  const isPhonePickerScreen = useIsPhonePickerScreen()
  const visualBuilder = builderLayout === "visual"

  useEffect(() => {
    if (!open || !characterId) return
    let cancelled = false
    const load = async () => {
      setError(null)
      const db = createClient()
      const [
        { data: character },
        { data: classes },
        { data: subclasses },
        { data: feats },
        { data: spells },
        { data: equipment },
        { data: customAbilities },
        { data: speciesRows },
        { data: backgrounds },
        modifierCatalog,
      ] = await Promise.all([
        db.from("characters").select("*").eq("id", characterId).single(),
        db.from("classes").select("*"),
        db.from("subclasses").select("*"),
        db.from("feats").select("*"),
        db.from("spells").select("*"),
        db.from("equipment").select("*"),
        db.from("custom_abilities").select("*"),
        db.from("species").select("*"),
        db.from("backgrounds").select("id, feat_granted"),
        loadModifierCatalog(db),
      ])
      if (cancelled) return
      if (!character) {
        setError("Could not load character.")
        return
      }
      const char = character as Character
      const classRows = normalizeCharacterClassRows(char)
      const enrichedClasses = enrichClassesList(
        asCompendiumRows(classes) as unknown as DndClass[],
      )
      const classDetails = attachClassDetails(
        classRows,
        enrichedClasses,
        asCompendiumRows(subclasses) as unknown as Subclass[],
      )
      const enrichedFeats = enrichFeatsList(
        asCompendiumRows(feats) as unknown as Array<{
          name: string
          source?: string | null
        }>,
        modifierCatalog,
      )
      const enrichedSpecies = enrichSpeciesList(
        asCompendiumRows(speciesRows) as unknown as Species[],
      )
      const background = asCompendiumRows<{ id: string; feat_granted: string | null }>(
        backgrounds,
      ).find((row) => row.id === char.background_id)
      setLoaded({
        character: char,
        classDetails,
        subclasses: asCompendiumRows(subclasses) as unknown as Subclass[],
        feats: enrichedFeats,
        spells: asCompendiumRows(spells) as unknown as Spell[],
        equipment: asCompendiumRows(equipment) as unknown as Equipment[],
        customAbilities: asCompendiumRows(customAbilities) as unknown as CustomAbility[],
        modifierCatalog,
        species: enrichedSpecies.find((row) => row.id === char.species_id) ?? null,
        featGranted: getEffectiveBackgroundFeatGranted(
          background ?? null,
          char.feature_choice_picks ?? {},
        ),
      })
      setClassId(classDetails[0]?.row.class_id ?? null)
      setChoicePicks(mergeAlchemistDiscoveryPicks(char.feature_choice_picks ?? {}))
      setModifierPicks(char.modifier_player_picks ?? {})
      setStepIndex(0)
      setSubclassId(null)
      setFeatIdsByStep({})
      setFeatAsiAllocations({})
      setFeatChoicePicks(char.feat_choice_picks ?? {})
      setSpellIds([])
      setCantripIds([])
      setHpMethod("average")
      setHpNatural(null)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open, characterId])

  const selectedEntry = loaded?.classDetails.find((entry) => entry.row.class_id === classId) ?? null
  const plan: LevelUpPlan | null = useMemo(() => {
    if (!loaded || !selectedEntry) return null
    const builderPicks = normalizeBuilderPicks(loaded.character.builder_picks)
    return buildLevelUpPlan({
      entry: selectedEntry,
      subclasses: loaded.subclasses,
      currentTotalLevel: loaded.character.level,
      featureChoicePicks: loaded.character.feature_choice_picks ?? {},
      modifierPlayerPicks: loaded.character.modifier_player_picks ?? {},
      modifierCatalog: loaded.modifierCatalog,
      species: loaded.species,
      speciesTraitPicks: builderPicks.species_trait_picks ?? {},
      spells: loaded.spells,
    })
  }, [loaded, selectedEntry])

  const wizardSteps = plan?.steps ?? []
  const current = wizardSteps[stepIndex] ?? null
  const isReview = Boolean(plan) && stepIndex >= wizardSteps.length
  const visualSubclassScreen = visualBuilder && current?.kind === "subclass"
  const levelUpModifierSlots = wizardSteps.flatMap((step) =>
    step.kind === "modifier_choice" ? [step.slot] : [],
  )

  const activeFeatStep = current?.kind === "feat_or_asi" ? current : null
  const featId = activeFeatStep ? featIdsByStep[activeFeatStep.id] ?? null : null

  const magicInitiateFeatId = useMemo(
    () => loaded?.feats.find((feat) => /^magic initiate$/i.test(feat.name.trim()))?.id ?? null,
    [loaded?.feats],
  )
  const magicInitiateSourceKeys = useMemo(
    () =>
      magicInitiateSourceKeysForCharacter(
        magicInitiateFeatId,
        loaded?.character.feature_choice_picks ?? {},
      ),
    [loaded?.character.feature_choice_picks, magicInitiateFeatId],
  )
  const takenMagicInitiateLists = useMemo(() => {
    if (!loaded) return []
    return [
      ...takenMagicInitiateSpellLists(levelUpModifierSlots, modifierPicks, null, {
        featGranted: loaded.featGranted,
        additionalSourceKeys: magicInitiateSourceKeys,
      }),
    ]
  }, [loaded, levelUpModifierSlots, modifierPicks, magicInitiateSourceKeys])

  const eligibleFeats = useMemo(() => {
    if (!loaded) return []
    const ownedFeatIds = loaded.character.feat_ids ?? []
    const hasFightingStyleAccess = characterHasFightingStyleAccess({
      classDetails: loaded.classDetails,
      ownedFeatIds,
      feats: loaded.feats,
    })
    const categories =
      activeFeatStep?.featCategories?.length
        ? activeFeatStep.featCategories
        : levelUpFeatCategories(hasFightingStyleAccess)
    const milestoneLevel = plan?.toLevel ?? 1
    return loaded.feats
      .filter((feat) =>
        isFeatEligibleForCategories(feat, categories, milestoneLevel, {
          totalLevel: plan?.newTotalLevel ?? milestoneLevel,
          classIds: loaded.classDetails.map((entry) => entry.row.class_id),
          feats: loaded.feats,
          ownedFeatIds,
          speciesId: loaded.character.species_id,
          backgroundId: loaded.character.background_id,
          hasFightingStyleAccess,
          takenMagicInitiateSpellLists: takenMagicInitiateLists,
        }),
      )
      .slice()
      .sort((a, b) => {
        const aAsi = isAsiFeat(a) ? 0 : 1
        const bAsi = isAsiFeat(b) ? 0 : 1
        if (aAsi !== bAsi) return aAsi - bAsi
        return a.name.localeCompare(b.name)
      })
  }, [
    activeFeatStep?.featCategories,
    loaded,
    plan?.newTotalLevel,
    plan?.toLevel,
    takenMagicInitiateLists,
  ])

  const selectedFeat = useMemo(
    () => (featId && loaded ? loaded.feats.find((feat) => feat.id === featId) ?? null : null),
    [featId, loaded],
  )

  const featSlotKey = activeFeatStep
    ? levelUpFeatSlotKey(activeFeatStep.classId, activeFeatStep.featureName, activeFeatStep.level)
    : null
  const featSourceKey = featSlotKey ? featChoicePickKey(featSlotKey) : null
  const pendingFeatEntry =
    featId && featSourceKey ? { featId, choicePickKey: featSourceKey } : null

  const featAsiPools = useMemo(() => {
    if (!selectedFeat || !featSlotKey) return []
    return collectAsiPoolsFromFeat(
      selectedFeat,
      levelUpFeatAllocationPrefix(featSlotKey),
      loaded?.modifierCatalog ?? [],
    )
  }, [featSlotKey, loaded?.modifierCatalog, selectedFeat])

  const pendingFeatModifierSlots = useMemo(() => {
    if (!loaded || !pendingFeatEntry) return []
    return collectModifierPlayerChoiceSlots({
      featEntries: [pendingFeatEntry],
      feats: loaded.feats,
      featChoicePicks,
      catalog: loaded.modifierCatalog,
      customAbilities: loaded.customAbilities,
    })
  }, [featChoicePicks, loaded, pendingFeatEntry])

  const knownSpellNames = useMemo(() => {
    if (!loaded) return []
    const knownIds = new Set(loaded.character.spell_ids ?? [])
    return loaded.spells.filter((spell) => knownIds.has(spell.id)).map((spell) => spell.name)
  }, [loaded])

  const featChoiceOptionContext = useMemo(() => {
    if (!loaded || !plan || !selectedEntry) return undefined
    return {
      customAbilities: loaded.customAbilities,
      featureChoicePicks: { ...(loaded.character.feature_choice_picks ?? {}), ...choicePicks },
      classNames: [plan.className],
      classIds: [plan.classId],
      classLevel: plan.toLevel,
      classWeaponProficiencies: selectedEntry.class?.weapon_proficiencies ?? null,
      equipmentCatalog: loaded.equipment,
      knownSpellNames,
      subclassName: selectedEntry.subclass?.name ?? null,
    }
  }, [choicePicks, knownSpellNames, loaded, plan, selectedEntry])

  const featureChoiceOptions = useMemo((): SkillChoiceOption[] => {
    if (!loaded || !plan || !selectedEntry || current?.kind !== "feature_choice") return []
    const options = resolveFeatureChoiceOptions(current.feature, {
      customAbilities: loaded.customAbilities,
      featureChoicePicks: choicePicks,
      classNames: [plan.className],
      classIds: [plan.classId],
      classLevel: plan.toLevel,
      classWeaponProficiencies: selectedEntry.class?.weapon_proficiencies ?? null,
      equipmentCatalog: loaded.equipment,
      knownSpellNames,
      subclassName: selectedEntry.subclass?.name ?? null,
    })
    const isSkillChoice = isSkillProficiencyChoice({
      category: current.feature.choices?.category,
      featureName: current.feature.name,
    })
    if (!isSkillChoice) return options
    // Proficiencies never stack: drop skills the character already has, and top the pool
    // back up from the class skill list so the grant is not silently wasted.
    return resolveSkillChoiceOptions(options, {
      heldSkills: loaded.character.skill_proficiencies ?? [],
      currentSelection: choicePicks[current.id] ?? [],
      required: current.required,
      fallbackOptions: selectedEntry.class?.skill_choices?.options ?? [],
    })
  }, [choicePicks, current, knownSpellNames, loaded, plan, selectedEntry])

  const modifierChoiceOptions = useMemo(() => {
    if (!loaded || current?.kind !== "modifier_choice") return []
    const slot = current.slot
    const selected = modifierPicks[current.id] ?? []
    if (slot.grantsExpertise) {
      return optionsForExpertiseSlot(slot, {
        proficientSkills: loaded.character.skill_proficiencies ?? [],
        proficientTools: loaded.character.tool_proficiencies ?? [],
        existingExpertiseSkills: loaded.character.skill_expertise ?? [],
        currentSelection: selected,
      })
    }
    return optionsForProficiencyGrantSlot(slot, {
      proficientSkills: loaded.character.skill_proficiencies ?? [],
      proficientTools: loaded.character.tool_proficiencies ?? [],
      knownLanguages: loaded.character.languages ?? [],
      currentSelection: selected,
    })
  }, [current, loaded, modifierPicks])

  /** Picks as they stood before this level-up, so swap steps can measure what changed. */
  const originalPicks = loaded?.character.feature_choice_picks ?? {}

  /** Skills chosen during this level-up, so they land on the saved proficiency list. */
  const levelUpSkillPicks = useMemo(() => {
    const names: string[] = []
    for (const step of plan?.steps ?? []) {
      if (step.kind !== "feature_choice") continue
      if (
        !isSkillProficiencyChoice({
          category: step.feature.choices?.category,
          featureName: step.feature.name,
        })
      ) {
        continue
      }
      names.push(...(choicePicks[step.id] ?? []))
    }
    return names
  }, [choicePicks, plan])

  const pendingConMod = useMemo(() => {
    if (!loaded) return 0
    return conModFromScore(constitutionAfterAsi(loaded.character, featAsiAllocations))
  }, [featAsiAllocations, loaded])

  const hpGainPreview = useMemo(() => {
    if (!plan) return 0
    if (hpMethod === "average") return averageHpGain(plan.hitDie, pendingConMod)
    if (hpNatural == null) return averageHpGain(plan.hitDie, pendingConMod)
    return rolledHpGain(plan.hitDie, pendingConMod, hpNatural)
  }, [hpMethod, hpNatural, pendingConMod, plan])

  const canAdvance = (): boolean => {
    if (!current) return true
    if (current.kind === "subclass") return Boolean(subclassId)
    if (current.kind === "feature_choice") {
      const picks = choicePicks[current.id] ?? []
      if (current.mode !== "swap") return picks.length >= current.required
      return countReplacedPicks(originalPicks[current.id] ?? [], picks) !== null
    }
    if (current.kind === "modifier_choice") {
      return (modifierPicks[current.id] ?? []).length >= current.required
    }
    if (current.kind === "feat_or_asi") {
      if (!featId || !selectedFeat || !pendingFeatEntry) return false
      const asiOk = featAsiPools.every((grant) =>
        isValidAsiAllocation(
          featAsiAllocations[grant.allocationKey] ?? {},
          grant.points,
          grant.allowedAbilities,
        ),
      )
      if (!asiOk) return false
      if (!validateFeatModifierChoices(loaded?.feats ?? [], [pendingFeatEntry], featChoicePicks)) {
        return false
      }
      return validateModifierPlayerChoices(pendingFeatModifierSlots, modifierPicks)
    }
    if (current.kind === "spells") {
      return cantripIds.length === current.extraCantrips && spellIds.length === current.extraPrepared
    }
    return true
  }

  const canApply = (): boolean => {
    if (hpMethod === "roll" && hpNatural == null) return false
    return true
  }

  const applyLevelUp = async () => {
    if (!loaded || !plan || !selectedEntry) return
    setSaving(true)
    setError(null)
    try {
      const db = createClient()
      const nextRows = normalizeCharacterClassRows(loaded.character).map((row) =>
        row.class_id === plan.classId
          ? { ...row, level: plan.toLevel, subclass_id: subclassId ?? row.subclass_id }
          : row,
      )
      const mergedPicks = mergeAlchemistDiscoveryPicks({
        ...(loaded.character.feature_choice_picks ?? {}),
        ...choicePicks,
      })
      let featPersist = {
        featIds: loaded.character.feat_ids ?? [],
        featureChoicePicks: mergedPicks,
        asiAllocations: {
          ...normalizeAsiAllocationsMap(loaded.character.asi_allocations),
          ...featAsiAllocations,
        },
      }
      for (const step of wizardSteps) {
        if (step.kind !== "feat_or_asi") continue
        const pickedFeatId = featIdsByStep[step.id]
        if (!pickedFeatId) continue
        featPersist = mergeLevelUpFeatPersist({
          featId: pickedFeatId,
          slotKey: levelUpFeatSlotKey(step.classId, step.featureName, step.level),
          pendingAllocations: featPersist.asiAllocations,
          existingFeatIds: featPersist.featIds,
          existingPicks: featPersist.featureChoicePicks,
          existingAllocations: featPersist.asiAllocations,
        })
      }
      const nextPicks = featPersist.featureChoicePicks
      const builderPicks = normalizeBuilderPicks(loaded.character.builder_picks)
      const existingSpells = builderPicks.spell_picks_by_class_id?.[plan.classId] ?? []
      const nextSpellPicks = {
        ...(builderPicks.spell_picks_by_class_id ?? {}),
        [plan.classId]: [...existingSpells, ...cantripIds, ...spellIds],
      }
      const nextFeatIds = featPersist.featIds
      const modifierSpellIds = [...levelUpModifierSlots, ...pendingFeatModifierSlots]
        .filter((slot) => slot.kind === "spell")
        .flatMap((slot) => modifierPicks[slot.slotKey] ?? [])
      const unlockedSpellIds = [...cantripIds, ...spellIds, ...modifierSpellIds]
      const nextSpellIds = [...new Set([...(loaded.character.spell_ids ?? []), ...unlockedSpellIds])]
      const nextAsi = featPersist.asiAllocations

      const hpGain =
        hpMethod === "roll" && hpNatural != null
          ? rolledHpGain(plan.hitDie, pendingConMod, hpNatural)
          : averageHpGain(plan.hitDie, pendingConMod)
      const nextMax = Math.max(1, (loaded.character.hit_point_max ?? loaded.character.hit_points ?? 1) + hpGain)

      const { error: updateError } = await db
        .from("characters")
        .update({
          level: plan.newTotalLevel,
          character_classes: nextRows,
          subclass_id:
            selectedEntry.row.order === 0
              ? (subclassId ?? loaded.character.subclass_id)
              : loaded.character.subclass_id,
          feature_choice_picks: nextPicks,
          feat_choice_picks: featChoicePicks,
          modifier_player_picks: {
            ...(loaded.character.modifier_player_picks ?? {}),
            ...modifierPicks,
          },
          skill_proficiencies: mergeSkillProficiencyNames(
            loaded.character.skill_proficiencies,
            levelUpSkillPicks,
          ),
          feat_ids: nextFeatIds,
          spell_ids: nextSpellIds,
          builder_picks: { ...builderPicks, spell_picks_by_class_id: nextSpellPicks },
          asi_allocations: nextAsi,
          hit_point_max: nextMax,
          hit_points: nextMax,
          portrait_url: loaded.character.portrait_url,
          banner_url: loaded.character.banner_url,
        })
        .eq("id", loaded.character.id)
      if (updateError) throw new Error(updateError.message)
      onComplete?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save level-up.")
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className={cn(
            "relative max-h-[90vh] w-full overflow-y-auto rounded-2xl border-2 border-primary/40 bg-card p-5 shadow-2xl",
            visualSubclassScreen ? "max-w-6xl" : "max-w-lg",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:text-foreground"
            aria-label="Close level up"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Level up</p>
          <h2 className="pr-8 font-serif text-2xl font-black text-foreground">
            {loaded?.character.name ?? "Character"}
          </h2>

          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          {!loaded && !error ? <p className="mt-4 text-sm text-muted-foreground">Loading…</p> : null}

          {loaded && plan ? (
            <div className="mt-4 space-y-4">
              {loaded.classDetails.length > 1 ? (
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold">Class to advance</span>
                  <select
                    value={classId ?? ""}
                    onChange={(event) => {
                      setClassId(event.target.value)
                      setStepIndex(0)
                    }}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2"
                  >
                    {loaded.classDetails.map((entry) => (
                      <option key={entry.row.class_id} value={entry.row.class_id}>
                        {entry.class?.name ?? "Class"} {entry.row.level} → {entry.row.level + 1}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {plan.className} {plan.fromLevel} → {plan.toLevel} (character level{" "}
                  {plan.newTotalLevel})
                </p>
              )}

              {!visualSubclassScreen && plan.standardizedNotes.length > 0 ? (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-primary">
                    Standardized improvements
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {plan.standardizedNotes.map((note) => (
                      <li key={note.id}>
                        <p className="text-sm font-semibold text-foreground">{note.title}</p>
                        <p className="text-xs text-muted-foreground">{note.detail}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {!visualSubclassScreen && plan.newFeatures.length > 0 ? (
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    New features
                  </p>
                  <ul className="mt-2 space-y-2">
                    {plan.newFeatures.map((feature) => (
                      <li key={`${feature.source}-${feature.name}`}>
                        <p className="text-sm font-semibold text-foreground">
                          {feature.name}
                          <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {feature.source}
                          </span>
                        </p>
                        {feature.description ? (
                          <RichTextContent
                            html={feature.description}
                            className="text-xs text-muted-foreground [&_p]:mb-1"
                            fallback=""
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {!visualSubclassScreen && plan.featureImprovements.length > 0 ? (
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Feature improvements
                  </p>
                  <ul className="mt-2 space-y-2">
                    {plan.featureImprovements.map((feature) => (
                      <li key={`${feature.source}-improve-${feature.name}-${feature.detail}`}>
                        <p className="text-sm font-semibold text-foreground">
                          {feature.name}
                          <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {feature.source}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">{feature.detail}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {!visualSubclassScreen &&
              plan.newFeatures.length === 0 &&
              plan.featureImprovements.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No named features unlock at this level — resources and proficiency still scale.
                </p>
              ) : null}

              {current?.kind === "subclass" ? (
                <LevelUpSubclassPicker
                  subclasses={loaded.subclasses}
                  classId={current.classId}
                  className={current.className}
                  unlockLevel={current.unlockLevel}
                  selectedId={subclassId}
                  onSelect={setSubclassId}
                  visual={visualBuilder}
                  cinematicPortrait={visualBuilder && !isPhonePickerScreen}
                  swipeOnPhone={visualBuilder && isPhonePickerScreen}
                />
              ) : null}

              {current?.kind === "feature_choice" ? (
                <MultiSelectChoices
                  title={withChosenOptionChrome(current.title, choicePicks[current.id] ?? [])}
                  hint={
                    current.mode === "swap"
                      ? `Optional: deselect one ${current.feature.choices?.category || "pick"} and choose a single replacement, or move on to keep what you have.`
                      : undefined
                  }
                  options={featureChoiceOptions.map((option) => ({
                    name: option.name,
                    description: resolveChoiceOptionDescription(
                      option,
                      current.feature.description,
                    ),
                  }))}
                  maxCount={current.required}
                  selected={choicePicks[current.id] ?? []}
                  onChange={(selected) =>
                    setChoicePicks((prev) => ({ ...prev, [current.id]: selected }))
                  }
                  showOptionInfo={
                    !isSkillProficiencyChoice({
                      category: current.feature.choices?.category,
                      featureName: current.feature.name,
                    })
                  }
                  showOptionSummaries={shouldShowNamedChoiceSummaries({
                    optionsSource: current.feature.choices?.optionsSource,
                    options: featureChoiceOptions.map((option) => ({
                      name: option.name,
                      description: resolveChoiceOptionDescription(
                        option,
                        current.feature.description,
                      ),
                    })),
                  })}
                />
              ) : null}

              {current?.kind === "modifier_choice" ? (
                current.slot.kind === "spell" ||
                current.slot.kind === "spell_list_class" ||
                current.slot.kind === "spellcasting_ability" ? (
                  <ModifierPlayerChoicePanel
                    sourceKey={current.slot.sourceKey}
                    sourceLabel={current.slot.sourceLabel}
                    slots={levelUpModifierSlots}
                    picks={modifierPicks}
                    spells={loaded?.spells ?? []}
                    kinds={[current.slot.kind]}
                    showSkillInfo={false}
                    magicInitiateFeatGranted={loaded?.featGranted}
                    magicInitiateSourceKeys={magicInitiateSourceKeys}
                    onChange={(slotKey, selected) => {
                      const slot = levelUpModifierSlots.find((entry) => entry.slotKey === slotKey)
                      if (!slot) return
                      setModifierPicks((prev) =>
                        setModifierPlayerPickValue(
                          prev,
                          slot,
                          levelUpModifierSlots,
                          selected,
                        ),
                      )
                    }}
                  />
                ) : (
                  <MultiSelectChoices
                    title={withChosenOptionChrome(current.title, modifierPicks[current.id] ?? [])}
                    hint={
                      current.slot.grantsExpertise
                        ? "Choose skills you are already proficient in. Your proficiency bonus is doubled for those checks."
                        : undefined
                    }
                    options={modifierChoiceOptions}
                    maxCount={current.required}
                    selected={modifierPicks[current.id] ?? []}
                    onChange={(selected) =>
                      setModifierPicks((prev) => ({ ...prev, [current.id]: selected }))
                    }
                    showOptionInfo={
                      current.slot.kind !== "skill" && current.slot.kind !== "skill_or_tool"
                    }
                  />
                )
              ) : null}

              {current?.kind === "feat_or_asi" ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {activeFeatStep?.featCategories?.length &&
                    !activeFeatStep.featCategories.some((category) =>
                      /general|ability score/i.test(category),
                    )
                      ? `Choose ${activeFeatStep.featCategories.join(" or ")}.`
                      : "Pick a feat. For ability score increases, choose the Ability Score Improvement feat (or a half-feat that grants +1) and allocate below — there is no separate ability-score step."}
                  </p>
                  <select
                    value={featId ?? ""}
                    onChange={(event) => {
                      const nextId = event.target.value || null
                      if (featSourceKey) {
                        setModifierPicks((prev) => clearModifierPicksForSource(prev, featSourceKey))
                        setFeatChoicePicks((prev) => {
                          const next = { ...prev }
                          delete next[featSourceKey]
                          return next
                        })
                      }
                      if (activeFeatStep) {
                        setFeatIdsByStep((prev) => {
                          const next = { ...prev }
                          if (nextId) next[activeFeatStep.id] = nextId
                          else delete next[activeFeatStep.id]
                          return next
                        })
                      }
                      setFeatAsiAllocations((prev) => {
                        if (!featSlotKey) return {}
                        const prefix = levelUpFeatAllocationPrefix(featSlotKey)
                        return Object.fromEntries(
                          Object.entries(prev).filter(([key]) => !key.startsWith(prefix)),
                        )
                      })
                    }}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Choose a feat…</option>
                    {eligibleFeats.map((feat) => (
                      <option key={feat.id} value={feat.id}>
                        {isAsiFeat(feat) ? `${feat.name} (+2 ability scores)` : feat.name}
                      </option>
                    ))}
                  </select>
                  {featAsiPools.map((grant) => (
                    <AsiAllocator
                      key={grant.allocationKey}
                      title={grant.label}
                      sourceLabel={grant.sourceLabel}
                      totalPoints={grant.points}
                      pickCount={grant.points >= 2 ? Math.floor(grant.points / 2) : 1}
                      allowedAbilities={grant.allowedAbilities}
                      allocation={featAsiAllocations[grant.allocationKey] ?? {}}
                      onChange={(allocation: AsiAllocation) =>
                        setFeatAsiAllocations((prev) => ({
                          ...prev,
                          [grant.allocationKey]: allocation,
                        }))
                      }
                      baseScores={Object.fromEntries(
                        ABILITY_SCORE_KEYS.map((key) => [
                          key,
                          (loaded.character[key as AbilityScoreKey] as number | undefined) ?? 10,
                        ]),
                      )}
                    />
                  ))}
                  {selectedFeat?.isChoice &&
                  (selectedFeat.choices?.options?.length || selectedFeat.choices?.optionsSource) &&
                  pendingFeatEntry ? (
                    <FeatModifierChoicePicker
                      entry={pendingFeatEntry}
                      feat={selectedFeat}
                      choiceOptionContext={featChoiceOptionContext}
                      selected={featChoicePicks[pendingFeatEntry.choicePickKey] ?? []}
                      onChange={(selected) => {
                        const choiceKey = pendingFeatEntry.choicePickKey
                        setFeatChoicePicks((prev) => ({ ...prev, [choiceKey]: selected }))
                        setModifierPicks((prev) => clearModifierPicksForSource(prev, choiceKey))
                      }}
                    />
                  ) : null}
                  {featId && selectedFeat && featSourceKey ? (
                    <ModifierPlayerChoicePanel
                      sourceKey={featSourceKey}
                      sourceLabel={selectedFeat.name}
                      slots={pendingFeatModifierSlots}
                      picks={modifierPicks}
                      spells={loaded.spells}
                      unavailableOptions={loaded.character.skill_proficiencies ?? []}
                      proficientSkills={loaded.character.skill_proficiencies ?? []}
                      proficientTools={loaded.character.tool_proficiencies ?? []}
                      knownLanguages={loaded.character.languages ?? []}
                      existingExpertiseSkills={loaded.character.skill_expertise ?? []}
                      showSkillInfo={false}
                      magicInitiateFeatGranted={loaded.featGranted}
                      magicInitiateSourceKeys={magicInitiateSourceKeys}
                      onChange={(slotKey, selected) => {
                        const slotEntry = pendingFeatModifierSlots.find(
                          (entry) => entry.slotKey === slotKey,
                        )
                        if (!slotEntry) return
                        setModifierPicks((prev) =>
                          setModifierPlayerPickValue(
                            prev,
                            slotEntry,
                            pendingFeatModifierSlots,
                            selected,
                          ),
                        )
                      }}
                    />
                  ) : null}
                </div>
              ) : null}

              {current?.kind === "spells" ? (
                <SpellPickStep
                  current={current}
                  spells={loaded.spells}
                  alreadyKnown={loaded.character.spell_ids ?? []}
                  cantripIds={cantripIds}
                  spellIds={spellIds}
                  onCantripsChange={setCantripIds}
                  onSpellsChange={setSpellIds}
                />
              ) : null}

              {isReview ? (
                <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Hit points (d{plan.hitDie})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Constitution modifier this level:{" "}
                    <span className="font-semibold text-foreground">
                      {pendingConMod >= 0 ? `+${pendingConMod}` : pendingConMod}
                    </span>
                  </p>
                  <div className="flex gap-2">
                    {(
                      [
                        ["average", "Take average"],
                        ["roll", "Roll"],
                      ] as const
                    ).map(([method, label]) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => {
                          setHpMethod(method)
                          if (method === "average") setHpNatural(null)
                        }}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                          hpMethod === method
                            ? "border-primary bg-primary/10"
                            : "border-border"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {hpMethod === "average" ? (
                    <p className="text-sm text-foreground">
                      Average:{" "}
                      <span className="font-bold">
                        {Math.floor(plan.hitDie / 2) + 1}
                      </span>{" "}
                      + CON = <span className="font-bold">{hpGainPreview}</span> HP
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setHpNatural(rollHitDie(plan.hitDie))}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold hover:border-primary/40"
                      >
                        <Dices className="h-4 w-4" />
                        {hpNatural == null ? `Roll d${plan.hitDie}` : `Reroll (got ${hpNatural})`}
                      </button>
                      {hpNatural != null ? (
                        <p className="text-sm text-foreground">
                          {hpNatural} + CON = <span className="font-bold">{hpGainPreview}</span> HP
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Roll before applying.</p>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Confirm to apply level {plan.toLevel} in {plan.className}.
                  </p>
                </div>
              ) : null}

              {current?.kind === "feature_choice" && current.mode === "swap" && !canAdvance() ? (
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  Keep {(originalPicks[current.id] ?? []).length} selected and change at most one of
                  them.
                </p>
              ) : null}

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  disabled={stepIndex === 0}
                  onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                {isReview ? (
                  <button
                    type="button"
                    disabled={saving || !canApply()}
                    onClick={() => void applyLevelUp()}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    {saving ? "Saving…" : "Apply level up"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canAdvance()}
                    onClick={() => setStepIndex((value) => value + 1)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function SpellPickStep({
  current,
  spells,
  alreadyKnown,
  cantripIds,
  spellIds,
  onCantripsChange,
  onSpellsChange,
}: {
  current: Extract<LevelUpPlan["steps"][number], { kind: "spells" }>
  spells: Spell[]
  alreadyKnown: string[]
  cantripIds: string[]
  spellIds: string[]
  onCantripsChange: (ids: string[]) => void
  onSpellsChange: (ids: string[]) => void
}) {
  const [detailSpell, setDetailSpell] = useState<Spell | null>(null)
  const eligible = useMemo(
    () =>
      spellsEligibleForLevelUp(
        spells,
        current.className,
        current.maxSpellLevel,
        alreadyKnown,
        current.spellList,
      ),
    [alreadyKnown, current.className, current.maxSpellLevel, current.spellList, spells],
  )
  const cantrips = eligible.filter((spell) => (spell.level ?? 0) === 0)
  const leveled = eligible.filter((spell) => (spell.level ?? 0) > 0)

  const openSpellInfo = (pool: Spell[], name: string) => {
    const match = pool.find((spell) => spell.name === name) ?? null
    setDetailSpell(match)
  }

  const accent = detailSpell
    ? getCompendiumItemAccentColor(detailSpell as unknown as Record<string, unknown>)
    : null

  return (
    <div className="space-y-3">
      {current.extraCantrips > 0 ? (
        <MultiSelectChoices
          title={`Cantrips (${current.extraCantrips})`}
          options={cantrips.map((spell) => ({ name: spell.name }))}
          maxCount={current.extraCantrips}
          selected={cantrips
            .filter((spell) => cantripIds.includes(spell.id))
            .map((spell) => spell.name)}
          onChange={(names) =>
            onCantripsChange(
              cantrips.filter((spell) => names.includes(spell.name)).map((spell) => spell.id),
            )
          }
          showOptionInfo
          onOptionInfo={(option) => openSpellInfo(cantrips, option.name)}
        />
      ) : null}
      {current.extraPrepared > 0 ? (
        <MultiSelectChoices
          title={`${
            /grimoire/i.test(current.title)
              ? "Grimoire"
              : current.preparedCaster
                ? "Prepared"
                : "Known"
          } spells (${current.extraPrepared})`}
          options={leveled.map((spell) => ({
            name: spell.name,
            sourceLabel: spell.level === 0 ? "Cantrip" : `Level ${spell.level}`,
          }))}
          maxCount={current.extraPrepared}
          selected={leveled
            .filter((spell) => spellIds.includes(spell.id))
            .map((spell) => spell.name)}
          onChange={(names) =>
            onSpellsChange(
              leveled.filter((spell) => names.includes(spell.name)).map((spell) => spell.id),
            )
          }
          showOptionInfo
          onOptionInfo={(option) => openSpellInfo(leveled, option.name)}
        />
      ) : null}

      {detailSpell ? (
        <CompendiumDetailOverlay
          open
          onClose={() => setDetailSpell(null)}
          item={detailSpell}
          subtitle={detailSpell.school}
          imageCrop="top"
          panelWidth="portrait-spell"
          tags={spellDetailOverlayTags(detailSpell)}
          accentColor={accent}
          backdropClassName="z-[220]"
        >
          {spellCastingDetailRows(detailSpell).length > 0 ? (
            <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
              {spellCastingDetailRows(detailSpell).map((row) => (
                <div key={row.label}>
                  <span className="text-white/50">{row.label}:</span> {row.value}
                </div>
              ))}
            </div>
          ) : null}
          {detailSpell.material?.trim() ? (
            <p className="mb-3 text-sm text-white/70">
              <span className="font-semibold text-white/50">Materials: </span>
              {detailSpell.material.trim()}
            </p>
          ) : null}
          <RichTextContent html={detailSpell.description} />
          {detailSpell.higher_levels?.trim() ? (
            <div className="mt-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-white/50">
                At Higher Levels
              </p>
              <RichTextContent html={detailSpell.higher_levels} />
            </div>
          ) : null}
        </CompendiumDetailOverlay>
      ) : null}
    </div>
  )
}

export function LevelUpButton({
  onClick,
  className,
  title = "Level up",
}: {
  onClick: () => void
  className?: string
  title?: string
}) {
  return (
    <button type="button" onClick={onClick} className={className} title={title} aria-label={title}>
      <ArrowUp className="h-4 w-4" />
    </button>
  )
}
