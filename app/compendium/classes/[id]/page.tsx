"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Save, Trash2, Plus, X, Download } from "lucide-react"
import Link from "next/link"
import { GameIconPicker } from "@/components/game-icon-picker"
import type { UsesConfig, FeatureChoice } from "@/lib/types"

const ABILITIES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"]
const ARMOR_TYPES = ["Light armor", "Medium armor", "Heavy armor", "Shields"]
const WEAPON_TYPES = ["Simple weapons", "Martial weapons", "Specific weapon"]
const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1)
const ABILITY_MODIFIERS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const
const DIE_TYPES = ["d4", "d6", "d8", "d10", "d12", "d20"] as const
const SKILLS = [
  "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception",
  "History", "Insight", "Intimidation", "Investigation", "Medicine",
  "Nature", "Perception", "Performance", "Persuasion", "Religion",
  "Sleight of Hand", "Stealth", "Survival"
]

// Starting equipment choice structure
interface EquipmentOption {
  label: string  // e.g. "(a) a longsword" - display label
  items: { name: string; quantity: number }[]
}

interface StartingEquipmentGroup {
  description: string  // e.g. "Choose one of the following"
  options: EquipmentOption[]
}

interface ClassFeature {
  level: number
  name: string
  description: string
  isChoice?: boolean
  choices?: FeatureChoice
  limitedUses?: UsesConfig | null
}

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
}

export default function ClassEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  const [form, setForm] = useState<ClassFormData>(defaultClass)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSpellcasting, setHasSpellcasting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => setId(id))
  }, [params])

  useEffect(() => {
    if (id && id !== "new") {
      const fetchClass = async () => {
        setLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
          .from("classes")
          .select("*")
          .eq("id", id)
          .single()
        
        if (error) {
          setError("Class not found")
        } else if (data) {
          setForm({
            name: data.name || "",
            description: data.description || "",
            hit_die: data.hit_die || 8,
            primary_ability: data.primary_ability || [],
            saving_throws: data.saving_throws || [],
            armor_proficiencies: data.armor_proficiencies || [],
            weapon_proficiencies: data.weapon_proficiencies || [],
            skill_choices: data.skill_choices || { count: 2, options: [] },
            features: data.features || [{ level: 1, name: "", description: "" }],
            spellcasting: data.spellcasting || null,
            starting_gold: data.starting_gold ?? 0,
            starting_equipment_groups: data.starting_equipment_groups || [],
            icon: data.icon || null,
            source: data.source || "Custom",
          })
          setHasSpellcasting(!!data.spellcasting)
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

    const supabase = createClient()
    const payload = {
      ...form,
      features: form.features.filter(f => f.name.trim()),
      spellcasting: hasSpellcasting ? form.spellcasting : null,
    }
    
    if (id === "new") {
      const { error } = await supabase.from("classes").insert([payload])
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase.from("classes").update(payload).eq("id", id)
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
    
    const supabase = createClient()
    await supabase.from("classes").delete().eq("id", id)
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

  const updateFeature = (index: number, field: keyof ClassFeature, value: string | number) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? { ...f, [field]: value } : f)
    }))
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
        ? (newFeatures[index].choices || { category: "Feature Option", options: [{ name: "", description: "" }], count: 1 })
        : undefined,
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
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/compendium?tab=classes"
              className="p-3 bg-lemon text-lemon-foreground hover:brightness-110 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-black text-foreground">
              {id === "new" ? "New Class" : "Edit Class"}
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
                Class Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                placeholder="Fighter"
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
            label="Class Icon"
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
              {[6, 8, 10, 12].map((die) => (
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
                    value={form.spellcasting.starts_at}
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
                        onChange={(e) => updateFeature(index, "name", e.target.value)}
                        placeholder="Feature name"
                        className="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="w-32">
                      <select
                        value={feature.level}
                        onChange={(e) => updateFeature(index, "level", parseInt(e.target.value))}
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
                  <textarea
                    value={feature.description}
                    onChange={(e) => updateFeature(index, "description", e.target.value)}
                    placeholder="Feature description..."
                    rows={2}
                    className="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-foreground focus:outline-none focus:border-primary resize-none"
                  />
                  
                  {/* Is Choice Toggle */}
                  <div className="pt-2 border-t border-border space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={!!feature.isChoice}
                        onChange={(e) => toggleFeatureChoice(index, e.target.checked)}
                        className="w-4 h-4 rounded border-border accent-primary"
                      />
                      <span className="text-muted-foreground">This feature offers a choice between options</span>
                    </label>

                    {feature.isChoice && feature.choices && (
                      <div className="bg-background border-2 border-primary/20 rounded-xl p-3 space-y-3 ml-6">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-foreground mb-1">Category</label>
                            <input
                              type="text"
                              value={feature.choices.category}
                              onChange={(e) => updateFeatureChoiceField(index, "category", e.target.value)}
                              placeholder="e.g. Fighting Style"
                              className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-foreground mb-1">Number to Choose</label>
                            <input
                              type="number"
                              min={1}
                              value={feature.choices.count}
                              onChange={(e) => updateFeatureChoiceField(index, "count", parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-center focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground">Options</span>
                            <button
                              type="button"
                              onClick={() => addChoiceOption(index)}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20"
                            >
                              <Plus className="w-3 h-3" />
                              Add Option
                            </button>
                          </div>
                          {feature.choices.options.map((opt, oi) => (
                            <div key={oi} className="flex gap-2">
                              <input
                                type="text"
                                value={opt.name}
                                onChange={(e) => updateChoiceOption(index, oi, "name", e.target.value)}
                                placeholder="Option name"
                                className="flex-1 px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                              />
                              <input
                                type="text"
                                value={opt.description}
                                onChange={(e) => updateChoiceOption(index, oi, "description", e.target.value)}
                                placeholder="Description (optional)"
                                className="flex-1 px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                              />
                              <button type="button" onClick={() => removeChoiceOption(index, oi)}
                                className="p-1.5 text-muted-foreground hover:text-destructive">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Limited Uses Checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer text-sm pt-2 border-t border-border">
                    <input
                      type="checkbox"
                      checked={feature.limitedUses !== null && feature.limitedUses !== undefined}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newFeatures = [...form.features]
                          newFeatures[index] = { ...newFeatures[index], limitedUses: { type: "unlimited" } }
                          setForm({ ...form, features: newFeatures })
                        } else {
                          const newFeatures = [...form.features]
                          newFeatures[index] = { ...newFeatures[index], limitedUses: null }
                          setForm({ ...form, features: newFeatures })
                        }
                      }}
                      className="w-4 h-4 rounded border-border accent-primary"
                    />
                    <span className="text-muted-foreground">Has limited uses</span>
                  </label>

                  {/* Limited Uses Configuration */}
                  {feature.limitedUses && (
                    <div className="bg-card-lighter border-2 border-primary/30 rounded-lg p-3 space-y-3 ml-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-1">
                            Uses Type
                          </label>
                          <select
                            value={feature.limitedUses.type}
                            onChange={(e) => {
                              const newFeatures = [...form.features]
                              newFeatures[index] = {
                                ...newFeatures[index],
                                limitedUses: { ...feature.limitedUses!, type: e.target.value as UsesConfig["type"] }
                              }
                              setForm({ ...form, features: newFeatures })
                            }}
                            className="w-full px-3 py-2 bg-background border-2 border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                          >
                            <option value="unlimited">Unlimited (At Will)</option>
                            <option value="fixed">Fixed Number</option>
                            <option value="proficiency">Proficiency Modifier</option>
                            <option value="ability_modifier">Ability Modifier</option>
                            <option value="at_level">Based on Level</option>
                          </select>
                        </div>

                        {feature.limitedUses.type === "fixed" && (
                          <div>
                            <label className="block text-xs font-semibold text-foreground mb-1">
                              Number of Uses
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={99}
                              value={feature.limitedUses.fixedAmount ?? 1}
                              onChange={(e) => {
                                const newFeatures = [...form.features]
                                newFeatures[index] = {
                                  ...newFeatures[index],
                                  limitedUses: { ...feature.limitedUses!, fixedAmount: parseInt(e.target.value) || 1 }
                                }
                                setForm({ ...form, features: newFeatures })
                              }}
                              className="w-full px-3 py-2 bg-background border-2 border-border rounded-lg text-sm"
                            />
                          </div>
                        )}

                        {feature.limitedUses.type === "ability_modifier" && (
                          <div>
                            <label className="block text-xs font-semibold text-foreground mb-1">
                              Ability Score
                            </label>
                            <select
                              value={feature.limitedUses.abilityModifier || ""}
                              onChange={(e) => {
                                const newFeatures = [...form.features]
                                newFeatures[index] = {
                                  ...newFeatures[index],
                                  limitedUses: { ...feature.limitedUses!, abilityModifier: e.target.value as any }
                                }
                                setForm({ ...form, features: newFeatures })
                              }}
                              className="w-full px-3 py-2 bg-background border-2 border-border rounded-lg text-sm"
                            >
                              <option value="">Select...</option>
                              {ABILITY_MODIFIERS.map((mod) => (
                                <option key={mod} value={mod}>{mod}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-1">
                            Recharges On
                          </label>
                          <select
                            value={feature.limitedUses.recharge || ""}
                            onChange={(e) => {
                              const newFeatures = [...form.features]
                              newFeatures[index] = {
                                ...newFeatures[index],
                                limitedUses: { ...feature.limitedUses!, recharge: e.target.value as any }
                              }
                              setForm({ ...form, features: newFeatures })
                            }}
                            className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs"
                          >
                            <option value="">No recharge</option>
                            <option value="short_rest">Short Rest</option>
                            <option value="long_rest">Long Rest</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-1">
                            Die Count
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={feature.limitedUses.dieCount ?? ""}
                            onChange={(e) => {
                              const newFeatures = [...form.features]
                              newFeatures[index] = {
                                ...newFeatures[index],
                                limitedUses: { ...feature.limitedUses!, dieCount: e.target.value ? parseInt(e.target.value) : undefined }
                              }
                              setForm({ ...form, features: newFeatures })
                            }}
                            className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-1">
                            Die Type
                          </label>
                          <select
                            value={feature.limitedUses.dieType || ""}
                            onChange={(e) => {
                              const newFeatures = [...form.features]
                              newFeatures[index] = {
                                ...newFeatures[index],
                                limitedUses: { ...feature.limitedUses!, dieType: e.target.value as any }
                              }
                              setForm({ ...form, features: newFeatures })
                            }}
                            className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs"
                          >
                            <option value="">None</option>
                            {DIE_TYPES.map((die) => (
                              <option key={die} value={die}>{die}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
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

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? "Saving..." : "Save Class"}
            </button>
            <Link
              href="/compendium?tab=classes"
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
