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
import type { ToolCheckAbility, ToolGroup } from "@/lib/types"
import { asCompendiumRow, asCompendiumRows, castCompendiumRow } from "@/lib/data/types"
import type { CompendiumThemeColorId } from "@/lib/compendium/theme-colors"

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

const fieldClass = compendiumFieldClass

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
        const row = asCompendiumRow(data)
        if (!row) {
          setError("Tool not found")
        } else {
          setForm({
            name: String(row.name ?? ""),
            tool_group: (row.tool_group as ToolGroup) || "other",
            subcategory: String(row.subcategory ?? ""),
            check_ability: (row.check_ability as ToolCheckAbility) || "intelligence",
            description: String(row.description ?? ""),
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
      <CompendiumEditorToolbar
        tab="tools"
        title={id === "new" ? "New Tool" : "Edit Tool"}
        isNew={id === "new"}
        saving={saving}
        saveLabel="Save Tool"
      />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error ? (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive">
            {error}
          </div>
        ) : null}

        <form id={COMPENDIUM_EDITOR_FORM_ID} onSubmit={handleSubmit} className="space-y-6">
          <CompendiumEditorHeaderRow
            nameLabel="Tool Name"
            name={form.name}
            onNameChange={(name) => setForm({ ...form, name })}
            namePlaceholder="Thieves' Tools"
            source={form.source}
            onSourceChange={(source) => setForm({ ...form, source })}
            creatorUrl={form.creator_url}
            onCreatorUrlChange={(creator_url) => setForm({ ...form, creator_url })}
            icon={form.icon}
            onIconChange={(icon) => setForm({ ...form, icon })}
            accentColor={form.accent_color as CompendiumThemeColorId | null}
            onAccentColorChange={(accent_color) => setForm({ ...form, accent_color })}
          />

          <CompendiumEditorPanel title="Tool details" className="space-y-4" defaultOpen>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Group</label>
                <select
                  value={form.tool_group}
                  onChange={(e) => setForm({ ...form, tool_group: e.target.value as ToolGroup })}
                  className={fieldClass}
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
                  className={fieldClass}
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
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className={fieldClass}
              />
            </div>
          </CompendiumEditorPanel>
        </form>
      </main>
    </div>
  )
}
