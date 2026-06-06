"use client"

import { FEAT_PICK_CATEGORIES } from "@/lib/compendium/class-feature-metadata"
import type { ClassResource, Feature, FeatureChoice, UsesConfig } from "@/lib/types"
import { RichTextEditor } from "@/components/compendium/rich-text-editor"
import { FeatureEffectList } from "@/components/compendium/feature-effect-list"
import { UsesConfigEditor } from "@/components/uses-config-editor"

type ClassFeatureFieldsProps = {
  feature: Feature
  index: number
  classResources: ClassResource[]
  onUpdate: (index: number, patch: Partial<Feature>) => void
  onToggleChoice: (index: number, checked: boolean) => void
  onUpdateChoiceField: (index: number, field: keyof FeatureChoice, value: unknown) => void
  onSetChoiceKind: (index: number, kind: "options" | "feats") => void
  onAddChoiceOption: (index: number) => void
  onUpdateChoiceOption: (
    index: number,
    optionIndex: number,
    field: "name" | "description",
    value: string,
  ) => void
  onRemoveChoiceOption: (index: number, optionIndex: number) => void
  onToggleLimitedUses: (index: number, checked: boolean) => void
  onUpdateLimitedUses: (index: number, uses: UsesConfig) => void
}

export function ClassFeatureFields({
  feature,
  index,
  classResources,
  onUpdate,
  onToggleChoice,
  onUpdateChoiceField,
  onSetChoiceKind,
  onAddChoiceOption,
  onUpdateChoiceOption,
  onRemoveChoiceOption,
  onToggleLimitedUses,
  onUpdateLimitedUses,
}: ClassFeatureFieldsProps) {
  const choiceKind = feature.choices?.kind ?? "options"
  const activation = feature.activation ?? {}
  const hasActivation = !!(activation.action || activation.bonusAction || activation.reaction)

  return (
    <>
      <RichTextEditor
        value={feature.description}
        onChange={(description) => onUpdate(index, { description })}
        placeholder="Feature description..."
      />

      <div className="pt-2 border-t border-border space-y-3">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Activation</p>
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

        {hasActivation && (
          <FeatureEffectList
            activation={activation}
            classResources={classResources}
            onChange={(next) => onUpdate(index, { activation: next })}
          />
        )}
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
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Choice type</label>
              <select
                value={choiceKind}
                onChange={(e) => onSetChoiceKind(index, e.target.value as "options" | "feats")}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
              >
                <option value="options">Fixed options (fighting style, skills, etc.)</option>
                <option value="feats">Feat picker (General, Epic Boon, etc.)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Category label</label>
                <input
                  type="text"
                  value={feature.choices.category}
                  onChange={(e) => onUpdateChoiceField(index, "category", e.target.value)}
                  placeholder={choiceKind === "feats" ? "General Feat" : "Fighting Style"}
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

            {choiceKind === "feats" ? (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Feat categories</label>
                <div className="flex flex-wrap gap-2">
                  {FEAT_PICK_CATEGORIES.map((category) => {
                    const selected = feature.choices?.featCategories?.includes(category) ?? false
                    return (
                      <label
                        key={category}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-card text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            const current = feature.choices?.featCategories ?? []
                            const next = e.target.checked
                              ? [...current, category]
                              : current.filter((entry) => entry !== category)
                            onUpdateChoiceField(index, "featCategories", next)
                          }}
                          className="accent-primary"
                        />
                        {category}
                      </label>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Options</span>
                  <button
                    type="button"
                    onClick={() => onAddChoiceOption(index)}
                    className="text-xs text-primary hover:underline"
                  >
                    + Add option
                  </button>
                </div>
                {feature.choices.options.map((opt, oi) => (
                  <div key={oi} className="space-y-2">
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
                  </div>
                ))}
              </div>
            )}
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
          />
        </div>
      )}
    </>
  )
}
