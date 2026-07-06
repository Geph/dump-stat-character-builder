"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/db/client"
import { CompendiumEditorHeaderRow } from "@/components/compendium/editor-header-row"
import { RichTextEditor } from "@/components/compendium/rich-text-editor"
import { CompendiumEditorPanel } from "@/components/compendium/compendium-editor-section"
import {
  CompendiumEditorToolbar,
  COMPENDIUM_EDITOR_FORM_ID,
} from "@/components/compendium/editor-toolbar"
import {
  propertiesToStringArray,
  stringifyPropertiesForDb,
} from "@/lib/compendium/equipment-properties"
import { normalizeCreatorUrl } from "@/components/compendium/source-link-field"
import { useDuplicateCompendiumItem } from "@/hooks/use-duplicate-compendium-item"
import { LinkedModifiersEditor } from "@/components/compendium/linked-modifiers-editor"
import { useModifierCatalog } from "@/hooks/use-modifier-catalog"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { normalizeLinkedModifiers } from "@/lib/compendium/linked-modifiers"
import {
  EQUIPMENT_RARITIES,
  MAGIC_ITEM_CATEGORIES,
  type BaseEquipmentFilter,
} from "@/lib/compendium/equipment-magic"
import type { CompendiumContentType } from "@/lib/compendium/content-types"

const CATEGORIES = [
  "Weapon", "Armor", "Adventuring Gear", "Tool", "Mount", "Vehicle", "Trade Good", "Other"
]

const SUBCATEGORIES: Record<string, string[]> = {
  "Weapon": ["Simple Melee", "Simple Ranged", "Martial Melee", "Martial Ranged"],
  "Armor": ["Light Armor", "Medium Armor", "Heavy Armor", "Shield"],
  "Adventuring Gear": ["Standard", "Equipment Pack", "Container"],
  "Tool": ["Artisan's Tools", "Gaming Set", "Musical Instrument", "Other"],
  "Mount": ["Common", "Exotic"],
  "Vehicle": ["Land", "Water", "Air"],
  "Trade Good": [],
  "Other": [],
}

const DAMAGE_TYPES = [
  "Bludgeoning", "Piercing", "Slashing", "Acid", "Cold", "Fire", "Force", 
  "Lightning", "Necrotic", "Poison", "Psychic", "Radiant", "Thunder"
]

import { WEAPON_PROPERTIES } from "@/lib/compendium/equipment-properties"
import {
  weaponMasteryCatalogEntriesFromAbilities,
  weaponMasteryPropertyNames,
} from "@/lib/compendium/weapon-mastery"
import { WEAPON_MASTERY_PROPERTIES_CATALOG_ID } from "@/lib/compendium/system-option-catalogs"
import { normalizeModifierCatalog } from "@/lib/compendium/modifier-catalog"
import { asCompendiumRow, asCompendiumRows, castCompendiumRow } from "@/lib/data/types"
import type { CompendiumThemeColorId } from "@/lib/compendium/theme-colors"

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
  accent_color: string | null
  card_image_url: string | null
  requires_attunement: boolean | null
  magic_item_category: string
  rarity: string
  base_equipment_ids: string[]
  selected_base_equipment_id: string
  base_equipment_filter: BaseEquipmentFilter | ""
  magic_effects: LinkedModifierInstance[]
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
  accent_color: null,
  card_image_url: null,
  requires_attunement: null,
  magic_item_category: "",
  rarity: "",
  base_equipment_ids: [],
  selected_base_equipment_id: "",
  base_equipment_filter: "",
  magic_effects: [],
}

function equipmentListTab(
  form: EquipmentFormData,
  magicQuery: boolean,
): CompendiumContentType {
  if (magicQuery || form.magic_item_category.trim() || form.rarity.trim()) {
    return "magic_items"
  }
  return "equipment"
}

export default function EquipmentEditorPage({ id }: { id: string }) {
  const [form, setForm] = useState<EquipmentFormData>(defaultEquipment)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customAbilities, setCustomAbilities] = useState<{ id: string; name: string }[]>([])
  const [weaponMasteryCatalog, setWeaponMasteryCatalog] = useState<
    ReturnType<typeof weaponMasteryCatalogEntriesFromAbilities>
  >([])
  const [allEquipment, setAllEquipment] = useState<{ id: string; name: string; category: string }[]>([])
  const [rawProperties, setRawProperties] = useState<unknown>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const magicQuery = searchParams.get("magic") === "1"
  const listTab = equipmentListTab(form, magicQuery)
  const { catalog: modifierCatalog } = useModifierCatalog()
  const { handleCopy, copying, copyError, canCopy } = useDuplicateCompendiumItem("equipment", id)

  useEffect(() => {
    if (id === "new" && magicQuery) {
      setForm((prev) => ({
        ...prev,
        category: "Other",
        cost: null,
        magic_item_category: prev.magic_item_category || "Wondrous Item",
      }))
    }
  }, [id, magicQuery])

  useEffect(() => {
    const loadEquipmentCatalog = async () => {
      const db = createClient()
      const { data } = await db.from("equipment").select("id, name, category").order("name")
      setAllEquipment(asCompendiumRows<{ id: string; name: string; category: string }>(data))
    }
    void loadEquipmentCatalog()
  }, [])

  useEffect(() => {
    const loadWeaponMasteryCatalog = async () => {
      const db = createClient()
      const { data } = await db
        .from("custom_abilities")
        .select("*")
        .eq("id", WEAPON_MASTERY_PROPERTIES_CATALOG_ID)
        .maybeSingle()
      if (!data) {
        setWeaponMasteryCatalog([])
        return
      }
      setWeaponMasteryCatalog(
        weaponMasteryCatalogEntriesFromAbilities([
          {
            ...data,
            modifier_catalog: normalizeModifierCatalog(
              (data as unknown as Record<string, unknown>).modifier_catalog,
            ),
          } as never,
        ]),
      )
    }
    void loadWeaponMasteryCatalog()
  }, [])

  const weaponMasteryOptions = useMemo(
    () => weaponMasteryPropertyNames(weaponMasteryCatalog),
    [weaponMasteryCatalog],
  )

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
          const row = asCompendiumRow(data)
          if (!row) {
            setError("Equipment not found")
          } else {
            const props = row.properties
            const propTags = propertiesToStringArray(props)
            let damage = String(row.damage ?? "")
            let damageType = String(row.damage_type ?? "")
            let mastery = String(row.mastery ?? "")
            if (props && typeof props === "object" && !Array.isArray(props)) {
              const record = props as unknown as Record<string, unknown>
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
              name: String(row.name ?? ""),
              category: String(row.category ?? "Adventuring Gear"),
              subcategory: String(row.subcategory ?? ""),
              cost: (row.cost as EquipmentFormData["cost"]) ?? null,
              weight: (row.weight as number | null) ?? null,
              description: String(row.description ?? ""),
              source: String(row.source ?? "Custom"),
              creator_url: String(row.creator_url ?? ""),
              armor_class: (row.armor_class as number | null) ?? null,
              stealth_disadvantage: Boolean(row.stealth_disadvantage),
              damage,
              damage_type: damageType,
              range: String(row.range ?? ""),
              mastery,
              properties: propTags,
              icon: (row.icon as string | null) ?? null,
              accent_color: (row.accent_color as string | null) ?? null,
              card_image_url: (row.card_image_url as string | null) ?? null,
              requires_attunement:
                typeof row.requires_attunement === "boolean" ? row.requires_attunement : null,
              magic_item_category: String(row.magic_item_category ?? ""),
              rarity: String(row.rarity ?? ""),
              base_equipment_ids: Array.isArray(row.base_equipment_ids)
                ? (row.base_equipment_ids as string[])
                : [],
              selected_base_equipment_id: String(row.selected_base_equipment_id ?? ""),
              base_equipment_filter: (row.base_equipment_filter as BaseEquipmentFilter | null) || "",
              magic_effects: Array.isArray(row.magic_effects)
                ? (row.magic_effects as LinkedModifierInstance[])
                : [],
            })
          }
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
      setCustomAbilities(asCompendiumRows<{ id: string; name: string }>(data))
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
      requires_attunement: form.requires_attunement,
      magic_item_category: form.magic_item_category || null,
      rarity: form.rarity || null,
      base_equipment_ids: form.base_equipment_filter ? [] : form.base_equipment_ids,
      selected_base_equipment_id: form.selected_base_equipment_id || null,
      base_equipment_filter: form.base_equipment_filter || null,
      magic_effects: form.magic_effects,
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
    router.push(`/compendium?tab=${equipmentListTab(form, magicQuery)}`)
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
    router.push(`/compendium?tab=${listTab}`)
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
        tab={listTab}
        title={id === "new" ? "New Equipment" : "Edit Equipment"}
        isNew={id === "new"}
        saving={saving}
        saveLabel="Save Equipment"
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
            accentColor={form.accent_color as CompendiumThemeColorId | null}
            onAccentColorChange={(accent_color) => setForm({ ...form, accent_color })}
            {...(listTab === "magic_items"
              ? {
                  cardImageUrl: form.card_image_url,
                  onCardImageUrlChange: (card_image_url: string | null) =>
                    setForm({ ...form, card_image_url }),
                }
              : {})}
          />

          <CompendiumEditorPanel title="Category & cost">
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
            <div className="md:col-span-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={form.cost === null}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cost: e.target.checked ? null : { amount: 1, unit: "gp" },
                    })
                  }
                  className="rounded border-border"
                />
                Cost N/A (typical for magic items)
              </label>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Cost (Amount)
              </label>
              <input
                type="number"
                min={0}
                disabled={form.cost === null}
                value={form.cost?.amount ?? 0}
                onChange={(e) => setForm({ 
                  ...form, 
                  cost: { ...(form.cost ?? { amount: 0, unit: "gp" }), amount: parseFloat(e.target.value) || 0 } 
                })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Cost (Unit)
              </label>
              <select
                disabled={form.cost === null}
                value={form.cost?.unit || "gp"}
                onChange={(e) => setForm({ 
                  ...form, 
                  cost: { ...(form.cost ?? { amount: 0, unit: "gp" }), unit: e.target.value } 
                })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
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
          </CompendiumEditorPanel>

          <CompendiumEditorPanel title="Description">
            <RichTextEditor
              value={form.description}
              onChange={(description) => setForm({ ...form, description })}
              placeholder="Describe the item, including any special properties..."
            />
          </CompendiumEditorPanel>

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
                    {weaponMasteryOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    {form.mastery && !weaponMasteryOptions.includes(form.mastery) ? (
                      <option value={form.mastery}>{form.mastery}</option>
                    ) : null}
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

          <div className="bg-card-lighter border-2 border-magenta/30 rounded-xl p-4 space-y-4">
            <h3 className="font-semibold text-foreground">Magic Item</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Rarity</label>
                <select
                  value={form.rarity}
                  onChange={(e) => setForm({ ...form, rarity: e.target.value })}
                  className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Not a magic item</option>
                  {EQUIPMENT_RARITIES.map((rarity) => (
                    <option key={rarity} value={rarity}>{rarity}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Magic type</label>
                <select
                  value={form.magic_item_category}
                  onChange={(e) => setForm({ ...form, magic_item_category: e.target.value })}
                  className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">None</option>
                  {MAGIC_ITEM_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Attunement</label>
                <select
                  value={
                    form.requires_attunement === null
                      ? ""
                      : form.requires_attunement
                        ? "required"
                        : "none"
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      requires_attunement:
                        e.target.value === ""
                          ? null
                          : e.target.value === "required",
                    })
                  }
                  className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Unspecified</option>
                  <option value="required">Requires attunement</option>
                  <option value="none">No attunement</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Base equipment filter
                </label>
                <select
                  value={form.base_equipment_filter}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      base_equipment_filter: e.target.value as BaseEquipmentFilter | "",
                      base_equipment_ids: e.target.value ? [] : form.base_equipment_ids,
                    })
                  }
                  className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Specific base item(s)</option>
                  <option value="any_melee_weapon">Any melee weapon</option>
                  <option value="any_ranged_weapon">Any ranged weapon</option>
                  <option value="any_weapon">Any simple or martial weapon</option>
                </select>
              </div>
              {!form.base_equipment_filter ? (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Base equipment (inherit stats)
                  </label>
                  <select
                    multiple
                    value={form.base_equipment_ids}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value)
                      setForm({
                        ...form,
                        base_equipment_ids: selected,
                        selected_base_equipment_id:
                          selected.length === 1
                            ? selected[0]
                            : selected.includes(form.selected_base_equipment_id)
                              ? form.selected_base_equipment_id
                              : "",
                      })
                    }}
                    className="w-full min-h-[7rem] px-3 py-2 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                  >
                    {allEquipment
                      .filter((entry) => entry.id !== id)
                      .map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name} ({entry.category})
                        </option>
                      ))}
                  </select>
                </div>
              ) : null}
            </div>

            {form.base_equipment_ids.length > 1 && !form.base_equipment_filter ? (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Default selected base
                </label>
                <select
                  value={form.selected_base_equipment_id}
                  onChange={(e) =>
                    setForm({ ...form, selected_base_equipment_id: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Choose at acquisition</option>
                  {form.base_equipment_ids.map((baseId) => {
                    const entry = allEquipment.find((item) => item.id === baseId)
                    return (
                      <option key={baseId} value={baseId}>
                        {entry?.name ?? baseId}
                      </option>
                    )
                  })}
                </select>
              </div>
            ) : null}

            <LinkedModifiersEditor
              value={normalizeLinkedModifiers(form.magic_effects, modifierCatalog, [])}
              onChange={(magic_effects) => setForm({ ...form, magic_effects })}
              catalog={modifierCatalog}
              label="Magic effects"
            />
          </div>

        </form>
      </main>
    </div>
  )
}
