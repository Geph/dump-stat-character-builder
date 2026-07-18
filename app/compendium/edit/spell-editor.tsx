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
import { LinkedModifiersEditor } from "@/components/compendium/linked-modifiers-editor"
import {
  normalizeLinkedModifiers,
  syncModifierRefs,
  type LinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"
import { useModifierCatalog } from "@/hooks/use-modifier-catalog"
import { useDuplicateCompendiumItem } from "@/hooks/use-duplicate-compendium-item"
import { asCompendiumRow, asCompendiumRows, castCompendiumRow } from "@/lib/data/types"
import type { CompendiumThemeColorId } from "@/lib/compendium/theme-colors"
import {
  getSpellSchools,
  SPELL_SCHOOLS_CHANGE_EVENT,
} from "@/lib/compendium/schools-of-magic"

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
  companion_creature_names: string[]
  linked_modifiers: LinkedModifierInstance[]
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
  companion_creature_names: [],
  linked_modifiers: [],
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
  const [spellSchools, setSpellSchools] = useState<string[]>(() => getSpellSchools())
  const router = useRouter()
  const { catalog: modifierCatalog } = useModifierCatalog()
  const { handleCopy, copying, copyError, canCopy } = useDuplicateCompendiumItem("spells", id)

  const isStandardSpellClass = (name: string) =>
    SPELL_CLASSES.some((c) => c.toLowerCase() === name.toLowerCase())

  const nonStandardClassesOnSpell = form.classes.filter((c) => !isStandardSpellClass(c))
  const otherClassListChecked =
    otherClassListOpen || nonStandardClassesOnSpell.length > 0

  useEffect(() => {
    const syncSchools = () => setSpellSchools(getSpellSchools())
    syncSchools()
    window.addEventListener(SPELL_SCHOOLS_CHANGE_EVENT, syncSchools)
    window.addEventListener("storage", syncSchools)
    return () => {
      window.removeEventListener(SPELL_SCHOOLS_CHANGE_EVENT, syncSchools)
      window.removeEventListener("storage", syncSchools)
    }
  }, [])

  useEffect(() => {
    const fetchCustomClasses = async () => {
      const db = createClient()
      const { data } = await db.from("classes").select("id, name, source").order("name")
      setCustomClasses(
        asCompendiumRows<{ id: string; name: string; source: string | null }>(data)
          .filter((row) => !isSrdSource(String(row.source ?? "")))
          .map((row) => ({ id: row.id, name: row.name })),
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
          const row = asCompendiumRow(data)
          if (!row) {
            setError("Spell not found")
          } else {
            setForm({
              name: String(row.name ?? ""),
              level: (row.level as number | null | undefined) ?? 0,
              school: String(row.school ?? "Evocation"),
              casting_time: String(row.casting_time ?? "1 action"),
              range: String(row.range ?? "Self"),
              components: (row.components as string[]) || ["V", "S"],
              material: String(row.material ?? ""),
              duration: String(row.duration ?? "Instantaneous"),
              concentration: Boolean(row.concentration),
              ritual: Boolean(row.ritual),
              description: String(row.description ?? ""),
              higher_levels: String(row.higher_levels ?? ""),
              classes: (row.classes as string[]) || [],
              companion_creature_names: Array.isArray(row.companion_creature_names)
                ? (row.companion_creature_names as string[])
                : [],
              linked_modifiers: normalizeLinkedModifiers(
                (row.linked_modifiers ?? row.linkedModifiers) as LinkedModifierInstance[] | null | undefined,
                modifierCatalog,
                [],
              ),
              source: String(row.source ?? "Custom"),
              creator_url: String(row.creator_url ?? ""),
              icon: (row.icon as string | null) ?? null,
              accent_color: (row.accent_color as string | null) ?? null,
              card_image_url: (row.card_image_url as string | null) ?? null,
            })
          }
        }
        setLoading(false)
      }
      fetchSpell()
    }
  }, [id, modifierCatalog])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const db = createClient()
    const synced = syncModifierRefs({ linkedModifiers: form.linked_modifiers })
    const payload = {
      ...form,
      linked_modifiers: synced.linkedModifiers ?? form.linked_modifiers,
      creator_url: normalizeCreatorUrl(form.creator_url),
    }
    
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
            accentColor={form.accent_color as CompendiumThemeColorId | null}
            onAccentColorChange={(accent_color) => setForm({ ...form, accent_color })}
          />

          <CompendiumEditorPanel title="On Class Spell List" defaultOpen>
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

          <CompendiumEditorPanel title="Level, school & flags" defaultOpen>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        {lvl}
                        {lvl === 1 ? "st" : lvl === 2 ? "nd" : lvl === 3 ? "rd" : "th"} Level
                      </option>
                    ))}
                  </select>
                </div>
                <DropdownOrOtherField
                  label="School"
                  value={form.school}
                  onChange={(school) => setForm({ ...form, school })}
                  options={spellSchools.map((school) => ({ value: school, label: school }))}
                  otherPlaceholder="e.g. Psionic Powers"
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">Flags</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.ritual}
                      onChange={(e) => setForm({ ...form, ritual: e.target.checked })}
                      className="w-4 h-4 rounded border-border accent-primary"
                    />
                    <span className="text-sm text-foreground">Ritual</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.concentration}
                      onChange={(e) => setForm({ ...form, concentration: e.target.checked })}
                      className="w-4 h-4 rounded border-border accent-primary"
                    />
                    <span className="text-sm text-foreground">Concentration</span>
                  </label>
                </div>
              </div>
            </div>
          </CompendiumEditorPanel>

          <CompendiumEditorPanel title="Casting time, range & duration" defaultOpen>
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

          <CompendiumEditorPanel title="Components" defaultOpen>
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

          <CompendiumEditorPanel title="Summon Creature" defaultOpen={false}>
            <p className="text-xs text-muted-foreground mb-3">
              Link Creatures &amp; Companions that appear on the character sheet Companions tab when
              this spell is known (Find Familiar, Find Steed, Animate Dead, etc.). Prefer the{" "}
              <span className="font-semibold">Grant Creature / Companion</span> modifier for player
              choices.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-foreground mb-2">
                Creature names (always granted)
              </label>
              <textarea
                value={form.companion_creature_names.join("\n")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    companion_creature_names: e.target.value
                      .split(/[\n,]/)
                      .map((entry) => entry.trim())
                      .filter(Boolean),
                  })
                }
                rows={3}
                placeholder={"Otherworldly Steed\nDraconic Spirit"}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <LinkedModifiersEditor
              value={normalizeLinkedModifiers(form.linked_modifiers, modifierCatalog, [])}
              onChange={(linked_modifiers) =>
                setForm((prev) => ({
                  ...prev,
                  linked_modifiers,
                }))
              }
              catalog={modifierCatalog}
              label="Summon / grant creature modifiers"
            />
          </CompendiumEditorPanel>

          <CompendiumEditorPanel title="Description" defaultOpen>
            <RichTextEditor
              value={form.description}
              onChange={(description) => setForm({ ...form, description })}
              placeholder="Describe what the spell does..."
            />
          </CompendiumEditorPanel>

          <CompendiumEditorPanel title="At Higher Levels" defaultOpen>
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
