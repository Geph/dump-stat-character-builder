"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/db/client"
import { Plus, X } from "lucide-react"
import type { DndClass, Feature, FeatureChoice } from "@/lib/types"
import { CompendiumEditorHeaderRow } from "@/components/compendium/editor-header-row"
import {
  CompendiumEditorToolbar,
  COMPENDIUM_EDITOR_FORM_ID,
} from "@/components/compendium/editor-toolbar"
import { normalizeCreatorUrl } from "@/components/compendium/source-link-field"

const ABILITIES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"]

interface SubclassFormData {
  name: string
  description: string
  class_id: string
  features: Feature[]
  spellcasting: {
    ability: string
  } | null
  source: string
  creator_url: string
  icon: string | null
}

const defaultSubclass: SubclassFormData = {
  name: "",
  description: "",
  class_id: "",
  features: [{ level: 3, name: "", description: "" }],
  spellcasting: null,
  source: "Custom",
  creator_url: "",
  icon: null,
}

export default function SubclassEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  const [form, setForm] = useState<SubclassFormData>(defaultSubclass)
  const [classes, setClasses] = useState<DndClass[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSpellcasting, setHasSpellcasting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => setId(id))
  }, [params])

  // Fetch classes for dropdown
  useEffect(() => {
    const fetchClasses = async () => {
      const db = createClient()
      const { data } = await db.from("classes").select("id, name").order("name")
      setClasses(data || [])
    }
    fetchClasses()
  }, [])

  useEffect(() => {
    if (id && id !== "new") {
      const fetchSubclass = async () => {
        setLoading(true)
        const db = createClient()
        const { data, error } = await db
          .from("subclasses")
          .select("*")
          .eq("id", id)
          .single()
        
        if (error) {
          setError("Subclass not found")
        } else if (data) {
          setForm({
            name: data.name || "",
            description: data.description || "",
            class_id: data.class_id || "",
            features: data.features?.length ? data.features : [{ level: 3, name: "", description: "" }],
            spellcasting: data.spellcasting || null,
            source: data.source || "Custom",
            creator_url: data.creator_url || "",
            icon: data.icon || null,
          })
          setHasSpellcasting(!!data.spellcasting)
        }
        setLoading(false)
      }
      fetchSubclass()
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (!form.class_id) {
      setError("Please select a parent class")
      setSaving(false)
      return
    }

    const db = createClient()
    const payload = {
      ...form,
      features: form.features.filter(f => f.name.trim()),
      spellcasting: hasSpellcasting ? form.spellcasting : null,
      creator_url: normalizeCreatorUrl(form.creator_url),
    }
    
    if (id === "new") {
      const { error } = await db.from("subclasses").insert([payload])
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await db.from("subclasses").update(payload).eq("id", id)
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    }
    
    setSaving(false)
    router.push("/compendium?tab=subclasses")
  }

  const handleExport = () => {
    const exportData = {
      type: "dnd-subclass",
      version: 1,
      data: {
        ...form,
        features: form.features.filter(f => f.name.trim()),
        spellcasting: hasSpellcasting ? form.spellcasting : null,
      }
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${form.name.toLowerCase().replace(/\s+/g, "-")}-subclass.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this subclass?")) return
    
    const db = createClient()
    await db.from("subclasses").delete().eq("id", id)
    router.push("/compendium?tab=subclasses")
  }

  // Feature management
  const addFeature = () => {
    setForm(prev => ({
      ...prev,
      features: [...prev.features, { level: 3, name: "", description: "" }]
    }))
  }

  const removeFeature = (index: number) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }))
  }

  const updateFeature = (index: number, updates: Partial<Feature>) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? { ...f, ...updates } : f)
    }))
  }

  const toggleFeatureChoice = (index: number) => {
    const feature = form.features[index]
    if (feature.isChoice) {
      updateFeature(index, { isChoice: false, choices: undefined })
    } else {
      updateFeature(index, { 
        isChoice: true, 
        choices: { category: feature.name || "Option", options: [], count: 1 }
      })
    }
  }

  const addFeatureOption = (featureIndex: number) => {
    const feature = form.features[featureIndex]
    if (!feature.choices) return
    updateFeature(featureIndex, {
      choices: {
        ...feature.choices,
        options: [...feature.choices.options, { name: "", description: "" }]
      }
    })
  }

  const removeFeatureOption = (featureIndex: number, optionIndex: number) => {
    const feature = form.features[featureIndex]
    if (!feature.choices) return
    updateFeature(featureIndex, {
      choices: {
        ...feature.choices,
        options: feature.choices.options.filter((_, i) => i !== optionIndex)
      }
    })
  }

  const updateFeatureOption = (featureIndex: number, optionIndex: number, field: "name" | "description", value: string) => {
    const feature = form.features[featureIndex]
    if (!feature.choices) return
    updateFeature(featureIndex, {
      choices: {
        ...feature.choices,
        options: feature.choices.options.map((opt, i) => 
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
      <CompendiumEditorToolbar
        tab="subclasses"
        title={id === "new" ? "New Subclass" : "Edit Subclass"}
        isNew={id === "new"}
        saving={saving}
        saveLabel="Save Subclass"
        onExport={handleExport}
        onDelete={id !== "new" ? handleDelete : undefined}
      />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive">
            {error}
          </div>
        )}

        <form id={COMPENDIUM_EDITOR_FORM_ID} onSubmit={handleSubmit} className="space-y-6">
          <CompendiumEditorHeaderRow
            nameLabel="Subclass Name"
            name={form.name}
            onNameChange={(name) => setForm({ ...form, name })}
            namePlaceholder="e.g., Champion"
            source={form.source}
            onSourceChange={(source) => setForm({ ...form, source })}
            creatorUrl={form.creator_url}
            onCreatorUrlChange={(creator_url) => setForm({ ...form, creator_url })}
            icon={form.icon}
            onIconChange={(icon) => setForm({ ...form, icon })}
            afterName={
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Parent Class
                </label>
                <select
                  value={form.class_id}
                  onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Select a class...</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
            }
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
              placeholder="Describe the subclass theme and flavor..."
            />
          </div>

          {/* Spellcasting */}
          <div className="bg-card border-2 border-border rounded-xl p-4">
            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={hasSpellcasting}
                onChange={(e) => {
                  setHasSpellcasting(e.target.checked)
                  if (e.target.checked && !form.spellcasting) {
                    setForm(prev => ({
                      ...prev,
                      spellcasting: { ability: "Intelligence" }
                    }))
                  }
                }}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="font-semibold text-foreground">Grants Spellcasting</span>
            </label>
            
            {hasSpellcasting && form.spellcasting && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Spellcasting Ability
                </label>
                <select
                  value={form.spellcasting.ability}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    spellcasting: { ...prev.spellcasting!, ability: e.target.value }
                  }))}
                  className="w-full md:w-48 px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                >
                  {ABILITIES.map((ability) => (
                    <option key={ability} value={ability}>{ability}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Subclass Features */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="text-sm font-semibold text-foreground">Subclass Features</label>
                <p className="text-xs text-muted-foreground">Features gained at various levels</p>
              </div>
              <button
                type="button"
                onClick={addFeature}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Feature
              </button>
            </div>
            
            <div className="space-y-4">
              {form.features.map((feature, index) => (
                <div key={index} className="bg-card border-2 border-border rounded-xl p-4">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-20">
                      <label className="block text-xs text-muted-foreground mb-1">Level</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={feature.level}
                        onChange={(e) => updateFeature(index, { level: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 bg-background border-2 border-border rounded-lg text-center"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-muted-foreground mb-1">Feature Name</label>
                      <input
                        type="text"
                        value={feature.name}
                        onChange={(e) => updateFeature(index, { name: e.target.value })}
                        placeholder="Feature name"
                        className="w-full px-4 py-2 bg-background border-2 border-border rounded-lg"
                      />
                    </div>
                    <div className="flex items-end gap-2 pb-0.5">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={feature.isChoice || false}
                          onChange={() => toggleFeatureChoice(index)}
                          className="w-4 h-4 rounded border-border accent-primary"
                        />
                        <span className="text-muted-foreground">Choice</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="p-2 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {!feature.isChoice ? (
                    <textarea
                      value={feature.description}
                      onChange={(e) => updateFeature(index, { description: e.target.value })}
                      placeholder="Feature description..."
                      rows={3}
                      className="w-full px-4 py-2 bg-background border-2 border-border rounded-lg resize-none"
                    />
                  ) : (
                    <div className="space-y-3 pt-2 border-t border-border mt-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Category:</span>
                          <input
                            type="text"
                            value={feature.choices?.category || ""}
                            onChange={(e) => updateFeature(index, {
                              choices: { ...feature.choices!, category: e.target.value }
                            })}
                            placeholder="e.g. Fighting Style"
                            className="w-36 px-2 py-1 bg-background border-2 border-border rounded-lg text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Choose</span>
                          <input
                            type="number"
                            min={1}
                            max={5}
                            value={feature.choices?.count || 1}
                            onChange={(e) => updateFeature(index, {
                              choices: { ...feature.choices!, count: parseInt(e.target.value) || 1 }
                            })}
                            className="w-14 px-2 py-1 bg-background border-2 border-border rounded-lg text-center text-sm"
                          />
                          <span className="text-sm text-muted-foreground">from:</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => addFeatureOption(index)}
                          className="ml-auto flex items-center gap-1 px-2 py-1 text-xs bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20"
                        >
                          <Plus className="w-3 h-3" />
                          Add Option
                        </button>
                      </div>
                      
                      {feature.choices?.options.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-start gap-2 pl-4 border-l-2 border-secondary/30">
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={option.name}
                              onChange={(e) => updateFeatureOption(index, optIndex, "name", e.target.value)}
                              placeholder="Option name"
                              className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm"
                            />
                            <textarea
                              value={option.description}
                              onChange={(e) => updateFeatureOption(index, optIndex, "description", e.target.value)}
                              placeholder="Option description..."
                              rows={2}
                              className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm resize-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFeatureOption(index, optIndex)}
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

        </form>
      </main>
    </div>
  )
}
