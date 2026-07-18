"use client"

import { MultiSelectChoices } from "@/components/builder/multi-select-choices"
import {
  resolveFeatureChoiceOptions,
  type ResolveFeatureChoiceOptionsParams,
} from "@/lib/builder/aggregate-psionic-talents"
import type { FeatSelectionEntry } from "@/lib/builder/feat-choices"
import type { Feat } from "@/lib/types"

type FeatModifierChoicePickerProps = {
  entry: FeatSelectionEntry
  feat: Feat
  selected: string[]
  onChange: (selected: string[]) => void
  accentClass?: string
  layout?: "default" | "compact"
  /** Required when the feat uses choices.optionsSource (disciplines, talents, upgrades). */
  choiceOptionContext?: ResolveFeatureChoiceOptionsParams
}

export function FeatModifierChoicePicker({
  entry,
  feat,
  selected,
  onChange,
  accentClass = "border-primary bg-primary/10",
  layout = "default",
  choiceOptionContext,
}: FeatModifierChoicePickerProps) {
  const staticOptions = feat.choices?.options ?? []
  const resolvedOptions =
    feat.choices?.optionsSource && choiceOptionContext
      ? resolveFeatureChoiceOptions(
          { ...feat, level: feat.level_requirement ?? 1 } as import("@/lib/types").Feature,
          choiceOptionContext,
        )
      : staticOptions.map((option) => ({
          name: option.name,
          description: option.description,
        }))

  if (!feat.choices || (!resolvedOptions.length && !feat.choices.optionsSource)) return null
  if (feat.choices.optionsSource && !resolvedOptions.length) {
    return (
      <p className="text-xs text-muted-foreground mt-2">
        {feat.choices.optionsSource === "known_discipline_talents"
          ? "No talents available yet — gain a psionic discipline first."
          : feat.choices.optionsSource === "class_disciplines"
            ? "No discipline packages found in the custom ability library."
            : feat.choices.optionsSource === "class_upgrades"
              ? "No upgrades found in the custom ability library."
              : "No options available for this feat yet."}
      </p>
    )
  }
  if (!resolvedOptions.length) return null

  return (
    <MultiSelectChoices
      title={`${feat.name}: ${feat.choices.category || "Choose a benefit"}`}
      hint={`Choose ${feat.choices.count}`}
      options={resolvedOptions.map((option) => ({
        name: option.name,
        description: option.description,
      }))}
      maxCount={feat.choices.count}
      selected={selected}
      onChange={onChange}
      accentClass={accentClass}
      layout={layout}
    />
  )
}
