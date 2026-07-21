"use client"

import type { ReactNode } from "react"
import { Plus, X } from "lucide-react"
import { ACTIVATION_REQUIREMENT_OPTIONS } from "@/lib/compendium/activation-requirements"
import { SRD_CONDITIONS } from "@/lib/srd/condition-descriptions"
import { ABILITY_CHECK_OPTIONS } from "@/lib/compendium/class-feature-metadata"
import type { Feature, FeatureActivation, FeatureActivationRequirement, FeatureSheetDisplay } from "@/lib/types"
import { FeatureSheetDisplayEditor } from "@/components/compendium/feature-sheet-display-editor"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

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
  /** When set, renders sheet visibility controls in this section. */
  feature?: Feature
  onSheetDisplayChange?: (sheetDisplay: FeatureSheetDisplay) => void
  /**
   * When true, automatic triggers / usage rules / requirements / resource spend
   * are nested under a collapsed accordion. Action economy + sheet display stay visible.
   */
  advancedCollapsed?: boolean
  /** Extra fields rendered inside the advanced accordion (e.g. duration, limited uses). */
  advancedExtra?: ReactNode
}

function newRequirement(): FeatureActivationRequirement {
  return { kind: "drop_to_zero_hp" }
}

const ACTION_ECONOMY_OPTIONS = [
  ["action", "Action"],
  ["bonusAction", "Bonus Action"],
  ["reaction", "Reaction"],
] as const satisfies ReadonlyArray<readonly [keyof FeatureActivation, string]>

const TRIGGER_OPTIONS = [
  ["onInitiative", "When you roll initiative"],
  ["onDropToZeroHp", "When you drop to 0 Hit Points"],
  ["onFailedSave", "When you fail a saving throw"],
  ["onSuccessfulSave", "When you succeed on a saving throw"],
] as const satisfies ReadonlyArray<readonly [keyof FeatureActivation, string]>

function ActivationCheckboxGroup({
  title,
  children,
  disabled = false,
}: {
  title: string
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-muted/20 p-3 space-y-2 ${disabled ? "opacity-50" : ""}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  )
}

function ActivationCheckbox({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer text-sm min-w-0">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 shrink-0 rounded border-border accent-primary"
      />
      <span className="text-muted-foreground leading-snug">{label}</span>
    </label>
  )
}

export function ActivationEditor({
  activation,
  onChange,
  description = "When this feature is used in play, which action economy does it consume? All linked modifier effects share this activation.",
  siblingFeatures = [],
  feature,
  onSheetDisplayChange,
  advancedCollapsed = false,
  advancedExtra,
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

  const advancedFields = (
    <>
      <ActivationCheckboxGroup title="Automatic triggers" disabled={inheritActivation}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          {TRIGGER_OPTIONS.map(([key, label]) => (
            <ActivationCheckbox
              key={key}
              checked={!!activation[key]}
              disabled={inheritActivation}
              label={label}
              onChange={(checked) => onChange({ ...activation, [key]: checked })}
            />
          ))}
        </div>
      </ActivationCheckboxGroup>

      <ActivationCheckboxGroup title="Usage rules">
        <div className="space-y-2">
          <ActivationCheckbox
            checked={inheritActivation}
            label="Uses activation from an existing class feature"
            onChange={(checked) =>
              onChange({
                ...activation,
                usesExistingClassFeature: checked,
                existingClassFeatureName: checked
                  ? (activation.existingClassFeatureName ?? siblingFeatures[0]?.name ?? null)
                  : null,
              })
            }
          />

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

          <ActivationCheckbox
            checked={!!activation.oncePerTurn}
            disabled={inheritActivation}
            label="Once per turn"
            onChange={(checked) => onChange({ ...activation, oncePerTurn: checked })}
          />
        </div>
      </ActivationCheckboxGroup>

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

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">
          Hit Dice to spend (activation)
        </label>
        <input
          type="number"
          min={0}
          value={activation.spendHitDice ?? ""}
          onChange={(e) =>
            onChange({
              ...activation,
              spendHitDice: e.target.value ? parseInt(e.target.value, 10) : null,
            })
          }
          placeholder="e.g. 1 for Draconic Vengeance"
          className="w-full max-w-xs px-3 py-2 bg-background border border-border rounded-lg text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Spends from the sheet Hit Dice tracker (separate from class resource pools).
        </p>
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

      {advancedExtra}
    </>
  )

  return (
    <div className="pt-2 border-t border-border space-y-4">
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Activation</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>

      <ActivationCheckboxGroup title="Action economy" disabled={inheritActivation}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2">
          {ACTION_ECONOMY_OPTIONS.map(([key, label]) => (
            <ActivationCheckbox
              key={key}
              checked={!!activation[key]}
              disabled={inheritActivation}
              label={label}
              onChange={(checked) => onChange({ ...activation, [key]: checked })}
            />
          ))}
        </div>
      </ActivationCheckboxGroup>

      {feature && onSheetDisplayChange ? (
        <FeatureSheetDisplayEditor feature={feature} onChange={onSheetDisplayChange} />
      ) : null}

      {advancedCollapsed ? (
        <Accordion type="single" collapsible className="rounded-lg border border-border px-3">
          <AccordionItem value="advanced" className="border-0">
            <AccordionTrigger className="py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
              Triggers, usage, duration &amp; requirements
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-3">{advancedFields}</AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        advancedFields
      )}
    </div>
  )
}
