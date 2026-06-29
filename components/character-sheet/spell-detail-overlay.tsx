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
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import { rollD20, d20CriticalSuffix } from "@/components/character-sheet/d20-roll-button"
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
  }) => void
  canUseSlot: boolean
  psiLimit?: number | null
}

export function SpellDetailOverlay({
  spell,
  spellAttackMod,
  activeConcentration,
  onClose,
  onCast,
  canUseSlot,
  psiLimit,
}: SpellDetailOverlayProps) {
  const [castFeedback, setCastFeedback] = useState<string | null>(null)
  const [concentrationWarningOpen, setConcentrationWarningOpen] = useState(false)
  const [augmentSelections, setAugmentSelections] = useState<PsionicAugmentSelection[]>([])
  const history = useSheetRollHistory()
  const psionicAugments = resolveSpellPsionicAugments(spell)
  const needsAttack = spellRequiresAttack(spell.description)
  const isCantrip = spell.level === 0

  useEffect(() => {
    setConcentrationWarningOpen(false)
    setCastFeedback(null)
    setAugmentSelections([])
  }, [spell.id])

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
    } = {}

    const feedbackParts: string[] = []

    if (needsAttack && spellAttackMod != null) {
      result.attackRoll = rollD20(spellAttackMod)
      const attackSummary = `${result.attackRoll.natural}${spellAttackMod >= 0 ? ` + ${spellAttackMod}` : ` − ${Math.abs(spellAttackMod)}`} = ${result.attackRoll.total}${d20CriticalSuffix(result.attackRoll.natural)}`
      feedbackParts.push(`Attack: ${attackSummary}`)
      history?.logRoll({
        kind: "spell",
        label: `${spell.name} attack`,
        summary: attackSummary,
        natural: result.attackRoll.natural,
      })
    }
    if (spell.concentration) {
      result.concentrationApplied = concentrationConditionName(spell.name)
      feedbackParts.push(`Concentration: ${spell.name}`)
    }
    if (!isCantrip && canUseSlot) {
      result.slotUsed = true
      feedbackParts.push(`Used 1 level ${spell.level} slot`)
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
            {spell.range && (
              <>
                <dt className="text-muted-foreground">Range</dt>
                <dd className="text-foreground">{spell.range}</dd>
              </>
            )}
            {spell.duration && (
              <>
                <dt className="text-muted-foreground">Duration</dt>
                <dd className="text-foreground">{spell.duration}</dd>
              </>
            )}
            {spell.components?.length ? (
              <>
                <dt className="text-muted-foreground">Components</dt>
                <dd className="text-foreground">{spell.components.join(", ")}</dd>
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
                  disabled={!isCantrip && !canUseSlot}
                  className="flex-1 px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-600/90 transition-colors disabled:opacity-50"
                >
                  End prior & cast
                </button>
              </div>
            </div>
          )}
          {!isCantrip && !canUseSlot && (
            <p className="text-xs text-destructive text-center">No {spell.level} slots remaining</p>
          )}
          {!concentrationWarningOpen && (
            <>
              <button
                type="button"
                onClick={handleCastClick}
                disabled={!isCantrip && !canUseSlot}
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
                {!isCantrip && "Uses one spell slot"}
                {isCantrip && "Cantrips do not use slots"}
              </p>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
