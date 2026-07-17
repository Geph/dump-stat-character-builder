import type { CompanionStatBlockTemplate } from "@/lib/character/companion-stat-block"
import { parseCreatureStatBlock } from "@/lib/character/parse-creature-stat-block"
import type { ImportContent } from "@/lib/import/content-schema"

type CreatureImportRow = NonNullable<ImportContent["creatures"]>[number]

function isCompanionStatBlock(value: unknown): value is CompanionStatBlockTemplate {
  if (!value || typeof value !== "object") return false
  const row = value as Record<string, unknown>
  return (
    typeof row.name === "string" &&
    row.ac != null &&
    row.hp != null &&
    Array.isArray(row.traits) &&
    Array.isArray(row.actions)
  )
}

/**
 * Map import creatures[] rows onto the creatures table shape, parsing MM prose from
 * description when no structured stat_block is present.
 */
export function buildCreaturePersistRows(
  creatures: CreatureImportRow[],
  source: string,
): Record<string, unknown>[] {
  return creatures.map((creature) => {
    const prose =
      (typeof creature.description === "string" && creature.description.trim()) ||
      ""
    const structured = isCompanionStatBlock(creature.stat_block) ? creature.stat_block : null
    const parsed = structured
      ? null
      : prose
        ? parseCreatureStatBlock(prose, creature.name)
        : null

    const template: CompanionStatBlockTemplate =
      structured ??
      parsed?.template ?? {
        name: creature.name,
        ac: { parts: [{ type: "fixed", value: 10 }] },
        hp: { parts: [{ type: "fixed", value: 1 }] },
        traits: [],
        actions: [],
      }

    return {
      name: creature.name,
      description: prose || null,
      creature_type: creature.creature_type ?? parsed?.creatureType ?? null,
      size: creature.size ?? parsed?.size ?? null,
      alignment: creature.alignment ?? parsed?.alignment ?? null,
      cr: creature.cr ?? parsed?.cr ?? null,
      stat_block: { ...template, name: creature.name },
      prerequisite_rules: creature.prerequisite_rules ?? null,
      source: creature.source?.trim() || source,
    }
  })
}
