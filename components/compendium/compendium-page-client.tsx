"use client"

import { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
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
import { Search, BookOpen, Users, Wand2, Shield, Sparkles, Package, Gauge, Languages, Wrench, PawPrint, Plus, Edit, Copy, Trash2, Settings, Download, Upload, LayoutGrid, Info } from "lucide-react"
import type { Species, DndClass, Background, Spell, Feat, Equipment, Subclass, ClassResourceRow, Language, Tool, Creature } from "@/lib/types"
import { CreatureStatBlockView } from "@/components/compendium/creature-stat-block-view"
import { ClassResourcesOverview } from "@/components/compendium/class-resources-overview"
import { formatUsesSummary, groupClassResourcesByKey } from "@/lib/compendium/class-resource-rows"
import { filterCompendiumClassResourcesBySubclasses } from "@/lib/compendium/subclass-gated-class-resources"
import { isCompendiumItemEnabled } from "@/lib/compendium/compendium-enabled"
import {
  COMPENDIUM_TOGGLE_LABELS,
  contentTypeToTable,
  findCompendiumDependents,
  findDisabledCompendiumDependents,
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
import { stripHtml } from "@/lib/import/normalize-equipment"
import { isTopLevelCompendiumAbility } from "@/lib/import/nest-psionic-ability-library"
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
import { CompendiumCardHero } from "@/components/compendium/compendium-card-hero"
import {
  CLASS_CARD_ASPECT_CLASS,
  COMPENDIUM_LIST_CARD_MIN_HEIGHT_CLASS,
  COMPENDIUM_CLASS_LIST_CARD_MIN_HEIGHT_CLASS,
  areBrowseCardImagesEnabled,
  compendiumBrowseGridClass,
  compendiumCardImageCropForType,
  compendiumItemSupportsCardImage,
  compendiumPortraitListGradientClass,
  hidesCompendiumBrowseCardIcon,
  isCompendiumPortraitGraphicCard,
  resolveCompendiumCardImageUrl,
  type CompendiumCardVisual,
} from "@/lib/compendium/card-image"
import { useAppPresentationMode } from "@/components/settings/use-app-presentation-mode"
import { useBuilderLayout } from "@/components/settings/use-builder-layout"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  BACKGROUND_ABILITY_FILTER_OPTIONS,
  backgroundMatchesAbilityFilter,
} from "@/lib/compendium/background-ability-filter"
import type { AbilityModifierKey } from "@/lib/compendium/characteristic-modifiers"
import { SpellSchoolsEditorOverlay } from "@/components/compendium/spell-schools-editor-overlay"
import {
  getSpellSchools,
  resetSpellSchoolsToDefault,
  SPELL_SCHOOLS_CHANGE_EVENT,
} from "@/lib/compendium/schools-of-magic"
import { asCompendiumRow, asCompendiumRows, castCompendiumRow } from "@/lib/data/types"

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
  if (tab === "classes") return enrichClassesList(rows as unknown as DndClass[])
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
  { id: "creatures", label: "Creatures & Companions", icon: <PawPrint className="w-3.5 h-3.5" /> },
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
  creatures: "New Creature",
  equipment: "New Item",
  magic_items: "New Magic Item",
  languages: "New Language",
  tools: "New Tool",
  class_resources: "New Class Resource",
  abilities: "New Custom Ability",
}

/** Drop duplicate browse rows (repeated imports / animation ghosts). */
function dedupeCompendiumBrowseRows<T extends { id?: string; name?: string }>(
  tab: CompendiumContentType,
  rows: T[],
): T[] {
  const seenIds = new Set<string>()
  const seenSubclassKeys = new Set<string>()
  const result: T[] = []

  for (const row of rows) {
    const id = String(row.id ?? "")
    if (id) {
      if (seenIds.has(id)) continue
      seenIds.add(id)
    }
    if (tab === "subclasses") {
      const subclass = row as unknown as Subclass
      const key = `${subclass.class_id ?? ""}:${String(subclass.name ?? "").trim().toLowerCase()}`
      if (seenSubclassKeys.has(key)) continue
      seenSubclassKeys.add(key)
    }
    result.push(row)
  }

  return result
}

const CustomClassSpellListDialog = dynamic(
  () =>
    import("@/components/compendium/custom-class-spell-list-dialog").then((mod) => ({
      default: mod.CustomClassSpellListDialog,
    })),
)

export default function CompendiumPageClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { layout: cardLayout, setLayout: setCardLayout } = useBuilderLayout()
  const { isCompactOnly } = useAppPresentationMode()
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
    creatures: [],
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
    action: "disable" | "enable"
  } | null>(null)
  const [toggleSaving, setToggleSaving] = useState(false)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [copyingId, setCopyingId] = useState<string | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)
  // Spell-specific filters
  const [spellFilterClass, setSpellFilterClass] = useState<string>("all")
  const [spellFilterLevel, setSpellFilterLevel] = useState<string>("all")
  const [spellFilterSchool, setSpellFilterSchool] = useState<string>("all")
  const [spellSchools, setSpellSchoolsState] = useState<string[]>(() => getSpellSchools())
  const [spellSchoolsEditorOpen, setSpellSchoolsEditorOpen] = useState(false)
  const [featFilterCategory, setFeatFilterCategory] = useState<string>("all")
  const [equipmentFilterCategory, setEquipmentFilterCategory] = useState<string>("all")
  const [magicItemFilterCategory, setMagicItemFilterCategory] = useState<string>("all")
  const [languageFilterPool, setLanguageFilterPool] = useState<"all" | "standard" | "rare">("all")
  const [toolFilterGroup, setToolFilterGroup] = useState<string>("all")
  const [backgroundFilterAbilities, setBackgroundFilterAbilities] = useState<AbilityModifierKey[]>([])
  const [classResourceFilterClassId, setClassResourceFilterClassId] = useState<string>("all")
  const [classNamesById, setClassNamesById] = useState<Record<string, string>>({})
  const [tabCounts, setTabCounts] = useState<Record<ContentType, number>>({
    species: 0,
    classes: 0,
    subclasses: 0,
    backgrounds: 0,
    spells: 0,
    feats: 0,
    creatures: 0,
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

  useEffect(() => {
    const syncSchools = () => setSpellSchoolsState(getSpellSchools())
    syncSchools()
    window.addEventListener(SPELL_SCHOOLS_CHANGE_EVENT, syncSchools)
    window.addEventListener("storage", syncSchools)
    return () => {
      window.removeEventListener(SPELL_SCHOOLS_CHANGE_EVENT, syncSchools)
      window.removeEventListener("storage", syncSchools)
    }
  }, [])

  // Fetch counts for all tabs (fast) and full data only for active tab
  useEffect(() => {
    const fetchCounts = async () => {
      const db = createClient()
      // Ensure Common Modifiers + Metamagic / Invocations / Weapon Mastery exist before counting.
      await ensureModifierCatalog(db)
      const [
        { count: speciesCount },
        { count: classesCount },
        { count: subclassesCount },
        { count: backgroundsCount },
        { count: spellsCount },
        { count: featsCount },
        { count: creaturesCount },
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
        db.from("creatures").select("*", { count: "exact", head: true }),
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
      const equipmentSplit = splitEquipmentByKind(asCompendiumRows(equipmentRows) as unknown as Equipment[])
      setTabCounts({
        species: speciesCount ?? 0,
        classes: classesCount ?? 0,
        subclasses: subclassesCount ?? 0,
        backgrounds: backgroundsCount ?? 0,
        spells: spellsCount ?? 0,
        feats: featsCount ?? 0,
        creatures: creaturesCount ?? 0,
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
            : activeTab === "spells" || activeTab === "feats" || activeTab === "abilities"
              ? 5000
              : 100,
        )
      
      let rows = asCompendiumRows(data)
      if (activeTab === "abilities") {
        rows = [...rows].sort((a, b) => {
          const aRank = systemCatalogSortIndex(String(a.id))
          const bRank = systemCatalogSortIndex(String(b.id))
          if (aRank !== bRank) return aRank - bRank
          return String(a.name).localeCompare(String(b.name))
        })
      }
      if (isEquipmentBrowserTab(activeTab)) {
        const split = splitEquipmentByKind(asCompendiumRows(rows) as unknown as Equipment[])
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
        setSubclassesForClasses(asCompendiumRows(subclasses) as unknown as Subclass[])
      }

      if (activeTab === "class_resources") {
        const [{ data: classes }, { data: subclasses }] = await Promise.all([
          db.from("classes").select("id, name").order("name"),
          db.from("subclasses").select("*").order("name").limit(500),
        ])
        setClassNamesById(
          Object.fromEntries(
            asCompendiumRows<{ id: string; name: string }>(classes).map((cls) => [cls.id, cls.name]),
          ),
        )
        setSubclassesForClasses(asCompendiumRows(subclasses) as unknown as Subclass[])
      }

      setLoading(false)
    }
    
    fetchActiveTabContent()
  }, [activeTab])

  // Derive unique spell filter options from loaded spell data
  const spellData = (content.spells as unknown as Spell[])
const UNASSIGNED_SPELL_CLASS = "__unassigned__"

  const spellClassOptions = Array.from(
    new Set(spellData.flatMap((s) => s.classes ?? [])),
  ).sort()
  const hasUnassignedSpells = spellData.some((s) => !(s.classes ?? []).length)
  const spellSchoolOptions = spellSchools
  const spellLevelOptions = Array.from(
    new Set(spellData.map((s) => s.level))
  ).sort((a, b) => a - b)

  const filteredContent = useMemo(() => {
    const query = searchQuery.toLowerCase()
    const classResourceRows =
      activeTab === "class_resources"
        ? filterCompendiumClassResourcesBySubclasses(
            content.class_resources as ClassResourceRow[],
            classNamesById,
            subclassesForClasses,
          )
        : null
    const sourceRows =
      classResourceRows ?? (content[activeTab] as { id?: string; name: string }[])
    const rows = sourceRows.filter((item) => {
      if (activeTab === "class_resources") {
        const resource = item as ClassResourceRow
        const className = classNamesById[resource.class_id] ?? ""
        const haystack = `${resource.name} ${resource.resource_key} ${className}`.toLowerCase()
        if (!haystack.includes(query)) return false
        if (classResourceFilterClassId !== "all" && resource.class_id !== classResourceFilterClassId) {
          return false
        }
        return true
      }
      if (!item.name?.toLowerCase().includes(query)) return false
      if (activeTab === "abilities") {
        const ability = item as {
          ability_role?: string | null
          parent_ability_name?: string | null
          is_system?: boolean | null
          name?: string | null
        }
        // Nested powers/talents stay hidden unless the user searches for them.
        if (!query && !isTopLevelCompendiumAbility(ability)) return false
      }
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
      if (activeTab === "backgrounds" && backgroundFilterAbilities.length > 0) {
        if (!backgroundMatchesAbilityFilter(item as Background, backgroundFilterAbilities)) return false
      }
      return true
    })

    return dedupeCompendiumBrowseRows(activeTab, rows)
  }, [
    activeTab,
    backgroundFilterAbilities,
    classNamesById,
    classResourceFilterClassId,
    content,
    equipmentFilterCategory,
    featFilterCategory,
    languageFilterPool,
    magicItemFilterCategory,
    searchQuery,
    spellFilterClass,
    spellFilterLevel,
    spellFilterSchool,
    subclassesForClasses,
    toolFilterGroup,
  ])

  const equipmentData = content.equipment as unknown as Equipment[]
  const magicItemData = content.magic_items as unknown as Equipment[]
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
    return groupEquipmentByCategory(filteredContent as unknown as Equipment[])
  }, [filteredContent, activeTab])
  const magicItemGroups = useMemo(() => {
    if (activeTab !== "magic_items") return []
    return groupMagicItemsByCategory(filteredContent as unknown as Equipment[])
  }, [filteredContent, activeTab])

  const classResourceGroups = useMemo(() => {
    if (activeTab !== "class_resources") return []
    return groupClassResourcesByKey(filteredContent as ClassResourceRow[], classNamesById)
  }, [filteredContent, activeTab, classNamesById])

  const tableName = (tab: ContentType) =>
    tab === "abilities" ? "custom_abilities" : isEquipmentBrowserTab(tab) ? "equipment" : tab

  const refreshTabCounts = async () => {
    const db = createClient()
    await ensureModifierCatalog(db)
    const [
      { count: speciesCount },
      { count: classesCount },
      { count: subclassesCount },
      { count: backgroundsCount },
      { count: spellsCount },
      { count: featsCount },
      { count: creaturesCount },
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
      db.from("creatures").select("*", { count: "exact", head: true }),
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
    const equipmentSplit = splitEquipmentByKind(asCompendiumRows(equipmentRows) as unknown as Equipment[])
    setTabCounts({
      species: speciesCount ?? 0,
      classes: classesCount ?? 0,
      subclasses: subclassesCount ?? 0,
      backgrounds: backgroundsCount ?? 0,
      spells: spellsCount ?? 0,
      feats: featsCount ?? 0,
      creatures: creaturesCount ?? 0,
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
    const rows = asCompendiumRows(data)
    if (isEquipmentBrowserTab(activeTab)) {
      const split = splitEquipmentByKind(asCompendiumRows(rows) as unknown as Equipment[])
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
    const ids = (asCompendiumRows(data) as unknown as Equipment[])
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
        if (activeTab === "spells") {
          resetSpellSchoolsToDefault()
          setSpellSchoolsState(getSpellSchools())
          setSpellFilterSchool("all")
        }
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
        if (activeTab === "spells") {
          resetSpellSchoolsToDefault()
          setSpellSchoolsState(getSpellSchools())
          setSpellFilterSchool("all")
        }
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
    const exportRowsRaw = asCompendiumRows(data)
    if (!exportRowsRaw.length) return

    let exportRows = exportRowsRaw
    if (activeTab === "equipment") {
      exportRows = splitEquipmentByKind(exportRows as unknown as Equipment[]).mundane as unknown as Record<string, unknown>[]
    } else if (activeTab === "magic_items") {
      exportRows = splitEquipmentByKind(exportRows as unknown as Equipment[]).magic as unknown as Record<string, unknown>[]
    }
    if (!exportRows.length) return

    const classNameById = new Map<string, string>()
    if (activeTab === "subclasses" || activeTab === "class_resources") {
      const { data: classesData } = await db.from("classes").select("id, name")
      for (const cls of asCompendiumRows<{ id: string; name: string }>(classesData)) {
        classNameById.set(cls.id, cls.name)
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
        next[tab] = (next[tab] as unknown as Record<string, unknown>[]).map((row) =>
          row.id === target.id ? { ...row, enabled } : row,
        )
      }
      return next
    })
  }

  const applyItemEnabled = async (targets: CompendiumToggleTarget[], enabled: boolean) => {
    setToggleSaving(true)
    setToggleError(null)
    patchContentEnabled(targets, enabled)
    try {
      const db = createClient()
      await setCompendiumItemsEnabled(db, targets, enabled)
      setToggleConfirm(null)
    } catch (err) {
      console.error("[v0] Toggle compendium item error:", err)
      patchContentEnabled(targets, !enabled)
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
      const db = createClient()
      const disabledDependents = await findDisabledCompendiumDependents(db, activeTab, target.id)
      if (disabledDependents.length === 0) {
        await applyItemEnabled([target], true)
        return
      }

      setToggleError(null)
      setToggleConfirm({ item: target, dependents: disabledDependents, action: "enable" })
      return
    }

    const db = createClient()
    const dependents = await findCompendiumDependents(db, activeTab, target.id)
    if (dependents.length === 0) {
      await applyItemEnabled([target], false)
      return
    }

    setToggleError(null)
    setToggleConfirm({ item: target, dependents, action: "disable" })
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
    const data = item as unknown as Record<string, unknown>
    const editPath = compendiumEditHref(activeTab, data.id as string)
    const iconName = getCompendiumItemIcon(activeTab, data)
    const accentStyles = compendiumAccentColorStyles(getCompendiumItemAccentColor(data))
    const enabled = isCompendiumItemEnabled(data)
    const isSystemCatalog = activeTab === "abilities" && isProtectedSystemCompendiumRow(castCompendiumRow<{ id?: string; is_system?: boolean }>(data))
    const canCopy = canDuplicateCompendiumItem(activeTab, data.id as string, data as { is_system?: boolean | null })

    const cardImage = resolveCompendiumCardImageUrl(
      data as unknown as Record<string, unknown> & CompendiumCardVisual,
      activeTab,
    )
    const portraitGraphicCard = isCompendiumPortraitGraphicCard(activeTab, cardImage)
    const hideCardIcon = hidesCompendiumBrowseCardIcon(activeTab, cardImage)
    const cardMinHeightClass =
      cardImage && !portraitGraphicCard
        ? activeTab === "classes"
          ? COMPENDIUM_CLASS_LIST_CARD_MIN_HEIGHT_CLASS
          : COMPENDIUM_LIST_CARD_MIN_HEIGHT_CLASS
        : null
    const listGradientClass = cardImage
      ? compendiumPortraitListGradientClass(activeTab, cardImage)
      : undefined

    const cardActions = (
      <div
        className={cn(
          "flex items-center gap-1 shrink-0",
          cardImage ? "absolute top-3 right-3 z-20" : "ml-4",
        )}
      >
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
    )

    const cardTitle = (
      <h3
        className={cn(
          "font-bold cursor-pointer leading-tight inline-flex items-center gap-1.5",
          cardImage
            ? cn(
                portraitGraphicCard ? "text-2xl" : "text-[1.6875rem]",
                "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]",
              )
            : "min-w-0 flex-[1_1_8rem] break-words text-lg text-foreground",
          accentStyles.titleHover,
        )}
        onClick={() => setSelectedItem(item)}
      >
        {activeTab === "class_resources"
          ? (classNamesById[castCompendiumRow<ClassResourceRow>(data).class_id] ?? "Unknown class")
          : (data.name as string)}
        {activeTab === "abilities" && isCommonModifiersCatalogAbility(castCompendiumRow<{ id?: string; is_system?: boolean }>(data)) && (
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
    )

    const cardIcon = !hideCardIcon ? (
      <div className={cn("w-10 h-10 shrink-0", cardImage ? accentStyles.imageCardIconText : accentStyles.iconText)}>
        <GameIcon name={iconName} className="w-10 h-10" />
      </div>
    ) : null

    return (
      <motion.div
        key={`${activeTab}-${data.id as string}`}
        layoutId={`${activeTab}-${data.id as string}`}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 transition-colors",
          portraitGraphicCard && CLASS_CARD_ASPECT_CLASS,
          cardMinHeightClass ?? (!cardImage ? "bg-card/55 backdrop-blur-sm" : null),
          enabled
            ? `border-primary/40 ${accentStyles.hoverBorder}`
            : "border-border/50 opacity-50 grayscale saturate-0 hover:opacity-60",
        )}
        whileHover={{ scale: enabled ? 1.02 : 1.01 }}
      >
        {cardImage ? (
          <CompendiumCardHero
            imageUrl={cardImage}
            crop={compendiumCardImageCropForType(activeTab, cardImage)}
            variant="list"
            fullBleed
            listGradientClass={listGradientClass}
            className={!enabled ? "opacity-90" : undefined}
          />
        ) : null}
        <div
          className={cn(
            "relative z-10",
            portraitGraphicCard ? "flex min-h-full flex-col justify-end p-3 pb-10" : "p-5 pb-11",
            cardImage && !portraitGraphicCard && "flex min-h-full flex-col justify-end pt-3",
            cardImage &&
              "[&_.text-foreground]:text-white [&_.text-muted-foreground]:text-white/75 [&_.text-primary]:text-primary [&_.text-secondary]:text-secondary [&_.text-warning]:text-warning [&_.text-orange]:text-orange [&_.text-lime]:text-lime [&_.text-magenta]:text-magenta [&_.text-accent]:text-accent [&_.bg-muted]:bg-black/40 [&_.bg-muted]:text-white/90",
          )}
        >
        {!cardImage ? (
          <>
            <div className="mb-2 space-y-2 sm:hidden">
              <div className="flex items-start justify-between gap-2">
                {cardIcon}
                {cardActions}
              </div>
              {cardTitle}
            </div>
            <div className="mb-2 hidden items-start justify-between gap-2 sm:flex">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                {cardIcon}
                {cardTitle}
              </div>
              {cardActions}
            </div>
          </>
        ) : (
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              {cardIcon}
              {cardTitle}
            </div>
            {cardActions}
          </div>
        )}
        {activeTab === "classes" && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
              {formatCompendiumSource(castCompendiumRow<DndClass>(data).source) || "Custom"}
            </span>
          </div>
        )}
        {activeTab === "subclasses" && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {castCompendiumRow<Subclass>(data).features?.length
                ? castCompendiumRow<Subclass>(data).features!.map((f) => f.name).join(", ")
                : "No features listed"}
            </p>
          </div>
        )}
        {activeTab === "species" && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
              {formatCompendiumSource(castCompendiumRow<Species>(data).source) || "Custom"}
            </span>
          </div>
        )}
        {activeTab === "backgrounds" && (
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                {formatCompendiumSource(castCompendiumRow<Background>(data).source) || "Custom"}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {castCompendiumRow<Background>(data).skill_proficiencies?.slice(0, 2).map((skill) => (
                <span key={skill} className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-full">
                  {skill}
                </span>
              ))}
              {castCompendiumRow<Background>(data).feat_granted && (
                <span className="text-xs px-2 py-1 bg-warning/10 text-warning rounded-full">
                  {castCompendiumRow<Background>(data).feat_granted}
                </span>
              )}
            </div>
          </div>
        )}
        {activeTab === "spells" && (
          <div className="flex gap-2 flex-wrap">
            <span
              className={cn(
                "text-xs px-2 py-1 rounded-full",
                cardImage ? "bg-lime/25 text-lime" : "bg-primary/10 text-primary",
              )}
            >
              {castCompendiumRow<Spell>(data).level === 0 ? "Cantrip" : `Level ${castCompendiumRow<Spell>(data).level}`}
            </span>
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
              {castCompendiumRow<Spell>(data).school}
            </span>
            {castCompendiumRow<Spell>(data).concentration && (
              <span className="text-xs px-2 py-1 bg-warning/10 text-warning rounded-full">
                Concentration
              </span>
            )}
          </div>
        )}
        {activeTab === "feats" && (
          <div className="flex gap-2 flex-wrap">
            <span className={`text-xs px-2 py-1 rounded-full ${
              castCompendiumRow<Feat>(data).category === "Origin" ||
              castCompendiumRow<Feat>(data).category === "Dark Gift"
                ? "bg-lime/10 text-lime"
                : castCompendiumRow<Feat>(data).category === "Epic Boon"
                ? "bg-magenta/10 text-magenta"
                : "bg-primary/10 text-primary"
            }`}>
              {castCompendiumRow<Feat>(data).category || "General"}
            </span>
            {(castCompendiumRow<Feat>(data).level_requirement ?? 1) > 1 && (
              <span className="text-xs px-2 py-1 bg-orange/10 text-orange rounded-full">
                Lvl {castCompendiumRow<Feat>(data).level_requirement}+
              </span>
            )}
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
              {castCompendiumRow<Feat>(data).source || "Custom"}
            </span>
          </div>
        )}
        {activeTab === "equipment" && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
              {castCompendiumRow<Equipment>(data).category}
            </span>
            {castCompendiumRow<Equipment>(data).subcategory && (
              <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full">
                {castCompendiumRow<Equipment>(data).subcategory!.replace(/\s+Weapons$/i, "")}
              </span>
            )}
            {castCompendiumRow<Equipment>(data).cost && (
              <span className="text-xs px-2 py-1 bg-warning/10 text-warning rounded-full">
                {(castCompendiumRow<Equipment>(data).cost as { amount: number; unit: string })?.amount}{" "}
                {(castCompendiumRow<Equipment>(data).cost as { amount: number; unit: string })?.unit}
              </span>
            )}
          </div>
        )}
        {activeTab === "magic_items" && (
          <div className="flex gap-2 flex-wrap">
            {castCompendiumRow<Equipment>(data).rarity && (
              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                {castCompendiumRow<Equipment>(data).rarity}
              </span>
            )}
            {castCompendiumRow<Equipment>(data).magic_item_category && (
              <span className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-full">
                {castCompendiumRow<Equipment>(data).magic_item_category}
              </span>
            )}
            {castCompendiumRow<Equipment>(data).requires_attunement && (
              <span className="text-xs px-2 py-1 bg-orange/10 text-orange rounded-full">
                Attunement
              </span>
            )}
            {castCompendiumRow<Equipment>(data).category && castCompendiumRow<Equipment>(data).category !== "Other" && (
              <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                {castCompendiumRow<Equipment>(data).category}
              </span>
            )}
          </div>
        )}
        {activeTab === "languages" && (
          <div className="flex gap-2 flex-wrap">
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                castCompendiumRow<Language>(data).pool === "rare"
                  ? "bg-magenta/10 text-magenta"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {castCompendiumRow<Language>(data).pool === "rare" ? "Rare" : "Standard"}
            </span>
            {castCompendiumRow<Language>(data).script && (
              <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                {castCompendiumRow<Language>(data).script}
              </span>
            )}
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
              {formatCompendiumSource(castCompendiumRow<Language>(data).source) || "Custom"}
            </span>
          </div>
        )}
        {activeTab === "tools" && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full capitalize">
              {castCompendiumRow<Tool>(data).tool_group.replace(/_/g, " ")}
            </span>
            {castCompendiumRow<Tool>(data).subcategory && (
              <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                {castCompendiumRow<Tool>(data).subcategory}
              </span>
            )}
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full uppercase">
              {castCompendiumRow<Tool>(data).check_ability?.slice(0, 3)}
            </span>
          </div>
        )}
        {activeTab === "class_resources" && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
              {castCompendiumRow<ClassResourceRow>(data).name}
            </span>
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full font-mono">
              {castCompendiumRow<ClassResourceRow>(data).resource_key}
            </span>
            <span className="text-xs px-2 py-1 bg-lime/10 text-lime rounded-full">
              {formatUsesSummary(castCompendiumRow<ClassResourceRow>(data).uses)}
            </span>
          </div>
        )}
        {activeTab === "abilities" && (
          <div className="space-y-2">
            {castCompendiumRow<{ prerequisites?: string }>(data).prerequisites && (
              <p className="text-xs text-orange">
                Prereq: {castCompendiumRow<{ prerequisites: string }>(data).prerequisites}
              </p>
            )}
            {!isCommonModifiersCatalogAbility(castCompendiumRow<{ id?: string; is_system?: boolean }>(data)) && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {stripHtml(castCompendiumRow<{ description?: string }>(data).description ?? "").replace(
                  /\s+/g,
                  " ",
                )}
              </p>
            )}
            {activeTab === "abilities" &&
              isCommonModifiersCatalogAbility(castCompendiumRow<{ id?: string; is_system?: boolean }>(data)) && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {getSystemCatalogMeta(data.id as string)?.info ?? MODIFIER_CATALOG_INFO}
                </p>
              )}
            {castCompendiumRow<{ attached_to_type?: string; attached_to_id?: string }>(data).attached_to_type && (
              <span className="text-xs px-2 py-1 bg-lime/10 text-lime rounded-full">
                {castCompendiumRow<{ attached_to_type: string; attached_to_id?: string }>(data).attached_to_type === "equipment" &&
                castCompendiumRow<{ attached_to_id?: string }>(data).attached_to_id
                  ? `Equipment: ${castCompendiumRow<{ attached_to_id: string }>(data).attached_to_id}`
                  : `For: ${castCompendiumRow<{ attached_to_type: string }>(data).attached_to_type}`}
              </span>
            )}
            {(() => {
              const catalog = castCompendiumRow<{ modifier_catalog?: unknown[] }>(data).modifier_catalog
              const count = Array.isArray(catalog) ? catalog.length : 0
              if (!count) return null
              return (
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                  {count} entr{count === 1 ? "y" : "ies"}
                </span>
              )
            })()}
            {castCompendiumRow<{ ability_role?: string }>(data).ability_role ? (
              <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                {castCompendiumRow<{ ability_role: string }>(data).ability_role.replace(/_/g, " ")}
              </span>
            ) : null}
          </div>
        )}
        </div>
        <div
          className="absolute bottom-4 right-4 z-20 flex items-center rounded-full bg-background/85 p-1 shadow-sm backdrop-blur-sm"
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
          <div className="flex w-full min-w-0 items-center gap-1.5 sm:w-auto sm:gap-2 sm:self-start">
            <label className="sr-only" htmlFor="compendium-mobile-tab-select">
              Compendium section
            </label>
            <select
              id="compendium-mobile-tab-select"
              value={activeTab}
              onChange={(event) => setActiveTab(event.target.value as ContentType)}
              className="min-w-0 flex-1 rounded-lg border-2 border-border bg-card px-2.5 py-2 text-sm font-semibold text-foreground focus:border-primary focus:outline-none sm:hidden"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label} ({tabCounts[tab.id]})
                </option>
              ))}
            </select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-12 sm:w-12"
                  aria-label="Compendium section options"
                >
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
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
                className="hidden shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border-2 border-border bg-card px-5 py-3 font-semibold text-foreground transition-colors hover:bg-muted sm:inline-flex"
              >
                <Upload className="w-5 h-5 shrink-0" />
                Upload class spell list
              </button>
            )}
            <div
              id="compendium-search"
              className="flex shrink-0 items-center gap-1.5 sm:gap-2"
            >
              {!isCompactOnly ? (
                <div className="flex shrink-0 overflow-hidden rounded-lg border border-border">
                  <button
                    type="button"
                    title="Visual cards"
                    aria-pressed={cardLayout === "visual"}
                    onClick={() => setCardLayout("visual")}
                    className={`flex items-center gap-1 px-2 py-2 text-xs font-semibold transition-colors sm:px-2.5 ${
                      cardLayout === "visual"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Visual</span>
                  </button>
                  <button
                    type="button"
                    title="Compact list cards"
                    aria-pressed={cardLayout === "compact"}
                    onClick={() => setCardLayout("compact")}
                    className={`flex items-center gap-1 border-l border-border px-2 py-2 text-xs font-semibold transition-colors sm:px-2.5 ${
                      cardLayout === "compact"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Compact</span>
                  </button>
                </div>
              ) : null}
              <div className="relative w-28 shrink-0 sm:w-36">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground sm:left-3 sm:h-4 sm:w-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search content"
                  className="w-full rounded-lg border-2 border-border bg-card py-2 pl-8 pr-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none sm:pl-9 sm:pr-3"
                />
              </div>
            </div>
            <Link
              href={compendiumEditHref(activeTab, "new")}
              className="inline-flex max-w-[42vw] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:max-w-none sm:gap-2 sm:px-5 sm:py-3"
            >
              <Plus className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
              <span className="truncate">{newItemButtonLabels[activeTab]}</span>
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

        <SpellSchoolsEditorOverlay
          open={spellSchoolsEditorOpen}
          onClose={() => setSpellSchoolsEditorOpen(false)}
          onSaved={(schools) => {
            setSpellSchoolsState(schools)
            if (spellFilterSchool !== "all" && !schools.includes(spellFilterSchool)) {
              setSpellFilterSchool("all")
            }
            void refreshActiveTabContent()
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
                )}
                {activeTab === "spells" && (
                  <> The <strong className="text-foreground">Schools of Magic</strong> list will reset to the SRD defaults.</>
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
                {toggleConfirm.action === "enable"
                  ? `Enable ${toggleConfirm.item.name}?`
                  : `Disable ${toggleConfirm.item.name}?`}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {toggleConfirm.action === "enable"
                  ? `Related compendium entries for this ${COMPENDIUM_TOGGLE_LABELS[toggleConfirm.item.contentType].toLowerCase()} are still disabled. Re-enable only this item, or re-enable them together.`
                  : `Other compendium entries rely on this ${COMPENDIUM_TOGGLE_LABELS[toggleConfirm.item.contentType].toLowerCase()}. You can disable only this item, or disable it together with the related entries below.`}
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
                  onClick={() =>
                    void applyItemEnabled(
                      [toggleConfirm.item],
                      toggleConfirm.action === "enable",
                    )
                  }
                  disabled={toggleSaving}
                  className="flex-1 px-4 py-3 bg-muted text-foreground rounded-xl font-semibold hover:bg-muted/80 transition-colors disabled:opacity-50"
                >
                  {toggleSaving ? "Saving..." : "Only this item"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void applyItemEnabled(
                      [toggleConfirm.item, ...toggleConfirm.dependents],
                      toggleConfirm.action === "enable",
                    )
                  }
                  disabled={toggleSaving}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50",
                    toggleConfirm.action === "enable"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                  )}
                >
                  {toggleSaving
                    ? "Saving..."
                    : toggleConfirm.action === "enable"
                      ? `Enable all (${toggleConfirm.dependents.length + 1})`
                      : `Disable all (${toggleConfirm.dependents.length + 1})`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs — content type selection (desktop) */}
        <div id="compendium-tabs" className="mb-4 hidden flex-wrap gap-1.5 sm:flex">
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
                    <option value="Dark Gift">Dark Gift</option>
                    <option value="General">General</option>
                    <option value="Epic Boon">Epic Boon</option>
                    <option value="Fighting Style">Fighting Style</option>
                    <option value="Planar Pact">Planar Pact</option>
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
                  <button
                    type="button"
                    onClick={() => setSpellSchoolsEditorOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    title="Edit schools of magic"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit Schools of Magic</span>
                  </button>
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

            {activeTab === "backgrounds" && (
              <div id="background-filters" className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  Abilities
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {BACKGROUND_ABILITY_FILTER_OPTIONS.map((ability) => {
                    const selected = backgroundFilterAbilities.includes(ability)
                    return (
                      <button
                        key={ability}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          setBackgroundFilterAbilities((prev) =>
                            selected ? prev.filter((key) => key !== ability) : [...prev, ability],
                          )
                        }
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                          selected
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                        )}
                      >
                        {ability}
                      </button>
                    )
                  })}
                </div>
                {backgroundFilterAbilities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBackgroundFilterAbilities([])}
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
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className={compendiumBrowseGridClass(activeTab)}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card rounded-2xl p-5 border-2 border-border animate-pulse">
                <div className="h-6 bg-muted rounded w-3/4 mb-3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="w-fit max-w-full rounded-2xl border-2 border-border bg-card/80 px-8 py-10 text-center shadow-lg backdrop-blur-md">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <BookOpen className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-foreground">No content found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Try a different search term" : "Import content from the Import page"}
              </p>
            </div>
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
            onToggleEnabled={(row, enabled) =>
              void handleItemEnabledChange(row as unknown as Record<string, unknown>, enabled)
            }
            onCopy={(row) => void handleCopyItem(row as unknown as Record<string, unknown>)}
            copyingId={copyingId}
          />
        ) : (
          <div className={compendiumBrowseGridClass(activeTab)}>
            <AnimatePresence mode="popLayout">
              {filteredContent.map(renderContentCard)}
            </AnimatePresence>
          </div>
        )}
      </main>

      {selectedItem != null && (
        <CompendiumDetailOverlay
          open
          onClose={() => setSelectedItem(null)}
          imageCrop={compendiumCardImageCropForType(activeTab)}
          panelWidth={
            isCompendiumPortraitGraphicCard(
              activeTab,
              resolveCompendiumCardImageUrl(
                selectedItem as CompendiumCardVisual & Record<string, unknown>,
                activeTab,
              ),
            )
              ? activeTab === "spells"
                ? "portrait-spell"
                : activeTab === "species"
                  ? "portrait-species"
                  : "portrait"
              : "default"
          }
          enableCardImage={
            areBrowseCardImagesEnabled() &&
            compendiumItemSupportsCardImage(
              activeTab,
              selectedItem as unknown as Record<string, unknown>,
            )
          }
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
                    : activeTab === "creatures"
                      ? [
                          ...((selectedItem as Creature).category === "companion"
                            ? [{ label: "Companion", emphasis: true }]
                            : []),
                          ...((selectedItem as Creature).cr
                            ? [{ label: `CR ${(selectedItem as Creature).cr}`, emphasis: true }]
                            : []),
                          ...((selectedItem as Creature).creature_type
                            ? [{ label: (selectedItem as Creature).creature_type! }]
                            : []),
                          ...((selectedItem as Creature).size
                            ? [{ label: (selectedItem as Creature).size! }]
                            : []),
                        ]
                : undefined
          }
          accentColor={getCompendiumItemAccentColor(selectedItem as unknown as Record<string, unknown>)}
          headerActions={
            canDuplicateCompendiumItem(
              activeTab,
              (selectedItem as { id: string }).id,
              selectedItem as { is_system?: boolean | null },
            ) ? (
              <button
                type="button"
                onClick={() => void handleCopyItem(selectedItem as unknown as Record<string, unknown>)}
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
          {activeTab === "creatures" && (selectedItem as Creature).stat_block ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <CreatureStatBlockView template={(selectedItem as Creature).stat_block} variant="dark" />
            </div>
          ) : null}
          {activeTab === "abilities" &&
          isCommonModifiersCatalogAbility(selectedItem as { id?: string; is_system?: boolean }) ? (
            <div className="space-y-4">
              <RichTextContent
                html={
                  (selectedItem as { description?: string }).description ??
                  `<p>${getSystemCatalogMeta((selectedItem as { id?: string }).id as string)?.info ?? MODIFIER_CATALOG_INFO}</p>`
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
