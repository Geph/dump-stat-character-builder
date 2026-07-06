"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { motion } from "framer-motion"
import { MainNav } from "@/components/main-nav"
import { pageHeaderStatBadgeClass, pageFloatingHintClass } from "@/lib/compendium/editor-field-styles"
import { SiteFooter } from "@/components/site-footer"
import { createClient } from "@/lib/db/client"
import { Plus, User, Trash2, Search, Pencil, Download, Upload } from "lucide-react"
import Link from "next/link"
import { characterSheetHref } from "@/lib/compendium/edit-href"
import type { Character, DndClass, Species, Background } from "@/lib/types"
import {
  characterRowToExportItem,
  downloadCharacterExport,
  parseCharacterExportJson,
  prepareCharacterImportRow,
} from "@/lib/character/character-export-format"
import { asCompendiumRow, asCompendiumRows, castCompendiumRow } from "@/lib/data/types"
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

interface CharacterWithRelations extends Character {
  classes?: DndClass
  species?: Species
  backgrounds?: Background
}

type CreatedSort = "newest" | "oldest"

export default function CharactersPage() {
  const [characters, setCharacters] = useState<CharacterWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterClass, setFilterClass] = useState("all")
  const [filterSpecies, setFilterSpecies] = useState("all")
  const [filterLevel, setFilterLevel] = useState("all")
  const [createdSort, setCreatedSort] = useState<CreatedSort>("newest")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [characterToDelete, setCharacterToDelete] = useState<CharacterWithRelations | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const fetchCharacters = async () => {
    setLoadError(null)
    const db = createClient()

    const { data, error } = await db.from("characters").select("*")

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
    const q = searchQuery.trim().toLowerCase()
    const list = characters.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false
      if (filterClass !== "all" && (c.classes?.name ?? "") !== filterClass) return false
      if (filterSpecies !== "all" && (c.species?.name ?? "") !== filterSpecies) return false
      if (filterLevel !== "all" && c.level !== Number(filterLevel)) return false
      return true
    })

    return [...list].sort((a, b) => {
      const ta = new Date(a.created_at).getTime()
      const tb = new Date(b.created_at).getTime()
      return createdSort === "newest" ? tb - ta : ta - tb
    })
  }, [characters, searchQuery, filterClass, filterSpecies, filterLevel, createdSort])

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-foreground mb-2">My Characters</h1>
            <p className={pageHeaderStatBadgeClass}>
              {loading
                ? "Loading..."
                : hasActiveFilters
                  ? `${filteredCharacters.length} of ${characters.length} characters`
                  : `${characters.length} ${characters.length === 1 ? "character" : "characters"}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
                Export all
              </button>
            )}
            <Link
              href="/builder"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Character
            </Link>
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
          <div className="mb-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-card border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-wrap gap-3">
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
                className="bg-card rounded-2xl border-2 border-border hover:border-primary/50 transition-colors group overflow-hidden"
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
                  <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg">
                    <span className="text-xs font-bold text-white">Lvl {character.level}</span>
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
                <div className="p-4">
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
                        title="Export character JSON"
                      >
                        <Download className="w-4 h-4" />
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
                    <p className="text-xs text-muted-foreground/80 pt-1">
                      Created {formatCreated(character.created_at)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
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
      <SiteFooter />
    </div>
  )
}
