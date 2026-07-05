"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/db/client"
import { Plus, X } from "lucide-react"
import {
  CompendiumEditorPanel,
  CompendiumEditorSection,
} from "@/components/compendium/compendium-editor-section"
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
import { enrichSpeciesList } from "@/lib/compendium/normalize-species-traits"
import { CREATURE_TYPES, SPECIES_SIZES } from "@/lib/compendium/constants"
import { normalizeCreatorUrl } from "@/components/compendium/source-link-field"
import { LinkedModifiersEditor } from "@/components/compendium/linked-modifiers-editor"
import { useModifierCatalog } from "@/hooks/use-modifier-catalog"
import { useDuplicateCompendiumItem } from "@/hooks/use-duplicate-compendium-item"
import {
  normalizeLinkedModifiers,
  readLinkedModifiers,
  syncModifierRefs,
  type LinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"
import { clearModifierReviewPending, featureNeedsModifierReview } from "@/lib/compendium/modifier-review"
import { cn } from "@/lib/utils"
import { readModifierRefs } from "@/lib/compendium/normalize-modifier-refs"
import { DurationEditor } from "@/components/compendium/duration-editor"
import type { Trait } from "@/lib/types"

interface SpeciesFormData {
  name: string
  description: string
  speed: number
  size: string
  size_options: string[]
  creature_type: string
  traits: Trait[]
  characteristics: CharacteristicModifier[]
  modifier_refs: string[]
  linked_modifiers: LinkedModifierInstance[]
  icon: string | null
  accent_color: string | null
  card_image_url: string | null
  source: string
  creator_url: string
}

const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1)

const defaultSpecies: SpeciesFormData = {
  name: "",
  description: "",
  speed: 30,
  size: "Medium",
  size_options: [],
  creature_type: "Humanoid",
  traits: [{ name: "", description: "", level: 1 }],
  characteristics: [],
  modifier_refs: [],
  linked_modifiers: [],
  icon: null,
  accent_color: null,
  card_image_url: null,
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
  const { handleCopy, copying, copyError, canCopy } = useDuplicateCompendiumItem("species", id)

  useEffect(() => {
    const fetchSpells = async () => {
      const db = createClient()
      const { data } = await db.from("spells").select("id, name, level").order("level").order("name").limit(500)
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
          const [enriched] = enrichSpeciesList([data as Record<string, unknown>])
          setForm({
            name: enriched.name || "",
            description: enriched.description || "",
            speed: enriched.speed || 30,
            size: enriched.size || "Medium",
            size_options: Array.isArray((enriched as { size_options?: unknown }).size_options)
              ? ((enriched as { size_options?: string[] }).size_options as string[])
              : [],
            creature_type: enriched.creature_type || "Humanoid",
            traits: enriched.traits?.length ? enriched.traits.map((t: Trait) => ({ ...t, level: t.level || 1 })) : [{ name: "", description: "", level: 1 }],
            characteristics: normalizeCharacteristics(enriched.characteristics, null),
            modifier_refs: readModifierRefs(enriched as Record<string, unknown>),
            linked_modifiers: readLinkedModifiers(enriched as Record<string, unknown>, modifierCatalog),
            icon: enriched.icon || null,
            accent_color: enriched.accent_color || null,
            card_image_url: enriched.card_image_url || null,
            source: enriched.source || "Custom",
            creator_url: enriched.creator_url || "",
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
    const synced = syncModifierRefs({ linkedModifiers: form.linked_modifiers })
    const payload = {
      ...form,
      ...synced,
      linked_modifiers: synced.linkedModifiers,
      modifier_refs: synced.modifierRefs,
      // Only persist a size choice when there are 2+ distinct options.
      size_options: form.size_options.length >= 2 ? form.size_options : null,
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
      traits: prev.traits.map((t, i) => {
        if (i !== index) return t
        return clearModifierReviewPending({ ...t, ...updates })
      })
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
    field: "name" | "description" | "modifierRefs" | "linkedModifiers",
    value: string | string[] | LinkedModifierInstance[],
  ) => {
    const trait = form.traits[traitIndex]
    if (!trait.choices) return
    updateTrait(traitIndex, {
      choices: {
        ...trait.choices,
        options: trait.choices.options.map((opt, i) => {
          if (i !== optionIndex) return opt
          if (field === "linkedModifiers") {
            return syncModifierRefs({ ...opt, linkedModifiers: value as LinkedModifierInstance[] })
          }
          if (field === "modifierRefs") {
            return { ...opt, modifierRefs: value as string[] }
          }
          return { ...opt, [field]: value as string }
        }),
      },
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
        onCopy={canCopy ? handleCopy : undefined}
        copying={copying}
        onDelete={id !== "new" ? handleDelete : undefined}
      />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {(error || copyError) && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive">
            {error || copyError}
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
            accentColor={form.accent_color}
            onAccentColorChange={(accent_color) => setForm({ ...form, accent_color })}
            cardImageUrl={form.card_image_url}
            onCardImageUrlChange={(card_image_url) => setForm({ ...form, card_image_url })}
            cardImageAspect="21/9"
          />

          <CompendiumEditorPanel title="Description">
            <RichTextEditor
              value={form.description}
              onChange={(description) => setForm({ ...form, description })}
              placeholder="Elves are a magical people of otherworldly grace..."
            />
          </CompendiumEditorPanel>

          <CompendiumEditorPanel title="Size, creature type & speed">
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
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">
                  Size choice (check 2+ to let players pick at character creation)
                </p>
                <div className="flex flex-wrap gap-3">
                  {SPECIES_SIZES.map((size) => {
                    const checked = form.size_options.includes(size)
                    return (
                      <label key={size} className="flex items-center gap-1.5 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setForm((prev) => {
                              const next = e.target.checked
                                ? [...prev.size_options, size]
                                : prev.size_options.filter((s) => s !== size)
                              const ordered: string[] = SPECIES_SIZES.filter((s) =>
                                next.includes(s),
                              )
                              return {
                                ...prev,
                                size_options: ordered,
                                size:
                                  ordered.length > 0 && !ordered.includes(prev.size)
                                    ? ordered[0]
                                    : prev.size,
                              }
                            })
                          }}
                        />
                        {size}
                      </label>
                    )
                  })}
                </div>
              </div>
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
          </CompendiumEditorPanel>

          <CompendiumEditorSection
            title="Traits"
            hint="Racial traits for this species (use Level to set when they become available)"
            addLabel="Add Trait"
            onAdd={addTrait}
            collapsible
          >
            <div className="space-y-4">
              {form.traits.map((trait, index) => (
                <div
                  key={index}
                  className={cn(
                    "bg-card border-2 rounded-xl p-4",
                    featureNeedsModifierReview(trait)
                      ? "border-destructive bg-destructive/5"
                      : "border-border",
                  )}
                >
                  {featureNeedsModifierReview(trait) ? (
                    <p className="mb-3 text-xs font-medium text-destructive">
                      No modifier linked — use Modifier effects below, then save.
                    </p>
                  ) : null}
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
                      <DurationEditor
                        value={trait.duration}
                        onChange={(duration) => updateTrait(index, { duration })}
                      />
                      <LinkedModifiersEditor
                        value={normalizeLinkedModifiers(trait.linkedModifiers, modifierCatalog, trait.modifierRefs)}
                        onChange={(linkedModifiers) =>
                          updateTrait(index, syncModifierRefs({ linkedModifiers }))
                        }
                        catalog={modifierCatalog}
                        label="Trait modifiers"
                        spellOptions={allSpells}
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
                            <LinkedModifiersEditor
                              value={normalizeLinkedModifiers(
                                option.linkedModifiers,
                                modifierCatalog,
                                option.modifierRefs,
                              )}
                              onChange={(linkedModifiers) =>
                                updateTraitOption(index, optIndex, "linkedModifiers", linkedModifiers)
                              }
                              catalog={modifierCatalog}
                              label="Option modifiers"
                              spellOptions={allSpells}
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
          </CompendiumEditorSection>

          <CompendiumEditorPanel title="Species-wide modifier effects">
          <LinkedModifiersEditor
            value={normalizeLinkedModifiers(form.linked_modifiers, modifierCatalog, form.modifier_refs)}
            onChange={(linked_modifiers) =>
              setForm((prev) => ({
                ...prev,
                ...syncModifierRefs({ linkedModifiers: linked_modifiers }),
                linked_modifiers,
              }))
            }
            catalog={modifierCatalog}
            label="Species-wide modifier effects"
            spellOptions={allSpells}
          />
          </CompendiumEditorPanel>

          {form.characteristics.length > 0 ? (
            <CompendiumEditorPanel>
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
            </CompendiumEditorPanel>
          ) : null}

          {/* Submit */}
        </form>
      </main>
    </div>
  )
}
