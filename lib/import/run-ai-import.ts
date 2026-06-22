import { getImportModel } from "@/lib/import/ai"
import { chunkImportText } from "@/lib/import/chunk-import-text"
import type { ImportContent } from "@/lib/import/content-schema"
import {
  buildImportContentAiOutputSchema,
  normalizeAiImportContent,
} from "@/lib/import/import-content-ai-schema"
import { applyClassSpellListsToImport } from "@/lib/import/class-spell-lists"
import { mergeImportContent } from "@/lib/import/merge-import-content"
import { generateText, Output } from "ai"

export async function extractImportContentFromText(
  text: string,
  systemPrompt: string,
  options?: { includeAbilities?: boolean },
): Promise<ImportContent> {
  const ContentSchema = buildImportContentAiOutputSchema({
    includeAbilities: options?.includeAbilities,
  })
  const chunks = chunkImportText(text)
  const outputs: ImportContent[] = []

  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index]
    const chunkNote =
      chunks.length > 1
        ? `\n\nNote: This is section ${index + 1} of ${chunks.length} from a large document. Extract all content in this section; duplicates will be merged later.`
        : ""

    const result = await generateText({
      model: getImportModel(),
      system: systemPrompt,
      prompt: `Extract D&D content from this text:${chunkNote}\n\n${chunk}`,
      output: Output.object({ schema: ContentSchema }),
    })

    outputs.push(
      applyClassSpellListsToImport(normalizeAiImportContent(result.output)),
    )
  }

  return mergeImportContent(outputs)
}
