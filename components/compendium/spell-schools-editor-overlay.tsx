"use client"

import { useEffect, useState } from "react"
import { Plus, RotateCcw, Trash2, X } from "lucide-react"
import { createClient } from "@/lib/db/client"
import { asCompendiumRows } from "@/lib/data/types"
import {
  DEFAULT_SPELL_SCHOOL_NAMES,
  diffSpellSchoolEditorRows,
  getSpellSchools,
  setSpellSchools,
} from "@/lib/compendium/schools-of-magic"

type SchoolDraftRow = {
  key: string
  originalName: string | null
  name: string
}

type SpellSchoolsEditorOverlayProps = {
  open: boolean
  onClose: () => void
  /** Called after schools are saved (and spell rows updated). */
  onSaved?: (schools: string[]) => void
}

function draftFromStored(): SchoolDraftRow[] {
  return getSpellSchools().map((name, index) => ({
    key: `existing-${index}-${name}`,
    originalName: name,
    name,
  }))
}

async function applySchoolDiffToSpells(diff: {
  removed: string[]
  renamed: Array<{ from: string; to: string }>
}): Promise<void> {
  if (diff.removed.length === 0 && diff.renamed.length === 0) return

  const db = createClient()
  const { data } = await db.from("spells").select("id, school").limit(5000)
  const rows = asCompendiumRows(data) as Array<{ id: string; school?: string | null }>

  const renameMap = new Map(
    diff.renamed.map((entry) => [entry.from.trim().toLowerCase(), entry.to.trim()] as const),
  )
  const removedKeys = new Set(diff.removed.map((name) => name.trim().toLowerCase()))

  for (const row of rows) {
    const current = row.school?.trim() ?? ""
    if (!current) continue
    const key = current.toLowerCase()
    const renamedTo = renameMap.get(key)
    if (renamedTo != null) {
      if (renamedTo !== current) {
        await db.from("spells").update({ school: renamedTo }).eq("id", row.id)
      }
      continue
    }
    if (removedKeys.has(key)) {
      await db.from("spells").update({ school: "" }).eq("id", row.id)
    }
  }
}

export function SpellSchoolsEditorOverlay({
  open,
  onClose,
  onSaved,
}: SpellSchoolsEditorOverlayProps) {
  const [rows, setRows] = useState<SchoolDraftRow[]>(draftFromStored)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setRows(draftFromStored())
    setError(null)
  }, [open])

  if (!open) return null

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const trimmed = rows.map((row) => ({ ...row, name: row.name.trim() }))
      if (trimmed.some((row) => !row.name)) {
        setError("School names can’t be blank. Remove empty rows or fill them in.")
        return
      }
      const keys = trimmed.map((row) => row.name.toLowerCase())
      if (new Set(keys).size !== keys.length) {
        setError("School names must be unique.")
        return
      }

      const { schools, diff } = diffSpellSchoolEditorRows(trimmed)
      await applySchoolDiffToSpells(diff)
      setSpellSchools(schools)
      onSaved?.(schools)
      onClose()
    } catch (err) {
      console.error(err)
      setError("Failed to save schools of magic.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border-2 border-border p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black text-foreground">Schools of Magic</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Add, rename, or remove school labels used on spells. Removing a school clears it from
              spells that used it. Clearing Spells in the compendium resets this list to the SRD
              defaults.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ul className="space-y-2 mb-4">
          {rows.map((row, index) => (
            <li key={row.key} className="flex items-center gap-2">
              <input
                type="text"
                value={row.name}
                onChange={(event) => {
                  const name = event.target.value
                  setRows((prev) =>
                    prev.map((entry, i) => (i === index ? { ...entry, name } : entry)),
                  )
                }}
                className="flex-1 px-3 py-2 bg-muted rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="School name"
              />
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${row.name || "school"}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() =>
              setRows((prev) => [
                ...prev,
                { key: `new-${Date.now()}`, originalName: null, name: "" },
              ])
            }
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted"
          >
            <Plus className="w-4 h-4" />
            Add school
          </button>
          <button
            type="button"
            onClick={() =>
              setRows(
                DEFAULT_SPELL_SCHOOL_NAMES.map((name, index) => ({
                  key: `default-${index}`,
                  originalName: getSpellSchools().find(
                    (existing) => existing.toLowerCase() === name.toLowerCase(),
                  ) ?? null,
                  name,
                })),
              )
            }
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to SRD defaults
          </button>
        </div>

        {error ? <p className="text-sm text-destructive mb-4">{error}</p> : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-card border-2 border-border text-foreground rounded-xl font-semibold hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}
