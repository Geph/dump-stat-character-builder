"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
import Link from "next/link"

const ABILITIES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]
const SKILLS = [
  "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception",
  "History", "Insight", "Intimidation", "Investigation", "Medicine",
  "Nature", "Perception", "Performance", "Persuasion", "Religion",
  "Sleight of Hand", "Stealth", "Survival"
]

interface BackgroundFormData {
  name: string
  description: string
  ability_bonuses: Record<string, number>
  skill_proficiencies: string[]
  tool_proficiencies: string[]
  feat_granted: string
  source: string
}

const defaultBackground: BackgroundFormData = {
  name: "",
  description: "",
  ability_bonuses: {},
  skill_proficiencies: [],
  tool_proficiencies: [],
  feat_granted: "",
  source: "Custom",
}

export default function BackgroundEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  const [form, setForm] = useState<BackgroundFormData>(defaultBackground)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toolInput, setToolInput] = useState("")
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => setId(id))
  }, [params])

  useEffect(() => {
    if (id && id !== "new") {
      const fetchBackground = async () => {
        setLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
          .from("backgrounds")
          .select("*")
          .eq("id", id)
          .single()
        
        if (error) {
          setError("Background not found")
        } else if (data) {
          setForm({
            name: data.name || "",
            description: data.description || "",
            ability_bonuses: data.ability_bonuses || {},
            skill_proficiencies: data.skill_proficiencies || [],
            tool_proficiencies: data.tool_proficiencies || [],
            feat_granted: data.feat_granted || "",
            source: data.source || "Custom",
          })
        }
        setLoading(false)
      }
      fetchBackground()
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()
    
    if (id === "new") {
      const { error } = await supabase.from("backgrounds").insert([form])
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase.from("backgrounds").update(form).eq("id", id)
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    }
    
    setSaving(false)
    router.push("/compendium?tab=backgrounds")
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this background?")) return
    
    const supabase = createClient()
    await supabase.from("backgrounds").delete().eq("id", id)
    router.push("/compendium?tab=backgrounds")
  }

  const setAbilityBonus = (ability: string, value: number) => {
    setForm(prev => {
      const newBonuses = { ...prev.ability_bonuses }
      if (value === 0) {
        delete newBonuses[ability]
      } else {
        newBonuses[ability] = value
      }
      return { ...prev, ability_bonuses: newBonuses }
    })
  }

  const toggleSkill = (skill: string) => {
    setForm(prev => ({
      ...prev,
      skill_proficiencies: prev.skill_proficiencies.includes(skill)
        ? prev.skill_proficiencies.filter(s => s !== skill)
        : [...prev.skill_proficiencies, skill]
    }))
  }

  const addToolProficiency = () => {
    if (toolInput.trim()) {
      setForm(prev => ({
        ...prev,
        tool_proficiencies: [...prev.tool_proficiencies, toolInput.trim()]
      }))
      setToolInput("")
    }
  }

  const removeToolProficiency = (tool: string) => {
    setForm(prev => ({
      ...prev,
      tool_proficiencies: prev.tool_proficiencies.filter(t => t !== tool)
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
              href="/compendium?tab=backgrounds"
              className="p-2 hover:bg-muted rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-black text-foreground">
              {id === "new" ? "New Background" : "Edit Background"}
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
                Background Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                placeholder="Sage"
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
              placeholder="You spent years learning the lore of the multiverse..."
            />
          </div>

          {/* Ability Bonuses (D&D 2024) */}
          <div className="bg-card border-2 border-border rounded-xl p-4">
            <label className="block text-sm font-semibold text-foreground mb-4">
              Ability Score Bonuses (D&D 2024)
            </label>
            <p className="text-sm text-muted-foreground mb-4">
              In D&D 2024, backgrounds grant ability score bonuses. Typically +2 to one score and +1 to another, or +1 to three scores.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {ABILITIES.map((ability) => (
                <div key={ability} className="flex items-center gap-3">
                  <span className="text-foreground capitalize w-24">{ability}</span>
                  <select
                    value={form.ability_bonuses[ability] || 0}
                    onChange={(e) => setAbilityBonus(ability, parseInt(e.target.value))}
                    className="flex-1 px-3 py-2 bg-background border-2 border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value={0}>+0</option>
                    <option value={1}>+1</option>
                    <option value={2}>+2</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Skill Proficiencies */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Skill Proficiencies
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SKILLS.map((skill) => (
                <label key={skill} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.skill_proficiencies.includes(skill)}
                    onChange={() => toggleSkill(skill)}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-foreground">{skill}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tool Proficiencies */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Tool Proficiencies
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={toolInput}
                onChange={(e) => setToolInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToolProficiency())}
                placeholder="Add tool proficiency..."
                className="flex-1 px-4 py-2 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={addToolProficiency}
                className="px-4 py-2 bg-primary/10 text-primary rounded-xl font-semibold hover:bg-primary/20 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.tool_proficiencies.map((tool) => (
                <span
                  key={tool}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm"
                >
                  {tool}
                  <button
                    type="button"
                    onClick={() => removeToolProficiency(tool)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Feat Granted (D&D 2024) */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Feat Granted (D&D 2024)
            </label>
            <p className="text-sm text-muted-foreground mb-2">
              In D&D 2024, backgrounds grant a 1st-level Origin feat.
            </p>
            <input
              type="text"
              value={form.feat_granted}
              onChange={(e) => setForm({ ...form, feat_granted: e.target.value })}
              className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              placeholder="Alert"
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
              {saving ? "Saving..." : "Save Background"}
            </button>
            <Link
              href="/compendium?tab=backgrounds"
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
