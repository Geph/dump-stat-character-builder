"use client"

import { useState, useEffect, use } from "react"
import { motion } from "framer-motion"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, User, Shield, Heart, Zap, Swords, BookOpen, Package, Star, Sparkles, Wand2, UserCircle, Info, ChevronDown, X } from "lucide-react"
import Link from "next/link"
import type { Character, DndClass, Species, Background, Spell, Equipment, CustomAbility } from "@/lib/types"

interface CharacterWithRelations extends Character {
  classes?: DndClass
  species?: Species
  backgrounds?: Background
}

// D&D 5e conditions with descriptions
const CONDITIONS = [
  { name: "Blinded", description: "A blinded creature can't see and automatically fails any ability check that requires sight. Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage." },
  { name: "Charmed", description: "A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects. The charmer has advantage on any ability check to interact socially with the creature." },
  { name: "Deafened", description: "A deafened creature can't hear and automatically fails any ability check that requires hearing." },
  { name: "Exhaustion", description: "Exhaustion is measured in six levels. Each level imposes increasingly severe penalties." },
  { name: "Frightened", description: "A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight. The creature can't willingly move closer to the source of its fear." },
  { name: "Grappled", description: "A grappled creature's speed becomes 0, and it can't benefit from any bonus to its speed. The condition ends if the grappler is incapacitated or if an effect removes the grappled creature from the grappler's reach." },
  { name: "Incapacitated", description: "An incapacitated creature can't take actions or reactions." },
  { name: "Invisible", description: "An invisible creature is impossible to see without the aid of magic or a special sense. The creature has advantage on attack rolls, and attack rolls against it have disadvantage." },
  { name: "Paralyzed", description: "A paralyzed creature is incapacitated and can't move or speak. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage." },
  { name: "Petrified", description: "A petrified creature is transformed into a solid inanimate substance. Its weight increases by a factor of ten, and it ceases aging." },
  { name: "Poisoned", description: "A poisoned creature has disadvantage on attack rolls and ability checks." },
  { name: "Prone", description: "A prone creature's only movement option is to crawl. The creature has disadvantage on attack rolls. Attack rolls against the creature have advantage if the attacker is within 5 feet, otherwise disadvantage." },
  { name: "Restrained", description: "A restrained creature's speed becomes 0. Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage. The creature has disadvantage on Dexterity saving throws." },
  { name: "Stunned", description: "A stunned creature is incapacitated, can't move, and can speak only falteringly. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage." },
  { name: "Unconscious", description: "An unconscious creature is incapacitated, can't move or speak, and is unaware of its surroundings. The creature drops whatever it's holding and falls prone." },
]

const SKILLS_DATA: { name: string; ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma" }[] = [
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

export default function CharacterSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [character, setCharacter] = useState<CharacterWithRelations | null>(null)
  const [spells, setSpells] = useState<Spell[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [customAbilities, setCustomAbilities] = useState<CustomAbility[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"summary" | "combat" | "features" | "custom">("summary")
  
  // HP management
  const [currentHp, setCurrentHp] = useState<number>(0)
  const [tempHp, setTempHp] = useState<number>(0)
  
  // Conditions
  const [activeConditions, setActiveConditions] = useState<string[]>([])
  const [conditionDropdownOpen, setConditionDropdownOpen] = useState(false)
  const [hoveredCondition, setHoveredCondition] = useState<string | null>(null)

  useEffect(() => {
    const fetchCharacter = async () => {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from("characters")
        .select(`
          *,
          classes (*),
          species (*),
          backgrounds (*)
        `)
        .eq("id", id)
        .single()

      if (!error && data) {
        setCharacter(data)
        setCurrentHp(data.hit_points || data.hit_point_max || 0)
        
        // Fetch spells if character has spell_ids
        if (data.spell_ids && data.spell_ids.length > 0) {
          const { data: spellData } = await supabase
            .from("spells")
            .select("*")
            .in("id", data.spell_ids)
          if (spellData) setSpells(spellData)
        }
        
        // Fetch equipment if character has equipment_ids
        if (data.equipment_ids && data.equipment_ids.length > 0) {
          const { data: equipmentData } = await supabase
            .from("equipment")
            .select("*")
            .in("id", data.equipment_ids)
          if (equipmentData) setEquipment(equipmentData)
        }
        
        // Fetch custom abilities that are shown in builder
        const { data: abilitiesData } = await supabase
          .from("custom_abilities")
          .select("*")
          .eq("show_in_builder", true)
        if (abilitiesData) setCustomAbilities(abilitiesData)
      }
      setLoading(false)
    }

    fetchCharacter()
  }, [id])

  const getAbilityModifier = (score: number) => {
    const mod = Math.floor((score - 10) / 2)
    return mod >= 0 ? `+${mod}` : `${mod}`
  }

  const getAbilityModNum = (score: number) => Math.floor((score - 10) / 2)

  const toggleCondition = (conditionName: string) => {
    if (activeConditions.includes(conditionName)) {
      setActiveConditions(activeConditions.filter(c => c !== conditionName))
    } else {
      setActiveConditions([...activeConditions, conditionName])
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-8" />
            <div className="h-48 bg-muted rounded-2xl mb-6" />
            <div className="h-64 bg-muted rounded-2xl" />
          </div>
        </main>
      </div>
    )
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-5xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Character not found</h1>
          <Link href="/characters" className="text-primary hover:underline">
            Back to characters
          </Link>
        </main>
      </div>
    )
  }

  const abilityMods = {
    strength: getAbilityModNum(character.strength),
    dexterity: getAbilityModNum(character.dexterity),
    constitution: getAbilityModNum(character.constitution),
    intelligence: getAbilityModNum(character.intelligence),
    wisdom: getAbilityModNum(character.wisdom),
    charisma: getAbilityModNum(character.charisma),
  }

  const proficiencyBonus = Math.floor((character.level - 1) / 4) + 2
  const armorClass = character.armor_class || 10 + abilityMods.dexterity
  const speed = character.speed || 30
  const initiative = abilityMods.dexterity
  const maxHp = character.hit_point_max || 0
  const savingThrowProficiencies = character.classes?.saving_throws || []

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          href="/characters"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to characters
        </Link>

        {/* Character Header - Large portrait, HP editable, conditions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl p-6 mb-6"
        >
          <div className="flex items-start gap-6">
            {/* Double size portrait (w-48 h-48 instead of w-24 h-24) */}
            {character.portrait_url ? (
              <img
                src={character.portrait_url}
                alt={character.name}
                className="w-48 h-48 rounded-2xl object-cover border-4 border-background shadow-lg"
              />
            ) : (
              <div className="w-48 h-48 bg-card rounded-2xl flex items-center justify-center border-4 border-background">
                <User className="w-24 h-24 text-muted-foreground" />
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-3xl font-black text-foreground mb-1">{character.name}</h1>
              <p className="text-lg text-muted-foreground mb-2">
                Level {character.level} {character.classes?.name || "Adventurer"}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {character.species && (
                  <span className="px-3 py-1 bg-card rounded-full text-sm font-medium">
                    {character.species.name}
                  </span>
                )}
                {character.backgrounds && (
                  <span className="px-3 py-1 bg-card rounded-full text-sm font-medium">
                    {character.backgrounds.name}
                  </span>
                )}
              </div>
              
              {/* Conditions dropdown */}
              <div className="relative">
                <button
                  onClick={() => setConditionDropdownOpen(!conditionDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm hover:border-primary transition-colors"
                >
                  <span className="text-muted-foreground">Conditions</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${conditionDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                
                {conditionDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto">
                    {CONDITIONS.map((condition) => (
                      <label
                        key={condition.name}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={activeConditions.includes(condition.name)}
                          onChange={() => toggleCondition(condition.name)}
                          className="w-4 h-4 rounded border-border accent-destructive"
                        />
                        <span className="text-sm text-foreground">{condition.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                
                {/* Active conditions badges */}
                {activeConditions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {activeConditions.map((condName) => {
                      const condition = CONDITIONS.find(c => c.name === condName)
                      return (
                        <div
                          key={condName}
                          className="relative flex items-center gap-1 px-2 py-1 bg-destructive/20 text-destructive border border-destructive/40 rounded-full text-xs font-medium"
                        >
                          <span>{condName}</span>
                          <button
                            onClick={() => toggleCondition(condName)}
                            className="hover:text-destructive/80"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div
                            className="relative"
                            onMouseEnter={() => setHoveredCondition(condName)}
                            onMouseLeave={() => setHoveredCondition(null)}
                          >
                            <Info className="w-3 h-3 cursor-help" />
                            {hoveredCondition === condName && condition && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-card border border-border rounded-lg shadow-lg text-foreground text-xs z-50">
                                <p className="font-bold mb-1">{condition.name}</p>
                                <p className="text-muted-foreground">{condition.description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* HP with editable input and temp HP */}
            <div className="flex flex-col items-end gap-2">
              <div className="bg-card rounded-xl p-4 text-center min-w-[120px]">
                <Heart className="w-6 h-6 text-destructive mx-auto mb-1" />
                <p className="text-xs text-muted-foreground mb-1">Hit Points</p>
                <div className="flex items-center justify-center gap-1">
                  <input
                    type="number"
                    value={currentHp}
                    onChange={(e) => setCurrentHp(Math.max(0, Math.min(maxHp + tempHp, parseInt(e.target.value) || 0)))}
                    className="w-14 text-center bg-background border border-border rounded px-1 py-1 text-xl font-black text-foreground"
                  />
                  <span className="text-lg text-muted-foreground">/ {maxHp}</span>
                </div>
              </div>
              
              {/* Temp HP input */}
              <div className="bg-cyan/10 rounded-lg p-2 text-center flex items-center gap-2">
                <span className="text-xs text-cyan">Temp HP:</span>
                <input
                  type="number"
                  value={tempHp}
                  onChange={(e) => setTempHp(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-12 text-center bg-background border border-cyan/30 rounded px-1 py-0.5 text-sm font-bold text-cyan"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs - Match builder preview tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: "summary", label: "Summary", icon: <UserCircle className="w-4 h-4" /> },
            { id: "combat", label: "Combat", icon: <Swords className="w-4 h-4" /> },
            { id: "features", label: "Features", icon: <Sparkles className="w-4 h-4" /> },
            { id: "custom", label: "Custom", icon: <Wand2 className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-colors ${
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

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Summary Tab */}
          {activeTab === "summary" && (
            <div className="space-y-6">
              {/* Ability Scores */}
              <div className="bg-card rounded-2xl p-6 border-2 border-border">
                <h2 className="text-xl font-bold text-foreground mb-4">Ability Scores</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { key: "strength", label: "Strength", color: "bg-red-500" },
                    { key: "dexterity", label: "Dexterity", color: "bg-green-500" },
                    { key: "constitution", label: "Constitution", color: "bg-orange-500" },
                    { key: "intelligence", label: "Intelligence", color: "bg-blue-500" },
                    { key: "wisdom", label: "Wisdom", color: "bg-purple-500" },
                    { key: "charisma", label: "Charisma", color: "bg-pink-500" },
                  ].map(({ key, label, color }) => {
                    const score = (character[key as keyof Character] as number) || 10
                    return (
                      <div key={key} className="text-center">
                        <div className={`w-16 h-16 ${color} rounded-2xl flex items-center justify-center mx-auto mb-2`}>
                          <span className="text-2xl font-black text-white">{score}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-lg font-bold text-primary">{getAbilityModifier(score)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Skills */}
              <div className="bg-card rounded-2xl p-6 border-2 border-border">
                <h2 className="text-xl font-bold text-foreground mb-4">Skills</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {SKILLS_DATA.map((skill) => {
                    const isProficient = character.skill_proficiencies?.includes(skill.name) || false
                    const mod = abilityMods[skill.ability] + (isProficient ? proficiencyBonus : 0)
                    const abilityAbbr = skill.ability.slice(0, 3).toUpperCase()
                    return (
                      <div 
                        key={skill.name} 
                        className={`flex justify-between items-center p-2 rounded-lg ${
                          isProficient ? "bg-primary/10 border border-primary/30" : "bg-muted/50"
                        }`}
                      >
                        <span className={`text-sm ${isProficient ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                          {skill.name} <span className="text-xs opacity-60">({abilityAbbr})</span>
                        </span>
                        <span className={`font-bold ${isProficient ? "text-primary" : "text-foreground"}`}>
                          {mod >= 0 ? `+${mod}` : mod}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Proficiencies */}
              <div className="bg-card rounded-2xl p-6 border-2 border-border">
                <h2 className="text-xl font-bold text-foreground mb-4">Proficiencies</h2>
                <div className="space-y-4">
                  {character.tool_proficiencies && character.tool_proficiencies.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Tools</h3>
                      <div className="flex flex-wrap gap-2">
                        {character.tool_proficiencies.map((tool) => (
                          <span key={tool} className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm font-medium">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {character.languages && character.languages.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Languages</h3>
                      <div className="flex flex-wrap gap-2">
                        {character.languages.map((lang) => (
                          <span key={lang} className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm font-medium">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Combat Tab */}
          {activeTab === "combat" && (
            <div className="space-y-6">
              {/* Combat Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card rounded-2xl p-4 border-2 border-border text-center">
                  <Shield className="w-6 h-6 text-secondary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground uppercase">Armor Class</p>
                  <p className="text-3xl font-black text-secondary">{armorClass}</p>
                </div>
                <div className="bg-card rounded-2xl p-4 border-2 border-border text-center">
                  <Zap className="w-6 h-6 text-warning mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground uppercase">Speed</p>
                  <p className="text-3xl font-black text-warning">{speed} ft</p>
                </div>
                <div className="bg-card rounded-2xl p-4 border-2 border-border text-center">
                  <p className="text-xs text-muted-foreground uppercase mb-2">Initiative</p>
                  <p className="text-3xl font-black text-lime">{initiative >= 0 ? `+${initiative}` : initiative}</p>
                </div>
                <div className="bg-card rounded-2xl p-4 border-2 border-border text-center">
                  <p className="text-xs text-muted-foreground uppercase mb-2">Proficiency</p>
                  <p className="text-3xl font-black text-primary">+{proficiencyBonus}</p>
                </div>
              </div>

              {/* Spellcasting Stats */}
              {character.classes?.spellcasting && (
                <div className="bg-magenta/10 rounded-2xl p-6 border-2 border-magenta/30">
                  <h2 className="text-lg font-bold text-magenta mb-4">
                    Spellcasting ({character.classes.spellcasting.ability})
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Spell Save DC</p>
                      <p className="text-3xl font-black text-magenta">
                        {8 + proficiencyBonus + abilityMods[character.classes.spellcasting.ability.toLowerCase() as keyof typeof abilityMods]}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Spell Attack Modifier</p>
                      <p className="text-3xl font-black text-magenta">
                        +{proficiencyBonus + abilityMods[character.classes.spellcasting.ability.toLowerCase() as keyof typeof abilityMods]}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Saving Throws */}
              <div className="bg-card rounded-2xl p-6 border-2 border-border">
                <h2 className="text-xl font-bold text-foreground mb-4">Saving Throws</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"] as const).map((ability) => {
                    const isProficient = savingThrowProficiencies.includes(ability)
                    const mod = abilityMods[ability.toLowerCase() as keyof typeof abilityMods] + (isProficient ? proficiencyBonus : 0)
                    return (
                      <div 
                        key={ability}
                        className={`flex justify-between items-center p-3 rounded-lg ${
                          isProficient ? "bg-primary/10 border border-primary/30" : "bg-muted/50"
                        }`}
                      >
                        <span className={`text-sm ${isProficient ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                          {ability}
                        </span>
                        <span className={`font-bold ${isProficient ? "text-primary" : "text-foreground"}`}>
                          {mod >= 0 ? `+${mod}` : mod}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Resistances */}
              <div className="bg-card rounded-2xl p-6 border-2 border-border">
                <h2 className="text-xl font-bold text-foreground mb-4">Resistances</h2>
                <p className="text-muted-foreground">
                  {character.species?.traits?.filter(t => 
                    t.name.toLowerCase().includes("resistance") || 
                    t.description?.toLowerCase().includes("resistance to")
                  ).map(t => t.name).join(", ") || "None"}
                </p>
              </div>

              {/* Death Saves */}
              <div className="bg-card rounded-2xl p-6 border-2 border-border">
                <h2 className="text-xl font-bold text-foreground mb-4">Death Saves</h2>
                <div className="flex items-center justify-around">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-lime">Successes</span>
                    <div className="flex gap-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 border-2 border-lime rounded-full cursor-pointer hover:bg-lime/20" />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-destructive">Failures</span>
                    <div className="flex gap-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 border-2 border-destructive rounded-full cursor-pointer hover:bg-destructive/20" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Equipped Items & Spells */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card rounded-2xl p-6 border-2 border-border">
                  <h2 className="text-xl font-bold text-foreground mb-4">Equipment</h2>
                  {equipment.length > 0 ? (
                    <div className="space-y-2">
                      {equipment.map((item) => (
                        <div key={item.id} className="p-3 bg-muted rounded-lg flex items-center justify-between">
                          <span className="font-medium text-foreground">{item.name}</span>
                          <span className="text-xs text-muted-foreground">{item.category}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No equipment</p>
                  )}
                </div>
                
                <div className="bg-card rounded-2xl p-6 border-2 border-border">
                  <h2 className="text-xl font-bold text-foreground mb-4">Spells</h2>
                  {spells.length > 0 ? (
                    <div className="space-y-2">
                      {spells.map((spell) => (
                        <div key={spell.id} className="p-3 bg-muted rounded-lg flex items-center justify-between">
                          <span className="font-medium text-foreground">{spell.name}</span>
                          <span className="text-xs text-primary">
                            {spell.level === 0 ? "Cantrip" : `Lvl ${spell.level}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No spells</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Features Tab */}
          {activeTab === "features" && (
            <div className="space-y-6">
              {/* Class Features */}
              <div className="bg-card rounded-2xl p-6 border-2 border-border">
                <h2 className="text-xl font-bold text-foreground mb-4">
                  {character.classes?.name || "Class"} Features
                </h2>
                {character.classes?.features ? (
                  <div className="space-y-4">
                    {(character.classes.features as { level: number; name: string; description: string }[])
                      .filter(f => f.level <= character.level)
                      .map((feature, index) => (
                        <div key={index} className="p-4 bg-muted rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs font-medium">
                              Level {feature.level}
                            </span>
                            <h3 className="font-bold text-foreground">{feature.name}</h3>
                          </div>
                          <p className="text-muted-foreground text-sm">{feature.description}</p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No features available</p>
                )}
              </div>

              {/* Species Traits */}
              {character.species?.traits && character.species.traits.length > 0 && (
                <div className="bg-card rounded-2xl p-6 border-2 border-border">
                  <h2 className="text-xl font-bold text-foreground mb-4">
                    {character.species.name} Traits
                  </h2>
                  <div className="space-y-4">
                    {character.species.traits.map((trait, index) => (
                      <div key={index} className="p-4 bg-muted rounded-xl">
                        <h3 className="font-bold text-foreground mb-1">{trait.name}</h3>
                        <p className="text-muted-foreground text-sm">{trait.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Background Feature */}
              {character.backgrounds?.feature && (
                <div className="bg-card rounded-2xl p-6 border-2 border-border">
                  <h2 className="text-xl font-bold text-foreground mb-4">
                    {character.backgrounds.name} Feature
                  </h2>
                  <div className="p-4 bg-muted rounded-xl">
                    <h3 className="font-bold text-foreground mb-1">{character.backgrounds.feature.name}</h3>
                    <p className="text-muted-foreground text-sm">{character.backgrounds.feature.description}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Tab */}
          {activeTab === "custom" && (
            <div className="bg-card rounded-2xl p-6 border-2 border-border">
              <h2 className="text-xl font-bold text-foreground mb-4">Custom Abilities</h2>
              {customAbilities.length > 0 ? (
                <div className="space-y-4">
                  {customAbilities.map((ability) => (
                    <div key={ability.id} className="p-4 bg-muted rounded-xl">
                      <h3 className="font-bold text-foreground mb-1">{ability.name}</h3>
                      <p className="text-muted-foreground text-sm">{ability.description}</p>
                      {ability.uses && ability.uses.type !== "unlimited" && (
                        <p className="text-xs text-magenta mt-2">
                          Uses: {ability.uses.type === "fixed" ? ability.uses.fixedAmount : ability.uses.type}
                          {ability.uses.recharge && ` (Recharges on ${ability.uses.recharge.replace("_", " ")})`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Wand2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No custom abilities available</p>
                  <p className="text-sm text-muted-foreground">
                    Custom abilities can be added in the Compendium and marked to show here.
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
