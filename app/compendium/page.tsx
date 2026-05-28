"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
import { Search, BookOpen, Users, Wand2, Shield, Sparkles, Package, Plus, Edit, Trash2 } from "lucide-react"
import type { Species, DndClass, Background, Spell, Feat, Equipment, Subclass } from "@/lib/types"
import { GameIcon } from "@/components/game-icon-picker"

type ContentType = "species" | "classes" | "subclasses" | "backgrounds" | "spells" | "feats" | "equipment" | "abilities"

const tabs: { id: ContentType; label: string; icon: React.ReactNode }[] = [
  { id: "classes", label: "Classes", icon: <Shield className="w-4 h-4" /> },
  { id: "subclasses", label: "Subclasses", icon: <Shield className="w-4 h-4" /> },
  { id: "species", label: "Species", icon: <Users className="w-4 h-4" /> },
  { id: "backgrounds", label: "Backgrounds", icon: <BookOpen className="w-4 h-4" /> },
  { id: "spells", label: "Spells", icon: <Wand2 className="w-4 h-4" /> },
  { id: "feats", label: "Feats", icon: <Sparkles className="w-4 h-4" /> },
  { id: "equipment", label: "Equipment", icon: <Package className="w-4 h-4" /> },
  { id: "abilities", label: "Custom Abilities", icon: <Sparkles className="w-4 h-4" /> },
]

export default function CompendiumPage() {
  const [activeTab, setActiveTab] = useState<ContentType>("classes")
  const [searchQuery, setSearchQuery] = useState("")
  const [content, setContent] = useState<Record<ContentType, unknown[]>>({
    species: [],
    classes: [],
    subclasses: [],
    backgrounds: [],
    spells: [],
    feats: [],
    equipment: [],
    abilities: [],
  })
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<unknown | null>(null)
  const [clearingAll, setClearingAll] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  // Spell-specific filters
  const [spellFilterClass, setSpellFilterClass] = useState<string>("all")
  const [spellFilterLevel, setSpellFilterLevel] = useState<string>("all")
  const [spellFilterSchool, setSpellFilterSchool] = useState<string>("all")
  const [tabCounts, setTabCounts] = useState<Record<ContentType, number>>({
    species: 0,
    classes: 0,
    subclasses: 0,
    backgrounds: 0,
    spells: 0,
    feats: 0,
    equipment: 0,
    abilities: 0,
  })

  // Fetch counts for all tabs (fast) and full data only for active tab
  useEffect(() => {
    const fetchCounts = async () => {
      const supabase = createClient()
      const [
        { count: speciesCount },
        { count: classesCount },
        { count: subclassesCount },
        { count: backgroundsCount },
        { count: spellsCount },
        { count: featsCount },
        { count: equipmentCount },
        { count: abilitiesCount },
      ] = await Promise.all([
        supabase.from("species").select("*", { count: "exact", head: true }),
        supabase.from("classes").select("*", { count: "exact", head: true }),
        supabase.from("subclasses").select("*", { count: "exact", head: true }),
        supabase.from("backgrounds").select("*", { count: "exact", head: true }),
        supabase.from("spells").select("*", { count: "exact", head: true }),
        supabase.from("feats").select("*", { count: "exact", head: true }),
        supabase.from("equipment").select("*", { count: "exact", head: true }),
        supabase.from("custom_abilities").select("*", { count: "exact", head: true }),
      ])
      setTabCounts({
        species: speciesCount ?? 0,
        classes: classesCount ?? 0,
        subclasses: subclassesCount ?? 0,
        backgrounds: backgroundsCount ?? 0,
        spells: spellsCount ?? 0,
        feats: featsCount ?? 0,
        equipment: equipmentCount ?? 0,
        abilities: abilitiesCount ?? 0,
      })
    }
    fetchCounts()
  }, [])

  // Fetch content only for active tab
  useEffect(() => {
    const fetchActiveTabContent = async () => {
      setLoading(true)
      const supabase = createClient()
      
      const tableName = activeTab === "abilities" ? "custom_abilities" : activeTab
      const { data } = await supabase
        .from(tableName)
        .select("*")
        .order("name")
        .limit(100)
      
      setContent(prev => ({ ...prev, [activeTab]: data || [] }))
      setLoading(false)
    }
    
    fetchActiveTabContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Derive unique spell filter options from loaded spell data
  const spellData = (content.spells as Spell[])
  const spellClassOptions = Array.from(
    new Set(spellData.flatMap((s) => s.classes ?? []))
  ).sort()
  const spellSchoolOptions = Array.from(
    new Set(spellData.map((s) => s.school).filter(Boolean))
  ).sort()
  const spellLevelOptions = Array.from(
    new Set(spellData.map((s) => s.level))
  ).sort((a, b) => a - b)

  const filteredContent = (content[activeTab] as { name: string }[]).filter((item) => {
    if (!item.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (activeTab === "spells") {
      const spell = item as Spell
      if (spellFilterClass !== "all" && !(spell.classes ?? []).includes(spellFilterClass)) return false
      if (spellFilterLevel !== "all" && spell.level !== Number(spellFilterLevel)) return false
      if (spellFilterSchool !== "all" && spell.school !== spellFilterSchool) return false
    }
    return true
  })

  const handleClearAll = async () => {
    setClearingAll(true)
    const supabase = createClient()
    const tables = ["classes", "subclasses", "species", "backgrounds", "spells", "feats", "equipment", "custom_abilities"]
    for (const table of tables) {
      await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000")
    }
    setContent({ species: [], classes: [], subclasses: [], backgrounds: [], spells: [], feats: [], equipment: [], abilities: [] })
    setTabCounts({ species: 0, classes: 0, subclasses: 0, backgrounds: 0, spells: 0, feats: 0, equipment: 0, abilities: 0 })
    setClearingAll(false)
    setClearConfirmOpen(false)
  }

  const renderContentCard = (item: unknown) => {
    const data = item as Record<string, unknown>
    const editPath = `/compendium/${activeTab}/${data.id}`
    const iconName = data.icon as string | null | undefined
    
    return (
      <motion.div
        key={data.id as string}
        layoutId={data.id as string}
        className="bg-card rounded-2xl p-5 border-2 border-border hover:border-primary transition-colors"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex items-start justify-between mb-2 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {iconName && (
              <div className="w-10 h-10 shrink-0 text-primary">
                <GameIcon name={iconName} className="w-10 h-10" fallbackColor="currentColor" />
              </div>
            )}
            <h3 
              className="font-bold text-lg text-foreground cursor-pointer hover:text-primary leading-tight"
              onClick={() => setSelectedItem(item)}
            >
              {data.name as string}
            </h3>
          </div>
          <Link
            href={editPath}
            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors shrink-0"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </Link>
        </div>
        {activeTab === "classes" && (
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                d{(data as DndClass).hit_die} Hit Die
              </span>
              {(data as DndClass).spellcasting && (
                <span className="text-xs px-2 py-1 bg-magenta/10 text-magenta rounded-full">
                  Spellcaster
                </span>
              )}
              {(data as DndClass).weapon_proficiencies?.some(w => 
                w.toLowerCase().includes("martial")
              ) && (
                <span className="text-xs px-2 py-1 bg-orange/10 text-orange rounded-full">
                  Martial
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Source: {(data as DndClass).source || "Custom"}
            </p>
          </div>
        )}
        {activeTab === "subclasses" && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {(data as Subclass).description?.slice(0, 80)}...
            </p>
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
              {((data as Subclass).features || []).length} features
            </span>
          </div>
        )}
        {activeTab === "species" && (
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full">
                {(data as Species).size || "Medium"}
              </span>
              <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                {typeof (data as Species).speed === "object"
                  ? Object.entries((data as Species).speed as Record<string, number>).map(([k, v]) => `${v}ft ${k}`).join(" / ")
                  : `${(data as Species).speed || 30} ft`
                }
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Source: {(data as Species).source || "Custom"}
            </p>
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
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full ${
                (data as Feat).category === "Origin"
                  ? "bg-lime/10 text-lime"
                  : (data as Feat).category === "Epic Boon"
                  ? "bg-magenta/10 text-magenta"
                  : "bg-primary/10 text-primary"
              }`}>
                {(data as Feat).category || "General"}
              </span>
              {((data as Feat).level_requirement ?? 1) > 1 && (
                <span className="text-xs px-2 py-1 bg-orange/10 text-orange rounded-full">
                  Lvl {(data as Feat).level_requirement}+
                </span>
              )}
              {(data as Feat).prerequisite_feat_ids?.length ? (
                <span className="text-xs px-2 py-1 bg-warning/10 text-warning rounded-full">
                  Has Prereqs
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {(data as Feat).description}
            </p>
            <p className="text-xs text-muted-foreground">
              Source: {(data as Feat).source || "Custom"}
            </p>
          </div>
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
        {activeTab === "abilities" && (
          <div className="space-y-2">
            {(data as { prerequisites?: string }).prerequisites && (
              <p className="text-xs text-orange">
                Prereq: {(data as { prerequisites: string }).prerequisites}
              </p>
            )}
            <p className="text-sm text-muted-foreground line-clamp-2">
              {(data as { description?: string }).description}
            </p>
            {(data as { attached_to_type?: string }).attached_to_type && (
              <span className="text-xs px-2 py-1 bg-lime/10 text-lime rounded-full">
                For: {(data as { attached_to_type: string }).attached_to_type}
              </span>
            )}
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <div id="compendium-root" className="min-h-screen bg-background">
      <MainNav />
      
      <main id="compendium-main" className="max-w-7xl mx-auto px-4 py-8">
        <div id="compendium-header" className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black text-foreground mb-2">Compendium</h1>
            <p className="text-muted-foreground text-lg">Browse and edit all available D&D content</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setClearConfirmOpen(true)}
              className="flex items-center gap-2 px-4 py-3 bg-destructive/10 text-destructive border-2 border-destructive/30 rounded-xl font-semibold hover:bg-destructive/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
            <Link
              href={`/compendium/${activeTab}/new`}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              New {activeTab === "abilities" ? "Custom Ability" : activeTab === "species" ? "Species" : activeTab.slice(0, -2).charAt(0).toUpperCase() + activeTab.slice(0, -2).slice(1)}
            </Link>
          </div>
        </div>

        {/* Clear All Confirmation Dialog */}
        {clearConfirmOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border-2 border-destructive/40 p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground">Clear All Content?</h2>
                  <p className="text-sm text-muted-foreground">This cannot be undone.</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-6">
                This will permanently delete <strong className="text-foreground">all</strong> classes, species, backgrounds, spells, feats, equipment, subclasses, and custom abilities from your compendium. You will need to re-seed from the D&D 5.5e SRD or re-import your content afterward.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setClearConfirmOpen(false)}
                  disabled={clearingAll}
                  className="flex-1 px-4 py-3 bg-card border-2 border-border text-foreground rounded-xl font-semibold hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={clearingAll}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-destructive text-destructive-foreground rounded-xl font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  {clearingAll ? "Clearing..." : "Yes, Clear Everything"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div id="compendium-search" className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-card border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Spell Filters — only shown on spells tab */}
        {activeTab === "spells" && (
          <div id="spell-filters" className="flex flex-wrap gap-3 mb-6">
            {/* Class filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                Class
              </label>
              <select
                value={spellFilterClass}
                onChange={(e) => setSpellFilterClass(e.target.value)}
                className="bg-card border-2 border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                <option value="all">All Classes</option>
                {spellClassOptions.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            {/* Level filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                Level
              </label>
              <select
                value={spellFilterLevel}
                onChange={(e) => setSpellFilterLevel(e.target.value)}
                className="bg-card border-2 border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                <option value="all">All Levels</option>
                {spellLevelOptions.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl === 0 ? "Cantrip" : `Level ${lvl}`}
                  </option>
                ))}
              </select>
            </div>

            {/* School filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                School
              </label>
              <select
                value={spellFilterSchool}
                onChange={(e) => setSpellFilterSchool(e.target.value)}
                className="bg-card border-2 border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                <option value="all">All Schools</option>
                {spellSchoolOptions.map((school) => (
                  <option key={school} value={school}>{school}</option>
                ))}
              </select>
            </div>

            {/* Active filter count / clear */}
            {(spellFilterClass !== "all" || spellFilterLevel !== "all" || spellFilterSchool !== "all") && (
              <button
                onClick={() => {
                  setSpellFilterClass("all")
                  setSpellFilterLevel("all")
                  setSpellFilterSchool("all")
                }}
                className="ml-auto px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div id="compendium-tabs" className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
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
                {tabCounts[tab.id]}
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
