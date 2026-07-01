function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

/**
 * Removes Foundry-specific enrichers from HTML/markdown so descriptions render
 * cleanly: @UUID/@Compendium/@Check/@Damage links, &Reference blocks, and
 * inline roll syntax like [[/r 1d6]].
 */
export function cleanFoundryHtml(raw: unknown): string {
  let text = asString(raw)
  if (!text) return ""

  text = text.replace(/[@&][A-Za-z]+\[[^\]]*\]\{([^}]*)\}/g, "$1")
  text = text.replace(/[@&][A-Za-z]+\[[^\]]*\]/g, "")
  text = text.replace(/\[\[[^\]]*\]\]\{([^}]*)\}/g, "$1")
  text = text.replace(/\[\[\s*\/?[a-z]*\s*([^\]]*?)\s*\]\]/gi, "$1")
  text = text.replace(/[ \t]{2,}/g, " ").replace(/\s+\n/g, "\n")

  return text.trim()
}
