"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Save, Trash2, Plus, X, Download } from "lucide-react"
import Link from "next/link"
import type { Spell } from "@/lib/types"

const SPELL_SCHOOLS = [
  "Abjuration", "Conjuration", "Divination", "Enchantment",
  "Evocation", "Illusion", "Necromancy", "Transmutation"
]

const SPELL_CLASSES = [
  "Bard", "Cleric", "Druid", "Paladin", "Ranger", 
  "Sorcerer", "Warlock", "Wizard"
]

interface SpellFormData {
  name: string
  level: number
  school: string
  casting_time: string
  range: string
  components: string[]
  material: string
  duration: string
  concentration: boolean
  ritual: boolean
  description: string
  higher_levels: string
  classes: string[]
  source: string
}

const defaultSpell: SpellFormData = {
  name: "",
  level: 0,
  school: "Evocation",
  casting_time: "1 action",
  range: "Self",
  components: ["V", "S"],
  material: "",
  duration: "Instantaneous",
  concentration: false,
  ritual: false,
  description: "",
  higher_levels: "",
  classes: [],
  source: "Custom",
}

export default function SpellEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  const [form, setForm] = useState<SpellFormData>(defaultSpell)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => setId(id))
  }, [params])

  useEffect(() => {
    if (id && id !== "new") {
      const fetchSpell = async () => {
        setLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
          .from("spells")
          .select("*")
          .eq("id", id)
          .single()
        
        if (error) {
          setError("Spell not found")
        } else if (data) {
          setForm({
            name: data.name || "",
            level: data.level || 0,
            school: data.school || "Evocation",
            casting_time: data.casting_time || "1 action",
            range: data.range || "Self",
            components: data.components || ["V", "S"],
            material: data.material || "",
            duration: data.duration || "Instantaneous",
            concentration: data.concentration || false,
            ritual: data.ritual || false,
            description: data.description || "",
            higher_levels: data.higher_levels || "",
            classes: data.classes || [],
            source: data.source || "Custom",
          })
        }
        setLoading(false)
      }
      fetchSpell()
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()
    
    if (id === "new") {
      const { error } = await supabase.from("spells").insert([form])
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase.from("spells").update(form).eq("id", id)
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    }
    
    setSaving(false)
    router.push("/compendium?tab=spells")
  }

  const handleExport = () => {
    const exportData = { type: "dnd-spell", version: 1, data: form }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${form.name.toLowerCase().replace(/\s+/g, "-")}-spell.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this spell?")) return
    
    const supabase = createClient()
    await supabase.from("spells").delete().eq("id", id)
    router.push("/compendium?tab=spells")
  }

  const toggleComponent = (comp: string) => {
    setForm(prev => ({
      ...prev,
      components: prev.components.includes(comp)
        ? prev.components.filter(c => c !== comp)
        : [...prev.components, comp]
    }))
  }

  const toggleClass = (cls: string) => {
    setForm(prev => ({
      ...prev,
      classes: prev.classes.includes(cls)
        ? prev.classes.filter(c => c !== cls)
        : [...prev.classes, cls]
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
              href="/compendium?tab=spells"
              className="p-3 bg-lemon text-lemon-foreground hover:brightness-110 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-black text-foreground">
              {id === "new" ? "New Spell" : "Edit Spell"}
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
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                placeholder="Fireball"
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

          {/* Classes */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Add This Spell to Which Class Spell Lists?
            </label>
            <div className="flex flex-wrap gap-3">
              {SPELL_CLASSES.map((cls) => (
                <label key={cls} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.classes.includes(cls.toLowerCase())}
                    onChange={() => toggleClass(cls.toLowerCase())}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-foreground">{cls}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Level and School */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Level
              </label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              >
                <option value={0}>Cantrip</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}{lvl === 1 ? "st" : lvl === 2 ? "nd" : lvl === 3 ? "rd" : "th"} Level
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                School
              </label>
              <select
                value={form.school}
                onChange={(e) => setForm({ ...form, school: e.target.value })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              >
                {SPELL_SCHOOLS.map((school) => (
                  <option key={school} value={school}>{school}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ritual / Concentration */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.ritual}
                onChange={(e) => setForm({ ...form, ritual: e.target.checked })}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-foreground">Ritual?</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.concentration}
                onChange={(e) => setForm({ ...form, concentration: e.target.checked })}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-foreground">Concentration?</span>
            </label>
          </div>

          {/* Casting Time, Range, Duration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Casting Time
              </label>
              <input
                type="text"
                value={form.casting_time}
                onChange={(e) => setForm({ ...form, casting_time: e.target.value })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                placeholder="1 action"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Range
              </label>
              <input
                type="text"
                value={form.range}
                onChange={(e) => setForm({ ...form, range: e.target.value })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                placeholder="120 feet"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Duration
              </label>
              <input
                type="text"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                placeholder="Instantaneous"
              />
            </div>
          </div>

          {/* Components */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Components
            </label>
            <div className="flex gap-6 mb-3">
              {["V", "S", "M"].map((comp) => (
                <label key={comp} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.components.includes(comp)}
                    onChange={() => toggleComponent(comp)}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-foreground">
                    {comp === "V" ? "Verbal" : comp === "S" ? "Somatic" : "Material"}
                  </span>
                </label>
              ))}
            </div>
            {form.components.includes("M") && (
              <input
                type="text"
                value={form.material}
                onChange={(e) => setForm({ ...form, material: e.target.value })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                placeholder="Material components (e.g., a bit of bat guano and sulfur)"
              />
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={6}
              className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary resize-none"
              placeholder="Describe what the spell does..."
            />
          </div>

          {/* At Higher Levels */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              At Higher Levels
            </label>
            <textarea
              value={form.higher_levels}
              onChange={(e) => setForm({ ...form, higher_levels: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary resize-none"
              placeholder="Effects when cast at higher levels..."
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? "Saving..." : "Save Spell"}
            </button>
            <Link
              href="/compendium?tab=spells"
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
