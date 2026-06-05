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
  Search,
} from "lucide-react"
import Link from "next/link"
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
import { DamageRollButton } from "@/components/character-sheet/damage-roll-button"
import { D20RollButton } from "@/components/character-sheet/d20-roll-button"
import { SpellSlotTracker, consumeSpellSlot } from "@/components/character-sheet/spell-slot-tracker"
import { SpellDetailOverlay } from "@/components/character-sheet/spell-detail-overlay"
import { EquipmentDetailOverlay } from "@/components/character-sheet/equipment-detail-overlay"
import { filterEquipmentList } from "@/lib/compendium/equipment-display"
import {
  getSpellSlotTable,
  isConcentrationCondition,
  getActiveConcentration,
  formatSpellListGroupLabel,
  resolveSpellcastingAbilityKey,
} from "@/lib/compendium/spell-slots"
import { aggregateAsiBonuses } from "@/lib/builder/asi-allocation"
import { normalizeFeatCategory } from "@/lib/builder/feat-selection"
import {
  calculateWeaponAttack,
  getWeaponDamageText,
  getWeaponMastery,
  getWeaponPropertyTags,
  getWeaponRangeText,
  isWeaponItem,
  isWeaponProficient,
} from "@/lib/compendium/combat-stats"
import {
  getEffectiveArmorProficiencies,
  getEffectiveWeaponProficiencies,
} from "@/lib/compendium/background-proficiencies"
import { SRD_CONDITIONS, getConditionDescription } from "@/lib/srd/condition-descriptions"
import { ConditionInfoTip } from "@/components/character-sheet/condition-info-tip"

interface CharacterWithRelations extends Character {
  classes?: DndClass
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
  const [usedSpellSlots, setUsedSpellSlots] = useState<number[]>([])
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

  const asiBonuses = useMemo(
    () => aggregateAsiBonuses((character?.asi_allocations as Record<string, Partial<Record<string, number>>>) ?? {}),
    [character?.asi_allocations],
  )

  const spellSlotTable = useMemo(() => {
    if (!character?.classes?.spellcasting) return null
    return getSpellSlotTable(
      character.classes.name,
      character.level,
      character.classes.spellcasting,
    )
  }, [character?.classes, character?.level])

  useEffect(() => {
    if (spellSlotTable) {
      setUsedSpellSlots(spellSlotTable.slotsByLevel.map(() => 0))
    }
  }, [spellSlotTable])

  const effectiveScores = useMemo(() => {
    if (!character) return null
    return ABILITY_SCORE_KEYS.reduce(
      (scores, key) => {
        scores[key] = character[key] + (asiBonuses[key] ?? 0)
        return scores
      },
      {} as Record<(typeof ABILITY_SCORE_KEYS)[number], number>,
    )
  }, [character, asiBonuses])

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
        <main className="max-w-5xl mx-auto px-4 py-6">
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

  const abilityMods = {
    strength: Math.floor((effectiveScores.strength - 10) / 2),
    dexterity: Math.floor((effectiveScores.dexterity - 10) / 2),
    constitution: Math.floor((effectiveScores.constitution - 10) / 2),
    intelligence: Math.floor((effectiveScores.intelligence - 10) / 2),
    wisdom: Math.floor((effectiveScores.wisdom - 10) / 2),
    charisma: Math.floor((effectiveScores.charisma - 10) / 2),
  }

  const proficiencyBonus = Math.floor((character.level - 1) / 4) + 2
  const armorClass = character.armor_class || 10 + abilityMods.dexterity
  const speed = character.speed || 30
  const initiative = character.initiative ?? abilityMods.dexterity
  const maxHp = character.hit_point_max || 0
  const savingThrowProficiencies = character.classes?.saving_throws || []

  const classLabel = [
    character.classes?.name,
    character.subclasses?.name,
  ]
    .filter(Boolean)
    .join(" · ")

  const skillsInOrder = getSkillsInAbilityOrder()
  const weaponProficiencies = getEffectiveWeaponProficiencies(
    character.classes?.weapon_proficiencies,
    character.weapon_proficiencies,
  )
  const armorProficiencies = getEffectiveArmorProficiencies(
    character.classes?.armor_proficiencies,
    character.armor_proficiencies,
  )
  const weapons = equipment.filter(isWeaponItem)
  const nonWeaponEquipment = equipment.filter((item) => !isWeaponItem(item))
  const filteredEquipment = filterEquipmentList(nonWeaponEquipment, equipmentSearchQuery)
  const spellcastingAbilityLabel =
    character.classes?.spellcasting?.ability ?? character.subclasses?.spellcasting?.ability
  const spellcastingAbilityKey = resolveSpellcastingAbilityKey(spellcastingAbilityLabel)
  const hasSpellcasting = Boolean(spellcastingAbilityLabel && spellcastingAbilityKey)
  const spellAbilityMod = spellcastingAbilityKey ? abilityMods[spellcastingAbilityKey] : 0
  const spellSaveDc = hasSpellcasting ? 8 + proficiencyBonus + spellAbilityMod : null
  const spellAttackMod = hasSpellcasting ? proficiencyBonus + spellAbilityMod : null

  const formatMod = (mod: number) => (mod >= 0 ? `+${mod}` : `${mod}`)

  const isPerceptionProficient = character.skill_proficiencies?.includes("Perception") ?? false
  const hasPerceptionExpertise = character.skill_expertise?.includes("Perception") ?? false
  const passivePerception =
    10 +
    abilityMods.wisdom +
    (isPerceptionProficient
      ? proficiencyBonus * (hasPerceptionExpertise ? 2 : 1)
      : 0)

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
    <div className="min-h-screen bg-background">
      <MainNav />

      <main className="max-w-5xl mx-auto px-4 py-4">
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

              <div className="shrink-0 bg-card/90 rounded-lg p-2 text-center min-w-[88px]">
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
            </div>
          </div>
        </motion.div>

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-card rounded-xl p-3 border border-border min-w-0 md:col-span-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Skills</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:min-h-[300px]">
                    {skillsInOrder.map((skill) => {
                      const isProficient = character.skill_proficiencies?.includes(skill.name) ?? false
                      const hasExpertise = character.skill_expertise?.includes(skill.name) ?? false
                      const mod =
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

                <div className="bg-card rounded-xl p-3 border border-border min-w-0 md:col-span-1">
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
              </div>

              <div className="bg-card rounded-xl p-3 border border-border">
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Proficiencies</h3>
                {!weaponProficiencies.length &&
                !armorProficiencies.length &&
                !(character.tool_proficiencies ?? []).length &&
                !(character.languages ?? []).length ? (
                  <span className="text-xs text-muted-foreground">None listed</span>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {weaponProficiencies.length > 0 && (
                      <div className="flex-1 min-w-[140px] rounded-lg border border-border/70 bg-muted/25 p-2.5">
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
                      <div className="flex-1 min-w-[140px] rounded-lg border border-border/70 bg-muted/25 p-2.5">
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
                      <div className="flex-1 min-w-[140px] rounded-lg border border-border/70 bg-muted/25 p-2.5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">
                          Tools & Vehicles
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(character.tool_proficiencies ?? []).map((tool) => (
                            <span
                              key={tool}
                              className="px-2 py-0.5 bg-secondary/10 text-secondary rounded-full text-xs"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(character.languages ?? []).length > 0 && (
                      <div className="flex-1 min-w-[140px] rounded-lg border border-border/70 bg-muted/25 p-2.5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Languages</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(character.languages ?? []).map((lang) => (
                            <span
                              key={lang}
                              className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        <D20RollButton modifier={initiative} title="Roll initiative" />
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
              </div>

              <div className="bg-card rounded-xl p-3 border border-border">
                <h2 className="text-sm font-bold text-foreground mb-2">Weapons</h2>
                {weapons.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {weapons.map((weapon) => {
                      const proficient = isWeaponProficient(weapon, weaponProficiencies)
                      const attack = calculateWeaponAttack(
                        weapon,
                        abilityMods,
                        proficiencyBonus,
                        proficient,
                      )
                      const damageText = getWeaponDamageText(weapon)
                      const damageRollExpr = attack?.damageDisplay ?? damageText
                      const mastery = getWeaponMastery(weapon)
                      const range = getWeaponRangeText(weapon)
                      const tags = getWeaponPropertyTags(weapon)

                      return (
                        <div
                          key={weapon.id}
                          className="p-2.5 bg-muted/50 rounded-lg border border-border/60 min-w-0"
                        >
                          <p className="font-bold text-xs text-foreground mb-1.5">{weapon.name}</p>
                          {attack && (
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground uppercase">To Hit</span>
                                <D20RollButton
                                  modifier={attack.attackBonus}
                                  title={`${weapon.name} attack roll`}
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground uppercase">Dmg</span>
                                {damageRollExpr ? (
                                  <DamageRollButton expression={damageRollExpr} />
                                ) : null}
                              </div>
                            </div>
                          )}
                          <dl className="space-y-0.5 text-[11px]">
                            {damageText && (
                              <div className="flex justify-between gap-2">
                                <dt className="text-muted-foreground">Damage</dt>
                                <dd className="text-foreground font-medium text-right">
                                  {attack?.damageDisplay ?? damageText}
                                </dd>
                              </div>
                            )}
                            {range && (
                              <div className="flex justify-between gap-2">
                                <dt className="text-muted-foreground">Range</dt>
                                <dd className="text-foreground text-right">{range}</dd>
                              </div>
                            )}
                            {mastery && (
                              <div className="flex justify-between gap-2">
                                <dt className="text-muted-foreground">Mastery</dt>
                                <dd className="text-foreground text-right">{mastery}</dd>
                              </div>
                            )}
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">Proficiency</dt>
                              <dd className="text-foreground text-right">
                                {proficient ? "Proficient" : "Not proficient"}
                              </dd>
                            </div>
                          </dl>
                          {tags.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
                              {tags.join(", ")}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No weapons in inventory</p>
                )}
              </div>

              {hasSpellcasting && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    className={`bg-card rounded-xl p-3 border border-border min-w-0 ${spellSlotTable ? "" : "md:col-span-2"}`}
                  >
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

                  {spellSlotTable ? (
                    <div className="bg-card rounded-xl p-3 border border-border min-w-0">
                      <h2 className="text-sm font-bold text-foreground mb-2">Spell Slots</h2>
                      <SpellSlotTracker
                        table={spellSlotTable}
                        usedByLevel={usedSpellSlots}
                        onUsedChange={setUsedSpellSlots}
                      />
                    </div>
                  ) : null}
                </div>
              )}

              <div className="bg-card rounded-xl p-3 border border-border">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h2 className="text-sm font-bold">Equipment</h2>
                  {nonWeaponEquipment.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {filteredEquipment.length} of {nonWeaponEquipment.length}
                    </span>
                  )}
                </div>
                {nonWeaponEquipment.length > 0 && (
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="search"
                      value={equipmentSearchQuery}
                      onChange={(e) => setEquipmentSearchQuery(e.target.value)}
                      placeholder="Search equipment..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {filteredEquipment.length ? (
                    filteredEquipment.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedEquipment(item)}
                        className="flex justify-between gap-3 text-xs px-2.5 py-1.5 bg-muted rounded-lg min-w-[140px] flex-1 max-w-xs text-left hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-colors"
                      >
                        <span className="font-medium truncate">{item.name}</span>
                        <span className="text-muted-foreground shrink-0">{item.category}</span>
                      </button>
                    ))
                  ) : nonWeaponEquipment.length ? (
                    <p className="text-xs text-muted-foreground">No equipment matches your search</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">No other equipment</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "features" && (
            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {character.classes?.features && (
                <section className="bg-card rounded-xl p-3 border border-border">
                  <h2 className="text-sm font-bold mb-2">{character.classes.name} Features</h2>
                  <div className="space-y-2">
                    {(character.classes.features as { level: number; name: string; description: string }[])
                      .filter((f) => f.level <= character.level)
                      .map((feature, index) => (
                        <div key={index} className="p-2 bg-muted rounded-lg text-xs">
                          <p className="font-bold">
                            {feature.name}{" "}
                            <span className="text-muted-foreground font-normal">(Lv {feature.level})</span>
                          </p>
                          <p className="text-muted-foreground line-clamp-3">{feature.description}</p>
                        </div>
                      ))}
                  </div>
                </section>
              )}

              {character.subclasses?.features && character.subclasses.features.length > 0 && (
                <section className="bg-card rounded-xl p-3 border border-border">
                  <h2 className="text-sm font-bold mb-2">{character.subclasses.name} Features</h2>
                  <div className="space-y-2">
                    {character.subclasses.features
                      .filter((f) => f.level <= character.level)
                      .map((feature, index) => (
                        <div key={index} className="p-2 bg-muted rounded-lg text-xs">
                          <p className="font-bold">
                            {feature.name}{" "}
                            <span className="text-muted-foreground font-normal">(Lv {feature.level})</span>
                          </p>
                          <p className="text-muted-foreground line-clamp-3">{feature.description}</p>
                        </div>
                      ))}
                  </div>
                </section>
              )}

              {character.species?.traits && character.species.traits.length > 0 && (
                <section className="bg-card rounded-xl p-3 border border-border">
                  <h2 className="text-sm font-bold mb-2">{character.species.name} Traits</h2>
                  <div className="space-y-2">
                    {character.species.traits.map((trait, index) => (
                      <div key={index} className="p-2 bg-muted rounded-lg text-xs">
                        <p className="font-bold">{trait.name}</p>
                        <p className="text-muted-foreground line-clamp-3">{trait.description}</p>
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
                    <p className="text-muted-foreground">{character.backgrounds.feature.description}</p>
                  </div>
                </section>
              )}

              {(originFeat || character.backgrounds?.feat_granted) && (
                <section className="bg-card rounded-xl p-3 border border-border">
                  <h2 className="text-sm font-bold mb-2">Origin Feats</h2>
                  <div className="p-2 bg-muted rounded-lg text-xs">
                    <p className="font-bold">{originFeat?.name ?? character.backgrounds?.feat_granted}</p>
                    <p className="text-muted-foreground">
                      {originFeat?.description ?? "Granted by your background at 1st level."}
                    </p>
                  </div>
                </section>
              )}

              {characterFeats.length > 0 && (
                <section className="bg-card rounded-xl p-3 border border-border">
                  <h2 className="text-sm font-bold mb-2">General Feats & Epic Boons</h2>
                  <div className="space-y-2">
                    {characterFeats.map((feat, index) => (
                      <div key={`${feat.id}-${index}`} className="p-2 bg-muted rounded-lg text-xs">
                        <p className="font-bold">
                          {feat.name}
                          <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                            ({normalizeFeatCategory(feat.category)})
                          </span>
                        </p>
                        <p className="text-muted-foreground line-clamp-4">{feat.description}</p>
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
                  href="/compendium/abilities/new"
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
              if (result.slotUsed && spellSlotTable) {
                const next = consumeSpellSlot(
                  usedSpellSlots,
                  spellSlotTable.slotsByLevel,
                  selectedSpell.level,
                )
                if (next) setUsedSpellSlots(next)
              }
            }}
            canUseSlot={
              selectedSpell.level === 0 ||
              (spellSlotTable != null &&
                (usedSpellSlots[selectedSpell.level - 1] ?? 0) <
                  (spellSlotTable.slotsByLevel[selectedSpell.level - 1] ?? 0))
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
  )
}
