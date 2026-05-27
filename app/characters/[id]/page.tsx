"use client"

import { useState, useEffect, use } from "react"
import { motion } from "framer-motion"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, User, Shield, Heart, Zap, Swords, BookOpen, Package, Star } from "lucide-react"
import Link from "next/link"
import type { Character, DndClass, Species, Background, Spell, Equipment } from "@/lib/types"

interface CharacterWithRelations extends Character {
  classes?: DndClass
  species?: Species
  backgrounds?: Background
}

export default function CharacterSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [character, setCharacter] = useState<CharacterWithRelations | null>(null)
  const [spells, setSpells] = useState<Spell[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"stats" | "features" | "spells" | "equipment">("stats")

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
      }
      setLoading(false)
    }

    fetchCharacter()
  }, [id])

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
        <main className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Character not found</h1>
          <Link href="/characters" className="text-primary hover:underline">
            Back to characters
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          href="/characters"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to characters
        </Link>

        {/* Character Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl p-6 mb-6"
        >
          <div className="flex items-start gap-6">
            {character.portrait_url ? (
              <img
                src={character.portrait_url}
                alt={character.name}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-background"
              />
            ) : (
              <div className="w-24 h-24 bg-card rounded-2xl flex items-center justify-center border-4 border-background">
                <User className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-3xl font-black text-foreground mb-1">{character.name}</h1>
              <p className="text-lg text-muted-foreground mb-2">
                Level {character.level} {character.classes?.name || "Adventurer"}
              </p>
              <div className="flex flex-wrap gap-2">
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
                {character.alignment && (
                  <span className="px-3 py-1 bg-card rounded-full text-sm font-medium">
                    {character.alignment}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-3">
              <div className="bg-card rounded-xl p-3 text-center min-w-[70px]">
                <Heart className="w-5 h-5 text-destructive mx-auto mb-1" />
                <p className="text-xl font-black text-foreground">{character.hit_point_max || "—"}</p>
                <p className="text-xs text-muted-foreground">HP</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center min-w-[70px]">
                <Shield className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-xl font-black text-foreground">{character.armor_class || "—"}</p>
                <p className="text-xs text-muted-foreground">AC</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center min-w-[70px]">
                <Zap className="w-5 h-5 text-warning mx-auto mb-1" />
                <p className="text-xl font-black text-foreground">{character.speed || 30}</p>
                <p className="text-xs text-muted-foreground">Speed</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: "stats", label: "Stats", icon: <Star className="w-4 h-4" /> },
            { id: "features", label: "Features", icon: <BookOpen className="w-4 h-4" /> },
            { id: "spells", label: "Spells", icon: <Swords className="w-4 h-4" /> },
            { id: "equipment", label: "Equipment", icon: <Package className="w-4 h-4" /> },
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
          {activeTab === "stats" && (
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

              {/* Proficiencies */}
              <div className="bg-card rounded-2xl p-6 border-2 border-border">
                <h2 className="text-xl font-bold text-foreground mb-4">Proficiencies</h2>
                <div className="space-y-4">
                  {character.skill_proficiencies && character.skill_proficiencies.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {character.skill_proficiencies.map((skill) => (
                          <span key={skill} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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

              {/* Character Details */}
              {(character.personality_traits || character.ideals || character.bonds || character.flaws || character.backstory) && (
                <div className="bg-card rounded-2xl p-6 border-2 border-border">
                  <h2 className="text-xl font-bold text-foreground mb-4">Personality</h2>
                  <div className="grid gap-4">
                    {character.personality_traits && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">Personality Traits</h3>
                        <p className="text-foreground">{character.personality_traits}</p>
                      </div>
                    )}
                    {character.ideals && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">Ideals</h3>
                        <p className="text-foreground">{character.ideals}</p>
                      </div>
                    )}
                    {character.bonds && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">Bonds</h3>
                        <p className="text-foreground">{character.bonds}</p>
                      </div>
                    )}
                    {character.flaws && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">Flaws</h3>
                        <p className="text-foreground">{character.flaws}</p>
                      </div>
                    )}
                    {character.backstory && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">Backstory</h3>
                        <p className="text-foreground whitespace-pre-wrap">{character.backstory}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "features" && (
            <div className="bg-card rounded-2xl p-6 border-2 border-border">
              <h2 className="text-xl font-bold text-foreground mb-4">Class Features</h2>
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
          )}

          {activeTab === "spells" && (
            <div className="bg-card rounded-2xl p-6 border-2 border-border">
              <h2 className="text-xl font-bold text-foreground mb-4">Spells</h2>
              {spells.length > 0 ? (
                <div className="space-y-3">
                  {spells.map((spell) => (
                    <div key={spell.id} className="p-4 bg-muted rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs font-medium">
                          {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`}
                        </span>
                        <span className="px-2 py-0.5 bg-secondary/20 text-secondary rounded text-xs font-medium">
                          {spell.school}
                        </span>
                        <h3 className="font-bold text-foreground">{spell.name}</h3>
                      </div>
                      <p className="text-muted-foreground text-sm">{spell.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No spells selected</p>
              )}
            </div>
          )}

          {activeTab === "equipment" && (
            <div className="bg-card rounded-2xl p-6 border-2 border-border">
              <h2 className="text-xl font-bold text-foreground mb-4">Equipment</h2>
              {equipment.length > 0 ? (
                <div className="space-y-3">
                  {equipment.map((item) => (
                    <div key={item.id} className="p-4 bg-muted rounded-xl flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-foreground">{item.name}</h3>
                        <p className="text-muted-foreground text-sm">{item.category} - {item.subcategory}</p>
                      </div>
                      {item.properties && (
                        <span className="text-sm text-muted-foreground">
                          {typeof item.properties === "object" && "damage" in item.properties 
                            ? (item.properties as { damage: string }).damage 
                            : ""}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No equipment selected</p>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
