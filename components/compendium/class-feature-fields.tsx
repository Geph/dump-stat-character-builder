"use client"



import {

  normalizeLinkedModifiers,

  syncModifierRefs,

  syncFeatureActivationTiming,

  type LinkedModifierInstance,

} from "@/lib/compendium/linked-modifiers"

import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"

import type { ClassResource, Feature, FeatureChoice, UsesConfig } from "@/lib/types"

import { RichTextEditor } from "@/components/compendium/rich-text-editor"

import { LinkedModifiersEditor } from "@/components/compendium/linked-modifiers-editor"

import { ActivationEditor, type SiblingClassFeatureOption } from "@/components/compendium/activation-timing-editor"

import { DurationEditor } from "@/components/compendium/duration-editor"

import { UsesConfigEditor } from "@/components/uses-config-editor"

import { FeatureChoiceEditor } from "@/components/compendium/feature-choice-editor"



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

    field: "name" | "description" | "modifierRefs" | "linkedModifiers",

    value: string | string[] | LinkedModifierInstance[],

  ) => void

  onRemoveChoiceOption: (index: number, optionIndex: number) => void

  onToggleLimitedUses: (index: number, checked: boolean) => void

  onUpdateLimitedUses: (index: number, uses: UsesConfig) => void

  /** Other features on the same class/subclass for inherited activation. */
  siblingFeatures?: SiblingClassFeatureOption[]

  /** Spell list used to populate fixed-spell pickers in linked modifiers. */
  spellOptions?: { id: string; name: string }[]

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

  siblingFeatures = [],

  spellOptions = [],

}: ClassFeatureFieldsProps) {

  const activation = feature.activation ?? {}

  const linkedModifiers = normalizeLinkedModifiers(

    feature.linkedModifiers,

    modifierCatalog,

    feature.modifierRefs,

  )



  return (

    <>

      <RichTextEditor

        value={feature.description}

        onChange={(description) => onUpdate(index, { description })}

        placeholder="Feature description..."

      />



      <LinkedModifiersEditor

        value={linkedModifiers}

        onChange={(next) =>

          onUpdate(

            index,

            syncModifierRefs({

              linkedModifiers: syncFeatureActivationTiming(activation, next),

            }),

          )

        }

        catalog={modifierCatalog}

        classResources={classResources}

        spellOptions={spellOptions}

        label="Modifier effects"

        emptyMessage="No common modifiers linked — add effects from the shared catalog (e.g. Resistance / immunity / reduction)."

      />



      <ActivationEditor

        activation={activation}

        siblingFeatures={siblingFeatures.filter((feat) => feat.name !== feature.name)}

        feature={feature}

        onSheetDisplayChange={(sheetDisplay) => onUpdate(index, { sheetDisplay })}

        onChange={(nextActivation) =>

          onUpdate(index, {

            activation: nextActivation,

            ...syncModifierRefs({

              linkedModifiers: syncFeatureActivationTiming(nextActivation, linkedModifiers),

            }),

          })

        }

      />



      <DurationEditor

        value={feature.duration}

        onChange={(duration) => onUpdate(index, { duration })}

      />



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
        <FeatureChoiceEditor
          choices={feature.choices}
          classResources={classResources}
          modifierCatalog={modifierCatalog}
          spellOptions={spellOptions}
          onChangeField={(field, value) => onUpdateChoiceField(index, field, value)}
          onAddOption={() => onAddChoiceOption(index)}
          onUpdateOption={(optionIndex, field, value) =>
            onUpdateChoiceOption(index, optionIndex, field, value)
          }
          onRemoveOption={(optionIndex) => onRemoveChoiceOption(index, optionIndex)}
        />
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



