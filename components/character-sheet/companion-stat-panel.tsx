"use client"

import { Heart, Shield, Footprints, Sparkles } from "lucide-react"
import { ABILITY_ORDER } from "@/lib/character/parse-companion-stat-block"
import type { CompanionNamedBlock, ResolvedCompanion } from "@/lib/character/companion-stat-block"
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

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[10px] leading-snug text-foreground">
      <span className="text-muted-foreground">{label}: </span>
      {value}
    </p>
  )
}

function BlockList({ title, blocks }: { title: string; blocks: CompanionNamedBlock[] }) {
  if (!blocks.length) return null
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase font-bold text-muted-foreground">{title}</p>
      {blocks.map((block) => (
        <div key={block.name} className="px-2 py-1 bg-muted/30 rounded-md">
          <p className="text-[11px] font-bold text-foreground">{block.name}</p>
          <ExpandableDescription
            text={block.description}
            className="text-[10px] leading-snug text-muted-foreground"
          />
        </div>
      ))}
    </div>
  )
}

export function CompanionStatPanel({ companion, onHpChange }: CompanionStatPanelProps) {
  const { template, ac, maxHp, currentHp, source, polymorph } = companion
  const abilityScores = companion.abilityScores ?? template.abilityScores
  const hasAbilities = abilityScores && Object.keys(abilityScores).length > 0

  const metaLines: { label: string; value: string }[] = []
  if (template.resistances?.length) metaLines.push({ label: "Resistances", value: template.resistances.join(", ") })
  if (template.damageImmunities?.length)
    metaLines.push({ label: "Damage Immunities", value: template.damageImmunities.join(", ") })
  if (template.conditionImmunities?.length)
    metaLines.push({ label: "Condition Immunities", value: template.conditionImmunities.join(", ") })
  if (template.senses) metaLines.push({ label: "Senses", value: template.senses })
  if (template.languages) metaLines.push({ label: "Languages", value: template.languages })
  if (template.cr) metaLines.push({ label: "CR", value: template.cr })

  const hasMeta = metaLines.length > 0
  const hasActions =
    template.actions.length > 0 ||
    (template.bonusActions?.length ?? 0) > 0 ||
    (template.reactions?.length ?? 0) > 0

  return (
    <section className="bg-card rounded-xl border border-border overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground truncate">{companion.displayName}</h3>
          {template.cr ? (
            <span className="text-[9px] text-muted-foreground shrink-0">CR {template.cr}</span>
          ) : null}
        </div>
        {template.sizeTypeAlignment ? (
          <p className="text-[10px] text-muted-foreground">{template.sizeTypeAlignment}</p>
        ) : null}
        <p className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">
          {source.subclassName ? `${source.subclassName} · ` : ""}
          {source.className} · L{source.featureLevel} {source.featureName}
        </p>
      </div>

      {/* AC / HP / Speed */}
      <div className="px-3 py-2 grid grid-cols-3 gap-1.5 border-b border-border">
        <div className="p-1.5 bg-muted/50 rounded-lg text-center">
          <Shield className="w-3 h-3 mx-auto text-primary mb-0.5" />
          <p className="text-[7px] text-muted-foreground uppercase">AC</p>
          <p className="text-base font-black tabular-nums text-foreground">{ac}</p>
        </div>
        <div className="p-1.5 bg-muted/50 rounded-lg text-center">
          <Heart className="w-3 h-3 mx-auto text-red-500 mb-0.5" />
          <p className="text-[7px] text-muted-foreground uppercase">HP</p>
          <div className="flex items-center justify-center gap-1">
            <input
              type="number"
              min={0}
              max={maxHp}
              value={currentHp}
              onChange={(e) => onHpChange(parseInt(e.target.value, 10) || 0)}
              className="w-11 text-center bg-background border border-border rounded px-1 py-0.5 text-sm font-bold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-[10px] text-muted-foreground">/ {maxHp}</span>
          </div>
        </div>
        <div className="p-1.5 bg-muted/50 rounded-lg text-center">
          <Footprints className="w-3 h-3 mx-auto text-secondary mb-0.5" />
          <p className="text-[7px] text-muted-foreground uppercase">Speed</p>
          <p className="text-[11px] font-semibold leading-tight">{template.speed ?? "—"}</p>
        </div>
      </div>

      {/* Ability scores */}
      {hasAbilities ? (
        <div className="px-3 py-2 grid grid-cols-6 gap-1 border-b border-border">
          {ABILITY_ORDER.map((key) => {
            const row = abilityScores?.[key]
            if (!row) return <div key={key} />
            return (
              <div key={key} className="text-center p-1 bg-muted/40 rounded-md">
                <p className="text-[8px] font-bold text-muted-foreground">{ABILITY_LABEL_SHORT[key]}</p>
                <p className="text-xs font-black tabular-nums text-foreground">{row.score}</p>
                <p className="text-[8px] text-primary font-bold">{formatMod(row.modifier)}</p>
                <p className="text-[7px] text-muted-foreground">save {formatMod(row.save)}</p>
              </div>
            )
          })}
        </div>
      ) : null}

      {polymorph ? (
        <div className="px-3 py-1.5 border-b border-border flex items-start gap-1.5">
          <Sparkles className="w-3 h-3 text-primary shrink-0 mt-0.5" />
          <p className="text-[9px] leading-snug text-muted-foreground">
            You keep your own HP, Hit Dice, INT/WIS/CHA, class features, languages, feats, and skill/save
            proficiencies (using the higher modifier).
          </p>
        </div>
      ) : null}

      {/* Meta + Traits + Actions in columns */}
      {(hasMeta || template.traits.length > 0 || hasActions) && (
        <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
          {hasMeta ? (
            <div className="space-y-0.5 sm:col-span-2">
              {metaLines.map((line) => (
                <MetaLine key={line.label} label={line.label} value={line.value} />
              ))}
            </div>
          ) : null}
          <BlockList title="Traits" blocks={template.traits} />
          <div className="space-y-2">
            <BlockList title="Actions" blocks={template.actions} />
            <BlockList title="Bonus Actions" blocks={template.bonusActions ?? []} />
            <BlockList title="Reactions" blocks={template.reactions ?? []} />
          </div>
        </div>
      )}
    </section>
  )
}
