import type { FoundryParseResult } from "@/lib/import/foundry-types"
import { runTextImportPipeline } from "@/lib/import/text-import-pipeline"
import { NextResponse } from "next/server"

export async function respondToFoundryParseResult(
  result: FoundryParseResult,
  charLength: number,
): Promise<NextResponse | null> {
  switch (result.kind) {
    case "content":
      return runTextImportPipeline(result.content, {
        charLength,
        materialSource: result.meta.sourceLabel,
        foundryMeta: result.meta,
      })
    case "manifest":
      return NextResponse.json(
        {
          code: "foundry_manifest",
          error: "Foundry module/world manifest detected — export Item or NPC Actor JSON.",
          manifest: result.manifest,
        },
        { status: 422 },
      )
    case "unsupported":
      return NextResponse.json(
        {
          code: "foundry_unsupported",
          error: result.message,
          reason: result.reason,
        },
        { status: 422 },
      )
    case "no_importable":
      return NextResponse.json(
        {
          code: "foundry_no_importable",
          error: result.message,
          foundry: {
            sourceLabel: result.meta.sourceLabel,
            mapped: result.meta.mapped,
            skipped: result.meta.skipped,
            review: result.meta.review,
          },
        },
        { status: 422 },
      )
    case "not_foundry":
      return null
  }
}
