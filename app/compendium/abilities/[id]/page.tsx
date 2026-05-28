"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Save, Trash2, Download } from "lucide-react"
import Link from "next/link"

interface AbilityFormData {
  name: string
  description: string
  prerequisites: string
  attached_to_type: string
  attached_to_id: string
  uses_type: string
  uses_amount: number
  source: string
}

const defaultAbility: AbilityFormData = {
  name: "",
  description: "",
  prerequisites: "",
  attached_to_type: "",
  attached_to_id: "",
  uses_type: "unlimited",
  uses_amount: 1,
  source: "Custom",
}

const ATTACH_OPTIONS = [
  { value: "", label: "None (Standalone)" },
  { value: "class", label: "Class" },
  { value: "species", label: "Species" },
  { value: "background", label: "Background" },
  { value: "feat", label: "Feat" },
  { value: "equipment", label: "Equipment" },
  { value: "spell", label: "Spell" },
]

export default function AbilityEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  const [form, setForm] = useState<AbilityFormData>(defaultAbility)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachTargets, setAttachTargets] = useState<{ id: string; name: string }[]>([])
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
            attached_to_type: data.attached_to_type || "",
            attached_to_id: data.attached_to_id || "",
            uses_type: data.uses_type || "unlimited",
            uses_amount: data.uses_amount ?? 1,
            source: data.source || "Custom",
          })
        }
        setLoading(false)
      }
      fetchAbility()
    }
  }, [id])

  // Fetch attach targets when type changes
  useEffect(() => {
    const fetchTargets = async () => {
      if (!form.attached_to_type) {
        setAttachTargets([])
        return
      }

      const supabase = createClient()
      const tableName = form.attached_to_type === "class" ? "classes" 
        : form.attached_to_type === "species" ? "species"
        : form.attached_to_type === "spell" ? "spells"
        : `${form.attached_to_type}s`
      
      const { data } = await supabase
        .from(tableName)
        .select("id, name")
        .order("name")
        .limit(50)
      
      setAttachTargets(data || [])
    }
    fetchTargets()
  }, [form.attached_to_type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const payload = {
      ...form,
      attached_to_id: form.attached_to_id || null,
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

          {/* Uses Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Uses Type
              </label>
              <select
                value={form.uses_type}
                onChange={(e) => setForm({ ...form, uses_type: e.target.value })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              >
                <option value="unlimited">Unlimited (At Will)</option>
                <option value="fixed">Fixed Number</option>
                <option value="proficiency">Proficiency Modifier / Rest</option>
                <option value="short_rest">Recharge on Short Rest</option>
                <option value="long_rest">Recharge on Long Rest</option>
              </select>
            </div>
            {form.uses_type !== "unlimited" && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  {form.uses_type === "proficiency" ? "Base Uses (+ Prof Mod)" : "Number of Uses"}
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.uses_amount}
                  onChange={(e) => setForm({ ...form, uses_amount: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {form.uses_type === "proficiency" && "Total uses = this number + proficiency bonus"}
                  {form.uses_type === "fixed" && "Uses do not recharge automatically"}
                  {form.uses_type === "short_rest" && "Recharges after a short or long rest"}
                  {form.uses_type === "long_rest" && "Recharges only after a long rest"}
                </p>
              </div>
            )}
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
                  Attach to {form.attached_to_type.charAt(0).toUpperCase() + form.attached_to_type.slice(1)}
                </label>
                <select
                  value={form.attached_to_id}
                  onChange={(e) => setForm({ ...form, attached_to_id: e.target.value })}
                  className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Select a {form.attached_to_type}...</option>
                  {attachTargets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name}
                    </option>
                  ))}
                </select>
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
