import { escapeHtml } from "@/lib/compendium/rich-text-html"

/** Convert inline markdown (**bold**, _italic_) to HTML. */
export function markdownInlineToHtml(text: string): string {
  let out = escapeHtml(text)
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>")
  out = out.replace(/_([^_\n]+)_/g, "<em>$1</em>")
  out = out.replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
  return out
}

/** Convert plain text / markdown blocks to HTML paragraphs. Preserves existing HTML. */
export function markdownToHtml(value: string): string {
  if (!value?.trim()) return ""
  if (/<\/?[a-z][\s\S]*>/i.test(value)) return value

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
