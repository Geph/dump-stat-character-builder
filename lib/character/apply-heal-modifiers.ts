/**
 * Cheap consumers for the two healing CharacteristicModifiers that used to stop at aggregate:
 * Disciple of Life / Blessed Healer (`spell_healing_modifier`) and Magical Anathema
 * (`healing_received_modifier`).
 *
 * This is not a full "resolve this spell and apply HP" engine. `Spell` still has no structured
 * healing field. The calculator applies authored bonuses to a known amount, and the overlay can
 * parse a first-pass NdM from healing-spell prose when the user asks to apply it.
 */
import { applyHealingReceivedModifiers } from "@/lib/character/apply-characteristic-runtime"
import type {
  HealingReceivedModifierCharacteristic,
  SpellHealingModifierCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"

export type SpellHealingApplyContext = {
  spellLevel: number
  targetAtZeroHp?: boolean
  /** When true, also compute Blessed Healer self-heal. */
  healingOthers?: boolean
}

export type AppliedSpellHealing = {
  amount: number
  bonus: number
  selfHeal: number
  maximize: boolean
  notes: string[]
}

export function shouldMaximizeHealingDice(
  modifiers: SpellHealingModifierCharacteristic[],
  targetAtZeroHp?: boolean,
): boolean {
  return modifiers.some((mod) => {
    if (!mod.maximizeHealingDice) return false
    if (mod.maximizeOnlyAtZeroHp && !targetAtZeroHp) return false
    return true
  })
}

/** Flat + per-level bonus a healing spell gains (Disciple of Life). 1st-level spells and up. */
export function spellHealingOutgoingBonus(
  modifiers: SpellHealingModifierCharacteristic[],
  spellLevel: number,
): number {
  if (spellLevel < 1) return 0
  let bonus = 0
  for (const mod of modifiers) {
    if ((mod.bonusFlat ?? 0) !== 0 || (mod.bonusPerSpellLevel ?? 0) !== 0) {
      bonus += (mod.bonusFlat ?? 0) + (mod.bonusPerSpellLevel ?? 0) * spellLevel
    }
  }
  return bonus
}

/** Blessed Healer: heal self when the spell heals someone else. */
export function spellHealingSelfOnHealOthers(
  modifiers: SpellHealingModifierCharacteristic[],
  spellLevel: number,
): number {
  if (spellLevel < 1) return 0
  let amount = 0
  for (const mod of modifiers) {
    if ((mod.selfHealFlat ?? 0) !== 0 || (mod.selfHealPerSpellLevel ?? 0) !== 0) {
      amount += (mod.selfHealFlat ?? 0) + (mod.selfHealPerSpellLevel ?? 0) * spellLevel
    }
  }
  return amount
}

export function applySpellHealingModifiers(
  amount: number,
  modifiers: SpellHealingModifierCharacteristic[],
  context: SpellHealingApplyContext,
): AppliedSpellHealing {
  if (!Number.isFinite(amount) || amount <= 0 || !modifiers.length) {
    return { amount, bonus: 0, selfHeal: 0, maximize: false, notes: [] }
  }
  const bonus = spellHealingOutgoingBonus(modifiers, context.spellLevel)
  const maximize = shouldMaximizeHealingDice(modifiers, context.targetAtZeroHp)
  const selfHeal = context.healingOthers
    ? spellHealingSelfOnHealOthers(modifiers, context.spellLevel)
    : 0
  const notes: string[] = []
  if (bonus > 0) notes.push(`+${bonus} spell healing`)
  if (maximize) {
    notes.push(
      context.targetAtZeroHp ? "Healing dice maximized (target at 0 HP)" : "Healing dice maximized",
    )
  }
  if (selfHeal > 0) notes.push(`Blessed Healer: you regain ${selfHeal} HP`)
  return { amount: amount + bonus, bonus, selfHeal, maximize, notes }
}

export function applyIncomingHeal(
  amount: number,
  received: HealingReceivedModifierCharacteristic[],
  context: { magical?: boolean; fromPotion?: boolean } = { magical: true },
): number {
  return applyHealingReceivedModifiers(amount, received, context)
}

const HEALING_PROSE_RE =
  /\b(?:regains?|restores?|heal(?:s|ed|ing)?)\b[\s\S]{0,120}?(\d+)\s*d\s*(\d+)\b/i
const PLUS_SPELLCASTING_RE = /\bplus\s+your\s+spellcasting\s+ability\s+modifier\b/i
const PLUS_FLAT_RE = /\+\s*(\d+)\b/

export type ParsedSpellHealing = {
  diceCount: number
  dieSides: number
  plusSpellcastingMod: boolean
  flatBonus: number
}

/** First NdM in a healing sentence. Enough for Cure Wounds / Healing Word / Mass Healing Word. */
export function parseSpellHealingExpression(
  description: string | null | undefined,
): ParsedSpellHealing | null {
  if (!description) return null
  const plain = description.replace(/<[^>]+>/g, " ")
  if (!/\bhit\s+points?\b|\bheal/i.test(plain)) return null
  const match = plain.match(HEALING_PROSE_RE)
  if (!match) return null
  const diceCount = parseInt(match[1] ?? "", 10)
  const dieSides = parseInt(match[2] ?? "", 10)
  if (!diceCount || !dieSides) return null
  const window = plain.slice(match.index ?? 0, (match.index ?? 0) + 160)
  const flatMatch = window.match(PLUS_FLAT_RE)
  return {
    diceCount,
    dieSides,
    plusSpellcastingMod: PLUS_SPELLCASTING_RE.test(window),
    flatBonus: flatMatch ? parseInt(flatMatch[1] ?? "0", 10) || 0 : 0,
  }
}

export function looksLikeHealingSpell(description: string | null | undefined): boolean {
  if (!description) return false
  const plain = description.replace(/<[^>]+>/g, " ")
  return (
    parseSpellHealingExpression(plain) != null ||
    (/\bhit\s+points?\b/i.test(plain) && /\b(?:regains?|restores?|heal)/i.test(plain))
  )
}

export function formatSpellHealingNotes(
  modifiers: SpellHealingModifierCharacteristic[],
  spellLevel: number,
): string[] {
  const notes: string[] = []
  const bonus = spellHealingOutgoingBonus(modifiers, spellLevel)
  if (bonus > 0) notes.push(`Disciple of Life: +${bonus} HP when this spell restores hit points`)
  const selfHeal = spellHealingSelfOnHealOthers(modifiers, spellLevel)
  if (selfHeal > 0) {
    notes.push(`Blessed Healer: you regain ${selfHeal} HP when this spell heals another creature`)
  }
  if (shouldMaximizeHealingDice(modifiers, true)) {
    const onlyAtZero = modifiers.some((mod) => mod.maximizeHealingDice && mod.maximizeOnlyAtZeroHp)
    notes.push(
      onlyAtZero
        ? "Supreme / Return to Life: maximize healing dice when the target is at 0 HP"
        : "Supreme Healing: maximize healing dice",
    )
  }
  return notes
}
