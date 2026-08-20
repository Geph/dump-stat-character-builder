"use client"

import Link from "next/link"
import { BookOpen } from "lucide-react"
import { compendiumListHref, type CompendiumContentType } from "@/lib/compendium/content-types"
import { cn } from "@/lib/utils"

type BuilderCatalogEmptyPromptProps = {
  /** Plural label for the missing catalog type, e.g. "species" or "backgrounds". */
  itemLabel: string
  tab: CompendiumContentType
  className?: string
}

/** Empty state when the builder has no compendium rows for a picker category. */
export function BuilderCatalogEmptyPrompt({
  itemLabel,
  tab,
  className,
}: BuilderCatalogEmptyPromptProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border/90 bg-muted/25 px-4 py-6 text-sm text-muted-foreground",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary">
          <BookOpen className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 space-y-1.5">
          <p className="font-semibold text-foreground">No {itemLabel} in your compendium</p>
          <p>
            Add {itemLabel} in the{" "}
            <Link
              href={compendiumListHref(tab)}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              Compendium
            </Link>
            , then return here to choose one for your character.
          </p>
        </div>
      </div>
    </div>
  )
}
