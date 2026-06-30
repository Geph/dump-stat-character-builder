"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/db/client"
import { CompendiumEditorHeaderRow } from "@/components/compendium/editor-header-row"
import {
  CompendiumEditorToolbar,
  COMPENDIUM_EDITOR_FORM_ID,
} from "@/components/compendium/editor-toolbar"
import { normalizeCreatorUrl } from "@/components/compendium/source-link-field"
import type { LanguagePool } from "@/lib/types"

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
        setForm({
          name: data.name || "",
          pool: (data.pool === "rare" ? "rare" : "standard") as LanguagePool,
          typical_speakers: data.typical_speakers || "",
          script: data.script || "",
          source: data.source || "Custom",
          creator_url: data.creator_url || "",
          icon: data.icon || null,
          accent_color: data.accent_color || null,
          card_image_url: data.card_image_url || null,
        })
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
      <main className="max-w-3xl mx-auto px-4 py-8">
        <CompendiumEditorHeaderRow
          title={id === "new" ? "New Language" : form.name || "Edit Language"}
          backHref="/compendium?tab=languages"
        />
        <CompendiumEditorToolbar
          formId={COMPENDIUM_EDITOR_FORM_ID}
          saving={saving}
          error={error}
        />

        <form id={COMPENDIUM_EDITOR_FORM_ID} onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <label className="block text-sm font-semibold mb-1">Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-card border border-border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Pool</label>
              <select
                value={form.pool}
                onChange={(e) => setForm({ ...form, pool: e.target.value as LanguagePool })}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg"
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
                className="w-full px-3 py-2 bg-card border border-border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Typical speakers</label>
            <input
              value={form.typical_speakers}
              onChange={(e) => setForm({ ...form, typical_speakers: e.target.value })}
              placeholder="e.g. Elves"
              className="w-full px-3 py-2 bg-card border border-border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Source</label>
              <input
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Creator URL</label>
              <input
                value={form.creator_url}
                onChange={(e) => setForm({ ...form, creator_url: e.target.value })}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg"
              />
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
