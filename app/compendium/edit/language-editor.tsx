"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/db/client"
import { CompendiumEditorHeaderRow } from "@/components/compendium/editor-header-row"
import { CompendiumEditorPanel } from "@/components/compendium/compendium-editor-section"
import {
  CompendiumEditorToolbar,
  COMPENDIUM_EDITOR_FORM_ID,
} from "@/components/compendium/editor-toolbar"
import { compendiumFieldClass } from "@/lib/compendium/editor-field-styles"
import { normalizeCreatorUrl } from "@/components/compendium/source-link-field"
import type { LanguagePool } from "@/lib/types"
import { asCompendiumRow, asCompendiumRows, castCompendiumRow } from "@/lib/data/types"
import type { CompendiumThemeColorId } from "@/lib/compendium/theme-colors"

interface LanguageFormData {
  name: string
  pool: LanguagePool
  typical_speakers: string
  script: string
  source: string
  creator_url: string
  icon: string | null
  accent_color: string | null
  card_image_url: string | null
}

const defaultLanguage: LanguageFormData = {
  name: "",
  pool: "standard",
  typical_speakers: "",
  script: "",
  source: "Custom",
  creator_url: "",
  icon: null,
  accent_color: null,
  card_image_url: null,
}

const fieldClass = compendiumFieldClass

export default function LanguageEditor({ id }: { id: string }) {
  const [form, setForm] = useState<LanguageFormData>(defaultLanguage)
  const [loading, setLoading] = useState(id !== "new")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (id === "new") return
    const fetchLanguage = async () => {
      setLoading(true)
      const db = createClient()
      const { data, error: fetchError } = await db.from("languages").select("*").eq("id", id).single()
      if (fetchError || !data) {
        setError("Language not found")
      } else {
        const row = asCompendiumRow(data)
        if (!row) {
          setError("Language not found")
        } else {
          setForm({
            name: String(row.name ?? ""),
            pool: (row.pool === "rare" ? "rare" : "standard") as LanguagePool,
            typical_speakers: String(row.typical_speakers ?? ""),
            script: String(row.script ?? ""),
            source: String(row.source ?? "Custom"),
            creator_url: String(row.creator_url ?? ""),
            icon: (row.icon as string | null) ?? null,
            accent_color: (row.accent_color as string | null) ?? null,
            card_image_url: (row.card_image_url as string | null) ?? null,
          })
        }
      }
      setLoading(false)
    }
    void fetchLanguage()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const db = createClient()
    const payload = {
      ...form,
      typical_speakers: form.typical_speakers.trim() || null,
      script: form.script.trim() || null,
      creator_url: normalizeCreatorUrl(form.creator_url),
    }

    const { error: saveError } =
      id === "new"
        ? await db.from("languages").insert([payload])
        : await db.from("languages").update(payload).eq("id", id)

    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    router.push("/compendium?tab=languages")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">Loading…</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <CompendiumEditorToolbar
        tab="languages"
        title={id === "new" ? "New Language" : "Edit Language"}
        isNew={id === "new"}
        saving={saving}
        saveLabel="Save Language"
      />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error ? (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive">
            {error}
          </div>
        ) : null}

        <form id={COMPENDIUM_EDITOR_FORM_ID} onSubmit={handleSubmit} className="space-y-6">
          <CompendiumEditorHeaderRow
            nameLabel="Language Name"
            name={form.name}
            onNameChange={(name) => setForm({ ...form, name })}
            namePlaceholder="Elvish"
            source={form.source}
            onSourceChange={(source) => setForm({ ...form, source })}
            creatorUrl={form.creator_url}
            onCreatorUrlChange={(creator_url) => setForm({ ...form, creator_url })}
            icon={form.icon}
            onIconChange={(icon) => setForm({ ...form, icon })}
            accentColor={form.accent_color as CompendiumThemeColorId | null}
            onAccentColorChange={(accent_color) => setForm({ ...form, accent_color })}
          />

          <CompendiumEditorPanel title="Language details" className="space-y-4" defaultOpen>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Pool</label>
                <select
                  value={form.pool}
                  onChange={(e) => setForm({ ...form, pool: e.target.value as LanguagePool })}
                  className={fieldClass}
                >
                  <option value="standard">Standard</option>
                  <option value="rare">Rare</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Script</label>
                <input
                  value={form.script}
                  onChange={(e) => setForm({ ...form, script: e.target.value })}
                  placeholder="e.g. Elvish"
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Typical speakers</label>
              <input
                value={form.typical_speakers}
                onChange={(e) => setForm({ ...form, typical_speakers: e.target.value })}
                placeholder="e.g. Elves"
                className={fieldClass}
              />
            </div>
          </CompendiumEditorPanel>
        </form>
      </main>
    </div>
  )
}
