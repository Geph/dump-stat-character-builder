"use client"

import { useState, useEffect, useMemo, useRef, useDeferredValue } from "react"
import { motion } from "framer-motion"
import { MainNav } from "@/components/main-nav"
import { pageHeaderStatBadgeClass, pageFloatingHintClass } from "@/lib/compendium/editor-field-styles"
import { SiteFooter } from "@/components/site-footer"
import { createClient } from "@/lib/db/client"
import { Plus, User, Trash2, Pencil, Download, Upload, Users, Award } from "lucide-react"
import { LevelUpWizard } from "@/components/character-sheet/level-up-wizard"
import Link from "next/link"
import { characterSheetHref } from "@/lib/compendium/edit-href"
import type { Character, DndClass, Species, Background, Subclass } from "@/lib/types"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import {
  characterRowToExportItem,
  downloadCharacterExport,
  parseCharacterExportJson,
  prepareCharacterImportRow,
} from "@/lib/character/character-export-format"
import { asCompendiumRow, asCompendiumRows, castCompendiumRow } from "@/lib/data/types"
import { CharactersPartiesPanel } from "@/components/characters/characters-parties-panel"
import {
  normalizePartyRow,
  type AdventuringParty,
} from "@/lib/character/party"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SearchBox } from "@/components/search/search-box"
import { rankSearchResults, searchItems } from "@/lib/search/ranked-search"

interface CharacterWithRelations extends Character {
  classes?: DndClass
  class_list?: CharacterClassDetail[]
  subclasses?: Subclass
  species?: Species
  backgrounds?: Background
}

type CreatedSort = "newest" | "oldest"

function characterLevelClassLabel(character: CharacterWithRelations): string {
  const details = (character.class_list ?? []).filter((entry) => entry.class?.name)
  if (details.length === 1) {
    return `Lvl ${details[0].row.level} ${details[0].class!.name}`
  }
  if (details.length > 1) {
    return `Lvl ${details.map((entry) => `${entry.row.level} ${entry.class!.name}`).join(" / ")}`
  }
  return `Lvl ${character.level} ${character.classes?.name || "Adventurer"}`
}

function characterMetaBadges(character: CharacterWithRelations): string[] {
  const subclassName =
    character.subclasses?.name ||
    character.class_list?.find((entry) => entry.row.class_id === character.class_id)?.subclass
      ?.name ||
    character.class_list?.find((entry) => entry.subclass?.name)?.subclass?.name ||
    null
  return [subclassName, character.species?.name, character.backgrounds?.name].filter(
    (label): label is string => Boolean(label),
  )
}

export default function CharactersPage() {
  const [characters, setCharacters] = useState<CharacterWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [filterClass, setFilterClass] = useState("all")
  const [filterSpecies, setFilterSpecies] = useState("all")
  const [filterLevel, setFilterLevel] = useState("all")
  const [createdSort, setCreatedSort] = useState<CreatedSort>("newest")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [characterToDelete, setCharacterToDelete] = useState<CharacterWithRelations | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [parties, setParties] = useState<AdventuringParty[]>([])
  const [partiesOpen, setPartiesOpen] = useState(false)
  const [levelUpCharacterId, setLevelUpCharacterId] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const fetchCharacters = async () => {
    setLoadError(null)
    const db = createClient()

    const [{ data, error }, partiesResult] = await Promise.all([
      db.from("characters").select("*"),
      db.from("parties").select("*").order("name"),
    ])

    if (error) {
      const message = error.message || "Could not load characters from the database."
      setLoadError(message)
      console.error("Failed to load characters:", message)
    } else if (data) {
      const sorted = [...asCompendiumRows<CharacterWithRelations & Record<string, unknown>>(data)].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      setCharacters(sorted)
    }

    if (!partiesResult.error && partiesResult.data) {
      setParties(
        asCompendiumRows(partiesResult.data)
          .map((row) => normalizePartyRow(row))
          .sort((a, b) => a.name.localeCompare(b.name)),
      )
    }
    setLoading(false)
  }

  useEffect(() => {
    void fetchCharacters()
  }, [])

  const classOptions = useMemo(
    () =>
      Array.from(
        new Set(characters.map((c) => c.classes?.name).filter(Boolean) as string[]),
      ).sort(),
    [characters],
  )

  const speciesOptions = useMemo(
    () =>
      Array.from(
        new Set(characters.map((c) => c.species?.name).filter(Boolean) as string[]),
      ).sort(),
    [characters],
  )

  const levelOptions = useMemo(
    () =>
      Array.from(new Set(characters.map((c) => c.level)))
        .sort((a, b) => a - b),
    [characters],
  )

  const filteredCharacters = useMemo(() => {
    const faceted = characters.filter((c) => {
      if (filterClass !== "all" && (c.classes?.name ?? "") !== filterClass) return false
      if (filterSpecies !== "all" && (c.species?.name ?? "") !== filterSpecies) return false
      if (filterLevel !== "all" && c.level !== Number(filterLevel)) return false
      return true
    })
    const list = searchItems(faceted, deferredSearchQuery, {
      name: (character) => character.name,
      fields: [
        { name: "class", value: (character) => character.classes?.name, weight: 1.4 },
        { name: "species", value: (character) => character.species?.name, weight: 1.3 },
        { name: "background", value: (character) => character.backgrounds?.name, weight: 1.1 },
        { name: "level", value: (character) => `level ${character.level}`, weight: 1 },
      ],
    })

    return [...list].sort((a, b) => {
      const ta = new Date(a.created_at).getTime()
      const tb = new Date(b.created_at).getTime()
      return createdSort === "newest" ? tb - ta : ta - tb
    })
  }, [characters, deferredSearchQuery, filterClass, filterSpecies, filterLevel, createdSort])

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    filterClass !== "all" ||
    filterSpecies !== "all" ||
    filterLevel !== "all" ||
    createdSort !== "newest"

  const clearFilters = () => {
    setSearchQuery("")
    setFilterClass("all")
    setFilterSpecies("all")
    setFilterLevel("all")
    setCreatedSort("newest")
  }

  const confirmDeleteCharacter = async () => {
    if (!characterToDelete) return

    const id = characterToDelete.id
    const db = createClient()
    const { error } = await db.from("characters").delete().eq("id", id)

    if (!error) {
      setCharacters((prev) => prev.filter((c) => c.id !== id))
    }
    setCharacterToDelete(null)
  }

  const handleExportCharacter = (character: CharacterWithRelations) => {
    downloadCharacterExport(
      characterRowToExportItem(character as unknown as unknown as Record<string, unknown>),
    )
  }

  const handleExportAll = () => {
    if (!characters.length) return
    downloadCharacterExport(
      characters.map((character) =>
        characterRowToExportItem(character as unknown as unknown as Record<string, unknown>),
      ),
    )
  }

  const handleImportFile = async (file: File) => {
    setImporting(true)
    setImportStatus(null)
    try {
      const items = parseCharacterExportJson(await file.text())
      if (!items?.length) {
        setImportStatus("Invalid character JSON. Expected a dnd-character export file.")
        return
      }

      const db = createClient()
      let imported = 0
      for (const item of items) {
        const row = prepareCharacterImportRow(item)
        const { error } = await db.from("characters").insert([row])
        if (error) throw new Error(error.message)
        imported++
      }

      await fetchCharacters()
      setImportStatus(
        imported === 1 ? "Imported 1 character." : `Imported ${imported} characters.`,
      )
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : "Character import failed.")
    } finally {
      setImporting(false)
      if (importInputRef.current) importInputRef.current.value = ""
    }
  }

  const formatCreated = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MainNav />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-4xl font-black text-foreground mb-2">My Characters</h1>
            <p className={pageHeaderStatBadgeClass}>
              {loading
                ? "Loading..."
                : hasActiveFilters
                  ? `${filteredCharacters.length} of ${characters.length} characters`
                  : `${characters.length} ${characters.length === 1 ? "character" : "characters"}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleImportFile(file)
              }}
            />

            {/* Compact actions — this width and below */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-3 bg-card border-2 border-border text-foreground rounded-xl font-bold hover:border-primary transition-colors 2xl:hidden"
                  aria-label="Manage"
                >
                  Manage
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  disabled={importing}
                  onClick={() => importInputRef.current?.click()}
                  className="gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  {importing ? "Importing…" : "Import JSON"}
                </DropdownMenuItem>
                {characters.length > 0 ? (
                  <DropdownMenuItem onClick={handleExportAll} className="gap-2 cursor-pointer">
                    <Download className="w-4 h-4" />
                    Download all
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onClick={() => setPartiesOpen(true)}
                  className="gap-2 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  Adventuring Parties
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                  <Link href="/builder">
                    <Plus className="w-4 h-4" />
                    New Character
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Full action row — wide screens only */}
            <div className="hidden items-center gap-2 2xl:flex">
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-3 bg-card border-2 border-border text-foreground rounded-xl font-bold hover:border-primary transition-colors disabled:opacity-60"
              >
                <Upload className="w-5 h-5" />
                {importing ? "Importing…" : "Import JSON"}
              </button>
              {characters.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportAll}
                  className="flex items-center gap-2 px-4 py-3 bg-card border-2 border-border text-foreground rounded-xl font-bold hover:border-primary transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download all
                </button>
              )}
              <button
                type="button"
                onClick={() => setPartiesOpen(true)}
                className="flex items-center gap-2 px-4 py-3 bg-card border-2 border-border text-foreground rounded-xl font-bold hover:border-primary transition-colors"
              >
                <Users className="w-5 h-5" />
                Adventuring Parties
              </button>
              <Link
                href="/builder"
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Character
              </Link>
            </div>
          </div>
        </div>

        {importStatus && (
          <div
            role="status"
            className="mb-6 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground"
          >
            {importStatus}
          </div>
        )}

        {loadError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground"
          >
            <p className="font-semibold">Could not load characters</p>
            <p className="mt-1 text-muted-foreground">{loadError}</p>
            {loadError.includes("schema is out of date") && (
              <p className="mt-2 text-xs text-muted-foreground">
                Run <code className="font-mono">npm run db:migrate</code> in the project root, then refresh.
              </p>
            )}
          </div>
        )}

        {!loading && characters.length > 0 && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
            <SearchBox
              value={searchQuery}
              onChange={setSearchQuery}
              suggestions={rankSearchResults(characters, deferredSearchQuery, {
                name: (character) => character.name,
                fields: [
                  { name: "class", value: (character) => character.classes?.name, weight: 1.4 },
                  { name: "species", value: (character) => character.species?.name, weight: 1.3 },
                ],
                limit: 8,
              }).map((match) => ({
                id: match.item.id,
                label: match.item.name,
                detail: [match.item.classes?.name, match.item.species?.name]
                  .filter(Boolean)
                  .join(" · "),
                item: match.item,
                matchKind: match.kind,
              }))}
              onSelect={(suggestion) => setSearchQuery(suggestion.label)}
              scope="characters"
              placeholder="Search characters…"
              ariaLabel="Search characters"
              className="w-full sm:max-w-md sm:flex-1"
              inputClassName="py-3"
            />
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:shrink-0">
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-3 py-2 bg-card border-2 border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary"
                aria-label="Filter by class"
              >
                <option value="all">All classes</option>
                {classOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <select
                value={filterSpecies}
                onChange={(e) => setFilterSpecies(e.target.value)}
                className="px-3 py-2 bg-card border-2 border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary"
                aria-label="Filter by species"
              >
                <option value="all">All species</option>
                {speciesOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="px-3 py-2 bg-card border-2 border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary"
                aria-label="Filter by level"
              >
                <option value="all">All levels</option>
                {levelOptions.map((level) => (
                  <option key={level} value={String(level)}>Level {level}</option>
                ))}
              </select>
              <select
                value={createdSort}
                onChange={(e) => setCreatedSort(e.target.value as CreatedSort)}
                className="px-3 py-2 bg-card border-2 border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary"
                aria-label="Sort by creation date"
              >
                <option value="newest">Created: newest first</option>
                <option value="oldest">Created: oldest first</option>
              </select>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className={`${pageFloatingHintClass} cursor-pointer hover:bg-card transition-colors`}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}

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
            <p className={`${pageFloatingHintClass} mb-6 mx-auto`}>
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
        ) : filteredCharacters.length === 0 ? (
          <div className="text-center py-16">
            <p className={`${pageFloatingHintClass} mb-4`}>No characters match your filters.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="text-primary font-semibold hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredCharacters.map((character, index) => (
              <motion.div
                key={character.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-border transition-colors hover:border-primary/50"
              >
                {/* Large Portrait as main focus */}
                <Link href={characterSheetHref(character.id)} className="block relative aspect-square">
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
                  <div className="absolute top-3 left-3 max-w-[calc(100%-3.25rem)] px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg">
                    <span className="line-clamp-2 text-xs font-bold leading-tight text-white">
                      {characterLevelClassLabel(character)}
                    </span>
                  </div>
                  {/* Delete button overlay */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setCharacterToDelete(character)
                    }}
                    className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-sm rounded-lg text-white/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete character"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Link>
                
                {/* Character Info - Below the image */}
                <div className="flex-1 p-4 bg-card/75 backdrop-blur">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={characterSheetHref(character.id)} className="min-w-0 flex-1">
                      <h3 className="font-bold text-lg text-foreground truncate hover:text-primary transition-colors">
                        {character.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleExportCharacter(character)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Download JSON"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLevelUpCharacterId(character.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Level up"
                      >
                        <Award className="w-4 h-4" />
                      </button>
                      <Link
                        href={`/builder?edit=${character.id}`}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Edit character"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {characterMetaBadges(character).map((label) => (
                      <span
                        key={label}
                        className="inline-flex max-w-full items-center rounded-full border border-border/60 bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                      >
                        <span className="truncate">{label}</span>
                      </span>
                    ))}
                    <span className="inline-flex max-w-full items-center rounded-full border border-border/40 bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground/80">
                      <span className="truncate">Created {formatCreated(character.created_at)}</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!loading ? (
          <CharactersPartiesPanel
            open={partiesOpen}
            onClose={() => setPartiesOpen(false)}
            characters={characters}
            parties={parties}
            onPartiesChange={setParties}
          />
        ) : null}
      </main>

      <AlertDialog
        open={characterToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setCharacterToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete character?</AlertDialogTitle>
            <AlertDialogDescription>
              {characterToDelete ? (
                <>
                  Are you sure you want to permanently delete{" "}
                  <span className="font-semibold text-foreground">{characterToDelete.name}</span>? This
                  cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteCharacter}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {levelUpCharacterId ? (
        <LevelUpWizard
          characterId={levelUpCharacterId}
          open
          onClose={() => setLevelUpCharacterId(null)}
          onComplete={() => void fetchCharacters()}
        />
      ) : null}
      <SiteFooter />
    </div>
  )
}
