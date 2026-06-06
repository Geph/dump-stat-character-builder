"use client"

import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { ClassResource, Feature, FeatureChoice, UsesConfig } from "@/lib/types"
import { RichTextEditor } from "@/components/compendium/rich-text-editor"
import { ModifierCatalogPicker } from "@/components/compendium/modifier-catalog-picker"
import { UsesConfigEditor } from "@/components/uses-config-editor"

type ClassFeatureFieldsProps = {
  feature: Feature
  index: number
  classResources: ClassResource[]
  modifierCatalog: ModifierCatalogEntry[]
  onUpdate: (index: number, patch: Partial<Feature>) => void
  onToggleChoice: (index: number, checked: boolean) => void
  onUpdateChoiceField: (index: number, field: keyof FeatureChoice, value: unknown) => void
  onAddChoiceOption: (index: number) => void
  onUpdateChoiceOption: (
    index: number,
    optionIndex: number,
    field: "name" | "description" | "modifierRefs",
    value: string | string[],
  ) => void
  onRemoveChoiceOption: (index: number, optionIndex: number) => void
  onToggleLimitedUses: (index: number, checked: boolean) => void
  onUpdateLimitedUses: (index: number, uses: UsesConfig) => void
}

export function ClassFeatureFields({
  feature,
  index,
  classResources,
  modifierCatalog,
  onUpdate,
  onToggleChoice,
  onUpdateChoiceField,
  onAddChoiceOption,
  onUpdateChoiceOption,
  onRemoveChoiceOption,
  onToggleLimitedUses,
  onUpdateLimitedUses,
}: ClassFeatureFieldsProps) {
  const activation = feature.activation ?? {}

  return (
    <>
      <RichTextEditor
        value={feature.description}
        onChange={(description) => onUpdate(index, { description })}
        placeholder="Feature description..."
      />

      <ModifierCatalogPicker
        value={feature.modifierRefs ?? []}
        onChange={(modifierRefs) => onUpdate(index, { modifierRefs })}
        catalog={modifierCatalog}
        label="Modifier effects"
        emptyMessage="No common modifiers linked — add effects from the shared catalog (e.g. Gain a General Feat)."
      />

      <div className="pt-2 border-t border-border space-y-3">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Activation timing</p>
        <p className="text-xs text-muted-foreground">
          When this feature is used in play, which action economy does it consume? Detailed effects come from linked
          modifiers above.
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
                onChange={(e) =>
                  onUpdate(index, {
                    activation: {
                      ...activation,
                      [key]: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-muted-foreground">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-border space-y-3">
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={!!feature.isChoice}
            onChange={(e) => onToggleChoice(index, e.target.checked)}
            className="w-4 h-4 rounded border-border accent-primary"
          />
          <span className="text-muted-foreground">This feature offers a choice</span>
        </label>

        {feature.isChoice && feature.choices && (
          <div className="bg-background border-2 border-primary/20 rounded-xl p-3 space-y-3 ml-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Category label</label>
                <input
                  type="text"
                  value={feature.choices.category}
                  onChange={(e) => onUpdateChoiceField(index, "category", e.target.value)}
                  placeholder="Fighting Style, Skill, etc."
                  className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Number to choose</label>
                <input
                  type="number"
                  min={1}
                  value={feature.choices.count}
                  onChange={(e) =>
                    onUpdateChoiceField(index, "count", parseInt(e.target.value, 10) || 1)
                  }
                  className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-center focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Fixed options</span>
                <button
                  type="button"
                  onClick={() => onAddChoiceOption(index)}
                  className="text-xs text-primary hover:underline"
                >
                  + Add option
                </button>
              </div>
              {feature.choices.options.map((opt, oi) => (
                <div key={oi} className="space-y-2 rounded-lg border border-border p-3 bg-card/50">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={opt.name}
                      onChange={(e) => onUpdateChoiceOption(index, oi, "name", e.target.value)}
                      placeholder="Option name"
                      className="flex-1 px-3 py-1.5 bg-card border border-border rounded-lg text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveChoiceOption(index, oi)}
                      className="text-xs text-destructive px-2"
                    >
                      Remove
                    </button>
                  </div>
                  <RichTextEditor
                    value={opt.description ?? ""}
                    onChange={(description) => onUpdateChoiceOption(index, oi, "description", description)}
                    placeholder="Description (optional)"
                    minHeightClass="min-h-[4rem]"
                  />
                  <ModifierCatalogPicker
                    value={opt.modifierRefs ?? []}
                    onChange={(modifierRefs) => onUpdateChoiceOption(index, oi, "modifierRefs", modifierRefs)}
                    catalog={modifierCatalog}
                    label="Option modifiers"
                    emptyMessage="No modifiers for this choice option."
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer text-sm pt-2 border-t border-border">
        <input
          type="checkbox"
          checked={feature.limitedUses != null}
          onChange={(e) => onToggleLimitedUses(index, e.target.checked)}
          className="w-4 h-4 rounded border-border accent-primary"
        />
        <span className="text-muted-foreground">Has limited uses</span>
      </label>

      {feature.limitedUses && (
        <div className="bg-card-lighter border-2 border-primary/30 rounded-lg p-3 ml-6">
          <UsesConfigEditor
            value={feature.limitedUses}
            onChange={(uses) => onUpdateLimitedUses(index, uses)}
            classResources={classResources}
          />
        </div>
      )}
    </>
  )
}
