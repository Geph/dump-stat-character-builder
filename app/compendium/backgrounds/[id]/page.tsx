"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
import { Plus, X } from "lucide-react"
import { GameIconPicker } from "@/components/game-icon-picker"
import {
  CompendiumEditorToolbar,
  COMPENDIUM_EDITOR_FORM_ID,
} from "@/components/compendium/editor-toolbar"
import { SourceLinkField, normalizeCreatorUrl } from "@/components/compendium/source-link-field"

const ABILITIES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]
const SKILLS = [
  "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception",
  "History", "Insight", "Intimidation", "Investigation", "Medicine",
  "Nature", "Perception", "Performance", "Persuasion", "Religion",
  "Sleight of Hand", "Stealth", "Survival"
]

interface EquipmentItem {
  name: string
  quantity: number
}

interface BackgroundFormData {
  name: string
  description: string
  ability_bonuses: Record<string, number>
  skill_proficiencies: string[]
  tool_proficiencies: string[]
  feat_granted: string
  starting_gold: number
  starting_equipment: EquipmentItem[]
  source: string
  creator_url: string
  icon: string | null
}

const defaultBackground: BackgroundFormData = {
  name: "",
  description: "",
  ability_bonuses: {},
  skill_proficiencies: [],
  tool_proficiencies: [],
  feat_granted: "",
  starting_gold: 0,
  starting_equipment: [],
  source: "Custom",
  creator_url: "",
  icon: null,
}

export default function BackgroundEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  const [form, setForm] = useState<BackgroundFormData>(defaultBackground)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toolInput, setToolInput] = useState("")
  const [equipInput, setEquipInput] = useState("")
  const [equipQty, setEquipQty] = useState(1)
  const [originFeats, setOriginFeats] = useState<{ id: string; name: string }[]>([])
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => setId(id))
  }, [params])

  // Fetch origin feats for the dropdown
  useEffect(() => {
    const fetchOriginFeats = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("feats")
        .select("id, name")
        .eq("category", "Origin")
        .order("name")
      setOriginFeats(data || [])
    }
    fetchOriginFeats()
  }, [])

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
            starting_gold: data.starting_gold ?? 0,
            starting_equipment: data.starting_equipment || [],
            source: data.source || "Custom",
            creator_url: data.creator_url || "",
            icon: data.icon || null,
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
    const payload = { ...form, creator_url: normalizeCreatorUrl(form.creator_url) }

    if (id === "new") {
      const { error } = await supabase.from("backgrounds").insert([payload])
      if (error) { setError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from("backgrounds").update(payload).eq("id", id)
      if (error) { setError(error.message); setSaving(false); return }
    }

    setSaving(false)
    router.push("/compendium?tab=backgrounds")
  }

  const handleExport = () => {
    const exportData = { type: "dnd-background", version: 1, data: form }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${form.name.toLowerCase().replace(/\s+/g, "-")}-background.json`
    a.click()
    URL.revokeObjectURL(url)
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
      if (value === 0) delete newBonuses[ability]
      else newBonuses[ability] = value
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
    if (!toolInput.trim()) return
    setForm(prev => ({ ...prev, tool_proficiencies: [...prev.tool_proficiencies, toolInput.trim()] }))
    setToolInput("")
  }

  const removeToolProficiency = (tool: string) => {
    setForm(prev => ({ ...prev, tool_proficiencies: prev.tool_proficiencies.filter(t => t !== tool) }))
  }

  const addEquipmentItem = () => {
    if (!equipInput.trim()) return
    setForm(prev => ({
      ...prev,
      starting_equipment: [...prev.starting_equipment, { name: equipInput.trim(), quantity: equipQty }]
    }))
    setEquipInput("")
    setEquipQty(1)
  }

  const removeEquipmentItem = (index: number) => {
    setForm(prev => ({ ...prev, starting_equipment: prev.starting_equipment.filter((_, i) => i !== index) }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-muted rounded" />)}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <CompendiumEditorToolbar
        tab="backgrounds"
        title={id === "new" ? "New Background" : "Edit Background"}
        isNew={id === "new"}
        saving={saving}
        saveLabel="Save Background"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Background Name</label>
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
              <label className="block text-sm font-semibold text-foreground mb-2">Source</label>
              <input
                type="text"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                placeholder="Player's Handbook"
              />
            </div>
          </div>

          <SourceLinkField
            value={form.creator_url}
            onChange={(creator_url) => setForm({ ...form, creator_url })}
          />

          {/* Icon */}
          <GameIconPicker
            value={form.icon}
            onChange={(icon) => setForm({ ...form, icon })}
            label="Icon"
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary resize-none"
              placeholder="You spent years learning the lore of the multiverse..."
            />
          </div>

          {/* Ability Bonuses */}
          <div className="bg-card border-2 border-border rounded-xl p-4">
            <label className="block text-sm font-semibold text-foreground mb-1">
              Ability Score Bonuses
            </label>
            <p className="text-xs text-muted-foreground mb-4">
              Typically +2 to one score and +1 to another, or +1 to three scores.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {ABILITIES.map((ability) => (
                <div key={ability} className="flex items-center gap-3">
                  <span className="text-foreground capitalize w-24 text-sm">{ability}</span>
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
            <label className="block text-sm font-semibold text-foreground mb-2">Skill Proficiencies</label>
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
            <label className="block text-sm font-semibold text-foreground mb-2">Tool Proficiencies</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={toolInput}
                onChange={(e) => setToolInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToolProficiency())}
                placeholder="e.g. Thieves' Tools"
                className="flex-1 px-4 py-2 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              />
              <button type="button" onClick={addToolProficiency}
                className="px-4 py-2 bg-primary/10 text-primary rounded-xl font-semibold hover:bg-primary/20 transition-colors">
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.tool_proficiencies.map((tool) => (
                <span key={tool} className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm">
                  {tool}
                  <button type="button" onClick={() => removeToolProficiency(tool)}
                    className="text-muted-foreground hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Origin Feat (D&D 2024) */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Origin Feat Granted (D&D 2024)
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Backgrounds grant a 1st-level Origin feat. Only Origin-category feats are listed.
            </p>
            <select
              value={form.feat_granted}
              onChange={(e) => setForm({ ...form, feat_granted: e.target.value })}
              className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">None / Custom</option>
              {originFeats.map(f => (
                <option key={f.id} value={f.name}>{f.name}</option>
              ))}
            </select>
            {originFeats.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1 italic">
                No Origin feats found. Add feats with the &quot;Origin&quot; category to populate this list.
              </p>
            )}
          </div>

          {/* Starting Equipment */}
          <div className="bg-card border-2 border-border rounded-xl p-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Starting Equipment</label>
              <p className="text-xs text-muted-foreground">Add specific items this background provides.</p>
            </div>

            {/* Add item row */}
            <div className="flex gap-2">
              <input
                type="text"
                value={equipInput}
                onChange={(e) => setEquipInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEquipmentItem())}
                placeholder="e.g. Fine Clothes"
                className="flex-1 px-4 py-2 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              />
              <input
                type="number"
                min={1}
                value={equipQty}
                onChange={(e) => setEquipQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-3 py-2 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary text-center"
                title="Quantity"
              />
              <button type="button" onClick={addEquipmentItem}
                className="px-3 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Item list */}
            {form.starting_equipment.length > 0 && (
              <div className="space-y-2">
                {form.starting_equipment.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 bg-background rounded-lg border border-border">
                    <span className="text-sm text-foreground">
                      <span className="font-medium">{item.quantity}x</span> {item.name}
                    </span>
                    <button type="button" onClick={() => removeEquipmentItem(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Starting Gold */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Starting Gold (gp)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={form.starting_gold}
                  onChange={(e) => setForm({ ...form, starting_gold: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-32 px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                />
                <span className="text-sm text-muted-foreground">gold pieces in addition to equipment</span>
              </div>
            </div>
          </div>

          {/* Submit */}
        </form>
      </main>
    </div>
  )
}
