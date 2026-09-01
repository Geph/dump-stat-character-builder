/**
 * Cheap per-cast spell mutations. `range` / `duration` stay free-text strings — this only
 * annotates the cast card. Do not invent a `mechanics[]` cost schema for Distant / Extended.
 */

export type MetamagicEffectHint =
  | "empowered_reroll"
  | "quicken"
  | "distant"
  | "extended"
  | "twinned"
  | "subtle"
  | null

export type SpellDisplayFields = {
  range?: string | null
  duration?: string | null
  components?: string[] | null
  targetsNote?: string | null
}

export type MutatedSpellDisplay = {
  range: string | null
  duration: string | null
  components: string[] | null
  targetsNote: string | null
  notes: string[]
}

export function inferMetamagicEffectHint(name: string): MetamagicEffectHint {
  if (/empowered/i.test(name)) return "empowered_reroll"
  if (/quickened/i.test(name)) return "quicken"
  if (/distant/i.test(name)) return "distant"
  if (/extended/i.test(name)) return "extended"
  if (/twinned/i.test(name)) return "twinned"
  if (/subtle/i.test(name)) return "subtle"
  return null
}

function doubleDurationText(text: string): { next: string; capped: boolean } {
  let capped = false
  const next = text.replace(
    /(\d+(?:\.\d+)?)\s*(round|minute|hour|day)s?\b/gi,
    (_all, raw: string, unit: string) => {
      const value = Number(raw)
      if (!Number.isFinite(value)) return _all
      let doubled = value * 2
      if (/^hour/i.test(unit) && doubled > 24) {
        doubled = 24
        capped = true
      }
      const plural = doubled === 1 ? unit.replace(/s$/i, "") : /s$/i.test(unit) ? unit : `${unit}s`
      return `${doubled === 24 && /^hour/i.test(unit) ? 24 : doubled} ${plural}`
    },
  )
  return { next, capped }
}

function applyDistantRange(range: string): string | null {
  const trimmed = range.trim()
  if (!trimmed || /^self\b/i.test(trimmed)) return null
  if (/^touch$/i.test(trimmed)) return "30 feet"
  const next = trimmed.replace(/(\d+)\s*(feet|foot|ft\.?)/gi, (_all, raw: string, unit: string) => {
    const doubled = Number(raw) * 2
    const label = /^foot$/i.test(unit) ? "feet" : unit
    return `${doubled} ${label}`
  })
  return next === trimmed ? null : next
}

export function applySpellDisplayMutations(
  fields: SpellDisplayFields,
  hints: MetamagicEffectHint[],
): MutatedSpellDisplay {
  const notes: string[] = []
  let range = fields.range?.trim() || null
  let duration = fields.duration?.trim() || null
  let components = fields.components?.length ? [...fields.components] : null
  let targetsNote = fields.targetsNote ?? null

  if (hints.includes("distant") && range) {
    const mutated = applyDistantRange(range)
    if (mutated) {
      range = mutated
      notes.push("Distant: range doubled (Touch becomes 30 feet)")
    }
  }

  if (hints.includes("extended") && duration) {
    const { next, capped } = doubleDurationText(duration)
    if (next !== duration) {
      duration = next
      notes.push(capped ? "Extended: duration doubled (capped at 24 hours)" : "Extended: duration doubled")
    }
  }

  if (hints.includes("twinned") && !/^self\b/i.test(range ?? "")) {
    targetsNote = "Twinned: one additional creature of the same type in range"
    notes.push("Twinned: one additional target")
  }

  if (hints.includes("subtle") && components?.length) {
    const next = components.filter((part) => !/^[VS]$/i.test(part.trim()))
    if (next.length !== components.length) {
      components = next
      notes.push("Subtle: Verbal and Somatic components dropped")
    }
  }

  return { range, duration, components, targetsNote, notes }
}
