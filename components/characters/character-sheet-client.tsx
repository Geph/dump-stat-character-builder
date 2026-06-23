"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/db/client"
import {
  ArrowLeft,
  User,
  Heart,
  Swords,
  Sparkles,
  Wand2,
  UserCircle,
  ChevronDown,
  X,
  Pencil,
  FileText,
  Plus,
} from "lucide-react"
import Link from "next/link"
import { compendiumEditHref } from "@/lib/compendium/edit-href"
import type {
  Character,
  DndClass,
  Species,
  Background,
  Spell,
  Equipment,
  CustomAbility,
  Feat,
  Subclass,
} from "@/lib/types"
import { resolveUsesConfig, ABILITY_SCORE_KEYS } from "@/lib/compendium/characteristic-modifiers"
import { getSkillsInAbilityOrder, ABILITY_ABBREVIATIONS } from "@/lib/compendium/skills"
import { D20RollButton } from "@/components/character-sheet/d20-roll-button"
import { SpellSlotTracker, consumeSpellSlot } from "@/components/character-sheet/spell-slot-tracker"
import { SpellDetailOverlay } from "@/components/character-sheet/spell-detail-overlay"
import { EquipmentDetailOverlay } from "@/components/character-sheet/equipment-detail-overlay"
import {
  getMulticlassSpellSlotTables,
  isConcentrationCondition,
  getActiveConcentration,
  formatSpellListGroupLabel,
  resolveSpellcastingAbilityKey,
  spellSlotTableKey,
} from "@/lib/compendium/spell-slots"
import { aggregateAsiBonuses } from "@/lib/builder/asi-allocation"
import {
  buildInputsFromSavedCharacter,
  computeDerivedCharacter,
  deriveArmorClassForLoadout,
} from "@/lib/character/compute-derived"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { ExpandableDescription } from "@/components/character-sheet/expandable-description"
import { ResourceUsesTracker, type ResourceTrackerEntry } from "@/components/character-sheet/resource-uses-tracker"
import { DeathSaveTracker } from "@/components/character-sheet/death-save-tracker"
import { SheetActionsPanel } from "@/components/character-sheet/sheet-actions-panel"
import { SheetEquipmentPanel } from "@/components/character-sheet/sheet-equipment-panel"
import { SheetAddEquipmentOverlay } from "@/components/character-sheet/sheet-add-equipment-overlay"
import { SheetRollHistoryProvider } from "@/components/character-sheet/sheet-roll-history-context"
import { RollHistoryTrigger } from "@/components/character-sheet/roll-history-trigger"
import { SRD_CLASS_RESOURCES_BY_NAME } from "@/lib/compendium/class-resources-defaults"
import { DEFAULT_ATTUNEMENT_SLOTS } from "@/lib/compendium/equipment-attunement"
import { collectSheetActions } from "@/lib/character/sheet-actions"
import { loadModifierCatalog } from "@/lib/compendium/ensure-modifier-catalog"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { suggestEquipmentLoadout } from "@/lib/builder/equipment-loadout"
import { getEquipmentCostGp } from "@/lib/builder/equipment-utils"
import {
  getEffectiveArmorProficiencies,
  getEffectiveWeaponProficiencies,
} from "@/lib/compendium/background-proficiencies"
import { SRD_CONDITIONS, getConditionDescription } from "@/lib/srd/condition-descriptions"
import { ConditionInfoTip } from "@/components/character-sheet/condition-info-tip"
import { SheetDefaultActionsPanel } from "@/components/character-sheet/sheet-default-actions-panel"
import { SheetRestButtons } from "@/components/character-sheet/sheet-rest-buttons"
import { applySheetRest, applyInitiativeResourceRecharge } from "@/lib/character/sheet-rest"
import type { RestType } from "@/lib/types"

interface CharacterWithRelations extends Character {
  classes?: DndClass
  class_list?: CharacterClassDetail[]
  species?: Species
  backgrounds?: Background
  subclasses?: Subclass
}

const ABILITY_COLORS: Record<string, string> = {
  strength: "bg-red-500",
  dexterity: "bg-green-500",
  constitution: "bg-orange-500",
  intelligence: "bg-blue-500",
  wisdom: "bg-purple-500",
  charisma: "bg-pink-500",
}

const ABILITY_LABELS: Record<string, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
}

type SheetTab = "abilities" | "details" | "combat" | "features" | "custom"

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
    <div className="border border-border rounded-lg p-3 bg-muted/30">
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

export default function CharacterSheetClient({ id }: { id: string }) {
  const [character, setCharacter] = useState<CharacterWithRelations | null>(null)
  const [spells, setSpells] = useState<Spell[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [customAbilities, setCustomAbilities] = useState<CustomAbility[]>([])
  const [characterFeats, setCharacterFeats] = useState<Feat[]>([])
  const [originFeat, setOriginFeat] = useState<Feat | null>(null)
  const [modifierCatalog, setModifierCatalog] = useState<ModifierCatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<SheetTab>("abilities")
  const [currentHp, setCurrentHp] = useState(0)
  const [tempHp, setTempHp] = useState(0)
  const [activeConditions, setActiveConditions] = useState<string[]>([])
  const [conditionDropdownOpen, setConditionDropdownOpen] = useState(false)
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
  const [usedSpellSlotsByKey, setUsedSpellSlotsByKey] = useState<Record<string, number[]>>({})
  const [usedResourcesById, setUsedResourcesById] = useState<Record<string, number>>({})
  const [hasInspiration, setHasInspiration] = useState(false)
  const [deathSaves, setDeathSaves] = useState({ successes: 0, failures: 0 })
  const [attunedItemIds, setAttunedItemIds] = useState<string[]>([])
  const [usedActionUsesById, setUsedActionUsesById] = useState<Record<string, number>>({})
  const conditionButtonRef = useRef<HTMLButtonElement>(null)
  const [conditionMenuPos, setConditionMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  )

  useEffect(() => {
    const fetchCharacter = async () => {
      const db = createClient()

      const { data, error } = await db
        .from("characters")
        .select(`*, classes (*), species (*), backgrounds (*), subclasses (*)`)
        .eq("id", id)
        .single()

      if (!error && data) {
        setCharacter(data)
        setCharacterGold(typeof data.gold === "number" ? data.gold : 0)
        setEquippedArmorId((data as Character).equipped_armor_id ?? null)
        setEquippedShieldId((data as Character).equipped_shield_id ?? null)
        setEquippedWeaponId((data as Character).equipped_weapon_id ?? null)
        setCurrentHp(data.hit_points || data.hit_point_max || 0)

        if (data.spell_ids?.length) {
          const { data: spellData } = await db.from("spells").select("*").in("id", data.spell_ids)
          if (spellData) setSpells(spellData)
        }

        if (data.equipment_ids?.length) {
          const { data: equipmentData } = await db.from("equipment").select("*").in("id", data.equipment_ids)
          if (equipmentData) setEquipment(equipmentData)
        }

        const { data: abilitiesData } = await db
          .from("custom_abilities")
          .select("*")
          .eq("show_in_builder", true)
        if (abilitiesData) setCustomAbilities(abilitiesData)

        const catalog = await loadModifierCatalog(db)
        setModifierCatalog(catalog)

        const featIds = (data.feat_ids ?? []).filter(Boolean)
        if (featIds.length) {
          const uniqueFeatIds = [...new Set(featIds)]
          const { data: featData } = await db.from("feats").select("*").in("id", uniqueFeatIds)
          if (featData) {
            const rows = featData as Feat[]
            const byId = new Map(rows.map((feat) => [feat.id, feat]))
            setCharacterFeats(
              featIds.map((id) => byId.get(id)).filter((feat): feat is Feat => Boolean(feat)),
            )
          }
        }

        const bg = data.backgrounds as Background | undefined
        if (bg?.feat_granted) {
          const { data: originData } = await db
            .from("feats")
            .select("*")
            .eq("name", bg.feat_granted)
            .single()
          if (originData) setOriginFeat(originData)
        }
      }
      setLoading(false)
    }

    fetchCharacter()
  }, [id])

  const characterBuildInputs = useMemo(() => {
    if (!character) return null
    const classList = character.class_list ?? []
    const classesFromList = classList.map((entry) => entry.class).filter(Boolean) as DndClass[]
    const subclassesFromList = classList
      .map((entry) => entry.subclass)
      .filter(Boolean) as Subclass[]
    return buildInputsFromSavedCharacter({
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
      modifierCatalog,
    })
  }, [character, characterFeats, equipment, modifierCatalog])

  const derived = useMemo(() => {
    if (!characterBuildInputs) return null
    return computeDerivedCharacter(characterBuildInputs)
  }, [characterBuildInputs])

  const persistEquipmentLoadout = useCallback(
    async (next: {
      armorId?: string | null
      shieldId?: string | null
      weaponId?: string | null
    }) => {
      if (!character) return
      const loadout = {
        armorId: next.armorId !== undefined ? next.armorId : equippedArmorId,
        shieldId: next.shieldId !== undefined ? next.shieldId : equippedShieldId,
        weaponId: next.weaponId !== undefined ? next.weaponId : equippedWeaponId,
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
          armor_class: nextAc,
        })
        .eq("id", character.id)
        .select(`*, classes (*), species (*), backgrounds (*), subclasses (*)`)
        .single()
      if (!error && data) {
        setCharacter(data)
        setEquippedArmorId(loadout.armorId)
        setEquippedShieldId(loadout.shieldId)
        setEquippedWeaponId(loadout.weaponId)
      }
    },
    [character, characterBuildInputs, equippedArmorId, equippedShieldId, equippedWeaponId],
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
      if (!error && data) setCharacter(data)
    },
    [character],
  )

  const openAddEquipmentOverlay = useCallback(async () => {
    const db = createClient()
    const { data } = await db.from("equipment").select("*").order("name")
    if (data) setEquipmentCatalog(data as Equipment[])
    setAddEquipmentOpen(true)
  }, [])

  const handleAddEquipmentFromCatalog = useCallback(
    async (item: Equipment, options: { deductCost: boolean }) => {
      if (!character) return
      const costGp = options.deductCost ? getEquipmentCostGp(item) : 0
      if (options.deductCost && characterGold < costGp) return

      const nextIds = [...new Set([...(character.equipment_ids ?? []), item.id])]
      const nextGold = options.deductCost ? characterGold - costGp : characterGold

      const db = createClient()
      const { data, error } = await db
        .from("characters")
        .update({ equipment_ids: nextIds, gold: nextGold })
        .eq("id", character.id)
        .select(`*, classes (*), species (*), backgrounds (*), subclasses (*)`)
        .single()

      if (error || !data) return

      setCharacter(data)
      setCharacterGold(nextGold)
      setEquipment((prev) => (prev.some((e) => e.id === item.id) ? prev : [...prev, item]))
    },
    [character, characterGold],
  )

  useEffect(() => {
    if (!character || !equipment.length) return
    if (equippedArmorId || equippedShieldId || equippedWeaponId) return
    const suggestion = suggestEquipmentLoadout(character.equipment_ids ?? [], equipment)
    if (suggestion.armorId || suggestion.shieldId || suggestion.weaponId) {
      void persistEquipmentLoadout(suggestion)
    }
  }, [character, equipment, equippedArmorId, equippedShieldId, equippedWeaponId, persistEquipmentLoadout])

  const asiBonuses = useMemo(
    () => aggregateAsiBonuses((character?.asi_allocations as Record<string, Partial<Record<string, number>>>) ?? {}),
    [character?.asi_allocations],
  )

  const classDetails = useMemo(
    () => (character ? buildClassDetailList(character) : []),
    [character],
  )

  const spellSlotTables = useMemo(() => {
    if (!classDetails.length) return []
    return getMulticlassSpellSlotTables(
      classDetails
        .filter((entry) => entry.class?.spellcasting)
        .map((entry) => ({
          className: entry.class!.name,
          classLevel: entry.row.level,
          spellcasting: entry.class!.spellcasting,
        })),
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
      if (!className) continue
      const resources = SRD_CLASS_RESOURCES_BY_NAME[className] ?? []
      for (const resource of resources) {
        if (resource.uses.type === "unlimited" || resource.uses.type === "class_resource") continue
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
    return entries
  }, [classDetails])

  const sheetActions = useMemo(
    () =>
      collectSheetActions({
        classDetails,
        species: character?.species ?? null,
      }),
    [classDetails, character?.species],
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
      applyInitiativeResourceRecharge(prev, resourceEntries, usesResolveContext),
    )
  }, [resourceEntries, usesResolveContext])

  const handleRest = useCallback(
    (rest: RestType) => {
      const result = applySheetRest({
        rest,
        maxHp: derived?.maxHp ?? character?.hit_point_max ?? 0,
        activeConditions,
        usedSpellSlotsByKey,
        spellSlotTables,
        usedResourcesById,
        resourceEntries,
        usedActionUsesById,
        sheetActions,
        resolveContext: usesResolveContext,
      })
      setUsedSpellSlotsByKey(result.usedSpellSlotsByKey)
      setUsedResourcesById(result.usedResourcesById)
      setUsedActionUsesById(result.usedActionUsesById)
      if (result.currentHp != null) setCurrentHp(result.currentHp)
      if (result.tempHp != null) setTempHp(result.tempHp)
      if (result.deathSaves) setDeathSaves(result.deathSaves)
      if (result.activeConditions) setActiveConditions(result.activeConditions)
    },
    [
      derived?.maxHp,
      character?.hit_point_max,
      activeConditions,
      usedSpellSlotsByKey,
      spellSlotTables,
      usedResourcesById,
      resourceEntries,
      usedActionUsesById,
      sheetActions,
      usesResolveContext,
    ],
  )

  const openConditionMenu = () => {
    if (conditionButtonRef.current) {
      const rect = conditionButtonRef.current.getBoundingClientRect()
      setConditionMenuPos({ top: rect.bottom + 4, left: rect.left })
    }
    setConditionDropdownOpen((open) => !open)
  }

  useEffect(() => {
    if (!conditionDropdownOpen) return
    const close = () => setConditionDropdownOpen(false)
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => {
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
    }
  }, [conditionDropdownOpen])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-5xl xl:max-w-7xl mx-auto px-4 py-6">
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
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-5xl mx-auto px-4 py-6 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Character not found</h1>
          <Link href="/characters" className="text-primary hover:underline">
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
  const armorClass = derived?.armorClass ?? character.armor_class ?? 10
  const speed = derived?.speed ?? character.speed ?? 30
  const initiative = derived?.initiative ?? character.initiative ?? abilityMods.dexterity
  const maxHp = derived?.maxHp ?? character.hit_point_max ?? 0
  const savingThrowProficiencies = derived?.savingThrowProficiencies ?? character.classes?.saving_throws ?? []

  const classLabel = classDetails.length
    ? classDetails
        .map((entry) => `${entry.class?.name ?? "Class"} ${entry.row.level}`)
        .join(" / ")
    : [character.classes?.name, character.subclasses?.name].filter(Boolean).join(" · ")

  const skillsInOrder = getSkillsInAbilityOrder()
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
  const hasSpellcasting = Boolean(spellcastingAbilityLabel && spellcastingAbilityKey)
  const spellAbilityMod = spellcastingAbilityKey ? abilityMods[spellcastingAbilityKey] : 0
  const spellSaveDc = hasSpellcasting ? 8 + proficiencyBonus + spellAbilityMod : null
  const spellAttackMod = hasSpellcasting ? proficiencyBonus + spellAbilityMod : null

  const formatMod = (mod: number) => (mod >= 0 ? `+${mod}` : `${mod}`)

  const isPerceptionProficient =
    derived?.skillProficiencies.includes("Perception") ??
    character.skill_proficiencies?.includes("Perception") ??
    false
  const hasPerceptionExpertise =
    derived?.skillExpertise.includes("Perception") ??
    character.skill_expertise?.includes("Perception") ??
    false
  const passivePerception =
    derived?.passivePerception ??
    10 +
      abilityMods.wisdom +
      (isPerceptionProficient ? proficiencyBonus * (hasPerceptionExpertise ? 2 : 1) : 0)

  const spellsGroupedByLevel = (() => {
    const groups = new Map<number, Spell[]>()
    for (const spell of spells) {
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

  return (
    <SheetRollHistoryProvider characterId={id}>
    <div className="min-h-screen bg-background">
      <MainNav />

      <main className="max-w-5xl xl:max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <Link
            href="/characters"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
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
          className="relative rounded-2xl mb-3 min-h-[140px]"
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
            className={`relative p-4 ${
              character.banner_url
                ? "bg-gradient-to-r from-background/90 via-background/75 to-background/60"
                : "bg-gradient-to-br from-primary/20 to-secondary/20"
            }`}
          >
            <div className="flex items-start gap-4">
              {character.portrait_url ? (
                <button
                  type="button"
                  onClick={() => setPortraitZoomOpen(true)}
                  className="shrink-0 rounded-xl overflow-hidden border-2 border-background shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <img
                    src={character.portrait_url}
                    alt={character.name}
                    className="w-24 h-24 object-cover"
                  />
                </button>
              ) : (
                <div className="w-24 h-24 bg-card rounded-xl flex items-center justify-center border-2 border-background shrink-0">
                  <User className="w-12 h-12 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-black text-foreground leading-tight">{character.name}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Level {character.level} {classLabel || "Adventurer"}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {character.species && (
                    <span className="px-2 py-0.5 bg-card/80 rounded-full text-xs font-medium">
                      {character.species.name}
                    </span>
                  )}
                  {character.backgrounds && (
                    <span className="px-2 py-0.5 bg-card/80 rounded-full text-xs font-medium">
                      {character.backgrounds.name}
                    </span>
                  )}
                </div>

                <div className="relative mt-2 z-10">
                  <button
                    ref={conditionButtonRef}
                    type="button"
                    onClick={openConditionMenu}
                    className="flex items-center gap-1.5 px-2 py-1 bg-card/80 border border-border rounded-md text-xs hover:border-primary transition-colors"
                  >
                    Conditions
                    <ChevronDown className={`w-3 h-3 transition-transform ${conditionDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {conditionDropdownOpen && conditionMenuPos && (
                    <>
                      <div
                        className="fixed inset-0 z-[99]"
                        aria-hidden
                        onClick={() => setConditionDropdownOpen(false)}
                      />
                      <div
                        className="fixed w-56 bg-card border border-border rounded-lg shadow-xl z-[100] max-h-48 overflow-y-auto"
                        style={{ top: conditionMenuPos.top, left: conditionMenuPos.left }}
                      >
                      {SRD_CONDITIONS.map((condition) => (
                        <label
                          key={condition.name}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={activeConditions.includes(condition.name)}
                            onChange={() => toggleCondition(condition.name)}
                            className="w-3.5 h-3.5 rounded accent-destructive shrink-0"
                          />
                          <span className="flex-1 min-w-0">{condition.name}</span>
                          <ConditionInfoTip description={condition.description} />
                        </label>
                      ))}
                      </div>
                    </>
                  )}
                  {activeConditions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {activeConditions.map((condName) => {
                        const condDescription =
                          getConditionDescription(condName) ??
                          (isConcentrationCondition(condName)
                            ? "You are concentrating on a spell. Concentration ends if you take damage and fail a Constitution save, cast another concentration spell, or become incapacitated."
                            : undefined)
                        return (
                          <span
                            key={condName}
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                              isConcentrationCondition(condName)
                                ? "bg-purple-500/20 text-purple-800 dark:text-purple-300"
                                : "bg-destructive/20 text-destructive"
                            }`}
                          >
                            {condName}
                            {condDescription ? (
                              <ConditionInfoTip description={condDescription} />
                            ) : null}
                            <button type="button" onClick={() => toggleCondition(condName)}>
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 shrink-0">
                <RollHistoryTrigger />
                <button
                  type="button"
                  onClick={() => setHasInspiration((value) => !value)}
                  title={hasInspiration ? "Spend Heroic Inspiration" : "Mark Heroic Inspiration"}
                  aria-pressed={hasInspiration}
                  className={`mt-1 flex h-10 w-10 items-center justify-center rounded-lg border-2 transition-colors ${
                    hasInspiration
                      ? "border-amber-500/60 bg-amber-500/20 text-amber-700 dark:text-amber-300"
                      : "border-border/70 bg-card/80 text-muted-foreground hover:border-amber-500/40 hover:text-amber-600"
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                </button>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <div className="bg-card/90 rounded-lg p-2 text-center min-w-[88px]">
                    <Heart className="w-4 h-4 text-destructive mx-auto mb-0.5" />
                    <p className="text-[10px] text-muted-foreground">HP</p>
                    <div className="flex items-center justify-center gap-0.5">
                      <input
                        type="number"
                        min={0}
                        max={maxHp + tempHp}
                        value={currentHp}
                        onChange={(e) => {
                          const next = parseInt(e.target.value, 10)
                          setCurrentHp(
                            Number.isNaN(next) ? 0 : Math.max(0, Math.min(maxHp + tempHp, next)),
                          )
                        }}
                        className="w-10 text-center bg-background border border-border rounded px-0.5 py-0.5 text-base font-black [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="text-xs text-muted-foreground">/ {maxHp}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <span className="text-[10px] text-cyan">Temp</span>
                      <input
                        type="number"
                        min={0}
                        value={tempHp}
                        onChange={(e) => {
                          const next = parseInt(e.target.value, 10)
                          setTempHp(Number.isNaN(next) ? 0 : Math.max(0, next))
                        }}
                        className="w-8 text-center bg-background border border-cyan/30 rounded text-xs font-bold text-cyan [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                  <SheetRestButtons onRest={handleRest} compact />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <SheetDefaultActionsPanel />

        <div className="flex gap-1.5 mb-3 overflow-x-auto">
          {[
            { id: "abilities" as const, label: "Abilities & Skills", icon: <UserCircle className="w-3.5 h-3.5" /> },
            { id: "combat" as const, label: "Combat", icon: <Swords className="w-3.5 h-3.5" /> },
            { id: "features" as const, label: "Features", icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: "custom" as const, label: "Custom", icon: <Wand2 className="w-3.5 h-3.5" /> },
            { id: "details" as const, label: "Character Details", icon: <FileText className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "abilities" && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-foreground">Abilities and Skills</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-3">
                <div className="bg-card rounded-xl p-3 border border-border min-w-0 md:col-span-2 xl:col-span-1">
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
                            isProficient ? "bg-primary/10 font-medium" : "bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          <span className="truncate min-w-0">
                            {skill.name} ({ABILITY_ABBREVIATIONS[skill.ability]})
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            {hasExpertise && (
                              <span className="text-[9px] font-semibold uppercase px-1 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300">
                                Expertise
                              </span>
                            )}
                            <span className="font-bold tabular-nums w-7 text-right">{formatMod(mod)}</span>
                            <D20RollButton modifier={mod} title={`Roll ${skill.name}`} />
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-card rounded-xl p-3 border border-border min-w-0 md:col-span-1 xl:col-span-1">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Ability Scores</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {ABILITY_SCORE_KEYS.map((key) => {
                      const score = effectiveScores[key]
                      const bonus = asiBonuses[key]
                      const mod = abilityMods[key]
                      return (
                        <div key={key} className="text-center">
                          <div
                            className={`w-10 h-10 ${ABILITY_COLORS[key]} rounded-lg flex items-center justify-center mx-auto`}
                          >
                            <span className="text-sm font-black text-white">{score}</span>
                          </div>
                          <p className="text-[10px] font-medium text-foreground mt-0.5">{ABILITY_LABELS[key]}</p>
                          <p className="text-xs font-bold text-primary">{getAbilityModifier(score)}</p>
                          {bonus ? (
                            <p className="text-[9px] text-lime">+{bonus} ASI</p>
                          ) : null}
                          <div className="mt-1 flex justify-center">
                            <D20RollButton
                              modifier={mod}
                              title={`${ABILITY_LABELS[key]} ability check`}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                    <div className="flex justify-between items-center px-2 py-1.5 rounded text-xs bg-secondary/10 font-medium">
                      <span>Proficiency Bonus</span>
                      <span className="font-bold tabular-nums">{formatMod(proficiencyBonus)}</span>
                    </div>
                    <div className="flex justify-between items-center px-2 py-1.5 rounded text-xs bg-secondary/10 font-medium">
                      <span>Passive Perception</span>
                      <span className="font-bold tabular-nums">{passivePerception}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-xl p-3 border border-border min-w-0 md:col-span-3 xl:col-span-1">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Proficiencies</h3>
                  {!weaponProficiencies.length &&
                  !armorProficiencies.length &&
                  !(character.tool_proficiencies ?? []).length &&
                  !(character.languages ?? []).length ? (
                    <span className="text-xs text-muted-foreground">None listed</span>
                  ) : (
                    <div className="space-y-3">
                      {weaponProficiencies.length > 0 && (
                        <div className="rounded-lg border border-border/70 bg-muted/25 p-2.5">
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
                        <div className="rounded-lg border border-border/70 bg-muted/25 p-2.5">
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
                      {(character.tool_proficiencies ?? []).length > 0 && (
                        <div className="rounded-lg border border-border/70 bg-muted/25 p-2.5">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Tools</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(character.tool_proficiencies ?? []).map((item) => (
                              <span
                                key={`tool-${item}`}
                                className="px-2 py-0.5 bg-secondary/20 text-secondary-foreground rounded-full text-xs"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {(character.languages ?? []).length > 0 && (
                        <div className="rounded-lg border border-border/70 bg-muted/25 p-2.5">
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
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {activeTab === "details" && (
            <div className="bg-card rounded-xl p-4 border border-border">
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                <div className="bg-card rounded-xl p-3 border border-border">
                  <h2 className="text-sm font-bold text-foreground mb-2 text-left">Combat Stats</h2>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center px-2 py-1.5 rounded text-xs bg-secondary/10 font-medium">
                      <span>Armor Class</span>
                      <span className="font-bold tabular-nums">{armorClass}</span>
                    </div>
                    <div className="flex justify-between items-center px-2 py-1.5 rounded text-xs bg-secondary/10 font-medium">
                      <span>Speed</span>
                      <span className="font-bold tabular-nums">{speed} ft</span>
                    </div>
                    <div className="flex justify-between items-center gap-2 px-2 py-1.5 rounded text-xs bg-secondary/10 font-medium">
                      <span>Initiative</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold tabular-nums">{formatMod(initiative)}</span>
                        <D20RollButton
                          modifier={initiative}
                          title="Roll initiative"
                          onRoll={handleInitiativeRoll}
                        />
                      </div>
                    </div>
                    {hasSpellcasting && spellSaveDc != null && Number.isFinite(spellSaveDc) && (
                      <>
                        <div className="flex justify-between items-center px-2 py-1.5 rounded text-xs bg-secondary/10 font-medium">
                          <span>Spell Save DC</span>
                          <span className="font-bold tabular-nums">{spellSaveDc}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2 px-2 py-1.5 rounded text-xs bg-secondary/10 font-medium">
                          <span>Spell Attack</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold tabular-nums">{formatMod(spellAttackMod!)}</span>
                            <D20RollButton modifier={spellAttackMod!} title="Roll spell attack" />
                          </div>
                        </div>
                      </>
                    )}
                    <div className="pt-2 mt-1 border-t border-border/60">
                      <DeathSaveTracker
                        deathSaves={deathSaves}
                        onDeathSavesChange={setDeathSaves}
                        compact
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-xl p-3 border border-border">
                  <h2 className="text-sm font-bold text-foreground mb-2">Saving Throws</h2>
                  <div className="space-y-1">
                    {(["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"] as const).map(
                      (ability) => {
                        const isProficient = savingThrowProficiencies.includes(ability)
                        const mod =
                          abilityMods[ability.toLowerCase() as keyof typeof abilityMods] +
                          (isProficient ? proficiencyBonus : 0)
                        return (
                          <div
                            key={ability}
                            className={`flex justify-between items-center gap-2 px-2 py-1.5 rounded text-xs ${
                              isProficient ? "bg-primary/10 font-medium" : "bg-muted/50 text-muted-foreground"
                            }`}
                          >
                            <span>{ability}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold tabular-nums">{formatMod(mod)}</span>
                              <D20RollButton modifier={mod} title={`Roll ${ability} save`} />
                            </div>
                          </div>
                        )
                      },
                    )}
                  </div>
                </div>

                <div className="bg-card rounded-xl p-3 border border-border space-y-3">
                  <h2 className="text-sm font-bold text-foreground mb-1">Resources</h2>
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
                  {resourceEntries.length > 0 && (
                    <ResourceUsesTracker
                      entries={resourceEntries}
                      usedById={usedResourcesById}
                      onUsedChange={setUsedResourcesById}
                      resolveContext={usesResolveContext}
                    />
                  )}
                  {!spellSlotTables.length && !resourceEntries.length && (
                    <p className="text-xs text-muted-foreground italic">No class resources to track</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-card rounded-xl p-3 border border-border">
                  <h2 className="text-sm font-bold text-foreground mb-2">Actions</h2>
                  <SheetActionsPanel
                    actions={sheetActions}
                    usedByActionId={usedActionUsesById}
                    onUsedChange={setUsedActionUsesById}
                    resolveContext={usesResolveContext}
                  />
                </div>

                <div className="bg-card rounded-xl p-3 border border-border">
                  <h2 className="text-sm font-bold text-foreground mb-2">Equipment</h2>
                  <SheetEquipmentPanel
                    equipment={equipment}
                    gold={characterGold}
                    onGoldChange={(gold) => void persistGold(gold)}
                    onAddEquipment={() => void openAddEquipmentOverlay()}
                    searchQuery={equipmentSearchQuery}
                    onSearchQueryChange={setEquipmentSearchQuery}
                    equippedArmorId={equippedArmorId}
                    equippedShieldId={equippedShieldId}
                    equippedWeaponId={equippedWeaponId}
                    attunedItemIds={attunedItemIds}
                    maxAttunementSlots={derived?.attunementSlots ?? DEFAULT_ATTUNEMENT_SLOTS}
                    equippedWeaponAttack={derived?.equippedWeaponAttack ?? null}
                    onEquipArmor={(id) => {
                      void persistEquipmentLoadout({ armorId: id })
                    }}
                    onEquipShield={(id) => {
                      void persistEquipmentLoadout({ shieldId: id })
                    }}
                    onEquipWeapon={(id) => {
                      void persistEquipmentLoadout({ weaponId: id })
                    }}
                    onToggleAttune={(itemId) => {
                      setAttunedItemIds((prev) => {
                        if (prev.includes(itemId)) return prev.filter((id) => id !== itemId)
                        const cap = derived?.attunementSlots ?? DEFAULT_ATTUNEMENT_SLOTS
                        if (prev.length >= cap) return prev
                        return [...prev, itemId]
                      })
                    }}
                    onShowDetails={setSelectedEquipment}
                  />
                </div>
              </div>

              {hasSpellcasting && (
                <div className="bg-card rounded-xl p-3 border border-border min-w-0">
                  <h2 className="text-sm font-bold text-foreground mb-2">Spells</h2>
                  {spellsGroupedByLevel.length ? (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {spellsGroupedByLevel.map((group) => (
                        <div key={group.level}>
                          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5 sticky top-0 bg-card py-0.5">
                            {group.label}
                          </h3>
                          <div className="space-y-1">
                            {group.spells.map((spell) => (
                              <button
                                key={spell.id}
                                type="button"
                                onClick={() => setSelectedSpell(spell)}
                                className="flex w-full justify-between items-center text-xs px-2 py-1.5 bg-muted rounded hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-colors text-left"
                              >
                                <span className="font-medium truncate">{spell.name}</span>
                                {spell.concentration && (
                                  <span className="text-[9px] text-purple-600 dark:text-purple-400 shrink-0 ml-2">
                                    C
                                  </span>
                                )}
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
          )}

          {activeTab === "features" && (
            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {classDetails.map((entry) => {
                const classFeatures = (entry.class?.features as
                  | { level: number; name: string; description: string }[]
                  | undefined)?.filter((feature) => feature.level <= entry.row.level) ?? []
                if (!classFeatures.length) return null
                return (
                  <section key={entry.row.class_id} className="bg-card rounded-xl p-3 border border-border">
                    <h2 className="text-sm font-bold mb-2">
                      {entry.class?.name} Features
                      {classDetails.length > 1 ? ` (Level ${entry.row.level})` : ""}
                    </h2>
                    <div className="space-y-2">
                      {classFeatures.map((feature, index) => (
                        <div key={`${entry.row.class_id}-${index}`} className="p-2 bg-muted rounded-lg text-xs">
                          <p className="font-bold">
                            {feature.name}{" "}
                            <span className="text-muted-foreground font-normal">(Lv {feature.level})</span>
                          </p>
                          <ExpandableDescription text={feature.description} className="text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </section>
                )
              })}

              {classDetails.map((entry) => {
                const subclassFeatures =
                  entry.subclass?.features?.filter((feature) => feature.level <= entry.row.level) ?? []
                if (!subclassFeatures.length || !entry.subclass) return null
                return (
                  <section
                    key={`${entry.row.class_id}-subclass`}
                    className="bg-card rounded-xl p-3 border border-border"
                  >
                    <h2 className="text-sm font-bold mb-2">{entry.subclass.name} Features</h2>
                    <div className="space-y-2">
                      {subclassFeatures.map((feature, index) => (
                        <div key={index} className="p-2 bg-muted rounded-lg text-xs">
                          <p className="font-bold">
                            {feature.name}{" "}
                            <span className="text-muted-foreground font-normal">(Lv {feature.level})</span>
                          </p>
                          <ExpandableDescription text={feature.description} className="text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </section>
                )
              })}

              {character.species?.traits && character.species.traits.length > 0 && (
                <section className="bg-card rounded-xl p-3 border border-border">
                  <h2 className="text-sm font-bold mb-2">{character.species.name} Traits</h2>
                  <div className="space-y-2">
                    {character.species.traits.map((trait, index) => (
                      <div key={index} className="p-2 bg-muted rounded-lg text-xs">
                        <p className="font-bold">{trait.name}</p>
                        <ExpandableDescription text={trait.description} className="text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {character.backgrounds?.feature && (
                <section className="bg-card rounded-xl p-3 border border-border">
                  <h2 className="text-sm font-bold mb-2">Background Feature</h2>
                  <div className="p-2 bg-muted rounded-lg text-xs">
                    <p className="font-bold">{character.backgrounds.feature.name}</p>
                    <ExpandableDescription
                      text={character.backgrounds.feature.description}
                      className="text-muted-foreground"
                    />
                  </div>
                </section>
              )}

              {(originFeat || character.backgrounds?.feat_granted) && (
                <section className="bg-card rounded-xl p-3 border border-border">
                  <h2 className="text-sm font-bold mb-2">Origin Feats</h2>
                  <div className="p-2 bg-muted rounded-lg text-xs">
                    <p className="font-bold">{originFeat?.name ?? character.backgrounds?.feat_granted}</p>
                    <ExpandableDescription
                      text={originFeat?.description ?? "Granted by your background at 1st level."}
                      className="text-muted-foreground"
                    />
                  </div>
                </section>
              )}

              {characterFeats.length > 0 && (
                <section className="bg-card rounded-xl p-3 border border-border">
                  <h2 className="text-sm font-bold mb-2">General Feats & Epic Boons</h2>
                  <div className="space-y-2">
                    {characterFeats.map((feat, index) => (
                      <div key={`${feat.id}-${index}`} className="p-2 bg-muted rounded-lg text-xs">
                        <p className="font-bold">{feat.name}</p>
                        <ExpandableDescription text={feat.description} className="text-muted-foreground" collapsedLines={4} />
                      </div>
                    ))}
                  </div>
                </section>
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
              {customAbilities.length ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {customAbilities.map((ability) => {
                    const uses = resolveUsesConfig(ability.characteristics, ability.uses)
                    return (
                      <div key={ability.id} className="p-2 bg-muted rounded-lg text-xs">
                        <p className="font-bold">{ability.name}</p>
                        <p className="text-muted-foreground">{ability.description}</p>
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
        {selectedEquipment && (
          <EquipmentDetailOverlay
            item={selectedEquipment}
            onClose={() => setSelectedEquipment(null)}
          />
        )}
        <SheetAddEquipmentOverlay
          open={addEquipmentOpen}
          onClose={() => setAddEquipmentOpen(false)}
          catalog={equipmentCatalog}
          ownedIds={character?.equipment_ids ?? []}
          currentGold={characterGold}
          onAddItem={(item, options) => void handleAddEquipmentFromCatalog(item, options)}
        />
        {selectedSpell && (
          <SpellDetailOverlay
            spell={selectedSpell}
            spellAttackMod={spellAttackMod}
            activeConcentration={getActiveConcentration(activeConditions)}
            onClose={() => setSelectedSpell(null)}
            onCast={(result) => {
              if (result.concentrationApplied) {
                applyConcentration(result.concentrationApplied)
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
        )}
        {portraitZoomOpen && character.portrait_url && (
          <motion.div
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
        )}
      </AnimatePresence>
    </div>
    </SheetRollHistoryProvider>
  )
}
