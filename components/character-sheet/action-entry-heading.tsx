import { GameIcon } from "@/components/game-icon-picker"
import { actionGroupTheme } from "@/components/character-sheet/action-group-theme"
import { cn } from "@/lib/utils"

export function ActionEntryHeading({ name, icon, group, hint, compact }: {
  name: string; icon?: string | null; group: string; hint?: string; compact: boolean
}) {
  const theme = actionGroupTheme(group)
  return <div className="flex min-w-0 items-center gap-2">
    <span title={hint} className={cn("flex shrink-0 items-center justify-center rounded-lg", theme.color,
      compact ? cn("absolute left-0 top-0 h-8 w-8 border shadow-sm", theme.well) : "h-5 w-5")}>
      {icon ? <GameIcon name={icon} className={compact ? "h-6 w-6" : "h-5 w-5"} /> : <theme.Icon className="h-4 w-4" />}
    </span>
    <p title={name} className="line-clamp-2 min-w-0 text-xs font-semibold leading-tight text-foreground [overflow-wrap:anywhere]">{name}</p>
  </div>
}
