import { SRD_CLASS_ICONS_BY_NAME } from "@/lib/compendium/class-icons-defaults"
import type { Feature, FeatureChoice } from "@/lib/types"

function isFeatChoiceFeature(feature: Feature): boolean {
  return feature.isChoice === true && feature.choices?.kind === "feats"
}

function featChoiceForFeature(name: string, level: number): FeatureChoice | null {
  if (/ability score improvement/i.test(name)) {
    return {
      kind: "feats",
      category: "General Feat",
      count: 1,
      featCategories: ["General"],
      options: [],
    }
  }
  if (/epic boon/i.test(name)) {
    return {
      kind: "feats",
      category: "Epic Boon",
      count: 1,
      featCategories: ["Epic Boon"],
      options: [],
    }
  }
  if (/fighting style/i.test(name) && /choose|select/i.test(name)) {
    return {
      kind: "feats",
      category: "Fighting Style",
      count: 1,
      featCategories: ["Fighting Style"],
      options: [],
    }
  }
  if (level === 4 || level === 8 || level === 12 || level === 16) {
    if (/feat|improvement|boons?/i.test(name)) {
      return {
        kind: "feats",
        category: "General Feat",
        count: 1,
        featCategories: ["General"],
        options: [],
      }
    }
  }
  return null
}

function ensureMilestoneFeatFeatures(features: Feature[]): Feature[] {
  const result = features.map((feature) => ({ ...feature }))
  const asiTemplate = result.find((feature) => /ability score improvement/i.test(feature.name))
  const epicTemplate = result.find((feature) => /epic boon/i.test(feature.name))

  for (const level of [4, 8, 12, 16]) {
    const existing = result.some(
      (feature) => feature.level === level && isFeatChoiceFeature(feature),
    )
    if (existing) continue
    if (!asiTemplate && level !== 4) continue
    result.push({
      level,
      name: asiTemplate?.name ?? "Ability Score Improvement",
      description:
        asiTemplate?.description ??
        "Increase one ability score by 2 or two ability scores by 1, or choose a General feat.",
      isChoice: true,
      choices: {
        kind: "feats",
        category: "General Feat",
        count: 1,
        featCategories: ["General"],
        options: [],
      },
    })
  }

  if (
    epicTemplate &&
    !result.some((feature) => feature.level === 19 && isFeatChoiceFeature(feature))
  ) {
    result.push({
      level: 19,
      name: epicTemplate.name,
      description: epicTemplate.description,
      isChoice: true,
      choices: {
        kind: "feats",
        category: "Epic Boon",
        count: 1,
        featCategories: ["Epic Boon"],
        options: [],
      },
    })
  }

  return result.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
}

function enrichFeatures(features: unknown): Feature[] {
  if (!Array.isArray(features)) return []
  const mapped = features.map((raw) => {
    const feature = raw as Feature
    if (isFeatChoiceFeature(feature)) return feature
    const featChoices = featChoiceForFeature(feature.name ?? "", feature.level ?? 1)
    if (!featChoices) return feature
    return {
      ...feature,
      isChoice: true,
      choices: featChoices,
    }
  })
  return ensureMilestoneFeatFeatures(mapped)
}

function normalizeSpellcasting(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null
  const spellcasting = { ...(raw as Record<string, unknown>) }
  if (spellcasting.starts_at == null) spellcasting.starts_at = 1
  return spellcasting
}

/** Apply SRD defaults: feat-granting features, icons, spellcasting starts_at. */
export function enrichSrdClassRow(row: Record<string, unknown>): Record<string, unknown> {
  const name = String(row.name ?? "")
  const features = enrichFeatures(row.features)
  const icon =
    typeof row.icon === "string" && row.icon.trim()
      ? row.icon.trim()
      : SRD_CLASS_ICONS_BY_NAME[name] ?? null

  return {
    ...row,
    icon,
    features,
    spellcasting: normalizeSpellcasting(row.spellcasting),
  }
}

export function enrichSrdClassList(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(enrichSrdClassRow)
}
