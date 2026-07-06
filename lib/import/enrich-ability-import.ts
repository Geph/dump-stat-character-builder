import { enrichFeatureWithMechanicalDetection } from "@/lib/compendium/enrich-feature-mechanical-detection"
import { syncModifierRefs } from "@/lib/compendium/linked-modifiers"
import { enrichAbilityPsionicAugments } from "@/lib/import/normalize-ability-import"
import { detectPsiPointCost } from "@/lib/import/enrich-import-classes"
import type { Feature } from "@/lib/types"

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function parseCastingHeaders(description: string): {
  casting_time?: string
  range?: string
  components?: string[]
  duration?: string
  concentration?: boolean
} {
  const plain = stripHtml(description)
  const headers: ReturnType<typeof parseCastingHeaders> = {}
  const castingMatch = plain.match(/\bCasting Time:\s*([^\n]+)/i)
  if (castingMatch) headers.casting_time = castingMatch[1].trim()
  const rangeMatch = plain.match(/\bRange:\s*([^\n]+)/i)
  if (rangeMatch) headers.range = rangeMatch[1].trim()
  const componentsMatch = plain.match(/\bComponents?:\s*([^\n]+)/i)
  if (componentsMatch) {
    headers.components = componentsMatch[1]
      .split(/[,;]+/)
      .map((part) => part.trim())
      .filter(Boolean)
  }
  const durationMatch = plain.match(/\bDuration:\s*([^\n]+)/i)
  if (durationMatch) {
    headers.duration = durationMatch[1].trim()
    headers.concentration = /concentration/i.test(durationMatch[1])
  }
  return headers
}

/** Wire psi costs, psionic augments, casting headers, and mechanical detection onto imported abilities. */
export function enrichAbilityImportRow(row: Record<string, unknown>): Record<string, unknown> {
  const name = String(row.name ?? "")
  const descriptionHtml = typeof row.description === "string" ? row.description : ""
  const plainText = stripHtml(descriptionHtml)

  let next = enrichAbilityPsionicAugments({
    name,
    description: descriptionHtml,
    psionic_augments:
      (row.psionic_augments as import("@/lib/compendium/parse-psionic-augments").PsionicAugmentsConfig | null) ??
      null,
  })

  const headers = parseCastingHeaders(descriptionHtml)
  const detected = enrichFeatureWithMechanicalDetection(
    {
      name,
      description: plainText,
      linkedModifiers: (row.linked_modifiers ?? row.linkedModifiers ?? []) as unknown as Feature["linkedModifiers"],
      modifierRefs: (row.modifier_refs ?? row.modifierRefs ?? []) as string[],
    } as Feature,
    {
      contentKind: "feat",
      sourceName: String(row.source_name ?? name),
      featureName: name,
    },
  )

  const synced = syncModifierRefs({
    linkedModifiers: detected.linkedModifiers ?? [],
    modifierRefs: detected.modifierRefs,
  })

  const psiCost = detectPsiPointCost(plainText)
  const uses =
    psiCost != null
      ? {
          type: "class_resource" as const,
          classResourceKey: "psi_points",
          classResourceAmount: psiCost,
        }
      : row.uses

  return {
    ...row,
    ...next,
    ...headers,
    ...(uses ? { uses } : {}),
    prerequisites:
      (typeof row.prerequisite === "string" ? row.prerequisite : null) ??
      (typeof row.prerequisites === "string" ? row.prerequisites : null) ??
      null,
    repeatable: Boolean(row.repeatable),
    linked_modifiers: synced.linkedModifiers,
    linkedModifiers: synced.linkedModifiers,
    modifier_refs: synced.modifierRefs,
    modifierRefs: synced.modifierRefs,
  }
}

export function enrichAbilityImportRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(enrichAbilityImportRow)
}
