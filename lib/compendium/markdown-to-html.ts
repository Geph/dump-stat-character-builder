import { escapeHtml, isHtml } from "@/lib/compendium/html-utils"

/** `class_resources.charnel_touch` → `Charnel Touch` so catalog keys never show on the sheet. */
export function humanizeCatalogResourceRefs(text: string): string {
  return text.replace(
    /\b(?:class_resources|class_resource)\.([a-z][a-z0-9]*(?:_[a-z0-9]+)*)\b/gi,
    (_, key: string) =>
      key
        .split(/[_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
  )
}

/** Apply **bold** / _italic_ (and *italic*) markers. Optionally escape HTML first. */
export function applyInlineMarkdown(text: string, escape: boolean): string {
  let out = escape ? escapeHtml(text) : text
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>")
  // Mid-word underscores are identifiers (class_resources), not italic.
  out = out.replace(/(^|[^A-Za-z0-9])_([^_\n]+)_/g, "$1<em>$2</em>")
  out = out.replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
  return out
}

/** Convert inline markdown (**bold**, _italic_) to HTML. Escapes plain text first. */
export function markdownInlineToHtml(text: string): string {
  return applyInlineMarkdown(text, true)
}

/**
 * Convert markdown markers that appear in text segments between HTML tags.
 * Does not escape (text is already HTML body content).
 */
function markdownInlineInHtmlDocument(value: string): string {
  return value.replace(/(<[^>]+>)|([^<]+)/g, (match, tag: string | undefined, text: string | undefined) => {
    if (tag) return tag
    if (!text) return match
    return applyInlineMarkdown(text, false)
  })
}

/**
 * Convert plain text / markdown blocks to HTML paragraphs.
 * Also converts leftover ** / _ markers inside existing HTML (e.g. SRD tables + bold headings).
 */
export function markdownToHtml(value: string): string {
  if (!value?.trim()) return ""
  const prepared = humanizeCatalogResourceRefs(value)
  if (isHtml(prepared)) return markdownInlineInHtmlDocument(prepared)

  return prepared
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ""
      const lines = trimmed.split(/\n/)
      const inner = lines.map((line) => markdownInlineToHtml(line)).join("<br>")
      return `<p>${inner}</p>`
    })
    .filter(Boolean)
    .join("")
}
