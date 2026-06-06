"use client"

import { Plus, Trash2 } from "lucide-react"
import {
  MODIFIER_CATALOG_GROUPS,
  createCatalogEntryId,
  type ModifierCatalogEntry,
} from "@/lib/compendium/modifier-catalog"
import { RichTextEditor } from "@/components/compendium/rich-text-editor"
import { CharacteristicModifiersEditor } from "@/components/characteristic-modifiers-editor"
import { FeatureEffectList } from "@/components/compendium/feature-effect-list"
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

  const grouped = MODIFIER_CATALOG_GROUPS.map((group) => ({
    group,
    entries: value.filter((entry) => entry.group === group),
  })).filter((section) => section.entries.length > 0)

  const otherEntries = value.filter(
    (entry) => !MODIFIER_CATALOG_GROUPS.includes(entry.group as (typeof MODIFIER_CATALOG_GROUPS)[number]),
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Each entry defines passive characteristics and/or active effects referenced elsewhere in the compendium.
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

      {[...grouped, ...(otherEntries.length ? [{ group: "Other", entries: otherEntries }] : [])].map(
        ({ group, entries }) => (
          <div key={group} className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{group}</h3>
            {entries.map((entry) => (
              <CatalogEntryEditor
                key={entry.id}
                entry={entry}
                classResources={classResources}
                spellOptions={spellOptions}
                otherAbilities={otherAbilities}
                onChange={(patch) => updateEntry(entry.id, patch)}
                onRemove={() => removeEntry(entry.id)}
              />
            ))}
          </div>
        ),
      )}
    </div>
  )
}

function CatalogEntryEditor({
  entry,
  classResources,
  spellOptions,
  otherAbilities,
  onChange,
  onRemove,
}: {
  entry: ModifierCatalogEntry
  classResources: { id: string; name: string }[]
  spellOptions: { id: string; name: string }[]
  otherAbilities: { id: string; name: string }[]
  onChange: (patch: Partial<ModifierCatalogEntry>) => void
  onRemove: () => void
}) {
  const activation = entry.activation ?? {}
  const hasActivation = !!(activation.action || activation.bonusAction || activation.reaction)

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

      <div className="pt-2 border-t border-border space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Passive characteristics</p>
        <CharacteristicModifiersEditor
          value={entry.characteristics ?? []}
          onChange={(characteristics) => onChange({ characteristics })}
          otherAbilities={otherAbilities}
          spellOptions={spellOptions}
        />
      </div>

      <div className="pt-2 border-t border-border space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Active activation</p>
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
            onChange={(next) => onChange({ activation: next })}
          />
        )}
      </div>
    </div>
  )
}
