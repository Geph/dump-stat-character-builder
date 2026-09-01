"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, X, Sparkles, Dices } from "lucide-react"
import type { Spell } from "@/lib/types"
import {
  concentrationConditionName,
  concentrationSpellName,
  spellRequiresAttack,
  willReplaceConcentration,
} from "@/lib/compendium/spell-slots"
import { formatPsionicAugmentSelectionSummary, totalPsionicAugmentCost } from "@/lib/compendium/parse-psionic-augments"
import {
  PsionicAugmentPicker,
  resolveSpellPsionicAugments,
} from "@/components/character-sheet/psionic-augment-picker"
import { MetamagicCastDropdown } from "@/components/character-sheet/metamagic-cast-dropdown"
import { EmpoweredSpellReroll } from "@/components/character-sheet/empowered-spell-reroll"
import type {
  MetamagicCastOption,
  ResolvedSpellCastCost,
} from "@/lib/character/resolve-spell-cast-cost"
import { applySpellDisplayMutations } from "@/lib/character/spell-cast-mutations"
import {
  applySpellHealingModifiers,
  formatSpellHealingNotes,
  looksLikeHealingSpell,
  parseSpellHealingExpression,
  shouldMaximizeHealingDice,
} from "@/lib/character/apply-heal-modifiers"
import { rollDice } from "@/lib/dice/roll-die"
import type { SpellHealingModifierCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import { formatD20RollSummary, rollD20WithMode } from "@/lib/dice/d20-roll"
import { useSheetRollContext } from "@/components/character-sheet/sheet-roll-context"
import { resolveRollMode } from "@/lib/character/resolve-roll-mode"
import { useSheetRollHistory } from "@/components/character-sheet/sheet-roll-history-context"
import type { PsionicAugmentSelection } from "@/lib/compendium/parse-psionic-augments"

type SpellDetailOverlayProps = {
  spell: Spell
  spellAttackMod: number | null
  activeConcentration: string | null
  onClose: () => void
  onCast: (result: {
    attackRoll?: { natural: number; total: number }
    concentrationApplied?: string
    slotUsed?: boolean
    psionicAugments?: PsionicAugmentSelection[]
    psiPointsSpent?: number
    hitDiceSpent?: number
    hitPointsSpent?: number
    arcanumUsed?: boolean
    freeCastUsedKey?: string
    slotLevelUsed?: number
  }) => void
  canUseSlot: boolean
  slotLevel?: number | null
  /** A limited slot-free use granted by a feat, species, background, or feature. */
  freeCast?: {
    trackingKey: string
    sourceLabel: string
    remaining: number
    max: number
  } | null
  /** An unrestricted feature cast that never expends a slot. */
  slotlessCast?: boolean
  psiLimit?: number | null
  castCost?: ResolvedSpellCastCost | null
  metamagicOptions?: MetamagicCastOption[]
  selectedMetamagicIds?: string[]
  onMetamagicChange?: (next: string[]) => void
  /** Charisma modifier (min 1) for Empowered Spell reroll cap. */
  empoweredRerollCap?: number
  /** Created/upcast slot for Hit Point Spellcasting (Martyr). */
  createdSlotLevel?: number | null
  maxCreatedSlotLevel?: number | null
  onCreatedSlotLevelChange?: (level: number) => void
  spellcastingMod?: number
  spellHealingModifiers?: SpellHealingModifierCharacteristic[]
  onApplySelfHeal?: (amount: number) => void
}

export function SpellDetailOverlay({
  spell,
  spellAttackMod,
  activeConcentration,
  onClose,
  onCast,
  canUseSlot,
  slotLevel = null,
  freeCast = null,
  slotlessCast = false,
  psiLimit,
  castCost = null,
  metamagicOptions = [],
  selectedMetamagicIds = [],
  onMetamagicChange,
  empoweredRerollCap = 1,
  createdSlotLevel = null,
  maxCreatedSlotLevel = null,
  onCreatedSlotLevelChange,
  spellcastingMod = 0,
  spellHealingModifiers = [],
  onApplySelfHeal,
}: SpellDetailOverlayProps) {
  const [castFeedback, setCastFeedback] = useState<string | null>(null)
  const [concentrationWarningOpen, setConcentrationWarningOpen] = useState(false)
  const [augmentSelections, setAugmentSelections] = useState<PsionicAugmentSelection[]>([])
  const [showEmpoweredReroll, setShowEmpoweredReroll] = useState(false)
  const [castMode, setCastMode] = useState<"free" | "slot">(
    freeCast && freeCast.remaining > 0 ? "free" : "slot",
  )
  const history = useSheetRollHistory()
  const rollCtx = useSheetRollContext()
  const psionicAugments = resolveSpellPsionicAugments(spell)
  const needsAttack = spellRequiresAttack(spell.description)
  const isCantrip = spell.level === 0

  const isPointPool = castCost?.mode === "point_pool"
  const isResourceCast = castCost?.mode === "resource"
  const spendsResourcePoints = isPointPool || isResourceCast
  const resourceLabel = castCost?.resourceDisplayName ?? "Points"
  const hasMetamagic = metamagicOptions.length > 0
  const metamagicSelected = selectedMetamagicIds.length > 0
  const metamagicReady = !metamagicSelected || (castCost?.canCast ?? true)
  const selectedMetamagicOptions = metamagicOptions.filter((row) =>
    selectedMetamagicIds.includes(row.id),
  )
  const hasEmpowered = selectedMetamagicOptions.some(
    (row) => row.effectHint === "empowered_reroll",
  )
  const hasQuickened = selectedMetamagicOptions.some((row) => row.effectHint === "quicken")
  const effectiveSpellLevel = createdSlotLevel ?? slotLevel ?? spell.level
  const mutatedDisplay = applySpellDisplayMutations(
    {
      range: spell.range,
      duration: spell.duration,
      components: spell.components,
    },
    selectedMetamagicOptions.map((row) => row.effectHint ?? null),
  )
  const healingNotes = looksLikeHealingSpell(spell.description)
    ? formatSpellHealingNotes(spellHealingModifiers, effectiveSpellLevel)
    : []
  const parsedHealing = looksLikeHealingSpell(spell.description)
    ? parseSpellHealingExpression(spell.description)
    : null
  const freeCastTrackingKey = freeCast?.trackingKey
  const freeCastRemaining = freeCast?.remaining ?? 0
  const freeCastAvailable = freeCastRemaining > 0
  const usingFreeCast = slotlessCast || (castMode === "free" && freeCastAvailable)
  const canCastSpell = isCantrip
    ? spendsResourcePoints
      ? (castCost?.canCast ?? true)
      : metamagicSelected
        ? metamagicReady
        : true
    : spendsResourcePoints
      ? (castCost?.canCast ?? false)
      : (canUseSlot || usingFreeCast) && metamagicReady

  useEffect(() => {
    setConcentrationWarningOpen(false)
    setCastFeedback(null)
    setAugmentSelections([])
    setShowEmpoweredReroll(false)
  }, [spell.id])

  useEffect(() => {
    setCastMode(freeCastTrackingKey && freeCastRemaining > 0 ? "free" : "slot")
  }, [freeCastTrackingKey, freeCastRemaining])

  const augmentSummary =
    psionicAugments && augmentSelections.length
      ? formatPsionicAugmentSelectionSummary(psionicAugments, augmentSelections)
      : null

  const performCast = () => {
    const result: {
      attackRoll?: { natural: number; total: number }
      concentrationApplied?: string
      slotUsed?: boolean
      psionicAugments?: PsionicAugmentSelection[]
      psiPointsSpent?: number
      hitDiceSpent?: number
      hitPointsSpent?: number
      arcanumUsed?: boolean
      freeCastUsedKey?: string
      slotLevelUsed?: number
    } = {}

    const feedbackParts: string[] = []

    if (needsAttack && spellAttackMod != null) {
      const resolved = resolveRollMode({
        context: { kind: "spell_attack" },
        activeConditions: rollCtx.activeConditions,
        exhaustionLevel: rollCtx.exhaustionLevel,
        manualOverride: "normal",
        classFeatures: rollCtx.classFeatures,
        limitationContext: {
          activeConditions: rollCtx.activeConditions,
          activeSheetToggles: rollCtx.activeSheetToggles,
          equippedArmor: rollCtx.equippedArmor,
          equippedShield: rollCtx.equippedShield,
          currentHp: rollCtx.featureEffectContext?.currentHp ?? rollCtx.currentHp,
        },
      })
      const rolled = rollD20WithMode(resolved.mode, spellAttackMod)
      result.attackRoll = { natural: rolled.natural, total: rolled.total }
      const attackSummary = formatD20RollSummary(rolled, spellAttackMod)
      feedbackParts.push(`Attack: ${attackSummary}`)
      history?.logRoll({
        kind: "spell",
        label: `${spell.name} attack`,
        summary: attackSummary,
        natural: result.attackRoll.natural,
        naturals: rolled.naturals,
      })
    }
    if (spell.concentration) {
      result.concentrationApplied = concentrationConditionName(spell.name)
      feedbackParts.push(`Concentration: ${spell.name}`)
    }
    if (!isCantrip && canCastSpell) {
      if (isPointPool && castCost?.castKind === "arcanum") {
        result.arcanumUsed = true
        feedbackParts.push("Used Innate Arcanum charge")
      } else if (spendsResourcePoints && castCost) {
        result.psiPointsSpent = castCost.totalCost
        feedbackParts.push(`Spent ${castCost.totalCost} ${resourceLabel}`)
      } else if (castCost?.metamagicCost) {
        result.psiPointsSpent = castCost.metamagicCost
        feedbackParts.push(`Spent ${castCost.metamagicCost} ${resourceLabel} on Metamagic`)
        if (!isCantrip && !usingFreeCast) {
          result.slotUsed = true
          result.slotLevelUsed = slotLevel ?? spell.level
          feedbackParts.push(`Used 1 level ${result.slotLevelUsed} slot`)
        }
      } else if (usingFreeCast) {
        if (!slotlessCast && freeCast) result.freeCastUsedKey = freeCast.trackingKey
        feedbackParts.push(
          slotlessCast ? "No spell slot spent" : `Used free cast from ${freeCast?.sourceLabel}`,
        )
      } else if (!isCantrip) {
        result.slotUsed = true
        result.slotLevelUsed = slotLevel ?? spell.level
        feedbackParts.push(`Used 1 level ${result.slotLevelUsed} slot`)
      }
    } else if (isCantrip && castCost?.metamagicCost) {
      result.psiPointsSpent = castCost.metamagicCost
      feedbackParts.push(`Spent ${castCost.metamagicCost} ${resourceLabel} on Metamagic`)
    }
    if ((castCost?.hitDiceCost ?? 0) > 0) {
      result.hitDiceSpent = castCost!.hitDiceCost
      feedbackParts.push(`Spent ${castCost!.hitDiceCost} Hit Dice`)
    }
    if ((castCost?.hitPointsCost ?? 0) > 0) {
      result.hitPointsSpent = castCost!.hitPointsCost
      feedbackParts.push(`Took ${castCost!.hitPointsCost} HP (Radiant, bypasses Temp HP)`)
    }
    if (hasQuickened) {
      feedbackParts.push("Quickened: Bonus Action this cast")
    }
    if (mutatedDisplay.notes.length) {
      feedbackParts.push(...mutatedDisplay.notes)
    }
    if (hasEmpowered) {
      feedbackParts.push("Empowered: reroll damage dice below")
      setShowEmpoweredReroll(true)
    }
    if (psionicAugments && augmentSelections.length) {
      result.psionicAugments = augmentSelections
      result.psiPointsSpent = totalPsionicAugmentCost(psionicAugments, augmentSelections)
      if (augmentSummary) feedbackParts.push(augmentSummary)
    }
    onCast(result)
    setConcentrationWarningOpen(false)
    setCastFeedback(feedbackParts.join(" · ") || "Cast!")
  }

  const handleCastClick = () => {
    if (
      spell.concentration &&
      willReplaceConcentration(activeConcentration, spell.name)
    ) {
      setConcentrationWarningOpen(true)
      return
    }
    performCast()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-card border-2 border-border rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 p-4 border-b border-border bg-card/95 backdrop-blur-sm">
          <div>
            <h2 className="text-lg font-black text-foreground">{spell.name}</h2>
            <p className="text-sm text-muted-foreground">
              {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`} · {spell.school}
              {spell.concentration && " · Concentration"}
              {spell.ritual && " · Ritual"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-sm">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {spell.casting_time && (
              <>
                <dt className="text-muted-foreground">Casting Time</dt>
                <dd className="text-foreground">{spell.casting_time}</dd>
              </>
            )}
            {(mutatedDisplay.range || spell.range) && (
              <>
                <dt className="text-muted-foreground">Range</dt>
                <dd className="text-foreground">
                  {mutatedDisplay.range ?? spell.range}
                  {mutatedDisplay.range && mutatedDisplay.range !== spell.range ? (
                    <span className="block text-[11px] text-muted-foreground">was {spell.range}</span>
                  ) : null}
                </dd>
              </>
            )}
            {(mutatedDisplay.duration || spell.duration) && (
              <>
                <dt className="text-muted-foreground">Duration</dt>
                <dd className="text-foreground">
                  {mutatedDisplay.duration ?? spell.duration}
                  {mutatedDisplay.duration && mutatedDisplay.duration !== spell.duration ? (
                    <span className="block text-[11px] text-muted-foreground">was {spell.duration}</span>
                  ) : null}
                </dd>
              </>
            )}
            {mutatedDisplay.targetsNote ? (
              <>
                <dt className="text-muted-foreground">Targets</dt>
                <dd className="text-foreground">{mutatedDisplay.targetsNote}</dd>
              </>
            ) : null}
            {(mutatedDisplay.components ?? spell.components)?.length ? (
              <>
                <dt className="text-muted-foreground">Components</dt>
                <dd className="text-foreground">
                  {(mutatedDisplay.components ?? spell.components)!.join(", ")}
                </dd>
              </>
            ) : null}
            {spell.material && (
              <>
                <dt className="text-muted-foreground">Material</dt>
                <dd className="text-foreground">{spell.material}</dd>
              </>
            )}
          </dl>

          {spell.description && (
            <div>
              <h3 className="text-xs font-bold uppercase text-muted-foreground mb-1">Description</h3>
              <RichTextContent html={spell.description} className="text-sm text-foreground leading-relaxed" />
            </div>
          )}

          {spell.higher_levels && (
            <div>
              <h3 className="text-xs font-bold uppercase text-muted-foreground mb-1">At Higher Levels</h3>
              <RichTextContent
                html={spell.higher_levels}
                className="text-sm text-muted-foreground leading-relaxed"
              />
            </div>
          )}

          {healingNotes.length || parsedHealing ? (
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 space-y-1">
              {healingNotes.map((note) => (
                <p key={note} className="text-xs text-muted-foreground">
                  {note}
                </p>
              ))}
              {parsedHealing && onApplySelfHeal ? (
                <button
                  type="button"
                  onClick={() => {
                    const maximize = shouldMaximizeHealingDice(spellHealingModifiers)
                    const dice = maximize
                      ? parsedHealing.diceCount * parsedHealing.dieSides
                      : rollDice(parsedHealing.diceCount, parsedHealing.dieSides)
                    const ability = parsedHealing.plusSpellcastingMod ? spellcastingMod : 0
                    const rolled = dice + ability + parsedHealing.flatBonus
                    const applied = applySpellHealingModifiers(
                      Math.max(0, rolled),
                      spellHealingModifiers,
                      { spellLevel: effectiveSpellLevel },
                    )
                    onApplySelfHeal(applied.amount)
                    setCastFeedback(
                      [
                        `Applied ${applied.amount} HP to self`,
                        maximize ? "dice maximized" : `${parsedHealing.diceCount}d${parsedHealing.dieSides}`,
                        ...applied.notes,
                      ]
                        .filter(Boolean)
                        .join(" · "),
                    )
                  }}
                  className="mt-1 text-xs font-semibold text-primary hover:underline"
                >
                  Apply parsed heal to self
                </button>
              ) : null}
            </div>
          ) : null}

          {psionicAugments ? (
            <PsionicAugmentPicker
              config={psionicAugments}
              selections={augmentSelections}
              onChange={setAugmentSelections}
              psiLimit={psiLimit}
            />
          ) : null}
        </div>

        <div className="sticky bottom-0 p-4 border-t border-border bg-card/95 backdrop-blur-sm space-y-2">
          {metamagicOptions.length > 0 ? (
            <MetamagicCastDropdown
              options={metamagicOptions}
              selectedIds={selectedMetamagicIds}
              onChange={onMetamagicChange ?? (() => {})}
              maxTotalCost={castCost?.metamagicCap ?? null}
            />
          ) : null}
          {showEmpoweredReroll ? (
            <EmpoweredSpellReroll maxRerolls={Math.max(1, empoweredRerollCap)} />
          ) : null}
          {!isCantrip && freeCast && (freeCastAvailable || canUseSlot) ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCastMode("free")}
                disabled={!freeCastAvailable}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
                  castMode === "free"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                Free cast ({freeCast.remaining}/{freeCast.max})
              </button>
              <button
                type="button"
                onClick={() => setCastMode("slot")}
                disabled={!canUseSlot}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
                  castMode === "slot"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {slotLevel ? `Level ${slotLevel} slot` : "Spell slot"}
              </button>
            </div>
          ) : null}
          {(slotlessCast || freeCastAvailable) && !isCantrip && (
            <p className="text-xs text-center font-semibold text-accent bg-accent/10 rounded-lg px-3 py-2">
              {slotlessCast
                ? "A feature grants this spell without a spell slot."
                : `${freeCast?.sourceLabel} grants one slot-free cast; it recharges on a Long Rest.`}
            </p>
          )}
          {castFeedback && (
            <p className="text-xs text-center font-semibold text-primary bg-primary/10 rounded-lg px-3 py-2">
              {castFeedback}
            </p>
          )}
          {concentrationWarningOpen && activeConcentration && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-3">
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-foreground leading-relaxed">
                  You are already concentrating on{" "}
                  <span className="font-bold">{concentrationSpellName(activeConcentration)}</span>.
                  Casting <span className="font-bold">{spell.name}</span> will end that concentration.
                  You can only concentrate on one spell at a time.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConcentrationWarningOpen(false)}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-xs font-semibold hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={performCast}
                  disabled={!isCantrip && !canCastSpell}
                  className="flex-1 px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-600/90 transition-colors disabled:opacity-50"
                >
                  End prior & cast
                </button>
              </div>
            </div>
          )}
          {!isCantrip && !canCastSpell && (
            <p className="text-xs text-destructive text-center">
              {castCost?.blockReason === "base_over_spell_limit"
                ? `Base cost exceeds ${isResourceCast ? "spend limit" : "Spell Limit"} (${castCost.baseCost} ${resourceLabel})`
                : castCost?.blockReason === "metamagic_over_proficiency_cap"
                  ? "Metamagic cost exceeds Proficiency Bonus cap"
                  : castCost?.blockReason === "insufficient_hit_dice"
                    ? `Not enough Hit Dice for Mortal Metamagic (need ${castCost.hitDiceCost})`
                    : castCost?.blockReason === "insufficient_points"
                      ? hasMetamagic && selectedMetamagicIds.length > 0 && canUseSlot
                        ? `Not enough ${resourceLabel} for Metamagic`
                        : `Not enough ${resourceLabel}`
                      : freeCast && !freeCastAvailable
                        ? `Free cast used; no level ${spell.level} or higher slots remaining`
                        : `No level ${spell.level} or higher slots remaining`}
            </p>
          )}
          {isCantrip && hasMetamagic && selectedMetamagicIds.length > 0 && !metamagicReady && (
            <p className="text-xs text-destructive text-center">
              {castCost?.blockReason === "metamagic_over_proficiency_cap"
                ? "Metamagic cost exceeds Proficiency Bonus cap"
                : castCost?.blockReason === "insufficient_hit_dice"
                  ? `Not enough Hit Dice for Mortal Metamagic (need ${castCost.hitDiceCost})`
                  : `Not enough ${resourceLabel} for Metamagic`}
            </p>
          )}
          {!isCantrip && maxCreatedSlotLevel != null && maxCreatedSlotLevel > 0 && onCreatedSlotLevelChange ? (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Create slot
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(
                  { length: Math.max(0, maxCreatedSlotLevel - spell.level + 1) },
                  (_, index) => spell.level + index,
                ).map((level) => {
                  const selected = (createdSlotLevel ?? spell.level) === level
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => onCreatedSlotLevelChange(level)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {level}
                      {level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th"}
                      {(castCost?.hitPointsCost ?? 0) > 0 && selected
                        ? ` · ${castCost!.hitPointsCost} HP`
                        : ""}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
          {!concentrationWarningOpen && (
            <>
              <button
                type="button"
                onClick={handleCastClick}
                disabled={!isCantrip && !canCastSpell}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {needsAttack ? <Dices className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                Cast
                {needsAttack && spellAttackMod != null && (
                  <span className="text-primary-foreground/80 font-medium">
                    (d20{spellAttackMod >= 0 ? `+${spellAttackMod}` : spellAttackMod})
                  </span>
                )}
                {spell.concentration && !needsAttack && (
                  <span className="text-primary-foreground/80 font-medium">· Concentration</span>
                )}
              </button>
              <p className="text-[10px] text-center text-muted-foreground">
                {needsAttack && "Rolls d20 + spell attack · "}
                {spell.concentration && "Applies concentration condition · "}
                {!isCantrip && isPointPool && castCost?.castKind === "arcanum"
                  ? "Uses one Innate Arcanum charge"
                  : !isCantrip && spendsResourcePoints && castCost
                    ? `Costs ${castCost.totalCost} ${resourceLabel}${
                        (castCost.hitPointsCost ?? 0) > 0 ? ` + ${castCost.hitPointsCost} HP` : ""
                      }`
                    : !isCantrip && castCost?.metamagicCost
                      ? `Uses 1 spell slot + ${castCost.metamagicCost} ${resourceLabel} Metamagic`
                      : !isCantrip
                        ? usingFreeCast
                          ? slotlessCast
                            ? "Does not use a spell slot"
                            : `Uses ${freeCast?.sourceLabel} free cast`
                          : `Uses one level ${slotLevel ?? spell.level} spell slot`
                        : castCost?.metamagicCost
                          ? `Cantrip · ${castCost.metamagicCost} ${resourceLabel} Metamagic`
                          : "Cantrips do not use slots"}
              </p>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
