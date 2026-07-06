"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Info, X } from "lucide-react"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import {
  PsionicAugmentPicker,
  resolveAbilityPsionicAugments,
} from "@/components/character-sheet/psionic-augment-picker"
import {
  ACTION_KIND_LABELS,
  type ActionEconomyKind,
  type SheetActionEntry,
} from "@/lib/character/sheet-actions"
import {
  SHEET_ACTION_CARD,
  SHEET_ACTION_USAGE_DOT,
} from "@/lib/character/sheet-status-colors"
import type { ResourceTrackerEntry } from "@/components/character-sheet/resource-uses-tracker"
import { cn } from "@/lib/utils"
import { resolveUsesAtLevel, type ResolveUsesContext } from "@/lib/compendium/resolve-uses-config"
import type { UsesConfig } from "@/lib/types"

type SheetActionsPanelProps = {
  actions: SheetActionEntry[]
  usedByActionId: Record<string, number>
  onUsedChange: (next: Record<string, number>) => void
  resolveContext: ResolveUsesContext
  resourceEntries?: ResourceTrackerEntry[]
  usedResourcesById?: Record<string, number>
  onResourceUsedChange?: (next: Record<string, number>) => void
  incapacitated?: boolean
  psiLimit?: number | null
}

function resolveActionMax(
  uses: UsesConfig | null | undefined,
  classLevel: number,
  ctx: ResolveUsesContext,
): number | null {
  if (!uses || uses.type === "unlimited") return null
  return resolveUsesAtLevel(uses, classLevel, ctx)
}

/** A spendable counter backing an action — either a shared class resource or the action's own uses. */
type ActionUsage = {
  max: number
  used: number
  setUsed: (next: number) => void
  resourceName?: string
}

function UseDots({
  usage,
  label,
  tone = "default",
}: {
  usage: ActionUsage
  label: string
  tone?: keyof typeof SHEET_ACTION_USAGE_DOT
}) {
  const { max, used, setUsed } = usage
  const dotStyle = SHEET_ACTION_USAGE_DOT[tone]
  const toggle = (slotIndex: number) => {
    setUsed(slotIndex < used ? slotIndex : slotIndex + 1)
  }
  return (
    <div
      className="flex gap-1 shrink-0 flex-wrap justify-end"
      onClick={(e) => e.stopPropagation()}
    >
      {Array.from({ length: max }, (_, index) => {
        const isUsed = index < used
        return (
          <button
            key={index}
            type="button"
            onClick={() => toggle(index)}
            className={`h-3.5 w-3.5 rounded border ${
              isUsed ? dotStyle.spent : dotStyle.available
            }`}
            aria-label={`${label} use ${index + 1}${isUsed ? " spent" : " available"}`}
          />
        )
      })}
    </div>
  )
}

function ActionInfoOverlay({
  action,
  usage,
  psiLimit,
  onClose,
}: {
  action: SheetActionEntry
  usage: ActionUsage | null
  psiLimit?: number | null
  onClose: () => void
}) {
  const psionicAugments =
    action.psionicAugments ??
    (action.customAbilityId
      ? resolveAbilityPsionicAugments({
          name: action.name,
          description: action.description ?? null,
          psionic_augments: action.psionicAugments,
        })
      : null)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-card border-2 border-border rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 p-4 border-b border-border bg-card/95 backdrop-blur-sm">
          <div>
            <h2 className="text-lg font-black text-foreground">{action.name}</h2>
            <p className="text-xs text-muted-foreground">
              {action.sourceLabel}
              {" · "}
              {action.kinds.map((kind) => ACTION_KIND_LABELS[kind]).join(", ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {usage ? (
            <p className="text-xs font-semibold text-foreground">
              {usage.resourceName ? `${usage.resourceName}: ` : "Uses: "}
              <span className="tabular-nums">
                {usage.max - usage.used} / {usage.max} remaining
              </span>
            </p>
          ) : null}
          {(action.castingTime || action.range || action.duration) && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              {action.castingTime ? (
                <>
                  <dt className="text-muted-foreground">Casting Time</dt>
                  <dd className="text-foreground">{action.castingTime}</dd>
                </>
              ) : null}
              {action.range ? (
                <>
                  <dt className="text-muted-foreground">Range</dt>
                  <dd className="text-foreground">{action.range}</dd>
                </>
              ) : null}
              {action.components?.length ? (
                <>
                  <dt className="text-muted-foreground">Components</dt>
                  <dd className="text-foreground">{action.components.join(", ")}</dd>
                </>
              ) : null}
              {action.duration ? (
                <>
                  <dt className="text-muted-foreground">Duration</dt>
                  <dd className="text-foreground">
                    {action.duration}
                    {action.concentration ? " (Concentration)" : ""}
                  </dd>
                </>
              ) : null}
            </dl>
          )}
          {psionicAugments ? (
            <PsionicAugmentPicker
              config={psionicAugments}
              psiLimit={psiLimit}
              selections={[]}
              onChange={() => {}}
              readOnly
            />
          ) : null}
          <RichTextContent
            html={action.description}
            className="text-sm text-foreground/90 leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0"
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

export function SheetActionsPanel({
  actions,
  usedByActionId,
  onUsedChange,
  resolveContext,
  resourceEntries = [],
  usedResourcesById = {},
  onResourceUsedChange,
  incapacitated = false,
  psiLimit = null,
}: SheetActionsPanelProps) {
  const [infoActionId, setInfoActionId] = useState<string | null>(null)

  if (!actions.length) {
    return null
  }

  const resourceById = new Map(resourceEntries.map((entry) => [entry.id, entry]))

  /** Resolve the spendable counter backing an action, if any. */
  const usageFor = (action: SheetActionEntry): ActionUsage | null => {
    if (action.classResourceKey && action.classId && onResourceUsedChange) {
      const resourceId = `${action.classId}_${action.classResourceKey}`
      const resource = resourceById.get(resourceId)
      if (resource) {
        const max = resolveUsesAtLevel(resource.uses, resource.classLevel, resolveContext)
        if (max != null && max > 0) {
          return {
            max,
            used: usedResourcesById[resourceId] ?? 0,
            resourceName: resource.name,
            setUsed: (next) =>
              onResourceUsedChange({
                ...usedResourcesById,
                [resourceId]: Math.min(max, Math.max(0, next)),
              }),
          }
        }
      }
    }
    const max = resolveActionMax(action.limitedUses, action.classLevel, resolveContext)
    if (max != null && max > 0) {
      return {
        max,
        used: usedByActionId[action.id] ?? 0,
        setUsed: (next) =>
          onUsedChange({ ...usedByActionId, [action.id]: Math.min(max, Math.max(0, next)) }),
      }
    }
    return null
  }

  const spend = (usage: ActionUsage | null) => {
    if (incapacitated || !usage) return
    if (usage.used >= usage.max) return
    usage.setUsed(usage.used + 1)
  }

  const grouped: Record<ActionEconomyKind, SheetActionEntry[]> = {
    action: [],
    bonus: [],
    reaction: [],
  }
  for (const entry of actions) {
    for (const kind of entry.kinds) {
      if (!grouped[kind].some((existing) => existing.id === entry.id)) {
        grouped[kind].push(entry)
      }
    }
  }

  const infoAction = infoActionId
    ? actions.find((entry) => entry.id === infoActionId) ?? null
    : null

  return (
    <div className="space-y-3">
      {incapacitated ? (
        <p className="text-xs text-destructive font-medium">
          Incapacitated — you cannot take actions, bonus actions, or reactions.
        </p>
      ) : null}
      {(Object.keys(grouped) as ActionEconomyKind[]).map((kind) => {
        const entries = grouped[kind]
        if (!entries.length) return null
        return (
          <div key={kind}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
              {ACTION_KIND_LABELS[kind]}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {entries.map((entry) => {
                const usage = usageFor(entry)
                const spendable = !incapacitated && usage != null && usage.used < usage.max
                const usesClassResource = Boolean(entry.classResourceKey)
                return (
                  <div
                    key={`${kind}-${entry.id}`}
                    role={usage && !incapacitated ? "button" : undefined}
                    tabIndex={usage && !incapacitated ? 0 : undefined}
                    onClick={usage && !incapacitated ? () => spend(usage) : undefined}
                    onKeyDown={
                      usage && !incapacitated
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              spend(usage)
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      "relative flex flex-col gap-2 rounded border px-2 py-1.5",
                      usesClassResource
                        ? SHEET_ACTION_CARD.classResource
                        : SHEET_ACTION_CARD.default,
                      spendable &&
                        (usesClassResource
                          ? cn("cursor-pointer transition-colors", SHEET_ACTION_CARD.classResourceHover)
                          : cn("cursor-pointer transition-colors", SHEET_ACTION_CARD.defaultHover)),
                      !spendable && usage
                        ? incapacitated
                          ? "opacity-50"
                          : "opacity-80"
                        : "",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{entry.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {entry.sourceLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setInfoActionId(entry.id)
                        }}
                        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                        aria-label={`About ${entry.name}`}
                        title="What does this do?"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {usage ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {usage.max - usage.used} / {usage.max}
                          {usage.resourceName ? (
                            <span className="ml-1 text-muted-foreground/70">
                              {usage.resourceName}
                            </span>
                          ) : null}
                        </span>
                        <UseDots
                          usage={usage}
                          label={entry.name}
                          tone={usesClassResource ? "classResource" : "default"}
                        />
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <AnimatePresence>
        {infoAction ? (
          <ActionInfoOverlay
            key="action-info"
            action={infoAction}
            usage={usageFor(infoAction)}
            psiLimit={psiLimit}
            onClose={() => setInfoActionId(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}
