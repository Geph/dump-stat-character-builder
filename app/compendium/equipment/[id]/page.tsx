"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
import Link from "next/link"

const CATEGORIES = [
  "Weapon", "Armor", "Adventuring Gear", "Tool", "Mount", "Vehicle", "Trade Good"
]

const SUBCATEGORIES: Record<string, string[]> = {
  "Weapon": ["Simple Melee", "Simple Ranged", "Martial Melee", "Martial Ranged"],
  "Armor": ["Light", "Medium", "Heavy", "Shield"],
  "Adventuring Gear": ["Standard", "Equipment Pack", "Container"],
  "Tool": ["Artisan's Tools", "Gaming Set", "Musical Instrument", "Other"],
  "Mount": ["Common", "Exotic"],
  "Vehicle": ["Land", "Water", "Air"],
  "Trade Good": [],
}

interface EquipmentFormData {
  name: string
  category: string
  subcategory: string
  cost: { amount: number; unit: string } | null
  weight: number | null
  description: string
  source: string
}

const defaultEquipment: EquipmentFormData = {
  name: "",
  category: "Adventuring Gear",
  subcategory: "",
  cost: { amount: 1, unit: "gp" },
  weight: null,
  description: "",
  source: "Custom",
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
            weight: data.weight,
            description: data.description || "",
            source: data.source || "Custom",
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
              className="p-2 hover:bg-muted rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-black text-foreground">
              {id === "new" ? "New Equipment" : "Edit Equipment"}
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
