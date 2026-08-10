import { NextRequest, NextResponse } from "next/server"
import { requireMutationAuth } from "@/lib/api/require-mutation-auth"
import { getDatabaseConfigError } from "@/lib/db/config"
import { getPool } from "@/lib/db/index"
import { ensureMigrationsApplied } from "@/lib/db/migrate"
import { createClient } from "@/lib/db/client"
import { persistImportedContent } from "@/lib/import/persist-import-content"
import { ensureModifierCatalog } from "@/lib/compendium/ensure-modifier-catalog"
import { runWithBundledCardArtAssignment } from "@/lib/site-settings/app-presentation-mode"
import { seedExamplePack } from "@/lib/seed-packs/seed-example-pack"
import { isExampleSeedPackId } from "@/lib/seed-packs/pack-ids"

export async function POST(request: NextRequest) {
  try {
    const authError = requireMutationAuth(request)
    if (authError) return authError

    const configError = getDatabaseConfigError()
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 })
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const packId = typeof body?.packId === "string" ? body.packId : ""
    if (!isExampleSeedPackId(packId)) {
      return NextResponse.json(
        { error: `Unknown example seed pack. Expected one of: kibbles-tasty, mage-hand-press.` },
        { status: 400 },
      )
    }
    const includeCardArt = body?.includeCardArt !== false
    const onlyFileIndexes = Array.isArray(body?.onlyFileIndexes)
      ? body.onlyFileIndexes.filter((n: unknown): n is number => typeof n === "number" && Number.isInteger(n))
      : undefined

    const appliedMigrations = await ensureMigrationsApplied(getPool())

    return await runWithBundledCardArtAssignment(Boolean(includeCardArt), async () => {
      await ensureModifierCatalog(createClient())
      const result = await seedExamplePack(packId, persistImportedContent, { onlyFileIndexes })

      if (result.filesSucceeded === 0 && result.errors.length > 0) {
        return NextResponse.json(
          {
            error: result.errors.map((e) => `${e.fileLabel}: ${e.message}`).join("\n"),
            packId: result.packId,
            label: result.label,
            errors: result.errors,
            warnings: result.warnings,
            partial: false,
            total: 0,
            breakdown: result.breakdown,
            filesAttempted: result.filesAttempted,
            filesSucceeded: 0,
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        packId: result.packId,
        label: result.label,
        source: result.source,
        version: result.version,
        total: result.total,
        breakdown: result.breakdown,
        warnings: result.warnings,
        errors: result.errors,
        partial: result.partial,
        filesAttempted: result.filesAttempted,
        filesSucceeded: result.filesSucceeded,
        filesSeeded: result.filesSeeded,
        migrationsApplied: appliedMigrations,
      })
    })
  } catch (error) {
    console.error("Example pack seed failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to seed example pack" },
      { status: 500 },
    )
  }
}
