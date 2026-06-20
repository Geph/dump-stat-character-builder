"use client"

import {
  createCharacteristicModifier,
  type CharacteristicModifier,
  type SpecialAttackCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"
import { SPECIAL_ATTACK_CATALOG_ID } from "@/lib/compendium/modifier-catalog"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { SpecialAttackFieldsEditor } from "@/components/compendium/special-attack-fields-editor"

function getSpecialAttackMod(characteristics: CharacteristicModifier[] | undefined): SpecialAttackCharacteristic {
  const existing = characteristics?.find((mod) => mod.type === "special_attack") as
    | SpecialAttackCharacteristic
    | undefined
  if (existing) return existing
  return createCharacteristicModifier("special_attack") as SpecialAttackCharacteristic
}

type SpecialAttackTemplateSectionProps = {
  entry: ModifierCatalogEntry
  onChange: (patch: Partial<ModifierCatalogEntry>) => void
}

export function SpecialAttackTemplateSection({ entry, onChange }: SpecialAttackTemplateSectionProps) {
  if (entry.id !== SPECIAL_ATTACK_CATALOG_ID) return null

  const specialAttack = getSpecialAttackMod(entry.characteristics)

  const updateSpecialAttack = (next: SpecialAttackCharacteristic) => {
    const others = (entry.characteristics ?? []).filter((mod) => mod.type !== "special_attack")
    onChange({ characteristics: [...others, next] })
  }

  const ensureSpecialAttack = () => {
    if (entry.characteristics?.some((mod) => mod.type === "special_attack")) return
    onChange({ characteristics: [...(entry.characteristics ?? []), specialAttack] })
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Special Attack Template</p>
        <p className="text-xs text-muted-foreground mt-1">
          Default fields for breath weapons, natural attacks, and similar special attacks. Species traits and features
          that link this catalog entry inherit these defaults and configure specifics inline.
        </p>
      </div>
      {!entry.characteristics?.some((mod) => mod.type === "special_attack") ? (
        <button
          type="button"
          onClick={ensureSpecialAttack}
          className="text-sm text-primary hover:underline"
        >
          Initialize special attack template fields
        </button>
      ) : (
        <SpecialAttackFieldsEditor mod={specialAttack} onChange={updateSpecialAttack} />
      )}
    </div>
  )
}

export { SPECIAL_ATTACK_CATALOG_ID }
