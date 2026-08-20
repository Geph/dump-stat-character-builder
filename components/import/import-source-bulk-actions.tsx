"use client"

export type ImportSourceBulkAction = "skip" | "update" | "overwrite"

export type ImportSourceBulkTarget = {
  sectionKey: string
  sourceIndex: number
  name: string
}

const ACTION_LABELS: Record<ImportSourceBulkAction, string> = {
  skip: "Skip all",
  update: "Update all",
  overwrite: "Replace all",
}

const DEFAULT_ACTIONS: ImportSourceBulkAction[] = ["skip", "update", "overwrite"]

export function ImportSourceBulkActions({
  source,
  targets,
  onAction,
  actions = DEFAULT_ACTIONS,
}: {
  source: string
  targets: ImportSourceBulkTarget[]
  onAction?: (
    source: string,
    targets: ImportSourceBulkTarget[],
    action: ImportSourceBulkAction,
  ) => void
  /** Which bulk buttons to show. Defaults to skip / update / replace. */
  actions?: readonly ImportSourceBulkAction[]
}) {
  if (!onAction || targets.length === 0 || actions.length === 0) return null

  const buttonClass =
    "rounded-md border border-border/80 bg-background/80 px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 hover:text-foreground"

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          onClick={() => onAction(source, targets, action)}
          className={buttonClass}
        >
          {ACTION_LABELS[action]}
        </button>
      ))}
    </div>
  )
}
