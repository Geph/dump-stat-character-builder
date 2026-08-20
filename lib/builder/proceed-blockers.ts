import { BUILDER_STEP_IDS } from "@/lib/builder/builder-constants"

export type BuilderBlocker = {
  message: string
  stepId: number
  targetId?: string
}

export function asBuilderBlockers(messages: string[], stepId: number): BuilderBlocker[] {
  return messages.map((message) => ({
    message,
    stepId,
    targetId: inferBlockerTarget(message, stepId),
  }))
}

export function inferBlockerTarget(message: string, stepId: number): string | undefined {
  const text = message.toLowerCase()
  const modifierChoice = message.match(/^([^:]+):\s*(.+?)\s+\(\d+\/\d+\)/)
  if (modifierChoice && /\blanguage(s)?\b/i.test(modifierChoice[2])) {
    return builderChoiceTargetId(modifierChoice[1], modifierChoice[2])
  }
  if (text.includes("name") && (text.includes("details") || stepId === BUILDER_STEP_IDS.DETAILS)) {
    return "builder-details-name"
  }
  if (text.includes("species")) return "builder-origin-species"
  if (text.includes("background")) return "builder-origin-background"
  if (text.includes("subclass")) return "builder-class-subclass"
  if (text.includes("skill")) return "builder-class-skills"
  if (text.includes("tool")) return "builder-class-tools"
  if (text.includes("feat")) return "builder-class-feats"
  if (text.includes("spell")) return "builder-spells"
  if (text.includes("ability score") || text.includes("standard array") || text.includes("point")) {
    return "builder-abilities"
  }
  if (text.includes("equipment") || text.includes("gear")) return "builder-gear"
  const quoted = message.match(/[“"]([^”"]+)[”"]/)
  if (quoted?.[1]) return `builder-choice-${slugAnchor(quoted[1])}`
  return undefined
}

export function slugAnchor(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function builderChoiceTargetId(sourceLabel: string, choiceLabel: string): string {
  return `builder-choice-${slugAnchor(sourceLabel)}-${slugAnchor(choiceLabel)}`
}

export function scrollToBuilderTarget(targetId: string | undefined): void {
  if (!targetId || typeof document === "undefined") return
  const el = document.getElementById(targetId)
  if (!el) return
  el.scrollIntoView({ behavior: "smooth", block: "center" })
  el.classList.add("ring-2", "ring-primary")
  window.setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 1600)
}
