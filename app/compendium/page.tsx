"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
import { Search, BookOpen, Users, Wand2, Shield, Sparkles, Package, Plus, Edit } from "lucide-react"
import type { Species, DndClass, Background, Spell, Feat, Equipment } from "@/lib/types"

type ContentType = "species" | "classes" | "backgrounds" | "spells" | "feats" | "equipment"

const tabs: { id: ContentType; label: string; icon: React.ReactNode }[] = [
  { id: "classes", label: "Classes", icon: <Shield className="w-4 h-4" /> },
  { id: "species", label: "Species", icon: <Users className="w-4 h-4" /> },
  { id: "backgrounds", label: "Backgrounds", icon: <BookOpen className="w-4 h-4" /> },
  { id: "spells", label: "Spells", icon: <Wand2 className="w-4 h-4" /> },
  { id: "feats", label: "Feats", icon: <Sparkles className="w-4 h-4" /> },
  { id: "equipment", label: "Equipment", icon: <Package className="w-4 h-4" /> },
]

export default function CompendiumPage() {
  const [activeTab, setActiveTab] = useState<ContentType>("classes")
  const [searchQuery, setSearchQuery] = useState("")
  const [content, setContent] = useState<Record<ContentType, unknown[]>>({
    species: [],
    classes: [],
    backgrounds: [],
    spells: [],
    feats: [],
    equipment: [],
  })
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<unknown | null>(null)

  useEffect(() => {
    const fetchContent = async () => {
      const supabase = createClient()
      setLoading(true)

      const [speciesRes, classesRes, backgroundsRes, spellsRes, featsRes, equipmentRes] = await Promise.all([
        supabase.from("species").select("*").order("name"),
        supabase.from("classes").select("*").order("name"),
        supabase.from("backgrounds").select("*").order("name"),
        supabase.from("spells").select("*").order("level").order("name"),
        supabase.from("feats").select("*").order("name"),
        supabase.from("equipment").select("*").order("category").order("name"),
      ])

      setContent({
        species: speciesRes.data || [],
        classes: classesRes.data || [],
        backgrounds: backgroundsRes.data || [],
        spells: spellsRes.data || [],
        feats: featsRes.data || [],
        equipment: equipmentRes.data || [],
      })
      setLoading(false)
    }

    fetchContent()
  }, [])

  const filteredContent = (content[activeTab] as { name: string }[]).filter((item) =>
    item.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderContentCard = (item: unknown) => {
    const data = item as Record<string, unknown>
    const editPath = `/compendium/${activeTab}/${data.id}`
    
    return (
      <motion.div
        key={data.id as string}
        layoutId={data.id as string}
        className="bg-card rounded-2xl p-5 border-2 border-border hover:border-primary transition-colors"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex items-start justify-between mb-2">
          <h3 
            className="font-bold text-lg text-foreground cursor-pointer hover:text-primary"
            onClick={() => setSelectedItem(item)}
          >
            {data.name as string}
          </h3>
          <Link
            href={editPath}
            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </Link>
        </div>
        {activeTab === "classes" && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
              d{(data as DndClass).hit_die} Hit Die
            </span>
            {(data as DndClass).primary_ability?.map((ability) => (
              <span key={ability} className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-full">
                {ability}
              </span>
            ))}
          </div>
        )}
        {activeTab === "species" && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full">
              {(data as Species).size || "Medium"}
            </span>
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
              {(data as Species).speed || 30} ft
            </span>
          </div>
        )}
        {activeTab === "backgrounds" && (
          <div className="flex gap-2 flex-wrap">
            {(data as Background).skill_proficiencies?.slice(0, 2).map((skill) => (
              <span key={skill} className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-full">
                {skill}
              </span>
            ))}
            {(data as Background).feat_granted && (
              <span className="text-xs px-2 py-1 bg-warning/10 text-warning rounded-full">
                {(data as Background).feat_granted}
              </span>
            )}
          </div>
        )}
        {activeTab === "spells" && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
              {(data as Spell).level === 0 ? "Cantrip" : `Level ${(data as Spell).level}`}
            </span>
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
              {(data as Spell).school}
            </span>
            {(data as Spell).concentration && (
              <span className="text-xs px-2 py-1 bg-warning/10 text-warning rounded-full">
                Concentration
              </span>
            )}
          </div>
        )}
        {activeTab === "feats" && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {(data as Feat).description}
          </p>
        )}
        {activeTab === "equipment" && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
              {(data as Equipment).category}
            </span>
            {(data as Equipment).cost && (
              <span className="text-xs px-2 py-1 bg-warning/10 text-warning rounded-full">
                {((data as Equipment).cost as { amount: number; unit: string })?.amount}{" "}
                {((data as Equipment).cost as { amount: number; unit: string })?.unit}
              </span>
            )}
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-foreground mb-2">Compendium</h1>
            <p className="text-muted-foreground text-lg">Browse and edit all available D&D content</p>
          </div>
          <Link
            href={`/compendium/${activeTab === "classes" ? "classes" : activeTab === "species" ? "species" : activeTab === "backgrounds" ? "backgrounds" : activeTab}/new`}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New {activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(0, -1).slice(1)}
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-card border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === tab.id ? "bg-primary-foreground/20" : "bg-muted"
              }`}>
                {content[tab.id].length}
              </span>
            </button>
          ))}
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card rounded-2xl p-5 border-2 border-border animate-pulse">
                <div className="h-6 bg-muted rounded w-3/4 mb-3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No content found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Try a different search term" : "Import content from the Import page"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredContent.map(renderContentCard)}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              layoutId={(selectedItem as { id: string }).id}
              className="bg-card rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-black text-foreground mb-4">
                {(selectedItem as { name: string }).name}
              </h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {(selectedItem as { description?: string }).description || "No description available."}
              </p>
              <button
                onClick={() => setSelectedItem(null)}
                className="mt-6 w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
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
