"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/db/client"
import { characterSheetHref } from "@/lib/compendium/edit-href"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Shield, 
  Users, 
  Dices, 
  Package, 
  UserCircle, 
  ClipboardCheck,
  Upload,
  X,
  Wand2,
  Search,
  Info,
  Heart,
  Swords,
  Sparkles,
  Plus,
  Minus,
  Eye
} from "lucide-react"
import {
  aggregateCharacteristics,
  applyAcCharacteristics,
  applyHpCharacteristics,
  computeInitiative,
  normalizeCharacteristics,
  resolveUsesConfig,
  sumAttackRollModifiers,
  sumDamageRollModifiers,
  ABILITY_SCORE_KEYS,
} from "@/lib/compendium/characteristic-modifiers"
import {
  findBackgroundGrantedFeat,
  formatBackgroundAbilityBonuses,
  formatBackgroundEquipment,
  formatBackgroundGrantedSpells,
  getBackgroundProficiencySections,
} from "@/lib/compendium/background-display"
import {
  applyBackgroundProficienciesToDraft,
  getEffectiveArmorProficiencies,
  getEffectiveWeaponProficiencies,
  mergeProficiencyLists,
} from "@/lib/compendium/background-proficiencies"
import {
  calculateArmorClass,
  calculateWeaponAttack,
  getWeaponPropertyTags,
  isArmorItem,
  isShieldItem,
  isWeaponItem,
  isWeaponProficient,
} from "@/lib/compendium/combat-stats"
import { resolveSpellcastingAbilityKey } from "@/lib/compendium/spell-slots"
import { BuilderStepNav } from "@/components/builder/builder-step-nav"
import { MultiSelectChoices } from "@/components/builder/multi-select-choices"
import { AsiAllocator } from "@/components/builder/asi-allocator"
import {
  classNeedsSubclass,
  featureChoiceKey,
  buildSkillPickSources,
  getSubclassesForClass,
  getTakenSkills,
  mergeSkillProficiencies,
  SUBCLASS_LEVEL,
  validateClassStepChoices,
  validateOriginStepChoices,
} from "@/lib/builder/choices"
import {
  clearBuilderDraft,
  loadBuilderDraft,
  saveBuilderDraft,
  type BuilderDraftSnapshot,
} from "@/lib/builder/draft-storage"
import { characterToBuilderState } from "@/lib/builder/character-to-draft"
import {
  findEquipmentByName,
  getStartingEquipmentGroups,
  isGoldOnlyOption,
  resolvePackageEquipmentIds,
} from "@/lib/builder/equipment-utils"
import {
  canSelectSpell,
  countSelectedSpells,
  getSpellLimits,
  mergeSpellPicks,
} from "@/lib/builder/spell-limits"
import {
  FEAT_MILESTONES,
  isFeatEligibleForSlot,
  isFeatValidSelection,
  requiredFeatSlotCount,
} from "@/lib/builder/feat-selection"
import {
  aggregateAsiBonuses,
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
import { MAX_PORTRAIT_FILE_BYTES, normalizePortraitUrl, normalizeBannerUrl } from "@/lib/portrait"
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

const STEPS = [
  { id: 1, label: "Class & Level", icon: Shield },
  { id: 2, label: "Origin", icon: Users },
  { id: 3, label: "Abilities", icon: Dices },
  { id: 4, label: "Gear & Spells", icon: Package },
  { id: 5, label: "Details", icon: UserCircle },
  { id: 6, label: "Review", icon: ClipboardCheck },
]

const ABILITY_NAMES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const

type AbilityMethod = "pointbuy" | "standard" | "roll" | "custom"

const EMPTY_CHARACTER: CharacterDraft = {
  name: "",
  level: 1,
  class_id: null,
  subclass_id: null,
  species_id: null,
  background_id: null,
  strength: 8,
  dexterity: 8,
  constitution: 8,
  intelligence: 8,
  wisdom: 8,
  charisma: 8,
  skill_proficiencies: [],
  tool_proficiencies: [],
  weapon_proficiencies: [],
  armor_proficiencies: [],
  languages: ["Common"],
  spell_ids: [],
  equipment_ids: [],
  feat_ids: [],
  personality_traits: "",
  ideals: "",
  bonds: "",
  flaws: "",
  backstory: "",
  portrait_url: null,
  banner_url: null,
}

export default function BuilderPage() {
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
  const [loading, setLoading] = useState(true)

  // Character draft
  const [character, setCharacter] = useState<CharacterDraft>(EMPTY_CHARACTER)

  // Ability score generation method
  const [abilityMethod, setAbilityMethod] = useState<AbilityMethod>("pointbuy")
  const [pointsRemaining, setPointsRemaining] = useState(27)
  
  // Search state for each step
  const [classSearch, setClassSearch] = useState("")
  const [speciesSearch, setSpeciesSearch] = useState("")
  const [backgroundSearch, setBackgroundSearch] = useState("")
  const [spellSearch, setSpellSearch] = useState("")
  const [equipmentSearch, setEquipmentSearch] = useState("")
  const [startingEquipmentOptionIndex, setStartingEquipmentOptionIndex] = useState<number | null>(null)
  
  // Details modal state
  const [detailsModal, setDetailsModal] = useState<{
    type: "class" | "species" | "background" | "spell" | "equipment" | null
    item: DndClass | Species | Background | Spell | Equipment | null
  }>({ type: null, item: null })
  
  // Preview tabs
  const [previewTab, setPreviewTab] = useState<"summary" | "combat" | "features" | "custom">("summary")
  const [mobilePanel, setMobilePanel] = useState<"steps" | "preview">("steps")
  const [equippedArmorId, setEquippedArmorId] = useState<string | null>(null)
  const [equippedShieldId, setEquippedShieldId] = useState<string | null>(null)
  const [equippedWeaponId, setEquippedWeaponId] = useState<string | null>(null)
  
  // Multiclass support - tracks class levels
  const [classLevels, setClassLevels] = useState<{ classId: string; level: number }[]>([])
  const [subclassByClassId, setSubclassByClassId] = useState<Record<string, string>>({})
  const [classSkillPicks, setClassSkillPicks] = useState<Record<string, string[]>>({})
  const [featureChoicePicks, setFeatureChoicePicks] = useState<Record<string, string[]>>({})
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
    setStartingEquipmentOptionIndex(snapshot.startingEquipmentOptionIndex ?? null)
    setPreviewTab(snapshot.previewTab)
    setMobilePanel(snapshot.mobilePanel)
    setEquippedArmorId(snapshot.equippedArmorId)
    setEquippedShieldId(snapshot.equippedShieldId)
    setEquippedWeaponId(snapshot.equippedWeaponId)
    setClassLevels(snapshot.classLevels)
    setSubclassByClassId(snapshot.subclassByClassId)
    setClassSkillPicks(snapshot.classSkillPicks)
    setFeatureChoicePicks(snapshot.featureChoicePicks)
    setSpeciesTraitPicks(snapshot.speciesTraitPicks)
    setSpellPicksByClassId(snapshot.spellPicksByClassId ?? {})
    setAsiAllocationsByFeatId(snapshot.asiAllocationsByFeatId ?? {})
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

  const resetCharacter = () => {
    setCharacter({ ...EMPTY_CHARACTER })
    setClassLevels([])
    setSubclassByClassId({})
    setClassSkillPicks({})
    setFeatureChoicePicks({})
    setSpeciesTraitPicks({})
    setSpellPicksByClassId({})
    setAsiAllocationsByFeatId({})
    setAbilityMethod("pointbuy")
    setPointsRemaining(27)
    setClassSearch("")
    setSpeciesSearch("")
    setBackgroundSearch("")
    setSpellSearch("")
    setEquipmentSearch("")
    setStartingEquipmentOptionIndex(null)
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
    if (editIdParam) {
      setDraftReady(true)
      return
    }
    const draft = loadBuilderDraft()
    if (draft) {
      applyBuilderSnapshot(draft)
    }
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
        characterToBuilderState(saved, { dndClass, background }),
      )
    }

    void hydrateFromCharacter()
  }, [loading, editIdParam, classes, backgrounds])

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
      startingEquipmentOptionIndex,
      previewTab,
      mobilePanel,
      equippedArmorId,
      equippedShieldId,
      equippedWeaponId,
      classLevels,
      subclassByClassId,
      classSkillPicks,
      featureChoicePicks,
      speciesTraitPicks,
      spellPicksByClassId,
      asiAllocationsByFeatId,
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
    startingEquipmentOptionIndex,
    previewTab,
    mobilePanel,
    equippedArmorId,
    equippedShieldId,
    equippedWeaponId,
    classLevels,
    subclassByClassId,
    classSkillPicks,
    featureChoicePicks,
    speciesTraitPicks,
    spellPicksByClassId,
    asiAllocationsByFeatId,
    editingCharacterId,
    currentHp,
    tempHp,
  ])

  useEffect(() => {
    const fetchContent = async () => {
      const db = createClient()
      
      const [classesRes, subclassesRes, speciesRes, backgroundsRes, featsRes, spellsRes, equipmentRes, abilitiesRes] = await Promise.all([
        db.from("classes").select("*").order("name"),
        db.from("subclasses").select("*").order("name"),
        db.from("species").select("*").order("name"),
        db.from("backgrounds").select("*").order("name"),
        db.from("feats").select("*").order("name"),
        db.from("spells").select("*").order("level").order("name"),
        db.from("equipment").select("*").order("category").order("name"),
        db.from("custom_abilities").select("*").eq("show_in_builder", true).order("name"),
      ])

      setClasses(classesRes.data || [])
      setSubclasses(subclassesRes.data || [])
      setSpecies(speciesRes.data || [])
      setBackgrounds(backgroundsRes.data || [])
      if (featsRes.error) {
        setFeatsLoadError(featsRes.error.message)
        setFeats([])
      } else {
        setFeatsLoadError(null)
        setFeats(featsRes.data || [])
      }
      setSpells(spellsRes.data || [])
      setEquipment(equipmentRes.data || [])
      setCustomAbilities(abilitiesRes.data || [])
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

  const assignStandardArrayValue = (
    ability: (typeof ABILITY_NAMES)[number],
    value: number,
  ) => {
    setCharacter((prev) => ({ ...prev, [ability]: value }))
  }

  const isStandardValueUsedElsewhere = (
    ability: (typeof ABILITY_NAMES)[number],
    value: number,
  ) =>
    ABILITY_NAMES.some(
      (name) => name !== ability && character[name] === value,
    )

  const applyStandardArray = () => {
    setCharacter({
      ...character,
      strength: 15,
      dexterity: 14,
      constitution: 13,
      intelligence: 12,
      wisdom: 10,
      charisma: 8,
    })
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

  const handlePortraitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_PORTRAIT_FILE_BYTES) {
      alert("Image must be less than 10MB")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setCharacter({ ...character, portrait_url: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_PORTRAIT_FILE_BYTES) {
      alert("Image must be less than 10MB")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setCharacter({ ...character, banner_url: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  const selectedClass = classes.find(c => c.id === character.class_id)
  const selectedSpecies = species.find(s => s.id === character.species_id)
  const selectedBackground = backgrounds.find(b => b.id === character.background_id)
  
  // Calculate total level from all class levels
  const totalLevel = classLevels.length > 0 
    ? classLevels.reduce((sum, cl) => sum + cl.level, 0)
    : character.level

  const requiredFeatSlots = requiredFeatSlotCount(totalLevel)
  const selectedFeatIds = (character.feat_ids ?? []).slice(0, requiredFeatSlots)
  const selectedFeatCount = selectedFeatIds.filter(Boolean).length
  const milestoneAsiFeatCount = countMilestoneAsiFeats(selectedFeatIds, feats)
  const milestoneAsiTotalPoints = milestoneAsiPointTotal(milestoneAsiFeatCount)
  const milestoneAsiAllocation = getCombinedMilestoneAsiAllocation(
    asiAllocationsByFeatId,
    selectedFeatIds,
    feats,
  )

  // If level drops, trim feat slots
  useEffect(() => {
    if ((character.feat_ids ?? []).length > requiredFeatSlots) {
      setCharacter((prev) => ({ ...prev, feat_ids: (prev.feat_ids ?? []).slice(0, requiredFeatSlots) }))
    }
  }, [requiredFeatSlots])

  // Once Origin is chosen, enforce feat prerequisites (including Epic Boon at 19).
  useEffect(() => {
    if (selectedFeatCount === 0) return
    const classIds = classLevels.map((cl) => cl.classId)
    const milestones = FEAT_MILESTONES.filter((lvl) => lvl <= totalLevel)
    const context = {
      totalLevel,
      classIds,
      selectedFeatIds,
      speciesId: character.species_id,
      backgroundId: character.background_id,
    }

    const realigned = milestones.map((milestone, index) => {
      const id = selectedFeatIds[index]
      if (!id) return ""
      const feat = feats.find((f) => f.id === id)
      if (!feat || !isFeatValidSelection(feat, milestone, context)) return ""
      return id
    })

    const previous = milestones.map((_, index) => selectedFeatIds[index] ?? "")
    if (realigned.join("|") !== previous.join("|")) {
      setCharacter((prev) => ({ ...prev, feat_ids: realigned }))
      alert("One or more selected feats no longer meet prerequisites. Please reselect.")
    }
  }, [
    character.species_id,
    character.background_id,
    totalLevel,
    classLevels,
    feats,
    selectedFeatIds,
    selectedFeatCount,
  ])

  useEffect(() => {
    if (milestoneAsiTotalPoints <= 0) {
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
  }, [asiAllocationsByFeatId, selectedFeatIds, feats, milestoneAsiTotalPoints])

  // Get proficiency bonus based on total level
  const proficiencyBonus = Math.floor((totalLevel - 1) / 4) + 2
  
  // Get all classes the character has levels in
  const characterClasses = classLevels
    .map((cl) => {
      const found = classes.find((c) => c.id === cl.classId)
      if (!found) return null
      return { ...found, level: cl.level }
    })
    .filter((c): c is DndClass & { level: number } => c != null)
  
  // Primary class (first or highest level)
  const primaryClass = characterClasses.length > 0 ? characterClasses[0] : selectedClass

  const equipmentClass = primaryClass ?? selectedClass
  const startingEquipmentGroups = getStartingEquipmentGroups(equipmentClass)
  const classStartingGold = equipmentClass?.starting_gold ?? 0
  const selectedStartingOption =
    startingEquipmentOptionIndex != null && startingEquipmentGroups[0]
      ? startingEquipmentGroups[0].options[startingEquipmentOptionIndex]
      : null
  const useGoldEquipment =
    selectedStartingOption != null &&
    isGoldOnlyOption(selectedStartingOption, classStartingGold)

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

  const selectStartingEquipmentOption = (index: number) => {
    setStartingEquipmentOptionIndex(index)
    const option = startingEquipmentGroups[0]?.options[index]
    if (!option) return
    if (isGoldOnlyOption(option, classStartingGold)) {
      setCharacter((prev) => ({ ...prev, equipment_ids: [] }))
    } else {
      const ids = resolvePackageEquipmentIds(option.items, equipment)
      setCharacter((prev) => ({ ...prev, equipment_ids: ids }))
    }
  }

  const builderCharacteristicMods = [
    ...normalizeCharacteristics(selectedSpecies?.characteristics, null),
    ...selectedFeatIds
      .filter(Boolean)
      .map((featId) => feats.find((feat) => feat.id === featId))
      .filter((feat): feat is Feat => Boolean(feat))
      .flatMap((feat) => normalizeCharacteristics(feat.benefits, null)),
    ...customAbilities.flatMap((ability) =>
      normalizeCharacteristics(ability.characteristics, ability.uses),
    ),
  ]
  const aggregatedCharacteristics = aggregateCharacteristics(builderCharacteristicMods)
  const asiBonuses = aggregateAsiBonuses(asiAllocationsByFeatId)

  const mergedSkillProficiencies = mergeSkillProficiencies(
    selectedBackground?.skill_proficiencies,
    classSkillPicks,
    [...character.skill_proficiencies, ...aggregatedCharacteristics.skills],
  )

  const effectiveAbilityScores = ABILITY_SCORE_KEYS.reduce(
    (scores, key) => {
      scores[key] =
        character[key] +
        (aggregatedCharacteristics.abilityBonuses[key] ?? 0) +
        (asiBonuses[key] ?? 0)
      return scores
    },
    {} as Record<(typeof ABILITY_SCORE_KEYS)[number], number>,
  )
  
  // Compute ability modifiers
  const abilityMods = {
    strength: Math.floor((effectiveAbilityScores.strength - 10) / 2),
    dexterity: Math.floor((effectiveAbilityScores.dexterity - 10) / 2),
    constitution: Math.floor((effectiveAbilityScores.constitution - 10) / 2),
    intelligence: Math.floor((effectiveAbilityScores.intelligence - 10) / 2),
    wisdom: Math.floor((effectiveAbilityScores.wisdom - 10) / 2),
    charisma: Math.floor((effectiveAbilityScores.charisma - 10) / 2),
  }

  const effectiveSkillProficiencies = mergedSkillProficiencies
  const effectiveSkillExpertise = [...aggregatedCharacteristics.skillExpertise]
  const effectiveToolProficiencies = mergeProficiencyLists(
    character.tool_proficiencies,
    aggregatedCharacteristics.toolProficiencies,
  )
  const effectiveWeaponProficiencies = getEffectiveWeaponProficiencies(
    primaryClass?.weapon_proficiencies,
    character.weapon_proficiencies,
    aggregatedCharacteristics.weaponProficiencies,
  )
  const effectiveArmorProficiencies = getEffectiveArmorProficiencies(
    primaryClass?.armor_proficiencies,
    character.armor_proficiencies,
    aggregatedCharacteristics.armorProficiencies,
  )
  const savingThrowProficiencies = [
    ...new Set([
      ...(primaryClass?.saving_throws || []),
      ...aggregatedCharacteristics.savingThrows,
    ]),
  ]
  
  // Calculate max HP (hit die + con mod at level 1, average + con mod thereafter)
  const calculateMaxHp = () => {
    const conMod = abilityMods.constitution
    if (characterClasses.length === 0 && !selectedClass) return Math.max(8 + conMod, 1)
    let hp = 0
    let isFirstLevel = true
    const classesForHp =
      characterClasses.length > 0
        ? characterClasses
        : selectedClass
          ? [{ ...selectedClass, level: character.level }]
          : []
    for (const cls of classesForHp) {
      const hitDie = cls.hit_die ?? 8
      for (let i = 0; i < cls.level; i++) {
        if (isFirstLevel) {
          hp += hitDie + conMod
          isFirstLevel = false
        } else {
          hp += Math.floor(hitDie / 2) + 1 + conMod
        }
      }
    }
    const total = Number.isFinite(hp) ? hp : 8 + conMod
    return Math.max(total, 1)
  }
  const totalCharacterLevel =
    characterClasses.length > 0
      ? characterClasses.reduce((sum, cls) => sum + cls.level, 0)
      : character.level
  const maxHp = applyHpCharacteristics(
    calculateMaxHp(),
    aggregatedCharacteristics,
    totalCharacterLevel,
  )
  
  const armorOptions = equipment.filter(isArmorItem)
  const shieldOptions = equipment.filter(isShieldItem)
  const weaponOptions = equipment.filter(isWeaponItem)
  const equippedArmor = armorOptions.find((item) => item.id === equippedArmorId) ?? null
  const equippedShield = shieldOptions.find((item) => item.id === equippedShieldId) ?? null
  const equippedWeapon = weaponOptions.find((item) => item.id === equippedWeaponId) ?? null
  const baseArmorClass = calculateArmorClass(abilityMods.dexterity, equippedArmor, equippedShield)
  const armorClass = applyAcCharacteristics(
    baseArmorClass,
    aggregatedCharacteristics,
    abilityMods,
    proficiencyBonus,
  )
  const baseEquippedWeaponAttack =
    equippedWeapon && primaryClass
      ? calculateWeaponAttack(
          equippedWeapon,
          abilityMods,
          proficiencyBonus,
          isWeaponProficient(equippedWeapon, effectiveWeaponProficiencies),
        )
      : equippedWeapon
        ? calculateWeaponAttack(equippedWeapon, abilityMods, proficiencyBonus, false)
        : null
  const equippedWeaponAttack =
    baseEquippedWeaponAttack && equippedWeapon
      ? (() => {
          const weaponProps = getWeaponPropertyTags(equippedWeapon)
          const attackBonus =
            baseEquippedWeaponAttack.attackBonus +
            sumAttackRollModifiers(aggregatedCharacteristics, {
              subcategory: equippedWeapon.subcategory ?? "",
              properties: weaponProps,
            })
          const damageBonus = sumDamageRollModifiers(aggregatedCharacteristics, {
            subcategory: equippedWeapon.subcategory ?? "",
            properties: weaponProps,
            damageType: equippedWeapon.damage_type ?? "",
          })
          const damageDisplay =
            damageBonus > 0
              ? `${baseEquippedWeaponAttack.damageDisplay} + ${damageBonus}`
              : baseEquippedWeaponAttack.damageDisplay
          return { attackBonus, damageDisplay }
        })()
      : baseEquippedWeaponAttack
  
  // Speed from species + characteristic modifiers
  const baseWalkSpeed =
    typeof selectedSpecies?.speed === "number"
      ? selectedSpecies.speed
      : typeof selectedSpecies?.speed === "object" && selectedSpecies?.speed
        ? (selectedSpecies.speed as { walking?: number }).walking ?? 30
        : 30
  let speed = baseWalkSpeed
  for (const mod of builderCharacteristicMods) {
    if (mod.type !== "speed") continue
    const key = mod.speedType === "custom" ? mod.customType?.toLowerCase() || "custom" : mod.speedType
    if (key !== "walk") continue
    speed = mod.mode === "set" ? mod.value : speed + mod.value
  }
  
  // Passive Perception (10 + wis mod + proficiency if proficient)
  const passivePerception =
    10 +
    abilityMods.wisdom +
    (effectiveSkillProficiencies.includes("Perception")
      ? proficiencyBonus *
        (effectiveSkillExpertise.includes("Perception") ? 2 : 1)
      : 0)
  
  // Initiative (DEX mod + characteristic modifiers)
  const initiative = computeInitiative(
    abilityMods.dexterity,
    aggregatedCharacteristics,
    abilityMods,
    proficiencyBonus,
  )
  
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
    ...(selectedSpecies?.traits
      ?.filter(
        (t) =>
          t.name.toLowerCase().includes("resistance") ||
          t.description?.toLowerCase().includes("resistance to"),
      )
      .map((t) => t.name) || []),
  ]
  const immunityDisplay = aggregatedCharacteristics.immunities

  const saveCharacter = async () => {
    setSaving(true)
    try {
      const db = createClient()
      const cls = classes.find((c) => c.id === character.class_id)
      const calculatedLevel =
        classLevels.length > 0
          ? classLevels.reduce((sum, cl) => sum + cl.level, 0)
          : character.level
      const conMod = Math.floor((character.constitution - 10) / 2)
      const dexMod = Math.floor((character.dexterity - 10) / 2)

      let hitPointMax = 0
      const classesForHp =
        classLevels.length > 0
          ? classLevels.map((cl) => ({ cls: classes.find((c) => c.id === cl.classId), level: cl.level }))
          : cls
            ? [{ cls, level: calculatedLevel }]
            : []

      let isFirst = true
      for (const { cls: c, level: lvl } of classesForHp) {
        if (!c) continue
        for (let i = 0; i < lvl; i++) {
          if (isFirst) {
            hitPointMax += c.hit_die + conMod
            isFirst = false
          } else {
            hitPointMax += Math.floor(c.hit_die / 2) + 1 + conMod
          }
        }
      }
      hitPointMax = Math.max(hitPointMax, 1)

      const savedEquippedArmor =
        equipment.filter(isArmorItem).find((item) => item.id === equippedArmorId) ?? null
      const savedEquippedShield =
        equipment.filter(isShieldItem).find((item) => item.id === equippedShieldId) ?? null
      const savedArmorClass = calculateArmorClass(dexMod, savedEquippedArmor, savedEquippedShield)

      const bg = backgrounds.find((b) => b.id === character.background_id)
      const characterData: Record<string, unknown> = {
        name: character.name.trim() || "Unnamed",
        level: calculatedLevel,
        class_id: character.class_id,
        subclass_id: character.class_id ? subclassByClassId[character.class_id] ?? null : null,
        species_id: character.species_id,
        background_id: character.background_id,
        strength: character.strength,
        dexterity: character.dexterity,
        constitution: character.constitution,
        intelligence: character.intelligence,
        wisdom: character.wisdom,
        charisma: character.charisma,
        alignment: character.alignment ?? null,
        personality_traits: character.personality_traits || null,
        ideals: character.ideals || null,
        bonds: character.bonds || null,
        flaws: character.flaws || null,
        backstory: character.backstory || null,
        appearance: character.appearance ?? null,
        portrait_url: normalizePortraitUrl(character.portrait_url),
        banner_url: normalizeBannerUrl(character.banner_url),
        skill_proficiencies: mergeSkillProficiencies(
          bg?.skill_proficiencies,
          classSkillPicks,
          character.skill_proficiencies,
        ),
        tool_proficiencies: character.tool_proficiencies ?? [],
        weapon_proficiencies: character.weapon_proficiencies ?? [],
        armor_proficiencies: character.armor_proficiencies ?? [],
        languages: character.languages ?? ["Common"],
        equipment_ids: character.equipment_ids ?? [],
        spell_ids: mergeSpellPicks(spellPicksByClassId),
        feat_ids: selectedFeatIds.filter(Boolean),
        asi_allocations: asiAllocationsByFeatId,
        hit_point_max: hitPointMax,
        hit_points: currentHp ?? hitPointMax,
        armor_class: savedArmorClass,
        speed,
        initiative,
        proficiency_bonus: Math.floor((calculatedLevel - 1) / 4) + 2,
      }

      if (!editingCharacterId) {
        characterData.local_id = `local_${Date.now()}`
      }

      const { data, error } = editingCharacterId
        ? await db.from("characters").update(characterData).eq("id", editingCharacterId).select().single()
        : await db.from("characters").insert([characterData]).select().single()

      if (error || !data?.id) {
        console.error("Error saving character:", error)
        alert(error?.message ?? "Failed to save character. Please try again.")
        return
      }

      clearBuilderDraft()
      router.push(characterSheetHref(data.id))
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
  
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return (
          validateClassStepChoices(
            classLevels,
            classes,
            subclasses,
            classSkillPicks,
            subclassByClassId,
            featureChoicePicks,
          ) &&
          selectedFeatCount === requiredFeatSlots
        )
      case 2:
        return validateOriginStepChoices(
          character.species_id,
          character.background_id,
          selectedSpecies,
          speciesTraitPicks,
        )
      case 3:
        return allSelectedAsiAllocationsValid(selectedFeatIds, asiAllocationsByFeatId, feats)
      case 4: return true
      case 5: return character.name.trim().length > 0
      case 6: return character.name.trim().length > 0
      default: return false
    }
  }

  const goToStep = (stepId: number) => {
    if (stepId >= 1 && stepId <= maxStepReached) {
      setCurrentStep(stepId)
    }
  }

  const advanceStep = () => {
    if (!canProceed() || currentStep >= 6) return
    const next = currentStep + 1
    setCurrentStep(next)
    setMaxStepReached((prev) => Math.max(prev, next))
  }

  const getAbilityModifier = (score: number) => {
    const mod = Math.floor((score - 10) / 2)
    return mod >= 0 ? `+${mod}` : `${mod}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-8" />
            <div className="h-64 bg-muted rounded-2xl" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div id="builder-root" className="min-h-screen bg-background">
      <MainNav />
      
      <main id="builder-main" className="max-w-7xl mx-auto px-4 py-8 min-h-[calc(100vh-4rem)]">
        {/* Step Indicator */}
        <div id="builder-steps" className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isReachable = step.id <= maxStepReached
              const isComplete = step.id < currentStep || (step.id < maxStepReached && !isActive)
              
              return (
                <div key={step.id} className="flex items-center flex-1 min-w-0">
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
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isComplete ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-[10px] md:text-xs mt-1 font-medium ${
                      isActive ? "text-primary" : isReachable ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {step.label}
                    </span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-1 md:mx-2 rounded min-w-[8px] ${
                      step.id < maxStepReached ? "bg-success" : "bg-muted"
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Mobile: toggle between step choices and character preview */}
        <div className="lg:hidden flex gap-2 mb-4">
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
            className={`lg:col-span-3 bg-card rounded-2xl border-2 border-border p-6 min-h-[720px] ${
              mobilePanel === "preview" ? "hidden lg:block" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-4 mb-4">
              <button
                type="button"
                onClick={resetCharacter}
                className="px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-destructive border border-border hover:border-destructive rounded-lg transition-colors"
              >
                Clear All
              </button>

              <BuilderStepNav
                currentStep={currentStep}
                canProceed={canProceed()}
                saving={saving}
                onBack={() => goToStep(currentStep - 1)}
                onContinue={advanceStep}
                onSave={saveCharacter}
                saveLabel={editingCharacterId ? "Save Character" : "Create Character"}
              />
            </div>

            {editingCharacterId && (
              <p className="text-sm text-muted-foreground mb-4 -mt-2">
                Editing an existing character. Changes are saved when you click Save Character on the review step.
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
                <p className="text-muted-foreground mb-4">Your class determines your combat abilities and special features.</p>
                
                {/* Current Class Levels */}
                {classLevels.length > 0 && (
                  <div className="mb-4 p-3 bg-muted rounded-xl">
                    <p className="text-xs text-muted-foreground mb-2 uppercase font-bold">Current Classes (Total Level: {totalLevel})</p>
                    <div className="space-y-2">
                      {classLevels.map((cl, idx) => {
                        const cls = classes.find(c => c.id === cl.classId)
                        return (
                          <div key={idx} className="flex items-center gap-2 bg-card rounded-lg p-2">
                            <span className="font-bold text-sm text-foreground flex-1">{cls?.name}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const newLevels = [...classLevels]
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
                                    clearClassChoices(cl.classId)
                                    newLevels.splice(idx, 1)
                                    setClassLevels(newLevels)
                                    if (newLevels.length === 0) {
                                      setCharacter({ ...character, class_id: null, subclass_id: null })
                                    }
                                  }
                                }}
                                className="p-1 bg-muted hover:bg-destructive/20 rounded"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center font-bold text-sm">{cl.level}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (totalLevel < 20) {
                                    const newLevels = [...classLevels]
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
                                clearClassChoices(cl.classId)
                                const remaining = classLevels.filter((_, i) => i !== idx)
                                setClassLevels(remaining)
                                if (remaining.length === 0) {
                                  setCharacter({ ...character, class_id: null, subclass_id: null })
                                }
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
                
                <p className="text-xs text-muted-foreground mb-2">Click a class to add it, or increase its level if already selected.</p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pl-[10px] pt-[10px] pr-[10px] pb-[10px]">
                  {classes
                    .filter(cls => cls.name.toLowerCase().includes(classSearch.toLowerCase()))
                    .map((cls) => {
                      const existingLevel = classLevels.find(cl => cl.classId === cls.id)
                      const isSelected = !!existingLevel || character.class_id === cls.id
                      return (
                        <motion.div
                          key={cls.id}
                          role="button"
                          tabIndex={0}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter" && e.key !== " ") return
                            e.preventDefault()
                            ;(e.currentTarget as HTMLDivElement).click()
                          }}
                          onClick={() => {
                            if (existingLevel) {
                              // Increase level of existing class
                              if (totalLevel < 20) {
                                setClassLevels(classLevels.map(cl => 
                                  cl.classId === cls.id ? { ...cl, level: cl.level + 1 } : cl
                                ))
                              }
                            } else {
                              // Add new class at level 1
                              if (classLevels.length === 0) {
                                setCharacter({ ...character, class_id: cls.id })
                              }
                              if (totalLevel < 20) {
                                setClassLevels([...classLevels, { classId: cls.id, level: 1 }])
                                if (!character.class_id) {
                                  setCharacter({ ...character, class_id: cls.id })
                                }
                              }
                            }
                          }}
                          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                            totalLevel >= 20 && !existingLevel ? "opacity-50 pointer-events-none" : ""
                          } ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border bg-card hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-sm text-foreground">{cls.name}</h3>
                            <div className="flex items-center gap-1">
                              {existingLevel && (
                                <span className="text-xs px-1.5 py-0.5 bg-primary text-primary-foreground rounded">
                                  Lv{existingLevel.level}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDetailsModal({ type: "class", item: cls })
                                }}
                                className="p-1 text-muted-foreground hover:text-primary"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {cls.source || "Custom"}
                          </p>
                        </motion.div>
                      )
                    })}
                </div>

                {classLevels.length > 0 && (
                  <div className="mt-6 space-y-2 border-t border-border pt-6">
                    <h3 className="text-lg font-bold text-foreground">Class Options</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      Complete choices for your selected class(es) before continuing.
                    </p>
                    {classLevels.map((entry) => {
                      const cls = classes.find((c) => c.id === entry.classId)
                      if (!cls) return null
                      const classSubclasses = getSubclassesForClass(subclasses, entry.classId)
                      const eligibleFeatures = (cls.features ?? []).filter(
                        (feature) =>
                          feature.level <= entry.level && feature.isChoice && feature.choices,
                      )

                      return (
                        <div key={entry.classId} className="space-y-1">
                          <p className="text-sm font-semibold text-primary">
                            {cls.name} (Level {entry.level})
                          </p>

                          {entry.level >= 1 &&
                            cls.skill_choices &&
                            cls.skill_choices.options.length > 0 && (
                            <MultiSelectChoices
                              title="Level 1 Skill Proficiencies"
                              hint={`Choose ${cls.skill_choices.count} from the list below.`}
                              options={cls.skill_choices.options.map((name) => ({ name }))}
                              maxCount={cls.skill_choices.count}
                              selected={classSkillPicks[entry.classId] ?? []}
                              unavailableOptions={[
                                ...getTakenSkills(skillPickSources, `class:${entry.classId}`),
                              ]}
                              onChange={(selected) =>
                                setClassSkillPicks((prev) => ({
                                  ...prev,
                                  [entry.classId]: selected,
                                }))
                              }
                            />
                          )}

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
                                        setSubclassByClassId((prev) => ({
                                          ...prev,
                                          [entry.classId]: subclass.id,
                                        }))
                                      }
                                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                                        isSelected
                                          ? "border-primary bg-primary/10"
                                          : "border-border bg-card hover:border-primary/40"
                                      }`}
                                    >
                                      <p className="font-semibold text-sm text-foreground">{subclass.name}</p>
                                      {subclass.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                          {subclass.description}
                                        </p>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {eligibleFeatures.map((feature) => {
                            const key = featureChoiceKey(entry.classId, feature.name)
                            return (
                              <MultiSelectChoices
                                key={key}
                                title={feature.name}
                                hint={feature.choices!.category}
                                options={feature.choices!.options}
                                maxCount={feature.choices!.count}
                                selected={featureChoicePicks[key] ?? []}
                                unavailableOptions={[...getTakenSkills(skillPickSources, `feature:${key}`)]}
                                onChange={(selected) =>
                                  setFeatureChoicePicks((prev) => ({ ...prev, [key]: selected }))
                                }
                                accentClass="border-accent bg-accent/10"
                              />
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Level-based Feats (SRD: 4/8/12/16 general, 19 epic boon) */}
                {classLevels.length > 0 && requiredFeatSlots > 0 && (
                  <div className="mt-6 p-4 bg-muted/40 rounded-xl border border-border">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">Feats</h3>
                        <p className="text-xs text-muted-foreground">
                          At levels 4, 8, 12, and 16 choose a General feat; at level 19 choose an Epic Boon.
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
                    {!featsLoadError && feats.length === 0 && (
                      <p className="text-xs text-muted-foreground mb-3">
                        No feats in your compendium yet. Seed SRD content from Settings or add General
                        feats in the Compendium.
                      </p>
                    )}

                    {FEAT_MILESTONES.filter((lvl) => lvl <= totalLevel).map((lvl, slotIndex) => {
                      const pickedId = selectedFeatIds[slotIndex] ?? null
                      const picked = feats.find((f) => f.id === pickedId) ?? null
                      const featContext = {
                        totalLevel,
                        classIds: classLevels.map((cl) => cl.classId),
                        selectedFeatIds,
                        speciesId: character.species_id,
                        backgroundId: character.background_id,
                        currentSlotFeatId: pickedId,
                      }
                      const eligible = feats
                        .filter((feat) => isFeatEligibleForSlot(feat, lvl, featContext))
                        .sort((a, b) => a.name.localeCompare(b.name))

                      return (
                        <div key={lvl} className="mt-3">
                          <p className="text-xs font-bold text-primary uppercase mb-2">
                            {lvl === 19 ? "Epic Boon (Level 19)" : `General Feat (Level ${lvl})`}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {eligible.map((feat) => {
                              const isSelected = feat.id === pickedId
                              return (
                                <button
                                  key={feat.id}
                                  type="button"
                                  onClick={() => {
                                    const next = [...selectedFeatIds]
                                    while (next.length <= slotIndex) next.push("")
                                    const previousId = next[slotIndex]
                                    if (isSelected) {
                                      next[slotIndex] = ""
                                    } else {
                                      next[slotIndex] = feat.id
                                    }
                                    setCharacter((prev) => ({
                                      ...prev,
                                      feat_ids: next.slice(0, requiredFeatSlots),
                                    }))
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
                          {eligible.length === 0 && !featsLoadError && feats.length > 0 && (
                            <p className="text-xs text-muted-foreground">No eligible feats for this slot.</p>
                          )}
                          {picked && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Selected: <span className="font-semibold text-foreground">{picked.name}</span>
                            </p>
                          )}
                          {picked && isAsiFeat(picked) && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Allocate ability increases on the Abilities step.
                            </p>
                          )}
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
                  <p className="text-muted-foreground mb-3">Your species grants unique traits and abilities.</p>
                  
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
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                    {species
                      .filter(sp => sp.name.toLowerCase().includes(speciesSearch.toLowerCase()))
                      .map((sp) => (
                      <motion.div
                        key={sp.id}
                        role="button"
                        tabIndex={0}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return
                          e.preventDefault()
                          ;(e.currentTarget as HTMLDivElement).click()
                        }}
                        onClick={() => {
                          const nextId = character.species_id === sp.id ? null : sp.id
                          setCharacter({ ...character, species_id: nextId })
                          setSpeciesTraitPicks({})
                        }}
                        className={`p-2 rounded-lg border-2 text-left transition-all cursor-pointer ${
                          character.species_id === sp.id
                            ? "border-secondary bg-secondary/10"
                            : "border-border bg-card hover:border-secondary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm text-foreground">{sp.name}</h3>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDetailsModal({ type: "species", item: sp })
                            }}
                            className="p-0.5 text-muted-foreground hover:text-primary"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">{sp.source || "Custom"}</p>
                      </motion.div>
                    ))}
                  </div>

                  {selectedSpecies && (selectedSpecies.traits ?? []).some((t) => t.isChoice && t.choices) && (
                    <div className="mt-4 space-y-2 border-t border-border pt-4">
                      <h3 className="text-lg font-bold text-foreground">Species Options</h3>
                      {(selectedSpecies.traits ?? []).map((trait, index) => {
                        if (!trait.isChoice || !trait.choices) return null
                        return (
                          <MultiSelectChoices
                            key={`${selectedSpecies.id}-${index}`}
                            title={trait.name}
                            hint={trait.choices.category}
                            options={trait.choices.options}
                            maxCount={trait.choices.count}
                            selected={speciesTraitPicks[String(index)] ?? []}
                            unavailableOptions={[
                              ...getTakenSkills(skillPickSources, `species:${index}`),
                            ]}
                            onChange={(selected) =>
                              setSpeciesTraitPicks((prev) => ({ ...prev, [String(index)]: selected }))
                            }
                            accentClass="border-secondary bg-secondary/10"
                          />
                        )
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-black text-foreground mb-2">Choose Your Background</h2>
                  <p className="text-muted-foreground mb-3">Your background provides ability bonuses and a 1st-level feat.</p>
                  
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
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                    {backgrounds
                      .filter(bg => bg.name.toLowerCase().includes(backgroundSearch.toLowerCase()))
                      .map((bg) => (
                      <motion.div
                        key={bg.id}
                        role="button"
                        tabIndex={0}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return
                          e.preventDefault()
                          ;(e.currentTarget as HTMLDivElement).click()
                        }}
                        onClick={() => {
                          const nextId =
                            character.background_id === bg.id ? null : bg.id
                          const nextBg = nextId
                            ? backgrounds.find((b) => b.id === nextId)
                            : null
                          setCharacter((prev) => {
                            let next: CharacterDraft = {
                              ...prev,
                              background_id: nextId,
                            }
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
                        }}
                        className={`p-2 rounded-lg border-2 text-left transition-all cursor-pointer ${
                          character.background_id === bg.id
                            ? "border-accent bg-accent/10"
                            : "border-border bg-card hover:border-accent/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm text-foreground">{bg.name}</h3>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDetailsModal({ type: "background", item: bg })
                            }}
                            className="p-0.5 text-muted-foreground hover:text-primary"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">{bg.source || "Custom"}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Ability Scores */}
            {currentStep === 3 && (
              <div>
                <h2 className="text-2xl font-black text-foreground mb-2">Determine Ability Scores</h2>
                <p className="text-muted-foreground mb-6">Set your character&apos;s core abilities.</p>

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

                {abilityMethod === "roll" && (
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={rollAbilities}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/15 text-secondary rounded-xl font-semibold hover:bg-secondary/25 transition-colors"
                    >
                      <Dices className="w-4 h-4" />
                      Roll again
                    </button>
                  </div>
                )}

                {abilityMethod === "pointbuy" && (
                  <div className="mb-4 p-3 bg-primary/10 rounded-xl text-center">
                    <span className="font-bold text-primary">Points Remaining: {pointsRemaining}</span>
                  </div>
                )}

                {milestoneAsiFeatCount > 0 && (
                  <div className="mb-6">
                    <AsiAllocator
                      allocation={milestoneAsiAllocation}
                      totalPoints={milestoneAsiTotalPoints}
                      pickCount={milestoneAsiFeatCount}
                      onChange={(allocation) =>
                        setAsiAllocationsByFeatId((prev) =>
                          withCombinedMilestoneAsiAllocation(prev, allocation),
                        )
                      }
                    />
                  </div>
                )}

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
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          {(abilityMethod === "pointbuy") && (
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
                              disabled={abilityMethod === "pointbuy" && character[ability] >= 15}
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
                            const selectedHere = character[ability] === value
                            const usedElsewhere = isStandardValueUsedElsewhere(ability, value)
                            const disabled = usedElsewhere && !selectedHere
                            return (
                              <button
                                key={value}
                                type="button"
                                disabled={disabled}
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
                        {getAbilityModifier(character[ability])}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Equipment & Spells */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-foreground mb-2">Select Equipment</h2>
                  <p className="text-muted-foreground mb-3">
                    {startingEquipmentGroups.length > 0
                      ? `Choose your ${equipmentClass?.name ?? "class"} starting equipment package, or take gold to buy your own gear.`
                      : "Choose your starting gear."}
                  </p>

                  {startingEquipmentGroups.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {startingEquipmentGroups.map((group, gi) => (
                        <div key={gi}>
                          <p className="text-sm font-medium text-foreground mb-2">{group.description}</p>
                          <div className="space-y-2">
                            {group.options.map((option, oi) => (
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
                                  name="starting-equipment"
                                  checked={startingEquipmentOptionIndex === oi}
                                  onChange={() => selectStartingEquipmentOption(oi)}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-foreground">{option.label}</p>
                                  {!isGoldOnlyOption(option, classStartingGold) && (
                                    <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                                      {option.items.map((item, ii) => (
                                        <li key={ii}>
                                          {item.quantity > 1 ? `${item.quantity}× ` : ""}
                                          {item.name}
                                          {findEquipmentByName(item.name, equipment) ? "" : " (custom)"}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  {isGoldOnlyOption(option, classStartingGold) && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Buy equipment from the full list below with {classStartingGold} GP.
                                    </p>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}

                      {selectedStartingOption && !useGoldEquipment && (
                        <div className="p-3 rounded-lg bg-muted/50 border border-border">
                          <p className="text-xs font-bold text-primary uppercase mb-2">Included in your package</p>
                          <div className="flex flex-wrap gap-2">
                            {character.equipment_ids.map((id) => {
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
                    </div>
                  )}

                  {(startingEquipmentGroups.length === 0 || useGoldEquipment) && (
                    <>
                      {useGoldEquipment && (
                        <p className="text-sm text-muted-foreground mb-3">
                          You have <span className="font-bold text-foreground">{classStartingGold} GP</span> to spend on equipment.
                        </p>
                      )}

                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search equipment..."
                          value={equipmentSearch}
                          onChange={(e) => setEquipmentSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {equipment
                          .filter((item) => item.name.toLowerCase().includes(equipmentSearch.toLowerCase()))
                          .slice(0, 30)
                          .map((item) => (
                            <label
                              key={item.id}
                              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                                character.equipment_ids.includes(item.id)
                                  ? "border-primary bg-primary/10"
                                  : "border-border bg-card hover:border-primary/50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={character.equipment_ids.includes(item.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCharacter({ ...character, equipment_ids: [...character.equipment_ids, item.id] })
                                  } else {
                                    setCharacter({
                                      ...character,
                                      equipment_ids: character.equipment_ids.filter((id) => id !== item.id),
                                    })
                                  }
                                }}
                                className="sr-only"
                              />
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                  character.equipment_ids.includes(item.id)
                                    ? "bg-primary border-primary"
                                    : "border-muted-foreground"
                                }`}
                              >
                                {character.equipment_ids.includes(item.id) && (
                                  <Check className="w-2.5 h-2.5 text-white" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-foreground truncate">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.source || "D&D 5.5e SRD"}</p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setDetailsModal({ type: "equipment", item })
                                }}
                                className="p-0.5 text-muted-foreground hover:text-primary shrink-0"
                              >
                                <Info className="w-3 h-3" />
                              </button>
                            </label>
                          ))}
                      </div>
                    </>
                  )}
                </div>

                {spellcastingClasses.length > 0 && (
                  <div className="space-y-8">
                    <h2 className="text-2xl font-black text-foreground mb-2">Select Spells</h2>

                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search spells..."
                        value={spellSearch}
                        onChange={(e) => setSpellSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                      />
                    </div>

                    {spellcastingClasses.map((casterClass) => {
                      const casterLevel =
                        classLevels.find((cl) => cl.classId === casterClass.id)?.level ?? 1
                      const spellLimits = getSpellLimits(casterClass.spellcasting, casterLevel)
                      const classSpellIds = spellPicksByClassId[casterClass.id] ?? []
                      const spellCounts = countSelectedSpells(classSpellIds, spells, casterClass.name)
                      const maxSpellLevel = spellLimits.maxSpellLevel
                      const availableSpells = spells
                        .filter(
                          (s) =>
                            s.classes?.includes(casterClass.name) &&
                            (s.level === 0 || s.level <= maxSpellLevel),
                        )
                        .filter((s) => s.name.toLowerCase().includes(spellSearch.toLowerCase()))

                      const spellsByLevel: Record<number, typeof availableSpells> = {}
                      availableSpells.forEach((s) => {
                        if (!spellsByLevel[s.level]) spellsByLevel[s.level] = []
                        spellsByLevel[s.level].push(s)
                      })

                      return (
                        <div
                          key={casterClass.id}
                          className="border border-border rounded-xl p-4 bg-card/50"
                        >
                          <p className="font-bold text-foreground mb-1">
                            {casterClass.name} (class level {casterLevel})
                          </p>
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

                          <div className="space-y-4 max-h-64 overflow-y-auto">
                            {Object.entries(spellsByLevel)
                              .sort(([a], [b]) => Number(a) - Number(b))
                              .map(([level, levelSpells]) => (
                                <div key={`${casterClass.id}-${level}`}>
                                  <p className="text-xs font-bold text-primary uppercase mb-2">
                                    {level === "0" ? "Cantrips" : `Level ${level} Spells`}
                                  </p>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {levelSpells.slice(0, 15).map((spell) => {
                                      const selected = classSpellIds.includes(spell.id)
                                      const selectable = canSelectSpell(
                                        spell,
                                        classSpellIds,
                                        spells,
                                        spellLimits,
                                        casterClass.name,
                                      )
                                      return (
                                        <label
                                          key={spell.id}
                                          className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                                            selected
                                              ? "border-secondary bg-secondary/10 cursor-pointer"
                                              : selectable
                                                ? "border-border bg-card hover:border-secondary/50 cursor-pointer"
                                                : "border-border bg-card opacity-50 cursor-not-allowed"
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={selected}
                                            disabled={!selectable}
                                            onChange={(e) => {
                                              setSpellPicksByClassId((prev) => {
                                                const current = prev[casterClass.id] ?? []
                                                const next = e.target.checked
                                                  ? [...current, spell.id]
                                                  : current.filter((id) => id !== spell.id)
                                                return { ...prev, [casterClass.id]: next }
                                              })
                                            }}
                                            className="sr-only"
                                          />
                                          <div
                                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                              selected
                                                ? "bg-secondary border-secondary"
                                                : "border-muted-foreground"
                                            }`}
                                          >
                                            {selected && <Check className="w-2.5 h-2.5 text-white" />}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-foreground truncate">
                                              {spell.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{spell.school}</p>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                              setDetailsModal({ type: "spell", item: spell })
                                            }}
                                            className="p-0.5 text-muted-foreground hover:text-primary shrink-0"
                                          >
                                            <Info className="w-3 h-3" />
                                          </button>
                                        </label>
                                      )
                                    })}
                                  </div>
                                </div>
                              ))}
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
              </div>
            )}

            {/* Step 5: Character Details */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-foreground mb-2">Character Details</h2>
                <p className="text-muted-foreground mb-6">Give your character a name and personality.</p>

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
                            onClick={() => setCharacter({ ...character, portrait_url: null })}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="w-32 h-32 bg-muted rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                          <Upload className="w-8 h-8 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Portrait</span>
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
                            onClick={() => setCharacter({ ...character, banner_url: null })}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="w-full h-32 bg-muted rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                          <Upload className="w-8 h-8 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Landscape banner (optional)</span>
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
                      onChange={(e) => setCharacter({ ...character, name: e.target.value })}
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
                      onChange={(e) => setCharacter({ ...character, personality_traits: e.target.value })}
                      placeholder="Describe your character's personality..."
                      rows={3}
                      className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Ideals</label>
                    <textarea
                      value={character.ideals}
                      onChange={(e) => setCharacter({ ...character, ideals: e.target.value })}
                      placeholder="What principles guide your character?"
                      rows={3}
                      className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Bonds</label>
                    <textarea
                      value={character.bonds}
                      onChange={(e) => setCharacter({ ...character, bonds: e.target.value })}
                      placeholder="What connections matter most to your character?"
                      rows={3}
                      className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Flaws</label>
                    <textarea
                      value={character.flaws}
                      onChange={(e) => setCharacter({ ...character, flaws: e.target.value })}
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
                    onChange={(e) => setCharacter({ ...character, backstory: e.target.value })}
                    placeholder="Tell your character's story..."
                    rows={5}
                    className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 6: Review */}
            {currentStep === 6 && (
              <div>
                <h2 className="text-2xl font-black text-foreground mb-6">Review Your Character</h2>
                
                <div className="bg-card rounded-2xl p-6 border-2 border-border mb-6">
                  <div className="flex items-start gap-6 mb-6">
                    {character.portrait_url ? (
                      <img
                        src={character.portrait_url}
                        alt={character.name}
                        className="w-24 h-24 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-muted rounded-2xl flex items-center justify-center">
                        <UserCircle className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-2xl font-black text-foreground">{character.name || "Unnamed Hero"}</h3>
                      <p className="text-muted-foreground">
                        Level {character.level} {selectedClass?.name || "Adventurer"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedSpecies?.name} - {selectedBackground?.name}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-2 mb-6">
                    {ABILITY_NAMES.map((ability) => (
                      <div key={ability} className="text-center bg-muted rounded-lg p-2">
                        <p className="text-xs text-muted-foreground uppercase">{ability.slice(0, 3)}</p>
                        <p className="text-lg font-bold text-foreground">{character[ability]}</p>
                        <p className="text-sm text-primary">{getAbilityModifier(character[ability])}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Equipment:</span>
                      <span className="text-foreground ml-2">{character.equipment_ids.length} items</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Spells:</span>
                      <span className="text-foreground ml-2">{mergedSpellIds.length} spells</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

            <div className="flex justify-end mt-6 pt-4 border-t border-border">
              <BuilderStepNav
                currentStep={currentStep}
                canProceed={canProceed()}
                saving={saving}
                onBack={() => goToStep(currentStep - 1)}
                onContinue={advanceStep}
                onSave={saveCharacter}
                saveLabel={editingCharacterId ? "Save Character" : "Create Character"}
              />
            </div>
          </div>

          {/* Right Column: Character Sheet Preview */}
          <div
            id="builder-preview"
            className={`lg:col-span-2 ${mobilePanel === "steps" ? "hidden lg:block" : ""}`}
          >
            <div className="builder-preview-panel bg-card rounded-2xl border-2 border-border p-4 lg:sticky lg:top-24 min-h-[720px]">
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
                      <span className="text-primary font-medium">{cls.name} {cls.level}</span>
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
                  { id: "combat", label: "Combat", icon: Swords },
                  { id: "features", label: "Features", icon: Sparkles },
                  { id: "custom", label: "Custom", icon: Wand2 },
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
                        <p className="text-sm text-muted-foreground uppercase mb-1 font-bold">Skills</p>
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
                          <p className="text-base font-black text-cyan">{darkvision > 0 ? `${darkvision} ft` : "—"}</p>
                        </div>
                      </div>
                      
                      {/* Second row: Speed and Initiative */}
                      <div className="grid grid-cols-2 gap-1">
                        <div className="p-1.5 bg-muted/50 rounded-lg text-center">
                          <p className="text-[7px] text-muted-foreground uppercase">Speed</p>
                          <p className="text-base font-black text-accent">{speed} ft</p>
                        </div>
                        <div className="p-1.5 bg-muted/50 rounded-lg text-center">
                          <p className="text-[7px] text-muted-foreground uppercase">Initiative</p>
                          <p className="text-base font-black text-lime">{initiative >= 0 ? `+${initiative}` : initiative}</p>
                        </div>
                      </div>
                      
                      {/* Third row: Proficiency and Passive Perception */}
                      <div className="grid grid-cols-2 gap-1">
                        <div className="p-1.5 bg-muted/50 rounded-lg text-center">
                          <p className="text-[7px] text-muted-foreground uppercase">Proficiency</p>
                          <p className="text-base font-black text-lime">+{proficiencyBonus}</p>
                        </div>
                        <div className="p-1.5 bg-muted/50 rounded-lg text-center">
                          <p className="text-[7px] text-muted-foreground uppercase">Passive</p>
                          <p className="text-base font-black text-foreground">{passivePerception}</p>
                        </div>
                      </div>

                      {/* Saving Throws */}
                      <div className="p-2 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground uppercase mb-1 font-bold">Saves</p>
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
                    </div>
                  </div>

                  {(effectiveWeaponProficiencies.length > 0 ||
                    effectiveArmorProficiencies.length > 0 ||
                    effectiveToolProficiencies.length > 0 ||
                    (character.languages?.length ?? 0) > 0) && (
                    <div className="p-2 bg-muted/30 rounded-lg space-y-1.5">
                      <p className="text-sm text-muted-foreground uppercase font-bold">Proficiencies</p>
                      {effectiveWeaponProficiencies.length > 0 && (
                        <p className="text-[10px] text-foreground">
                          <span className="text-muted-foreground">Weapons: </span>
                          {effectiveWeaponProficiencies.join(", ")}
                        </p>
                      )}
                      {effectiveArmorProficiencies.length > 0 && (
                        <p className="text-[10px] text-foreground">
                          <span className="text-muted-foreground">Armor: </span>
                          {effectiveArmorProficiencies.join(", ")}
                        </p>
                      )}
                      {effectiveToolProficiencies.length > 0 && (
                        <p className="text-[10px] text-foreground">
                          <span className="text-muted-foreground">Tools: </span>
                          {effectiveToolProficiencies.join(", ")}
                        </p>
                      )}
                      {(character.languages?.length ?? 0) > 0 && (
                        <p className="text-[10px] text-foreground">
                          <span className="text-muted-foreground">Languages: </span>
                          {(character.languages ?? []).join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Combat Tab */}
              {previewTab === "combat" && (
                <div className="space-y-3">
                  {/* Top combat stats row */}
                  <div className="grid grid-cols-4 gap-1 text-center">
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <Shield className="w-3 h-3 mx-auto text-secondary mb-0.5" />
                      <p className="text-[8px] text-muted-foreground">AC</p>
                      <p className="text-lg font-black text-secondary">{armorClass}</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <Heart className="w-3 h-3 mx-auto text-destructive mb-0.5" />
                      <p className="text-[8px] text-muted-foreground">HP</p>
                      <p className="text-lg font-black text-foreground">{currentHp ?? maxHp}/{maxHp}</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-[8px] text-muted-foreground">Speed</p>
                      <p className="text-lg font-black text-accent">{speed}</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-[8px] text-muted-foreground">Initiative</p>
                      <p className="text-lg font-black text-lime">{initiative >= 0 ? `+${initiative}` : initiative}</p>
                    </div>
                  </div>
                  
                  {/* Spellcasting Stats (if class has spellcasting) */}
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
                              <p className="text-xl font-black text-magenta">
                                {8 + proficiencyBonus + spellMod}
                              </p>
                            </div>
                            <div>
                              <p className="text-[8px] text-muted-foreground">Spell Attack</p>
                              <p className="text-xl font-black text-magenta">
                                +{proficiencyBonus + spellMod}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                  {/* Resistances */}
                  <div className="p-2 bg-muted/30 rounded-lg">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold mb-1">Resistances</p>
                    <p className="text-[10px] text-foreground italic">
                      {resistanceDisplay.length > 0 ? resistanceDisplay.join(", ") : "None"}
                    </p>
                  </div>
                  {immunityDisplay.length > 0 && (
                    <div className="p-2 bg-muted/30 rounded-lg">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold mb-1">Immunities</p>
                      <p className="text-[10px] text-foreground italic">{immunityDisplay.join(", ")}</p>
                    </div>
                  )}

                  {/* Equipped Items */}
                  <div className="p-2 bg-muted/30 rounded-lg">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold mb-2">Equipped Items</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <p className="text-muted-foreground mb-0.5">Armor</p>
                        <select
                          value={equippedArmorId ?? ""}
                          onChange={(e) => setEquippedArmorId(e.target.value || null)}
                          className="w-full bg-background border border-border rounded px-1 py-0.5 text-foreground text-[10px]"
                        >
                          <option value="">None (Unarmored)</option>
                          {armorOptions.map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-0.5">Shield</p>
                        <select
                          value={equippedShieldId ?? ""}
                          onChange={(e) => setEquippedShieldId(e.target.value || null)}
                          className="w-full bg-background border border-border rounded px-1 py-0.5 text-foreground text-[10px]"
                        >
                          <option value="">None</option>
                          {shieldOptions.map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-muted-foreground mb-0.5">Main Weapon</p>
                      <select
                        value={equippedWeaponId ?? ""}
                        onChange={(e) => setEquippedWeaponId(e.target.value || null)}
                        className="w-full bg-background border border-border rounded px-1 py-0.5 text-foreground text-[10px]"
                      >
                        <option value="">None</option>
                        {weaponOptions.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                      {equippedWeaponAttack && (
                        <div className="mt-1.5 px-2 py-1 bg-background/80 rounded border border-border/60 text-[9px] text-foreground">
                          <p>
                            <span className="text-muted-foreground">To Hit:</span>{" "}
                            {equippedWeaponAttack.attackBonus >= 0
                              ? `+${equippedWeaponAttack.attackBonus}`
                              : equippedWeaponAttack.attackBonus}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Damage:</span>{" "}
                            {equippedWeaponAttack.damageDisplay}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Proficiencies */}
                  <div className="p-2 bg-muted/30 rounded-lg">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold mb-1">Weapon Proficiencies</p>
                    <p className="text-[10px] text-foreground italic">
                      {effectiveWeaponProficiencies.join(", ") || "None"}
                    </p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded-lg">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold mb-1">Armor Proficiencies</p>
                    <p className="text-[10px] text-foreground italic">
                      {effectiveArmorProficiencies.join(", ") || "None"}
                    </p>
                  </div>
                  {(effectiveToolProficiencies.length > 0 ||
                    (character.languages?.length ?? 0) > 0) && (
                    <div className="p-2 bg-muted/30 rounded-lg">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold mb-1">
                        Tools & Languages
                      </p>
                      <p className="text-[10px] text-foreground italic">
                        {[
                          ...effectiveToolProficiencies,
                          ...(character.languages ?? []),
                        ].join(", ") || "None"}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Features Tab */}
              {previewTab === "features" && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {/* Class Features */}
                  {characterClasses.length > 0 ? (
                    characterClasses.map((cls, i) => (
                      <div key={`${cls.id ?? "class"}-${i}`}>
                        <p className="text-[9px] text-primary uppercase font-bold mb-1">{cls.name} Features</p>
                        <div className="space-y-1">
                          {cls.features?.filter(f => f.level <= cls.level).map((feature, i) => (
                            <div key={i} className="p-1.5 bg-muted/30 rounded text-[10px]">
                              <p className="font-bold text-foreground">{feature.name} <span className="text-muted-foreground">(Lv {feature.level})</span></p>
                              <p className="text-muted-foreground line-clamp-2">{feature.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : primaryClass?.features ? (
                    <div>
                      <p className="text-[9px] text-primary uppercase font-bold mb-1">{primaryClass.name} Features</p>
                      <div className="space-y-1">
                        {primaryClass.features.filter(f => f.level <= totalLevel).map((feature, i) => (
                          <div key={i} className="p-1.5 bg-muted/30 rounded text-[10px]">
                            <p className="font-bold text-foreground">{feature.name} <span className="text-muted-foreground">(Lv {feature.level})</span></p>
                            <p className="text-muted-foreground line-clamp-2">{feature.description}</p>
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
                            <p className="text-muted-foreground line-clamp-2">{trait.description}</p>
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
                        <p className="text-muted-foreground line-clamp-3">{selectedBackground.feature.description}</p>
                      </div>
                    </div>
                  )}

                  {/* Origin feat from background */}
                  {selectedBackground?.feat_granted && (
                    <div>
                      <p className="text-[9px] text-lime uppercase font-bold mb-1">Origin Feats</p>
                      <div className="p-1.5 bg-muted/30 rounded text-[10px]">
                        <p className="font-bold text-foreground">{selectedBackground.feat_granted}</p>
                        <p className="text-muted-foreground line-clamp-2">
                          {feats.find((f) => f.name === selectedBackground.feat_granted)?.description ??
                            "Granted by your background at 1st level."}
                        </p>
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
                              <p className="text-muted-foreground line-clamp-2">{feat.description}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Custom Abilities Tab */}
              {previewTab === "custom" && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {customAbilities.length > 0 ? (
                    <>
                      <p className="text-[9px] text-magenta uppercase font-bold mb-1">Custom Abilities</p>
                      <div className="space-y-1">
                        {customAbilities.map((ability) => {
                          const uses = resolveUsesConfig(ability.characteristics, ability.uses)
                          return (
                          <div key={ability.id} className="p-1.5 bg-muted/30 rounded text-[10px]">
                            <p className="font-bold text-foreground">{ability.name}</p>
                            <p className="text-muted-foreground line-clamp-2">{ability.description}</p>
                            {uses && uses.type !== "unlimited" && (
                              <p className="text-[8px] text-magenta mt-0.5">
                                Uses: {uses.type === "fixed" ? uses.fixedAmount : uses.type}
                                {uses.recharge && ` (${uses.recharge.replace("_", " ")})`}
                              </p>
                            )}
                          </div>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <Wand2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No custom abilities available</p>
                      <p className="text-[10px] text-muted-foreground">
                        Custom abilities can be added in the Compendium and marked to show here.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Details Modal */}
      <AnimatePresence>
        {detailsModal.item && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setDetailsModal({ type: null, item: null })}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-black text-foreground">
                  {(detailsModal.item as { name: string }).name}
                </h2>
                <button
                  onClick={() => setDetailsModal({ type: null, item: null })}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {detailsModal.type === "class" && (
                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                      d{(detailsModal.item as DndClass).hit_die} Hit Die
                    </span>
                    {(detailsModal.item as DndClass).spellcasting && (
                      <span className="text-xs px-2 py-1 bg-magenta/10 text-magenta rounded-full">
                        Spellcaster
                      </span>
                    )}
                    {(detailsModal.item as DndClass).weapon_proficiencies?.some(w => 
                      w.toLowerCase().includes("martial")
                    ) && (
                      <span className="text-xs px-2 py-1 bg-orange/10 text-orange rounded-full">
                        Martial Weapons
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(detailsModal.item as DndClass).description}
                  </p>
                  {(detailsModal.item as DndClass).primary_ability && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase mb-1">Primary Abilities</p>
                      <p className="text-sm text-foreground">
                        {(detailsModal.item as DndClass).primary_ability?.join(", ")}
                      </p>
                    </div>
                  )}
                  {(detailsModal.item as DndClass).armor_proficiencies && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase mb-1">Armor</p>
                      <p className="text-sm text-foreground">
                        {(detailsModal.item as DndClass).armor_proficiencies?.join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {detailsModal.type === "species" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <span className="text-xs px-2 py-1 bg-muted rounded-full">
                      {(detailsModal.item as Species).size || "Medium"}
                    </span>
                    <span className="text-xs px-2 py-1 bg-muted rounded-full">
                      {(detailsModal.item as Species).speed || 30} ft speed
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(detailsModal.item as Species).description}
                  </p>
                  {(detailsModal.item as Species).traits?.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase mb-2">Traits</p>
                      <div className="space-y-2">
                        {(detailsModal.item as Species).traits.map((trait, i) => (
                          <div key={i}>
                            <p className="text-sm font-bold text-foreground">{trait.name}</p>
                            <p className="text-xs text-muted-foreground">{trait.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {detailsModal.type === "background" && (() => {
                const bg = detailsModal.item as Background
                const abilityText = formatBackgroundAbilityBonuses(bg.ability_bonuses)
                const equipmentText = formatBackgroundEquipment(bg)
                const grantedFeat = findBackgroundGrantedFeat(bg.feat_granted, feats)
                const grantedSpellLines = formatBackgroundGrantedSpells(bg, spells)

                return (
                  <div className="space-y-3">
                    {bg.description?.trim() && (
                      <p className="text-sm text-muted-foreground">{bg.description}</p>
                    )}

                    {abilityText && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase mb-1">Ability Scores</p>
                        <p className="text-sm text-foreground">{abilityText}</p>
                      </div>
                    )}

                    {bg.skill_proficiencies && bg.skill_proficiencies.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase mb-1">Skills</p>
                        <p className="text-sm text-foreground">{bg.skill_proficiencies.join(", ")}</p>
                      </div>
                    )}

                    {getBackgroundProficiencySections(bg).map((section) => (
                      <div key={section.label}>
                        <p className="text-xs text-muted-foreground uppercase mb-1">{section.label}</p>
                        <p className="text-sm text-foreground">{section.items.join(", ")}</p>
                      </div>
                    ))}

                    {bg.feat_granted && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase mb-1">Origin Feat</p>
                        <p className="text-sm font-semibold text-foreground">{bg.feat_granted}</p>
                        {grantedFeat?.description && (
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {grantedFeat.description}
                          </p>
                        )}
                      </div>
                    )}

                    {(bg.feature?.name || bg.feature?.description) && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase mb-1">Background Feature</p>
                        {bg.feature?.name && (
                          <p className="text-sm font-semibold text-foreground">{bg.feature.name}</p>
                        )}
                        {bg.feature?.description && (
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {bg.feature.description}
                          </p>
                        )}
                      </div>
                    )}

                    {grantedSpellLines.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase mb-1">Granted Spells</p>
                        <ul className="text-sm text-foreground space-y-1">
                          {grantedSpellLines.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {equipmentText && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase mb-1">Starting Equipment</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{equipmentText}</p>
                      </div>
                    )}

                    {bg.starting_gold != null && bg.starting_gold > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase mb-1">Starting Gold</p>
                        <p className="text-sm text-foreground">{bg.starting_gold} gp</p>
                      </div>
                    )}
                  </div>
                )
              })()}
              
              {detailsModal.type === "spell" && (
                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                      {(detailsModal.item as Spell).level === 0 ? "Cantrip" : `Level ${(detailsModal.item as Spell).level}`}
                    </span>
                    <span className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-full">
                      {(detailsModal.item as Spell).school}
                    </span>
                    {(detailsModal.item as Spell).concentration && (
                      <span className="text-xs px-2 py-1 bg-warning/10 text-warning rounded-full">
                        Concentration
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Casting Time:</span> <span className="text-foreground">{(detailsModal.item as Spell).casting_time}</span></div>
                    <div><span className="text-muted-foreground">Range:</span> <span className="text-foreground">{(detailsModal.item as Spell).range}</span></div>
                    <div><span className="text-muted-foreground">Duration:</span> <span className="text-foreground">{(detailsModal.item as Spell).duration}</span></div>
                    <div><span className="text-muted-foreground">Components:</span> <span className="text-foreground">{(detailsModal.item as Spell).components?.join(", ")}</span></div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(detailsModal.item as Spell).description}
                  </p>
                </div>
              )}
              
              {detailsModal.type === "equipment" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <span className="text-xs px-2 py-1 bg-muted rounded-full">
                      {(detailsModal.item as Equipment).category}
                    </span>
                    {(detailsModal.item as Equipment).cost && (
                      <span className="text-xs px-2 py-1 bg-warning/10 text-warning rounded-full">
                        {((detailsModal.item as Equipment).cost as { amount: number; unit: string })?.amount}{" "}
                        {((detailsModal.item as Equipment).cost as { amount: number; unit: string })?.unit}
                      </span>
                    )}
                  </div>
                  {(detailsModal.item as Equipment).description && (
                    <p className="text-sm text-muted-foreground">
                      {(detailsModal.item as Equipment).description}
                    </p>
                  )}
                  {(detailsModal.item as Equipment).properties && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase mb-1">Properties</p>
                      <p className="text-sm text-foreground">
                        {JSON.stringify((detailsModal.item as Equipment).properties)}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <button
                onClick={() => setDetailsModal({ type: null, item: null })}
                className="mt-4 w-full py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
