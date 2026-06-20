/** ESM copy of markdown inline helper for .mjs scripts. */

export function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function markdownInlineToHtml(text) {
  let out = escapeHtml(text)
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>")
  out = out.replace(/_([^_\n]+)_/g, "<em>$1</em>")
  out = out.replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
  return out
}
