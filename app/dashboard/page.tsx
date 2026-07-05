"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { pageFloatingHintClass } from "@/lib/compendium/editor-field-styles"
import { SiteFooter } from "@/components/site-footer"
import {
  DashboardCharacterPicker,
} from "@/components/dashboard/dashboard-character-picker"
import { DashboardGrid } from "@/components/dashboard/dashboard-character-card"
import { buildDashboardSummaries } from "@/lib/character/build-dashboard-summary"
import {
  dashboardHref,
  filterDashboardIds,
  parseDashboardIdsParam,
  validateDashboardSelection,
} from "@/lib/character/dashboard-url"
import { hydrateDashboardCharacters } from "@/lib/character/hydrate-dashboard"
import { createClient } from "@/lib/db/client"
import type { Character, DndClass, Species } from "@/lib/types"

type LibraryCharacter = Character & {
  classes?: DndClass | null
  species?: Species | null
}

function DashboardPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlIds = useMemo(
    () => parseDashboardIdsParam(searchParams.get("ids")),
    [searchParams],
  )

  const [libraryLoading, setLibraryLoading] = useState(true)
  const [libraryCharacters, setLibraryCharacters] = useState<LibraryCharacter[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>(urlIds)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [unknownIds, setUnknownIds] = useState<string[]>([])

  useEffect(() => {
    setSelectedIds(urlIds)
  }, [urlIds])

  useEffect(() => {
    const loadLibrary = async () => {
      setLibraryLoading(true)
      setLoadError(null)
      const db = createClient()
      const { data, error } = await db.from("characters").select("*")
      if (error) {
        setLoadError(error.message)
        setLibraryCharacters([])
      } else {
        const sorted = [...((data ?? []) as LibraryCharacter[])].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        setLibraryCharacters(sorted)
      }
      setLibraryLoading(false)
    }
    void loadLibrary()
  }, [])

  const knownIdSet = useMemo(
    () => new Set(libraryCharacters.map((character) => character.id)),
    [libraryCharacters],
  )

  const activeDashboardIds = useMemo(() => {
    const { valid, unknown } = filterDashboardIds(urlIds, knownIdSet)
    return { valid, unknown }
  }, [urlIds, knownIdSet])

  const [summaries, setSummaries] = useState<ReturnType<typeof buildDashboardSummaries>>([])
  const showDashboard =
    !libraryLoading &&
    validateDashboardSelection(activeDashboardIds.valid).ok &&
    activeDashboardIds.valid.length > 0

  const loadDashboard = useCallback(
    async (ids: string[], mode: "initial" | "refresh") => {
      if (!validateDashboardSelection(ids).ok) return
      if (mode === "initial") setDashboardLoading(true)
      else setRefreshing(true)
      setLoadError(null)

      try {
        const db = createClient()
        const hydrated = await hydrateDashboardCharacters(db, ids)
        setSummaries(buildDashboardSummaries(hydrated))
        setUnknownIds([])
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Could not load dashboard.")
      } finally {
        if (mode === "initial") setDashboardLoading(false)
        else setRefreshing(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (!libraryLoading && activeDashboardIds.unknown.length) {
      setUnknownIds(activeDashboardIds.unknown)
    }
  }, [libraryLoading, activeDashboardIds.unknown])

  useEffect(() => {
    if (!showDashboard) {
      setSummaries([])
      return
    }
    void loadDashboard(activeDashboardIds.valid, "initial")
  }, [showDashboard, activeDashboardIds.valid, loadDashboard])

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((entry) => entry !== id)
      if (prev.length >= 6) return prev
      return [...prev, id]
    })
  }

  const proceedToDashboard = () => {
    const validation = validateDashboardSelection(selectedIds)
    if (!validation.ok) return
    router.push(dashboardHref(selectedIds))
  }

  const returnToPicker = () => {
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MainNav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-foreground">GM Dashboard</h1>
        </div>

        {loadError ? (
          <div
            role="alert"
            className="mb-6 rounded-xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
          >
            {loadError}
          </div>
        ) : null}

        {unknownIds.length > 0 ? (
          <div className="mb-6 rounded-xl border-2 border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
            Some characters in this link were not found and were skipped: {unknownIds.join(", ")}
          </div>
        ) : null}

        {showDashboard ? (
          dashboardLoading ? (
            <p className={pageFloatingHintClass}>Loading dashboard…</p>
          ) : (
            <DashboardGrid
              summaries={summaries}
              refreshing={refreshing}
              onRefresh={() => void loadDashboard(activeDashboardIds.valid, "refresh")}
              onChangeSelection={returnToPicker}
            />
          )
        ) : (
          <DashboardCharacterPicker
            characters={libraryCharacters}
            selectedIds={selectedIds}
            onToggle={toggleSelection}
            onProceed={proceedToDashboard}
            loading={libraryLoading}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className={pageFloatingHintClass}>Loading GM Dashboard…</p>
        </div>
      }
    >
      <DashboardPageInner />
    </Suspense>
  )
}
