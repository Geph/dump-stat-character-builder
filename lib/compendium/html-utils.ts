/** Shared HTML helpers with no markdown imports (avoids circular deps). */

export function isHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
