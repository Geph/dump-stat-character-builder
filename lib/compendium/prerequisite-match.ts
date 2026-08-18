/** True when a free-text prerequisite mentions the given class/species name as a phrase. */
export function prerequisiteMentionsName(
  prerequisite: string | null | undefined,
  name: string,
): boolean {
  const text = prerequisite?.trim()
  const needle = name.trim()
  if (!text || !needle) return false
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(?:^|[^\\w])${escaped}(?:[^\\w]|$)`, "i").test(text)
}
