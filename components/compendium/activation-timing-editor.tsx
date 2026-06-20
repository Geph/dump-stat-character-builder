"use client"

import { Plus, X } from "lucide-react"
import { ACTIVATION_REQUIREMENT_OPTIONS } from "@/lib/compendium/activation-requirements"
import { SRD_CONDITIONS } from "@/lib/srd/condition-descriptions"
import { ABILITY_CHECK_OPTIONS } from "@/lib/compendium/class-feature-metadata"
import type { FeatureActivation, FeatureActivationRequirement } from "@/lib/types"

export type SiblingClassFeatureOption = {
  name: string
  level: number
}

type ActivationEditorProps = {
  activation: FeatureActivation
  onChange: (activation: FeatureActivation) => void
  description?: string
  /** Other features on the same class/subclass (for "existing class feature" activation). */
  siblingFeatures?: SiblingClassFeatureOption[]
}

function newRequirement(): FeatureActivationRequirement {
  return { kind: "drop_to_zero_hp" }
}

export function ActivationEditor({
  activation,
  onChange,
  description = "When this feature is used in play, which action economy does it consume? All linked modifier effects share this activation.",
  siblingFeatures = [],
}: ActivationEditorProps) {
  const requirements = activation.requirements ?? []
  const inheritActivation = Boolean(activation.usesExistingClassFeature)

  const setRequirements = (next: FeatureActivationRequirement[]) => {
    onChange({ ...activation, requirements: next.length > 0 ? next : undefined })
  }

  const updateRequirement = (index: number, patch: Partial<FeatureActivationRequirement>) => {
    const next = [...requirements]
    next[index] = { ...next[index], ...patch } as FeatureActivationRequirement
    setRequirements(next)
  }

  return (
    <div className="pt-2 border-t border-border space-y-4">
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Activation</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        {(
          [
            ["action", "Action"],
            ["bonusAction", "Bonus Action"],
            ["reaction", "Reaction"],
            ["onInitiative", "When you roll initiative"],
            ["onDropToZeroHp", "When you drop to 0 Hit Points"],
            ["onFailedSave", "When you fail a saving throw"],
            ["onSuccessfulSave", "When you succeed on a saving throw"],
          ] as const
        ).map(([key, label]) => (
          <label
            key={key}
            className={`flex items-center gap-2 cursor-pointer ${inheritActivation ? "opacity-50" : ""}`}
          >
            <input
              type="checkbox"
              checked={!!activation[key]}
              disabled={inheritActivation}
              onChange={(e) =>
                onChange({
                  ...activation,
                  [key]: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-border accent-primary"
            />
            <span className="text-muted-foreground">{label}</span>
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={inheritActivation}
            onChange={(e) =>
              onChange({
                ...activation,
                usesExistingClassFeature: e.target.checked,
                existingClassFeatureName: e.target.checked
                  ? (activation.existingClassFeatureName ?? siblingFeatures[0]?.name ?? null)
                  : null,
              })
            }
            className="w-4 h-4 rounded border-border accent-primary"
          />
          <span className="text-muted-foreground">Uses activation from an existing class feature</span>
        </label>

        {inheritActivation && (
          <div className="ml-6 space-y-1">
            {siblingFeatures.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Add other class features to this class to select one here.
              </p>
            ) : (
              <>
                <label className="block text-xs font-semibold text-foreground">Class feature</label>
                <select
                  value={activation.existingClassFeatureName ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...activation,
                      existingClassFeatureName: e.target.value || null,
                    })
                  }
                  className="w-full max-w-md px-3 py-2 bg-background border border-border rounded-lg text-sm"
                >
                  <option value="">Select feature…</option>
                  {siblingFeatures.map((feat) => (
                    <option key={`${feat.level}-${feat.name}`} value={feat.name}>
                      Level {feat.level}: {feat.name}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className={`flex items-center gap-2 cursor-pointer ${inheritActivation ? "opacity-50" : ""}`}>
          <input
            type="checkbox"
            checked={!!activation.oncePerTurn}
            disabled={inheritActivation}
            onChange={(e) => onChange({ ...activation, oncePerTurn: e.target.checked })}
            className="w-4 h-4 rounded border-border accent-primary"
          />
          <span className="text-muted-foreground">Once per turn</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Spend class resource (key)</label>
          <input
            type="text"
            value={activation.spendClassResourceKey ?? ""}
            onChange={(e) =>
              onChange({ ...activation, spendClassResourceKey: e.target.value || null })
            }
            placeholder="e.g. bardic_inspiration, focus_points"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Amount to spend</label>
          <input
            type="number"
            min={0}
            value={activation.spendClassResourceAmount ?? ""}
            onChange={(e) =>
              onChange({
                ...activation,
                spendClassResourceAmount: e.target.value ? parseInt(e.target.value, 10) : null,
              })
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">Requirements</label>
          <button
            type="button"
            onClick={() => setRequirements([...requirements, newRequirement()])}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="h-3 w-3" />
            Add requirement
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Optional triggers or conditions (e.g. while raging, if you drop to 0 HP).
        </p>

        {requirements.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No requirements set.</p>
        )}

        {requirements.map((req, index) => {
          const meta = ACTIVATION_REQUIREMENT_OPTIONS.find((opt) => opt.value === req.kind)
          return (
            <div
              key={index}
              className="flex flex-wrap items-start gap-2 rounded-lg border border-border bg-card/50 p-3"
            >
              <select
                value={req.kind}
                onChange={(e) => {
                  const kind = e.target.value as FeatureActivationRequirement["kind"]
                  const base = ACTIVATION_REQUIREMENT_OPTIONS.find((opt) => opt.value === kind)
                  let next: FeatureActivationRequirement = { kind } as FeatureActivationRequirement
                  if (kind === "while_condition") next = { kind, condition: "" }
                  if (kind === "make_saving_throw" || kind === "fail_saving_throw") {
                    next = { kind, ability: null }
                  }
                  if (kind === "custom") next = { kind, text: "" }
                  if (!base) next = { kind: "drop_to_zero_hp" }
                  updateRequirement(index, next)
                }}
                className="flex-1 min-w-[200px] px-3 py-2 bg-background border border-border rounded-lg text-sm"
              >
                {ACTIVATION_REQUIREMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {meta?.needsAbility && (
                <select
                  value={
                    (req.kind === "make_saving_throw" || req.kind === "fail_saving_throw"
                      ? req.ability
                      : "") ?? ""
                  }
                  onChange={(e) => updateRequirement(index, { ability: e.target.value || null })}
                  className="min-w-[140px] px-3 py-2 bg-background border border-border rounded-lg text-sm"
                >
                  <option value="">Any ability</option>
                  {ABILITY_CHECK_OPTIONS.map((ability) => (
                    <option key={ability} value={ability}>
                      {ability}
                    </option>
                  ))}
                </select>
              )}

              {meta?.needsCondition && req.kind === "while_condition" && (
                <select
                  value={req.condition ?? ""}
                  onChange={(e) => updateRequirement(index, { condition: e.target.value })}
                  className="min-w-[140px] px-3 py-2 bg-background border border-border rounded-lg text-sm"
                >
                  <option value="">Select condition...</option>
                  {SRD_CONDITIONS.map((condition) => (
                    <option key={condition.name} value={condition.name}>
                      {condition.name}
                    </option>
                  ))}
                </select>
              )}

              {meta?.needsText && req.kind === "custom" && (
                <input
                  type="text"
                  value={req.text ?? ""}
                  onChange={(e) => updateRequirement(index, { text: e.target.value })}
                  placeholder="e.g. While you have no Second Wind uses"
                  className="flex-1 min-w-[200px] px-3 py-2 bg-background border border-border rounded-lg text-sm"
                />
              )}

              <button
                type="button"
                onClick={() => setRequirements(requirements.filter((_, i) => i !== index))}
                className="p-2 text-muted-foreground hover:text-destructive"
                title="Remove requirement"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** @deprecated Use ActivationEditor */
export const ActivationTimingEditor = ActivationEditor
