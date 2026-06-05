"use client"

import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/db/client"
import { Search, BookOpen, Users, Wand2, Shield, Sparkles, Package, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Settings, Download } from "lucide-react"
import type { Species, DndClass, Background, Spell, Feat, Equipment, Subclass } from "@/lib/types"
import { GameIcon } from "@/components/game-icon-picker"
import { formatCompendiumSource } from "@/lib/srd/source"
import { groupEquipmentByCategory } from "@/lib/compendium/equipment-categories"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { buildBulkExportJson, rowToExportItem } from "@/lib/import/dump-stat-export-format"
import {
  type CompendiumContentType,
  getCompendiumItemIcon,
  isCompendiumContentType,
} from "@/lib/compendium/content-types"
import { compendiumEditHref } from "@/lib/compendium/edit-href"
import { canClearCompendiumViaApi } from "@/lib/config/deploy-mode"
import { clearIndexedDbStore } from "@/lib/data/indexed-db-store"

type ContentType = CompendiumContentType

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

const newItemButtonLabels: Record<ContentType, string> = {
  classes: "New Class",
  subclasses: "New Subclass",
  species: "New Species",
  backgrounds: "New Background",
  spells: "New Spell",
  feats: "New Feat",
  equipment: "New Item",
  abilities: "New Custom Ability",
}

function CompendiumPageContent() {
  const searchParams = useSearchParams()
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
  const [clearError, setClearError] = useState<string | null>(null)
  // Spell-specific filters
  const [spellFilterClass, setSpellFilterClass] = useState<string>("all")
  const [spellFilterLevel, setSpellFilterLevel] = useState<string>("all")
  const [spellFilterSchool, setSpellFilterSchool] = useState<string>("all")
  const [featFilterCategory, setFeatFilterCategory] = useState<string>("all")
  const [equipmentFilterCategory, setEquipmentFilterCategory] = useState<string>("all")
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

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && isCompendiumContentType(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const tabsScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollTabsLeft, setCanScrollTabsLeft] = useState(false)
  const [canScrollTabsRight, setCanScrollTabsRight] = useState(false)

  const updateTabsScrollState = useCallback(() => {
    const el = tabsScrollRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanScrollTabsLeft(el.scrollLeft > 1)
    setCanScrollTabsRight(el.scrollLeft < maxScroll - 1)
  }, [])

  useEffect(() => {
    const el = tabsScrollRef.current
    if (!el) return
    updateTabsScrollState()
    el.addEventListener("scroll", updateTabsScrollState, { passive: true })
    const observer = new ResizeObserver(updateTabsScrollState)
    observer.observe(el)
    return () => {
      el.removeEventListener("scroll", updateTabsScrollState)
      observer.disconnect()
    }
  }, [updateTabsScrollState])

  const scrollCompendiumTabs = (direction: "left" | "right") => {
    const el = tabsScrollRef.current
    if (!el) return
    el.scrollBy({
      left: direction === "left" ? -el.clientWidth : el.clientWidth,
      behavior: "smooth",
    })
  }

  // Fetch counts for all tabs (fast) and full data only for active tab
  useEffect(() => {
    const fetchCounts = async () => {
      const db = createClient()
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
        db.from("species").select("*", { count: "exact", head: true }),
        db.from("classes").select("*", { count: "exact", head: true }),
        db.from("subclasses").select("*", { count: "exact", head: true }),
        db.from("backgrounds").select("*", { count: "exact", head: true }),
        db.from("spells").select("*", { count: "exact", head: true }),
        db.from("feats").select("*", { count: "exact", head: true }),
        db.from("equipment").select("*", { count: "exact", head: true }),
        db.from("custom_abilities").select("*", { count: "exact", head: true }),
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

  // Subclasses indexed by class (for class tab cards)
  const [subclassesForClasses, setSubclassesForClasses] = useState<Subclass[]>([])

  // Fetch content only for active tab
  useEffect(() => {
    const fetchActiveTabContent = async () => {
      setLoading(true)
      const db = createClient()
      
      const tableName = activeTab === "abilities" ? "custom_abilities" : activeTab
      const { data } = await db
        .from(tableName)
        .select("*")
        .order("name")
        .limit(activeTab === "equipment" ? 500 : 100)
      
      setContent(prev => ({ ...prev, [activeTab]: data || [] }))

      if (activeTab === "classes") {
        const { data: subclasses } = await db
          .from("subclasses")
          .select("*")
          .order("name")
          .limit(200)
        setSubclassesForClasses(subclasses || [])
      }

      setLoading(false)
    }
    
    fetchActiveTabContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const subclassesByClassId = useMemo(() => {
    const map = new Map<string, Subclass[]>()
    for (const sc of subclassesForClasses) {
      const list = map.get(sc.class_id) ?? []
      list.push(sc)
      map.set(sc.class_id, list)
    }
    return map
  }, [subclassesForClasses])

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
    if (activeTab === "feats") {
      const feat = item as Feat
      const category = feat.category || "General"
      if (featFilterCategory !== "all" && category !== featFilterCategory) return false
    }
    if (activeTab === "equipment") {
      const eq = item as Equipment
      if (equipmentFilterCategory !== "all" && eq.category !== equipmentFilterCategory) return false
    }
    return true
  })

  const equipmentData = content.equipment as Equipment[]
  const equipmentCategoryOptions = useMemo(
    () =>
      Array.from(new Set(equipmentData.map((e) => e.category).filter(Boolean) as string[])).sort(),
    [equipmentData],
  )
  const equipmentGroups = useMemo(() => {
    if (activeTab !== "equipment") return []
    return groupEquipmentByCategory(filteredContent as Equipment[])
  }, [filteredContent, activeTab])

  const tableName = (tab: ContentType) => tab === "abilities" ? "custom_abilities" : tab

  const refreshTabCounts = async () => {
    const db = createClient()
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
      db.from("species").select("*", { count: "exact", head: true }),
      db.from("classes").select("*", { count: "exact", head: true }),
      db.from("subclasses").select("*", { count: "exact", head: true }),
      db.from("backgrounds").select("*", { count: "exact", head: true }),
      db.from("spells").select("*", { count: "exact", head: true }),
      db.from("feats").select("*", { count: "exact", head: true }),
      db.from("equipment").select("*", { count: "exact", head: true }),
      db.from("custom_abilities").select("*", { count: "exact", head: true }),
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

  const refreshActiveTabContent = async () => {
    setLoading(true)
    const db = createClient()
    const resolvedTable = tableName(activeTab)
    const { data } = await db
      .from(resolvedTable)
      .select("*")
      .order("name")
      .limit(100)
    setContent((prev) => ({ ...prev, [activeTab]: data || [] }))
    setLoading(false)
  }

  const handleClearSection = async () => {
    setClearingAll(true)
    setClearError(null)
    
    try {
      if (canClearCompendiumViaApi()) {
        const response = await fetch("/api/compendium/clear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: tableName(activeTab) }),
        })

        if (!response.ok) {
          const data = await response.json()
          setClearError(data.error ?? "Failed to clear section")
          return
        }

        const data = await response.json()
        setContent((prev) => {
          const next = { ...prev, [activeTab]: [] }
          if (data.alsoCleared?.includes("subclasses")) {
            next.subclasses = []
          }
          return next
        })
      } else {
        const resolved = tableName(activeTab)
        await clearIndexedDbStore(resolved as Parameters<typeof clearIndexedDbStore>[0])
        if (activeTab === "classes") {
          await clearIndexedDbStore("subclasses")
        }
        setContent((prev) => {
          const next = { ...prev, [activeTab]: [] }
          if (activeTab === "classes") {
            next.subclasses = []
          }
          return next
        })
      }
      await refreshTabCounts()
      await refreshActiveTabContent()
    } catch (err) {
      console.error("[v0] Clear section error:", err)
      setClearError("Failed to clear section")
    } finally {
      setClearingAll(false)
      setClearConfirmOpen(false)
    }
  }

  const handleExportSection = async () => {
    const db = createClient()
    const resolvedTable = tableName(activeTab)
    const { data } = await db.from(resolvedTable).select("*").order("name").limit(500)
    if (!data?.length) return

    const classNameById = new Map<string, string>()
    if (activeTab === "subclasses") {
      const { data: classesData } = await db.from("classes").select("id, name")
      for (const cls of classesData ?? []) {
        classNameById.set(cls.id as string, cls.name as string)
      }
    }

    const items = (data as Record<string, unknown>[])
      .map((row) => {
        const exportRow = { ...row }
        if (activeTab === "subclasses" && exportRow.class_id) {
          exportRow.class_name = classNameById.get(exportRow.class_id as string)
        }
        return rowToExportItem(activeTab, exportRow)
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    const exportPayload = buildBulkExportJson(activeTab, items)
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `dump-stat-${activeTab}-export.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderContentCard = (item: unknown) => {
    const data = item as Record<string, unknown>
    const editPath = compendiumEditHref(activeTab, data.id as string)
    const iconName = getCompendiumItemIcon(activeTab, data)

    return (
      <motion.div
        key={data.id as string}
        layoutId={data.id as string}
        className="bg-card rounded-2xl p-5 border-2 border-border hover:border-primary transition-colors"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex items-start justify-between mb-2 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 text-primary">
              <GameIcon name={iconName} className="w-10 h-10" />
            </div>
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
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Source: {formatCompendiumSource((data as DndClass).source)}</p>
            {(() => {
              const subs = subclassesByClassId.get(data.id as string) ?? []
              if (subs.length === 0) return null
              return (
                <p>
                  Subclasses: {subs.map((sc) => sc.name).join(", ")}
                </p>
              )
            })()}
          </div>
        )}
        {activeTab === "subclasses" && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {(data as Subclass).features?.length
                ? (data as Subclass).features!.map((f) => f.name).join(", ")
                : "No features listed"}
            </p>
          </div>
        )}
        {activeTab === "species" && (
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Source: {formatCompendiumSource((data as Species).source)}</p>
            {((data as Species).traits ?? [])
              .filter((t) => t.isChoice && t.choices?.options?.length)
              .map((t) => (
                <p key={t.name}>
                  {t.choices!.options.map((o) => o.name).join(", ")}
                </p>
              ))}
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
            {((data as Spell).classes ?? []).map((cls) => (
              <span
                key={cls}
                className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-full"
              >
                {cls}
              </span>
            ))}
          </div>
        )}
        {activeTab === "feats" && (
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
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
              {(data as Feat).source || "Custom"}
            </span>
          </div>
        )}
        {activeTab === "equipment" && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
              {(data as Equipment).category}
            </span>
            {(data as Equipment).subcategory && (
              <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full">
                {(data as Equipment).subcategory!.replace(/\s+Weapons$/i, "")}
              </span>
            )}
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
            {(data as { attached_to_type?: string; attached_to_id?: string }).attached_to_type && (
              <span className="text-xs px-2 py-1 bg-lime/10 text-lime rounded-full">
                {(data as { attached_to_type: string; attached_to_id?: string }).attached_to_type === "equipment" &&
                (data as { attached_to_id?: string }).attached_to_id
                  ? `Equipment: ${(data as { attached_to_id: string }).attached_to_id}`
                  : `For: ${(data as { attached_to_type: string }).attached_to_type}`}
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
        <div id="compendium-header" className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div className="min-w-0">
            <h1 className="text-4xl font-black text-foreground mb-2">Compendium</h1>
            <p className="text-muted-foreground text-lg">Browse and edit all available D&D content</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-center w-12 h-12 bg-card border-2 border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Compendium section options"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={handleExportSection}
                  className="gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Export all {tabs.find((t) => t.id === activeTab)?.label}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setClearConfirmOpen(true)}
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear {tabs.find((t) => t.id === activeTab)?.label}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              href={compendiumEditHref(activeTab, "new")}
              className="inline-flex w-max shrink-0 items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              <Plus className="w-5 h-5 shrink-0" />
              {newItemButtonLabels[activeTab]}
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
                  <h2 className="text-xl font-black text-foreground">
                    Clear {tabs.find(t => t.id === activeTab)?.label}?
                  </h2>
                  <p className="text-sm text-muted-foreground">This cannot be undone.</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-6">
                This will permanently delete <strong className="text-foreground">all {tabs.find(t => t.id === activeTab)?.label.toLowerCase()}</strong> from your compendium database.
                {activeTab === "classes" && " All subclasses will be cleared as well."}
                {" "}Other sections will not be affected.
              </p>
              {clearError && (
                <p className="text-sm text-destructive mb-4">{clearError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setClearConfirmOpen(false)}
                  disabled={clearingAll}
                  className="flex-1 px-4 py-3 bg-card border-2 border-border text-foreground rounded-xl font-semibold hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearSection}
                  disabled={clearingAll}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-destructive text-destructive-foreground rounded-xl font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  {clearingAll ? "Clearing..." : `Clear ${tabs.find(t => t.id === activeTab)?.label}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs — content type selection */}
        <div className="relative mb-4 group/tabs">
          {canScrollTabsLeft && (
            <>
              <div
                className="pointer-events-none absolute left-0 top-0 bottom-4 z-[1] w-12 bg-gradient-to-r from-background to-transparent"
                aria-hidden
              />
              <button
                type="button"
                aria-label="Scroll tabs left"
                onClick={() => scrollCompendiumTabs("left")}
                className="absolute left-0 top-1/2 z-10 -translate-y-[calc(50%+0.5rem)] flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-muted"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </>
          )}
          {canScrollTabsRight && (
            <>
              <div
                className="pointer-events-none absolute right-0 top-0 bottom-4 z-[1] w-12 bg-gradient-to-l from-background to-transparent"
                aria-hidden
              />
              <button
                type="button"
                aria-label="Scroll tabs right"
                onClick={() => scrollCompendiumTabs("right")}
                className="absolute right-0 top-1/2 z-10 -translate-y-[calc(50%+0.5rem)] flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-muted"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          <div
            id="compendium-tabs"
            ref={tabsScrollRef}
            className={`flex gap-2 overflow-x-auto pb-4 scrollbar-hide scroll-smooth ${
              canScrollTabsLeft ? "pl-10" : ""
            } ${canScrollTabsRight ? "pr-10" : ""}`}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-colors ${
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
        </div>

        {/* Search (+ tab filters inline on sm+) */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div id="compendium-search" className="relative flex-1 min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-card border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {activeTab === "feats" && (
            <div id="feat-filters" className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  Type
                </label>
                <select
                  value={featFilterCategory}
                  onChange={(e) => setFeatFilterCategory(e.target.value)}
                  className="bg-card border-2 border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="all">All Types</option>
                  <option value="Origin">Origin</option>
                  <option value="General">General</option>
                  <option value="Epic Boon">Epic Boon</option>
                  <option value="Fighting Style">Fighting Style</option>
                </select>
              </div>
              {featFilterCategory !== "all" && (
                <button
                  onClick={() => setFeatFilterCategory("all")}
                  className="px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors"
                >
                  Clear filter
                </button>
              )}
            </div>
          )}
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

        {activeTab === "equipment" && equipmentCategoryOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Type
            </label>
            <select
              value={equipmentFilterCategory}
              onChange={(e) => setEquipmentFilterCategory(e.target.value)}
              className="bg-card border-2 border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              <option value="all">All types</option>
              {equipmentCategoryOptions.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {equipmentFilterCategory !== "all" && (
              <button
                type="button"
                onClick={() => setEquipmentFilterCategory("all")}
                className="px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Clear type filter
              </button>
            )}
          </div>
        )}

        {/* Content Grid */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
        ) : activeTab === "equipment" ? (
          <div className="space-y-8">
            {equipmentGroups.map((group) => (
              <section key={group.category}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-black text-foreground">{group.category}</h2>
                  <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                    {group.items.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {group.items.map(renderContentCard)}
                  </AnimatePresence>
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
              {(selectedItem as { creator_url?: string | null }).creator_url && (
                <p className="mt-4 text-sm">
                  <span className="text-muted-foreground">Source link: </span>
                  <a
                    href={(selectedItem as { creator_url: string }).creator_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    {(selectedItem as { creator_url: string }).creator_url}
                  </a>
                </p>
              )}
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

export default function CompendiumPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Loading compendium…</p>
        </div>
      }
    >
      <CompendiumPageContent />
    </Suspense>
  )
}
