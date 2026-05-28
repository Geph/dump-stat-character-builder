"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
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
  Minus
} from "lucide-react"
import type { DndClass, Species, Background, Spell, Equipment, CharacterDraft, CustomAbility } from "@/lib/types"

const STEPS = [
  { id: 1, label: "Class", icon: Shield },
  { id: 2, label: "Origin", icon: Users },
  { id: 3, label: "Abilities", icon: Dices },
  { id: 4, label: "Gear & Spells", icon: Package },
  { id: 5, label: "Details", icon: UserCircle },
  { id: 6, label: "Review", icon: ClipboardCheck },
]

const ABILITY_NAMES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const

export default function BuilderPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  
  // Content from database
  const [classes, setClasses] = useState<DndClass[]>([])
  const [species, setSpecies] = useState<Species[]>([])
  const [backgrounds, setBackgrounds] = useState<Background[]>([])
  const [spells, setSpells] = useState<Spell[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [customAbilities, setCustomAbilities] = useState<CustomAbility[]>([])
  const [loading, setLoading] = useState(true)

  // Character draft
  const [character, setCharacter] = useState<CharacterDraft>({
    name: "",
    level: 1,
    class_id: null,
    species_id: null,
    background_id: null,
    strength: 8,
    dexterity: 8,
    constitution: 8,
    intelligence: 8,
    wisdom: 8,
    charisma: 8,
    skill_proficiencies: [],
    languages: ["Common"],
    spell_ids: [],
    equipment_ids: [],
    personality_traits: "",
    ideals: "",
    bonds: "",
    flaws: "",
    backstory: "",
    portrait_url: null,
  })

  // Ability score generation method
  const [abilityMethod, setAbilityMethod] = useState<"pointbuy" | "standard" | "roll">("pointbuy")
  const [pointsRemaining, setPointsRemaining] = useState(27)
  
  // Search state for each step
  const [classSearch, setClassSearch] = useState("")
  const [speciesSearch, setSpeciesSearch] = useState("")
  const [backgroundSearch, setBackgroundSearch] = useState("")
  const [spellSearch, setSpellSearch] = useState("")
  const [equipmentSearch, setEquipmentSearch] = useState("")
  
  // Details modal state
  const [detailsModal, setDetailsModal] = useState<{
    type: "class" | "species" | "background" | "spell" | "equipment" | null
    item: DndClass | Species | Background | Spell | Equipment | null
  }>({ type: null, item: null })
  
  // Preview tabs
  const [previewTab, setPreviewTab] = useState<"summary" | "combat" | "features" | "custom">("summary")
  
  // Multiclass support - tracks class levels
  const [classLevels, setClassLevels] = useState<{ classId: string; level: number }[]>([])
  
  // Current HP tracker
  const [currentHp, setCurrentHp] = useState<number | null>(null)
  const [tempHp, setTempHp] = useState(0)

  useEffect(() => {
    const fetchContent = async () => {
      const supabase = createClient()
      
      const [classesRes, speciesRes, backgroundsRes, spellsRes, equipmentRes, abilitiesRes] = await Promise.all([
        supabase.from("classes").select("*").order("name"),
        supabase.from("species").select("*").order("name"),
        supabase.from("backgrounds").select("*").order("name"),
        supabase.from("spells").select("*").order("level").order("name"),
        supabase.from("equipment").select("*").order("category").order("name"),
        supabase.from("custom_abilities").select("*").eq("show_in_builder", true).order("name"),
      ])

      setClasses(classesRes.data || [])
      setSpecies(speciesRes.data || [])
      setBackgrounds(backgroundsRes.data || [])
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

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setCharacter({ ...character, portrait_url: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  const saveCharacter = async () => {
    setSaving(true)
    const supabase = createClient()

    const cls = classes.find(c => c.id === character.class_id)
    const sp = species.find(s => s.id === character.species_id)

    // Calculate derived stats using our computed values
    const calculatedLevel = classLevels.length > 0 
      ? classLevels.reduce((sum, cl) => sum + cl.level, 0) 
      : character.level
    const conMod = Math.floor((character.constitution - 10) / 2)
    const dexMod = Math.floor((character.dexterity - 10) / 2)
    
    // Calculate proper HP for multiclass
    let hitPointMax = 0
    const classesForHp = classLevels.length > 0 
      ? classLevels.map(cl => ({ cls: classes.find(c => c.id === cl.classId), level: cl.level }))
      : cls ? [{ cls, level: calculatedLevel }] : []
    
    let isFirst = true
    for (const { cls: c, level } of classesForHp) {
      if (!c) continue
      for (let i = 0; i < level; i++) {
        if (isFirst) {
          hitPointMax += c.hit_die + conMod
          isFirst = false
        } else {
          hitPointMax += Math.floor(c.hit_die / 2) + 1 + conMod
        }
      }
    }
    hitPointMax = Math.max(hitPointMax, 1)

    const characterData = {
      ...character,
      level: calculatedLevel,
      local_id: `local_${Date.now()}`,
      hit_point_max: hitPointMax,
      hit_points: hitPointMax,
      armor_class: 10 + dexMod,
      speed: sp?.speed || 30,
      proficiency_bonus: Math.floor((calculatedLevel - 1) / 4) + 2,
    }

    const { data, error } = await supabase
      .from("characters")
      .insert([characterData])
      .select()
      .single()

    setSaving(false)

    if (error) {
      console.error("Error saving character:", error)
      alert("Failed to save character. Please try again.")
      return
    }

    router.push(`/characters/${data.id}`)
  }

  const selectedClass = classes.find(c => c.id === character.class_id)
  const selectedSpecies = species.find(s => s.id === character.species_id)
  const selectedBackground = backgrounds.find(b => b.id === character.background_id)
  
  // Calculate total level from all class levels
  const totalLevel = classLevels.length > 0 
    ? classLevels.reduce((sum, cl) => sum + cl.level, 0)
    : character.level
  
  // Get proficiency bonus based on total level
  const proficiencyBonus = Math.floor((totalLevel - 1) / 4) + 2
  
  // Get all classes the character has levels in
  const characterClasses = classLevels.map(cl => ({
    ...classes.find(c => c.id === cl.classId)!,
    level: cl.level
  })).filter(c => c)
  
  // Primary class (first or highest level)
  const primaryClass = characterClasses.length > 0 ? characterClasses[0] : selectedClass
  
  // Compute ability modifiers
  const abilityMods = {
    strength: Math.floor((character.strength - 10) / 2),
    dexterity: Math.floor((character.dexterity - 10) / 2),
    constitution: Math.floor((character.constitution - 10) / 2),
    intelligence: Math.floor((character.intelligence - 10) / 2),
    wisdom: Math.floor((character.wisdom - 10) / 2),
    charisma: Math.floor((character.charisma - 10) / 2),
  }
  
  // Calculate max HP (hit die + con mod at level 1, average + con mod thereafter)
  const calculateMaxHp = () => {
    if (characterClasses.length === 0 && !selectedClass) return 8 + abilityMods.constitution
    let hp = 0
    let isFirstLevel = true
    for (const cls of characterClasses.length > 0 ? characterClasses : [{ ...selectedClass!, level: character.level }]) {
      if (!cls) continue
      for (let i = 0; i < cls.level; i++) {
        if (isFirstLevel) {
          hp += cls.hit_die + abilityMods.constitution
          isFirstLevel = false
        } else {
          hp += Math.floor(cls.hit_die / 2) + 1 + abilityMods.constitution
        }
      }
    }
    return Math.max(hp, 1)
  }
  const maxHp = calculateMaxHp()
  
  // Armor Class (base 10 + dex, can be modified by armor later)
  const armorClass = 10 + abilityMods.dexterity
  
  // Speed from species
  const speed = selectedSpecies?.speed || 30
  
  // Passive Perception (10 + wis mod + proficiency if proficient)
  const passivePerception = 10 + abilityMods.wisdom + 
    (character.skill_proficiencies.includes("Perception") ? proficiencyBonus : 0)
  
  // Initiative (dex mod)
  const initiative = abilityMods.dexterity
  
  // Darkvision from species traits
  const darkvision = selectedSpecies?.traits?.find(t => 
    t.name.toLowerCase().includes("darkvision")
  )?.description?.match(/(\d+)/)?.[1] || "0"
  
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
  
  // Get saving throw proficiencies from class
  const savingThrowProficiencies = primaryClass?.saving_throws || []

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!character.class_id || classLevels.length > 0
      case 2: return !!character.species_id && !!character.background_id
      case 3: return true
      case 4: return true
      case 5: return character.name.trim().length > 0
      case 6: return true
      default: return false
    }
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
      
      <main id="builder-main" className="max-w-7xl mx-auto px-4 py-8">
        {/* Step Indicator */}
        <div id="builder-steps" className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isComplete = currentStep > step.id
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all ${
                        isComplete
                          ? "bg-success text-success-foreground"
                          : isActive
                          ? "bg-primary text-primary-foreground scale-110"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isComplete ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-[10px] md:text-xs mt-1 font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-1 md:mx-2 rounded ${
                      isComplete ? "bg-success" : "bg-muted"
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Two-Column Layout */}
        <div id="builder-content" className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column: Step Content (choices) */}
          <div id="builder-step-panel" className="lg:col-span-3 bg-card rounded-2xl border-2 border-border p-6 min-h-[600px]">
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
                <h2 className="text-2xl font-black text-foreground mb-2">Choose Your Class</h2>
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
                                    setClassLevels(newLevels)
                                  } else {
                                    setClassLevels(newLevels.filter((_, i) => i !== idx))
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
                              onClick={() => setClassLevels(classLevels.filter((_, i) => i !== idx))}
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
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-[10px] pb-[10px]">
                  {classes
                    .filter(cls => cls.name.toLowerCase().includes(classSearch.toLowerCase()))
                    .map((cls) => {
                      const existingLevel = classLevels.find(cl => cl.classId === cls.id)
                      const isSelected = !!existingLevel || character.class_id === cls.id
                      return (
                        <motion.button
                          key={cls.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
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
                          disabled={totalLevel >= 20 && !existingLevel}
                          className={`p-3 rounded-xl border-2 text-left transition-all disabled:opacity-50 ${
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
                        </motion.button>
                      )
                    })}
                </div>
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
                      <motion.button
                        key={sp.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCharacter({ ...character, species_id: sp.id })}
                        className={`p-2 rounded-lg border-2 text-left transition-all ${
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
                      </motion.button>
                    ))}
                  </div>
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
                      <motion.button
                        key={bg.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCharacter({ ...character, background_id: bg.id })}
                        className={`p-2 rounded-lg border-2 text-left transition-all ${
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
                      </motion.button>
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
                <div className="flex gap-2 mb-6">
                  {[
                    { id: "pointbuy", label: "Point Buy" },
                    { id: "standard", label: "Standard Array" },
                    { id: "roll", label: "Roll" },
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => {
                        setAbilityMethod(method.id as typeof abilityMethod)
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
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        abilityMethod === method.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>

                {abilityMethod === "pointbuy" && (
                  <div className="mb-4 p-3 bg-primary/10 rounded-xl text-center">
                    <span className="font-bold text-primary">Points Remaining: {pointsRemaining}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {ABILITY_NAMES.map((ability) => (
                    <div key={ability} className="bg-card rounded-xl p-4 border-2 border-border text-center">
                      <h3 className="font-bold text-foreground capitalize mb-2">{ability}</h3>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => updateAbilityScore(ability, -1)}
                          disabled={character[ability] <= 8}
                          className="w-8 h-8 bg-muted rounded-lg font-bold disabled:opacity-30"
                        >
                          -
                        </button>
                        <span className="text-3xl font-black text-foreground w-12">
                          {character[ability]}
                        </span>
                        <button
                          onClick={() => updateAbilityScore(ability, 1)}
                          disabled={abilityMethod === "pointbuy" && character[ability] >= 15}
                          className="w-8 h-8 bg-muted rounded-lg font-bold disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-lg font-bold text-primary mt-1">
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
                  <p className="text-muted-foreground mb-3">Choose your starting gear.</p>
                  
                  {/* Search */}
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
                      .filter(item => item.name.toLowerCase().includes(equipmentSearch.toLowerCase()))
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
                              setCharacter({ ...character, equipment_ids: character.equipment_ids.filter(id => id !== item.id) })
                            }
                          }}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          character.equipment_ids.includes(item.id) ? "bg-primary border-primary" : "border-muted-foreground"
                        }`}>
                          {character.equipment_ids.includes(item.id) && <Check className="w-2.5 h-2.5 text-white" />}
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
                </div>

                {selectedClass?.spellcasting && (
                  <div>
                    <h2 className="text-2xl font-black text-foreground mb-2">Select Spells</h2>
                    <p className="text-muted-foreground mb-3">
                      Choose spells available to your {selectedClass.name} at level {totalLevel}.
                    </p>
                    
                    {/* Search */}
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
                    
                    {/* Spell level based on character level: 1-2=1st, 3-4=2nd, 5-6=3rd, etc. */}
                    {(() => {
                      const maxSpellLevel = Math.min(9, Math.ceil(totalLevel / 2))
                      const availableSpells = spells
                        .filter(s => s.classes?.includes(selectedClass.name) && s.level <= maxSpellLevel)
                        .filter(s => s.name.toLowerCase().includes(spellSearch.toLowerCase()))
                      
                      // Group by spell level
                      const spellsByLevel: Record<number, typeof availableSpells> = {}
                      availableSpells.forEach(s => {
                        if (!spellsByLevel[s.level]) spellsByLevel[s.level] = []
                        spellsByLevel[s.level].push(s)
                      })
                      
                      return (
                        <div className="space-y-4 max-h-64 overflow-y-auto">
                          {Object.entries(spellsByLevel)
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([level, levelSpells]) => (
                            <div key={level}>
                              <p className="text-xs font-bold text-primary uppercase mb-2">
                                {level === "0" ? "Cantrips" : `Level ${level} Spells`}
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {levelSpells.slice(0, 15).map((spell) => (
                                  <label
                                    key={spell.id}
                                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                                      character.spell_ids.includes(spell.id)
                                        ? "border-secondary bg-secondary/10"
                                        : "border-border bg-card hover:border-secondary/50"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={character.spell_ids.includes(spell.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setCharacter({ ...character, spell_ids: [...character.spell_ids, spell.id] })
                                        } else {
                                          setCharacter({ ...character, spell_ids: character.spell_ids.filter(id => id !== spell.id) })
                                        }
                                      }}
                                      className="sr-only"
                                    />
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                      character.spell_ids.includes(spell.id) ? "bg-secondary border-secondary" : "border-muted-foreground"
                                    }`}>
                                      {character.spell_ids.includes(spell.id) && <Check className="w-2.5 h-2.5 text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm text-foreground truncate">{spell.name}</p>
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
                                ))}
                              </div>
                            </div>
                          ))}
                          {availableSpells.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No spells found for {selectedClass.name}.
                            </p>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Character Details */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-foreground mb-2">Character Details</h2>
                <p className="text-muted-foreground mb-6">Give your character a name and personality.</p>

                {/* Portrait Upload */}
                <div className="flex items-start gap-6 mb-6">
                  <div className="relative">
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
                        <span className="text-xs text-muted-foreground">Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePortraitUpload}
                          className="sr-only"
                        />
                      </label>
                    )}
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
                      <span className="text-foreground ml-2">{character.spell_ids.length} spells</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

            {/* Navigation Buttons inside left column */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <button
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className="flex items-center gap-2 px-5 py-3 bg-lemon text-lemon-foreground rounded-xl font-bold disabled:opacity-30 transition-colors hover:brightness-110"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>

              {currentStep < 6 ? (
                <button
                  onClick={() => setCurrentStep(Math.min(6, currentStep + 1))}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  Continue
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={saveCharacter}
                  disabled={saving || !canProceed()}
                  className="flex items-center gap-2 px-6 py-3 bg-success text-white rounded-xl font-bold hover:bg-success/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving..." : "Create Character"}
                  <Check className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Character Sheet Preview */}
          <div id="builder-preview" className="lg:col-span-2">
            <div className="bg-card rounded-2xl border-2 border-border p-4 sticky top-24 min-h-[600px]">
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
                    <span key={cls.id}>
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
                      const score = character[ability]
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
                            const isProficient = character.skill_proficiencies.includes(skill.name)
                            const mod = abilityMods[skill.ability] + (isProficient ? proficiencyBonus : 0)
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
                          <div className="flex items-center justify-center gap-0.5">
                            <input
                              type="number"
                              value={currentHp ?? maxHp}
                              onChange={(e) => setCurrentHp(Math.min(maxHp, Math.max(0, parseInt(e.target.value) || 0)))}
                              className="w-8 text-center bg-background border border-border rounded px-0.5 py-0.5 text-xs font-bold"
                            />
                            <span className="text-[10px] text-muted-foreground">/{maxHp}</span>
                          </div>
                          {tempHp > 0 && <p className="text-[8px] text-cyan">+{tempHp}</p>}
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
                        <p className="text-[8px] text-muted-foreground uppercase mb-1">Saves</p>
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
                  {primaryClass?.spellcasting && (
                    <div className="p-2 bg-magenta/10 rounded-lg">
                      <p className="text-[9px] text-magenta uppercase font-bold mb-1">Spellcasting ({primaryClass.spellcasting.ability})</p>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div>
                          <p className="text-[8px] text-muted-foreground">Spell Save DC</p>
                          <p className="text-xl font-black text-magenta">
                            {8 + proficiencyBonus + abilityMods[primaryClass.spellcasting.ability.toLowerCase() as keyof typeof abilityMods]}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] text-muted-foreground">Spell Attack</p>
                          <p className="text-xl font-black text-magenta">
                            +{proficiencyBonus + abilityMods[primaryClass.spellcasting.ability.toLowerCase() as keyof typeof abilityMods]}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Resistances */}
                  <div className="p-2 bg-muted/30 rounded-lg">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold mb-1">Resistances</p>
                    <p className="text-[10px] text-foreground italic">
                      {selectedSpecies?.traits?.filter(t => 
                        t.name.toLowerCase().includes("resistance") || 
                        t.description?.toLowerCase().includes("resistance to")
                      ).map(t => t.name).join(", ") || "None"}
                    </p>
                  </div>

                  {/* Death Saves */}
                  <div className="p-2 bg-muted/30 rounded-lg">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold mb-1">Death Saves</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-lime">Successes</span>
                        <div className="flex gap-1">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="w-3 h-3 border border-lime rounded-full" />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-destructive">Failures</span>
                        <div className="flex gap-1">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="w-3 h-3 border border-destructive rounded-full" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Equipped Items */}
                  <div className="p-2 bg-muted/30 rounded-lg">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold mb-2">Equipped Items</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <p className="text-muted-foreground mb-0.5">Armor</p>
                        <select className="w-full bg-background border border-border rounded px-1 py-0.5 text-foreground text-[10px]">
                          <option>None (Unarmored)</option>
                          {equipment.filter(e => e.category === "Armor").map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-0.5">Shield</p>
                        <select className="w-full bg-background border border-border rounded px-1 py-0.5 text-foreground text-[10px]">
                          <option>None</option>
                          {equipment.filter(e => e.name.toLowerCase().includes("shield")).map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-muted-foreground mb-0.5">Main Weapon</p>
                      <select className="w-full bg-background border border-border rounded px-1 py-0.5 text-foreground text-[10px]">
                        <option>None</option>
                        {equipment.filter(e => e.category === "Weapon").map(e => (
                          <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Proficiencies */}
                  <div className="p-2 bg-muted/30 rounded-lg">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold mb-1">Weapon Proficiencies</p>
                    <p className="text-[10px] text-foreground italic">
                      {primaryClass?.weapon_proficiencies?.join(", ") || "None"}
                    </p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded-lg">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold mb-1">Armor Proficiencies</p>
                    <p className="text-[10px] text-foreground italic">
                      {primaryClass?.armor_proficiencies?.join(", ") || "None"}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Features Tab */}
              {previewTab === "features" && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {/* Class Features */}
                  {characterClasses.length > 0 ? (
                    characterClasses.map((cls) => (
                      <div key={cls.id}>
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
                        {/* Darkvision */}
                        {darkvision > 0 && (
                          <div className="p-1.5 bg-muted/30 rounded text-[10px]">
                            <p className="font-bold text-foreground">Darkvision</p>
                            <p className="text-muted-foreground">{darkvision} ft range</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Background Feature */}
                  {selectedBackground?.feature && (
                    <div>
                      <p className="text-[9px] text-accent uppercase font-bold mb-1">{selectedBackground.name} Feature</p>
                      <div className="p-1.5 bg-muted/30 rounded text-[10px]">
                        <p className="font-bold text-foreground">{selectedBackground.feature.name}</p>
                        <p className="text-muted-foreground line-clamp-3">{selectedBackground.feature.description}</p>
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
                        {customAbilities.map((ability) => (
                          <div key={ability.id} className="p-1.5 bg-muted/30 rounded text-[10px]">
                            <p className="font-bold text-foreground">{ability.name}</p>
                            <p className="text-muted-foreground line-clamp-2">{ability.description}</p>
                            {ability.uses && ability.uses.type !== "unlimited" && (
                              <p className="text-[8px] text-magenta mt-0.5">
                                Uses: {ability.uses.type === "fixed" ? ability.uses.fixedAmount : ability.uses.type}
                                {ability.uses.recharge && ` (${ability.uses.recharge.replace("_", " ")})`}
                              </p>
                            )}
                          </div>
                        ))}
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
              
              {detailsModal.type === "background" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {(detailsModal.item as Background).description}
                  </p>
                  {(detailsModal.item as Background).skill_proficiencies && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase mb-1">Skills</p>
                      <p className="text-sm text-foreground">
                        {(detailsModal.item as Background).skill_proficiencies?.join(", ")}
                      </p>
                    </div>
                  )}
                  {(detailsModal.item as Background).feat_granted && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase mb-1">Starting Feat</p>
                      <p className="text-sm text-foreground">
                        {(detailsModal.item as Background).feat_granted}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
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
