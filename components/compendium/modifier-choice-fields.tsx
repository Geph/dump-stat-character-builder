"use client"

import { LinkedModifiersEditor } from "@/components/compendium/linked-modifiers-editor"
import { RichTextEditor } from "@/components/compendium/rich-text-editor"
import {
  normalizeLinkedModifiers,
  type LinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { ClassResource, FeatureChoice } from "@/lib/types"

type ModifierChoiceFieldsProps = {
  isChoice: boolean
  choices?: FeatureChoice
  modifierCatalog: ModifierCatalogEntry[]
  classResources?: ClassResource[]
  spellOptions?: { id: string; name: string }[]
  toggleLabel?: string
  onToggleChoice: (checked: boolean) => void
  onUpdateChoiceField: (field: keyof FeatureChoice, value: unknown) => void
  onAddChoiceOption: () => void
  onUpdateChoiceOption: (
    optionIndex: number,
    field: "name" | "description" | "modifierRefs" | "linkedModifiers",
    value: string | string[] | LinkedModifierInstance[],
  ) => void
  onRemoveChoiceOption: (optionIndex: number) => void
}

export function ModifierChoiceFields({
  isChoice,
  choices,
  modifierCatalog,
  classResources,
  spellOptions,
  toggleLabel = "This offers a choice between modifier options",
  onToggleChoice,
  onUpdateChoiceField,
  onAddChoiceOption,
  onUpdateChoiceOption,
  onRemoveChoiceOption,
}: ModifierChoiceFieldsProps) {
  return (
    <div className="pt-2 border-t border-border space-y-3">
      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={isChoice}
          onChange={(e) => onToggleChoice(e.target.checked)}
          className="w-4 h-4 rounded border-border accent-primary"
        />
        <span className="text-muted-foreground">{toggleLabel}</span>
      </label>

      {isChoice && choices && (
        <div className="bg-background border-2 border-primary/20 rounded-xl p-3 space-y-3 ml-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Category label</label>
              <input
                type="text"
                value={choices.category}
                onChange={(e) => onUpdateChoiceField("category", e.target.value)}
                placeholder="Benefit type, fighting style, etc."
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Number to choose</label>
              <input
                type="number"
                min={1}
                value={choices.count}
                onChange={(e) =>
                  onUpdateChoiceField("count", parseInt(e.target.value, 10) || 1)
                }
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-center focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Options</span>
              <button
                type="button"
                onClick={onAddChoiceOption}
                className="text-xs text-primary hover:underline"
              >
                + Add option
              </button>
            </div>

            {choices.options.map((opt, oi) => (
              <div key={oi} className="space-y-2 rounded-lg border border-border p-3 bg-card/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={opt.name}
                    onChange={(e) => onUpdateChoiceOption(oi, "name", e.target.value)}
                    placeholder="Option name"
                    className="flex-1 px-3 py-1.5 bg-card border border-border rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveChoiceOption(oi)}
                    className="text-xs text-destructive px-2"
                  >
                    Remove
                  </button>
                </div>
                <RichTextEditor
                  value={opt.description ?? ""}
                  onChange={(description) => onUpdateChoiceOption(oi, "description", description)}
                  placeholder="Description (optional)"
                  minHeightClass="min-h-[4rem]"
                />
                <LinkedModifiersEditor
                  value={normalizeLinkedModifiers(opt.linkedModifiers, modifierCatalog, opt.modifierRefs)}
                  onChange={(next) => onUpdateChoiceOption(oi, "linkedModifiers", next)}
                  catalog={modifierCatalog}
                  classResources={classResources}
                  spellOptions={spellOptions}
                  label="Option modifiers"
                  emptyMessage="Link common modifiers for this choice option."
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
