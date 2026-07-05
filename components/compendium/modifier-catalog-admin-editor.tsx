"use client"

import { Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  createCatalogEntryId,
  catalogEditorSectionId,
  CATALOG_EDITOR_SECTION_CLASS,
  groupModifierCatalogEntries,
  MODIFIER_CATALOG_GROUPS,
  TEMPLATE_PREVIEW_SECTION_CLASS,
  type ModifierCatalogEntry,
} from "@/lib/compendium/modifier-catalog"
import { RichTextEditor } from "@/components/compendium/rich-text-editor"
import { SpecialAttackTemplateSection } from "@/components/compendium/special-attack-template-section"
import { CharacteristicModifiersEditor } from "@/components/characteristic-modifiers-editor"
import { FeatureEffectList } from "@/components/compendium/feature-effect-list"
import { collectCustomSkillNames } from "@/lib/compendium/characteristic-modifiers"
import type { FeatureActivation } from "@/lib/types"

type ModifierCatalogAdminEditorProps = {
  value: ModifierCatalogEntry[]
  onChange: (value: ModifierCatalogEntry[]) => void
  classResources?: { id: string; name: string }[]
  spellOptions?: { id: string; name: string }[]
  otherAbilities?: { id: string; name: string }[]
}

export function ModifierCatalogAdminEditor({
  value,
  onChange,
  classResources = [],
  spellOptions = [],
  otherAbilities = [],
}: ModifierCatalogAdminEditorProps) {
  const updateEntry = (id: string, patch: Partial<ModifierCatalogEntry>) => {
    onChange(value.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)))
  }

  const removeEntry = (id: string) => {
    onChange(value.filter((entry) => entry.id !== id))
  }

  const addEntry = () => {
    onChange([
      ...value,
      {
        id: createCatalogEntryId(),
        name: "New modifier",
        group: MODIFIER_CATALOG_GROUPS[0],
        summary: "",
        description: "",
        characteristics: [],
        activation: null,
      },
    ])
  }

  const sections = groupModifierCatalogEntries(value)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Each entry is a template of possible choices. Class features, traits, feats, and backgrounds link these
          entries and configure the specifics inline.
        </p>
        <button
          type="button"
          onClick={addEntry}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <Plus className="h-4 w-4" />
          Add entry
        </button>
      </div>

      {sections.map(({ group, entries }) => (
        <section
          key={group}
          id={catalogEditorSectionId(group)}
          className={cn("space-y-3", CATALOG_EDITOR_SECTION_CLASS)}
        >
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{group}</h3>
          {entries.map((entry) => (
            <CatalogEntryEditor
              key={entry.id}
              entry={entry}
              modifierCatalog={value}
              classResources={classResources}
              spellOptions={spellOptions}
              otherAbilities={otherAbilities}
              onChange={(patch) => updateEntry(entry.id, patch)}
              onRemove={() => removeEntry(entry.id)}
            />
          ))}
        </section>
      ))}
    </div>
  )
}

function CatalogEntryEditor({
  entry,
  modifierCatalog,
  classResources,
  spellOptions,
  otherAbilities,
  onChange,
  onRemove,
}: {
  entry: ModifierCatalogEntry
  modifierCatalog: ModifierCatalogEntry[]
  classResources: { id: string; name: string }[]
  spellOptions: { id: string; name: string }[]
  otherAbilities: { id: string; name: string }[]
  onChange: (patch: Partial<ModifierCatalogEntry>) => void
  onRemove: () => void
}) {
  const activation = entry.activation ?? {}
  const hasActivation = !!(activation.action || activation.bonusAction || activation.reaction)
  const extraSkillNames = collectCustomSkillNames(entry.characteristics)

  return (
    <div className="rounded-xl border-2 border-border bg-card p-4 space-y-4">
      <div className="flex gap-3 items-start">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Name</label>
            <input
              type="text"
              value={entry.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Group</label>
            <select
              value={entry.group}
              onChange={(e) => onChange({ group: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            >
              {MODIFIER_CATALOG_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-2 text-muted-foreground hover:text-destructive"
          title="Remove entry"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">Summary (dropdown hint)</label>
        <input
          type="text"
          value={entry.summary ?? ""}
          onChange={(e) => onChange({ summary: e.target.value })}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          placeholder="Short line shown in search results"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">Detailed description</label>
        <RichTextEditor
          value={entry.description ?? ""}
          onChange={(description) => onChange({ description })}
          minHeightClass="min-h-[4rem]"
        />
      </div>

      <SpecialAttackTemplateSection entry={entry} onChange={onChange} />

      <div className={cn("pt-2 border-t border-border", TEMPLATE_PREVIEW_SECTION_CLASS)}>
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
          Passive characteristics (template choices)
        </p>
        <CharacteristicModifiersEditor
          value={entry.characteristics ?? []}
          onChange={(characteristics) => onChange({ characteristics })}
          otherAbilities={otherAbilities}
          spellOptions={spellOptions}
          modifierCatalog={modifierCatalog}
          templatePreview
        />
      </div>

      <div className={cn("pt-2 border-t border-border", TEMPLATE_PREVIEW_SECTION_CLASS)}>
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
          Active activation (template choices)
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          {(
            [
              ["action", "Action"],
              ["bonusAction", "Bonus Action"],
              ["reaction", "Reaction"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!activation[key]}
                onChange={(e) => {
                  const next: FeatureActivation = { ...activation, [key]: e.target.checked }
                  if (!next.action && !next.bonusAction && !next.reaction && !next.effects?.length) {
                    onChange({ activation: null })
                  } else {
                    onChange({ activation: next })
                  }
                }}
                className="accent-primary"
              />
              <span className="text-muted-foreground">{label}</span>
            </label>
          ))}
        </div>

        {hasActivation && (
          <FeatureEffectList
            activation={activation}
            classResources={classResources.map((r) => ({
              id: r.id,
              name: r.name,
              uses: { type: "unlimited" as const },
            }))}
            otherAbilities={otherAbilities}
            extraSkillNames={extraSkillNames}
            onChange={(next) => onChange({ activation: next })}
            templatePreview
          />
        )}
      </div>
    </div>
  )
}
