"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Save, Trash2, Plus, X } from "lucide-react"
import Link from "next/link"

interface Trait {
  name: string
  description: string
}

interface SpeciesFormData {
  name: string
  description: string
  speed: number
  size: string
  traits: Trait[]
  source: string
}

const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"]

const defaultSpecies: SpeciesFormData = {
  name: "",
  description: "",
  speed: 30,
  size: "Medium",
  traits: [{ name: "", description: "" }],
  source: "Custom",
}

export default function SpeciesEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  const [form, setForm] = useState<SpeciesFormData>(defaultSpecies)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => setId(id))
  }, [params])

  useEffect(() => {
    if (id && id !== "new") {
      const fetchSpecies = async () => {
        setLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
          .from("species")
          .select("*")
          .eq("id", id)
          .single()
        
        if (error) {
          setError("Species not found")
        } else if (data) {
          setForm({
            name: data.name || "",
            description: data.description || "",
            speed: data.speed || 30,
            size: data.size || "Medium",
            traits: data.traits?.length ? data.traits : [{ name: "", description: "" }],
            source: data.source || "Custom",
          })
        }
        setLoading(false)
      }
      fetchSpecies()
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const payload = {
      ...form,
      traits: form.traits.filter(t => t.name.trim()),
    }
    
    if (id === "new") {
      const { error } = await supabase.from("species").insert([payload])
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase.from("species").update(payload).eq("id", id)
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    }
    
    setSaving(false)
    router.push("/compendium?tab=species")
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this species?")) return
    
    const supabase = createClient()
    await supabase.from("species").delete().eq("id", id)
    router.push("/compendium?tab=species")
  }

  const addTrait = () => {
    setForm(prev => ({
      ...prev,
      traits: [...prev.traits, { name: "", description: "" }]
    }))
  }

  const removeTrait = (index: number) => {
    setForm(prev => ({
      ...prev,
      traits: prev.traits.filter((_, i) => i !== index)
    }))
  }

  const updateTrait = (index: number, field: keyof Trait, value: string) => {
    setForm(prev => ({
      ...prev,
      traits: prev.traits.map((t, i) => i === index ? { ...t, [field]: value } : t)
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-8" />
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/compendium?tab=species"
              className="p-3 bg-lemon text-lemon-foreground hover:brightness-110 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-black text-foreground">
              {id === "new" ? "New Species" : "Edit Species"}
            </h1>
          </div>
          
          {id !== "new" && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Species Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                placeholder="Elf"
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
                placeholder="Player's Handbook"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary resize-none"
              placeholder="Elves are a magical people of otherworldly grace..."
            />
          </div>

          {/* Size and Speed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Size
              </label>
              <select
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              >
                {SIZES.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Speed (feet)
              </label>
              <input
                type="number"
                min={5}
                step={5}
                value={form.speed}
                onChange={(e) => setForm({ ...form, speed: parseInt(e.target.value) || 30 })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Traits */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-foreground">
                Species Traits
              </label>
              <button
                type="button"
                onClick={addTrait}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Trait
              </button>
            </div>
            
            <div className="space-y-4">
              {form.traits.map((trait, index) => (
                <div key={index} className="bg-card border-2 border-border rounded-xl p-4">
                  <div className="flex items-center gap-4 mb-3">
                    <input
                      type="text"
                      value={trait.name}
                      onChange={(e) => updateTrait(index, "name", e.target.value)}
                      placeholder="Trait name (e.g., Darkvision)"
                      className="flex-1 px-4 py-2 bg-background border-2 border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => removeTrait(index)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    value={trait.description}
                    onChange={(e) => updateTrait(index, "description", e.target.value)}
                    placeholder="Trait description..."
                    rows={2}
                    className="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-foreground focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? "Saving..." : "Save Species"}
            </button>
            <Link
              href="/compendium?tab=species"
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
