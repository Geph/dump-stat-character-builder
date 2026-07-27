"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { pageFloatingHintClass } from "@/lib/compendium/editor-field-styles"
import { SiteFooter } from "@/components/site-footer"
import { DashboardCharacterPicker } from "@/components/dashboard/dashboard-character-picker"
import { DashboardGrid } from "@/components/dashboard/dashboard-character-card"
import { buildDashboardSummaries } from "@/lib/character/build-dashboard-summary"
import {
  dashboardHref,
  dashboardPartyHref,
  filterDashboardIds,
  parseDashboardIdsParam,
  parseDashboardPartyParam,
  validateDashboardSelection,
} from "@/lib/character/dashboard-url"
import { hydrateDashboardCharacters } from "@/lib/character/hydrate-dashboard"
import {
  normalizePartyCharacterIds,
  normalizePartyRow,
  type AdventuringParty,
} from "@/lib/character/party"
import { createClient } from "@/lib/db/client"
import type { Character, DndClass, Species } from "@/lib/types"
import { asCompendiumRows } from "@/lib/data/types"

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
  const urlPartyId = useMemo(
    () => parseDashboardPartyParam(searchParams.get("party")),
    [searchParams],
  )

  const [libraryLoading, setLibraryLoading] = useState(true)
  const [libraryCharacters, setLibraryCharacters] = useState<LibraryCharacter[]>([])
  const [parties, setParties] = useState<AdventuringParty[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>(urlIds)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [unknownIds, setUnknownIds] = useState<string[]>([])

  useEffect(() => {
    const loadLibrary = async () => {
      setLibraryLoading(true)
      setLoadError(null)
      const db = createClient()
      const [charactersResult, partiesResult] = await Promise.all([
        db.from("characters").select("*"),
        db.from("parties").select("*").order("name"),
      ])
      if (charactersResult.error) {
        setLoadError(charactersResult.error.message)
        setLibraryCharacters([])
      } else {
        const sorted = [
          ...(asCompendiumRows<LibraryCharacter & Record<string, unknown>>(
            charactersResult.data,
          ) as LibraryCharacter[]),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setLibraryCharacters(sorted)
      }
      if (!partiesResult.error && partiesResult.data) {
        setParties(asCompendiumRows(partiesResult.data).map((row) => normalizePartyRow(row)))
      } else {
        setParties([])
      }
      setLibraryLoading(false)
    }
    void loadLibrary()
  }, [])

  const knownIdSet = useMemo(
    () => new Set(libraryCharacters.map((character) => character.id)),
    [libraryCharacters],
  )

  const partyResolvedIds = useMemo(() => {
    if (!urlPartyId) return [] as string[]
    const party = parties.find((entry) => entry.id === urlPartyId)
    if (!party) return []
    return normalizePartyCharacterIds(party.character_ids)
  }, [urlPartyId, parties])

  const effectiveUrlIds = useMemo(() => {
    if (partyResolvedIds.length) return partyResolvedIds
    return urlIds
  }, [partyResolvedIds, urlIds])

  useEffect(() => {
    setSelectedIds(effectiveUrlIds)
  }, [effectiveUrlIds])

  const activeDashboardIds = useMemo(() => {
    const { valid, unknown } = filterDashboardIds(effectiveUrlIds, knownIdSet)
    return { valid, unknown }
  }, [effectiveUrlIds, knownIdSet])

  const [summaries, setSummaries] = useState<ReturnType<typeof buildDashboardSummaries>>([])
  const showDashboard =
    !libraryLoading &&
    validateDashboardSelection(activeDashboardIds.valid).ok &&
    activeDashboardIds.valid.length > 0

  const loadDashboard = useCallback(async (ids: string[], mode: "initial" | "refresh") => {
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
  }, [])

  useEffect(() => {
    if (!libraryLoading && activeDashboardIds.unknown.length) {
      setUnknownIds(activeDashboardIds.unknown)
    }
  }, [libraryLoading, activeDashboardIds.unknown])

  useEffect(() => {
    if (urlPartyId && !libraryLoading && parties.length && !partyResolvedIds.length) {
      setLoadError("That party was not found.")
    }
  }, [urlPartyId, libraryLoading, parties.length, partyResolvedIds.length])

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

  const loadParty = (partyId: string) => {
    router.push(dashboardPartyHref(partyId))
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
          <div className="space-y-6">
            {parties.length > 0 ? (
              <div className="space-y-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Load a party
                </h2>
                <div className="flex flex-wrap gap-2">
                  {parties.map((party) => (
                    <button
                      key={party.id}
                      type="button"
                      onClick={() => loadParty(party.id)}
                      className="rounded-full border-2 border-border bg-card px-3 py-1.5 text-sm font-medium hover:border-primary/50"
                    >
                      {party.name}
                      <span className="ml-1 text-muted-foreground">
                        ({normalizePartyCharacterIds(party.character_ids).length})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <DashboardCharacterPicker
              characters={libraryCharacters}
              selectedIds={selectedIds}
              onToggle={toggleSelection}
              onProceed={proceedToDashboard}
              loading={libraryLoading}
            />
          </div>
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
