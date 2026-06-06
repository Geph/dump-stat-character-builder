"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/db/client"
import { CompendiumEditorHeaderRow } from "@/components/compendium/editor-header-row"
import { RichTextEditor } from "@/components/compendium/rich-text-editor"
import {
  CompendiumEditorToolbar,
  COMPENDIUM_EDITOR_FORM_ID,
} from "@/components/compendium/editor-toolbar"
import {
  propertiesToStringArray,
  stringifyPropertiesForDb,
} from "@/lib/compendium/equipment-properties"
import { normalizeCreatorUrl } from "@/components/compendium/source-link-field"

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
  creator_url: string
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
  creator_url: "",
  armor_class: null,
  stealth_disadvantage: false,
  damage: "",
  damage_type: "",
  range: "",
  mastery: "",
  properties: [],
  icon: null,
}

export default function EquipmentEditorPage({ id }: { id: string }) {
  const [form, setForm] = useState<EquipmentFormData>(defaultEquipment)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customAbilities, setCustomAbilities] = useState<{ id: string; name: string }[]>([])
  const [rawProperties, setRawProperties] = useState<unknown>(null)
  const router = useRouter()

  useEffect(() => {
    if (id && id !== "new") {
      const fetchEquipment = async () => {
        setLoading(true)
        const db = createClient()
        const { data, error } = await db
          .from("equipment")
          .select("*")
          .eq("id", id)
          .single()
        
        if (error) {
          setError("Equipment not found")
        } else if (data) {
          const props = data.properties
          const propTags = propertiesToStringArray(props)
          let damage = data.damage || ""
          let damageType = data.damage_type || ""
          let mastery = data.mastery || ""
          if (props && typeof props === "object" && !Array.isArray(props)) {
            const record = props as Record<string, unknown>
            if (typeof record.damage === "string" && !damage) {
              const dm = record.damage.match(/^([\dd+\s]+)\s+(\w+)/i)
              if (dm) {
                damage = dm[1].trim()
                damageType = dm[2]
              }
            }
            if (typeof record.mastery === "string" && !mastery) {
              mastery = record.mastery
            }
          }
          setRawProperties(props)
          setForm({
            name: data.name || "",
            category: data.category || "Adventuring Gear",
            subcategory: data.subcategory || "",
            cost: data.cost || { amount: 1, unit: "gp" },
            weight: data.weight || null,
            description: data.description || "",
            source: data.source || "Custom",
            creator_url: data.creator_url || "",
            armor_class: data.armor_class || null,
            stealth_disadvantage: data.stealth_disadvantage || false,
            damage,
            damage_type: damageType,
            range: data.range || "",
            mastery,
            properties: propTags,
            icon: data.icon || null,
          })
        }
        setLoading(false)
      }
      fetchEquipment()
    }
  }, [id])

  useEffect(() => {
    if (!form.category) {
      setCustomAbilities([])
      return
    }
    const loadAbilities = async () => {
      const db = createClient()
      const { data } = await db
        .from("custom_abilities")
        .select("id, name")
        .eq("attached_to_type", "equipment")
        .eq("attached_to_id", form.category)
        .order("name")
      setCustomAbilities(data || [])
    }
    loadAbilities()
  }, [form.category])

  const toggleCategoryAbility = (abilityName: string, checked: boolean) => {
    if (checked) {
      setForm({ ...form, properties: [...form.properties, abilityName] })
    } else {
      setForm({
        ...form,
        properties: form.properties.filter((p) => p !== abilityName),
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const db = createClient()
    const payload = {
      ...form,
      properties: stringifyPropertiesForDb(form.properties, rawProperties),
      creator_url: normalizeCreatorUrl(form.creator_url),
    }
    
    if (id === "new") {
      const { error } = await db.from("equipment").insert([payload])
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await db.from("equipment").update(payload).eq("id", id)
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
    
    const db = createClient()
    await db.from("equipment").delete().eq("id", id)
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
      <CompendiumEditorToolbar
        tab="equipment"
        title={id === "new" ? "New Equipment" : "Edit Equipment"}
        isNew={id === "new"}
        saving={saving}
        saveLabel="Save Equipment"
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
            nameLabel="Item Name"
            name={form.name}
            onNameChange={(name) => setForm({ ...form, name })}
            namePlaceholder="Longsword"
            source={form.source}
            onSourceChange={(source) => setForm({ ...form, source })}
            creatorUrl={form.creator_url}
            onCreatorUrlChange={(creator_url) => setForm({ ...form, creator_url })}
            icon={form.icon}
            onIconChange={(icon) => setForm({ ...form, icon })}
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
            <RichTextEditor
              value={form.description}
              onChange={(description) => setForm({ ...form, description })}
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

          {customAbilities.length > 0 && (
            <div className="bg-card-lighter border-2 border-accent/30 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-foreground">
                {form.category} abilities
              </h3>
              <p className="text-xs text-muted-foreground">
                Custom abilities attached to the {form.category} category in the compendium.
              </p>
              <div className="flex flex-wrap gap-2">
                {customAbilities.map((ability) => (
                  <label
                    key={ability.id}
                    className="flex items-center gap-1.5 cursor-pointer text-sm bg-secondary/10 px-2 py-1 rounded-lg border border-secondary/40"
                  >
                    <input
                      type="checkbox"
                      checked={form.properties.includes(ability.name)}
                      onChange={(e) => toggleCategoryAbility(ability.name, e.target.checked)}
                      className="w-4 h-4 rounded border-border accent-secondary"
                    />
                    <span className="text-foreground">{ability.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

        </form>
      </main>
    </div>
  )
}
