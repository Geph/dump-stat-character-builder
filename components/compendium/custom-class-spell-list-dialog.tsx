"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Upload, X, Check, AlertTriangle, Loader2 } from "lucide-react"
import { createClient } from "@/lib/db/client"
import { formatCompendiumSource } from "@/lib/srd/source"
import { asCompendiumRow, asCompendiumRows, castCompendiumRow } from "@/lib/data/types"

type ClassOption = { id: string; name: string; source: string }
type SpellRow = { id: string; name: string; classes: string[] }

type PreviewState = {
  /** Spells found in the compendium that will gain the class. */
  toAdd: SpellRow[]
  /** Spells found that already list this class. */
  alreadyOnList: SpellRow[]
  /** Input names with no matching spell in the compendium. */
  missing: string[]
}

type CustomClassSpellListDialogProps = {
  open: boolean
  onClose: () => void
  /** Called after spells are successfully updated so the caller can refresh. */
  onApplied?: () => void
}

/** Parse a pasted/uploaded list into distinct, trimmed spell names. */
function parseSpellNames(raw: string): string[] {
  const fromJson = tryParseJsonNames(raw)
  const lines = fromJson ?? raw.split(/[\r\n,]+/)
  const seen = new Set<string>()
  const names: string[] = []
  for (const line of lines) {
    const cleaned = line
      .replace(/^[\s*\-•\d.)]+/, "")
      .replace(/[*_`]+/g, "")
      .trim()
    if (!cleaned) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    names.push(cleaned)
  }
  return names
}

function tryParseJsonNames(raw: string): string[] | null {
  const trimmed = raw.trim()
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return null
  try {
    const parsed = JSON.parse(trimmed)
    const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.spells) ? parsed.spells : null
    if (!arr) return null
    return arr
      .map((entry: unknown) =>
        typeof entry === "string"
          ? entry
          : typeof (entry as { name?: unknown })?.name === "string"
            ? (entry as { name: string }).name
            : "",
      )
      .filter(Boolean)
  } catch {
    return null
  }
}

export function CustomClassSpellListDialog({
  open,
  onClose,
  onApplied,
}: CustomClassSpellListDialogProps) {
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [spells, setSpells] = useState<SpellRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState("")
  const [rawList, setRawList] = useState("")
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [applying, setApplying] = useState(false)
  const [appliedCount, setAppliedCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const load = async () => {
      setLoading(true)
      setError(null)
      const db = createClient()
      const [{ data: classRows }, { data: spellRows }] = await Promise.all([
        db.from("classes").select("id, name, source").order("name"),
        db.from("spells").select("id, name, classes").order("name").limit(2000),
      ])
      setClasses(
        asCompendiumRows<{ id: string; name: string; source: string }>(classRows).map((row) => ({
          id: row.id,
          name: row.name,
          source: row.source ?? "Custom",
        })),
      )
      setSpells(
        asCompendiumRows<{ id: string; name: string; classes: string[] }>(spellRows).map((row) => ({
          id: row.id,
          name: row.name ?? "",
          classes: (row.classes ?? []).filter(Boolean),
        })),
      )
      setLoading(false)
    }
    load()
  }, [open])

  useEffect(() => {
    if (!open) {
      setSelectedClassId("")
      setRawList("")
      setPreview(null)
      setAppliedCount(null)
      setError(null)
    }
  }, [open])

  const selectedClass = useMemo(
    () => classes.find((cls) => cls.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  )

  const spellsByName = useMemo(() => {
    const map = new Map<string, SpellRow>()
    for (const spell of spells) {
      map.set(spell.name.trim().toLowerCase(), spell)
    }
    return map
  }, [spells])

  const parsedNames = useMemo(() => parseSpellNames(rawList), [rawList])

  const computePreview = () => {
    if (!selectedClass) {
      setError("Select a class first.")
      return
    }
    if (parsedNames.length === 0) {
      setError("Paste or upload a list of spell names.")
      return
    }
    setError(null)
    setAppliedCount(null)

    const className = selectedClass.name
    const toAdd: SpellRow[] = []
    const alreadyOnList: SpellRow[] = []
    const missing: string[] = []

    for (const name of parsedNames) {
      const spell = spellsByName.get(name.toLowerCase())
      if (!spell) {
        missing.push(name)
        continue
      }
      const hasClass = spell.classes.some((c) => c.toLowerCase() === className.toLowerCase())
      if (hasClass) alreadyOnList.push(spell)
      else toAdd.push(spell)
    }

    setPreview({ toAdd, alreadyOnList, missing })
  }

  const handleFile = async (file: File | null) => {
    if (!file) return
    const text = await file.text()
    setRawList(text)
    setPreview(null)
    setAppliedCount(null)
  }

  const handleApply = async () => {
    if (!selectedClass || !preview || preview.toAdd.length === 0) return
    setApplying(true)
    setError(null)
    const db = createClient()
    const className = selectedClass.name

    const results = await Promise.all(
      preview.toAdd.map((spell) =>
        db
          .from("spells")
          .update({ classes: [...spell.classes, className] })
          .eq("id", spell.id),
      ),
    )

    const failed = results.filter((res) => (res as { error?: unknown }).error)
    setApplying(false)

    if (failed.length > 0) {
      setError(`Failed to update ${failed.length} spell(s). Please try again.`)
      return
    }

    setAppliedCount(preview.toAdd.length)
    // Reflect the change locally so a re-preview shows them as already on the list.
    setSpells((prev) =>
      prev.map((spell) =>
        preview.toAdd.some((entry) => entry.id === spell.id)
          ? { ...spell, classes: [...spell.classes, className] }
          : spell,
      ),
    )
    setPreview((prev) =>
      prev
        ? {
            toAdd: [],
            alreadyOnList: [...prev.alreadyOnList, ...prev.toAdd],
            missing: prev.missing,
          }
        : prev,
    )
    onApplied?.()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border-2 border-border w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">Upload Custom Class Spell List</h2>
              <p className="text-sm text-muted-foreground">
                Tie an existing class to spells already in the compendium.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Class selection */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Class</label>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading classes…</p>
            ) : classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No classes in the compendium yet. Create the class first.
              </p>
            ) : (
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value)
                  setPreview(null)
                  setAppliedCount(null)
                }}
                className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">Select a class…</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({formatCompendiumSource(cls.source)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Spell list input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-foreground">
                Spell list
                <span className="ml-1 font-normal text-muted-foreground">
                  (one name per line)
                </span>
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv,.json,text/plain"
                className="hidden"
                onChange={(e) => {
                  void handleFile(e.target.files?.[0] ?? null)
                  e.target.value = ""
                }}
              />
            </div>
            <textarea
              value={rawList}
              onChange={(e) => {
                setRawList(e.target.value)
                setPreview(null)
                setAppliedCount(null)
              }}
              rows={8}
              placeholder={"Fire Bolt\nMage Hand\nShield\nMagic Missile"}
              className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary text-sm font-mono"
            />
            {parsedNames.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {parsedNames.length} spell name{parsedNames.length === 1 ? "" : "s"} detected. Plain
                text, CSV, or a JSON array of names all work.
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
              {error}
            </div>
          )}

          {appliedCount !== null && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              Added {selectedClass?.name} to {appliedCount} spell
              {appliedCount === 1 ? "" : "s"}.
            </div>
          )}

          {/* Preview results */}
          {preview && (
            <div className="space-y-3">
              {preview.toAdd.length > 0 && (
                <PreviewGroup
                  tone="add"
                  title={`Will add ${selectedClass?.name} to ${preview.toAdd.length} spell${
                    preview.toAdd.length === 1 ? "" : "s"
                  }`}
                  items={preview.toAdd.map((s) => s.name)}
                />
              )}
              {preview.alreadyOnList.length > 0 && (
                <PreviewGroup
                  tone="info"
                  title={`${preview.alreadyOnList.length} already on ${selectedClass?.name}'s list`}
                  items={preview.alreadyOnList.map((s) => s.name)}
                />
              )}
              {preview.missing.length > 0 && (
                <PreviewGroup
                  tone="warn"
                  title={`${preview.missing.length} not found in the compendium`}
                  items={preview.missing}
                  note="These spells don't exist yet. Create them as spells first, then re-run this to add them to the class list."
                />
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-card border-2 border-border text-foreground rounded-xl font-semibold hover:bg-muted transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={computePreview}
            disabled={!selectedClass || parsedNames.length === 0 || loading}
            className="flex-1 px-4 py-3 bg-muted text-foreground rounded-xl font-semibold hover:bg-muted/80 transition-colors disabled:opacity-50"
          >
            Match spells
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!preview || preview.toAdd.length === 0 || applying}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {applying && <Loader2 className="w-4 h-4 animate-spin" />}
            {preview && preview.toAdd.length > 0
              ? `Add to ${preview.toAdd.length} spell${preview.toAdd.length === 1 ? "" : "s"}`
              : "Add to list"}
          </button>
        </div>
      </div>
    </div>
  )
}

function PreviewGroup({
  tone,
  title,
  items,
  note,
}: {
  tone: "add" | "info" | "warn"
  title: string
  items: string[]
  note?: string
}) {
  const toneClasses =
    tone === "add"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : tone === "warn"
        ? "border-amber-500/40 bg-amber-500/5"
        : "border-border bg-muted/30"
  const Icon = tone === "warn" ? AlertTriangle : Check
  const iconColor =
    tone === "add"
      ? "text-emerald-500"
      : tone === "warn"
        ? "text-amber-500"
        : "text-muted-foreground"

  return (
    <div className={`rounded-xl border p-3 ${toneClasses}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      {note && <p className="text-xs text-muted-foreground mb-2">{note}</p>}
      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
        {items.map((item) => (
          <span
            key={item}
            className="px-2 py-0.5 bg-background border border-border rounded-full text-xs text-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
