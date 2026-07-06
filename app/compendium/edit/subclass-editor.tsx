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
import type { DndClass, Feature, FeatureChoice, ClassResource, ClassResourceRow } from "@/lib/types"
import { resourcesForClass } from "@/lib/compendium/class-resource-rows"
import { ClassFeatureFields } from "@/components/compendium/class-feature-fields"
import { useModifierCatalog } from "@/hooks/use-modifier-catalog"
import { CompendiumDescriptionCardImageRow } from "@/components/compendium/description-card-image-row"
import { CompendiumEditorHeaderRow } from "@/components/compendium/editor-header-row"
import {
  CompendiumEditorToolbar,
  COMPENDIUM_EDITOR_FORM_ID,
} from "@/components/compendium/editor-toolbar"
import { normalizeCreatorUrl } from "@/components/compendium/source-link-field"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { clearModifierReviewPending, featureNeedsModifierReview } from "@/lib/compendium/modifier-review"
import { cn } from "@/lib/utils"
import { useDuplicateCompendiumItem } from "@/hooks/use-duplicate-compendium-item"
import { asCompendiumRow, asCompendiumRows, castCompendiumRow } from "@/lib/data/types"
import type { CompendiumThemeColorId } from "@/lib/compendium/theme-colors"

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
  accent_color: string | null
  card_image_url: string | null
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
  accent_color: null,
  card_image_url: null,
}

export default function SubclassEditorPage({ id }: { id: string }) {
  const { catalog: modifierCatalog } = useModifierCatalog()
  const [form, setForm] = useState<SubclassFormData>(defaultSubclass)
  const [classes, setClasses] = useState<DndClass[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSpellcasting, setHasSpellcasting] = useState(false)
  const [classResources, setClassResources] = useState<ClassResource[]>([])
  const router = useRouter()
  const { handleCopy, copying, copyError, canCopy } = useDuplicateCompendiumItem("subclasses", id)

  // Fetch classes for dropdown
  useEffect(() => {
    const fetchClasses = async () => {
      const db = createClient()
      const { data } = await db.from("classes").select("id, name").order("name")
      setClasses(asCompendiumRows(data) as unknown as DndClass[])
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
          const row = asCompendiumRow(data)
          if (!row) {
            setError("Subclass not found")
          } else {
            setForm({
              name: String(row.name ?? ""),
              description: String(row.description ?? ""),
              class_id: String(row.class_id ?? ""),
              features: Array.isArray(row.features) && row.features.length
                ? (row.features as Feature[])
                : [{ level: 3, name: "", description: "" }],
              spellcasting: (row.spellcasting as SubclassFormData["spellcasting"]) || null,
              source: String(row.source ?? "Custom"),
              creator_url: String(row.creator_url ?? ""),
              icon: (row.icon as string | null) ?? null,
              accent_color: (row.accent_color as string | null) ?? null,
              card_image_url: (row.card_image_url as string | null) ?? null,
            })
            setHasSpellcasting(!!row.spellcasting)
          }
        }
        setLoading(false)
      }
      fetchSubclass()
    }
  }, [id])

  useEffect(() => {
    const loadClassResources = async () => {
      if (!form.class_id) {
        setClassResources([])
        return
      }
      const db = createClient()
      const { data } = await db
        .from("class_resources")
        .select("class_id, resource_key, name, description, uses")
        .eq("class_id", form.class_id)
        .order("name")
      setClassResources(
        resourcesForClass(form.class_id, asCompendiumRows(data) as unknown as ClassResourceRow[]),
      )
    }
    void loadClassResources()
  }, [form.class_id])

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
      features: prev.features.map((f, i) => {
        if (i !== index) return f
        return clearModifierReviewPending({ ...f, ...updates })
      })
    }))
  }

  const toggleFeatureChoice = (index: number, checked?: boolean) => {
    const feature = form.features[index]
    const nextChecked = checked ?? !feature.isChoice
    if (!nextChecked) {
      updateFeature(index, { isChoice: false, choices: undefined })
    } else {
      updateFeature(index, {
        isChoice: true,
        choices: { category: feature.name || "Option", options: [{ name: "", description: "" }], count: 1 },
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

  const updateFeatureOption = (
    featureIndex: number,
    optionIndex: number,
    field: "name" | "description" | "modifierRefs" | "linkedModifiers",
    value: string | string[] | LinkedModifierInstance[],
  ) => {
    const feature = form.features[featureIndex]
    if (!feature.choices) return
    updateFeature(featureIndex, {
      choices: {
        ...feature.choices,
        options: feature.choices.options.map((opt, i) => {
          if (i !== optionIndex) return opt
          if (field === "linkedModifiers" && Array.isArray(value)) {
            return syncModifierRefs({ ...opt, linkedModifiers: value as LinkedModifierInstance[] })
          }
          return { ...opt, [field]: value as string | string[] }
        }) as FeatureChoice["options"],
      },
    })
  }

  const updateFeatureChoiceField = (index: number, field: keyof FeatureChoice, value: unknown) => {
    const feature = form.features[index]
    if (!feature.choices) return
    updateFeature(index, { choices: { ...feature.choices, [field]: value } })
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
            accentColor={form.accent_color as CompendiumThemeColorId | null}
            onAccentColorChange={(accent_color) => setForm({ ...form, accent_color })}
            cardImageUrl={form.card_image_url}
            onCardImageUrlChange={(card_image_url) => setForm({ ...form, card_image_url })}
            cardImagePlacement="none"
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

          <CompendiumDescriptionCardImageRow
            description={form.description}
            onDescriptionChange={(description) => setForm({ ...form, description })}
            descriptionPlaceholder="Describe the subclass theme and flavor..."
            cardImageUrl={form.card_image_url}
            onCardImageUrlChange={(card_image_url) => setForm({ ...form, card_image_url })}
            cardImageCrop="top"
          />

          <CompendiumEditorPanel title="Spellcasting">
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
          </CompendiumEditorPanel>

          <CompendiumEditorSection
            title="Subclass Features"
            hint="Features gained at various levels"
            addLabel="Add Feature"
            onAdd={addFeature}
            collapsible
          >
            <div className="space-y-4">
              {form.features.map((feature, index) => (
                <div
                  key={index}
                  className={cn(
                    "bg-card border-2 rounded-xl p-4",
                    featureNeedsModifierReview(feature)
                      ? "border-destructive bg-destructive/5"
                      : "border-border",
                  )}
                >
                  {featureNeedsModifierReview(feature) ? (
                    <p className="mb-3 text-xs font-medium text-destructive">
                      No modifier linked — use Modifier effects below, then save.
                    </p>
                  ) : null}
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

                  <ClassFeatureFields
                    feature={feature}
                    index={index}
                    classResources={classResources}
                    modifierCatalog={modifierCatalog}
                    siblingFeatures={form.features.map((feat) => ({
                      name: feat.name,
                      level: feat.level,
                    }))}
                    onUpdate={updateFeature}
                    onToggleChoice={toggleFeatureChoice}
                    onUpdateChoiceField={updateFeatureChoiceField}
                    onAddChoiceOption={addFeatureOption}
                    onUpdateChoiceOption={updateFeatureOption}
                    onRemoveChoiceOption={removeFeatureOption}
                    onToggleLimitedUses={(featIndex, checked) => {
                      if (checked) {
                        updateFeature(featIndex, { limitedUses: { type: "unlimited" } })
                      } else {
                        updateFeature(featIndex, { limitedUses: null })
                      }
                    }}
                    onUpdateLimitedUses={(featIndex, uses) =>
                      updateFeature(featIndex, { limitedUses: uses })
                    }
                  />
                </div>
              ))}
            </div>
          </CompendiumEditorSection>

        </form>
      </main>
    </div>
  )
}
