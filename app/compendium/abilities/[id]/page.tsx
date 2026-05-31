"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Save, Trash2, Download } from "lucide-react"
import Link from "next/link"
import { CharacteristicModifiersEditor } from "@/components/characteristic-modifiers-editor"
import {
  extractUsesConfig,
  normalizeCharacteristics,
  type CharacteristicModifier,
} from "@/lib/compendium/characteristic-modifiers"
import { GameIconPicker } from "@/components/game-icon-picker"
import { attachTypeToTable } from "@/lib/db/attach-target-table"
import {
  EQUIPMENT_ATTACH_CATEGORIES,
  isEquipmentCategoryAttach,
} from "@/lib/compendium/attach-targets"

interface AbilityFormData {
  name: string
  description: string
  prerequisites: string
  characteristics: CharacteristicModifier[]
  attached_to_type: string
  attached_to_id: string
  show_in_builder: boolean
  source: string
  icon: string | null
}

const defaultAbility: AbilityFormData = {
  name: "",
  description: "",
  prerequisites: "",
  characteristics: [],
  attached_to_type: "",
  attached_to_id: "",
  show_in_builder: false,
  source: "Custom",
  icon: null,
}

const ATTACH_OPTIONS = [
  { value: "", label: "None (Standalone)" },
  { value: "class", label: "Class" },
  { value: "species", label: "Species" },
  { value: "background", label: "Background" },
  { value: "feat", label: "Feat" },
  { value: "equipment", label: "Equipment" },
  { value: "spell", label: "Spell" },
  { value: "ability", label: "Custom Ability" },
]

export default function AbilityEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  const [form, setForm] = useState<AbilityFormData>(defaultAbility)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachTargets, setAttachTargets] = useState<{ id: string; name: string }[]>([])
  const [otherAbilities, setOtherAbilities] = useState<{ id: string; name: string }[]>([])
  const [allSpells, setAllSpells] = useState<{ id: string; name: string }[]>([])
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => setId(id))
  }, [params])

  useEffect(() => {
    if (id && id !== "new") {
      const fetchAbility = async () => {
        setLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
          .from("custom_abilities")
          .select("*")
          .eq("id", id)
          .single()
        
        if (error) {
          setError("Custom Ability not found")
        } else if (data) {
          setForm({
            name: data.name || "",
            description: data.description || "",
            prerequisites: data.prerequisites || "",
            characteristics: normalizeCharacteristics(data.characteristics, data.uses),
            attached_to_type: data.attached_to_type || "",
            attached_to_id: data.attached_to_id || "",
            show_in_builder: data.show_in_builder ?? false,
            source: data.source || "Custom",
            icon: data.icon || null,
          })
        }
        setLoading(false)
      }
      fetchAbility()
    }
  }, [id])

  // Fetch attach targets when type changes (equipment uses categories, not item IDs)
  useEffect(() => {
    const fetchTargets = async () => {
      if (!form.attached_to_type) {
        setAttachTargets([])
        return
      }

      if (isEquipmentCategoryAttach(form.attached_to_type)) {
        setAttachTargets(
          EQUIPMENT_ATTACH_CATEGORIES.map((category) => ({
            id: category,
            name: category,
          })),
        )
        return
      }

      const table = attachTypeToTable(form.attached_to_type)
      if (!table) {
        setAttachTargets([])
        return
      }

      const supabase = createClient()
      const { data } = await supabase
        .from(table)
        .select("id, name")
        .order("name")
        .limit(200)

      const rows = (data || []).filter((row) => row.id !== id)
      setAttachTargets(rows)
    }
    fetchTargets()
  }, [form.attached_to_type, id])

  useEffect(() => {
    const fetchOtherAbilities = async () => {
      const supabase = createClient()
      const [{ data: abilities }, { data: spells }] = await Promise.all([
        supabase.from("custom_abilities").select("id, name").order("name").limit(100),
        supabase.from("spells").select("id, name").order("name").limit(500),
      ])

      setOtherAbilities((abilities || []).filter((a) => a.id !== id))
      setAllSpells(spells || [])
    }
    fetchOtherAbilities()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const payload = {
      ...form,
      attached_to_id: form.attached_to_id || null,
      uses: extractUsesConfig(form.characteristics),
    }
    
    if (id === "new") {
      const { error } = await supabase.from("custom_abilities").insert([payload])
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase.from("custom_abilities").update(payload).eq("id", id)
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    }
    
    setSaving(false)
    router.push("/compendium?tab=abilities")
  }

  const handleExport = () => {
    const exportData = { type: "dnd-ability", version: 1, data: form }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${form.name.toLowerCase().replace(/\s+/g, "-")}-ability.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this custom ability?")) return
    
    const supabase = createClient()
    await supabase.from("custom_abilities").delete().eq("id", id)
    router.push("/compendium?tab=abilities")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-8" />
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/compendium?tab=abilities"
              className="p-3 bg-lemon text-lemon-foreground hover:brightness-110 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-black text-foreground">
              {id === "new" ? "New Custom Ability" : "Edit Custom Ability"}
            </h1>
          </div>
          
          {id !== "new" && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 text-primary hover:bg-primary/10 rounded-xl transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Ability Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                placeholder="e.g., Extra Attack"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Source
              </label>
              <input
                type="text"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                placeholder="Custom, Homebrew, etc."
              />
            </div>
          </div>

          {/* Icon */}
          <GameIconPicker
            value={form.icon}
            onChange={(icon) => setForm({ ...form, icon })}
            label="Icon"
          />

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Prerequisites
            </label>
            <input
              type="text"
              value={form.prerequisites}
              onChange={(e) => setForm({ ...form, prerequisites: e.target.value })}
              className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              placeholder="e.g., Level 5, Strength 13 or higher"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Attach to Type
              </label>
              <select
                value={form.attached_to_type}
                onChange={(e) => setForm({ ...form, attached_to_type: e.target.value, attached_to_id: "" })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              >
                {ATTACH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {form.attached_to_type && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  {isEquipmentCategoryAttach(form.attached_to_type)
                    ? "Equipment category"
                    : `Attach to ${form.attached_to_type.charAt(0).toUpperCase() + form.attached_to_type.slice(1)}`}
                </label>
                <select
                  value={form.attached_to_id}
                  onChange={(e) => setForm({ ...form, attached_to_id: e.target.value })}
                  className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">
                    {isEquipmentCategoryAttach(form.attached_to_type)
                      ? "Select category..."
                      : `Select a ${form.attached_to_type}...`}
                  </option>
                  {attachTargets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name}
                    </option>
                  ))}
                </select>
                {isEquipmentCategoryAttach(form.attached_to_type) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Applies to all items in that category (e.g. every Weapon), not a single item.
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={8}
              className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary resize-none"
              placeholder="Describe what this ability does..."
            />
          </div>

          <CharacteristicModifiersEditor
            value={form.characteristics}
            onChange={(characteristics) => setForm({ ...form, characteristics })}
            otherAbilities={otherAbilities}
            spellOptions={allSpells}
          />

          {/* Show in Builder Checkbox */}
          <div className="bg-card border-2 border-border rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.show_in_builder}
                onChange={(e) => setForm({ ...form, show_in_builder: e.target.checked })}
                className="w-5 h-5 rounded border-border accent-primary"
              />
              <div>
                <span className="font-semibold text-foreground">Show in Character Builder</span>
                <p className="text-sm text-muted-foreground">
                  When enabled, this custom ability will appear in the &quot;Custom&quot; tab of the character builder preview as well as character sheet.
                </p>
              </div>
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? "Saving..." : "Save Ability"}
            </button>
            <Link
              href="/compendium?tab=abilities"
              className="px-6 py-4 bg-lemon text-lemon-foreground rounded-xl font-bold hover:brightness-110 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
