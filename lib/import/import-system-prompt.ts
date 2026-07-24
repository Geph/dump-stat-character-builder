import { appendContentTypeHintToPrompt, isCustomAbilitiesContentTypeHint } from "@/lib/import/content-type-hints"
import { RICH_TEXT_TABLE_HINT } from "@/lib/import/rich-text-import-hints"
import { CLASS_SPELL_LIST_IMPORT_HINT, SPELL_SCHOOL_IMPORT_HINT } from "@/lib/import/class-spell-lists"
import {
  CUSTOM_ABILITY_LIBRARY_STRUCTURE_HINT,
  formatCustomSystemsImportHint,
  type CustomSystemsImportHints,
} from "@/lib/import/custom-systems-import-hints"
import {
  formatSubclassMatchImportHint,
  type SubclassMatchImportHint,
} from "@/lib/import/subclass-match-import-hints"
import {
  CHOICE_EXTRACTION_HINT,
  CLASS_RESOURCE_IMPORT_HINT,
  CREATURE_COMPANION_IMPORT_HINT,
  CUSTOM_CLASS_IMPORT_HINT,
  DUPLICATE_ABILITY_MERGE_HINT,
  FEAT_CATEGORY_IMPORT_HINT,
  GENERAL_SOURCE_CLEANUP_HINT,
  IMPORT_PROPOSALS_HINT,
  MARKER_LEGEND_SCAN_HINT,
  MECHANICS_IMPORT_HINT,
  NAME_SOURCE_MATCHING_HINT,
  PREREQUISITE_RULES_IMPORT_HINT,
  SUBCLASS_IMPORT_HINT,
  BACKGROUND_LEGACY_IMPORT_HINT,
} from "@/lib/import/content-schema"

export const IMPORT_BASE_SYSTEM_PROMPT = `You are a D&D 2024 content parser. Extract game content from the provided text.

Important D&D 2024 rules:
- "Species" is the new term (not "Race")
- Backgrounds grant ability score bonuses (+2 to one, +1 to another, or +1/+1/+1)
- For backgrounds, set ability_bonuses to an object listing eligible abilities with value 0 (e.g. {"intelligence":0,"wisdom":0,"charisma":0}) or fixed bonuses with +1/+2 values. Keys must be only: strength, dexterity, constitution, intelligence, wisdom, charisma — never invent keys like "desktop"
- Backgrounds grant a 1st-level feat
- Species no longer grant ability score bonuses
- Class features are tied to specific levels
- Subclass features typically come at levels 3, 6, 7, 10, 14, 15, and 18 (homebrew may use 1, 3, 6, 10, 14)

Extract ONLY the content types you find in the text. For content types not present, set those top-level arrays to null (or omit them); use [] only when the source contains that type but yields zero valid entries.
Be thorough and extract all instances of each content type found.
For class features, include the level they are gained at.
If an entry is visibly incomplete (cut off mid-sentence, missing its ending), emit only the supplied text and end that description with "[Source ends mid-entry]" — do not infer or invent the missing rules.

For equipment: use cost { amount, unit } separate from name; strip HTML/markdown from names only.

Keep mechanical rules text in feature descriptions. Optionally add mechanics[] per feature for explicit Common Modifier hints (see below).

${GENERAL_SOURCE_CLEANUP_HINT}

${PREREQUISITE_RULES_IMPORT_HINT}

${NAME_SOURCE_MATCHING_HINT}

${MARKER_LEGEND_SCAN_HINT}

${DUPLICATE_ABILITY_MERGE_HINT}

${RICH_TEXT_TABLE_HINT}

${CHOICE_EXTRACTION_HINT}

${FEAT_CATEGORY_IMPORT_HINT}

${SUBCLASS_IMPORT_HINT}

${CREATURE_COMPANION_IMPORT_HINT}

${BACKGROUND_LEGACY_IMPORT_HINT}

${CLASS_RESOURCE_IMPORT_HINT}

${CUSTOM_CLASS_IMPORT_HINT}

${IMPORT_PROPOSALS_HINT}

${MECHANICS_IMPORT_HINT}

${CLASS_SPELL_LIST_IMPORT_HINT}

${SPELL_SCHOOL_IMPORT_HINT}`

export type ImportSystemPromptOptions = {
  customSystems?: CustomSystemsImportHints
  subclassMatch?: SubclassMatchImportHint | null
}

export function buildImportSystemPrompt(
  contentTypeHint?: string | null,
  options?: ImportSystemPromptOptions,
): string {
  const base = appendContentTypeHintToPrompt(IMPORT_BASE_SYSTEM_PROMPT, contentTypeHint)
  const customSystemsHint = formatCustomSystemsImportHint(options?.customSystems)
  const subclassMatchHint = formatSubclassMatchImportHint(options?.subclassMatch)
  const hint = contentTypeHint?.trim().toLowerCase()
  const parts = [base]
  if (customSystemsHint) {
    parts.push(customSystemsHint)
  } else if (isCustomAbilitiesContentTypeHint(hint)) {
    // Abilities / invocations-metamagic imports always get hierarchy examples even without Step 0 labels.
    parts.push(CUSTOM_ABILITY_LIBRARY_STRUCTURE_HINT)
  }
  if (subclassMatchHint) {
    parts.push(subclassMatchHint)
  }
  return parts.join("\n\n")
}
