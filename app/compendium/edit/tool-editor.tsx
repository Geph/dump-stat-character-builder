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
import type { ToolCheckAbility, ToolGroup } from "@/lib/types"

interface ToolFormData {
  name: string
  tool_group: ToolGroup
  subcategory: string
  check_ability: ToolCheckAbility
  description: string
  source: string
  creator_url: string
  icon: string | null
  accent_color: string | null
  card_image_url: string | null
}

const defaultTool: ToolFormData = {
  name: "",
  tool_group: "other",
  subcategory: "",
  check_ability: "intelligence",
  description: "",
  source: "Custom",
  creator_url: "",
  icon: null,
  accent_color: null,
  card_image_url: null,
}

const TOOL_GROUPS: { value: ToolGroup; label: string }[] = [
  { value: "artisans", label: "Artisan's Tools" },
  { value: "musical", label: "Musical Instrument" },
  { value: "gaming", label: "Gaming Set" },
  { value: "other", label: "Other Tools" },
  { value: "vehicle", label: "Vehicle" },
]

const CHECK_ABILITIES: { value: ToolCheckAbility; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "dexterity", label: "Dexterity" },
  { value: "intelligence", label: "Intelligence" },
  { value: "wisdom", label: "Wisdom" },
  { value: "charisma", label: "Charisma" },
]

export default function ToolEditor({ id }: { id: string }) {
  const [form, setForm] = useState<ToolFormData>(defaultTool)
  const [loading, setLoading] = useState(id !== "new")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (id === "new") return
    const fetchTool = async () => {
      setLoading(true)
      const db = createClient()
      const { data, error: fetchError } = await db.from("tools").select("*").eq("id", id).single()
      if (fetchError || !data) {
        setError("Tool not found")
      } else {
        setForm({
          name: data.name || "",
          tool_group: (data.tool_group as ToolGroup) || "other",
          subcategory: data.subcategory || "",
          check_ability: (data.check_ability as ToolCheckAbility) || "intelligence",
          description: data.description || "",
          source: data.source || "Custom",
          creator_url: data.creator_url || "",
          icon: data.icon || null,
          accent_color: data.accent_color || null,
          card_image_url: data.card_image_url || null,
        })
      }
      setLoading(false)
    }
    void fetchTool()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const db = createClient()
    const payload = {
      ...form,
      subcategory: form.subcategory.trim() || null,
      description: form.description.trim() || null,
      creator_url: normalizeCreatorUrl(form.creator_url),
    }

    const { error: saveError } =
      id === "new"
        ? await db.from("tools").insert([payload])
        : await db.from("tools").update(payload).eq("id", id)

    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    router.push("/compendium?tab=tools")
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
          title={id === "new" ? "New Tool" : form.name || "Edit Tool"}
          backHref="/compendium?tab=tools"
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
              <label className="block text-sm font-semibold mb-1">Group</label>
              <select
                value={form.tool_group}
                onChange={(e) => setForm({ ...form, tool_group: e.target.value as ToolGroup })}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg"
              >
                {TOOL_GROUPS.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Check ability</label>
              <select
                value={form.check_ability}
                onChange={(e) =>
                  setForm({ ...form, check_ability: e.target.value as ToolCheckAbility })
                }
                className="w-full px-3 py-2 bg-card border border-border rounded-lg"
              >
                {CHECK_ABILITIES.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Subcategory</label>
            <input
              value={form.subcategory}
              onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
              placeholder="e.g. Artisan's Tools"
              className="w-full px-3 py-2 bg-card border border-border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
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
