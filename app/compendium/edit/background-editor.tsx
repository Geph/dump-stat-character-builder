"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { createClient } from "@/lib/db/client"
import { Plus, Search, X } from "lucide-react"
import {
  BACKGROUND_ABILITY_KEYS,
  normalizeBackgroundAbilityBonuses,
  normalizeGrantedSpells,
  BACKGROUND_GRANT_CHARACTER_LEVELS,
  formatGrantedSpellLevelKey,
} from "@/lib/compendium/background-utils"
import { CompendiumEditorHeaderRow } from "@/components/compendium/editor-header-row"
import { RichTextEditor } from "@/components/compendium/rich-text-editor"
import {
  CompendiumEditorToolbar,
  COMPENDIUM_EDITOR_FORM_ID,
} from "@/components/compendium/editor-toolbar"
import { enrichBackgroundList, normalizeBackgroundRow } from "@/lib/compendium/normalize-backgrounds"
import { OriginFeatGrantedSelect } from "@/components/compendium/origin-feat-granted-select"
import { normalizeCreatorUrl } from "@/components/compendium/source-link-field"
import { BackgroundProficienciesEditor } from "@/components/compendium/background-proficiencies-editor"
import {
  emptyBackgroundProficiencies,
  normalizeBackgroundProficiencies,
  type BackgroundProficiencies,
} from "@/lib/compendium/background-proficiencies"
import { LinkedModifiersEditor } from "@/components/compendium/linked-modifiers-editor"
import { StartingEquipmentGroupsEditor } from "@/components/compendium/starting-equipment-groups-editor"
import { useDuplicateCompendiumItem } from "@/hooks/use-duplicate-compendium-item"
import type { StartingEquipmentGroup } from "@/lib/types"
import { useModifierCatalog } from "@/hooks/use-modifier-catalog"
import {
  normalizeLinkedModifiers,
  readLinkedModifiers,
  syncModifierRefs,
  type LinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"

const SKILLS = [
  "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception",
  "History", "Insight", "Intimidation", "Investigation", "Medicine",
  "Nature", "Perception", "Performance", "Persuasion", "Religion",
  "Sleight of Hand", "Stealth", "Survival"
]

interface EquipmentItem {
  name: string
  quantity: number
}

interface BackgroundFormData {
  name: string
  description: string
  ability_bonuses: Record<string, number>
  skill_proficiencies: string[]
  proficiencies: BackgroundProficiencies
  feat_granted: string
  starting_gold: number
  starting_equipment: EquipmentItem[]
  starting_equipment_groups: StartingEquipmentGroup[]
  source: string
  creator_url: string
  icon: string | null
  accent_color: string | null
  card_image_url: string | null
  feature_name: string
  feature_description: string
  feature_linked_modifiers: LinkedModifierInstance[]
  feature_modifier_refs: string[]
  grants_spells: boolean
  granted_spells: Record<string, string[]>
}

const defaultBackground: BackgroundFormData = {
  name: "",
  description: "",
  ability_bonuses: {},
  skill_proficiencies: [],
  proficiencies: emptyBackgroundProficiencies(),
  feat_granted: "",
  starting_gold: 0,
  starting_equipment: [],
  starting_equipment_groups: [],
  source: "Custom",
  creator_url: "",
  icon: null,
  accent_color: null,
  card_image_url: null,
  feature_name: "",
  feature_description: "",
  feature_linked_modifiers: [],
  feature_modifier_refs: [],
  grants_spells: false,
  granted_spells: {},
}

export default function BackgroundEditorPage({ id }: { id: string }) {
  const { catalog: modifierCatalog } = useModifierCatalog()
  const [form, setForm] = useState<BackgroundFormData>(defaultBackground)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [weaponOptions, setWeaponOptions] = useState<
    { id: string; name: string; subcategory: string | null }[]
  >([])
  const [equipInput, setEquipInput] = useState("")
  const [equipQty, setEquipQty] = useState(1)
  const [originFeats, setOriginFeats] = useState<{ id: string; name: string }[]>([])
  const [allSpells, setAllSpells] = useState<{ id: string; name: string; level: number }[]>([])
  const [spellSearch, setSpellSearch] = useState("")
  const [characterLevelPick, setCharacterLevelPick] = useState(1)
  const router = useRouter()
  const { handleCopy, copying, copyError, canCopy } = useDuplicateCompendiumItem("backgrounds", id)

  // Fetch origin feats for the dropdown
  useEffect(() => {
    const fetchOriginFeats = async () => {
      const db = createClient()
      const { data } = await db
        .from("feats")
        .select("id, name")
        .eq("category", "Origin")
        .order("name")
      setOriginFeats(data || [])
    }
    fetchOriginFeats()
  }, [])

  useEffect(() => {
    const fetchWeapons = async () => {
      const db = createClient()
      const { data } = await db
        .from("equipment")
        .select("id, name, subcategory")
        .eq("category", "Weapon")
        .order("name")
      setWeaponOptions(data || [])
    }
    fetchWeapons()
  }, [])

  useEffect(() => {
    const fetchSpells = async () => {
      const db = createClient()
      const { data } = await db.from("spells").select("id, name, level").order("level").order("name")
      setAllSpells(data || [])
    }
    fetchSpells()
  }, [])

  useEffect(() => {
    if (id && id !== "new") {
      const fetchBackground = async () => {
        setLoading(true)
        const db = createClient()
        const { data, error } = await db
          .from("backgrounds")
          .select("*")
          .eq("id", id)
          .single()

        if (error) {
          setError("Background not found")
        } else if (data) {
          const row = data as Record<string, unknown> & { name: string }
          const enriched = enrichBackgroundList([row])[0]
          setForm({
            name: String(row.name || ""),
            description: String(row.description || ""),
            ability_bonuses: normalizeBackgroundAbilityBonuses(
              enriched.ability_bonuses as Record<string, number> | null | undefined,
            ),
            skill_proficiencies: (row.skill_proficiencies as string[]) || [],
            proficiencies: normalizeBackgroundProficiencies(
              row.proficiencies,
              row.tool_proficiencies as string[] | null | undefined,
            ),
            feat_granted: String(
              (enriched as { feat_granted?: string | null }).feat_granted || row.feat_granted || "",
            ),
            starting_gold: (row.starting_gold as number | null | undefined) ?? 0,
            starting_equipment: (row.starting_equipment as BackgroundFormData["starting_equipment"]) || [],
            starting_equipment_groups:
              (row.starting_equipment_groups as StartingEquipmentGroup[] | null | undefined) || [],
            source: String(row.source || "Custom"),
            creator_url: String(row.creator_url || ""),
            icon: (row.icon as string | null) ?? null,
            accent_color: (row.accent_color as string | null) ?? null,
            card_image_url: (row.card_image_url as string | null) ?? null,
            feature_name: (row.feature as { name?: string } | null)?.name || "",
            feature_description: (row.feature as { description?: string } | null)?.description || "",
            feature_linked_modifiers: readLinkedModifiers(
              (row.feature ?? {}) as Record<string, unknown>,
              modifierCatalog,
            ),
            feature_modifier_refs: Array.isArray((row.feature as { modifierRefs?: string[] } | null)?.modifierRefs)
              ? (row.feature as { modifierRefs: string[] }).modifierRefs
              : Array.isArray((row.feature as { modifier_refs?: string[] } | null)?.modifier_refs)
                ? (row.feature as { modifier_refs: string[] }).modifier_refs
                : [],
            grants_spells: Boolean(row.grants_spells),
            granted_spells: normalizeGrantedSpells(
              row.granted_spells as Record<string, string[]> | null | undefined,
            ),
          })
        }
        setLoading(false)
      }
      fetchBackground()
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const db = createClient()
    const {
      feature_name,
      feature_description,
      feature_linked_modifiers,
      feature_modifier_refs,
      grants_spells,
      granted_spells,
      proficiencies,
      ...rest
    } = form
    const normalizedProficiencies = normalizeBackgroundProficiencies(proficiencies)
    const normalizedRow = normalizeBackgroundRow({
      ...rest,
      ability_bonuses: Object.keys(rest.ability_bonuses).length ? rest.ability_bonuses : null,
    })
    const payload = {
      ...normalizedRow,
      proficiencies: normalizedProficiencies,
      tool_proficiencies: [
        ...normalizedProficiencies.tools,
        ...normalizedProficiencies.vehicles,
      ],
      creator_url: normalizeCreatorUrl(form.creator_url),
      feature:
        feature_name.trim() || feature_description.trim() || feature_linked_modifiers.length
          ? syncModifierRefs({
              name: feature_name.trim() || "Background Feature",
              description: feature_description.trim(),
              linkedModifiers: feature_linked_modifiers,
              modifierRefs: feature_modifier_refs,
            })
          : null,
      grants_spells,
      granted_spells: grants_spells ? granted_spells : null,
    }

    if (id === "new") {
      const { error } = await db.from("backgrounds").insert([payload])
      if (error) { setError(error.message); setSaving(false); return }
    } else {
      const { error } = await db.from("backgrounds").update(payload).eq("id", id)
      if (error) { setError(error.message); setSaving(false); return }
    }

    setSaving(false)
    router.push("/compendium?tab=backgrounds")
  }

  const handleExport = () => {
    const exportData = { type: "dnd-background", version: 1, data: form }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${form.name.toLowerCase().replace(/\s+/g, "-")}-background.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this background?")) return
    const db = createClient()
    await db.from("backgrounds").delete().eq("id", id)
    router.push("/compendium?tab=backgrounds")
  }

  const setAbilityBonus = (ability: string, value: number) => {
    setForm((prev) => ({
      ...prev,
      ability_bonuses: { ...prev.ability_bonuses, [ability]: value },
    }))
  }

  const toggleEligibleAbility = (ability: string, enabled: boolean) => {
    setForm((prev) => {
      const next = { ...prev.ability_bonuses }
      if (enabled) next[ability] = next[ability] ?? 0
      else delete next[ability]
      return { ...prev, ability_bonuses: next }
    })
  }

  const toggleSkill = (skill: string) => {
    setForm(prev => ({
      ...prev,
      skill_proficiencies: prev.skill_proficiencies.includes(skill)
        ? prev.skill_proficiencies.filter(s => s !== skill)
        : [...prev.skill_proficiencies, skill]
    }))
  }

  const addEquipmentItem = () => {
    if (!equipInput.trim()) return
    setForm(prev => ({
      ...prev,
      starting_equipment: [...prev.starting_equipment, { name: equipInput.trim(), quantity: equipQty }]
    }))
    setEquipInput("")
    setEquipQty(1)
  }

  const removeEquipmentItem = (index: number) => {
    setForm(prev => ({ ...prev, starting_equipment: prev.starting_equipment.filter((_, i) => i !== index) }))
  }

  const addGrantedSpell = (spellId: string) => {
    const key = String(characterLevelPick)
    setForm((prev) => {
      const levelSpells = prev.granted_spells[key] ?? []
      if (levelSpells.includes(spellId)) return prev
      return {
        ...prev,
        granted_spells: { ...prev.granted_spells, [key]: [...levelSpells, spellId] },
      }
    })
  }

  const removeGrantedSpell = (levelKey: string, spellId: string) => {
    setForm((prev) => {
      const next = { ...prev.granted_spells }
      next[levelKey] = (next[levelKey] ?? []).filter((id) => id !== spellId)
      if (next[levelKey].length === 0) delete next[levelKey]
      return { ...prev, granted_spells: next }
    })
  }

  const filteredSpellsForGrant = allSpells.filter((spell) => {
    const q = spellSearch.trim().toLowerCase()
    if (!q) return true
    return spell.name.toLowerCase().includes(q)
  })

  const grantedSpellLevelKeys = Object.keys(form.granted_spells).sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-muted rounded" />)}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <CompendiumEditorToolbar
        tab="backgrounds"
        title={id === "new" ? "New Background" : "Edit Background"}
        isNew={id === "new"}
        saving={saving}
        saveLabel="Save"
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
            nameLabel="Background Name"
            name={form.name}
            onNameChange={(name) => setForm({ ...form, name })}
            namePlaceholder="Sage"
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
            cardImageAspect="21/9"
          />

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Description</label>
            <RichTextEditor
              value={form.description}
              onChange={(description) => setForm({ ...form, description })}
              placeholder="You spent years learning the lore of the multiverse..."
            />
          </div>

          {/* Ability Bonuses */}
          <div className="bg-card border-2 border-border rounded-xl p-4">
            <label className="block text-sm font-semibold text-foreground mb-1">
              Ability Score Bonuses
            </label>
            <p className="text-xs text-muted-foreground mb-4">
              Check which abilities are eligible for player choice (+2/+1 or +1/+1/+1). Use +1 or +2 for
              fixed bonuses instead of +0.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BACKGROUND_ABILITY_KEYS.map((ability) => {
                const included = ability in form.ability_bonuses
                const value = form.ability_bonuses[ability] ?? 0
                return (
                  <div
                    key={ability}
                    className="flex flex-wrap items-center gap-3 p-2 rounded-lg border border-border bg-background"
                  >
                    <label className="flex items-center gap-2 text-sm cursor-pointer min-w-[8rem]">
                      <input
                        type="checkbox"
                        checked={included}
                        onChange={(e) => toggleEligibleAbility(ability, e.target.checked)}
                        className="accent-primary"
                      />
                      <span className="text-foreground capitalize">{ability}</span>
                    </label>
                    {included && (
                      <select
                        value={value}
                        onChange={(e) => setAbilityBonus(ability, parseInt(e.target.value, 10))}
                        className="flex-1 min-w-[5rem] px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value={0}>+0 (eligible)</option>
                        <option value={1}>+1 fixed</option>
                        <option value={2}>+2 fixed</option>
                      </select>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Skill Proficiencies */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Skill Proficiencies</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SKILLS.map((skill) => (
                <label key={skill} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.skill_proficiencies.includes(skill)}
                    onChange={() => toggleSkill(skill)}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-foreground">{skill}</span>
                </label>
              ))}
            </div>
          </div>

          <BackgroundProficienciesEditor
            value={form.proficiencies}
            onChange={(proficiencies) => setForm((prev) => ({ ...prev, proficiencies }))}
            weaponOptions={weaponOptions}
          />

          {/* Background feature */}
          <div className="bg-card border-2 border-border rounded-xl p-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Background Feature</label>
              <p className="text-xs text-muted-foreground">
                Optional special ability or benefit text (separate from the origin feat).
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Feature Name</label>
              <input
                type="text"
                value={form.feature_name}
                onChange={(e) => setForm({ ...form, feature_name: e.target.value })}
                className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                placeholder="Shelter of the Faithful"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Feature Description</label>
              <RichTextEditor
                value={form.feature_description}
                onChange={(feature_description) => setForm({ ...form, feature_description })}
                placeholder="Describe what this feature grants..."
              />
            </div>
            <LinkedModifiersEditor
              value={normalizeLinkedModifiers(
                form.feature_linked_modifiers,
                modifierCatalog,
                form.feature_modifier_refs,
              )}
              onChange={(feature_linked_modifiers) =>
                setForm((prev) => ({
                  ...prev,
                  feature_linked_modifiers,
                  feature_modifier_refs: feature_linked_modifiers.map((instance) => instance.catalogRefId),
                }))
              }
              catalog={modifierCatalog}
              label="Feature modifier effects"
              emptyMessage="No mechanical effects linked to this background feature."
            />
          </div>

          {/* Granted spells */}
          <div className="bg-card border-2 border-border rounded-xl p-4 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.grants_spells}
                onChange={(e) =>
                  setForm({
                    ...form,
                    grants_spells: e.target.checked,
                    granted_spells: e.target.checked ? form.granted_spells : {},
                  })
                }
                className="w-5 h-5 mt-0.5 rounded border-border accent-primary shrink-0"
              />
              <div>
                <span className="font-semibold text-foreground">Grants spells</span>
                <p className="text-sm text-muted-foreground mt-1">
                  When enabled, assign spells the character learns at each overall character level.
                </p>
              </div>
            </label>

            {form.grants_spells && (
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Character level</label>
                    <select
                      value={characterLevelPick}
                      onChange={(e) => setCharacterLevelPick(parseInt(e.target.value, 10))}
                      className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                    >
                      {BACKGROUND_GRANT_CHARACTER_LEVELS.map((opt) => (
                        <option key={opt.level} value={opt.level}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Search spells</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={spellSearch}
                        onChange={(e) => setSpellSearch(e.target.value)}
                        placeholder="Filter by name..."
                        className="w-full pl-10 pr-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) addGrantedSpell(e.target.value)
                  }}
                  className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Add spell at selected character level...</option>
                  {filteredSpellsForGrant.map((spell) => (
                    <option key={spell.id} value={spell.id}>
                      {spell.name}
                      {spell.level === 0 ? " (cantrip)" : ` (${spell.level}${spell.level === 1 ? "st" : spell.level === 2 ? "nd" : spell.level === 3 ? "rd" : "th"}-level spell)`}
                    </option>
                  ))}
                </select>
                {grantedSpellLevelKeys.map((levelKey) => {
                  const ids = form.granted_spells[levelKey] ?? []
                  if (!ids.length) return null
                  const levelLabel = formatGrantedSpellLevelKey(levelKey)
                  return (
                    <div key={levelKey}>
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-2">{levelLabel}</p>
                      <div className="flex flex-wrap gap-2">
                        {ids.map((spellId) => {
                          const spell = allSpells.find((s) => s.id === spellId)
                          return (
                            <span
                              key={spellId}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm"
                            >
                              {spell?.name ?? spellId}
                              <button
                                type="button"
                                onClick={() => removeGrantedSpell(levelKey, spellId)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Origin Feat (D&D 2024) */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Origin Feat Granted (D&D 2024)
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Backgrounds grant a 1st-level Origin feat. Only Origin-category feats are listed.
            </p>
            <OriginFeatGrantedSelect
              value={form.feat_granted}
              onChange={(feat_granted) => setForm({ ...form, feat_granted })}
              originFeats={originFeats}
            />
            {originFeats.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1 italic">
                No Origin feats found. Add feats with the &quot;Origin&quot; category to populate this list.
              </p>
            )}
          </div>

          {/* Starting Equipment */}
          <StartingEquipmentGroupsEditor
            groups={form.starting_equipment_groups}
            startingGold={form.starting_gold}
            onGroupsChange={(starting_equipment_groups) =>
              setForm((prev) => ({ ...prev, starting_equipment_groups }))
            }
            onStartingGoldChange={(starting_gold) =>
              setForm((prev) => ({ ...prev, starting_gold }))
            }
          />

          <div className="bg-card border-2 border-border rounded-xl p-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Legacy flat equipment list</label>
              <p className="text-xs text-muted-foreground">Optional — used when no packages are defined above.</p>
            </div>

            {/* Add item row */}
            <div className="flex gap-2">
              <input
                type="text"
                value={equipInput}
                onChange={(e) => setEquipInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEquipmentItem())}
                placeholder="e.g. Fine Clothes"
                className="flex-1 px-4 py-2 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
              />
              <input
                type="number"
                min={1}
                value={equipQty}
                onChange={(e) => setEquipQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-3 py-2 bg-background border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary text-center"
                title="Quantity"
              />
              <button type="button" onClick={addEquipmentItem}
                className="px-3 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Item list */}
            {form.starting_equipment.length > 0 && (
              <div className="space-y-2">
                {form.starting_equipment.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 bg-background rounded-lg border border-border">
                    <span className="text-sm text-foreground">
                      <span className="font-medium">{item.quantity}x</span> {item.name}
                    </span>
                    <button type="button" onClick={() => removeEquipmentItem(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Submit */}
        </form>
      </main>
    </div>
  )
}
