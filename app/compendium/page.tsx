"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { MainNav } from "@/components/main-nav"
import {
  pageFloatingHintClass,
  pageHeaderSubtitleClass,
} from "@/lib/compendium/editor-field-styles"
import { SiteFooter } from "@/components/site-footer"
import { createClient } from "@/lib/db/client"
import { Search, BookOpen, Users, Wand2, Shield, Sparkles, Package, Gauge, Languages, Wrench, Plus, Edit, Copy, Trash2, Settings, Download, Upload } from "lucide-react"
import type { Species, DndClass, Background, Spell, Feat, Equipment, Subclass, ClassResourceRow, Language, Tool } from "@/lib/types"
import { ClassResourcesOverview } from "@/components/compendium/class-resources-overview"
import { formatUsesSummary, groupClassResourcesByKey } from "@/lib/compendium/class-resource-rows"
import { isCompendiumItemEnabled } from "@/lib/compendium/compendium-enabled"
import {
  COMPENDIUM_TOGGLE_LABELS,
  contentTypeToTable,
  findCompendiumDependents,
  isProtectedSystemCompendiumRow,
  setCompendiumItemsEnabled,
  type CompendiumToggleTarget,
} from "@/lib/compendium/compendium-toggle"
import { Switch } from "@/components/ui/switch"
import { GameIcon } from "@/components/game-icon-picker"
import { formatCompendiumSource } from "@/lib/srd/source"
import { groupEquipmentByCategory, groupMagicItemsByCategory } from "@/lib/compendium/equipment-categories"
import { getEquipmentDetailRows, getMagicItemCategoryOptions, splitEquipmentByKind } from "@/lib/compendium/equipment-display"
import { isMagicItem } from "@/lib/compendium/equipment-attunement"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { buildBulkExportJson, rowToExportItem } from "@/lib/import/dump-stat-export-format"
import {
  getCompendiumItemIcon,
  isCompendiumContentType,
  isEquipmentBrowserTab,
  type CompendiumContentType,
} from "@/lib/compendium/content-types"
import {
  compendiumAccentColorStyles,
  getCompendiumItemAccentColor,
} from "@/lib/compendium/theme-colors"
import { compendiumEditHref } from "@/lib/compendium/edit-href"
import {
  canDuplicateCompendiumItem,
  duplicateCompendiumItem,
} from "@/lib/compendium/duplicate-compendium-item"
import { enrichClassesList } from "@/lib/compendium/normalize-class-data"
import { enrichSpeciesList } from "@/lib/compendium/normalize-species-traits"
import { canClearCompendiumViaApi } from "@/lib/config/deploy-mode"
import { clearIndexedDbStore } from "@/lib/data/indexed-db-store"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import { CompendiumDetailOverlay } from "@/components/compendium/compendium-detail-overlay"
import { classComplexityDetailRow } from "@/components/compendium/class-complexity-display"
import { CustomClassSpellListDialog } from "@/components/compendium/custom-class-spell-list-dialog"
import { CompendiumCardHero } from "@/components/compendium/compendium-card-hero"
import {
  COMPENDIUM_LIST_CARD_MIN_HEIGHT_CLASS,
  COMPENDIUM_CLASS_LIST_CARD_MIN_HEIGHT_CLASS,
  compendiumItemSupportsCardImage,
  resolveCompendiumCardImageUrl,
  compendiumCardImageCropForType,
  type CompendiumCardVisual,
} from "@/lib/compendium/card-image"
import { ensureModifierCatalog } from "@/lib/compendium/ensure-modifier-catalog"
import {
  COMMON_MODIFIERS_CATALOG_ID,
  isCommonModifiersCatalogAbility,
  MODIFIER_CATALOG_INFO,
  normalizeModifierCatalog,
} from "@/lib/compendium/modifier-catalog"
import {
  getSystemCatalogMeta,
  SYSTEM_OPTION_CATALOG_IDS,
} from "@/lib/compendium/system-option-catalogs"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type ContentType = CompendiumContentType

const SYSTEM_CATALOG_SORT_ORDER = [
  COMMON_MODIFIERS_CATALOG_ID,
  ...SYSTEM_OPTION_CATALOG_IDS,
] as const

function systemCatalogSortIndex(id: string): number {
  const index = SYSTEM_CATALOG_SORT_ORDER.indexOf(id as (typeof SYSTEM_CATALOG_SORT_ORDER)[number])
  return index === -1 ? 999 : index
}

function enrichCompendiumTabRows(tab: ContentType, rows: unknown[]) {
  if (tab === "classes") return enrichClassesList(rows as DndClass[])
  if (tab === "species") return enrichSpeciesList(rows as { name: string; source?: string | null }[])
  return rows
}

const tabs: { id: ContentType; label: string; icon: React.ReactNode }[] = [
  { id: "classes", label: "Classes", icon: <Shield className="w-3.5 h-3.5" /> },
  { id: "subclasses", label: "Subclasses", icon: <Shield className="w-3.5 h-3.5" /> },
  { id: "species", label: "Species", icon: <Users className="w-3.5 h-3.5" /> },
  { id: "backgrounds", label: "Backgrounds", icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: "spells", label: "Spells", icon: <Wand2 className="w-3.5 h-3.5" /> },
  { id: "feats", label: "Feats", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: "equipment", label: "Equipment", icon: <Package className="w-3.5 h-3.5" /> },
  { id: "magic_items", label: "Magic Items", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: "languages", label: "Languages", icon: <Languages className="w-3.5 h-3.5" /> },
  { id: "tools", label: "Tools", icon: <Wrench className="w-3.5 h-3.5" /> },
  { id: "class_resources", label: "Class Resources", icon: <Gauge className="w-3.5 h-3.5" /> },
  { id: "abilities", label: "Custom Abilities", icon: <Sparkles className="w-3.5 h-3.5" /> },
]

const newItemButtonLabels: Record<ContentType, string> = {
  classes: "New Class",
  subclasses: "New Subclass",
  species: "New Species",
  backgrounds: "New Background",
  spells: "New Spell",
  feats: "New Feat",
  equipment: "New Item",
  magic_items: "New Magic Item",
  languages: "New Language",
  tools: "New Tool",
  class_resources: "New Class Resource",
  abilities: "New Custom Ability",
}

function CompendiumPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ContentType>("classes")
  const [spellListDialogOpen, setSpellListDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [content, setContent] = useState<Record<ContentType, unknown[]>>({
    species: [],
    classes: [],
    subclasses: [],
    backgrounds: [],
    spells: [],
    feats: [],
    equipment: [],
    magic_items: [],
    languages: [],
    tools: [],
    class_resources: [],
    abilities: [],
  })
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<unknown | null>(null)
  const [clearingAll, setClearingAll] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [clearError, setClearError] = useState<string | null>(null)
  const [toggleConfirm, setToggleConfirm] = useState<{
    item: CompendiumToggleTarget
    dependents: CompendiumToggleTarget[]
  } | null>(null)
  const [toggleSaving, setToggleSaving] = useState(false)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [copyingId, setCopyingId] = useState<string | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)
  // Spell-specific filters
  const [spellFilterClass, setSpellFilterClass] = useState<string>("all")
  const [spellFilterLevel, setSpellFilterLevel] = useState<string>("all")
  const [spellFilterSchool, setSpellFilterSchool] = useState<string>("all")
  const [featFilterCategory, setFeatFilterCategory] = useState<string>("all")
  const [equipmentFilterCategory, setEquipmentFilterCategory] = useState<string>("all")
  const [magicItemFilterCategory, setMagicItemFilterCategory] = useState<string>("all")
  const [languageFilterPool, setLanguageFilterPool] = useState<"all" | "standard" | "rare">("all")
  const [toolFilterGroup, setToolFilterGroup] = useState<string>("all")
  const [classResourceFilterClassId, setClassResourceFilterClassId] = useState<string>("all")
  const [classNamesById, setClassNamesById] = useState<Record<string, string>>({})
  const [tabCounts, setTabCounts] = useState<Record<ContentType, number>>({
    species: 0,
    classes: 0,
    subclasses: 0,
    backgrounds: 0,
    spells: 0,
    feats: 0,
    equipment: 0,
    magic_items: 0,
    languages: 0,
    tools: 0,
    class_resources: 0,
    abilities: 0,
  })

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && isCompendiumContentType(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

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
        { data: equipmentRows },
        { count: languagesCount },
        { count: toolsCount },
        { count: classResourcesCount },
        { count: abilitiesCount },
      ] = await Promise.all([
        db.from("species").select("*", { count: "exact", head: true }),
        db.from("classes").select("*", { count: "exact", head: true }),
        db.from("subclasses").select("*", { count: "exact", head: true }),
        db.from("backgrounds").select("*", { count: "exact", head: true }),
        db.from("spells").select("*", { count: "exact", head: true }),
        db.from("feats").select("*", { count: "exact", head: true }),
        db
          .from("equipment")
          .select(
            "magic_item_category, rarity, requires_attunement, category, subcategory, description, properties",
          ),
        db.from("languages").select("*", { count: "exact", head: true }),
        db.from("tools").select("*", { count: "exact", head: true }),
        db.from("class_resources").select("*", { count: "exact", head: true }),
        db.from("custom_abilities").select("*", { count: "exact", head: true }),
      ])
      const equipmentSplit = splitEquipmentByKind((equipmentRows ?? []) as Equipment[])
      setTabCounts({
        species: speciesCount ?? 0,
        classes: classesCount ?? 0,
        subclasses: subclassesCount ?? 0,
        backgrounds: backgroundsCount ?? 0,
        spells: spellsCount ?? 0,
        feats: featsCount ?? 0,
        equipment: equipmentSplit.mundane.length,
        magic_items: equipmentSplit.magic.length,
        languages: languagesCount ?? 0,
        tools: toolsCount ?? 0,
        class_resources: classResourcesCount ?? 0,
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
      
      const tableName = activeTab === "abilities" ? "custom_abilities" : isEquipmentBrowserTab(activeTab) ? "equipment" : activeTab
      if (activeTab === "abilities") {
        await ensureModifierCatalog(db)
      }
      const { data } = await db
        .from(tableName)
        .select("*")
        .order("name")
        .limit(
          isEquipmentBrowserTab(activeTab)
            ? 500
            : activeTab === "spells" || activeTab === "feats"
              ? 5000
              : 100,
        )
      
      let rows = data || []
      if (activeTab === "abilities") {
        rows = [...rows].sort((a, b) => {
          const aRank = systemCatalogSortIndex(a.id)
          const bRank = systemCatalogSortIndex(b.id)
          if (aRank !== bRank) return aRank - bRank
          return String(a.name).localeCompare(String(b.name))
        })
      }
      if (isEquipmentBrowserTab(activeTab)) {
        const split = splitEquipmentByKind(rows as Equipment[])
        setContent((prev) => ({
          ...prev,
          equipment: split.mundane,
          magic_items: split.magic,
        }))
      } else {
        setContent((prev) => ({
          ...prev,
          [activeTab]: enrichCompendiumTabRows(activeTab, rows),
        }))
      }

      if (activeTab === "classes") {
        const { data: subclasses } = await db
          .from("subclasses")
          .select("*")
          .order("name")
          .limit(200)
        setSubclassesForClasses(subclasses || [])
      }

      if (activeTab === "class_resources") {
        const { data: classes } = await db.from("classes").select("id, name").order("name")
        setClassNamesById(Object.fromEntries((classes || []).map((cls) => [cls.id as string, cls.name as string])))
      }

      setLoading(false)
    }
    
    fetchActiveTabContent()
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
const UNASSIGNED_SPELL_CLASS = "__unassigned__"

  const spellClassOptions = Array.from(
    new Set(spellData.flatMap((s) => s.classes ?? [])),
  ).sort()
  const hasUnassignedSpells = spellData.some((s) => !(s.classes ?? []).length)
  const spellSchoolOptions = Array.from(
    new Set(spellData.map((s) => s.school).filter(Boolean))
  ).sort()
  const spellLevelOptions = Array.from(
    new Set(spellData.map((s) => s.level))
  ).sort((a, b) => a - b)

  const filteredContent = (content[activeTab] as { name: string }[]).filter((item) => {
    const query = searchQuery.toLowerCase()
    if (activeTab === "class_resources") {
      const resource = item as ClassResourceRow
      const className = classNamesById[resource.class_id] ?? ""
      const haystack = `${resource.name} ${resource.resource_key} ${className}`.toLowerCase()
      if (!haystack.includes(query)) return false
      if (classResourceFilterClassId !== "all" && resource.class_id !== classResourceFilterClassId) return false
      return true
    }
    if (!item.name?.toLowerCase().includes(query)) return false
    if (activeTab === "spells") {
      const spell = item as Spell
      const spellClasses = spell.classes ?? []
      if (spellFilterClass === UNASSIGNED_SPELL_CLASS) {
        if (spellClasses.length > 0) return false
      } else if (spellFilterClass !== "all" && !spellClasses.includes(spellFilterClass)) {
        return false
      }
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
    if (activeTab === "magic_items") {
      const eq = item as Equipment
      if (
        magicItemFilterCategory !== "all" &&
        (eq.magic_item_category ?? "").toLowerCase() !== magicItemFilterCategory.toLowerCase()
      ) {
        return false
      }
    }
    if (activeTab === "languages") {
      const language = item as Language
      if (languageFilterPool !== "all" && language.pool !== languageFilterPool) return false
    }
    if (activeTab === "tools") {
      const tool = item as Tool
      if (toolFilterGroup !== "all" && tool.tool_group !== toolFilterGroup) return false
    }
    return true
  })

  const equipmentData = content.equipment as Equipment[]
  const magicItemData = content.magic_items as Equipment[]
  const equipmentCategoryOptions = useMemo(
    () =>
      Array.from(new Set(equipmentData.map((e) => e.category).filter(Boolean) as string[])).sort(),
    [equipmentData],
  )
  const magicItemCategoryOptions = useMemo(
    () => getMagicItemCategoryOptions(magicItemData),
    [magicItemData],
  )
  const equipmentGroups = useMemo(() => {
    if (activeTab !== "equipment") return []
    return groupEquipmentByCategory(filteredContent as Equipment[])
  }, [filteredContent, activeTab])
  const magicItemGroups = useMemo(() => {
    if (activeTab !== "magic_items") return []
    return groupMagicItemsByCategory(filteredContent as Equipment[])
  }, [filteredContent, activeTab])

  const classResourceGroups = useMemo(() => {
    if (activeTab !== "class_resources") return []
    return groupClassResourcesByKey(filteredContent as ClassResourceRow[], classNamesById)
  }, [filteredContent, activeTab, classNamesById])

  const tableName = (tab: ContentType) =>
    tab === "abilities" ? "custom_abilities" : isEquipmentBrowserTab(tab) ? "equipment" : tab

  const refreshTabCounts = async () => {
    const db = createClient()
    const [
      { count: speciesCount },
      { count: classesCount },
      { count: subclassesCount },
      { count: backgroundsCount },
      { count: spellsCount },
      { count: featsCount },
      { data: equipmentRows },
      { count: languagesCount },
      { count: toolsCount },
      { count: classResourcesCount },
      { count: abilitiesCount },
    ] = await Promise.all([
      db.from("species").select("*", { count: "exact", head: true }),
      db.from("classes").select("*", { count: "exact", head: true }),
      db.from("subclasses").select("*", { count: "exact", head: true }),
      db.from("backgrounds").select("*", { count: "exact", head: true }),
      db.from("spells").select("*", { count: "exact", head: true }),
      db.from("feats").select("*", { count: "exact", head: true }),
      db
        .from("equipment")
        .select(
          "magic_item_category, rarity, requires_attunement, category, subcategory, description, properties",
        ),
      db.from("languages").select("*", { count: "exact", head: true }),
      db.from("tools").select("*", { count: "exact", head: true }),
      db.from("class_resources").select("*", { count: "exact", head: true }),
      db.from("custom_abilities").select("*", { count: "exact", head: true }),
    ])
    const equipmentSplit = splitEquipmentByKind((equipmentRows ?? []) as Equipment[])
    setTabCounts({
      species: speciesCount ?? 0,
      classes: classesCount ?? 0,
      subclasses: subclassesCount ?? 0,
      backgrounds: backgroundsCount ?? 0,
      spells: spellsCount ?? 0,
      feats: featsCount ?? 0,
      equipment: equipmentSplit.mundane.length,
      magic_items: equipmentSplit.magic.length,
      languages: languagesCount ?? 0,
      tools: toolsCount ?? 0,
      class_resources: classResourcesCount ?? 0,
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
      .limit(isEquipmentBrowserTab(activeTab) ? 500 : 100)
    const rows = data || []
    if (isEquipmentBrowserTab(activeTab)) {
      const split = splitEquipmentByKind(rows as Equipment[])
      setContent((prev) => ({
        ...prev,
        equipment: split.mundane,
        magic_items: split.magic,
      }))
    } else {
      setContent((prev) => ({
        ...prev,
        [activeTab]: enrichCompendiumTabRows(activeTab, rows),
      }))
    }
    setLoading(false)
  }

  const clearEquipmentSubset = async (kind: "mundane" | "magic") => {
    const db = createClient()
    const { data } = await db
      .from("equipment")
      .select(
        "id, magic_item_category, rarity, requires_attunement, category, subcategory, description, properties",
      )
    const ids = ((data ?? []) as Equipment[])
      .filter((row) => (kind === "magic" ? isMagicItem(row) : !isMagicItem(row)))
      .map((row) => row.id)
      .filter(Boolean)
    if (ids.length) {
      await db.from("equipment").delete().in("id", ids)
    }
    setContent((prev) => ({
      ...prev,
      equipment: kind === "mundane" ? [] : prev.equipment,
      magic_items: kind === "magic" ? [] : prev.magic_items,
    }))
  }

  const handleClearSection = async () => {
    setClearingAll(true)
    setClearError(null)
    
    try {
      if (activeTab === "equipment") {
        await clearEquipmentSubset("mundane")
      } else if (activeTab === "magic_items") {
        await clearEquipmentSubset("magic")
      } else if (canClearCompendiumViaApi()) {
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
          if (data.alsoCleared?.includes("class_resources")) {
            next.class_resources = []
          }
          return next
        })
      } else {
        const db = createClient()
        const resolved = tableName(activeTab)
        await clearIndexedDbStore(resolved as Parameters<typeof clearIndexedDbStore>[0])
        if (activeTab === "classes") {
          await clearIndexedDbStore("subclasses")
          await clearIndexedDbStore("class_resources")
        }
        if (activeTab === "abilities") {
          await ensureModifierCatalog(db)
        }
        setContent((prev) => {
          const next = { ...prev, [activeTab]: [] }
          if (activeTab === "classes") {
            next.subclasses = []
            next.class_resources = []
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

    let exportRows = data as Record<string, unknown>[]
    if (activeTab === "equipment") {
      exportRows = splitEquipmentByKind(exportRows as Equipment[]).mundane as Record<string, unknown>[]
    } else if (activeTab === "magic_items") {
      exportRows = splitEquipmentByKind(exportRows as Equipment[]).magic as Record<string, unknown>[]
    }
    if (!exportRows.length) return

    const classNameById = new Map<string, string>()
    if (activeTab === "subclasses" || activeTab === "class_resources") {
      const { data: classesData } = await db.from("classes").select("id, name")
      for (const cls of classesData ?? []) {
        classNameById.set(cls.id as string, cls.name as string)
      }
    }

    const items = exportRows
      .map((row) => {
        const exportRow = { ...row }
        if ((activeTab === "subclasses" || activeTab === "class_resources") && exportRow.class_id) {
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

  const patchContentEnabled = (targets: CompendiumToggleTarget[], enabled: boolean) => {
    setContent((prev) => {
      const next = { ...prev }
      for (const target of targets) {
        const tab = target.contentType
        next[tab] = (next[tab] as Record<string, unknown>[]).map((row) =>
          row.id === target.id ? { ...row, enabled } : row,
        )
      }
      return next
    })
  }

  const applyItemEnabled = async (targets: CompendiumToggleTarget[], enabled: boolean) => {
    setToggleSaving(true)
    setToggleError(null)
    try {
      const db = createClient()
      await setCompendiumItemsEnabled(db, targets, enabled)
      patchContentEnabled(targets, enabled)
      setToggleConfirm(null)
    } catch (err) {
      console.error("[v0] Toggle compendium item error:", err)
      setToggleError(err instanceof Error ? err.message : "Failed to update item")
    } finally {
      setToggleSaving(false)
    }
  }

  const handleItemEnabledChange = async (item: Record<string, unknown>, nextEnabled: boolean) => {
    if (!nextEnabled && isProtectedSystemCompendiumRow(item)) {
      return
    }

    const target: CompendiumToggleTarget = {
      table: contentTypeToTable(activeTab),
      contentType: activeTab,
      id: item.id as string,
      name: item.name as string,
    }

    if (nextEnabled) {
      await applyItemEnabled([target], true)
      return
    }

    const db = createClient()
    const dependents = await findCompendiumDependents(db, activeTab, target.id)
    if (dependents.length === 0) {
      await applyItemEnabled([target], false)
      return
    }

    setToggleError(null)
    setToggleConfirm({ item: target, dependents })
  }

  const handleCopyItem = async (item: Record<string, unknown>) => {
    const id = String(item.id ?? "")
    if (!canDuplicateCompendiumItem(activeTab, id, item as { is_system?: boolean | null })) return
    setCopyingId(id)
    setCopyError(null)
    const result = await duplicateCompendiumItem(createClient(), activeTab, id)
    setCopyingId(null)
    if ("error" in result) {
      setCopyError(result.error)
      return
    }
    router.push(compendiumEditHref(activeTab, result.id))
  }

  const renderContentCard = (item: unknown) => {
    const data = item as Record<string, unknown>
    const editPath = compendiumEditHref(activeTab, data.id as string)
    const iconName = getCompendiumItemIcon(activeTab, data)
    const accentStyles = compendiumAccentColorStyles(getCompendiumItemAccentColor(data))
    const enabled = isCompendiumItemEnabled(data)
    const isSystemCatalog = activeTab === "abilities" && isProtectedSystemCompendiumRow(data as { id?: string; is_system?: boolean })
    const canCopy = canDuplicateCompendiumItem(activeTab, data.id as string, data as { is_system?: boolean | null })

    const cardImage = resolveCompendiumCardImageUrl(
      data as Record<string, unknown> & CompendiumCardVisual,
      activeTab,
    )
    const cardMinHeightClass =
      cardImage && activeTab === "classes"
        ? COMPENDIUM_CLASS_LIST_CARD_MIN_HEIGHT_CLASS
        : cardImage
          ? COMPENDIUM_LIST_CARD_MIN_HEIGHT_CLASS
          : null

    return (
      <motion.div
        key={data.id as string}
        layoutId={data.id as string}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 transition-colors",
          cardMinHeightClass ?? "bg-card",
          enabled
            ? `border-primary/40 ${accentStyles.hoverBorder}`
            : "border-border/60 opacity-60 hover:opacity-80",
        )}
        whileHover={{ scale: enabled ? 1.02 : 1.01 }}
      >
        {cardImage ? (
          <CompendiumCardHero
            imageUrl={cardImage}
            crop={compendiumCardImageCropForType(activeTab)}
            variant="list"
            fullBleed
          />
        ) : null}
        <div
          className={cn(
            "relative z-10 p-5 pb-11",
            cardImage && "flex min-h-full flex-col justify-end pt-3",
            cardImage &&
              "[&_.text-foreground]:text-white [&_.text-muted-foreground]:text-white/75 [&_.text-primary]:text-primary [&_.text-secondary]:text-secondary [&_.text-warning]:text-warning [&_.text-orange]:text-orange [&_.text-lime]:text-lime [&_.text-magenta]:text-magenta [&_.text-accent]:text-accent [&_.bg-muted]:bg-black/40 [&_.bg-muted]:text-white/90",
          )}
        >
        <div className="flex items-start justify-between mb-2 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 shrink-0 ${accentStyles.iconText}`}>
              <GameIcon name={iconName} className="w-10 h-10" />
            </div>
            <h3 
              className={cn(
                "font-bold text-lg cursor-pointer leading-tight flex items-center gap-1.5",
                cardImage ? "text-white drop-shadow-md" : "text-foreground",
                accentStyles.titleHover,
              )}
              onClick={() => setSelectedItem(item)}
            >
              {activeTab === "class_resources"
                ? (classNamesById[(data as ClassResourceRow).class_id] ?? "Unknown class")
                : (data.name as string)}
              {activeTab === "abilities" && isCommonModifiersCatalogAbility(data as { id?: string; is_system?: boolean }) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex text-primary"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="About system catalog"
                    >
                      <Info className="w-4 h-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-sm">
                    {getSystemCatalogMeta(data.id as string)?.info ?? MODIFIER_CATALOG_INFO}
                  </TooltipContent>
                </Tooltip>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canCopy && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void handleCopyItem(data)
                }}
                disabled={copyingId === (data.id as string)}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border transition-colors hover:bg-muted disabled:opacity-50",
                  cardImage
                    ? "border-white/25 bg-black/30 text-white/85 hover:bg-black/45 hover:text-white"
                    : `border-border text-muted-foreground hover:text-foreground ${accentStyles.editHover}`,
                )}
                title="Make a copy"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            <Link
              href={editPath}
              className={cn(
                "flex items-center justify-center w-8 h-8 shrink-0 rounded-full border transition-colors",
                cardImage
                  ? "border-white/25 bg-black/30 text-white/85 hover:bg-black/45 hover:text-white"
                  : `border-border text-muted-foreground ${accentStyles.editHover}`,
              )}
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </Link>
          </div>
        </div>
        {activeTab === "classes" && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
              {formatCompendiumSource((data as DndClass).source) || "Custom"}
            </span>
            {(() => {
              const subs = subclassesByClassId.get(data.id as string) ?? []
              return subs.map((sc) => (
                <span
                  key={sc.id}
                  className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-full"
                >
                  {sc.name}
                </span>
              ))
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
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
              {formatCompendiumSource((data as Species).source) || "Custom"}
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
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
              {formatCompendiumSource((data as Background).source) || "Custom"}
            </span>
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
            {((data as Spell).classes ?? []).length > 0 ? (
              ((data as Spell).classes ?? []).map((cls) => (
                <span
                  key={cls}
                  className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-full"
                >
                  {cls}
                </span>
              ))
            ) : (
              <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                No class list
              </span>
            )}
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
        {activeTab === "magic_items" && (
          <div className="flex gap-2 flex-wrap">
            {(data as Equipment).rarity && (
              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                {(data as Equipment).rarity}
              </span>
            )}
            {(data as Equipment).magic_item_category && (
              <span className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-full">
                {(data as Equipment).magic_item_category}
              </span>
            )}
            {(data as Equipment).requires_attunement && (
              <span className="text-xs px-2 py-1 bg-orange/10 text-orange rounded-full">
                Attunement
              </span>
            )}
            {(data as Equipment).category && (data as Equipment).category !== "Other" && (
              <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                {(data as Equipment).category}
              </span>
            )}
          </div>
        )}
        {activeTab === "languages" && (
          <div className="flex gap-2 flex-wrap">
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                (data as Language).pool === "rare"
                  ? "bg-magenta/10 text-magenta"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {(data as Language).pool === "rare" ? "Rare" : "Standard"}
            </span>
            {(data as Language).script && (
              <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                {(data as Language).script}
              </span>
            )}
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
              {formatCompendiumSource((data as Language).source) || "Custom"}
            </span>
          </div>
        )}
        {activeTab === "tools" && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full capitalize">
              {(data as Tool).tool_group.replace(/_/g, " ")}
            </span>
            {(data as Tool).subcategory && (
              <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                {(data as Tool).subcategory}
              </span>
            )}
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full uppercase">
              {(data as Tool).check_ability?.slice(0, 3)}
            </span>
          </div>
        )}
        {activeTab === "class_resources" && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
              {(data as ClassResourceRow).name}
            </span>
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full font-mono">
              {(data as ClassResourceRow).resource_key}
            </span>
            <span className="text-xs px-2 py-1 bg-lime/10 text-lime rounded-full">
              {formatUsesSummary((data as ClassResourceRow).uses)}
            </span>
          </div>
        )}
        {activeTab === "abilities" && (
          <div className="space-y-2">
            {(data as { prerequisites?: string }).prerequisites && (
              <p className="text-xs text-orange">
                Prereq: {(data as { prerequisites: string }).prerequisites}
              </p>
            )}
            {!isCommonModifiersCatalogAbility(data as { id?: string; is_system?: boolean }) && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {(data as { description?: string }).description}
              </p>
            )}
            {activeTab === "abilities" &&
              isCommonModifiersCatalogAbility(data as { id?: string; is_system?: boolean }) && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {getSystemCatalogMeta(data.id as string)?.info ?? MODIFIER_CATALOG_INFO}
                </p>
              )}
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
        </div>
        <div
          className="absolute bottom-4 right-4 flex items-center"
          onClick={(e) => e.stopPropagation()}
          title={
            isSystemCatalog
              ? "System catalog is always enabled"
              : enabled
                ? "Enabled in builder"
                : "Disabled in builder"
          }
        >
          <Switch
            checked={enabled}
            disabled={isSystemCatalog}
            onCheckedChange={(checked) => void handleItemEnabledChange(data, checked)}
            aria-label={`${enabled ? "Disable" : "Enable"} ${data.name as string}`}
          />
        </div>
      </motion.div>
    )
  }

  return (
    <div id="compendium-root" className="min-h-screen bg-background flex flex-col">
      <MainNav />
      
      <main id="compendium-main" className="max-w-7xl mx-auto px-4 py-8">
        <div id="compendium-header" className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div className="min-w-0">
            <h1 className="text-4xl font-black text-foreground mb-2">Compendium</h1>
            <p className={pageHeaderSubtitleClass}>Browse and edit all available D&D content</p>
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
                  onClick={() => {
                    setClearError(null)
                    setClearConfirmOpen(true)
                  }}
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear {tabs.find((t) => t.id === activeTab)?.label}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {activeTab === "spells" && (
              <button
                type="button"
                onClick={() => setSpellListDialogOpen(true)}
                className="inline-flex w-max shrink-0 items-center gap-2 px-5 py-3 bg-card border-2 border-border text-foreground rounded-xl font-semibold hover:bg-muted transition-colors whitespace-nowrap"
              >
                <Upload className="w-5 h-5 shrink-0" />
                Upload class spell list
              </button>
            )}
            <Link
              href={compendiumEditHref(activeTab, "new")}
              className="inline-flex w-max shrink-0 items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              <Plus className="w-5 h-5 shrink-0" />
              {newItemButtonLabels[activeTab]}
            </Link>
          </div>
        </div>

        <CustomClassSpellListDialog
          open={spellListDialogOpen}
          onClose={() => setSpellListDialogOpen(false)}
          onApplied={() => {
            void refreshActiveTabContent()
            void refreshTabCounts()
          }}
        />

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
                This will permanently delete{" "}
                <strong className="text-foreground">
                  all {tabCounts[activeTab]} {tabs.find((t) => t.id === activeTab)?.label.toLowerCase()}
                </strong>{" "}
                from your compendium database.
                {activeTab === "classes" && tabCounts.subclasses > 0 && (
                  <> All {tabCounts.subclasses} subclasses will be cleared as well.</>
                )}
                {activeTab === "classes" && tabCounts.class_resources > 0 && (
                  <> All {tabCounts.class_resources} class resources will be cleared as well.</>
                )}
                {activeTab === "abilities" && (
                  <> The system <strong className="text-foreground">Common Modifier Effects</strong> catalog will be recreated automatically with default entries.</>
                )}{" "}
                Other sections will not be affected.
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

        {toggleConfirm && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border-2 border-border p-6 max-w-lg w-full shadow-xl">
              <h2 className="text-xl font-black text-foreground mb-2">
                Disable {toggleConfirm.item.name}?
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Other compendium entries rely on this {COMPENDIUM_TOGGLE_LABELS[toggleConfirm.item.contentType].toLowerCase()}.
                You can disable only this item, or disable it together with the related entries below.
              </p>
              <ul className="max-h-48 overflow-y-auto space-y-2 mb-4 rounded-xl border border-border bg-muted/30 p-3">
                {toggleConfirm.dependents.map((dependent) => (
                  <li key={`${dependent.table}:${dependent.id}`} className="text-sm text-foreground">
                    <span className="font-semibold">{dependent.name}</span>
                    <span className="text-muted-foreground"> · {COMPENDIUM_TOGGLE_LABELS[dependent.contentType]}</span>
                  </li>
                ))}
              </ul>
              {toggleError && <p className="text-sm text-destructive mb-4">{toggleError}</p>}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setToggleConfirm(null)
                    setToggleError(null)
                  }}
                  disabled={toggleSaving}
                  className="flex-1 px-4 py-3 bg-card border-2 border-border text-foreground rounded-xl font-semibold hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void applyItemEnabled([toggleConfirm.item], false)}
                  disabled={toggleSaving}
                  className="flex-1 px-4 py-3 bg-muted text-foreground rounded-xl font-semibold hover:bg-muted/80 transition-colors disabled:opacity-50"
                >
                  {toggleSaving ? "Saving..." : "Only this item"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void applyItemEnabled([toggleConfirm.item, ...toggleConfirm.dependents], false)
                  }
                  disabled={toggleSaving}
                  className="flex-1 px-4 py-3 bg-destructive text-destructive-foreground rounded-xl font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  {toggleSaving
                    ? "Saving..."
                    : `Disable all (${toggleConfirm.dependents.length + 1})`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs — content type selection */}
        <div id="compendium-tabs" className="flex flex-wrap gap-1.5 mb-4">
          {tabs.map((tab) => (
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
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? "bg-primary-foreground/20" : "bg-muted"
              }`}>
                {tabCounts[tab.id]}
              </span>
            </button>
          ))}
        </div>

        {copyError && (
          <p className="mb-4 text-sm text-destructive">{copyError}</p>
        )}

        {/* Tab filters + search */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex flex-1 min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            {activeTab === "feats" && (
              <div id="feat-filters" className="flex flex-wrap items-center gap-2">
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

            {activeTab === "class_resources" && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    Class
                  </label>
                  <select
                    value={classResourceFilterClassId}
                    onChange={(e) => setClassResourceFilterClassId(e.target.value)}
                    className="bg-card border-2 border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="all">All Classes</option>
                    {Object.entries(classNamesById)
                      .sort(([, a], [, b]) => a.localeCompare(b))
                      .map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                  </select>
                </div>
                {classResourceFilterClassId !== "all" && (
                  <button
                    onClick={() => setClassResourceFilterClassId("all")}
                    className="px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}

            {activeTab === "spells" && (
              <div id="spell-filters" className="flex flex-wrap items-center gap-2 sm:gap-3">
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
                    {hasUnassignedSpells ? (
                      <option value={UNASSIGNED_SPELL_CLASS}>No class list</option>
                    ) : null}
                    {spellClassOptions.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>

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

                {(spellFilterClass !== "all" || spellFilterLevel !== "all" || spellFilterSchool !== "all") && (
                  <button
                    onClick={() => {
                      setSpellFilterClass("all")
                      setSpellFilterLevel("all")
                      setSpellFilterSchool("all")
                    }}
                    className="px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {activeTab === "equipment" && equipmentCategoryOptions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
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
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {activeTab === "magic_items" && magicItemCategoryOptions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Magic type
                </label>
                <select
                  value={magicItemFilterCategory}
                  onChange={(e) => setMagicItemFilterCategory(e.target.value)}
                  className="bg-card border-2 border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="all">All magic types</option>
                  {magicItemCategoryOptions.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {magicItemFilterCategory !== "all" && (
                  <button
                    type="button"
                    onClick={() => setMagicItemFilterCategory("all")}
                    className="px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {activeTab === "languages" && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Pool
                </label>
                <select
                  value={languageFilterPool}
                  onChange={(e) => setLanguageFilterPool(e.target.value as "all" | "standard" | "rare")}
                  className="bg-card border-2 border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="all">All pools</option>
                  <option value="standard">Standard</option>
                  <option value="rare">Rare</option>
                </select>
              </div>
            )}

            {activeTab === "tools" && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Group
                </label>
                <select
                  value={toolFilterGroup}
                  onChange={(e) => setToolFilterGroup(e.target.value)}
                  className="bg-card border-2 border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="all">All groups</option>
                  <option value="artisans">Artisan&apos;s Tools</option>
                  <option value="musical">Musical Instrument</option>
                  <option value="gaming">Gaming Set</option>
                  <option value="other">Other Tools</option>
                  <option value="vehicle">Vehicle</option>
                </select>
              </div>
            )}
          </div>

          <div id="compendium-search" className="relative w-full sm:w-1/3 shrink-0 sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-card border-2 border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

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
        ) : activeTab === "equipment" || activeTab === "magic_items" ? (
          <div className="space-y-8">
            {(activeTab === "equipment" ? equipmentGroups : magicItemGroups).map((group) => (
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
        ) : activeTab === "class_resources" ? (
          <ClassResourcesOverview
            groups={classResourceGroups}
            classNamesById={classNamesById}
            onSelect={(row) => setSelectedItem(row)}
            onToggleEnabled={(row, enabled) => void handleItemEnabledChange(row, enabled)}
            onCopy={(row) => void handleCopyItem(row as Record<string, unknown>)}
            copyingId={copyingId}
          />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredContent.map(renderContentCard)}
            </AnimatePresence>
          </div>
        )}
      </main>

      {selectedItem && (
        <CompendiumDetailOverlay
          open
          onClose={() => setSelectedItem(null)}
          imageCrop={compendiumCardImageCropForType(activeTab)}
          enableCardImage={compendiumItemSupportsCardImage(
            activeTab,
            selectedItem as Record<string, unknown>,
          )}
          item={
            activeTab === "class_resources"
              ? {
                  ...(selectedItem as ClassResourceRow),
                  name: `${classNamesById[(selectedItem as ClassResourceRow).class_id] ?? "Unknown"} · ${(selectedItem as ClassResourceRow).name}`,
                }
              : (selectedItem as { name: string; source?: string; icon?: string | null; card_image_url?: string | null })
          }
          subtitle={formatCompendiumSource((selectedItem as { source?: string }).source)}
          tags={
            activeTab === "class_resources"
              ? [
                  {
                    label: formatUsesSummary((selectedItem as ClassResourceRow).uses),
                    emphasis: true,
                  },
                  {
                    label: (selectedItem as ClassResourceRow).resource_key,
                  },
                ]
                : isEquipmentBrowserTab(activeTab) && activeTab === "magic_items"
                ? [
                    ...((selectedItem as Equipment).rarity
                      ? [{ label: (selectedItem as Equipment).rarity!, emphasis: true }]
                      : []),
                    ...((selectedItem as Equipment).magic_item_category
                      ? [{ label: (selectedItem as Equipment).magic_item_category! }]
                      : []),
                    ...((selectedItem as Equipment).requires_attunement
                      ? [{ label: "Attunement" }]
                      : []),
                  ]
                : activeTab === "languages"
                  ? [
                      {
                        label: (selectedItem as Language).pool === "rare" ? "Rare" : "Standard",
                        emphasis: true,
                      },
                      ...((selectedItem as Language).script
                        ? [{ label: (selectedItem as Language).script! }]
                        : []),
                    ]
                  : activeTab === "tools"
                    ? [
                        {
                          label: (selectedItem as Tool).tool_group.replace(/_/g, " "),
                          emphasis: true,
                        },
                        ...((selectedItem as Tool).subcategory
                          ? [{ label: (selectedItem as Tool).subcategory! }]
                          : []),
                      ]
                : undefined
          }
          accentColor={getCompendiumItemAccentColor(selectedItem as Record<string, unknown>)}
          headerActions={
            canDuplicateCompendiumItem(
              activeTab,
              (selectedItem as { id: string }).id,
              selectedItem as { is_system?: boolean | null },
            ) ? (
              <button
                type="button"
                onClick={() => void handleCopyItem(selectedItem as Record<string, unknown>)}
                disabled={copyingId === (selectedItem as { id: string }).id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/20 text-white/90 hover:bg-white/10 disabled:opacity-50"
              >
                <Copy className="h-3.5 w-3.5" />
                Make a copy
              </button>
            ) : undefined
          }
        >
          {isEquipmentBrowserTab(activeTab) && (
            <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {getEquipmentDetailRows(selectedItem as Equipment).map((row) => (
                <div key={row.label} className="contents">
                  <dt className="text-white/50 font-semibold">{row.label}</dt>
                  <dd className="text-white/90">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {activeTab === "languages" && (
            <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {(selectedItem as Language).typical_speakers ? (
                <div className="contents">
                  <dt className="text-white/50 font-semibold">Typical speakers</dt>
                  <dd className="text-white/90">{(selectedItem as Language).typical_speakers}</dd>
                </div>
              ) : null}
              {(selectedItem as Language).script ? (
                <div className="contents">
                  <dt className="text-white/50 font-semibold">Script</dt>
                  <dd className="text-white/90">{(selectedItem as Language).script}</dd>
                </div>
              ) : null}
            </dl>
          )}
          {activeTab === "tools" && (
            <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <div className="contents">
                <dt className="text-white/50 font-semibold">Check ability</dt>
                <dd className="text-white/90 capitalize">{(selectedItem as Tool).check_ability}</dd>
              </div>
              {(selectedItem as Tool).subcategory ? (
                <div className="contents">
                  <dt className="text-white/50 font-semibold">Subcategory</dt>
                  <dd className="text-white/90">{(selectedItem as Tool).subcategory}</dd>
                </div>
              ) : null}
              {(selectedItem as Tool).expands_to?.length ? (
                <div className="contents">
                  <dt className="text-white/50 font-semibold">Expands to</dt>
                  <dd className="text-white/90">{(selectedItem as Tool).expands_to!.join(", ")}</dd>
                </div>
              ) : null}
            </dl>
          )}
          {activeTab === "classes" && (() => {
            const row = classComplexityDetailRow(selectedItem as DndClass)
            if (!row) return null
            return (
              <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <div className="contents">
                  <dt className="text-white/50 font-semibold">{row.label}</dt>
                  <dd className="text-white/90">{row.value}</dd>
                </div>
              </dl>
            )
          })()}
          {!isCommonModifiersCatalogAbility(selectedItem as { id?: string; is_system?: boolean }) && (
            <RichTextContent html={(selectedItem as { description?: string }).description} />
          )}
          {activeTab === "abilities" &&
          isCommonModifiersCatalogAbility(selectedItem as { id?: string; is_system?: boolean }) ? (
            <div className="space-y-4">
              <RichTextContent
                html={
                  (selectedItem as { description?: string }).description ??
                  `<p>${getSystemCatalogMeta(selectedItem.id as string)?.info ?? MODIFIER_CATALOG_INFO}</p>`
                }
              />
              {(() => {
                const entries = normalizeModifierCatalog(
                  (selectedItem as { modifier_catalog?: unknown }).modifier_catalog,
                )
                if (!entries.length) return null
                return (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white/80">
                      {entries.length} option{entries.length === 1 ? "" : "s"}
                    </h3>
                    <ul className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                      {entries.map((entry) => (
                        <li
                          key={entry.id}
                          className="rounded-lg border border-white/10 bg-white/5 p-3"
                        >
                          <p className="font-semibold text-white">{entry.name}</p>
                          {entry.summary ? (
                            <p className="text-sm text-white/70 mt-1">{entry.summary}</p>
                          ) : null}
                          {entry.description ? (
                            <div className="text-sm text-white/60 mt-2 prose prose-invert prose-sm max-w-none">
                              <RichTextContent html={entry.description} />
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })()}
            </div>
          ) : null}
          {(selectedItem as { creator_url?: string | null }).creator_url && (
            <p className="mt-4 text-sm">
              <span className="text-white/50">Source link: </span>
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
        </CompendiumDetailOverlay>
      )}
      <SiteFooter />
    </div>
  )
}

export default function CompendiumPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className={pageFloatingHintClass}>Loading compendium…</p>
        </div>
      }
    >
      <CompendiumPageContent />
    </Suspense>
  )
}
