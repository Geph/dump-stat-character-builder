import {
  describeImportAiSetup,
  IMPORT_AI_MODEL_OPTIONS,
  listConfiguredImportAiProviders,
} from "@/lib/import/ai"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
  const setup = describeImportAiSetup()
  const configuredProviders = listConfiguredImportAiProviders()

  return NextResponse.json({
    ...setup,
    configuredProviders,
    modelOptions: IMPORT_AI_MODEL_OPTIONS,
    defaults: {
      openai: IMPORT_AI_MODEL_OPTIONS.openai[0]?.id,
      anthropic: IMPORT_AI_MODEL_OPTIONS.anthropic[0]?.id,
      google: IMPORT_AI_MODEL_OPTIONS.google[0]?.id,
    },
  })
}
