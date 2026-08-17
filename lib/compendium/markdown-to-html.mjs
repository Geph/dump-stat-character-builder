/** ESM copy of markdown helpers for .mjs scripts (SRD seed parser). */

export function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function isHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

export function applyInlineMarkdown(text, escape) {
  let out = escape ? escapeHtml(text) : text
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>")
  out = out.replace(/_([^_\n]+)_/g, "<em>$1</em>")
  out = out.replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
  return out
}

export function markdownInlineToHtml(text) {
  return applyInlineMarkdown(text, true)
}

function markdownInlineInHtmlDocument(value) {
  return value.replace(/(<[^>]+>)|([^<]+)/g, (match, tag, text) => {
    if (tag) return tag
    if (!text) return match
    return applyInlineMarkdown(text, false)
  })
}

export function markdownToHtml(value) {
  if (!value?.trim()) return ""
  if (isHtml(value)) return markdownInlineInHtmlDocument(value)

  return value
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
