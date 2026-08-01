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

/**
 * Repair common LLM JSON paste issues that break JSON.parse:
 * - Raw newlines / tabs / control chars inside string literals
 * - Curly “smart” double quotes used as delimiters
 * - Trailing commas before `}` / `]`
 *
 * Safe on already-valid JSON (no-op for well-formed strings).
 */
export function repairLlmJsonText(text: string): string {
  let out = ""
  let inString = false
  let escaped = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!

    if (!inString) {
      // Curly double quotes outside strings → straight delimiters
      if (ch === "\u201c" || ch === "\u201d") {
        out += '"'
        inString = true
        escaped = false
        continue
      }
      if (ch === '"') {
        out += ch
        inString = true
        escaped = false
        continue
      }
      // Trailing commas: `,]` / `,}` / `,` + whitespace + closer
      if (ch === ",") {
        let j = i + 1
        while (j < text.length && /\s/.test(text[j]!)) j++
        const next = text[j]
        if (next === "}" || next === "]") {
          continue
        }
      }
      out += ch
      continue
    }

    // Inside a string
    if (escaped) {
      out += ch
      escaped = false
      continue
    }
    if (ch === "\\") {
      out += ch
      escaped = true
      continue
    }
    if (ch === '"') {
      out += ch
      inString = false
      continue
    }
    if (ch === "\n") {
      out += "\\n"
      continue
    }
    if (ch === "\r") {
      out += "\\r"
      continue
    }
    if (ch === "\t") {
      out += "\\t"
      continue
    }
    const code = ch.charCodeAt(0)
    if (code < 0x20) {
      out += `\\u${code.toString(16).padStart(4, "0")}`
      continue
    }
    out += ch
  }

  return out
}
