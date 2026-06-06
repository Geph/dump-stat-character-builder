"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/db/client"
import { Plus, X } from "lucide-react"
import { CompendiumEditorHeaderRow } from "@/components/compendium/editor-header-row"
import { RichTextEditor } from "@/components/compendium/rich-text-editor"
import {
  CompendiumEditorToolbar,
  COMPENDIUM_EDITOR_FORM_ID,
} from "@/components/compendium/editor-toolbar"
import { CharacteristicModifiersEditor } from "@/components/characteristic-modifiers-editor"
import {
  normalizeCharacteristics,
  type CharacteristicModifier,
} from "@/lib/compendium/characteristic-modifiers"
import { CREATURE_TYPES, SPECIES_SIZES } from "@/lib/compendium/constants"
import { normalizeCreatorUrl } from "@/components/compendium/source-link-field"
import { ModifierCatalogPicker } from "@/components/compendium/modifier-catalog-picker"
import { useModifierCatalog } from "@/hooks/use-modifier-catalog"
import type { Trait } from "@/lib/types"

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
  characteristics: CharacteristicModifier[]
  modifier_refs: string[]
  icon: string | null
  source: string
  creator_url: string
}

const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1)

const defaultSpecies: SpeciesFormData = {
  name: "",
  description: "",
  speed: 30,
  size: "Medium",
  creature_type: "Humanoid",
  traits: [{ name: "", description: "", level: 1 }],
  characteristics: [],
  modifier_refs: [],
  icon: null,
  source: "Custom",
  creator_url: "",
}

export default function SpeciesEditorPage({ id }: { id: string }) {
  const { catalog: modifierCatalog } = useModifierCatalog()
  const [form, setForm] = useState<SpeciesFormData>(defaultSpecies)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allSpells, setAllSpells] = useState<{ id: string; name: string }[]>([])
  const router = useRouter()

  useEffect(() => {
    const fetchSpells = async () => {
      const db = createClient()
      const { data } = await db.from("spells").select("id, name").order("name").limit(500)
      setAllSpells(data || [])
    }
    fetchSpells()
  }, [])

  useEffect(() => {
    if (id && id !== "new") {
      const fetchSpecies = async () => {
        setLoading(true)
        const db = createClient()
        const { data, error } = await db
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
            characteristics: normalizeCharacteristics(data.characteristics, null),
            modifier_refs: Array.isArray(data.modifier_refs) ? data.modifier_refs : [],
            icon: data.icon || null,
            source: data.source || "Custom",
            creator_url: data.creator_url || "",
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

    const db = createClient()
    const payload = {
      ...form,
      traits: form.traits.filter(t => t.name.trim()),
      creator_url: normalizeCreatorUrl(form.creator_url),
    }
    
    if (id === "new") {
      const { error } = await db.from("species").insert([payload])
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await db.from("species").update(payload).eq("id", id)
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
    
    const db = createClient()
    await db.from("species").delete().eq("id", id)
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

  const updateTraitOption = (
    traitIndex: number,
    optionIndex: number,
    field: "name" | "description" | "modifierRefs",
    value: string | string[],
  ) => {
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
      <CompendiumEditorToolbar
        tab="species"
        title={id === "new" ? "New Species" : "Edit Species"}
        isNew={id === "new"}
        saving={saving}
        saveLabel="Save Species"
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
          {/* Basic Info */}
          <CompendiumEditorHeaderRow
            nameLabel="Species Name"
            name={form.name}
            onNameChange={(name) => setForm({ ...form, name })}
            namePlaceholder="Elf"
            source={form.source}
            onSourceChange={(source) => setForm({ ...form, source })}
            creatorUrl={form.creator_url}
            onCreatorUrlChange={(creator_url) => setForm({ ...form, creator_url })}
            icon={form.icon}
            onIconChange={(icon) => setForm({ ...form, icon })}
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Description
            </label>
            <RichTextEditor
              value={form.description}
              onChange={(description) => setForm({ ...form, description })}
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
                    <>
                      <RichTextEditor
                        value={trait.description}
                        onChange={(description) => updateTrait(index, { description })}
                        placeholder="Trait description..."
                        minHeightClass="min-h-[3rem]"
                      />
                      <ModifierCatalogPicker
                        value={trait.modifierRefs ?? []}
                        onChange={(modifierRefs) => updateTrait(index, { modifierRefs })}
                        catalog={modifierCatalog}
                        label="Trait modifiers"
                      />
                    </>
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
                            <RichTextEditor
                              value={option.description}
                              onChange={(description) => updateTraitOption(index, optIndex, "description", description)}
                              placeholder="Option description..."
                              minHeightClass="min-h-[3rem]"
                            />
                            <ModifierCatalogPicker
                              value={option.modifierRefs ?? []}
                              onChange={(modifierRefs) =>
                                updateTraitOption(index, optIndex, "modifierRefs", modifierRefs)
                              }
                              catalog={modifierCatalog}
                              label="Option modifiers"
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

          <ModifierCatalogPicker
            value={form.modifier_refs}
            onChange={(modifier_refs) => setForm({ ...form, modifier_refs })}
            catalog={modifierCatalog}
            label="Species-wide modifier effects"
          />

          <details className="rounded-xl border border-border p-4">
            <summary className="cursor-pointer text-sm font-semibold text-foreground">
              Legacy inline species modifiers (optional)
            </summary>
            <CharacteristicModifiersEditor
              value={form.characteristics}
              onChange={(characteristics) => setForm({ ...form, characteristics })}
              spellOptions={allSpells}
            />
          </details>

          {/* Submit */}
        </form>
      </main>
    </div>
  )
}
