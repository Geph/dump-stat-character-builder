"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/db/client"
import { CompendiumEditorHeaderRow } from "@/components/compendium/editor-header-row"
import { CompendiumEditorPanel } from "@/components/compendium/compendium-editor-section"
import {
  CompendiumEditorToolbar,
  COMPENDIUM_EDITOR_FORM_ID,
} from "@/components/compendium/editor-toolbar"
import { CreatureStatBlockView } from "@/components/compendium/creature-stat-block-view"
import { compendiumFieldClass } from "@/lib/compendium/editor-field-styles"
import { normalizeCreatorUrl } from "@/components/compendium/source-link-field"
import { parseCreatureStatBlock } from "@/lib/character/parse-creature-stat-block"
import type { CompanionStatBlockTemplate } from "@/lib/character/companion-stat-block"
import { asCompendiumRow } from "@/lib/data/types"
import type { CompendiumThemeColorId } from "@/lib/compendium/theme-colors"

interface CreatureFormData {
  name: string
  creature_type: string
  size: string
  alignment: string
  cr: string
  description: string
  stat_block: CompanionStatBlockTemplate | null
  source: string
  creator_url: string
  icon: string | null
  accent_color: string | null
  card_image_url: string | null
}

const EMPTY_STAT_BLOCK: CompanionStatBlockTemplate = {
  name: "",
  ac: { parts: [{ type: "fixed", value: 10 }] },
  hp: { parts: [{ type: "fixed", value: 1 }] },
  traits: [],
  actions: [],
}

const defaultCreature: CreatureFormData = {
  name: "",
  creature_type: "",
  size: "",
  alignment: "",
  cr: "",
  description: "",
  stat_block: null,
  source: "Custom",
  creator_url: "",
  icon: null,
  accent_color: null,
  card_image_url: null,
}

const fieldClass = compendiumFieldClass

const SAMPLE = `Wolf
Medium Beast, Unaligned
AC 12 Initiative +2 (12)
HP 11 (2d8 + 2)
Speed 40 ft.
MOD SAVE MOD SAVE MOD SAVE
Str 14 +2 +2 Dex 15 +2 +2 Con 12 +1 +1
Int 3 −4 −4 WIS 12 +1 +1 Cha 6 −2 −2
Skills Perception +5, Stealth +4
Senses Darkvision 60 ft.; Passive Perception 15
Languages None
CR 1/4 (XP 50; PB +2)
Traits
Pack Tactics. The wolf has Advantage on an attack roll against a creature if at least one of the wolf's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition.
Actions
Bite. Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Piercing damage. If the target is a Medium or smaller creature, it has the Prone condition.`

export default function CreatureEditor({ id }: { id: string }) {
  const [form, setForm] = useState<CreatureFormData>(defaultCreature)
  const [loading, setLoading] = useState(id !== "new")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pasteText, setPasteText] = useState("")
  const [parseNote, setParseNote] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (id === "new") return
    const fetchCreature = async () => {
      setLoading(true)
      const db = createClient()
      const { data, error: fetchError } = await db
        .from("creatures")
        .select("*")
        .eq("id", id)
        .single()
      if (fetchError || !data) {
        setError("Creature not found")
      } else {
        const row = asCompendiumRow(data)
        if (!row) {
          setError("Creature not found")
        } else {
          setForm({
            name: String(row.name ?? ""),
            creature_type: String(row.creature_type ?? ""),
            size: String(row.size ?? ""),
            alignment: String(row.alignment ?? ""),
            cr: String(row.cr ?? ""),
            description: String(row.description ?? ""),
            stat_block: (row.stat_block as CompanionStatBlockTemplate | null) ?? null,
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
    void fetchCreature()
  }, [id])

  const handleParse = () => {
    const parsed = parseCreatureStatBlock(pasteText, form.name)
    if (!parsed) {
      setParseNote("Could not parse a stat block from that text.")
      return
    }
    setForm((prev) => ({
      ...prev,
      name: parsed.name || prev.name,
      creature_type: parsed.creatureType ?? prev.creature_type,
      size: parsed.size ?? prev.size,
      alignment: parsed.alignment ?? prev.alignment,
      cr: parsed.cr ?? prev.cr,
      stat_block: parsed.template,
    }))
    const traits = parsed.template.traits.length
    const actions = parsed.template.actions.length
    setParseNote(
      `Parsed ${parsed.name || "creature"} — ${traits} trait${traits === 1 ? "" : "s"}, ${actions} action${actions === 1 ? "" : "s"}.`,
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const statBlock: CompanionStatBlockTemplate = {
      ...(form.stat_block ?? EMPTY_STAT_BLOCK),
      name: form.name.trim() || form.stat_block?.name || "Creature",
    }

    const db = createClient()
    const payload = {
      name: form.name.trim(),
      creature_type: form.creature_type.trim() || null,
      size: form.size.trim() || null,
      alignment: form.alignment.trim() || null,
      cr: form.cr.trim() || null,
      description: form.description.trim() || null,
      stat_block: statBlock,
      source: form.source,
      creator_url: normalizeCreatorUrl(form.creator_url),
      icon: form.icon,
      accent_color: form.accent_color,
      card_image_url: form.card_image_url,
    }

    const { error: saveError } =
      id === "new"
        ? await db.from("creatures").insert([payload])
        : await db.from("creatures").update(payload).eq("id", id)

    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    router.push("/compendium?tab=creatures")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">Loading…</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <CompendiumEditorToolbar
        tab="creatures"
        title={id === "new" ? "New Creature" : "Edit Creature"}
        isNew={id === "new"}
        saving={saving}
        saveLabel="Save Creature"
      />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error ? (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive">
            {error}
          </div>
        ) : null}

        <form id={COMPENDIUM_EDITOR_FORM_ID} onSubmit={handleSubmit} className="space-y-6">
          <CompendiumEditorHeaderRow
            nameLabel="Creature Name"
            name={form.name}
            onNameChange={(name) => setForm({ ...form, name })}
            namePlaceholder="Wolf"
            source={form.source}
            onSourceChange={(source) => setForm({ ...form, source })}
            creatorUrl={form.creator_url}
            onCreatorUrlChange={(creator_url) => setForm({ ...form, creator_url })}
            icon={form.icon}
            onIconChange={(icon) => setForm({ ...form, icon })}
            accentColor={form.accent_color as CompendiumThemeColorId | null}
            onAccentColorChange={(accent_color) => setForm({ ...form, accent_color })}
          />

          <CompendiumEditorPanel title="Paste stat block" className="space-y-3" defaultOpen>
            <p className="text-sm text-muted-foreground">
              Paste a stat block (D&D 2024 Monster Manual layout) and parse it into structured
              fields. You can edit the details afterward.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={8}
              placeholder={SAMPLE}
              className={`${fieldClass} font-mono text-xs`}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleParse}
                disabled={!pasteText.trim()}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Parse stat block
              </button>
              <button
                type="button"
                onClick={() => setPasteText(SAMPLE)}
                className="px-3 py-2 rounded-xl border border-border text-sm font-medium hover:border-primary/40 transition-colors"
              >
                Load sample
              </button>
              {parseNote ? <span className="text-sm text-muted-foreground">{parseNote}</span> : null}
            </div>
          </CompendiumEditorPanel>

          <CompendiumEditorPanel title="Creature details" className="space-y-4" defaultOpen>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Size</label>
                <input
                  value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}
                  placeholder="Medium"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Type</label>
                <input
                  value={form.creature_type}
                  onChange={(e) => setForm({ ...form, creature_type: e.target.value })}
                  placeholder="Beast"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Alignment</label>
                <input
                  value={form.alignment}
                  onChange={(e) => setForm({ ...form, alignment: e.target.value })}
                  placeholder="Unaligned"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">CR</label>
                <input
                  value={form.cr}
                  onChange={(e) => setForm({ ...form, cr: e.target.value })}
                  placeholder="1/4"
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Description / notes</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Flavor text or how this creature is used (companion, summon, Wild Shape form)."
                className={fieldClass}
              />
            </div>
          </CompendiumEditorPanel>

          {form.stat_block ? (
            <CompendiumEditorPanel title="Stat block preview" defaultOpen>
              <div className="rounded-xl border border-border bg-card p-4">
                <CreatureStatBlockView template={form.stat_block} variant="light" />
              </div>
            </CompendiumEditorPanel>
          ) : null}
        </form>
      </main>
    </div>
  )
}
