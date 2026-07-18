import {
  extractPrerequisiteFromDescription,
  parseMinimumLevelFromPrerequisite,
} from "@/lib/builder/choice-prerequisite"
import { enrichFeatureWithMechanicalDetection } from "@/lib/compendium/enrich-feature-mechanical-detection"
import { syncModifierRefs } from "@/lib/compendium/linked-modifiers"
import { enrichAbilityPsionicAugments } from "@/lib/import/normalize-ability-import"
import { nestPsionicAbilityLibrary } from "@/lib/import/nest-psionic-ability-library"
import { detectPsiPointCost } from "@/lib/import/enrich-import-classes"
import { isCompanionStatBlockFeature } from "@/lib/character/companion-recognition"
import { parseCompanionStatBlock } from "@/lib/character/parse-companion-stat-block"
import {
  alternateEffectsSpellsKnownModifier,
  applySpecializationAlternateEffectsChoice,
  parseAlternateEffectsCostRows,
} from "@/lib/import/parse-alternate-effects-table"
import {
  ensureSpecialAttackActivation,
  specialAttackModifierFromPowerDescription,
} from "@/lib/import/parse-special-attack-from-power"
import { isModifierRedundantAgainst } from "@/lib/import/detect-feature-modifiers"
import type { Feature } from "@/lib/types"

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function parseCastingHeaders(description: string): {
  casting_time?: string
  execution?: string
  range?: string
  components?: string[]
  duration?: string
  concentration?: boolean
} {
  const plain = stripHtml(description)
  const headers: ReturnType<typeof parseCastingHeaders> = {}
  const castingMatch = plain.match(/\bCasting Time:\s*([^\n]+)/i)
  if (castingMatch) headers.casting_time = castingMatch[1].trim()
  const executionMatch = plain.match(/\b(?:Execution|Activation|Trigger):\s*([^\n<]+)/i)
  if (executionMatch) headers.execution = executionMatch[1].trim()
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

  const isPsionicPower = row.ability_role === "psionic_power"
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
      suppressPhraseDetection: isPsionicPower,
    },
  )

  let linkedModifiers = detected.linkedModifiers ?? []
  const altEffects = alternateEffectsSpellsKnownModifier(
    parseAlternateEffectsCostRows(descriptionHtml),
    `import_ability_${name.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`,
  )
  if (altEffects && !isModifierRedundantAgainst(altEffects, linkedModifiers)) {
    linkedModifiers = [...linkedModifiers, altEffects]
  }

  const rangeForAttack =
    (typeof row.range === "string" && row.range.trim() ? row.range.trim() : null) ??
    headers.range ??
    null
  const castingTimeForAttack =
    (typeof row.casting_time === "string" && row.casting_time.trim()
      ? row.casting_time.trim()
      : null) ??
    headers.casting_time ??
    (typeof row.execution === "string" && row.execution.trim() ? row.execution.trim() : null) ??
    headers.execution ??
    null
  if (
    isPsionicPower ||
    Boolean(headers.casting_time) ||
    Boolean(typeof row.casting_time === "string" && row.casting_time.trim())
  ) {
    const alreadyHasSpecialAttack = linkedModifiers.some((instance) =>
      instance.characteristics?.some((char) => char.type === "special_attack"),
    )
    if (!alreadyHasSpecialAttack) {
      const specialAttack = specialAttackModifierFromPowerDescription(descriptionHtml, {
        name,
        range: rangeForAttack,
        castingTime: castingTimeForAttack,
        instanceKey: name,
      })
      if (specialAttack && !isModifierRedundantAgainst(specialAttack, linkedModifiers)) {
        linkedModifiers = [...linkedModifiers, specialAttack]
      }
    }
    linkedModifiers = ensureSpecialAttackActivation(linkedModifiers, castingTimeForAttack)
  }

  const synced = syncModifierRefs({
    linkedModifiers,
    modifierRefs: detected.modifierRefs,
  })

  const companionStatBlock =
    row.companion_stat_block ??
    (isCompanionStatBlockFeature({ name, description: descriptionHtml })
      ? parseCompanionStatBlock(name, descriptionHtml)
      : null)

  // Augmented powers (Kibbles Psion) have a free base use — "N psi points" mentions in the
  // description belong to individual augments, not an activation cost.
  const hasAugments = Boolean(
    (next.psionic_augments as { augments?: unknown[] } | null | undefined)?.augments?.length,
  )
  const psiCost = hasAugments ? null : detectPsiPointCost(plainText)
  const uses =
    psiCost != null
      ? {
          type: "class_resource" as const,
          classResourceKey: "psi_points",
          classResourceAmount: psiCost,
        }
      : row.uses

  const explicitPrerequisite =
    (typeof row.prerequisite === "string" && row.prerequisite.trim()
      ? row.prerequisite.trim()
      : null) ??
    (typeof row.prerequisites === "string" && row.prerequisites.trim()
      ? row.prerequisites.trim()
      : null)
  const scrapedPrerequisite = extractPrerequisiteFromDescription(descriptionHtml)
  const prerequisites = explicitPrerequisite ?? scrapedPrerequisite

  const existingLevel =
    typeof row.level_requirement === "number" && Number.isFinite(row.level_requirement)
      ? row.level_requirement
      : null
  const inferredLevel = parseMinimumLevelFromPrerequisite(prerequisites)
  const level_requirement = existingLevel ?? inferredLevel

  let choices = row.choices as Feature["choices"] | undefined
  if (choices?.options?.length) {
    choices = {
      ...choices,
      options: choices.options.map((option) => {
        const withPrereq = option.prerequisite?.trim()
          ? option
          : (() => {
              const scraped = extractPrerequisiteFromDescription(option.description)
              return scraped ? { ...option, prerequisite: scraped } : option
            })()
        if (withPrereq.linkedModifiers?.length) return withPrereq
        const optionDetected = enrichFeatureWithMechanicalDetection(
          {
            name: `${name}:${withPrereq.name}`,
            description: stripHtml(withPrereq.description ?? ""),
            linkedModifiers: withPrereq.linkedModifiers,
            modifierRefs: withPrereq.modifierRefs,
          } as Feature,
          {
            contentKind: "feat",
            sourceName: String(row.source_name ?? name),
            featureName: `${name}:${withPrereq.name}`,
          },
        )
        if (!optionDetected.linkedModifiers?.length) return withPrereq
        return syncModifierRefs({
          ...withPrereq,
          linkedModifiers: optionDetected.linkedModifiers,
        })
      }),
    }
  }

  const enrichedRow: Record<string, unknown> = {
    ...row,
    ...next,
    ...headers,
    ...(typeof row.execution === "string" && row.execution.trim()
      ? { execution: row.execution.trim() }
      : headers.execution
        ? { execution: headers.execution }
        : {}),
    ...(Array.isArray(row.eligible_classes)
      ? {
          eligible_classes: (row.eligible_classes as unknown[]).filter(
            (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
          ),
        }
      : {}),
    ...(uses ? { uses } : {}),
    ...(choices ? { choices } : {}),
    ...(companionStatBlock ? { companion_stat_block: companionStatBlock } : {}),
    prerequisites,
    prerequisite: prerequisites,
    ...(level_requirement != null ? { level_requirement } : {}),
    repeatable: Boolean(row.repeatable),
    linked_modifiers: synced.linkedModifiers,
    linkedModifiers: synced.linkedModifiers,
    modifier_refs: synced.modifierRefs,
    modifierRefs: synced.modifierRefs,
  }

  return applySpecializationAlternateEffectsChoice(enrichedRow)
}

export function enrichAbilityImportRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return nestPsionicAbilityLibrary(rows.map(enrichAbilityImportRow))
}
