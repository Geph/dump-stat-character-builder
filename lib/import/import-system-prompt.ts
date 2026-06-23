import { appendContentTypeHintToPrompt } from "@/lib/import/content-type-hints"
import { RICH_TEXT_TABLE_HINT } from "@/lib/import/rich-text-import-hints"
import { CLASS_SPELL_LIST_IMPORT_HINT } from "@/lib/import/class-spell-lists"
import {
  CHOICE_EXTRACTION_HINT,
  CLASS_RESOURCE_IMPORT_HINT,
  CUSTOM_CLASS_IMPORT_HINT,
  FEAT_CATEGORY_IMPORT_HINT,
  IMPORT_PROPOSALS_HINT,
  MECHANICS_IMPORT_HINT,
  SUBCLASS_IMPORT_HINT,
} from "@/lib/import/content-schema"

export const IMPORT_BASE_SYSTEM_PROMPT = `You are a D&D 2024 content parser. Extract game content from the provided text.

Important D&D 2024 rules:
- "Species" is the new term (not "Race")
- Backgrounds grant ability score bonuses (+2 to one, +1 to another, or +1/+1/+1)
- For backgrounds, set ability_bonuses to an object listing eligible abilities with value 0 (e.g. {"intelligence":0,"wisdom":0,"charisma":0}) or fixed bonuses with +1/+2 values
- Backgrounds grant a 1st-level feat
- Species no longer grant ability score bonuses
- Class features are tied to specific levels
- Subclass features typically come at levels 3, 6, 7, 10, 14, 15, and 18 (homebrew may use 1, 3, 6, 10, 14)

Extract ONLY the content types you find in the text. Return empty arrays for types not present.
Be thorough and extract all instances of each content type found.
For class features, include the level they are gained at.

For equipment: use cost { amount, unit } separate from name; strip HTML/markdown from names only.

Keep mechanical rules text in feature descriptions. Optionally add mechanics[] per feature for explicit Common Modifier hints (see below).

${RICH_TEXT_TABLE_HINT}

${CHOICE_EXTRACTION_HINT}

${FEAT_CATEGORY_IMPORT_HINT}

${SUBCLASS_IMPORT_HINT}

${CLASS_RESOURCE_IMPORT_HINT}

${CUSTOM_CLASS_IMPORT_HINT}

${IMPORT_PROPOSALS_HINT}

${MECHANICS_IMPORT_HINT}

${CLASS_SPELL_LIST_IMPORT_HINT}`

export function buildImportSystemPrompt(contentTypeHint?: string | null): string {
  return appendContentTypeHintToPrompt(IMPORT_BASE_SYSTEM_PROMPT, contentTypeHint)
}
