"use client"

import { Heart, Shield, Footprints } from "lucide-react"
import { ABILITY_ORDER } from "@/lib/character/parse-companion-stat-block"
import type { ResolvedCompanion } from "@/lib/character/companion-stat-block"
import { ExpandableDescription } from "@/components/character-sheet/expandable-description"

const ABILITY_LABEL_SHORT: Record<string, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
}

function formatMod(value: number): string {
  return value >= 0 ? `+${value}` : String(value)
}

type CompanionStatPanelProps = {
  companion: ResolvedCompanion & { currentHp: number; displayName: string }
  onHpChange: (hp: number) => void
}

export function CompanionStatPanel({ companion, onHpChange }: CompanionStatPanelProps) {
  const { template, ac, maxHp, currentHp, source } = companion

  return (
    <section className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-foreground">{companion.displayName}</h3>
            {template.sizeTypeAlignment ? (
              <p className="text-xs text-muted-foreground mt-0.5">{template.sizeTypeAlignment}</p>
            ) : null}
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
              {source.subclassName ? `${source.subclassName} · ` : ""}
              {source.className} · L{source.featureLevel} {source.featureName}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 grid grid-cols-3 gap-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary shrink-0" />
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">AC</p>
            <p className="text-lg font-bold tabular-nums">{ac}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-500 shrink-0" />
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">HP</p>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={maxHp}
                value={currentHp}
                onChange={(e) => onHpChange(parseInt(e.target.value, 10) || 0)}
                className="w-14 px-1 py-0.5 text-lg font-bold tabular-nums bg-background border border-border rounded text-center"
              />
              <span className="text-muted-foreground text-sm">/ {maxHp}</span>
            </div>
            {template.hitDiceNote ? (
              <p className="text-[9px] text-muted-foreground line-clamp-2">{template.hitDiceNote}</p>
            ) : null}
          </div>
        </div>
        {template.speed ? (
          <div className="flex items-center gap-2">
            <Footprints className="w-4 h-4 text-secondary shrink-0" />
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Speed</p>
              <p className="text-sm font-semibold">{template.speed}</p>
            </div>
          </div>
        ) : null}
      </div>

      {template.abilityScores && Object.keys(template.abilityScores).length > 0 ? (
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Ability Scores</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {ABILITY_ORDER.map((key) => {
              const row = template.abilityScores?.[key]
              if (!row) return null
              return (
                <div key={key} className="text-center p-2 bg-muted/40 rounded-lg">
                  <p className="text-[10px] font-bold text-muted-foreground">
                    {ABILITY_LABEL_SHORT[key]}
                  </p>
                  <p className="text-sm font-bold tabular-nums">{row.score}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatMod(row.modifier)} / {formatMod(row.save)} save
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="px-4 py-3 space-y-2 text-xs border-b border-border">
        {template.resistances?.length ? (
          <p>
            <span className="font-semibold text-foreground">Resistances </span>
            <span className="text-muted-foreground">{template.resistances.join(", ")}</span>
          </p>
        ) : null}
        {template.damageImmunities?.length ? (
          <p>
            <span className="font-semibold text-foreground">Damage Immunities </span>
            <span className="text-muted-foreground">{template.damageImmunities.join(", ")}</span>
          </p>
        ) : null}
        {template.conditionImmunities?.length ? (
          <p>
            <span className="font-semibold text-foreground">Condition Immunities </span>
            <span className="text-muted-foreground">{template.conditionImmunities.join(", ")}</span>
          </p>
        ) : null}
        {template.senses ? (
          <p>
            <span className="font-semibold text-foreground">Senses </span>
            <span className="text-muted-foreground">{template.senses}</span>
          </p>
        ) : null}
        {template.languages ? (
          <p>
            <span className="font-semibold text-foreground">Languages </span>
            <span className="text-muted-foreground">{template.languages}</span>
          </p>
        ) : null}
        {template.cr ? (
          <p>
            <span className="font-semibold text-foreground">CR </span>
            <span className="text-muted-foreground">{template.cr}</span>
          </p>
        ) : null}
      </div>

      {template.traits.length > 0 ? (
        <div className="px-4 py-3 border-b border-border space-y-2">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Traits</p>
          {template.traits.map((trait) => (
            <div key={trait.name} className="p-2 bg-muted/30 rounded-lg">
              <p className="font-bold text-foreground">{trait.name}</p>
              <ExpandableDescription text={trait.description} className="text-muted-foreground" />
            </div>
          ))}
        </div>
      ) : null}

      {template.actions.length > 0 ? (
        <div className="px-4 py-3 space-y-2">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Actions</p>
          {template.actions.map((action) => (
            <div key={action.name} className="p-2 bg-muted/30 rounded-lg">
              <p className="font-bold text-foreground">{action.name}</p>
              <ExpandableDescription text={action.description} className="text-muted-foreground" />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
