"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Save, Trash2, Download, X } from "lucide-react"
import Link from "next/link"
import { GameIconPicker } from "@/components/game-icon-picker"

const FEAT_CATEGORIES = ["Origin", "General", "Fighting Style", "Epic Boon"] as const
const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1)

interface FeatFormData {
  name: string
  description: string
  category: string
  level_requirement: number
  prerequisite_feat_ids: string[]
  prerequisite_class_ids: string[]
  prerequisite_species_ids: string[]
  prerequisite_background_ids: string[]
  source: string
  icon: string | null
}

const defaultFeat: FeatFormData = {
  name: "",
  description: "",
  category: "General",
  level_requirement: 1,
  prerequisite_feat_ids: [],
  prerequisite_class_ids: [],
  prerequisite_species_ids: [],
  prerequisite_background_ids: [],
  source: "Custom",
  icon: null,
}

export default function FeatEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  const [form, setForm] = useState<FeatFormData>(defaultFeat)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allFeats, setAllFeats] = useState<{ id: string; name: string; category: string }[]>([])
  const [allClasses, setAllClasses] = useState<{ id: string; name: string }[]>([])
  const [allSpecies, setAllSpecies] = useState<{ id: string; name: string }[]>([])
  const [allBackgrounds, setAllBackgrounds] = useState<{ id: string; name: string }[]>([])
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => setId(id))
  }, [params])

  useEffect(() => {
    const fetchPrereqOptions = async () => {
      const supabase = createClient()
      const [
        { data: feats },
        { data: classes },
        { data: species },
        { data: backgrounds },
      ] = await Promise.all([
        supabase.from("feats").select("id, name, category").order("name"),
        supabase.from("classes").select("id, name").order("name"),
        supabase.from("species").select("id, name").order("name"),
        supabase.from("backgrounds").select("id, name").order("name"),
      ])
      setAllFeats(feats || [])
      setAllClasses(classes || [])
      setAllSpecies(species || [])
      setAllBackgrounds(backgrounds || [])
    }
    fetchPrereqOptions()
  }, [])

  useEffect(() => {
    if (id && id !== "new") {
      const fetchFeat = async () => {
        setLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
          .from("feats")
          .select("*")
          .eq("id", id)
          .single()

        if (error) {
          setError("Feat not found")
        } else if (data) {
          setForm({
            name: data.name || "",
            description: data.description || "",
            category: data.category || "General",
            level_requirement: data.level_requirement ?? 1,
            prerequisite_feat_ids: data.prerequisite_feat_ids || [],
            prerequisite_class_ids: data.prerequisite_class_ids || [],
            prerequisite_species_ids: data.prerequisite_species_ids || [],
            prerequisite_background_ids: data.prerequisite_background_ids || [],
            source: data.source || "Custom",
            icon: data.icon || null,
          })
        }
        setLoading(false)
      }
      fetchFeat()
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()

    if (id === "new") {
      const { error } = await supabase.from("feats").insert([form])
      if (error) { setError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from("feats").update(form).eq("id", id)
      if (error) { setError(error.message); setSaving(false); return }
    }

    setSaving(false)
    router.push("/compendium?tab=feats")
  }

  const handleExport = () => {
    const exportData = { type: "dnd-feat", version: 1, data: form }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${form.name.toLowerCase().replace(/\s+/g, "-")}-feat.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this feat?")) return
    const supabase = createClient()
    await supabase.from("feats").delete().eq("id", id)
    router.push("/compendium?tab=feats")
  }

  const addPrereqFeat = (featId: string) => {
    if (!featId || form.prerequisite_feat_ids.includes(featId)) return
    setForm(prev => ({ ...prev, prerequisite_feat_ids: [...prev.prerequisite_feat_ids, featId] }))
  }

  const removePrereqFeat = (featId: string) => {
    setForm(prev => ({ ...prev, prerequisite_feat_ids: prev.prerequisite_feat_ids.filter(id => id !== featId) }))
  }

  const addPrereqId = (
    field: "prerequisite_class_ids" | "prerequisite_species_ids" | "prerequisite_background_ids",
    value: string,
  ) => {
    if (!value || form[field].includes(value)) return
    setForm((prev) => ({ ...prev, [field]: [...prev[field], value] }))
  }

  const removePrereqId = (
    field: "prerequisite_class_ids" | "prerequisite_species_ids" | "prerequisite_background_ids",
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [field]: prev[field].filter((id) => id !== value) }))
  }

  const renderPrereqTags = (
    ids: string[],
    lookup: { id: string; name: string }[],
    onRemove: (id: string) => void,
  ) => (
    <div className="flex flex-wrap gap-2">
      {ids.map((entryId) => {
        const entry = lookup.find((x) => x.id === entryId)
        if (!entry) return null
        return (
          <span
            key={entryId}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium"
          >
            {entry.name}
            <button
              type="button"
              onClick={() => onRemove(entryId)}
              className="text-primary/60 hover:text-destructive transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )
      })}
    </div>
  )

  const availablePrereqFeats = allFeats.filter(f => f.id !== id)

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted rounded" />)}
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
              href="/compendium?tab=feats"
              className="p-3 bg-lemon text-lemon-foreground hover:brightness-110 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-black text-foreground">
              {id === "new" ? "New Feat" : "Edit Feat"}
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
          {/* Name + Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Feat Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                placeholder="Alert"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Source</label>
              <input
                type="text"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                placeholder="Player's Handbook"
              />
            </div>
          </div>

          {/* Icon */}
          <GameIconPicker
            value={form.icon}
            onChange={(icon) => setForm({ ...form, icon })}
            label="Icon"
          />

          {/* Category + Level Requirement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              >
                {FEAT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {form.category === "Origin" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Origin feats can be taken at 1st level as part of a background.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Minimum Level Requirement
              </label>
              <select
                value={form.level_requirement}
                onChange={(e) => setForm({ ...form, level_requirement: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              >
                {LEVELS.map(lvl => (
                  <option key={lvl} value={lvl}>Level {lvl}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-card border-2 border-border rounded-xl p-4 space-y-4">
            <h3 className="font-semibold text-foreground">Prerequisites</h3>
            <p className="text-xs text-muted-foreground">
              Character must match all selected requirements before taking this feat.
            </p>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Feats</label>
              <select
                value=""
                onChange={(e) => addPrereqFeat(e.target.value)}
                className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary mb-2"
              >
                <option value="">Add prerequisite feat...</option>
                {availablePrereqFeats
                  .filter((f) => !form.prerequisite_feat_ids.includes(f.id))
                  .map((f) => (
                    <option key={f.id} value={f.id}>{f.name} ({f.category})</option>
                  ))}
              </select>
              {form.prerequisite_feat_ids.length > 0 &&
                renderPrereqTags(form.prerequisite_feat_ids, allFeats, removePrereqFeat)}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Classes</label>
              <select
                value=""
                onChange={(e) => addPrereqId("prerequisite_class_ids", e.target.value)}
                className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary mb-2"
              >
                <option value="">Add prerequisite class...</option>
                {allClasses
                  .filter((c) => !form.prerequisite_class_ids.includes(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
              {form.prerequisite_class_ids.length > 0 &&
                renderPrereqTags(
                  form.prerequisite_class_ids,
                  allClasses,
                  (id) => removePrereqId("prerequisite_class_ids", id),
                )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Species</label>
              <select
                value=""
                onChange={(e) => addPrereqId("prerequisite_species_ids", e.target.value)}
                className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary mb-2"
              >
                <option value="">Add prerequisite species...</option>
                {allSpecies
                  .filter((s) => !form.prerequisite_species_ids.includes(s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
              </select>
              {form.prerequisite_species_ids.length > 0 &&
                renderPrereqTags(
                  form.prerequisite_species_ids,
                  allSpecies,
                  (id) => removePrereqId("prerequisite_species_ids", id),
                )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Backgrounds</label>
              <select
                value=""
                onChange={(e) => addPrereqId("prerequisite_background_ids", e.target.value)}
                className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary mb-2"
              >
                <option value="">Add prerequisite background...</option>
                {allBackgrounds
                  .filter((b) => !form.prerequisite_background_ids.includes(b.id))
                  .map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
              </select>
              {form.prerequisite_background_ids.length > 0 &&
                renderPrereqTags(
                  form.prerequisite_background_ids,
                  allBackgrounds,
                  (id) => removePrereqId("prerequisite_background_ids", id),
                )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={8}
              className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary resize-none"
              placeholder="Describe the feat's benefits..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? "Saving..." : "Save Feat"}
            </button>
            <Link
              href="/compendium?tab=feats"
              className="px-6 py-4 bg-card border-2 border-border text-foreground rounded-xl font-bold hover:bg-muted transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
