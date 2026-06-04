"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
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

interface CharacterWithRelations extends Character {
  classes?: DndClass
  species?: Species
  backgrounds?: Background
  subclasses?: Subclass
}

const CONDITIONS = [
  { name: "Blinded", description: "A blinded creature can't see and automatically fails any ability check that requires sight." },
  { name: "Charmed", description: "A charmed creature can't attack the charmer or target the charmer with harmful abilities." },
  { name: "Deafened", description: "A deafened creature can't hear and automatically fails any ability check that requires hearing." },
  { name: "Exhaustion", description: "Exhaustion is measured in six levels with increasingly severe penalties." },
  { name: "Frightened", description: "A frightened creature has disadvantage on ability checks and attack rolls while the source of fear is in sight." },
  { name: "Grappled", description: "A grappled creature's speed becomes 0 and it can't benefit from speed bonuses." },
  { name: "Incapacitated", description: "An incapacitated creature can't take actions or reactions." },
  { name: "Invisible", description: "An invisible creature is impossible to see without magic or a special sense." },
  { name: "Paralyzed", description: "A paralyzed creature is incapacitated and automatically fails Strength and Dexterity saves." },
  { name: "Petrified", description: "A petrified creature is transformed into a solid inanimate substance." },
  { name: "Poisoned", description: "A poisoned creature has disadvantage on attack rolls and ability checks." },
  { name: "Prone", description: "A prone creature's only movement option is to crawl." },
  { name: "Restrained", description: "A restrained creature's speed becomes 0." },
  { name: "Stunned", description: "A stunned creature is incapacitated and automatically fails Strength and Dexterity saves." },
  { name: "Unconscious", description: "An unconscious creature is incapacitated and falls prone." },
]

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
  const [hoveredCondition, setHoveredCondition] = useState<string | null>(null)
  const [portraitZoomOpen, setPortraitZoomOpen] = useState(false)

  useEffect(() => {
    const fetchCharacter = async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("characters")
        .select(`*, classes (*), species (*), backgrounds (*), subclasses (*)`)
        .eq("id", id)
        .single()

      if (!error && data) {
        setCharacter(data)
        setCurrentHp(data.hit_points || data.hit_point_max || 0)

        if (data.spell_ids?.length) {
          const { data: spellData } = await supabase.from("spells").select("*").in("id", data.spell_ids)
          if (spellData) setSpells(spellData)
        }

        if (data.equipment_ids?.length) {
          const { data: equipmentData } = await supabase.from("equipment").select("*").in("id", data.equipment_ids)
          if (equipmentData) setEquipment(equipmentData)
        }

        const { data: abilitiesData } = await supabase
          .from("custom_abilities")
          .select("*")
          .eq("show_in_builder", true)
        if (abilitiesData) setCustomAbilities(abilitiesData)

        const featIds = (data.feat_ids ?? []).filter(Boolean)
        if (featIds.length) {
          const { data: featData } = await supabase.from("feats").select("*").in("id", featIds)
          if (featData) setCharacterFeats(featData)
        }

        const bg = data.backgrounds as Background | undefined
        if (bg?.feat_granted) {
          const { data: originData } = await supabase
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
  const weaponProficiencies = character.classes?.weapon_proficiencies ?? []
  const weapons = equipment.filter(isWeaponItem)
  const spellcastingAbilityKey = (
    character.classes?.spellcasting?.ability ?? character.subclasses?.spellcasting?.ability
  )?.toLowerCase() as keyof typeof abilityMods | undefined
  const hasSpellcasting = Boolean(
    character.classes?.spellcasting?.ability ?? character.subclasses?.spellcasting?.ability,
  )
  const spellcastingAbility = spellcastingAbilityKey
  const spellSaveDc = hasSpellcasting
    ? 8 + proficiencyBonus + abilityMods[spellcastingAbility!]
    : null
  const spellAttackMod = hasSpellcasting
    ? proficiencyBonus + abilityMods[spellcastingAbility!]
    : null

  const formatMod = (mod: number) => (mod >= 0 ? `+${mod}` : `${mod}`)

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
          className="relative rounded-2xl mb-3 overflow-hidden min-h-[140px]"
        >
          {character.banner_url && (
            <img
              src={character.banner_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
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

                <div className="relative mt-2">
                  <button
                    onClick={() => setConditionDropdownOpen(!conditionDropdownOpen)}
                    className="flex items-center gap-1.5 px-2 py-1 bg-card/80 border border-border rounded-md text-xs hover:border-primary transition-colors"
                  >
                    Conditions
                    <ChevronDown className={`w-3 h-3 transition-transform ${conditionDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {conditionDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                      {CONDITIONS.map((condition) => (
                        <label
                          key={condition.name}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={activeConditions.includes(condition.name)}
                            onChange={() => toggleCondition(condition.name)}
                            className="w-3.5 h-3.5 rounded accent-destructive"
                          />
                          {condition.name}
                        </label>
                      ))}
                    </div>
                  )}
                  {activeConditions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {activeConditions.map((condName) => (
                        <span
                          key={condName}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-destructive/20 text-destructive rounded-full text-[10px] font-medium"
                        >
                          {condName}
                          <button type="button" onClick={() => toggleCondition(condName)}>
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
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
            { id: "details" as const, label: "Character Details", icon: <FileText className="w-3.5 h-3.5" /> },
            { id: "combat" as const, label: "Combat", icon: <Swords className="w-3.5 h-3.5" /> },
            { id: "features" as const, label: "Features", icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: "custom" as const, label: "Custom", icon: <Wand2 className="w-3.5 h-3.5" /> },
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-card rounded-xl p-3 border border-border min-w-0">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Ability Scores</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {ABILITY_SCORE_KEYS.map((key) => {
                      const score = effectiveScores[key]
                      const bonus = asiBonuses[key]
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
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-card rounded-xl p-3 border border-border min-w-0">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Skills</h3>
                  <div className="space-y-1 max-h-[280px] overflow-y-auto">
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
                          <span className="truncate">
                            {skill.name} ({ABILITY_ABBREVIATIONS[skill.ability]})
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            {hasExpertise && (
                              <span className="text-[9px] font-semibold uppercase px-1 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300">
                                Expertise
                              </span>
                            )}
                            <span className="font-bold tabular-nums">{formatMod(mod)}</span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl p-3 border border-border">
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Proficiencies</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(character.tool_proficiencies ?? []).map((tool) => (
                    <span key={tool} className="px-2 py-0.5 bg-secondary/10 text-secondary rounded-full text-xs">
                      {tool}
                    </span>
                  ))}
                  {(character.languages ?? []).map((lang) => (
                    <span key={lang} className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                      {lang}
                    </span>
                  ))}
                  {!character.tool_proficiencies?.length && !character.languages?.length && (
                    <span className="text-xs text-muted-foreground">None listed</span>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-card rounded-xl p-3 border border-border">
                  <h2 className="text-sm font-bold text-foreground mb-2 text-left">Combat Stats</h2>
                  <div className="space-y-1">
                    {[
                      { label: "Armor Class", value: String(armorClass) },
                      { label: "Speed", value: `${speed} ft` },
                      { label: "Initiative", value: formatMod(initiative) },
                      { label: "Proficiency Bonus", value: formatMod(proficiencyBonus) },
                      ...(hasSpellcasting && spellSaveDc != null
                        ? [
                            { label: "Spell Save DC", value: String(spellSaveDc) },
                            { label: "Spell Attack", value: formatMod(spellAttackMod!) },
                          ]
                        : []),
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex justify-between items-center px-2 py-1.5 rounded text-xs bg-secondary/10 font-medium"
                      >
                        <span>{row.label}</span>
                        <span className="font-bold tabular-nums">{row.value}</span>
                      </div>
                    ))}
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
                            className={`flex justify-between items-center px-2 py-1.5 rounded text-xs ${
                              isProficient ? "bg-primary/10 font-medium" : "bg-muted/50 text-muted-foreground"
                            }`}
                          >
                            <span>{ability}</span>
                            <span className="font-bold">{formatMod(mod)}</span>
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
                  <div className="columns-1 sm:columns-2 lg:columns-3 gap-3">
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
                          className="break-inside-avoid mb-3 p-2.5 bg-muted/50 rounded-lg border border-border/60"
                        >
                          <p className="font-bold text-xs text-foreground mb-1.5">{weapon.name}</p>
                          {attack && (
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-xs font-black text-primary">
                                {formatMod(attack.attackBonus)} to hit
                              </span>
                              {damageRollExpr ? <DamageRollButton expression={damageRollExpr} /> : null}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-card rounded-xl p-3 border border-border">
                  <h2 className="text-sm font-bold mb-2">Equipment</h2>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {equipment.filter((item) => !isWeaponItem(item)).length ? (
                      equipment
                        .filter((item) => !isWeaponItem(item))
                        .map((item) => (
                          <div key={item.id} className="flex justify-between text-xs px-2 py-1 bg-muted rounded">
                            <span>{item.name}</span>
                            <span className="text-muted-foreground">{item.category}</span>
                          </div>
                        ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No other equipment</p>
                    )}
                  </div>
                </div>
                {hasSpellcasting && (
                  <div className="bg-card rounded-xl p-3 border border-border">
                    <h2 className="text-sm font-bold mb-2">Spells</h2>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {spells.length ? (
                        spells.map((spell) => (
                          <div key={spell.id} className="flex justify-between text-xs px-2 py-1 bg-muted rounded">
                            <span>{spell.name}</span>
                            <span className="text-primary">{spell.level === 0 ? "Cantrip" : `Lvl ${spell.level}`}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No spells prepared</p>
                      )}
                    </div>
                  </div>
                )}
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
                    {characterFeats.map((feat) => (
                      <div key={feat.id} className="p-2 bg-muted rounded-lg text-xs">
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
