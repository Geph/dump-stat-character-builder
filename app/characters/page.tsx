"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
import { Plus, User, Trash2 } from "lucide-react"
import Link from "next/link"
import type { DndClass, Species, Background } from "@/lib/types"

interface CharacterWithRelations extends Character {
  classes?: DndClass
  species?: Species
  backgrounds?: Background
}

export default function CharactersPage() {
  const [characters, setCharacters] = useState<CharacterWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCharacters = async () => {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from("characters")
        .select(`
          *,
          classes (*),
          species (*),
          backgrounds (*)
        `)
        .order("updated_at", { ascending: false })

      if (!error && data) {
        setCharacters(data)
      }
      setLoading(false)
    }

    fetchCharacters()
  }, [])

  const deleteCharacter = async (id: string) => {
    if (!confirm("Are you sure you want to delete this character?")) return
    
    const supabase = createClient()
    const { error } = await supabase.from("characters").delete().eq("id", id)
    
    if (!error) {
      setCharacters(characters.filter(c => c.id !== id))
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-foreground mb-2">My Characters</h1>
            <p className="text-muted-foreground text-lg">
              {characters.length} {characters.length === 1 ? "character" : "characters"}
            </p>
          </div>
          <Link
            href="/builder"
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Character
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card rounded-2xl p-6 border-2 border-border animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="h-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : characters.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">No characters yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first D&D character and start your adventure!
            </p>
            <Link
              href="/builder"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Character
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {characters.map((character, index) => (
              <motion.div
                key={character.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-2xl border-2 border-border hover:border-primary/50 transition-colors group overflow-hidden"
              >
                {/* Large Portrait as main focus */}
                <Link href={`/characters/${character.id}`} className="block relative aspect-square">
                  {character.portrait_url ? (
                    <img
                      src={character.portrait_url}
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <User className="w-20 h-20 text-muted-foreground" />
                    </div>
                  )}
                  {/* Level badge overlay */}
                  <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg">
                    <span className="text-xs font-bold text-white">Lvl {character.level}</span>
                  </div>
                  {/* Delete button overlay */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      deleteCharacter(character.id)
                    }}
                    className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-sm rounded-lg text-white/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete character"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Link>
                
                {/* Character Info - Below the image */}
                <div className="p-4">
                  <Link href={`/characters/${character.id}`}>
                    <h3 className="font-bold text-lg text-foreground truncate hover:text-primary transition-colors">
                      {character.name}
                    </h3>
                  </Link>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-sm text-primary font-medium">
                      {character.classes?.name || "Adventurer"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {character.species?.name || "Unknown Species"}
                    </p>
                    {character.backgrounds?.name && (
                      <p className="text-xs text-muted-foreground">
                        {character.backgrounds.name}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
