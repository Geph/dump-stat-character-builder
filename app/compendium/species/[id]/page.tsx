"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Save, Trash2, Plus, X, Download } from "lucide-react"
import Link from "next/link"
import { GameIconPicker } from "@/components/game-icon-picker"
import { CREATURE_TYPES, SPECIES_SIZES } from "@/lib/compendium/constants"

interface TraitChoice {
  category: string
  options: { name: string; description: string }[]
  count: number
}

interface Trait {
  name: string
  description: string
  level?: number // level at which trait becomes available, defaults to 1
  isChoice?: boolean
  choices?: TraitChoice
}

interface SpeciesFormData {
  name: string
  description: string
  speed: number
  size: string
  creature_type: string
  traits: Trait[]
  icon: string | null
  source: string
}

const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1)

const defaultSpecies: SpeciesFormData = {
  name: "",
  description: "",
  speed: 30,
  size: "Medium",
  creature_type: "Humanoid",
  traits: [{ name: "", description: "", level: 1 }],
  icon: null,
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
            creature_type: data.creature_type || "Humanoid",
            traits: data.traits?.length ? data.traits.map((t: Trait) => ({ ...t, level: t.level || 1 })) : [{ name: "", description: "", level: 1 }],
            icon: data.icon || null,
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

  const handleExport = () => {
    const exportData = {
      type: "dnd-species",
      version: 1,
      data: {
        ...form,
        traits: form.traits.filter(t => t.name.trim()),
      }
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${form.name.toLowerCase().replace(/\s+/g, "-")}-species.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this species?")) return
    
    const supabase = createClient()
    await supabase.from("species").delete().eq("id", id)
    router.push("/compendium?tab=species")
  }

  // Trait management
  const addTrait = () => {
    setForm(prev => ({
      ...prev,
      traits: [...prev.traits, { name: "", description: "", level: 1 }]
    }))
  }

  const removeTrait = (index: number) => {
    setForm(prev => ({
      ...prev,
      traits: prev.traits.filter((_, i) => i !== index)
    }))
  }

  const updateTrait = (index: number, updates: Partial<Trait>) => {
    setForm(prev => ({
      ...prev,
      traits: prev.traits.map((t, i) => i === index ? { ...t, ...updates } : t)
    }))
  }

  const toggleTraitChoice = (index: number) => {
    const trait = form.traits[index]
    if (trait.isChoice) {
      updateTrait(index, { isChoice: false, choices: undefined })
    } else {
      updateTrait(index, { 
        isChoice: true, 
        choices: { category: trait.name || "Option", options: [], count: 1 }
      })
    }
  }

  const addTraitOption = (traitIndex: number) => {
    const trait = form.traits[traitIndex]
    if (!trait.choices) return
    updateTrait(traitIndex, {
      choices: {
        ...trait.choices,
        options: [...trait.choices.options, { name: "", description: "" }]
      }
    })
  }

  const removeTraitOption = (traitIndex: number, optionIndex: number) => {
    const trait = form.traits[traitIndex]
    if (!trait.choices) return
    updateTrait(traitIndex, {
      choices: {
        ...trait.choices,
        options: trait.choices.options.filter((_, i) => i !== optionIndex)
      }
    })
  }

  const updateTraitOption = (traitIndex: number, optionIndex: number, field: "name" | "description", value: string) => {
    const trait = form.traits[traitIndex]
    if (!trait.choices) return
    updateTrait(traitIndex, {
      choices: {
        ...trait.choices,
        options: trait.choices.options.map((opt, i) => 
          i === optionIndex ? { ...opt, [field]: value } : opt
        )
      }
    })
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

          {/* Icon Picker */}
          <GameIconPicker
            value={form.icon}
            onChange={(icon) => setForm({ ...form, icon })}
            label="Species Icon"
          />

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

          {/* Size, creature type, and speed */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Size
              </label>
              <select
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              >
                {SPECIES_SIZES.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Creature Type
              </label>
              <select
                value={form.creature_type}
                onChange={(e) => setForm({ ...form, creature_type: e.target.value })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              >
                {CREATURE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
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
              <div>
                <label className="text-sm font-semibold text-foreground">Traits</label>
                <p className="text-xs text-muted-foreground">Racial traits for this species (use Level to set when they become available)</p>
              </div>
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
                      onChange={(e) => updateTrait(index, { name: e.target.value })}
                      placeholder="Trait name (e.g., Darkvision)"
                      className="flex-1 px-4 py-2 bg-background border-2 border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground whitespace-nowrap">Level</label>
                      <select
                        value={trait.level || 1}
                        onChange={(e) => updateTrait(index, { level: parseInt(e.target.value) })}
                        className="w-16 px-2 py-2 bg-background border-2 border-border rounded-lg text-foreground text-center focus:outline-none focus:border-primary"
                      >
                        {LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={trait.isChoice || false}
                        onChange={() => toggleTraitChoice(index)}
                        className="w-4 h-4 rounded border-border accent-primary"
                      />
                      <span className="text-muted-foreground">Choice</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeTrait(index)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {!trait.isChoice ? (
                    <textarea
                      value={trait.description}
                      onChange={(e) => updateTrait(index, { description: e.target.value })}
                      placeholder="Trait description..."
                      rows={2}
                      className="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-foreground focus:outline-none focus:border-primary resize-none"
                    />
                  ) : (
                    <div className="space-y-3 pt-2 border-t border-border mt-2">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">Choose</span>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={trait.choices?.count || 1}
                          onChange={(e) => updateTrait(index, {
                            choices: { ...trait.choices!, count: parseInt(e.target.value) || 1 }
                          })}
                          className="w-16 px-2 py-1 bg-background border-2 border-border rounded-lg text-center text-sm"
                        />
                        <span className="text-sm text-muted-foreground">from options below:</span>
                        <button
                          type="button"
                          onClick={() => addTraitOption(index)}
                          className="ml-auto flex items-center gap-1 px-2 py-1 text-xs bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20"
                        >
                          <Plus className="w-3 h-3" />
                          Option
                        </button>
                      </div>
                      
                      {trait.choices?.options.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-start gap-2 pl-4 border-l-2 border-secondary/30">
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={option.name}
                              onChange={(e) => updateTraitOption(index, optIndex, "name", e.target.value)}
                              placeholder="Option name"
                              className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm"
                            />
                            <textarea
                              value={option.description}
                              onChange={(e) => updateTraitOption(index, optIndex, "description", e.target.value)}
                              placeholder="Option description..."
                              rows={2}
                              className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm resize-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTraitOption(index, optIndex)}
                            className="p-1 text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
