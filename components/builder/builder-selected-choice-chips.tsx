"use client"

import { GameIcon } from "@/components/game-icon-picker"
import { skillIconSlug } from "@/lib/compendium/skill-icons"
import { SRD_TOOL_ICONS_BY_NAME } from "@/lib/compendium/srd-item-icons-defaults"
import { cn } from "@/lib/utils"

type BuilderSelectedChoiceChipsProps = {
  title?: string
  names: string[]
  /** Match MultiSelectChoices layout sizing. */
  layout?: "default" | "compact" | "visual"
  /** Show skill/tool icons when a slug is known (same as visual skill pickers). */
  showSkillIcons?: boolean
  skillIconByName?: Record<string, string>
  accentClass?: string
  /** Chip names that should render in the destructive / conflict style. */
  errorNames?: string[]
  className?: string
}

function choiceIconSlug(
  name: string,
  customSkillIcons: Record<string, string>,
): string | null {
  return skillIconSlug(name, customSkillIcons) ?? SRD_TOOL_ICONS_BY_NAME[name] ?? null
}

function nameIsFlagged(name: string, errorNames: string[]): boolean {
  if (!errorNames.length) return false
  const needle = name.trim().toLowerCase()
  return errorNames.some((entry) => entry.trim().toLowerCase() === needle)
}

/**
 * Read-only preview of picks using the same selected-button look as MultiSelectChoices.
 */
export function BuilderSelectedChoiceChips({
  title,
  names,
  layout = "default",
  showSkillIcons = false,
  skillIconByName = {},
  accentClass = "border-primary bg-primary/10",
  errorNames = [],
  className,
}: BuilderSelectedChoiceChipsProps) {
  if (names.length === 0) return null

  const compact = layout === "compact"
  const visual = layout === "visual"
  const gridClass = compact
    ? "grid grid-cols-1 sm:grid-cols-3 gap-1.5"
    : "grid grid-cols-1 sm:grid-cols-3 gap-2"
  const hasErrors = names.some((name) => nameIsFlagged(name, errorNames))

  return (
    <div className={cn("space-y-1.5", className)}>
      {title ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title} selected
        </p>
      ) : null}
      <div className={gridClass}>
        {names.map((name) => {
          const iconSlug = showSkillIcons ? choiceIconSlug(name, skillIconByName) : null
          const flagged = nameIsFlagged(name, errorNames)
          return (
            <div
              key={name}
              className={cn(
                "rounded-lg border-2 text-left",
                compact ? "px-2.5 py-1.5" : visual ? "p-2.5" : "p-2",
                flagged
                  ? "border-destructive bg-destructive/15 ring-1 ring-destructive/40"
                  : accentClass,
              )}
            >
              <div className={iconSlug ? "flex min-w-0 items-center gap-2" : undefined}>
                {iconSlug ? (
                  <GameIcon
                    name={iconSlug}
                    className={cn(
                      "shrink-0",
                      flagged ? "text-destructive" : "text-muted-foreground",
                      visual ? "h-5 w-5" : "h-4 w-4",
                    )}
                  />
                ) : null}
                <p
                  className={cn(
                    "min-w-0 font-semibold",
                    compact ? "text-xs" : "text-sm",
                    flagged ? "text-destructive" : "text-foreground",
                  )}
                >
                  {name}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      {hasErrors ? (
        <p className="text-xs text-destructive">
          Also granted by your other Origin choice — pick a different feat on one side.
        </p>
      ) : null}
    </div>
  )
}
