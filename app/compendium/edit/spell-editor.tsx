"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/db/client"
import { X } from "lucide-react"
import type { Spell } from "@/lib/types"
import { isSrdSource } from "@/lib/srd/source"
import { CompendiumEditorHeaderRow } from "@/components/compendium/editor-header-row"
import { RichTextEditor } from "@/components/compendium/rich-text-editor"
import { DropdownOrOtherField } from "@/components/compendium/dropdown-or-other-field"
import { compendiumFieldClass } from "@/lib/compendium/editor-field-styles"
import { CompendiumEditorPanel } from "@/components/compendium/compendium-editor-section"
import {
  CompendiumEditorToolbar,
  COMPENDIUM_EDITOR_FORM_ID,
} from "@/components/compendium/editor-toolbar"
import { normalizeCreatorUrl } from "@/components/compendium/source-link-field"
import { useDuplicateCompendiumItem } from "@/hooks/use-duplicate-compendium-item"

const SPELL_SCHOOLS = [
  "Abjuration", "Conjuration", "Divination", "Enchantment",
  "Evocation", "Illusion", "Necromancy", "Transmutation"
]

const SPELL_CLASSES = [
  "Bard", "Cleric", "Druid", "Paladin", "Ranger", 
  "Sorcerer", "Warlock", "Wizard"
]

const CASTING_TIME_OPTIONS = [
  { value: "1 action", label: "Action" },
  { value: "1 bonus action", label: "Bonus action" },
  { value: "1 reaction", label: "Reaction" },
  { value: "1 minute", label: "1 minute" },
]

const DURATION_OPTIONS = [
  { value: "Instantaneous", label: "Instantaneous" },
  { value: "1 minute", label: "1 minute" },
  { value: "10 minutes", label: "10 minutes" },
  { value: "1 hour", label: "1 hour" },
  { value: "Until dispelled", label: "Until dispelled" },
]

const RANGE_OPTIONS = [
  { value: "Self", label: "Self" },
  { value: "Touch", label: "Touch" },
  { value: "15 feet", label: "15 feet" },
  { value: "30 feet", label: "30 feet" },
  { value: "60 feet", label: "60 feet" },
  { value: "90 feet", label: "90 feet" },
  { value: "120 feet", label: "120 feet" },
]

interface SpellFormData {
  name: string
  level: number
  school: string
  casting_time: string
  range: string
  components: string[]
  material: string
  duration: string
  concentration: boolean
  ritual: boolean
  description: string
  higher_levels: string
  classes: string[]
  source: string
  creator_url: string
  icon: string | null
  accent_color: string | null
  card_image_url: string | null
}

const defaultSpell: SpellFormData = {
  name: "",
  level: 0,
  school: "Evocation",
  casting_time: "1 action",
  range: "Self",
  components: ["V", "S"],
  material: "",
  duration: "Instantaneous",
  concentration: false,
  ritual: false,
  description: "",
  higher_levels: "",
  classes: [],
  source: "Custom",
  creator_url: "",
  icon: "bookmarklet",
  accent_color: null,
  card_image_url: null,
}

export default function SpellEditorPage({ id }: { id: string }) {
  const [form, setForm] = useState<SpellFormData>(defaultSpell)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customClasses, setCustomClasses] = useState<{ id: string; name: string }[]>([])
  const [otherClassListOpen, setOtherClassListOpen] = useState(false)
  const router = useRouter()
  const { handleCopy, copying, copyError, canCopy } = useDuplicateCompendiumItem("spells", id)

  const isStandardSpellClass = (name: string) =>
    SPELL_CLASSES.some((c) => c.toLowerCase() === name.toLowerCase())

  const nonStandardClassesOnSpell = form.classes.filter((c) => !isStandardSpellClass(c))
  const otherClassListChecked =
    otherClassListOpen || nonStandardClassesOnSpell.length > 0

  useEffect(() => {
    const fetchCustomClasses = async () => {
      const db = createClient()
      const { data } = await db.from("classes").select("id, name, source").order("name")
      setCustomClasses(
        (data ?? [])
          .filter((row) => !isSrdSource(row.source as string))
          .map((row) => ({ id: row.id as string, name: row.name as string })),
      )
    }
    fetchCustomClasses()
  }, [])

  useEffect(() => {
    if (id && id !== "new") {
      const fetchSpell = async () => {
        setLoading(true)
        const db = createClient()
        const { data, error } = await db
          .from("spells")
          .select("*")
          .eq("id", id)
          .single()
        
        if (error) {
          setError("Spell not found")
        } else if (data) {
          setForm({
            name: data.name || "",
            level: data.level || 0,
            school: data.school || "Evocation",
            casting_time: data.casting_time || "1 action",
            range: data.range || "Self",
            components: data.components || ["V", "S"],
            material: data.material || "",
            duration: data.duration || "Instantaneous",
            concentration: data.concentration || false,
            ritual: data.ritual || false,
            description: data.description || "",
            higher_levels: data.higher_levels || "",
            classes: data.classes || [],
            source: data.source || "Custom",
            creator_url: data.creator_url || "",
            icon: data.icon || null,
            accent_color: data.accent_color || null,
            card_image_url: data.card_image_url || null,
          })
        }
        setLoading(false)
      }
      fetchSpell()
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const db = createClient()
    const payload = { ...form, creator_url: normalizeCreatorUrl(form.creator_url) }
    
    if (id === "new") {
      const { error } = await db.from("spells").insert([payload])
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await db.from("spells").update(payload).eq("id", id)
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    }
    
    setSaving(false)
    router.push("/compendium?tab=spells")
  }

  const handleExport = () => {
    const exportData = { type: "dnd-spell", version: 1, data: form }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${form.name.toLowerCase().replace(/\s+/g, "-")}-spell.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this spell?")) return
    
    const db = createClient()
    await db.from("spells").delete().eq("id", id)
    router.push("/compendium?tab=spells")
  }

  const toggleComponent = (comp: string) => {
    setForm(prev => ({
      ...prev,
      components: prev.components.includes(comp)
        ? prev.components.filter(c => c !== comp)
        : [...prev.components, comp]
    }))
  }

  const spellHasClass = (cls: string) =>
    form.classes.some((c) => c.toLowerCase() === cls.toLowerCase())

  const toggleClass = (cls: string) => {
    setForm((prev) => {
      const has = prev.classes.some((c) => c.toLowerCase() === cls.toLowerCase())
      return {
        ...prev,
        classes: has
          ? prev.classes.filter((c) => c.toLowerCase() !== cls.toLowerCase())
          : [...prev.classes, cls],
      }
    })
  }

  const clearNonStandardClasses = () => {
    setForm((prev) => ({
      ...prev,
      classes: prev.classes.filter((c) => isStandardSpellClass(c)),
    }))
  }

  const addCustomClassFromDropdown = (className: string) => {
    if (!className || spellHasClass(className)) return
    toggleClass(className)
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
      <CompendiumEditorToolbar
        tab="spells"
        title={id === "new" ? "New Spell" : "Edit Spell"}
        isNew={id === "new"}
        saving={saving}
        saveLabel="Save Spell"
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
            nameLabel="Spell Name"
            name={form.name}
            onNameChange={(name) => setForm({ ...form, name })}
            namePlaceholder="Fireball"
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

          <CompendiumEditorPanel title="On Class Spell List">
            <div className="flex flex-wrap gap-3 items-center">
              {SPELL_CLASSES.map((cls) => (
                <label key={cls} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={spellHasClass(cls)}
                    onChange={() => toggleClass(cls)}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-foreground">{cls}</span>
                </label>
              ))}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={otherClassListChecked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setOtherClassListOpen(true)
                    } else {
                      setOtherClassListOpen(false)
                      clearNonStandardClasses()
                    }
                  }}
                  className="w-4 h-4 rounded border-border accent-primary"
                />
                <span className="text-foreground">Other</span>
              </label>
            </div>
            {otherClassListChecked && (
              <div className="mt-3 space-y-2">
                {customClasses.length > 0 ? (
                  <select
                    value=""
                    onChange={(e) => addCustomClassFromDropdown(e.target.value)}
                    className={compendiumFieldClass}
                  >
                    <option value="">Select custom class...</option>
                    {customClasses
                      .filter((cls) => !spellHasClass(cls.name))
                      .map((cls) => (
                        <option key={cls.id} value={cls.name}>
                          {cls.name}
                        </option>
                      ))}
                  </select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No custom classes in the compendium yet. Create a class with a non-SRD source to list it here.
                  </p>
                )}
                {nonStandardClassesOnSpell.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {nonStandardClassesOnSpell.map((className) => (
                      <span
                        key={className}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm"
                      >
                        {className}
                        <button
                          type="button"
                          onClick={() => toggleClass(className)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CompendiumEditorPanel>

          <CompendiumEditorPanel title="Level, school & flags">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Level
              </label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: parseInt(e.target.value) })}
                className={compendiumFieldClass}
              >
                <option value={0}>Cantrip</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}{lvl === 1 ? "st" : lvl === 2 ? "nd" : lvl === 3 ? "rd" : "th"} Level
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                School
              </label>
              <select
                value={form.school}
                onChange={(e) => setForm({ ...form, school: e.target.value })}
                className={compendiumFieldClass}
              >
                {SPELL_SCHOOLS.map((school) => (
                  <option key={school} value={school}>{school}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer min-h-[50px] pb-1">
              <input
                type="checkbox"
                checked={form.ritual}
                onChange={(e) => setForm({ ...form, ritual: e.target.checked })}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-foreground font-semibold text-sm">Ritual</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer min-h-[50px] pb-1">
              <input
                type="checkbox"
                checked={form.concentration}
                onChange={(e) => setForm({ ...form, concentration: e.target.checked })}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-foreground font-semibold text-sm">Concentration</span>
            </label>
          </div>
          </CompendiumEditorPanel>

          <CompendiumEditorPanel title="Casting time, range & duration">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DropdownOrOtherField
              label="Casting Time"
              value={form.casting_time}
              onChange={(casting_time) => setForm({ ...form, casting_time })}
              options={CASTING_TIME_OPTIONS}
              otherPlaceholder="e.g. 10 minutes"
            />
            <DropdownOrOtherField
              label="Range"
              value={form.range}
              onChange={(range) => setForm({ ...form, range })}
              options={RANGE_OPTIONS}
              otherPlaceholder="e.g. 300 feet"
            />
            <DropdownOrOtherField
              label="Duration"
              value={form.duration}
              onChange={(duration) => setForm({ ...form, duration })}
              options={DURATION_OPTIONS}
              otherPlaceholder="e.g. 8 hours"
            />
          </div>
          </CompendiumEditorPanel>

          <CompendiumEditorPanel title="Components">
            <div className="flex gap-6 mb-3">
              {["V", "S", "M"].map((comp) => (
                <label key={comp} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.components.includes(comp)}
                    onChange={() => toggleComponent(comp)}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-foreground">
                    {comp === "V" ? "Verbal" : comp === "S" ? "Somatic" : "Material"}
                  </span>
                </label>
              ))}
            </div>
            {form.components.includes("M") && (
              <input
                type="text"
                value={form.material}
                onChange={(e) => setForm({ ...form, material: e.target.value })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                placeholder="Material components (e.g., a bit of bat guano and sulfur)"
              />
            )}
          </CompendiumEditorPanel>

          <CompendiumEditorPanel title="Description">
            <RichTextEditor
              value={form.description}
              onChange={(description) => setForm({ ...form, description })}
              placeholder="Describe what the spell does..."
            />
          </CompendiumEditorPanel>

          <CompendiumEditorPanel title="At Higher Levels">
            <RichTextEditor
              value={form.higher_levels}
              onChange={(higher_levels) => setForm({ ...form, higher_levels })}
              placeholder="Effects when cast at higher levels..."
              minHeightClass="min-h-[4rem]"
            />
          </CompendiumEditorPanel>

          {/* Submit */}
        </form>
      </main>
    </div>
  )
}
