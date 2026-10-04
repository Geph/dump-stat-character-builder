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

type SpellRefKind = "spell_attack_modifier" | "spell_save_dc"

function hasSpellRef(value: CompanionScaledValue | null | undefined, kind: SpellRefKind): boolean {
  return Boolean(value?.parts.some((part) => part.type === "scale" && part.ref.kind === kind))
}

function buildScaledValue(
  fixed: number,
  ability: AbilityScoreKey | "none",
  addProficiencyBonus: boolean,
  spellRef: SpellRefKind | null = null,
): CompanionScaledValue {
  if (spellRef === "spell_save_dc") return { parts: [{ type: "scale", ref: { kind: "spell_save_dc" } }] }
  const parts: CompanionScaledValue["parts"] = [{ type: "fixed", value: fixed }]
  if (spellRef === "spell_attack_modifier") {
    parts.push({ type: "scale", ref: { kind: "spell_attack_modifier" } })
    return { parts }
  }
  if (ability !== "none") parts.push({ type: "scale", ref: { kind: "ability_modifier", ability } })
  if (addProficiencyBonus) parts.push({ type: "scale", ref: { kind: "proficiency_bonus" } })
  return { parts }
}

/** Fixed number + optional "ability modifier" / "proficiency bonus" / owner spell scale toggles. */
function ScaledValueFields({
  label,
  value,
  onChange,
  spellRefKind,
}: {
  label: string
  value: CompanionScaledValue | null | undefined
  onChange: (next: CompanionScaledValue) => void
  /** Offer "= your spell attack modifier" / "= your spell save DC". */
  spellRefKind?: SpellRefKind
}) {
  const fixed = fixedValueOf(value)
  const ability = abilityRefOf(value)
  const addPb = hasProficiencyBonus(value)
  const usesSpell = spellRefKind ? hasSpellRef(value, spellRefKind) : false
  const emit = (
    nextFixed: number,
    nextAbility: AbilityScoreKey | "none",
    nextAddPb: boolean,
    nextSpell: boolean = usesSpell,
  ) => onChange(buildScaledValue(nextFixed, nextAbility, nextAddPb, nextSpell ? spellRefKind ?? null : null))

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground shrink-0 w-24">{label}</span>
      {spellRefKind ? (
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={usesSpell}
            onChange={(e) => emit(fixed, ability, addPb, e.target.checked)}
          />
          {spellRefKind === "spell_save_dc" ? "Your spell save DC" : "Your spell attack mod"}
        </label>
      ) : null}
      {usesSpell && spellRefKind === "spell_save_dc" ? null : (
        <>
          <input
            type="number"
            value={fixed}
            onChange={(e) => emit(parseInt(e.target.value, 10) || 0, ability, addPb)}
            className={`${inlineFieldClass} w-16 text-center`}
          />
          {usesSpell ? null : (
            <>
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
            </>
          )}
        </>
      )}
      {value?.label && !value.parts.length ? (
        <span className="text-[10px] text-muted-foreground">Source text: {value.label}</span>
      ) : null}
    </div>
  )
}

const EMPTY_ATTACK: CompanionAttack = {
  kind: "melee",
  toHit: { parts: [{ type: "fixed", value: 4 }] },
  reach: "5 ft.",
  damage: [{ dice: "1d6", bonus: { parts: [{ type: "fixed", value: 2 }] }, type: "Slashing" }],
}

function DamageRollFields({
  roll,
  onChange,
  onRemove,
}: {
  roll: CompanionDamageRoll
  onChange: (next: CompanionDamageRoll) => void
  onRemove?: () => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground shrink-0 w-24">Damage dice</span>
        <input
          type="text"
          value={roll.dice}
          onChange={(e) => onChange({ ...roll, dice: e.target.value })}
          placeholder="1d6"
          className={`${inlineFieldClass} w-20 text-center`}
        />
        <select
          value={roll.type ?? ""}
          onChange={(e) => onChange({ ...roll, type: e.target.value || null })}
          className={inlineFieldClass}
        >
          <option value="">Damage type…</option>
          {DAMAGE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-muted-foreground hover:text-destructive"
            aria-label="Remove damage roll"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
      <ScaledValueFields label="Damage bonus" value={roll.bonus} onChange={(bonus) => onChange({ ...roll, bonus })} />
    </div>
  )
}

/** Structured attack-roll or saving-throw fields — resolved on the sheet without regex-parsing prose. */
function AttackFields({
  attack,
  onChange,
}: {
  attack: CompanionAttack
  onChange: (next: CompanionAttack) => void
}) {
  const isSave = attack.kind === "save"
  const damage = attack.damage.length ? attack.damage : [{ dice: "1d6", type: null }]
  const setDamage = (next: CompanionDamageRoll[]) => onChange({ ...attack, damage: next })

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={attack.kind}
          onChange={(e) => {
            const kind = e.target.value as CompanionAttackKind
            onChange(
              kind === "save"
                ? {
                    ...attack,
                    kind,
                    saveAbility: attack.saveAbility ?? "dexterity",
                    saveDc: attack.saveDc ?? { parts: [{ type: "fixed", value: 12 }] },
                  }
                : { ...attack, kind, toHit: attack.toHit ?? { parts: [{ type: "fixed", value: 4 }] } },
            )
          }}
          className={inlineFieldClass}
        >
          <option value="melee">Melee</option>
          <option value="ranged">Ranged</option>
          <option value="melee_or_ranged">Melee or Ranged</option>
          <option value="save">Saving throw</option>
        </select>
        {isSave ? (
          <>
            <select
              value={attack.saveAbility ?? ""}
              onChange={(e) => onChange({ ...attack, saveAbility: (e.target.value || null) as AbilityScoreKey | null })}
              className={inlineFieldClass}
              aria-label="Save ability"
            >
              <option value="">Save…</option>
              {ABILITY_SCORE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {ABILITY_LABEL[key]} save
                </option>
              ))}
            </select>
            <input
              type="text"
              value={attack.area ?? ""}
              onChange={(e) => onChange({ ...attack, area: e.target.value || null })}
              placeholder="Targets, e.g. each creature in a 15-foot Cone"
              className={`${inlineFieldClass} flex-1 min-w-[180px]`}
            />
          </>
        ) : (
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
        )}
      </div>
      {isSave ? (
        <>
          <ScaledValueFields
            label="Save DC"
            value={attack.saveDc}
            spellRefKind="spell_save_dc"
            onChange={(saveDc) => onChange({ ...attack, saveDc })}
          />
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={Boolean(attack.halfOnSuccess)}
              onChange={(e) => onChange({ ...attack, halfOnSuccess: e.target.checked })}
            />
            Half damage on a successful save
          </label>
        </>
      ) : (
        <ScaledValueFields
          label="To hit"
          value={attack.toHit}
          spellRefKind="spell_attack_modifier"
          onChange={(toHit) => onChange({ ...attack, toHit })}
        />
      )}
      {damage.map((roll, index) => (
        <DamageRollFields
          key={index}
          roll={roll}
          onChange={(next) => setDamage(damage.map((entry, i) => (i === index ? next : entry)))}
          onRemove={damage.length > 1 ? () => setDamage(damage.filter((_, i) => i !== index)) : undefined}
        />
      ))}
      <button
        type="button"
        onClick={() => setDamage([...damage, { dice: "1d6", type: null }])}
        className="text-xs text-primary hover:underline"
      >
        + Add damage roll
      </button>
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
                Structured attack or saving throw (adds roll buttons on the sheet)
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
