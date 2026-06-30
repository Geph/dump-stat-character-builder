"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/db/client"
import {
  CompendiumEditorToolbar,
  COMPENDIUM_EDITOR_FORM_ID,
} from "@/components/compendium/editor-toolbar"
import {
  extractUsesConfig,
  normalizeCharacteristics,
  type CharacteristicModifier,
} from "@/lib/compendium/characteristic-modifiers"
import { CompendiumEditorHeaderRow } from "@/components/compendium/editor-header-row"
import { RichTextEditor } from "@/components/compendium/rich-text-editor"
import { normalizeCreatorUrl } from "@/components/compendium/source-link-field"
import { LinkedModifiersEditor } from "@/components/compendium/linked-modifiers-editor"
import {
  normalizeLinkedModifiers,
  readLinkedModifiers,
  syncModifierRefs,
  type LinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"
import { useModifierCatalog } from "@/hooks/use-modifier-catalog"
import { useDuplicateCompendiumItem } from "@/hooks/use-duplicate-compendium-item"
import { readModifierRefs } from "@/lib/compendium/normalize-modifier-refs"
import {
  CatalogEditor,
  buildCatalogSavePayload,
  getCatalogEditorMeta,
  isSystemCatalogEditorRoute,
  parseCatalogFromRow,
} from "@/app/compendium/edit/common-modifiers-catalog-editor"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { ensureModifierCatalog } from "@/lib/compendium/ensure-modifier-catalog"
import { attachTypeToTable } from "@/lib/db/attach-target-table"
import {
  EQUIPMENT_ATTACH_CATEGORIES,
  isEquipmentCategoryAttach,
} from "@/lib/compendium/attach-targets"

interface AbilityFormData {
  name: string
  description: string
  prerequisites: string
  characteristics: CharacteristicModifier[]
  modifier_refs: string[]
  linked_modifiers: LinkedModifierInstance[]
  attached_to_type: string
  attached_to_id: string
  show_in_builder: boolean
  source: string
  creator_url: string
  icon: string | null
  accent_color: string | null
  card_image_url: string | null
}

const defaultAbility: AbilityFormData = {
  name: "",
  description: "",
  prerequisites: "",
  characteristics: [],
  modifier_refs: [],
  linked_modifiers: [],
  attached_to_type: "",
  attached_to_id: "",
  show_in_builder: false,
  source: "Custom",
  creator_url: "",
  icon: null,
  accent_color: null,
  card_image_url: null,
}

const ATTACH_OPTIONS = [
  { value: "", label: "None (Standalone)" },
  { value: "class", label: "Class" },
  { value: "species", label: "Species" },
  { value: "background", label: "Background" },
  { value: "feat", label: "Feat" },
  { value: "equipment", label: "Equipment" },
  { value: "spell", label: "Spell" },
  { value: "ability", label: "Custom Ability" },
]

export default function AbilityEditorPage({ id }: { id: string }) {
  const [form, setForm] = useState<AbilityFormData>(defaultAbility)
  const [catalog, setCatalog] = useState<ModifierCatalogEntry[]>([])
  const catalogMeta = getCatalogEditorMeta(id)
  const isCatalogEditor = catalogMeta !== null
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachTargets, setAttachTargets] = useState<{ id: string; name: string }[]>([])
  const [otherAbilities, setOtherAbilities] = useState<{ id: string; name: string }[]>([])
  const [allSpells, setAllSpells] = useState<{ id: string; name: string }[]>([])
  const router = useRouter()
  const { handleCopy, copying, copyError, canCopy } = useDuplicateCompendiumItem("abilities", id)
  const { catalog: modifierCatalog } = useModifierCatalog()

  useEffect(() => {
    if (id && id !== "new") {
      const fetchAbility = async () => {
        setLoading(true)
        const db = createClient()
        if (isSystemCatalogEditorRoute(id)) {
          await ensureModifierCatalog(db)
        }
        const { data, error } = await db
          .from("custom_abilities")
          .select("*")
          .eq("id", id)
          .single()
        
        if (error) {
          setError("Custom Ability not found")
        } else if (data) {
          if (isSystemCatalogEditorRoute(id)) {
            setCatalog(parseCatalogFromRow(data as Record<string, unknown>))
          } else {
            setForm({
              name: data.name || "",
              description: data.description || "",
              prerequisites: data.prerequisites || "",
              characteristics: normalizeCharacteristics(data.characteristics, data.uses),
              modifier_refs: readModifierRefs(data as Record<string, unknown>),
              linked_modifiers: readLinkedModifiers(data as Record<string, unknown>, modifierCatalog),
              attached_to_type: data.attached_to_type || "",
              attached_to_id: data.attached_to_id || "",
              show_in_builder: data.show_in_builder ?? false,
              source: data.source || "Custom",
              creator_url: data.creator_url || "",
              icon: data.icon || null,
              accent_color: data.accent_color || null,
            card_image_url: data.card_image_url || null,
            })
          }
        }
        setLoading(false)
      }
      fetchAbility()
    }
  }, [id, isCatalogEditor, modifierCatalog])

  // Fetch attach targets when type changes (equipment uses categories, not item IDs)
  useEffect(() => {
    const fetchTargets = async () => {
      if (!form.attached_to_type) {
        setAttachTargets([])
        return
      }

      if (isEquipmentCategoryAttach(form.attached_to_type)) {
        setAttachTargets(
          EQUIPMENT_ATTACH_CATEGORIES.map((category) => ({
            id: category,
            name: category,
          })),
        )
        return
      }

      const table = attachTypeToTable(form.attached_to_type)
      if (!table) {
        setAttachTargets([])
        return
      }

      const db = createClient()
      const { data } = await db
        .from(table)
        .select("id, name")
        .order("name")
        .limit(200)

      const rows = (data || []).filter((row) => row.id !== id)
      setAttachTargets(rows)
    }
    fetchTargets()
  }, [form.attached_to_type, id])

  useEffect(() => {
    const fetchOtherAbilities = async () => {
      const db = createClient()
      const [{ data: abilities }, { data: spells }] = await Promise.all([
        db.from("custom_abilities").select("id, name").order("name").limit(100),
        db.from("spells").select("id, name, level").order("level").order("name").limit(500),
      ])

      setOtherAbilities((abilities || []).filter((a) => a.id !== id))
      setAllSpells(spells || [])
    }
    fetchOtherAbilities()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const db = createClient()

    if (isCatalogEditor && catalogMeta) {
      const payload = buildCatalogSavePayload(catalog, catalogMeta.info)
      const { error } = await db
        .from("custom_abilities")
        .update(payload)
        .eq("id", catalogMeta.catalogId)
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
      setSaving(false)
      router.push("/compendium?tab=abilities")
      return
    }

    const payload = {
      ...form,
      attached_to_id: form.attached_to_id || null,
      modifier_refs: syncModifierRefs({ linkedModifiers: form.linked_modifiers }).modifierRefs,
      uses: extractUsesConfig(form.characteristics),
      creator_url: normalizeCreatorUrl(form.creator_url),
    }
    
    if (id === "new") {
      const { error } = await db.from("custom_abilities").insert([payload])
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await db.from("custom_abilities").update(payload).eq("id", id)
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
    if (isCatalogEditor) return
    if (!confirm("Are you sure you want to delete this custom ability?")) return
    
    const db = createClient()
    await db.from("custom_abilities").delete().eq("id", id)
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

  if (isCatalogEditor && catalogMeta) {
    return (
      <CatalogEditor
        catalogId={catalogMeta.catalogId}
        catalogName={catalogMeta.name}
        catalogInfo={catalogMeta.info}
        catalog={catalog}
        spellOptions={allSpells}
        otherAbilities={otherAbilities}
        saving={saving}
        error={error}
        onCatalogChange={setCatalog}
        onSubmit={handleSubmit}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <CompendiumEditorToolbar
        tab="abilities"
        title={id === "new" ? "New Custom Ability" : "Edit Custom Ability"}
        isNew={id === "new"}
        saving={saving}
        saveLabel="Save Ability"
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
            nameLabel="Ability Name"
            name={form.name}
            onNameChange={(name) => setForm({ ...form, name })}
            namePlaceholder="e.g., Extra Attack"
            source={form.source}
            onSourceChange={(source) => setForm({ ...form, source })}
            creatorUrl={form.creator_url}
            onCreatorUrlChange={(creator_url) => setForm({ ...form, creator_url })}
            icon={form.icon}
            onIconChange={(icon) => setForm({ ...form, icon })}
            accentColor={form.accent_color}
            onAccentColorChange={(accent_color) => setForm({ ...form, accent_color })}
            cardImageUrl={form.card_image_url}
            onCardImageUrlChange={(card_image_url) => setForm({ ...form, card_image_url })}
          />

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
                  {isEquipmentCategoryAttach(form.attached_to_type)
                    ? "Equipment category"
                    : `Attach to ${form.attached_to_type.charAt(0).toUpperCase() + form.attached_to_type.slice(1)}`}
                </label>
                <select
                  value={form.attached_to_id}
                  onChange={(e) => setForm({ ...form, attached_to_id: e.target.value })}
                  className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">
                    {isEquipmentCategoryAttach(form.attached_to_type)
                      ? "Select category..."
                      : `Select a ${form.attached_to_type}...`}
                  </option>
                  {attachTargets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name}
                    </option>
                  ))}
                </select>
                {isEquipmentCategoryAttach(form.attached_to_type) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Applies to all items in that category (e.g. every Weapon), not a single item.
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Description
            </label>
            <RichTextEditor
              value={form.description}
              onChange={(description) => setForm({ ...form, description })}
              placeholder="Describe what this ability does..."
            />
          </div>

          <LinkedModifiersEditor
            value={normalizeLinkedModifiers(form.linked_modifiers, modifierCatalog, form.modifier_refs)}
            onChange={(linked_modifiers) =>
              setForm((prev) => ({
                ...prev,
                linked_modifiers,
                modifier_refs: syncModifierRefs({ linkedModifiers: linked_modifiers }).modifierRefs,
              }))
            }
            catalog={modifierCatalog}
            label="Modifier effects (from shared catalog)"
            spellOptions={allSpells}
            otherAbilities={otherAbilities}
          />

          {/* Show in Builder Checkbox */}
          <div className="bg-card border-2 border-border rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.show_in_builder}
                onChange={(e) => setForm({ ...form, show_in_builder: e.target.checked })}
                className="w-5 h-5 rounded border-border accent-primary"
              />
              <div>
                <span className="font-semibold text-foreground">Show in Character Builder</span>
                <p className="text-sm text-muted-foreground">
                  When enabled, this custom ability will appear in the &quot;Custom&quot; tab of the character builder preview as well as character sheet.
                </p>
              </div>
            </label>
          </div>

        </form>
      </main>
    </div>
  )
}
