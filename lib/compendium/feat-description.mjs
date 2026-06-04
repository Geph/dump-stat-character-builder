/**
 * Normalize feat descriptions: drop boilerplate intros and number benefit bullets.
 */
export function formatFeatDescription(raw) {
  if (!raw || typeof raw !== "string") return raw

  let text = raw.replace(/_[^_]+_/g, "").trim()

  text = text.replace(
    /^you have (?:studied|learned)[^.]*\.\s*/i,
    "",
  )
  text = text.replace(
    /^you gain the following benefits?\.?\s*/i,
    "",
  )
  text = text.replace(
    /^the following benefits? apply[^.]*\.\s*/i,
    "",
  )

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)

  if (paragraphs.length > 1) {
    return paragraphs
      .map((p, i) => `${i + 1}. ${p}`)
      .join("\n\n")
      .slice(0, 4000)
  }

  const lines = text
    .split(/\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)

  if (lines.length > 1) {
    return lines
      .map((p, i) => `${i + 1}. ${p}`)
      .join("\n\n")
      .slice(0, 4000)
  }

  return text.slice(0, 4000)
}
