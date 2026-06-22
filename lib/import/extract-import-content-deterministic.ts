import { assessDeterministicImportConfidence } from "@/lib/import/assess-import-confidence"
import type { ImportConfidenceAssessment } from "@/lib/import/assess-import-confidence"
import { applyClassSpellListsToImport } from "@/lib/import/class-spell-lists"
import type { ImportContent } from "@/lib/import/content-schema"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { parseClassShellFromText } from "@/lib/import/parse-class-shell"
import { parseProgressionTableFeatures } from "@/lib/import/parse-class-progression-table"
import {
  detectClassNameFromImportText,
  preprocessImportText,
  type PreprocessImportTextResult,
} from "@/lib/import/preprocess-import-text"
import {
  segmentClassFeaturesFromText,
  toImportClassFeatures,
} from "@/lib/import/segment-class-features"

export type DeterministicExtractResult = {
  content: ImportContent
  confidence: ImportConfidenceAssessment
  className: string | null
}

export type DeterministicExtractOptions = {
  contentTypeHint?: string | null
  preprocess?: PreprocessImportTextResult
}

/** Build ImportContent from parsers only (no AI). */
export function extractImportContentDeterministic(
  rawText: string,
  options?: DeterministicExtractOptions,
): DeterministicExtractResult {
  const preprocess =
    options?.preprocess ??
    preprocessImportText(rawText, { contentTypeHint: options?.contentTypeHint })

  const className =
    preprocess.stats.detectedClassName ?? detectClassNameFromImportText(rawText)
  const shell = parseClassShellFromText(rawText, className)
  const tableFeatures = parseProgressionTableFeatures(rawText)
  const segmentedFeatures = segmentClassFeaturesFromText(rawText, tableFeatures)
  const importFeatures = toImportClassFeatures(segmentedFeatures)

  const deterministicClass = preprocess.deterministic.classes?.[0]
  const spellList = deterministicClass?.spell_list ?? null

  const content: ImportContent = {
    class_resources: preprocess.deterministic.class_resources,
  }

  if (className && (importFeatures.length || shell.hit_die)) {
    content.classes = [
      {
        name: className,
        description: shell.description,
        hit_die: shell.hit_die ?? deterministicClass?.hit_die ?? 8,
        primary_ability: shell.primary_ability,
        saving_throws: shell.saving_throws ?? undefined,
        armor_proficiencies: shell.armor_proficiencies ?? undefined,
        weapon_proficiencies: shell.weapon_proficiencies ?? undefined,
        skill_choices: shell.skill_choices ?? undefined,
        features: importFeatures,
        spell_list: spellList ?? undefined,
      },
    ]
  } else if (preprocess.deterministic.classes?.length) {
    content.classes = preprocess.deterministic.classes
  }

  const enriched = enrichImportContentModifiers(applyClassSpellListsToImport(content))

  const confidence = assessDeterministicImportConfidence({
    className,
    shell,
    tableFeatures,
    segmentedFeatures,
    hasClassResources: Boolean(preprocess.deterministic.class_resources?.length),
    hasSpellList: Boolean(spellList?.length),
  })

  return {
    content: enriched,
    confidence,
    className,
  }
}
