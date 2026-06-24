/** Strip common LLM paste wrappers (markdown fences, leading prose) before JSON.parse. */
export function stripLlmJsonText(raw: string): string {
  let text = raw.trim().replace(/^\uFEFF/, "")

  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i)
  if (fenced) {
    text = fenced[1].trim()
  } else if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim()
  }

  const firstBracket = text.indexOf("[")
  const lastBracket = text.lastIndexOf("]")
  const firstBrace = text.indexOf("{")
  const lastBrace = text.lastIndexOf("}")

  if (
    firstBracket >= 0 &&
    lastBracket > firstBracket &&
    (firstBrace < 0 || firstBracket < firstBrace)
  ) {
    return text.slice(firstBracket, lastBracket + 1)
  }

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1)
  }

  return text
}
