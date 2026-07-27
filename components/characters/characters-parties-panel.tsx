"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { LayoutGrid, Pencil, Plus, Trash2, Users, X } from "lucide-react"
import {
  buildPartyStats,
  normalizePartyCharacterIds,
  normalizePartyRow,
  validatePartyMembers,
  type AdventuringParty,
} from "@/lib/character/party"
import {
  DASHBOARD_MAX_CHARACTERS,
  DASHBOARD_MIN_CHARACTERS,
  dashboardPartyHref,
} from "@/lib/character/dashboard-url"
import { createClient } from "@/lib/db/client"
import { asCompendiumRows } from "@/lib/data/types"
import type { Character } from "@/lib/types"
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

type CharactersPartiesPanelProps = {
  open: boolean
  onClose: () => void
  characters: Character[]
  parties: AdventuringParty[]
  onPartiesChange: (parties: AdventuringParty[]) => void
}

export function CharactersPartiesPanel({
  open,
  onClose,
  characters,
  parties,
  onPartiesChange,
}: CharactersPartiesPanelProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<AdventuringParty | null>(null)
  const [name, setName] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [partyToDelete, setPartyToDelete] = useState<AdventuringParty | null>(null)

  const charactersById = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters],
  )

  const openCreate = () => {
    setEditing(null)
    setName("")
    setSelectedIds([])
    setError(null)
    setEditorOpen(true)
  }

  const openEdit = (party: AdventuringParty) => {
    setEditing(party)
    setName(party.name)
    setSelectedIds(normalizePartyCharacterIds(party.character_ids))
    setError(null)
    setEditorOpen(true)
  }

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((entry) => entry !== id)
      if (prev.length >= DASHBOARD_MAX_CHARACTERS) return prev
      return [...prev, id]
    })
  }

  const saveParty = async () => {
    const validation = validatePartyMembers(selectedIds)
    if (!validation.ok) {
      setError(validation.reason)
      return
    }
    const trimmed = name.trim() || "Unnamed Party"
    setSaving(true)
    setError(null)
    const db = createClient()
    try {
      if (editing) {
        const { data, error: updateError } = await db
          .from("parties")
          .update({ name: trimmed, character_ids: selectedIds })
          .eq("id", editing.id)
          .select("*")
          .single()
        if (updateError || !data) {
          setError(updateError?.message ?? "Could not update party.")
          return
        }
        const next = normalizePartyRow(data as Record<string, unknown>)
        onPartiesChange(parties.map((party) => (party.id === next.id ? next : party)))
      } else {
        const { data, error: insertError } = await db
          .from("parties")
          .insert([{ name: trimmed, character_ids: selectedIds }])
          .select("*")
        if (insertError) {
          setError(insertError.message)
          return
        }
        const rows = asCompendiumRows(data).map((row) => normalizePartyRow(row))
        onPartiesChange([...rows, ...parties])
      }
      setEditorOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!partyToDelete) return
    const db = createClient()
    const { error: deleteError } = await db.from("parties").delete().eq("id", partyToDelete.id)
    if (!deleteError) {
      onPartiesChange(parties.filter((party) => party.id !== partyToDelete.id))
    }
    setPartyToDelete(null)
  }

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex flex-col bg-background"
        role="dialog"
        aria-modal="true"
        aria-labelledby="parties-overlay-title"
      >
        <header className="shrink-0 border-b border-border bg-card/95 backdrop-blur-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
            <div className="min-w-0">
              <h2
                id="parties-overlay-title"
                className="flex items-center gap-2 text-xl font-black text-foreground sm:text-2xl"
              >
                <Users className="h-5 w-5 shrink-0" />
                Adventuring Parties
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Group {DASHBOARD_MIN_CHARACTERS}–{DASHBOARD_MAX_CHARACTERS} characters for the GM
                Dashboard and ally targeting.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-primary bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                New party
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close parties"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6">
            {parties.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                No parties yet. Create one to open the GM Dashboard with a named group.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {parties.map((party) => {
                  const stats = buildPartyStats(party, charactersById)
                  const memberNames = normalizePartyCharacterIds(party.character_ids)
                    .map((id) => charactersById.get(id)?.name ?? "Missing character")
                    .join(", ")
                  return (
                    <div
                      key={party.id}
                      className="space-y-3 rounded-2xl border-2 border-border bg-card p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-foreground">{party.name}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">{memberNames}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Link
                            href={dashboardPartyHref(party.id)}
                            className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Open in GM Dashboard"
                          >
                            <LayoutGrid className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEdit(party)}
                            className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Edit party"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPartyToDelete(party)}
                            className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                            title="Delete party"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted px-2 py-0.5">
                          {stats.memberCount} members
                        </span>
                        {stats.averageLevel != null ? (
                          <span className="rounded-full bg-muted px-2 py-0.5">
                            Avg level {stats.averageLevel}
                          </span>
                        ) : null}
                        {stats.totalCurrentHp != null && stats.totalMaxHp != null ? (
                          <span className="rounded-full bg-muted px-2 py-0.5">
                            HP {stats.totalCurrentHp}/{stats.totalMaxHp}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border-2 border-border bg-card p-4 shadow-2xl">
            <div>
              <h3 className="text-lg font-black">{editing ? "Edit party" : "New party"}</h3>
              <p className="text-xs text-muted-foreground">
                Select {DASHBOARD_MIN_CHARACTERS}–{DASHBOARD_MAX_CHARACTERS} characters.
              </p>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Party name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm"
                placeholder="The Unnamed"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              {characters.map((character) => {
                const selected = selectedIds.includes(character.id)
                const disabled = !selected && selectedIds.length >= DASHBOARD_MAX_CHARACTERS
                return (
                  <button
                    key={character.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleMember(character.id)}
                    className={`rounded-xl border-2 px-3 py-2 text-left text-sm transition-colors ${
                      selected
                        ? "border-primary bg-primary/10"
                        : disabled
                          ? "border-border opacity-40"
                          : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="font-semibold">{character.name}</div>
                    <div className="text-xs text-muted-foreground">Level {character.level}</div>
                  </button>
                )
              })}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveParty()}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save party"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AlertDialog
        open={partyToDelete !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPartyToDelete(null)
        }}
      >
        <AlertDialogContent className="z-[120]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete party?</AlertDialogTitle>
            <AlertDialogDescription>
              {partyToDelete ? (
                <>
                  Remove <span className="font-semibold text-foreground">{partyToDelete.name}</span>?
                  Characters are not deleted.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
