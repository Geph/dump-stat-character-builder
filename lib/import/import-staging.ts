import type { ImportContent } from "@/lib/import/content-schema"

export type ImportStageId =
  | "core"
  | "subclasses"
  | "feats"
  | "spells"
  | "equipment"
  | "proposals"

export type ImportStage = {
  id: ImportStageId
  label: string
  description: string
  counts: Record<string, number>
  total: number
}

const LARGE_IMPORT_THRESHOLDS = {
  subclasses: 2,
  feats: 8,
  spells: 15,
  totalItems: 20,
  charLength: 45000,
}

export function isLargeImport(content: ImportContent, charLength?: number): boolean {
  const subclasses = content.subclasses?.length ?? 0
  const feats = content.feats?.length ?? 0
  const spells = content.spells?.length ?? 0
  const total =
    (content.classes?.length ?? 0) +
    subclasses +
    feats +
    spells +
    (content.abilities?.length ?? 0) +
    (content.class_resources?.length ?? 0) +
    (content.import_proposals?.class_resources?.length ?? 0) +
    (content.import_proposals?.custom_abilities?.length ?? 0)

  return (
    subclasses >= LARGE_IMPORT_THRESHOLDS.subclasses ||
    feats >= LARGE_IMPORT_THRESHOLDS.feats ||
    spells >= LARGE_IMPORT_THRESHOLDS.spells ||
    total >= LARGE_IMPORT_THRESHOLDS.totalItems ||
    (charLength ?? 0) >= LARGE_IMPORT_THRESHOLDS.charLength
  )
}

export function buildImportStages(content: ImportContent): ImportStage[] {
  const stages: ImportStage[] = []

  const coreCounts = {
    classes: content.classes?.length ?? 0,
    species: content.species?.length ?? 0,
    backgrounds: content.backgrounds?.length ?? 0,
  }
  const coreTotal = Object.values(coreCounts).reduce((sum, count) => sum + count, 0)
  if (coreTotal > 0) {
    stages.push({
      id: "core",
      label: "Core class & chassis",
      description: "Class features, proficiencies, and progression tables.",
      counts: coreCounts,
      total: coreTotal,
    })
  }

  const subclassCount = content.subclasses?.length ?? 0
  if (subclassCount > 0) {
    stages.push({
      id: "subclasses",
      label: "Subclasses & archetypes",
      description: "Warrior archetypes, domains, paths, and subclass spell lists.",
      counts: { subclasses: subclassCount },
      total: subclassCount,
    })
  }

  const featCount = content.feats?.length ?? 0
  if (featCount > 0) {
    stages.push({
      id: "feats",
      label: "Feats & fighting styles",
      description: "Fighting styles and other feat-category options.",
      counts: { feats: featCount },
      total: featCount,
    })
  }

  const spellCount = content.spells?.length ?? 0
  if (spellCount > 0) {
    stages.push({
      id: "spells",
      label: "Spells",
      description: "Custom spell lists linked to imported classes or subclasses.",
      counts: { spells: spellCount },
      total: spellCount,
    })
  }

  const equipmentCount = content.equipment?.length ?? 0
  if (equipmentCount > 0) {
    stages.push({
      id: "equipment",
      label: "Equipment",
      description: "Weapons, armor, and gear from the document.",
      counts: { equipment: equipmentCount },
      total: equipmentCount,
    })
  }

  const proposalCounts = {
    class_resources:
      (content.import_proposals?.class_resources?.length ?? 0) +
      (content.class_resources?.length ?? 0),
    custom_abilities:
      (content.import_proposals?.custom_abilities?.length ?? 0) +
      (content.abilities?.length ?? 0),
  }
  const proposalTotal = Object.values(proposalCounts).reduce((sum, count) => sum + count, 0)
  if (proposalTotal > 0) {
    stages.push({
      id: "proposals",
      label: "Class resources & custom abilities",
      description:
        "Pools like Exploit Dice or Psi Points, plus pickers such as disciplines or martial exploits.",
      counts: proposalCounts,
      total: proposalTotal,
    })
  }

  return stages
}

export function largeImportSummary(stages: ImportStage[]): string {
  if (!stages.length) return ""
  const parts = stages.map((stage) => `${stage.total} ${stage.label.toLowerCase()}`)
  return `This import will be reviewed in ${stages.length} stage${stages.length === 1 ? "" : "s"} before writing to the compendium: ${parts.join("; ")}.`
}
