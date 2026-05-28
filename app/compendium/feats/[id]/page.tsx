"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Save, Trash2, Download, X } from "lucide-react"
import Link from "next/link"

const FEAT_CATEGORIES = ["Origin", "General", "Fighting Style", "Epic Boon"] as const
const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1)

interface FeatFormData {
  name: string
  description: string
  category: string
  level_requirement: number
  prerequisite_feat_ids: string[]
  source: string
}

const defaultFeat: FeatFormData = {
  name: "",
  description: "",
  category: "General",
  level_requirement: 1,
  prerequisite_feat_ids: [],
  source: "Custom",
}

export default function FeatEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  const [form, setForm] = useState<FeatFormData>(defaultFeat)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allFeats, setAllFeats] = useState<{ id: string; name: string; category: string }[]>([])
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => setId(id))
  }, [params])

  // Fetch all feats for the prerequisite dropdown
  useEffect(() => {
    const fetchFeats = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("feats")
        .select("id, name, category")
        .order("name")
      setAllFeats(data || [])
    }
    fetchFeats()
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
            source: data.source || "Custom",
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

  // Feats available as prerequisites: exclude the current feat
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

          {/* Prerequisite Feats */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Prerequisite Feats
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              The character must already have these feats before taking this one.
            </p>
            <select
              value=""
              onChange={(e) => addPrereqFeat(e.target.value)}
              className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary mb-3"
            >
              <option value="">Add a prerequisite feat...</option>
              {availablePrereqFeats
                .filter(f => !form.prerequisite_feat_ids.includes(f.id))
                .map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.category})</option>
                ))}
            </select>
            {form.prerequisite_feat_ids.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.prerequisite_feat_ids.map(featId => {
                  const feat = allFeats.find(f => f.id === featId)
                  return feat ? (
                    <span
                      key={featId}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium"
                    >
                      {feat.name}
                      <button
                        type="button"
                        onClick={() => removePrereqFeat(featId)}
                        className="text-primary/60 hover:text-destructive transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ) : null
                })}
              </div>
            )}
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
