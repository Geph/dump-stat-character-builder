/** Character threshold for showing the picker hint info overlay. */
export const FEATURE_CHOICE_HINT_MAX_CHARS = 120

const SENTENCE_ABBREVIATION = /\b(?:e\.g|i\.e|etc|vs)\.$/i

export function stripFeatureHintHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

/** First sentence of picker/feature prose, ignoring common abbreviations. */
export function firstSentenceFromText(text: string): string {
  const plain = stripFeatureHintHtml(text)
  if (!plain) return ""
  for (let index = 0; index < plain.length; index += 1) {
    const char = plain[index]
    if (char !== "." && char !== "!" && char !== "?") continue
    const rest = plain.slice(index + 1).trimStart()
    if (!rest) return plain.slice(0, index + 1).trim()
    if (!/^[A-Z]/.test(rest)) continue
    const before = plain.slice(0, index + 1)
    if (SENTENCE_ABBREVIATION.test(before)) continue
    return before.trim()
  }
  return plain
}

export function featureChoiceHintFromDescription(description: string | null | undefined): {
  preview: string
  details: string
  showDetails: boolean
} | null {
  const raw = description?.trim()
  if (!raw) return null
  const detailsPlain = stripFeatureHintHtml(raw)
  if (!detailsPlain) return null
  const preview = firstSentenceFromText(detailsPlain)
  const showDetails =
    detailsPlain.length > FEATURE_CHOICE_HINT_MAX_CHARS || detailsPlain !== preview
  return {
    preview,
    details: raw,
    showDetails,
  }
}
