"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Save, Trash2, Plus, X } from "lucide-react"
import Link from "next/link"

const ABILITIES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"]
const ARMOR_TYPES = ["Light armor", "Medium armor", "Heavy armor", "Shields"]
const WEAPON_TYPES = ["Simple weapons", "Martial weapons", "Specific weapon"]
const SKILLS = [
  "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception",
  "History", "Insight", "Intimidation", "Investigation", "Medicine",
  "Nature", "Perception", "Performance", "Persuasion", "Religion",
  "Sleight of Hand", "Stealth", "Survival"
]

interface ClassFeature {
  level: number
  name: string
  description: string
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
                <div key={index} className="bg-card border-2 border-border rounded-xl p-4">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={feature.name}
                        onChange={(e) => updateFeature(index, "name", e.target.value)}
                        placeholder="Feature name"
                        className="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={feature.level}
                        onChange={(e) => updateFeature(index, "level", parseInt(e.target.value) || 1)}
                        placeholder="Level"
                        className="w-full px-3 py-2 bg-background border-2 border-border rounded-lg text-foreground text-center focus:outline-none focus:border-primary"
                      />
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
