/**
 * Parse "choose one of the following" benefit lists into sheet menu options.
 * Economy phrases on a single option (e.g. Assault's Bonus Action) stay on that option.
 */

export type ChooseOneActionKind = "action" | "bonus" | "reaction"

export type ChooseOneNamedOption = {
  name: string
  description: string
  actionKind?: ChooseOneActionKind
}

/** In-play menus only. "Choose one of the following damage types" is a builder pick, not a Use menu. */
export const CHOOSE_ONE_FOLLOWING_RE = /\bchoose one of the following(?: benefits)?(?:\.|:)\s/i

const OPTION_ACTION_KIND_PATTERNS: { re: RegExp; kind: ChooseOneActionKind }[] = [
  { re: /\bas a bonus action\b/i, kind: "bonus" },
  { re: /\ba bonus action\b/i, kind: "bonus" },
  { re: /\bas a reaction\b/i, kind: "reaction" },
  { re: /\ba reaction\b/i, kind: "reaction" },
  { re: /\bas an? (?:magic )?action\b/i, kind: "action" },
]

const SENTENCE_STARTERS =
  /^(When|Whenever|Once|If|While|After|Before|You|Your|The|This|Each|All|Additionally|Also)\b/i

function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
}

/** Feature intro before a choose-one list — used so option-only economy does not classify the parent. */
export function descriptionBeforeChooseOneOptions(description: string | null | undefined): string {
  const text = stripHtml(description ?? "")
  const idx = text.search(CHOOSE_ONE_FOLLOWING_RE)
  return idx >= 0 ? text.slice(0, idx) : text
}

export function inferMenuOptionActionKind(text: string | null | undefined): ChooseOneActionKind | undefined {
  if (!text) return undefined
  const kinds = new Set<ChooseOneActionKind>()
  for (const { re, kind } of OPTION_ACTION_KIND_PATTERNS) {
    if (re.test(text)) kinds.add(kind)
  }
  return kinds.size === 1 ? [...kinds][0] : undefined
}

export function parseChooseOneNamedOptions(
  description: string | null | undefined,
): ChooseOneNamedOption[] {
  const raw = stripHtml(description ?? "").trim()
  const splitAt = raw.search(CHOOSE_ONE_FOLLOWING_RE)
  if (splitAt < 0) return []
  const rest = raw
    .slice(splitAt)
    .replace(/^[\s\S]*?following(?: benefits)?\.?\s*/i, "")
    .trim()
  if (!rest) return []

  const optionRe =
    /([A-Z][A-Za-z0-9'/-]*(?:[ \t]+[A-Z][A-Za-z0-9'/-]*){0,4})\.\s+([\s\S]*?)(?=\s+[A-Z][A-Za-z0-9'/-]*(?:[ \t]+[A-Z][A-Za-z0-9'/-]*){0,4}\.\s+|$)/g
  const options: ChooseOneNamedOption[] = []
  for (const match of rest.matchAll(optionRe)) {
    const name = match[1]?.replace(/\s+/g, " ").trim() ?? ""
    const optionDescription = match[2]?.replace(/\s+/g, " ").trim() ?? ""
    if (!name || !optionDescription) continue
    if (SENTENCE_STARTERS.test(name)) continue
    if (/^repeatable$/i.test(name)) continue
    if (name.length > 40) continue
    options.push({
      name,
      description: optionDescription,
      actionKind: inferMenuOptionActionKind(optionDescription),
    })
  }
  return options.length >= 2 ? options : []
}
