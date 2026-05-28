"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Save, Trash2, Download, Plus, X } from "lucide-react"
import Link from "next/link"
import type { UsesConfig, UsesAtLevel, CustomAbility } from "@/lib/types"

interface AbilityFormData {
  name: string
  description: string
  prerequisites: string
  attached_to_type: string
  attached_to_id: string
  uses: UsesConfig | null
  source: string
}

const defaultAbility: AbilityFormData = {
  name: "",
  description: "",
  prerequisites: "",
  attached_to_type: "",
  attached_to_id: "",
  uses: null,
  source: "Custom",
}

const ATTACH_OPTIONS = [
  { value: "", label: "None (Standalone)" },
  { value: "class", label: "Class" },
  { value: "species", label: "Species" },
  { value: "background", label: "Background" },
  { value: "feat", label: "Feat" },
  { value: "equipment", label: "Equipment" },
  { value: "spell", label: "Spell" },
]

const ABILITY_MODIFIERS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const
const DIE_TYPES = ["d4", "d6", "d8", "d10", "d12", "d20"] as const
const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1)

export default function AbilityEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  const [form, setForm] = useState<AbilityFormData>(defaultAbility)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachTargets, setAttachTargets] = useState<{ id: string; name: string }[]>([])
  const [otherAbilities, setOtherAbilities] = useState<{ id: string; name: string }[]>([])
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => setId(id))
  }, [params])

  useEffect(() => {
    if (id && id !== "new") {
      const fetchAbility = async () => {
        setLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
          .from("custom_abilities")
          .select("*")
          .eq("id", id)
          .single()
        
        if (error) {
          setError("Custom Ability not found")
        } else if (data) {
          setForm({
            name: data.name || "",
            description: data.description || "",
            prerequisites: data.prerequisites || "",
            attached_to_type: data.attached_to_type || "",
            attached_to_id: data.attached_to_id || "",
            uses: data.uses || null,
            source: data.source || "Custom",
          })
        }
        setLoading(false)
      }
      fetchAbility()
    }
  }, [id])

  // Fetch attach targets when type changes
  useEffect(() => {
    const fetchTargets = async () => {
      if (!form.attached_to_type) {
        setAttachTargets([])
        return
      }

      const supabase = createClient()
      const tableName = form.attached_to_type === "class" ? "classes" 
        : form.attached_to_type === "species" ? "species"
        : form.attached_to_type === "spell" ? "spells"
        : `${form.attached_to_type}s`
      
      const { data } = await supabase
        .from(tableName)
        .select("id, name")
        .order("name")
        .limit(50)
      
      setAttachTargets(data || [])
    }
    fetchTargets()
  }, [form.attached_to_type])

  // Fetch other abilities for the custom_ability uses type
  useEffect(() => {
    const fetchOtherAbilities = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("custom_abilities")
        .select("id, name")
        .order("name")
        .limit(100)
      
      // Exclude the current ability from the list
      setOtherAbilities((data || []).filter(a => a.id !== id))
    }
    fetchOtherAbilities()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const payload = {
      ...form,
      attached_to_id: form.attached_to_id || null,
    }
    
    if (id === "new") {
      const { error } = await supabase.from("custom_abilities").insert([payload])
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase.from("custom_abilities").update(payload).eq("id", id)
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    }
    
    setSaving(false)
    router.push("/compendium?tab=abilities")
  }

  const handleExport = () => {
    const exportData = { type: "dnd-ability", version: 1, data: form }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${form.name.toLowerCase().replace(/\s+/g, "-")}-ability.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this custom ability?")) return
    
    const supabase = createClient()
    await supabase.from("custom_abilities").delete().eq("id", id)
    router.push("/compendium?tab=abilities")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-8" />
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/compendium?tab=abilities"
              className="p-3 bg-lemon text-lemon-foreground hover:brightness-110 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-black text-foreground">
              {id === "new" ? "New Custom Ability" : "Edit Custom Ability"}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Ability Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                placeholder="e.g., Extra Attack"
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
                placeholder="Custom, Homebrew, etc."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Prerequisites
            </label>
            <input
              type="text"
              value={form.prerequisites}
              onChange={(e) => setForm({ ...form, prerequisites: e.target.value })}
              className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              placeholder="e.g., Level 5, Strength 13 or higher"
            />
          </div>

          {/* Uses Configuration */}
          <div className="bg-card-lighter border-2 border-primary/30 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Uses Configuration</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.uses !== null}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setForm({ ...form, uses: { type: "unlimited" } })
                    } else {
                      setForm({ ...form, uses: null })
                    }
                  }}
                  className="w-4 h-4 rounded border-border accent-primary"
                />
                <span className="text-sm text-muted-foreground">Has limited uses</span>
              </label>
            </div>

            {form.uses && (
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Uses Type
                    </label>
                    <select
                      value={form.uses.type}
                      onChange={(e) => setForm({ 
                        ...form, 
                        uses: { 
                          ...form.uses!, 
                          type: e.target.value as UsesConfig["type"],
                          // Reset type-specific fields
                          fixedAmount: undefined,
                          abilityModifier: undefined,
                          customAbilityId: undefined,
                          atLevelTable: undefined,
                        } 
                      })}
                      className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="unlimited">Unlimited (At Will)</option>
                      <option value="fixed">Fixed Number</option>
                      <option value="proficiency">Proficiency Modifier</option>
                      <option value="ability_modifier">Ability Modifier</option>
                      <option value="custom_ability">Same as Another Ability</option>
                      <option value="at_level">Based on Level</option>
                    </select>
                  </div>

                  {/* Fixed amount input */}
                  {form.uses.type === "fixed" && (
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Number of Uses
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={form.uses.fixedAmount ?? 1}
                        onChange={(e) => setForm({ 
                          ...form, 
                          uses: { ...form.uses!, fixedAmount: parseInt(e.target.value) || 1 } 
                        })}
                        className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {/* Ability modifier selector */}
                  {form.uses.type === "ability_modifier" && (
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Ability Score
                      </label>
                      <select
                        value={form.uses.abilityModifier || ""}
                        onChange={(e) => setForm({ 
                          ...form, 
                          uses: { ...form.uses!, abilityModifier: e.target.value as typeof ABILITY_MODIFIERS[number] } 
                        })}
                        className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="">Select ability...</option>
                        {ABILITY_MODIFIERS.map((mod) => (
                          <option key={mod} value={mod}>{mod} Modifier</option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Uses = selected ability modifier (min 1)
                      </p>
                    </div>
                  )}

                  {/* Custom ability selector */}
                  {form.uses.type === "custom_ability" && (
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Copy Uses From
                      </label>
                      <select
                        value={form.uses.customAbilityId || ""}
                        onChange={(e) => setForm({ 
                          ...form, 
                          uses: { ...form.uses!, customAbilityId: e.target.value } 
                        })}
                        className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="">Select ability...</option>
                        {otherAbilities.map((ability) => (
                          <option key={ability.id} value={ability.id}>{ability.name}</option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Uses same number of uses as the selected ability
                      </p>
                    </div>
                  )}
                </div>

                {/* At-level table */}
                {form.uses.type === "at_level" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-foreground">
                        Uses by Level
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const table = form.uses?.atLevelTable || []
                          const nextLevel = table.length > 0 ? Math.max(...table.map(t => t.level)) + 1 : 1
                          setForm({
                            ...form,
                            uses: {
                              ...form.uses!,
                              atLevelTable: [...table, { level: Math.min(nextLevel, 20), count: 1 }]
                            }
                          })
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20"
                      >
                        <Plus className="w-3 h-3" />
                        Add Row
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(form.uses.atLevelTable || []).map((row, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground w-16">At level</span>
                          <select
                            value={row.level}
                            onChange={(e) => {
                              const table = [...(form.uses?.atLevelTable || [])]
                              table[idx] = { ...row, level: parseInt(e.target.value) }
                              setForm({ ...form, uses: { ...form.uses!, atLevelTable: table } })
                            }}
                            className="w-20 px-2 py-1.5 bg-background border border-border rounded-lg text-sm"
                          >
                            {LEVELS.map((lvl) => (
                              <option key={lvl} value={lvl}>{lvl}</option>
                            ))}
                          </select>
                          <span className="text-sm text-muted-foreground">uses:</span>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={row.count}
                            onChange={(e) => {
                              const table = [...(form.uses?.atLevelTable || [])]
                              table[idx] = { ...row, count: parseInt(e.target.value) || 1 }
                              setForm({ ...form, uses: { ...form.uses!, atLevelTable: table } })
                            }}
                            className="w-16 px-2 py-1.5 bg-background border border-border rounded-lg text-sm text-center"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const table = (form.uses?.atLevelTable || []).filter((_, i) => i !== idx)
                              setForm({ ...form, uses: { ...form.uses!, atLevelTable: table } })
                            }}
                            className="p-1 text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {(form.uses.atLevelTable?.length ?? 0) === 0 && (
                        <p className="text-sm text-muted-foreground italic">Click "Add Row" to define uses at each level</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Recharge and Die fields - shown for all limited uses types except unlimited */}
                {form.uses.type !== "unlimited" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Recharges On
                      </label>
                      <select
                        value={form.uses.recharge || ""}
                        onChange={(e) => setForm({ 
                          ...form, 
                          uses: { ...form.uses!, recharge: e.target.value as UsesConfig["recharge"] || null } 
                        })}
                        className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="">No recharge</option>
                        <option value="short_rest">Short Rest</option>
                        <option value="long_rest">Long Rest</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Die Count
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={form.uses.dieCount ?? ""}
                        onChange={(e) => setForm({ 
                          ...form, 
                          uses: { ...form.uses!, dieCount: e.target.value ? parseInt(e.target.value) : undefined } 
                        })}
                        className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                        placeholder="e.g. 2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Die Type
                      </label>
                      <select
                        value={form.uses.dieType || ""}
                        onChange={(e) => setForm({ 
                          ...form, 
                          uses: { ...form.uses!, dieType: e.target.value as UsesConfig["dieType"] || null } 
                        })}
                        className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="">None</option>
                        {DIE_TYPES.map((die) => (
                          <option key={die} value={die}>{die}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Attach to Type
              </label>
              <select
                value={form.attached_to_type}
                onChange={(e) => setForm({ ...form, attached_to_type: e.target.value, attached_to_id: "" })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              >
                {ATTACH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {form.attached_to_type && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Attach to {form.attached_to_type.charAt(0).toUpperCase() + form.attached_to_type.slice(1)}
                </label>
                <select
                  value={form.attached_to_id}
                  onChange={(e) => setForm({ ...form, attached_to_id: e.target.value })}
                  className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Select a {form.attached_to_type}...</option>
                  {attachTargets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={8}
              className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary resize-none"
              placeholder="Describe what this ability does..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? "Saving..." : "Save Ability"}
            </button>
            <Link
              href="/compendium?tab=abilities"
              className="px-6 py-4 bg-lemon text-lemon-foreground rounded-xl font-bold hover:brightness-110 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
