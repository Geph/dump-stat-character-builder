import type { ImportContent } from "@/lib/import/content-schema"
import type { ImportCardArtSection } from "@/lib/import/import-card-art"
import type { ImportCollisionKind } from "@/lib/import/import-collisions"

export type ImportStageId =
  | "core"
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

/** Preview section keys shown for each stage (order matches staged review). */
export const IMPORT_STAGE_PREVIEW_KEYS: Record<ImportStageId, readonly string[]> = {
  /** Class first, then chassis extras, then subclasses stacked below. */
  core: ["classes", "species", "backgrounds", "subclasses"],
  feats: ["feats"],
  spells: ["spells"],
  equipment: ["equipment"],
  proposals: [],
}

export const IMPORT_STAGE_COLLISION_KINDS: Record<ImportStageId, readonly ImportCollisionKind[]> = {
  core: ["class", "species", "background"],
  feats: ["feat"],
  spells: ["spell"],
  equipment: [],
  proposals: ["ability"],
}

export const IMPORT_STAGE_CARD_ART_SECTIONS: Record<
  ImportStageId,
  readonly ImportCardArtSection[]
> = {
  /** Class/subclass art is inlined on preview rows. */
  core: ["species", "backgrounds"],
  feats: [],
  spells: ["spells"],
  equipment: ["equipment"],
  proposals: ["abilities"],
}

export function importModifierMatchesStage(
  sourceLabel: string,
  stageId: ImportStageId,
): boolean {
  switch (stageId) {
    case "core":
      return (
        sourceLabel.startsWith("Class: ") ||
        sourceLabel.startsWith("Subclass: ") ||
        sourceLabel.startsWith("Species: ") ||
        sourceLabel.startsWith("Background: ")
      )
    case "feats":
      return sourceLabel.startsWith("Feat: ")
    case "proposals":
      return sourceLabel.startsWith("Ability: ")
    default:
      return false
  }
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
    subclasses: content.subclasses?.length ?? 0,
  }
  const coreTotal = Object.values(coreCounts).reduce((sum, count) => sum + count, 0)
  if (coreTotal > 0) {
    const hasClass = coreCounts.classes > 0
    const hasSubclass = coreCounts.subclasses > 0
    stages.push({
      id: "core",
      label:
        hasClass && hasSubclass
          ? "Class & subclasses"
          : hasSubclass
            ? "Subclasses & archetypes"
            : "Core class & chassis",
      description:
        hasClass && hasSubclass
          ? "Review the class, then each subclass — optional card art and name edits."
          : hasSubclass
            ? "Warrior archetypes, domains, paths, and subclass spell lists."
            : "Class features, proficiencies, and progression tables.",
      counts: coreCounts,
      total: coreTotal,
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
