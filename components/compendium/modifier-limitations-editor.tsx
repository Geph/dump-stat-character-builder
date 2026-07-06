"use client"

import { Plus, Trash2 } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  ARMOR_LIMITATION_OPTIONS,
  createModifierLimitation,
  LIMITATION_RULE_LABELS,
  summarizeLimitations,
  type LimitationSource,
  type ModifierLimitation,
  type ModifierLimitationKind,
} from "@/lib/compendium/modifier-limitations"
import { EDITOR_SHEET_TOGGLE_OPTIONS } from "@/lib/compendium/sheet-toggle-registry"
import { SRD_CONDITIONS } from "@/lib/srd/condition-descriptions"

type ModifierLimitationsEditorProps = {
  value: LimitationSource
  onChange: (patch: Partial<LimitationSource>) => void
}

const KIND_OPTIONS: { value: ModifierLimitationKind; label: string }[] = [
  { value: "condition", label: "Condition" },
  { value: "armor_type", label: "Armor / shield" },
  { value: "sheet_toggle", label: "Sheet toggle" },
  { value: "hp_threshold", label: "HP threshold" },
]

function defaultValueForKind(kind: ModifierLimitationKind): string {
  switch (kind) {
    case "condition":
      return SRD_CONDITIONS[0]?.name ?? "Incapacitated"
    case "armor_type":
      return ARMOR_LIMITATION_OPTIONS[0].value
    case "sheet_toggle":
      return EDITOR_SHEET_TOGGLE_OPTIONS[0]?.id ?? "while_raging"
    case "hp_threshold":
      return "0"
  }
}

function defaultRuleForKind(kind: ModifierLimitationKind) {
  return LIMITATION_RULE_LABELS[kind]?.[0]?.value ?? "blocked_when_has"
}

function updateLimitations(
  value: LimitationSource,
  onChange: (patch: Partial<LimitationSource>) => void,
  next: ModifierLimitation[],
) {
  onChange({
    limitations: next,
    disabledWhenConditions: undefined,
    requiresSheetToggle: undefined,
  })
}

export function ModifierLimitationsEditor({ value, onChange }: ModifierLimitationsEditorProps) {
  const limitations = value.limitations ?? []
  const summary = summarizeLimitations(value)

  const addLimitation = () => {
    const kind: ModifierLimitationKind = "condition"
    updateLimitations(value, onChange, [
      ...limitations,
      createModifierLimitation({
        kind,
        rule: defaultRuleForKind(kind),
        value: defaultValueForKind(kind),
      }),
    ])
  }

  const patchLimitation = (id: string, patch: Partial<ModifierLimitation>) => {
    updateLimitations(
      value,
      onChange,
      limitations.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    )
  }

  const removeLimitation = (id: string) => {
    updateLimitations(
      value,
      onChange,
      limitations.filter((entry) => entry.id !== id),
    )
  }

  return (
    <Accordion type="single" collapsible className="rounded-lg border border-border bg-card/40">
      <AccordionItem value="limitations" className="border-none">
        <AccordionTrigger className="px-3 py-2 text-xs font-semibold hover:no-underline">
          <span>
            Limitations
            {summary ? (
              <span className="ml-2 font-normal text-muted-foreground">({summary})</span>
            ) : null}
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-3 pb-3">
          <p className="text-[11px] text-muted-foreground mb-2">
            All listed limitations must pass for this modifier to apply on the character sheet
            (e.g. Fast Movement while not wearing Heavy armor; Danger Sense unless Incapacitated).
          </p>
          <div className="space-y-2">
            {limitations.map((limitation) => (
              <div
                key={limitation.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-2"
              >
                <select
                  value={limitation.kind}
                  onChange={(e) => {
                    const kind = e.target.value as ModifierLimitationKind
                    patchLimitation(limitation.id, {
                      kind,
                      rule: defaultRuleForKind(kind),
                      value: defaultValueForKind(kind),
                    })
                  }}
                  className="px-2 py-1 bg-card border border-border rounded text-xs"
                >
                  {KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={limitation.rule}
                  onChange={(e) =>
                    patchLimitation(limitation.id, {
                      rule: e.target.value as ModifierLimitation["rule"],
                    })
                  }
                  className="px-2 py-1 bg-card border border-border rounded text-xs"
                >
                  {(LIMITATION_RULE_LABELS[limitation.kind] ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {limitation.kind === "condition" ? (
                  <select
                    value={limitation.value}
                    onChange={(e) => patchLimitation(limitation.id, { value: e.target.value })}
                    className="min-w-[140px] flex-1 px-2 py-1 bg-card border border-border rounded text-xs"
                  >
                    {SRD_CONDITIONS.map((condition) => (
                      <option key={condition.name} value={condition.name}>
                        {condition.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                {limitation.kind === "armor_type" ? (
                  <select
                    value={limitation.value}
                    onChange={(e) => patchLimitation(limitation.id, { value: e.target.value })}
                    className="min-w-[140px] flex-1 px-2 py-1 bg-card border border-border rounded text-xs"
                  >
                    {ARMOR_LIMITATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                {limitation.kind === "sheet_toggle" ? (
                  <select
                    value={limitation.value}
                    onChange={(e) => patchLimitation(limitation.id, { value: e.target.value })}
                    className="min-w-[140px] flex-1 px-2 py-1 bg-card border border-border rounded text-xs"
                  >
                    {EDITOR_SHEET_TOGGLE_OPTIONS.map((toggle) => (
                      <option key={toggle.id} value={toggle.id}>
                        {toggle.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                {limitation.kind === "hp_threshold" ? (
                  <input
                    type="number"
                    min={0}
                    value={limitation.value}
                    onChange={(e) => patchLimitation(limitation.id, { value: e.target.value })}
                    className="w-20 px-2 py-1 bg-card border border-border rounded text-xs tabular-nums"
                    aria-label="HP threshold"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => removeLimitation(limitation.id)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                  aria-label="Remove limitation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLimitation}
            className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Add limitation
          </button>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
