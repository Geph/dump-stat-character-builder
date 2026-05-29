"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Save, Trash2, Download } from "lucide-react"
import Link from "next/link"
import { GameIconPicker } from "@/components/game-icon-picker"

const CATEGORIES = [
  "Weapon", "Armor", "Adventuring Gear", "Tool", "Mount", "Vehicle", "Trade Good"
]

const SUBCATEGORIES: Record<string, string[]> = {
  "Weapon": ["Simple Melee", "Simple Ranged", "Martial Melee", "Martial Ranged"],
  "Armor": ["Light Armor", "Medium Armor", "Heavy Armor", "Shield"],
  "Adventuring Gear": ["Standard", "Equipment Pack", "Container"],
  "Tool": ["Artisan's Tools", "Gaming Set", "Musical Instrument", "Other"],
  "Mount": ["Common", "Exotic"],
  "Vehicle": ["Land", "Water", "Air"],
  "Trade Good": [],
}

const DAMAGE_TYPES = [
  "Bludgeoning", "Piercing", "Slashing", "Acid", "Cold", "Fire", "Force", 
  "Lightning", "Necrotic", "Poison", "Psychic", "Radiant", "Thunder"
]

const WEAPON_PROPERTIES = [
  "Ammunition", "Finesse", "Heavy", "Light", "Loading", "Range", "Reach", 
  "Special", "Thrown", "Two-Handed", "Versatile"
]

const WEAPON_MASTERIES = [
  "Cleave", "Graze", "Nick", "Push", "Sap", "Slow", "Topple", "Vex"
]

interface EquipmentFormData {
  name: string
  category: string
  subcategory: string
  cost: { amount: number; unit: string } | null
  weight: number | null
  description: string
  source: string
  // Armor fields
  armor_class: number | null
  stealth_disadvantage: boolean
  // Weapon fields
  damage: string
  damage_type: string
  range: string
  mastery: string
  properties: string[]
  icon: string | null
}

const defaultEquipment: EquipmentFormData = {
  name: "",
  category: "Adventuring Gear",
  subcategory: "",
  cost: { amount: 1, unit: "gp" },
  weight: null,
  description: "",
  source: "Custom",
  armor_class: null,
  stealth_disadvantage: false,
  damage: "",
  damage_type: "",
  range: "",
  mastery: "",
  properties: [],
  icon: null,
}

export default function EquipmentEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  const [form, setForm] = useState<EquipmentFormData>(defaultEquipment)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => setId(id))
  }, [params])

  useEffect(() => {
    if (id && id !== "new") {
      const fetchEquipment = async () => {
        setLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
          .from("equipment")
          .select("*")
          .eq("id", id)
          .single()
        
        if (error) {
          setError("Equipment not found")
        } else if (data) {
          setForm({
            name: data.name || "",
            category: data.category || "Adventuring Gear",
            subcategory: data.subcategory || "",
            cost: data.cost || { amount: 1, unit: "gp" },
            weight: data.weight || null,
            description: data.description || "",
            source: data.source || "Custom",
            armor_class: data.armor_class || null,
            stealth_disadvantage: data.stealth_disadvantage || false,
            damage: data.damage || "",
            damage_type: data.damage_type || "",
            range: data.range || "",
            mastery: data.mastery || "",
            properties: Array.isArray(data.properties) ? data.properties : [],
            icon: data.icon || null,
          })
        }
        setLoading(false)
      }
      fetchEquipment()
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()
    
    if (id === "new") {
      const { error } = await supabase.from("equipment").insert([form])
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase.from("equipment").update(form).eq("id", id)
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    }
    
    setSaving(false)
    router.push("/compendium?tab=equipment")
  }

  const handleExport = () => {
    const exportData = { type: "dnd-equipment", version: 1, data: form }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${form.name.toLowerCase().replace(/\s+/g, "-")}-equipment.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this equipment?")) return
    
    const supabase = createClient()
    await supabase.from("equipment").delete().eq("id", id)
    router.push("/compendium?tab=equipment")
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
              href="/compendium?tab=equipment"
              className="p-3 bg-lemon text-lemon-foreground hover:brightness-110 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-black text-foreground">
              {id === "new" ? "New Equipment" : "Edit Equipment"}
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
                Item Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                placeholder="Longsword"
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

          {/* Icon */}
          <GameIconPicker
            value={form.icon}
            onChange={(icon) => setForm({ ...form, icon })}
            label="Icon"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value, subcategory: "" })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Subcategory
              </label>
              <select
                value={form.subcategory}
                onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">None</option>
                {(SUBCATEGORIES[form.category] || []).map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Cost (Amount)
              </label>
              <input
                type="number"
                min={0}
                value={form.cost?.amount || 0}
                onChange={(e) => setForm({ 
                  ...form, 
                  cost: { ...form.cost!, amount: parseFloat(e.target.value) || 0 } 
                })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Cost (Unit)
              </label>
              <select
                value={form.cost?.unit || "gp"}
                onChange={(e) => setForm({ 
                  ...form, 
                  cost: { ...form.cost!, unit: e.target.value } 
                })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              >
                <option value="cp">Copper (cp)</option>
                <option value="sp">Silver (sp)</option>
                <option value="ep">Electrum (ep)</option>
                <option value="gp">Gold (gp)</option>
                <option value="pp">Platinum (pp)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Weight (lbs)
              </label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={form.weight || ""}
                onChange={(e) => setForm({ 
                  ...form, 
                  weight: e.target.value ? parseFloat(e.target.value) : null 
                })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary resize-none"
              placeholder="Describe the item, including any special properties..."
            />
          </div>

          {/* Armor-specific fields */}
          {form.category === "Armor" && (
            <div className="bg-card-lighter border-2 border-primary/30 rounded-xl p-4 space-y-4">
              <h3 className="font-semibold text-foreground">Armor Properties</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Armor Class (AC)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.armor_class ?? ""}
                    onChange={(e) => setForm({ 
                      ...form, 
                      armor_class: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                    placeholder="e.g. 14"
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.stealth_disadvantage}
                      onChange={(e) => setForm({ ...form, stealth_disadvantage: e.target.checked })}
                      className="w-5 h-5 rounded border-border accent-primary"
                    />
                    <span className="font-medium text-foreground">Disadvantage on Stealth</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Weapon-specific fields */}
          {form.category === "Weapon" && (
            <div className="bg-card-lighter border-2 border-secondary/30 rounded-xl p-4 space-y-4">
              <h3 className="font-semibold text-foreground">Weapon Properties</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Damage
                  </label>
                  <input
                    type="text"
                    value={form.damage}
                    onChange={(e) => setForm({ ...form, damage: e.target.value })}
                    className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                    placeholder="e.g. 1d8"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Damage Type
                  </label>
                  <select
                    value={form.damage_type}
                    onChange={(e) => setForm({ ...form, damage_type: e.target.value })}
                    className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="">Select type...</option>
                    {DAMAGE_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Range
                  </label>
                  <input
                    type="text"
                    value={form.range}
                    onChange={(e) => setForm({ ...form, range: e.target.value })}
                    className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                    placeholder="e.g. 5 ft or 80/320 ft"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Mastery
                  </label>
                  <select
                    value={form.mastery}
                    onChange={(e) => setForm({ ...form, mastery: e.target.value })}
                    className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="">None</option>
                    {WEAPON_MASTERIES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Properties
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {WEAPON_PROPERTIES.map((prop) => (
                      <label key={prop} className="flex items-center gap-1.5 cursor-pointer text-sm bg-background px-2 py-1 rounded-lg border border-border">
                        <input
                          type="checkbox"
                          checked={form.properties.includes(prop)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm({ ...form, properties: [...form.properties, prop] })
                            } else {
                              setForm({ ...form, properties: form.properties.filter(p => p !== prop) })
                            }
                          }}
                          className="w-4 h-4 rounded border-border accent-secondary"
                        />
                        <span className="text-foreground">{prop}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? "Saving..." : "Save Equipment"}
            </button>
            <Link
              href="/compendium?tab=equipment"
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
