"use client"

import { LinkedModifiersEditor } from "@/components/compendium/linked-modifiers-editor"
import {
  createModifierInstanceId,
  type LinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"
import type { NestedModifierEffect } from "@/lib/compendium/characteristic-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { ClassResource } from "@/lib/types"

const TRIGGER_CATALOG_IDS = new Set([
  "cat_char_saving_throw_trigger",
  "cat_char_on_hit_trigger",
  "cat_char_failed_roll_trigger",
  "cat_char_on_cast_spell_trigger",
])

export function nestedEffectToInstances(effect: NestedModifierEffect | null | undefined): LinkedModifierInstance[] {
  if (!effect?.catalogRefId) return []
  return [
    {
      instanceId: effect.instanceId ?? createModifierInstanceId(),
      catalogRefId: effect.catalogRefId,
      characteristics: effect.characteristics,
      activation: effect.activation,
    },
  ]
}

export function instancesToNestedEffect(instances: LinkedModifierInstance[]): NestedModifierEffect | null {
  const first = instances[0]
  if (!first) return null
  return {
    catalogRefId: first.catalogRefId,
    instanceId: first.instanceId,
    characteristics: first.characteristics,
    activation: first.activation,
  }
}

type NestedModifierEffectEditorProps = {
  value: NestedModifierEffect | null | undefined
  onChange: (value: NestedModifierEffect | null) => void
  modifierCatalog: ModifierCatalogEntry[]
  classResources?: ClassResource[]
  label?: string
  placeholder?: string
  emptyMessage?: string
}

export function NestedModifierEffectEditor({
  value,
  onChange,
  modifierCatalog,
  classResources = [],
  label = "Effect (common modifier)",
  placeholder = "Add effect modifier…",
  emptyMessage = "Choose which common modifier effect fires on this trigger.",
}: NestedModifierEffectEditorProps) {
  const filteredCatalog = modifierCatalog.filter((entry) => !TRIGGER_CATALOG_IDS.has(entry.id))

  if (filteredCatalog.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Link this modifier from a feature to pick an effect from the common modifiers catalog.
      </p>
    )
  }

  return (
    <LinkedModifiersEditor
      value={nestedEffectToInstances(value)}
      onChange={(instances) => onChange(instancesToNestedEffect(instances.slice(0, 1)))}
      catalog={filteredCatalog}
      classResources={classResources}
      label={label}
      placeholder={placeholder}
      emptyMessage={emptyMessage}
    />
  )
}
