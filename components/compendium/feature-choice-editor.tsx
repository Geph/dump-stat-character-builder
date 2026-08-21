"use client"

import { X } from "lucide-react"
import { LinkedModifiersEditor } from "@/components/compendium/linked-modifiers-editor"
import { RichTextEditor } from "@/components/compendium/rich-text-editor"
import {
  normalizeLinkedModifiers,
  syncModifierRefs,
  type LinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { ClassResource, FeatureChoice } from "@/lib/types"

const OPTIONS_SOURCE_OPTIONS: { value: NonNullable<FeatureChoice["optionsSource"]> | ""; label: string }[] = [
  { value: "", label: "Fixed options below" },
  { value: "class_bomb_formulas", label: "Class bomb formulas (custom abilities)" },
  { value: "class_discoveries", label: "Class discoveries (custom abilities)" },
  { value: "class_knacks", label: "Class knacks / tricks / exploits" },
  { value: "class_upgrades", label: "Class upgrades" },
  { value: "class_disciplines", label: "Class disciplines" },
  { value: "class_talents", label: "Class talents" },
  { value: "known_discipline_talents", label: "Talents from known disciplines" },
  { value: "fusion_talents", label: "Fusion talents" },
]

type FeatureChoiceEditorProps = {
  choices: FeatureChoice
  classResources: ClassResource[]
  modifierCatalog: ModifierCatalogEntry[]
  spellOptions?: { id: string; name: string }[]
  onChangeField: (field: keyof FeatureChoice, value: unknown) => void
  onAddOption: () => void
  onUpdateOption: (
    optionIndex: number,
    field: "name" | "description" | "modifierRefs" | "linkedModifiers",
    value: string | string[] | LinkedModifierInstance[],
  ) => void
  onRemoveOption: (optionIndex: number) => void
}

export function FeatureChoiceEditor({
  choices,
  classResources,
  modifierCatalog,
  spellOptions,
  onChangeField,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}: FeatureChoiceEditorProps) {
  const librarySource = choices.optionsSource
  const countTable = choices.choiceCountByLevel ?? []

  return (
    <div className="bg-background border-2 border-primary/20 rounded-xl p-3 space-y-3 ml-6">
      <p className="text-xs text-muted-foreground">
        Pick a library of custom abilities (Bomb Formulas, Discoveries, knacks) with a level-scaled
        count, or list fixed options below. Library picks are not spendable class resources.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Category label</label>
          <input
            type="text"
            value={choices.category}
            onChange={(e) => onChangeField("category", e.target.value)}
            placeholder="Fighting Style, Skill, etc."
            className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Number to choose (fallback)
          </label>
          <input
            type="number"
            min={1}
            value={choices.count}
            onChange={(e) => onChangeField("count", parseInt(e.target.value, 10) || 1)}
            className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-center focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">Options source</label>
        <select
          value={librarySource ?? ""}
          onChange={(e) =>
            onChangeField("optionsSource", e.target.value === "" ? null : e.target.value)
          }
          className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-sm"
        >
          {OPTIONS_SOURCE_OPTIONS.map((option) => (
            <option key={option.value || "fixed"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {librarySource ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Builder lists matching custom abilities. Tag formula rows as bomb formula and
            discoveries as discovery — they do not need to be duplicated as fixed options.
          </p>
        ) : null}
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">
          Choice count resource (optional)
        </label>
        <select
          value={choices.resourceKey ?? ""}
          onChange={(e) => onChangeField("resourceKey", e.target.value || null)}
          className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-sm"
        >
          <option value="">None — use the table or fallback count</option>
          {classResources.map((resource) => (
            <option key={resource.id} value={resource.id}>
              {resource.name} ({resource.id})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">Choices by class level</span>
          <button
            type="button"
            onClick={() => {
              const nextLevel =
                countTable.length > 0 ? Math.min(20, Math.max(...countTable.map((row) => row.level)) + 1) : 1
              const nextCount = countTable[countTable.length - 1]?.count ?? choices.count ?? 1
              onChangeField("choiceCountByLevel", [
                ...countTable,
                { level: nextLevel, count: nextCount },
              ])
            }}
            className="text-xs text-primary hover:underline"
          >
            + Add tier
          </button>
        </div>
        {countTable.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Optional. Use this for table columns like Bomb Formulae or Discoveries Known.
          </p>
        ) : (
          <div className="space-y-2">
            {countTable.map((row, index) => (
              <div key={`${row.level}-${index}`} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">At level</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={row.level}
                  onChange={(e) => {
                    const next = [...countTable]
                    next[index] = { ...row, level: parseInt(e.target.value, 10) || 1 }
                    onChangeField("choiceCountByLevel", next)
                  }}
                  className="w-16 px-2 py-1 bg-card border border-border rounded-lg text-sm text-center"
                />
                <span className="text-xs text-muted-foreground">known</span>
                <input
                  type="number"
                  min={0}
                  value={row.count}
                  onChange={(e) => {
                    const next = [...countTable]
                    next[index] = { ...row, count: parseInt(e.target.value, 10) || 0 }
                    onChangeField("choiceCountByLevel", next)
                  }}
                  className="w-16 px-2 py-1 bg-card border border-border rounded-lg text-sm text-center"
                />
                <button
                  type="button"
                  onClick={() =>
                    onChangeField(
                      "choiceCountByLevel",
                      countTable.filter((_, rowIndex) => rowIndex !== index),
                    )
                  }
                  className="text-destructive"
                  aria-label="Remove tier"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <input
            type="checkbox"
            checked={!!choices.swappableOnRest}
            onChange={(e) => onChangeField("swappableOnRest", e.target.checked)}
          />
          Swappable when finishing a rest
        </label>
        {choices.swappableOnRest && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Swap on a
            <select
              value={choices.swapRestType ?? "long"}
              onChange={(e) => onChangeField("swapRestType", e.target.value)}
              className="px-2 py-1 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="long">Long Rest</option>
              <option value="short">Short Rest</option>
            </select>
          </label>
        )}
        <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <input
            type="checkbox"
            checked={!!choices.swappableOnLevelUp}
            onChange={(e) => onChangeField("swappableOnLevelUp", e.target.checked)}
          />
          Swappable on level-up
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            {librarySource ? "Extra fixed options (optional)" : "Fixed options"}
          </span>
          <button type="button" onClick={onAddOption} className="text-xs text-primary hover:underline">
            + Add option
          </button>
        </div>
        {(choices.options ?? []).map((opt, oi) => (
          <div key={oi} className="space-y-2 rounded-lg border border-border p-3 bg-card/50">
            <div className="flex gap-2">
              <input
                type="text"
                value={opt.name}
                onChange={(e) => onUpdateOption(oi, "name", e.target.value)}
                placeholder="Option name"
                className="flex-1 px-3 py-1.5 bg-card border border-border rounded-lg text-sm"
              />
              <button
                type="button"
                onClick={() => onRemoveOption(oi)}
                className="text-xs text-destructive px-2"
              >
                Remove
              </button>
            </div>
            <RichTextEditor
              value={opt.description ?? ""}
              onChange={(description) => onUpdateOption(oi, "description", description)}
              placeholder="Description (optional)"
              minHeightClass="min-h-[4rem]"
            />
            <LinkedModifiersEditor
              value={normalizeLinkedModifiers(opt.linkedModifiers, modifierCatalog, opt.modifierRefs)}
              onChange={(next) => onUpdateOption(oi, "linkedModifiers", next)}
              catalog={modifierCatalog}
              classResources={classResources}
              spellOptions={spellOptions}
              label="Option modifiers"
              emptyMessage="No modifiers for this choice option."
            />
          </div>
        ))}
      </div>
    </div>
  )
}
