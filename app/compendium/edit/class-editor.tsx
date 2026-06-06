"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/db/client"
import { Plus, X } from "lucide-react"
import { CompendiumEditorHeaderRow } from "@/components/compendium/editor-header-row"
import {
  CompendiumEditorToolbar,
  COMPENDIUM_EDITOR_FORM_ID,
} from "@/components/compendium/editor-toolbar"
import type { FeatureChoice, Feature, ClassResource, ClassResourceRow } from "@/lib/types"
import { ClassFeatureFields } from "@/components/compendium/class-feature-fields"
import { RichTextEditor } from "@/components/compendium/rich-text-editor"
import { resourcesForClass } from "@/lib/compendium/class-resource-rows"
import { compendiumEditHref } from "@/lib/compendium/edit-href"
import { compendiumListHref } from "@/lib/compendium/content-types"
import { DND_SKILLS } from "@/lib/compendium/constants"
import { normalizeCreatorUrl } from "@/components/compendium/source-link-field"
import { normalizeFeatureRow } from "@/lib/compendium/normalize-feature-activation"

const ABILITIES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"]
const ARMOR_TYPES = ["Light armor", "Medium armor", "Heavy armor", "Shields"]
const WEAPON_TYPES = ["Simple weapons", "Martial weapons", "Specific weapon"]
const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1)
const ABILITY_MODIFIERS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const
const DIE_TYPES = ["d4", "d6", "d8", "d10", "d12", "d20"] as const
const SKILLS = [...DND_SKILLS]

// Starting equipment choice structure
interface EquipmentOption {
  label: string  // e.g. "(a) a longsword" - display label
  items: { name: string; quantity: number }[]
}

interface StartingEquipmentGroup {
  description: string  // e.g. "Choose one of the following"
  options: EquipmentOption[]
}

interface ClassFeature extends Feature {}

interface ClassFormData {
  name: string
  description: string
  hit_die: number
  primary_ability: string[]
  saving_throws: string[]
  armor_proficiencies: string[]
  weapon_proficiencies: string[]
  skill_choices: { count: number; options: string[] }
  features: ClassFeature[]
  spellcasting: {
    ability: string
    starts_at: number
  } | null
  starting_gold: number
  starting_equipment_groups: StartingEquipmentGroup[]
  icon: string | null
  source: string
  creator_url: string
}

const defaultClass: ClassFormData = {
  name: "",
  description: "",
  hit_die: 8,
  primary_ability: [],
  saving_throws: [],
  armor_proficiencies: [],
  weapon_proficiencies: [],
  skill_choices: { count: 2, options: [] },
  features: [{ level: 1, name: "", description: "" }],
  spellcasting: null,
  starting_gold: 0,
  starting_equipment_groups: [],
  icon: null,
  source: "Custom",
  creator_url: "",
}

export default function ClassEditorPage({ id }: { id: string }) {
  const [form, setForm] = useState<ClassFormData>(defaultClass)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSpellcasting, setHasSpellcasting] = useState(false)
  const [classResources, setClassResources] = useState<ClassResource[]>([])
  const [classResourceRows, setClassResourceRows] = useState<ClassResourceRow[]>([])
  const router = useRouter()

  useEffect(() => {
    if (id && id !== "new") {
      const fetchClass = async () => {
        setLoading(true)
        const db = createClient()
        const [{ data, error }, { data: resourceRows }] = await Promise.all([
          db.from("classes").select("*").eq("id", id).single(),
          db.from("class_resources").select("*").eq("class_id", id),
        ])
        
        if (error) {
          setError("Class not found")
        } else if (data) {
          const spellcasting = data.spellcasting
            ? {
                ability: data.spellcasting.ability || "Intelligence",
                starts_at: data.spellcasting.starts_at ?? 1,
              }
            : null
          setForm({
            name: data.name || "",
            description: data.description || "",
            hit_die: data.hit_die || 8,
            primary_ability: data.primary_ability || [],
            saving_throws: data.saving_throws || [],
            armor_proficiencies: data.armor_proficiencies || [],
            weapon_proficiencies: data.weapon_proficiencies || [],
            skill_choices: data.skill_choices || { count: 2, options: [] },
            features: (data.features || [{ level: 1, name: "", description: "" }]).map((feature) =>
              normalizeFeatureRow(feature),
            ),
            spellcasting,
            starting_gold: data.starting_gold ?? 0,
            starting_equipment_groups: data.starting_equipment_groups || [],
            icon: data.icon || null,
            source: data.source || "Custom",
            creator_url: data.creator_url || "",
          })
          setHasSpellcasting(!!data.spellcasting)
          setClassResources(resourcesForClass(id, (resourceRows || []) as ClassResourceRow[]))
          setClassResourceRows((resourceRows || []) as ClassResourceRow[])
        }
        setLoading(false)
      }
      fetchClass()
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const db = createClient()
    const payload = {
      ...form,
      features: form.features.filter(f => f.name.trim()),
      spellcasting: hasSpellcasting ? form.spellcasting : null,
      creator_url: normalizeCreatorUrl(form.creator_url),
    }
    
    if (id === "new") {
      const { error } = await db.from("classes").insert([payload])
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await db.from("classes").update(payload).eq("id", id)
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    }
    
    setSaving(false)
    router.push("/compendium?tab=classes")
  }

  const handleExport = () => {
    const exportData = {
      type: "dnd-class",
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
    a.download = `${form.name.toLowerCase().replace(/\s+/g, "-")}-class.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this class?")) return
    
    const db = createClient()
    await db.from("classes").delete().eq("id", id)
    router.push("/compendium?tab=classes")
  }

  const addFeature = () => {
    setForm(prev => ({
      ...prev,
      features: [...prev.features, { level: 1, name: "", description: "" }]
    }))
  }

  const removeFeature = (index: number) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }))
  }

  const updateFeature = (index: number, patch: Partial<ClassFeature>) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? { ...f, ...patch } : f)
    }))
  }

  const updateFeatureField = (index: number, field: keyof ClassFeature, value: string | number) => {
    updateFeature(index, { [field]: value } as Partial<ClassFeature>)
  }

  const toggleArrayField = (field: "primary_ability" | "saving_throws" | "armor_proficiencies" | "weapon_proficiencies", value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }))
  }

  const toggleSkillOption = (skill: string) => {
    setForm(prev => ({
      ...prev,
      skill_choices: {
        ...prev.skill_choices,
        options: prev.skill_choices.options.includes(skill)
          ? prev.skill_choices.options.filter(s => s !== skill)
          : [...prev.skill_choices.options, skill]
      }
    }))
  }

  // Feature choice helpers
  const toggleFeatureChoice = (index: number, checked: boolean) => {
    const newFeatures = [...form.features]
    newFeatures[index] = {
      ...newFeatures[index],
      isChoice: checked,
      choices: checked
        ? (newFeatures[index].choices || {
            kind: "options",
            category: "Feature Option",
            options: [{ name: "", description: "" }],
            count: 1,
          })
        : undefined,
    }
    setForm({ ...form, features: newFeatures })
  }

  const setFeatureChoiceKind = (index: number, kind: "options" | "feats") => {
    const newFeatures = [...form.features]
    const existing = newFeatures[index].choices || {
      category: "",
      options: [],
      count: 1,
    }
    newFeatures[index] = {
      ...newFeatures[index],
      choices: {
        ...existing,
        kind,
        options: kind === "feats" ? [] : existing.options?.length ? existing.options : [{ name: "", description: "" }],
        featCategories:
          kind === "feats"
            ? existing.featCategories?.length
              ? existing.featCategories
              : ["General"]
            : existing.featCategories,
      },
    }
    setForm({ ...form, features: newFeatures })
  }

  const updateFeatureChoiceField = (featIndex: number, field: keyof FeatureChoice, value: unknown) => {
    const newFeatures = [...form.features]
    const existing = newFeatures[featIndex].choices || { category: "", options: [], count: 1 }
    newFeatures[featIndex] = { ...newFeatures[featIndex], choices: { ...existing, [field]: value } }
    setForm({ ...form, features: newFeatures })
  }

  const addChoiceOption = (featIndex: number) => {
    const newFeatures = [...form.features]
    const existing = newFeatures[featIndex].choices!
    newFeatures[featIndex] = {
      ...newFeatures[featIndex],
      choices: { ...existing, options: [...existing.options, { name: "", description: "" }] }
    }
    setForm({ ...form, features: newFeatures })
  }

  const updateChoiceOption = (featIndex: number, optIndex: number, field: "name" | "description", value: string) => {
    const newFeatures = [...form.features]
    const existing = newFeatures[featIndex].choices!
    const newOptions = existing.options.map((o, i) => i === optIndex ? { ...o, [field]: value } : o)
    newFeatures[featIndex] = { ...newFeatures[featIndex], choices: { ...existing, options: newOptions } }
    setForm({ ...form, features: newFeatures })
  }

  const removeChoiceOption = (featIndex: number, optIndex: number) => {
    const newFeatures = [...form.features]
    const existing = newFeatures[featIndex].choices!
    newFeatures[featIndex] = {
      ...newFeatures[featIndex],
      choices: { ...existing, options: existing.options.filter((_, i) => i !== optIndex) }
    }
    setForm({ ...form, features: newFeatures })
  }

  // Starting equipment helpers
  const addEquipmentGroup = () => {
    setForm(prev => ({
      ...prev,
      starting_equipment_groups: [
        ...prev.starting_equipment_groups,
        { description: "Choose one of the following", options: [{ label: "(a)", items: [{ name: "", quantity: 1 }] }] }
      ]
    }))
  }

  const removeEquipmentGroup = (gi: number) => {
    setForm(prev => ({ ...prev, starting_equipment_groups: prev.starting_equipment_groups.filter((_, i) => i !== gi) }))
  }

  const addEquipmentOption = (gi: number) => {
    const groups = [...form.starting_equipment_groups]
    const alpha = String.fromCharCode(97 + groups[gi].options.length)
    groups[gi] = { ...groups[gi], options: [...groups[gi].options, { label: `(${alpha})`, items: [{ name: "", quantity: 1 }] }] }
    setForm({ ...form, starting_equipment_groups: groups })
  }

  const removeEquipmentOption = (gi: number, oi: number) => {
    const groups = [...form.starting_equipment_groups]
    groups[gi] = { ...groups[gi], options: groups[gi].options.filter((_, i) => i !== oi) }
    setForm({ ...form, starting_equipment_groups: groups })
  }

  const addItemToOption = (gi: number, oi: number) => {
    const groups = [...form.starting_equipment_groups]
    groups[gi].options[oi].items.push({ name: "", quantity: 1 })
    setForm({ ...form, starting_equipment_groups: groups })
  }

  const updateOptionItem = (gi: number, oi: number, ii: number, field: "name" | "quantity", value: string | number) => {
    const groups = [...form.starting_equipment_groups]
    groups[gi].options[oi].items[ii] = { ...groups[gi].options[oi].items[ii], [field]: value }
    setForm({ ...form, starting_equipment_groups: groups })
  }

  const removeOptionItem = (gi: number, oi: number, ii: number) => {
    const groups = [...form.starting_equipment_groups]
    groups[gi].options[oi].items = groups[gi].options[oi].items.filter((_, i) => i !== ii)
    setForm({ ...form, starting_equipment_groups: groups })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-8" />
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
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
        tab="classes"
        title={id === "new" ? "New Class" : "Edit Class"}
        isNew={id === "new"}
        saving={saving}
        saveLabel="Save Class"
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
            nameLabel="Class Name"
            name={form.name}
            onNameChange={(name) => setForm({ ...form, name })}
            namePlaceholder="Fighter"
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
              placeholder="A warrior who fights with great strength..."
            />
          </div>

          {/* Hit Die */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Hit Die
            </label>
            <select
              value={form.hit_die}
              onChange={(e) => setForm({ ...form, hit_die: parseInt(e.target.value) })}
              className="w-full md:w-48 px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
            >
              {[4, 6, 8, 10, 12, 20].map((die) => (
                <option key={die} value={die}>d{die}</option>
              ))}
            </select>
          </div>

          {/* Primary Abilities */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Primary Abilities
            </label>
            <div className="flex flex-wrap gap-3">
              {ABILITIES.map((ability) => (
                <label key={ability} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.primary_ability.includes(ability)}
                    onChange={() => toggleArrayField("primary_ability", ability)}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-foreground">{ability}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Saving Throws */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Saving Throw Proficiencies
            </label>
            <div className="flex flex-wrap gap-3">
              {ABILITIES.map((ability) => (
                <label key={ability} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.saving_throws.includes(ability)}
                    onChange={() => toggleArrayField("saving_throws", ability)}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-foreground">{ability}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Armor Proficiencies */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Armor Proficiencies
            </label>
            <div className="flex flex-wrap gap-3">
              {ARMOR_TYPES.map((armor) => (
                <label key={armor} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.armor_proficiencies.includes(armor)}
                    onChange={() => toggleArrayField("armor_proficiencies", armor)}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-foreground">{armor}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Weapon Proficiencies */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Weapon Proficiencies
            </label>
            <div className="flex flex-wrap gap-3">
              {WEAPON_TYPES.map((weapon) => (
                <label key={weapon} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.weapon_proficiencies.includes(weapon)}
                    onChange={() => toggleArrayField("weapon_proficiencies", weapon)}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-foreground">{weapon}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Skill Choices */}
          <div className="bg-card border-2 border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-foreground">
                Skill Proficiency Choices
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Choose</span>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={form.skill_choices.count}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    skill_choices: { ...prev.skill_choices, count: parseInt(e.target.value) || 2 }
                  }))}
                  className="w-16 px-2 py-1 bg-background border-2 border-border rounded-lg text-center"
                />
                <span className="text-sm text-muted-foreground">from:</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SKILLS.map((skill) => (
                <label key={skill} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.skill_choices.options.includes(skill)}
                    onChange={() => toggleSkillOption(skill)}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-foreground">{skill}</span>
                </label>
              ))}
            </div>
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
                      spellcasting: { ability: "Intelligence", starts_at: 1 }
                    }))
                  }
                }}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="font-semibold text-foreground">Has Spellcasting</span>
            </label>
            
            {hasSpellcasting && form.spellcasting && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                  >
                    {ABILITIES.map((ability) => (
                      <option key={ability} value={ability}>{ability}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Starts at Level
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.spellcasting.starts_at ?? 1}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      spellcasting: { ...prev.spellcasting!, starts_at: parseInt(e.target.value) || 1 }
                    }))}
                    className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Class Resources — managed in compendium tab */}
          <div className="bg-card border-2 border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <label className="text-sm font-semibold text-foreground">Class Resources</label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Level-scaling pools (Rage, Focus Points, etc.) live in the Class Resources compendium section.
                </p>
              </div>
              {id !== "new" && (
                <Link
                  href={`${compendiumEditHref("class_resources", "new")}?class_id=${id}`}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Add Resource
                </Link>
              )}
            </div>
            {id === "new" ? (
              <p className="text-sm text-muted-foreground">Save this class first, then add resources.</p>
            ) : classResources.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No resources yet.{" "}
                <Link href={compendiumListHref("class_resources")} className="text-primary hover:underline">
                  Browse Class Resources
                </Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {classResourceRows.map((resource) => (
                  <li
                    key={resource.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-semibold text-foreground">{resource.name}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{resource.resource_key}</span>
                    </span>
                    <Link
                      href={compendiumEditHref("class_resources", resource.id)}
                      className="text-xs text-primary hover:underline shrink-0"
                    >
                      Edit
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Class Features */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-foreground">
                Class Features
              </label>
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
                <div key={index} className="bg-card border-2 border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={feature.name}
                        onChange={(e) => updateFeatureField(index, "name", e.target.value)}
                        placeholder="Feature name"
                        className="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="w-32">
                      <select
                        value={feature.level}
                        onChange={(e) => updateFeatureField(index, "level", parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 bg-background border-2 border-border rounded-lg text-foreground text-center focus:outline-none focus:border-primary"
                      >
                        {LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>Level {lvl}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <ClassFeatureFields
                    feature={feature}
                    index={index}
                    classResources={classResources}
                    onUpdate={updateFeature}
                    onToggleChoice={toggleFeatureChoice}
                    onUpdateChoiceField={updateFeatureChoiceField}
                    onSetChoiceKind={setFeatureChoiceKind}
                    onAddChoiceOption={addChoiceOption}
                    onUpdateChoiceOption={updateChoiceOption}
                    onRemoveChoiceOption={removeChoiceOption}
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
          </div>

          {/* Starting Equipment */}
          <div className="bg-card border-2 border-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold text-foreground">Starting Equipment</label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Define equipment choice groups. Players pick one option per group.
                </p>
              </div>
              <button type="button" onClick={addEquipmentGroup}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                <Plus className="w-4 h-4" />
                Add Choice Group
              </button>
            </div>

            {/* Starting Gold */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-foreground shrink-0">Starting Gold (gp):</label>
              <input
                type="number"
                min={0}
                value={form.starting_gold}
                onChange={(e) => setForm({ ...form, starting_gold: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-28 px-3 py-2 bg-background border-2 border-border rounded-xl text-foreground text-center focus:outline-none focus:border-primary"
              />
              <span className="text-xs text-muted-foreground">
                Players can take gold instead of equipment choices.
              </span>
            </div>

            {/* Choice Groups */}
            {form.starting_equipment_groups.map((group, gi) => (
              <div key={gi} className="border-2 border-border rounded-xl p-3 space-y-3 bg-background">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={group.description}
                    onChange={(e) => {
                      const groups = [...form.starting_equipment_groups]
                      groups[gi] = { ...groups[gi], description: e.target.value }
                      setForm({ ...form, starting_equipment_groups: groups })
                    }}
                    placeholder="e.g. Choose one of the following weapons"
                    className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary font-medium"
                  />
                  <button type="button" onClick={() => addEquipmentOption(gi)}
                    className="px-2 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 text-xs font-semibold whitespace-nowrap">
                    + Option
                  </button>
                  <button type="button" onClick={() => removeEquipmentGroup(gi)}
                    className="p-2 text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {group.options.map((opt, oi) => (
                  <div key={oi} className="pl-3 border-l-2 border-primary/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt.label}
                        onChange={(e) => {
                          const groups = [...form.starting_equipment_groups]
                          groups[gi].options[oi] = { ...groups[gi].options[oi], label: e.target.value }
                          setForm({ ...form, starting_equipment_groups: groups })
                        }}
                        placeholder="(a)"
                        className="w-20 px-2 py-1 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                      />
                      <span className="text-xs text-muted-foreground">Label</span>
                      <button type="button" onClick={() => addItemToOption(gi, oi)}
                        className="ml-auto px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80">
                        + Item
                      </button>
                      <button type="button" onClick={() => removeEquipmentOption(gi, oi)}
                        className="p-1 text-muted-foreground hover:text-destructive">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {opt.items.map((item, ii) => (
                      <div key={ii} className="flex items-center gap-2 ml-2">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateOptionItem(gi, oi, ii, "quantity", parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 bg-card border border-border rounded-lg text-sm text-center focus:outline-none focus:border-primary"
                        />
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateOptionItem(gi, oi, ii, "name", e.target.value)}
                          placeholder="Item name"
                          className="flex-1 px-3 py-1 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                        />
                        <button type="button" onClick={() => removeOptionItem(gi, oi, ii)}
                          className="p-1 text-muted-foreground hover:text-destructive">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}

            {form.starting_equipment_groups.length === 0 && (
              <p className="text-sm text-muted-foreground italic text-center py-2">
                No equipment choice groups yet. Click &quot;Add Choice Group&quot; to begin.
              </p>
            )}
          </div>

        </form>
      </main>
    </div>
  )
}
