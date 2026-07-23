import type { CompanionStatBlockTemplate } from "@/lib/character/companion-stat-block"
import { isCompanionStatBlockFeature } from "@/lib/character/companion-recognition"
import { parseCompanionStatBlock } from "@/lib/character/parse-companion-stat-block"
import type { ImportContent } from "@/lib/import/content-schema"
import type { CreatureImportRow } from "@/lib/import/creature-import-v2-schema"

type Carrier = {
  name?: string | null
  description?: string | null
  companion_stat_block?: CompanionStatBlockTemplate | Record<string, unknown> | null
  companion_stat_blocks?: Array<CompanionStatBlockTemplate | Record<string, unknown>> | null
}

function normalizeCreatureName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

function isUsableTemplate(value: unknown): value is CompanionStatBlockTemplate {
  if (!value || typeof value !== "object") return false
  const row = value as CompanionStatBlockTemplate
  if (!row.name?.trim()) return false
  if (!row.ac || !Array.isArray(row.ac.parts) || !row.ac.parts.length) return false
  if (!row.hp || !Array.isArray(row.hp.parts) || !row.hp.parts.length) return false
  return true
}

function parseSizeTypeAlignment(line: string | null | undefined): {
  size: string | null
  creature_type: string | null
  alignment: string | null
} {
  if (!line?.trim()) return { size: null, creature_type: null, alignment: null }
  const match = line
    .trim()
    .match(
      /^((?:Tiny|Small|Medium|Large|Huge|Gargantuan)(?:\s+or\s+(?:Tiny|Small|Medium|Large|Huge|Gargantuan))?)\s+([^,]+?)(?:,\s*(.+))?$/i,
    )
  if (!match) return { size: null, creature_type: null, alignment: null }
  return {
    size: match[1].trim(),
    creature_type: match[2].trim() || null,
    alignment: match[3]?.trim() || null,
  }
}

function templateToCreatureRow(
  template: CompanionStatBlockTemplate,
  fallbackDescription?: string | null,
): CreatureImportRow {
  const meta = parseSizeTypeAlignment(template.sizeTypeAlignment)
  const category = template.category === "creature" ? "creature" : "companion"
  return {
    name: template.name.trim(),
    description: fallbackDescription?.trim() || null,
    creature_type: meta.creature_type,
    size: meta.size,
    alignment: meta.alignment,
    cr: category === "companion" ? null : (template.cr ?? null),
    category,
    scaling: template.scaling ?? null,
    stat_block: { ...template, name: template.name.trim(), category },
  }
}

function collectTemplatesFromCarrier(carrier: Carrier): CompanionStatBlockTemplate[] {
  const out: CompanionStatBlockTemplate[] = []
  for (const block of carrier.companion_stat_blocks ?? []) {
    if (isUsableTemplate(block)) out.push(block)
  }
  if (isUsableTemplate(carrier.companion_stat_block)) {
    out.push(carrier.companion_stat_block)
  } else if (
    !out.length &&
    carrier.name &&
    isCompanionStatBlockFeature({
      name: carrier.name,
      description: carrier.description ?? "",
    })
  ) {
    const parsed = parseCompanionStatBlock(carrier.name, carrier.description ?? "")
    if (isUsableTemplate(parsed)) out.push(parsed)
  }
  return out
}

/**
 * Promote companion_stat_block / companion_stat_blocks found on features, abilities,
 * spells, feats, and import proposals into top-level creatures[] so they always land
 * in the Creatures & Companions catalog (not only on the sheet via embedded blocks).
 * Existing creatures[] rows with the same name win.
 */
export function hoistCompanionStatBlocksToCreatures(content: ImportContent): ImportContent {
  const existing = [...(content.creatures ?? [])]
  const seen = new Set(
    existing
      .map((row) => (typeof row.name === "string" ? normalizeCreatureName(row.name) : ""))
      .filter(Boolean),
  )
  const additions: CreatureImportRow[] = []

  const consider = (carrier: Carrier) => {
    for (const template of collectTemplatesFromCarrier(carrier)) {
      const key = normalizeCreatureName(template.name)
      if (!key || seen.has(key)) continue
      seen.add(key)
      additions.push(templateToCreatureRow(template, carrier.description))
    }
  }

  for (const cls of content.classes ?? []) {
    for (const feature of cls.features ?? []) consider(feature)
  }
  for (const subclass of content.subclasses ?? []) {
    for (const feature of subclass.features ?? []) consider(feature)
  }
  for (const species of content.species ?? []) {
    for (const trait of species.traits ?? []) consider(trait)
  }
  for (const background of content.backgrounds ?? []) {
    if (background.feature) consider(background.feature)
  }
  for (const feat of content.feats ?? []) consider(feat)
  for (const spell of content.spells ?? []) consider(spell)
  for (const ability of content.abilities ?? []) consider(ability)

  const proposals = content.import_proposals?.custom_abilities ?? []
  for (const ability of proposals) {
    consider({
      name: ability.name,
      description: ability.description,
      companion_stat_block: ability.companion_stat_block as CompanionStatBlockTemplate | null | undefined,
    })
  }

  if (!additions.length) return content
  return {
    ...content,
    creatures: [...existing, ...additions],
  }
}
