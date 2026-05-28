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
  X
} from "lucide-react"
import type { DndClass, Species, Background, Spell, Equipment, CharacterDraft } from "@/lib/types"

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
  const [loading, setLoading] = useState(true)

  // Character draft
  const [character, setCharacter] = useState<CharacterDraft>({
    name: "",
    level: 1,
    class_id: null,
    species_id: null,
    background_id: null,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
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

  useEffect(() => {
    const fetchContent = async () => {
      const supabase = createClient()
      
      const [classesRes, speciesRes, backgroundsRes, spellsRes, equipmentRes] = await Promise.all([
        supabase.from("classes").select("*").order("name"),
        supabase.from("species").select("*").order("name"),
        supabase.from("backgrounds").select("*").order("name"),
        supabase.from("spells").select("*").order("level").order("name"),
        supabase.from("equipment").select("*").order("category").order("name"),
      ])

      setClasses(classesRes.data || [])
      setSpecies(speciesRes.data || [])
      setBackgrounds(backgroundsRes.data || [])
      setSpells(spellsRes.data || [])
      setEquipment(equipmentRes.data || [])
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

    const selectedClass = classes.find(c => c.id === character.class_id)
    const selectedSpecies = species.find(s => s.id === character.species_id)

    // Calculate derived stats
    const conMod = Math.floor((character.constitution - 10) / 2)
    const dexMod = Math.floor((character.dexterity - 10) / 2)
    const hitPointMax = selectedClass ? selectedClass.hit_die + conMod : 8 + conMod
    const speed = selectedSpecies?.speed || 30

    const characterData = {
      ...character,
      local_id: `local_${Date.now()}`,
      hit_point_max: hitPointMax,
      hit_points: hitPointMax,
      armor_class: 10 + dexMod,
      speed,
      proficiency_bonus: 2,
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

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!character.class_id
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
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isComplete = currentStep > step.id
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        isComplete
                          ? "bg-success text-success-foreground"
                          : isActive
                          ? "bg-primary text-primary-foreground scale-110"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isComplete ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                    </div>
                    <span className={`text-xs mt-1 font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-8 md:w-16 h-1 mx-2 rounded ${
                      isComplete ? "bg-success" : "bg-muted"
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
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
                <p className="text-muted-foreground mb-6">Your class determines your combat abilities and special features.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classes.map((cls) => (
                    <motion.button
                      key={cls.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCharacter({ ...character, class_id: cls.id })}
                      className={`p-5 rounded-2xl border-2 text-left transition-all ${
                        character.class_id === cls.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-lg text-foreground">{cls.name}</h3>
                        <span className="px-2 py-1 bg-destructive/10 text-destructive text-xs font-bold rounded">
                          d{cls.hit_die}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{cls.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {cls.primary_ability?.map((ability) => (
                          <span key={ability} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                            {ability}
                          </span>
                        ))}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Origin (Species + Background) */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-black text-foreground mb-2">Choose Your Species</h2>
                  <p className="text-muted-foreground mb-4">Your species grants unique traits and abilities.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {species.map((sp) => (
                      <motion.button
                        key={sp.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCharacter({ ...character, species_id: sp.id })}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          character.species_id === sp.id
                            ? "border-secondary bg-secondary/10"
                            : "border-border bg-card hover:border-secondary/50"
                        }`}
                      >
                        <h3 className="font-bold text-foreground">{sp.name}</h3>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-0.5 bg-muted rounded">{sp.size || "Medium"}</span>
                          <span className="text-xs px-2 py-0.5 bg-muted rounded">{sp.speed || 30} ft</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-black text-foreground mb-2">Choose Your Background</h2>
                  <p className="text-muted-foreground mb-4">Your background provides ability bonuses and a 1st-level feat.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {backgrounds.map((bg) => (
                      <motion.button
                        key={bg.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCharacter({ ...character, background_id: bg.id })}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          character.background_id === bg.id
                            ? "border-accent bg-accent/10"
                            : "border-border bg-card hover:border-accent/50"
                        }`}
                      >
                        <h3 className="font-bold text-foreground mb-1">{bg.name}</h3>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {bg.skill_proficiencies?.map((skill) => (
                            <span key={skill} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                              {skill}
                            </span>
                          ))}
                        </div>
                        {bg.feat_granted && (
                          <span className="text-xs px-2 py-0.5 bg-warning/10 text-warning rounded-full">
                            Feat: {bg.feat_granted}
                          </span>
                        )}
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
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-black text-foreground mb-2">Select Equipment</h2>
                  <p className="text-muted-foreground mb-4">Choose your starting gear.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {equipment.slice(0, 20).map((item) => (
                      <label
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
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
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          character.equipment_ids.includes(item.id) ? "bg-primary border-primary" : "border-muted-foreground"
                        }`}>
                          {character.equipment_ids.includes(item.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {selectedClass?.spellcasting && (
                  <div>
                    <h2 className="text-2xl font-black text-foreground mb-2">Select Spells</h2>
                    <p className="text-muted-foreground mb-4">Choose your starting spells.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                      {spells
                        .filter(s => s.classes?.includes(selectedClass.name) && s.level <= 1)
                        .slice(0, 20)
                        .map((spell) => (
                          <label
                            key={spell.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
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
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              character.spell_ids.includes(spell.id) ? "bg-secondary border-secondary" : "border-muted-foreground"
                            }`}>
                              {character.spell_ids.includes(spell.id) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{spell.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`} - {spell.school}
                              </p>
                            </div>
                          </label>
                        ))}
                    </div>
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

        {/* Character Sheet Preview (like OrcPub) */}
        <div className="mt-8 bg-card rounded-2xl border-2 border-border p-6">
          <h3 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
            {character.name || "New Character"} {selectedClass?.name ? `(${selectedClass.name})` : ""}
          </h3>
          
          {/* Ability Scores Row */}
          <div className="grid grid-cols-6 gap-2 mb-4">
            {ABILITY_NAMES.map((ability) => {
              const score = character[ability]
              const mod = Math.floor((score - 10) / 2)
              return (
                <div key={ability} className="text-center bg-muted rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">{ability.slice(0, 3)}</p>
                  <p className="text-xl font-black text-foreground">{score}</p>
                  <p className="text-xs text-primary font-bold">{mod >= 0 ? `+${mod}` : mod}</p>
                </div>
              )
            })}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex flex-col items-center p-2 bg-muted/50 rounded-lg">
              <span className="text-[10px] text-muted-foreground uppercase">Species</span>
              <span className="font-bold text-foreground">{selectedSpecies?.name || "—"}</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-muted/50 rounded-lg">
              <span className="text-[10px] text-muted-foreground uppercase">Background</span>
              <span className="font-bold text-foreground">{selectedBackground?.name || "—"}</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-muted/50 rounded-lg">
              <span className="text-[10px] text-muted-foreground uppercase">Level</span>
              <span className="font-bold text-foreground">{character.level}</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-muted/50 rounded-lg">
              <span className="text-[10px] text-muted-foreground uppercase">Hit Die</span>
              <span className="font-bold text-destructive">{selectedClass ? `d${selectedClass.hit_die}` : "—"}</span>
            </div>
          </div>

          {/* Derived Stats */}
          <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
            <div className="flex flex-col items-center p-2 bg-primary/10 rounded-lg border border-primary/20">
              <span className="text-[10px] text-primary uppercase font-bold">Max HP</span>
              <span className="text-xl font-black text-primary">
                {selectedClass ? selectedClass.hit_die + Math.floor((character.constitution - 10) / 2) : "—"}
              </span>
            </div>
            <div className="flex flex-col items-center p-2 bg-secondary/10 rounded-lg border border-secondary/20">
              <span className="text-[10px] text-secondary uppercase font-bold">AC</span>
              <span className="text-xl font-black text-secondary">
                {10 + Math.floor((character.dexterity - 10) / 2)}
              </span>
            </div>
            <div className="flex flex-col items-center p-2 bg-accent/10 rounded-lg border border-accent/20">
              <span className="text-[10px] text-accent uppercase font-bold">Speed</span>
              <span className="text-xl font-black text-accent">
                {selectedSpecies?.speed || 30} ft
              </span>
            </div>
          </div>

          {/* Equipment & Spells summary */}
          {(character.equipment_ids.length > 0 || character.spell_ids.length > 0) && (
            <div className="mt-4 pt-3 border-t border-border">
              <div className="flex gap-4 text-xs">
                {character.equipment_ids.length > 0 && (
                  <span className="text-muted-foreground">
                    <span className="text-lime font-bold">{character.equipment_ids.length}</span> equipment
                  </span>
                )}
                {character.spell_ids.length > 0 && (
                  <span className="text-muted-foreground">
                    <span className="text-magenta font-bold">{character.spell_ids.length}</span> spells
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
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
      </main>
    </div>
  )
}
