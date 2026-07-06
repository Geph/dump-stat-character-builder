"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/db/client"
import { Info, X } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CompendiumEditorPanel } from "@/components/compendium/compendium-editor-section"
import { pageOverlayPanelClass } from "@/lib/compendium/editor-field-styles"
import { CompendiumEditorHeaderRow } from "@/components/compendium/editor-header-row"
import { RichTextEditor } from "@/components/compendium/rich-text-editor"
import {
  CompendiumEditorToolbar,
  COMPENDIUM_EDITOR_FORM_ID,
} from "@/components/compendium/editor-toolbar"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  normalizeCharacteristics,
  type CharacteristicModifier,
} from "@/lib/compendium/characteristic-modifiers"
import { normalizeCreatorUrl } from "@/components/compendium/source-link-field"
import { readModifierRefs } from "@/lib/compendium/normalize-modifier-refs"
import { enrichFeatsList } from "@/lib/compendium/normalize-feats"
import { DurationEditor } from "@/components/compendium/duration-editor"
import { LinkedModifiersEditor } from "@/components/compendium/linked-modifiers-editor"
import { ModifierChoiceFields } from "@/components/compendium/modifier-choice-fields"
import type { FeatureChoice, FeatureDurationKey, Feat } from "@/lib/types"
import { useModifierCatalog } from "@/hooks/use-modifier-catalog"
import { useDuplicateCompendiumItem } from "@/hooks/use-duplicate-compendium-item"
import { asCompendiumRow, asCompendiumRows, castCompendiumRow } from "@/lib/data/types"
import type { CompendiumThemeColorId } from "@/lib/compendium/theme-colors"
import {
  normalizeLinkedModifiers,
  readLinkedModifiers,
  syncModifierRefs,
  type LinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"

const FEAT_CATEGORIES = ["Origin", "General", "Fighting Style", "Epic Boon"] as const
const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1)

interface FeatFormData {
  name: string
  description: string
  category: string
  level_requirement: number
  prerequisite_feat_ids: string[]
  prerequisite_class_ids: string[]
  prerequisite_species_ids: string[]
  prerequisite_background_ids: string[]
  characteristics: CharacteristicModifier[]
  modifier_refs: string[]
  linked_modifiers: LinkedModifierInstance[]
  is_choice: boolean
  choices: FeatureChoice | null
  source: string
  creator_url: string
  icon: string | null
  accent_color: string | null
  card_image_url: string | null
  repeatable: boolean
  duration: FeatureDurationKey | null
}

const defaultFeat: FeatFormData = {
  name: "",
  description: "",
  category: "General",
  level_requirement: 1,
  prerequisite_feat_ids: [],
  prerequisite_class_ids: [],
  prerequisite_species_ids: [],
  prerequisite_background_ids: [],
  characteristics: [],
  modifier_refs: [],
  linked_modifiers: [],
  is_choice: false,
  choices: null,
  source: "Custom",
  creator_url: "",
  icon: null,
  accent_color: null,
  card_image_url: null,
  repeatable: false,
  duration: null,
}

export default function FeatEditorPage({ id }: { id: string }) {
  const { catalog: modifierCatalog } = useModifierCatalog()
  const [form, setForm] = useState<FeatFormData>(defaultFeat)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allFeats, setAllFeats] = useState<{ id: string; name: string; category: string }[]>([])
  const [allClasses, setAllClasses] = useState<{ id: string; name: string }[]>([])
  const [allSpecies, setAllSpecies] = useState<{ id: string; name: string }[]>([])
  const [allBackgrounds, setAllBackgrounds] = useState<{ id: string; name: string }[]>([])
  const [allSpells, setAllSpells] = useState<{ id: string; name: string }[]>([])
  const router = useRouter()
  const { handleCopy, copying, copyError, canCopy } = useDuplicateCompendiumItem("feats", id)

  useEffect(() => {
    const fetchPrereqOptions = async () => {
      const db = createClient()
      const [
        { data: feats },
        { data: classes },
        { data: species },
        { data: backgrounds },
        { data: spells },
      ] = await Promise.all([
        db.from("feats").select("id, name, category").order("name"),
        db.from("classes").select("id, name").order("name"),
        db.from("species").select("id, name").order("name"),
        db.from("backgrounds").select("id, name").order("name"),
        db.from("spells").select("id, name, level").order("level").order("name").limit(500),
      ])
      setAllFeats(asCompendiumRows<{ id: string; name: string; category: string }>(feats))
      setAllClasses(asCompendiumRows<{ id: string; name: string }>(classes))
      setAllSpecies(asCompendiumRows<{ id: string; name: string }>(species))
      setAllBackgrounds(asCompendiumRows<{ id: string; name: string }>(backgrounds))
      setAllSpells(asCompendiumRows<{ id: string; name: string; level: number }>(spells))
    }
    fetchPrereqOptions()
  }, [])

  useEffect(() => {
    if (id && id !== "new") {
      const fetchFeat = async () => {
        setLoading(true)
        const db = createClient()
        const { data, error } = await db
          .from("feats")
          .select("*")
          .eq("id", id)
          .single()

        if (error) {
          setError("Feat not found")
        } else if (data) {
          const row = asCompendiumRow(data)
          if (!row) {
            setError("Feat not found")
          } else {
            const [enriched] = enrichFeatsList([castCompendiumRow<Feat>(row)], modifierCatalog)
            setForm({
              name: enriched.name || "",
              description: enriched.description || "",
              category: enriched.category || "General",
              level_requirement: enriched.level_requirement ?? 1,
              prerequisite_feat_ids: enriched.prerequisite_feat_ids || [],
              prerequisite_class_ids: enriched.prerequisite_class_ids || [],
              prerequisite_species_ids: enriched.prerequisite_species_ids || [],
              prerequisite_background_ids: enriched.prerequisite_background_ids || [],
              characteristics: normalizeCharacteristics(enriched.benefits, null),
              modifier_refs: readModifierRefs(enriched as unknown as Record<string, unknown>),
              linked_modifiers: readLinkedModifiers(enriched as unknown as Record<string, unknown>, modifierCatalog),
              is_choice: Boolean(enriched.isChoice),
              choices: enriched.choices ?? null,
              source: enriched.source || "Custom",
              creator_url: enriched.creator_url || "",
              icon: enriched.icon || null,
              accent_color: enriched.accent_color || null,
              card_image_url: enriched.card_image_url || null,
              repeatable: Boolean(enriched.repeatable),
              duration: (enriched.duration as FeatureDurationKey | null) ?? null,
            })
          }
        }
        setLoading(false)
      }
      fetchFeat()
    }
  }, [id, modifierCatalog])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const db = createClient()
    const { characteristics, creator_url, ...rest } = form
    const payload = {
      ...rest,
      benefits: characteristics,
      creator_url: normalizeCreatorUrl(creator_url),
    }

    if (id === "new") {
      const { error } = await db.from("feats").insert([payload])
      if (error) { setError(error.message); setSaving(false); return }
    } else {
      const { error } = await db.from("feats").update(payload).eq("id", id)
      if (error) { setError(error.message); setSaving(false); return }
    }

    setSaving(false)
    router.push("/compendium?tab=feats")
  }

  const handleExport = () => {
    const exportData = { type: "dnd-feat", version: 1, data: form }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${form.name.toLowerCase().replace(/\s+/g, "-")}-feat.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this feat?")) return
    const db = createClient()
    await db.from("feats").delete().eq("id", id)
    router.push("/compendium?tab=feats")
  }

  const addPrereqFeat = (featId: string) => {
    if (!featId || form.prerequisite_feat_ids.includes(featId)) return
    setForm(prev => ({ ...prev, prerequisite_feat_ids: [...prev.prerequisite_feat_ids, featId] }))
  }

  const removePrereqFeat = (featId: string) => {
    setForm(prev => ({ ...prev, prerequisite_feat_ids: prev.prerequisite_feat_ids.filter(id => id !== featId) }))
  }

  const addPrereqId = (
    field: "prerequisite_class_ids" | "prerequisite_species_ids" | "prerequisite_background_ids",
    value: string,
  ) => {
    if (!value || form[field].includes(value)) return
    setForm((prev) => ({ ...prev, [field]: [...prev[field], value] }))
  }

  const removePrereqId = (
    field: "prerequisite_class_ids" | "prerequisite_species_ids" | "prerequisite_background_ids",
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [field]: prev[field].filter((id) => id !== value) }))
  }

  const toggleFeatChoice = (checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      is_choice: checked,
      choices: checked
        ? prev.choices ?? {
            category: "Benefit Option",
            options: [{ name: "", description: "" }],
            count: 1,
          }
        : null,
      linked_modifiers: checked ? [] : prev.linked_modifiers,
      modifier_refs: checked ? [] : prev.modifier_refs,
    }))
  }

  const updateFeatChoiceField = (field: keyof FeatureChoice, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      choices: { ...(prev.choices ?? { category: "", options: [], count: 1 }), [field]: value },
    }))
  }

  const addFeatChoiceOption = () => {
    setForm((prev) => ({
      ...prev,
      choices: {
        ...(prev.choices ?? { category: "Benefit Option", options: [], count: 1 }),
        options: [...(prev.choices?.options ?? []), { name: "", description: "" }],
      },
    }))
  }

  const updateFeatChoiceOption = (
    optionIndex: number,
    field: "name" | "description" | "modifierRefs" | "linkedModifiers",
    value: string | string[] | LinkedModifierInstance[],
  ) => {
    setForm((prev) => {
      const choices = prev.choices ?? { category: "", options: [], count: 1 }
      const options = choices.options.map((option, index) =>
        index === optionIndex ? { ...option, [field]: value } : option,
      )
      return { ...prev, choices: { ...choices, options } }
    })
  }

  const removeFeatChoiceOption = (optionIndex: number) => {
    setForm((prev) => {
      const choices = prev.choices ?? { category: "", options: [], count: 1 }
      return {
        ...prev,
        choices: {
          ...choices,
          options: choices.options.filter((_, index) => index !== optionIndex),
        },
      }
    })
  }

  const renderPrereqTags = (
    ids: string[],
    lookup: { id: string; name: string }[],
    onRemove: (id: string) => void,
  ) => (
    <div className="flex flex-wrap gap-2">
      {ids.map((entryId) => {
        const entry = lookup.find((x) => x.id === entryId)
        if (!entry) return null
        return (
          <span
            key={entryId}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium"
          >
            {entry.name}
            <button
              type="button"
              onClick={() => onRemove(entryId)}
              className="text-primary/60 hover:text-destructive transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )
      })}
    </div>
  )

  const availablePrereqFeats = allFeats.filter(f => f.id !== id)

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted rounded" />)}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <CompendiumEditorToolbar
        tab="feats"
        title={id === "new" ? "New Feat" : "Edit Feat"}
        isNew={id === "new"}
        saving={saving}
        saveLabel="Save Feat"
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
            nameLabel="Feat Name"
            name={form.name}
            onNameChange={(name) => setForm({ ...form, name })}
            namePlaceholder="Alert"
            source={form.source}
            onSourceChange={(source) => setForm({ ...form, source })}
            creatorUrl={form.creator_url}
            onCreatorUrlChange={(creator_url) => setForm({ ...form, creator_url })}
            icon={form.icon}
            onIconChange={(icon) => setForm({ ...form, icon })}
            accentColor={form.accent_color as CompendiumThemeColorId | null}
            onAccentColorChange={(accent_color) => setForm({ ...form, accent_color })}
          />

          <CompendiumEditorPanel title="Category & requirements">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              >
                {FEAT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {form.category === "Origin" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Origin feats can be taken at 1st level as part of a background.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Minimum Level Requirement
              </label>
              <select
                value={form.level_requirement}
                onChange={(e) => setForm({ ...form, level_requirement: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              >
                {LEVELS.map(lvl => (
                  <option key={lvl} value={lvl}>Level {lvl}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm font-semibold text-foreground">Can be chosen more than once</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="About repeatable feats"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    When enabled, players may select this feat in multiple milestone slots on the same
                    character.
                  </TooltipContent>
                </Tooltip>
              </div>
              <label className="flex items-center cursor-pointer w-full px-4 py-3 bg-card border-2 border-border rounded-xl min-h-[50px]">
                <input
                  type="checkbox"
                  checked={form.repeatable}
                  onChange={(e) => setForm({ ...form, repeatable: e.target.checked })}
                  className="w-5 h-5 rounded border-border accent-primary"
                />
              </label>
            </div>
          </div>
          </CompendiumEditorPanel>

          <Accordion type="single" collapsible className={`${pageOverlayPanelClass} px-4`}>
            <AccordionItem value="prerequisites" className="border-none">
              <AccordionTrigger className="font-semibold text-foreground hover:no-underline py-4">
                Additional prerequisites
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                <p className="text-xs text-muted-foreground">
                  Character must match all selected requirements before taking this feat.
                </p>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Feats</label>
                  <select
                    value=""
                    onChange={(e) => addPrereqFeat(e.target.value)}
                    className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary mb-2"
                  >
                    <option value="">Add prerequisite feat...</option>
                    {availablePrereqFeats
                      .filter((f) => !form.prerequisite_feat_ids.includes(f.id))
                      .map((f) => (
                        <option key={f.id} value={f.id}>{f.name} ({f.category})</option>
                      ))}
                  </select>
                  {form.prerequisite_feat_ids.length > 0 &&
                    renderPrereqTags(form.prerequisite_feat_ids, allFeats, removePrereqFeat)}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Classes</label>
                  <select
                    value=""
                    onChange={(e) => addPrereqId("prerequisite_class_ids", e.target.value)}
                    className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary mb-2"
                  >
                    <option value="">Add prerequisite class...</option>
                    {allClasses
                      .filter((c) => !form.prerequisite_class_ids.includes(c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                  {form.prerequisite_class_ids.length > 0 &&
                    renderPrereqTags(
                      form.prerequisite_class_ids,
                      allClasses,
                      (id) => removePrereqId("prerequisite_class_ids", id),
                    )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Species</label>
                  <select
                    value=""
                    onChange={(e) => addPrereqId("prerequisite_species_ids", e.target.value)}
                    className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary mb-2"
                  >
                    <option value="">Add prerequisite species...</option>
                    {allSpecies
                      .filter((s) => !form.prerequisite_species_ids.includes(s.id))
                      .map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </select>
                  {form.prerequisite_species_ids.length > 0 &&
                    renderPrereqTags(
                      form.prerequisite_species_ids,
                      allSpecies,
                      (id) => removePrereqId("prerequisite_species_ids", id),
                    )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Backgrounds</label>
                  <select
                    value=""
                    onChange={(e) => addPrereqId("prerequisite_background_ids", e.target.value)}
                    className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary mb-2"
                  >
                    <option value="">Add prerequisite background...</option>
                    {allBackgrounds
                      .filter((b) => !form.prerequisite_background_ids.includes(b.id))
                      .map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                  </select>
                  {form.prerequisite_background_ids.length > 0 &&
                    renderPrereqTags(
                      form.prerequisite_background_ids,
                      allBackgrounds,
                      (id) => removePrereqId("prerequisite_background_ids", id),
                    )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <CompendiumEditorPanel title="Description">
            <RichTextEditor
              value={form.description}
              onChange={(description) => setForm({ ...form, description })}
              placeholder="Describe the feat's benefits..."
            />
          </CompendiumEditorPanel>

          <DurationEditor
            value={form.duration}
            onChange={(duration) => setForm({ ...form, duration })}
          />

          <ModifierChoiceFields
            isChoice={form.is_choice}
            choices={form.choices ?? undefined}
            modifierCatalog={modifierCatalog}
            spellOptions={allSpells}
            toggleLabel="This feat offers a choice between modifier options"
            onToggleChoice={toggleFeatChoice}
            onUpdateChoiceField={updateFeatChoiceField}
            onAddChoiceOption={addFeatChoiceOption}
            onUpdateChoiceOption={updateFeatChoiceOption}
            onRemoveChoiceOption={removeFeatChoiceOption}
          />

          {!form.is_choice && (
            <LinkedModifiersEditor
              value={normalizeLinkedModifiers(form.linked_modifiers, modifierCatalog, form.modifier_refs)}
              onChange={(linked_modifiers) =>
                setForm((prev) => ({
                  ...prev,
                  ...syncModifierRefs({ linkedModifiers: linked_modifiers }),
                  linked_modifiers,
                }))
              }
              catalog={modifierCatalog}
              label="Modifier effects (from shared catalog)"
              spellOptions={allSpells}
            />
          )}

          {form.is_choice && (
            <p className="text-xs text-muted-foreground -mt-2">
              Link modifiers on each choice option above. Top-level modifiers are disabled while choice mode is on.
            </p>
          )}

        </form>
      </main>
    </div>
  )
}
