"use client"

import Link from "next/link"
import { ABILITY_SCORE_KEYS } from "@/lib/compendium/characteristic-modifiers"
import type {
  DashboardCharacterSummary,
  DashboardCompanionSummary,
} from "@/lib/character/build-dashboard-summary"

const ABILITY_LABELS: Record<(typeof ABILITY_SCORE_KEYS)[number], string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
}

function AbilityPill({
  label,
  score,
  mod,
}: {
  label: string
  score: number
  mod: number
}) {
  const modLabel = mod >= 0 ? `+${mod}` : String(mod)
  return (
    <div className="rounded-md border border-border/70 bg-muted/20 px-1 py-1 text-center min-w-0">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-black tabular-nums leading-none">{score}</p>
      <p className="mt-0.5 text-[9px] tabular-nums text-muted-foreground leading-none">{modLabel}</p>
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/20 px-2 py-1 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-black tabular-nums leading-none truncate">{value}</p>
    </div>
  )
}

function CompanionStrip({ companion }: { companion: DashboardCompanionSummary }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-foreground truncate">{companion.name}</p>
        {companion.polymorph ? (
          <span className="shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">
            Polymorph
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
        HP {companion.currentHp}/{companion.maxHp} · AC {companion.ac}
      </p>
    </div>
  )
}

type DashboardCharacterCardProps = {
  summary: DashboardCharacterSummary
}

export function DashboardCharacterCard({ summary }: DashboardCharacterCardProps) {
  const hpLabel =
    summary.tempHp > 0
      ? `${summary.currentHp}+${summary.tempHp}/${summary.maxHp}`
      : `${summary.currentHp}/${summary.maxHp}`

  const visibleConditions = summary.conditions.slice(0, 3)
  const hiddenConditionCount = Math.max(0, summary.conditions.length - visibleConditions.length)

  return (
    <article className="rounded-2xl border-2 border-border bg-card p-3 flex flex-col gap-2 min-h-[200px]">
      <div className="flex items-start gap-2 min-w-0">
        {summary.portraitUrl ? (
          <img
            src={summary.portraitUrl}
            alt=""
            className="w-10 h-10 rounded-lg object-cover shrink-0"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <Link href={summary.sheetHref} className="font-bold text-foreground hover:text-primary truncate block">
            {summary.name}
          </Link>
          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{summary.classLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <StatPill label="HP" value={hpLabel} />
        <StatPill label="AC" value={String(summary.armorClass)} />
        <StatPill label="PP" value={String(summary.passivePerception)} />
        <StatPill label="Spd" value={`${summary.speed} ft`} />
      </div>

      <div className="grid grid-cols-6 gap-1">
        {ABILITY_SCORE_KEYS.map((key) => (
          <AbilityPill
            key={key}
            label={ABILITY_LABELS[key]}
            score={summary.abilityScores[key]}
            mod={summary.abilityMods[key]}
          />
        ))}
      </div>

      {visibleConditions.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {visibleConditions.map((condition) => (
            <span
              key={condition}
              className="px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive text-[10px] font-semibold"
            >
              {condition}
            </span>
          ))}
          {hiddenConditionCount > 0 ? (
            <span className="text-[10px] text-muted-foreground self-center">+{hiddenConditionCount}</span>
          ) : null}
        </div>
      ) : null}

      {summary.resources.length > 0 ? (
        <div className="space-y-1">
          {summary.resources.map((resource) => (
            <p key={resource.label} className="text-[11px] text-foreground truncate">
              <span className="font-semibold">{resource.label}:</span>{" "}
              <span className="tabular-nums text-muted-foreground">
                {resource.remaining}/{resource.max}
              </span>
            </p>
          ))}
        </div>
      ) : null}

      {summary.companions.length > 0 ? (
        <div className="space-y-1.5 mt-auto pt-1 border-t border-border/60">
          {summary.companions.map((companion) => (
            <CompanionStrip key={companion.key} companion={companion} />
          ))}
          {summary.extraCompanionCount > 0 ? (
            <p className="text-[10px] text-muted-foreground">+{summary.extraCompanionCount} more on sheet</p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

type DashboardGridProps = {
  summaries: DashboardCharacterSummary[]
  onRefresh: () => void
  refreshing: boolean
  onChangeSelection: () => void
}

export function DashboardGrid({
  summaries,
  onRefresh,
  refreshing,
  onChangeSelection,
}: DashboardGridProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {summaries.length} characters · stats from last saved sheet state
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onChangeSelection}
            className="px-3 py-2 rounded-lg border-2 border-border text-sm font-semibold hover:border-primary transition-colors"
          >
            Change selection
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="px-3 py-2 rounded-lg border-2 border-border text-sm font-semibold hover:border-primary transition-colors disabled:opacity-60"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {summaries.map((summary) => (
          <DashboardCharacterCard key={summary.id} summary={summary} />
        ))}
      </div>
    </div>
  )
}
