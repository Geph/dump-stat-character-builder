"use client"

import { Plus, X } from "lucide-react"
import type {
  CompanionAttack,
  CompanionAttackKind,
  CompanionDamageRoll,
  CompanionNamedBlock,
  CompanionScaledValue,
} from "@/lib/character/companion-stat-block"
import { ABILITY_SCORE_KEYS, type AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import { DAMAGE_TYPES } from "@/lib/compendium/damage-types"
import { compendiumEditorAddButtonClass } from "@/components/compendium/compendium-editor-section"

const ABILITY_LABEL: Record<AbilityScoreKey, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
}

const inlineFieldClass =
  "px-2 py-1 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:border-primary"

/** Fixed portion of a scaled value (ignores any scale parts — used to seed manual edits). */
export function fixedValueOf(value: CompanionScaledValue | null | undefined): number {
  if (!value) return 0
  return value.parts
    .filter((part) => part.type === "fixed")
    .reduce((sum, part) => sum + part.value, 0)
}

function abilityRefOf(value: CompanionScaledValue | null | undefined): AbilityScoreKey | "none" {
  for (const part of value?.parts ?? []) {
    if (part.type === "scale" && part.ref.kind === "ability_modifier") return part.ref.ability
  }
  return "none"
}

function hasProficiencyBonus(value: CompanionScaledValue | null | undefined): boolean {
  return Boolean(value?.parts.some((part) => part.type === "scale" && part.ref.kind === "proficiency_bonus"))
}

function buildScaledValue(
  fixed: number,
  ability: AbilityScoreKey | "none",
  addProficiencyBonus: boolean,
): CompanionScaledValue {
  const parts: CompanionScaledValue["parts"] = [{ type: "fixed", value: fixed }]
  if (ability !== "none") parts.push({ type: "scale", ref: { kind: "ability_modifier", ability } })
  if (addProficiencyBonus) parts.push({ type: "scale", ref: { kind: "proficiency_bonus" } })
  return { parts }
}

/** Fixed number + optional "ability modifier" and "proficiency bonus" scale toggles. */
function ScaledValueFields({
  label,
  value,
  onChange,
}: {
  label: string
  value: CompanionScaledValue | null | undefined
  onChange: (next: CompanionScaledValue) => void
}) {
  const fixed = fixedValueOf(value)
  const ability = abilityRefOf(value)
  const addPb = hasProficiencyBonus(value)
  const emit = (nextFixed: number, nextAbility: AbilityScoreKey | "none", nextAddPb: boolean) =>
    onChange(buildScaledValue(nextFixed, nextAbility, nextAddPb))

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground shrink-0 w-24">{label}</span>
      <input
        type="number"
        value={fixed}
        onChange={(e) => emit(parseInt(e.target.value, 10) || 0, ability, addPb)}
        className={`${inlineFieldClass} w-16 text-center`}
      />
      <select
        value={ability}
        onChange={(e) => emit(fixed, e.target.value as AbilityScoreKey | "none", addPb)}
        className={inlineFieldClass}
      >
        <option value="none">no ability mod</option>
        {ABILITY_SCORE_KEYS.map((key) => (
          <option key={key} value={key}>
            + {ABILITY_LABEL[key]} mod
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        <input type="checkbox" checked={addPb} onChange={(e) => emit(fixed, ability, e.target.checked)} />
        + PB
      </label>
    </div>
  )
}

const EMPTY_ATTACK: CompanionAttack = {
  kind: "melee",
  toHit: { parts: [{ type: "fixed", value: 4 }] },
  reach: "5 ft.",
  damage: [{ dice: "1d6", bonus: { parts: [{ type: "fixed", value: 2 }] }, type: "Slashing" }],
}

/** Structured melee/ranged attack fields — resolved on the sheet without regex-parsing prose. */
function AttackFields({
  attack,
  onChange,
}: {
  attack: CompanionAttack
  onChange: (next: CompanionAttack) => void
}) {
  const damage: CompanionDamageRoll = attack.damage[0] ?? { dice: "1d6", type: null }
  const updateDamage = (patch: Partial<CompanionDamageRoll>) => {
    onChange({ ...attack, damage: [{ ...damage, ...patch }] })
  }

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={attack.kind}
          onChange={(e) => onChange({ ...attack, kind: e.target.value as CompanionAttackKind })}
          className={inlineFieldClass}
        >
          <option value="melee">Melee</option>
          <option value="ranged">Ranged</option>
          <option value="melee_or_ranged">Melee or Ranged</option>
        </select>
        <input
          type="text"
          value={(attack.kind === "ranged" ? attack.range : attack.reach) ?? ""}
          onChange={(e) =>
            onChange(
              attack.kind === "ranged"
                ? { ...attack, range: e.target.value || null }
                : { ...attack, reach: e.target.value || null },
            )
          }
          placeholder={attack.kind === "ranged" ? "Range, e.g. 80/320 ft." : "Reach, e.g. 5 ft."}
          className={`${inlineFieldClass} flex-1 min-w-[140px]`}
        />
      </div>
      <ScaledValueFields label="To hit" value={attack.toHit} onChange={(toHit) => onChange({ ...attack, toHit })} />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground shrink-0 w-24">Damage dice</span>
        <input
          type="text"
          value={damage.dice}
          onChange={(e) => updateDamage({ dice: e.target.value })}
          placeholder="1d6"
          className={`${inlineFieldClass} w-20 text-center`}
        />
        <select
          value={damage.type ?? ""}
          onChange={(e) => updateDamage({ type: e.target.value || null })}
          className={inlineFieldClass}
        >
          <option value="">Damage type…</option>
          {DAMAGE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <ScaledValueFields label="Damage bonus" value={damage.bonus} onChange={(bonus) => updateDamage({ bonus })} />
    </div>
  )
}

/**
 * Editable list of `CompanionNamedBlock` entries (Traits, Actions, Bonus Actions,
 * Reactions, Legendary Actions). When `allowAttack` is set, each entry can carry a
 * structured attack (to-hit + damage) that drives sheet roll buttons directly,
 * instead of relying on regex-parsing pasted stat block prose.
 */
export function CreatureBlockListEditor({
  blocks,
  onChange,
  allowAttack = false,
  namePlaceholder = "Name",
  addLabel = "Add",
}: {
  blocks: CompanionNamedBlock[]
  onChange: (next: CompanionNamedBlock[]) => void
  allowAttack?: boolean
  namePlaceholder?: string
  addLabel?: string
}) {
  const update = (index: number, patch: Partial<CompanionNamedBlock>) => {
    onChange(blocks.map((block, i) => (i === index ? { ...block, ...patch } : block)))
  }
  const remove = (index: number) => onChange(blocks.filter((_, i) => i !== index))
  const add = () => onChange([...blocks, { name: "", description: "", tag: null, attack: null }])

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <div key={index} className="bg-card border-2 border-border rounded-xl p-3 space-y-2">
          <div className="flex items-start gap-2">
            <input
              type="text"
              value={block.name}
              onChange={(e) => update(index, { name: e.target.value })}
              placeholder={namePlaceholder}
              className="flex-1 px-3 py-2 bg-background border-2 border-border rounded-lg text-sm font-semibold text-foreground focus:outline-none focus:border-primary"
            />
            <input
              type="text"
              value={block.tag ?? ""}
              onChange={(e) => update(index, { tag: e.target.value || null })}
              placeholder="Tag (Recharge 6, 1/Day…)"
              className="w-44 px-3 py-2 bg-background border-2 border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
              aria-label={`Remove ${block.name || namePlaceholder}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={block.description}
            onChange={(e) => update(index, { description: e.target.value })}
            rows={2}
            placeholder="Flavor / rules text shown under the roll buttons."
            className="w-full px-3 py-2 bg-background border-2 border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
          />
          {allowAttack ? (
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={Boolean(block.attack)}
                  onChange={(e) => update(index, { attack: e.target.checked ? EMPTY_ATTACK : null })}
                />
                Structured attack (adds roll buttons on the sheet)
              </label>
              {block.attack ? (
                <div className="mt-2">
                  <AttackFields attack={block.attack} onChange={(attack) => update(index, { attack })} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
      <button type="button" onClick={add} className={compendiumEditorAddButtonClass}>
        <Plus className="w-4 h-4" />
        {addLabel}
      </button>
    </div>
  )
}
