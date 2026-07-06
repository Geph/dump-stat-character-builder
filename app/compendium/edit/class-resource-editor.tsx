"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/db/client"
import { MainNav } from "@/components/main-nav"
import { CompendiumEditorHeaderRow } from "@/components/compendium/editor-header-row"
import {
  CompendiumEditorToolbar,
  COMPENDIUM_EDITOR_FORM_ID,
} from "@/components/compendium/editor-toolbar"
import { UsesConfigEditor } from "@/components/uses-config-editor"
import { RichTextEditor } from "@/components/compendium/rich-text-editor"
import { CompendiumEditorPanel } from "@/components/compendium/compendium-editor-section"
import { normalizeCreatorUrl } from "@/components/compendium/source-link-field"
import { normalizeUsesConfig } from "@/lib/compendium/normalize-uses-config"
import { SRD_CLASS_RESOURCES_BY_NAME } from "@/lib/compendium/class-resources-defaults"
import type { UsesConfig } from "@/lib/types"
import { useDuplicateCompendiumItem } from "@/hooks/use-duplicate-compendium-item"
import { compendiumListHref } from "@/lib/compendium/content-types"

interface ClassResourceFormData {
  class_id: string
  resource_key: string
  name: string
  description: string
  uses: UsesConfig
  source: string
  creator_url: string
  icon: string | null
  accent_color: string | null
  card_image_url: string | null
}

const defaultForm: ClassResourceFormData = {
  class_id: "",
  resource_key: "",
  name: "",
  description: "",
  uses: { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
  source: "Custom",
  creator_url: "",
  icon: null,
  accent_color: null,
  card_image_url: null,
}

export default function ClassResourceEditorPage({ id }: { id: string }) {
  const [form, setForm] = useState<ClassResourceFormData>(defaultForm)
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { handleCopy, copying, copyError, canCopy } = useDuplicateCompendiumItem("class_resources", id)
  const searchParams = useSearchParams()
  const presetClassId = searchParams.get("class_id") ?? ""

  useEffect(() => {
    const fetchClasses = async () => {
      const db = createClient()
      const { data } = await db.from("classes").select("id, name").order("name")
      setClasses(data || [])
    }
    fetchClasses()
  }, [])

  useEffect(() => {
    if (id === "new" && presetClassId) {
      setForm((prev) => ({ ...prev, class_id: presetClassId }))
    }
  }, [id, presetClassId])

  useEffect(() => {
    if (id && id !== "new") {
      const fetchResource = async () => {
        setLoading(true)
        const db = createClient()
        const { data, error } = await db
          .from("class_resources")
          .select("*")
          .eq("id", id)
          .single()

        if (error) {
          setError("Class resource not found")
        } else if (data) {
          setForm({
            class_id: data.class_id || "",
            resource_key: data.resource_key || "",
            name: data.name || "",
            description: data.description || "",
            uses: normalizeUsesConfig((data.uses as UsesConfig) || defaultForm.uses),
            source: data.source || "Custom",
            creator_url: data.creator_url || "",
            icon: data.icon || null,
            accent_color: data.accent_color || null,
            card_image_url: data.card_image_url || null,
          })
        }
        setLoading(false)
      }
      fetchResource()
    }
  }, [id])

  const selectedClassName = classes.find((cls) => cls.id === form.class_id)?.name ?? ""
  const srdDefaults = selectedClassName ? SRD_CLASS_RESOURCES_BY_NAME[selectedClassName] : undefined

  const loadSrdDefaults = () => {
    if (!srdDefaults?.length) return
    const first = srdDefaults[0]
    setForm((prev) => ({
      ...prev,
      resource_key: first.id,
      name: first.name,
      description: first.description ?? "",
      uses: normalizeUsesConfig(first.uses),
      source: "SRD",
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.class_id.trim()) {
      setError("Choose a class for this resource.")
      return
    }
    if (!form.resource_key.trim()) {
      setError("Resource key is required (used to link features).")
      return
    }
    if (!form.name.trim()) {
      setError("Name is required.")
      return
    }

    setSaving(true)
    setError(null)

    const db = createClient()
    const payload = {
      ...form,
      resource_key: form.resource_key.trim().replace(/\s+/g, "_").toLowerCase(),
      creator_url: normalizeCreatorUrl(form.creator_url),
    }

    if (id === "new") {
      const { error } = await db.from("class_resources").insert([payload])
      if (error) {
        setError(error.message || "Failed to create class resource")
        setSaving(false)
        return
      }
    } else {
      const { error } = await db.from("class_resources").update(payload).eq("id", id)
      if (error) {
        setError(error.message || "Failed to update class resource")
        setSaving(false)
        return
      }
    }

    router.push(compendiumListHref("class_resources"))
  }

  const handleDelete = async () => {
    if (id === "new") return
    if (!confirm("Delete this class resource?")) return

    setSaving(true)
    const db = createClient()
    const { error } = await db.from("class_resources").delete().eq("id", id)
    if (error) {
      setError(error.message || "Failed to delete class resource")
      setSaving(false)
      return
    }
    router.push(compendiumListHref("class_resources"))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <CompendiumEditorToolbar
        tab="class_resources"
        title={id === "new" ? "New Class Resource" : "Edit Class Resource"}
        isNew={id === "new"}
        saving={saving}
        saveLabel="Save Resource"
        onCopy={canCopy ? handleCopy : undefined}
        copying={copying}
        onDelete={id !== "new" ? handleDelete : undefined}
      />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {(error || copyError) && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive">
            {error || copyError}
          </div>
        )}
        <form id={COMPENDIUM_EDITOR_FORM_ID} onSubmit={handleSubmit} className="space-y-6">
          <CompendiumEditorHeaderRow
            nameLabel="Resource Name"
            name={form.name}
            onNameChange={(name) => setForm((prev) => ({ ...prev, name }))}
            source={form.source}
            onSourceChange={(source) => setForm((prev) => ({ ...prev, source }))}
            creatorUrl={form.creator_url}
            onCreatorUrlChange={(creator_url) => setForm((prev) => ({ ...prev, creator_url }))}
            icon={form.icon}
            onIconChange={(icon) => setForm((prev) => ({ ...prev, icon }))}
            accentColor={form.accent_color}
            onAccentColorChange={(accent_color) => setForm((prev) => ({ ...prev, accent_color }))}
          />

          <CompendiumEditorPanel title="Resource details">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Class</label>
              <select
                value={form.class_id}
                onChange={(e) => setForm((prev) => ({ ...prev, class_id: e.target.value }))}
                className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                required
              >
                <option value="">Select class…</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-foreground mb-2">Resource key</label>
                <input
                  type="text"
                  value={form.resource_key}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      resource_key: e.target.value.replace(/\s+/g, "_").toLowerCase(),
                    }))
                  }
                  placeholder="rage"
                  className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground font-mono text-sm focus:outline-none focus:border-primary"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Features link to this id (e.g. rage, channel_divinity).
                </p>
              </div>
              {id === "new" && srdDefaults?.length === 1 && (
                <button
                  type="button"
                  onClick={loadSrdDefaults}
                  className="px-3 py-2 text-xs bg-muted text-foreground rounded-lg hover:bg-muted/80 whitespace-nowrap"
                >
                  Load SRD default
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Description</label>
              <RichTextEditor
                value={form.description}
                onChange={(description) => setForm((prev) => ({ ...prev, description }))}
              />
            </div>
          </div>
          </CompendiumEditorPanel>

          <CompendiumEditorPanel title="Uses">
            <UsesConfigEditor
              value={form.uses}
              onChange={(uses) => setForm((prev) => ({ ...prev, uses }))}
            />
          </CompendiumEditorPanel>
        </form>
      </main>
    </div>
  )
}
