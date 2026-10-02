"use client"

import { useEffect, useRef, useState } from "react"
import { Heart, ImageIcon, Pencil, Shield, Footprints, Sparkles, Star } from "lucide-react"
import { ABILITY_ORDER } from "@/lib/character/parse-companion-stat-block"
import type { ResolvedCompanion, ResolvedCompanionNamedBlock } from "@/lib/character/companion-stat-block"
import {
  companionDefaultDisplayName,
  companionHasCustomName,
} from "@/lib/character/resolve-companions"
import {
  extractCompanionDamageFormula,
  parseCompanionActionRoll,
} from "@/lib/character/parse-companion-action-roll"
import { ExpandableDescription } from "@/components/character-sheet/expandable-description"
import { D20RollButton } from "@/components/character-sheet/d20-roll-button"
import { WeaponDamageRollButton } from "@/components/character-sheet/weapon-damage-roll-button"
import { SRD_CONDITIONS } from "@/lib/srd/condition-descriptions"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { normalizeCardImageUrl } from "@/lib/compendium/card-image"
import { MAX_PORTRAIT_FILE_BYTES } from "@/lib/portrait"

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

/**
 * Passive save-proficiency badge for the compact companion ability grid. Only
 * shown when the save differs from the plain ability modifier (i.e. the
 * creature is proficient in that save) — a matching save is redundant with
 * the modifier already shown and shouldn't take up space every time.
 */
function CompanionSaveBadge({ label, save }: { label: string; save: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex items-center justify-center rounded px-0.5 py-0.5 bg-primary/15 text-primary border border-primary/25 shrink-0"
          aria-label={`${label} save proficiency ${formatMod(save)}`}
        >
          <Star className="h-2.5 w-2.5 fill-current" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {label} save {formatMod(save)} (proficient)
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Portrait thumbnail for a companion instance. Falls back to the creature's
 * generic compendium art; when `onChange` is provided the player can set a
 * per-instance override (upload or paste a URL) for this specific character.
 */
function CompanionPortrait({
  url,
  name,
  onChange,
}: {
  url: string | null
  name: string
  onChange?: (url: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)

  const onFile = (file: File | undefined) => {
    if (!file || !onChange) return
    if (!file.type.startsWith("image/")) return
    if (file.size > MAX_PORTRAIT_FILE_BYTES) {
      alert(`Image must be under ${MAX_PORTRAIT_FILE_BYTES / (1024 * 1024)} MB`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      onChange(normalizeCardImageUrl(reader.result))
      setEditing(false)
    }
    reader.readAsDataURL(file)
  }

  if (!onChange) {
    if (!url) return null
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="w-9 h-9 rounded-lg object-cover border border-border shrink-0"
      />
    )
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setEditing((value) => !value)}
        title="Set companion portrait"
        aria-label={`Set portrait for ${name}`}
        className="w-9 h-9 rounded-lg border border-border bg-muted/50 overflow-hidden flex items-center justify-center hover:border-primary/50 transition-colors"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {editing ? (
        <div className="absolute z-10 top-full left-0 mt-1 w-56 p-2 rounded-lg border border-border bg-card shadow-lg space-y-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs text-primary hover:underline"
          >
            Upload image
          </button>
          <input
            type="text"
            inputMode="url"
            defaultValue={url?.startsWith("data:") ? "" : url ?? ""}
            onBlur={(event) => onChange(normalizeCardImageUrl(event.target.value))}
            placeholder="Or paste an image URL"
            className="w-full text-xs bg-background border border-border rounded px-1.5 py-1"
          />
          {url ? (
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setEditing(false)
              }}
              className="text-xs text-destructive hover:underline"
            >
              Remove portrait
            </button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => onFile(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-[10px] text-muted-foreground hover:underline"
          >
            Done
          </button>
        </div>
      ) : null}
    </div>
  )
}

/** Open-ended per-instance notes (inventory, quirks) for this companion on this sheet. */
function CompanionNotes({
  notes,
  onChange,
}: {
  notes: string | null
  onChange?: (notes: string | null) => void
}) {
  const [draft, setDraft] = useState(notes ?? "")
  useEffect(() => setDraft(notes ?? ""), [notes])

  if (!onChange) {
    if (!notes) return null
    return (
      <div className="px-3 py-2 border-b border-border">
        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Notes</p>
        <p className="text-[11px] leading-snug text-foreground whitespace-pre-wrap">{notes}</p>
      </div>
    )
  }

  return (
    <div className="px-3 py-2 border-b border-border">
      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Notes</p>
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const trimmed = draft.trim()
          if (trimmed !== (notes ?? "")) onChange(trimmed || null)
        }}
        rows={2}
        placeholder="Inventory, quirks, anything worth remembering about this one…"
        className="w-full text-[11px] bg-background border border-border rounded px-2 py-1.5 resize-none"
      />
    </div>
  )
}

export type CompanionStatPanelCompanion = ResolvedCompanion & {
  currentHp: number
  tempHp?: number
  displayName: string
  activeConditions: string[]
  polymorphActive: boolean
  notes?: string | null
  portraitUrl?: string | null
}

type CompanionStatPanelProps = {
  companion: CompanionStatPanelCompanion
  spellAttackModifier?: number | null
  onHpChange: (hp: number) => void
  onConditionsChange?: (conditions: string[]) => void
  onPolymorphActiveChange?: (active: boolean) => void
  onNameChange?: (name: string | null) => void
  onNotesChange?: (notes: string | null) => void
  onPortraitChange?: (url: string | null) => void
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[10px] leading-snug text-foreground">
      <span className="text-muted-foreground">{label}: </span>
      {value}
    </p>
  )
}

function ActionBlock({
  block,
  spellAttackModifier,
}: {
  block: ResolvedCompanionNamedBlock
  spellAttackModifier: number | null
}) {
  const structured = block.resolvedAttack
  const legacyRoll = structured
    ? null
    : parseCompanionActionRoll(block.name, block.description, spellAttackModifier)
  const attackBonus = structured?.toHitBonus ?? legacyRoll?.attackBonus ?? null
  const damageFormulas = structured
    ? structured.damage.map((roll) => roll.formula).filter(Boolean)
    : [legacyRoll?.damageFormula ?? extractCompanionDamageFormula(block.description)].filter(
        (value): value is string => Boolean(value),
      )
  const damageType = structured?.damage.find((roll) => roll.type)?.type ?? null
  const rangeLabel = structured
    ? structured.kind === "ranged"
      ? structured.range
      : structured.reach
    : null

  return (
    <div className="px-2 py-1 bg-muted/30 rounded-md space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-foreground">
          {block.name}
          {block.tag ? <span className="text-muted-foreground font-normal"> ({block.tag})</span> : null}
        </p>
        {attackBonus != null || damageFormulas.length > 0 ? (
          <div className="flex items-center gap-1 shrink-0">
            {attackBonus != null ? (
              <D20RollButton
                modifier={attackBonus}
                title={`Roll ${block.name} attack`}
                size="sm"
                rollContext={{ kind: "attack", ability: "dexterity" }}
              />
            ) : null}
            {damageFormulas.map((formula, index) => (
              <WeaponDamageRollButton
                key={`${formula}-${index}`}
                expression={formula}
                label={damageType ? `${block.name} ${damageType} damage` : `${block.name} damage`}
              />
            ))}
          </div>
        ) : null}
      </div>
      {rangeLabel ? (
        <p className="text-[9px] text-muted-foreground">
          {structured?.kind === "ranged" ? "Range" : "Reach"} {rangeLabel}
        </p>
      ) : null}
      <ExpandableDescription
        text={block.description}
        className="text-[10px] leading-snug text-muted-foreground"
      />
    </div>
  )
}

function BlockList({
  title,
  blocks,
  spellAttackModifier,
}: {
  title: string
  blocks: ResolvedCompanionNamedBlock[]
  spellAttackModifier: number | null
}) {
  if (!blocks.length) return null
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase font-bold text-muted-foreground">{title}</p>
      {blocks.map((block) => (
        <ActionBlock
          key={block.name}
          block={block}
          spellAttackModifier={spellAttackModifier}
        />
      ))}
    </div>
  )
}

export function CompanionStatPanel({
  companion,
  spellAttackModifier = null,
  onHpChange,
  onConditionsChange,
  onPolymorphActiveChange,
  onNameChange,
  onNotesChange,
  onPortraitChange,
}: CompanionStatPanelProps) {
  const { template, ac, maxHp, currentHp, tempHp = 0, source, polymorph, activeConditions, polymorphActive } =
    companion
  const abilityScores = companion.abilityScores ?? template.abilityScores
  const hasAbilities = abilityScores && Object.keys(abilityScores).length > 0
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState(companion.displayName)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const skipBlurCommit = useRef(false)
  const portraitUrl = companion.portraitUrl ?? companion.cardImageUrl ?? null

  useEffect(() => {
    if (renaming) nameInputRef.current?.focus()
  }, [renaming])

  const startRename = () => {
    if (!onNameChange) return
    skipBlurCommit.current = false
    setDraftName(companion.displayName)
    setRenaming(true)
  }

  const commitRename = () => {
    if (!onNameChange) return
    if (skipBlurCommit.current) {
      skipBlurCommit.current = false
      return
    }
    const next = draftName.trim()
    const defaultName = companionDefaultDisplayName(companion)
    onNameChange(next && next !== defaultName ? next : null)
    setRenaming(false)
  }

  const cancelRename = () => {
    skipBlurCommit.current = true
    setDraftName(companion.displayName)
    setRenaming(false)
  }

  const renamed = companionHasCustomName(companion)

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
    companion.actions.length > 0 ||
    companion.bonusActions.length > 0 ||
    companion.reactions.length > 0 ||
    companion.legendaryActions.length > 0

  const toggleCondition = (condition: string) => {
    if (!onConditionsChange) return
    const next = activeConditions.includes(condition)
      ? activeConditions.filter((entry) => entry !== condition)
      : [...activeConditions, condition]
    onConditionsChange(next)
  }

  return (
    <section className="bg-card rounded-xl border border-border overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CompanionPortrait url={portraitUrl} name={companion.displayName} onChange={onPortraitChange} />
            <div className="flex items-center gap-1 min-w-0">
              {renaming ? (
                <input
                  ref={nameInputRef}
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      commitRename()
                    }
                    if (event.key === "Escape") {
                      event.preventDefault()
                      cancelRename()
                    }
                  }}
                  aria-label="Companion name"
                  className="min-w-0 w-full bg-background border border-border rounded px-1.5 py-0.5 text-sm font-bold text-foreground"
                />
              ) : (
                <h3 className="text-sm font-bold text-foreground truncate">
                  {renamed ? (
                    <>
                      {companion.displayName}{" "}
                      <span className="font-semibold text-muted-foreground">({template.name})</span>
                    </>
                  ) : (
                    companion.displayName
                  )}
                </h3>
              )}
              {onNameChange && !renaming ? (
                <button
                  type="button"
                  onClick={startRename}
                  title="Rename companion"
                  aria-label={`Rename ${companion.displayName}`}
                  className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              ) : null}
            </div>
          </div>
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
        {polymorph && onPolymorphActiveChange ? (
          <label className="mt-2 flex items-center gap-2 text-[10px] font-semibold text-foreground">
            <input
              type="checkbox"
              checked={polymorphActive}
              onChange={(event) => onPolymorphActiveChange(event.target.checked)}
              className="rounded border-border"
            />
            Active beast form (use this form&apos;s physical stats)
          </label>
        ) : null}
      </div>

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
          {tempHp > 0 ? (
            <p className="text-[9px] font-semibold text-primary tabular-nums">+{tempHp} temp</p>
          ) : null}
        </div>
        <div className="p-1.5 bg-muted/50 rounded-lg text-center">
          <Footprints className="w-3 h-3 mx-auto text-secondary mb-0.5" />
          <p className="text-[7px] text-muted-foreground uppercase">Speed</p>
          <p className="text-[11px] font-semibold leading-tight">{template.speed ?? "—"}</p>
        </div>
      </div>

      {onConditionsChange ? (
        <div className="px-3 py-2 border-b border-border">
          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Conditions</p>
          <div className="flex flex-wrap gap-1">
            {SRD_CONDITIONS.slice(0, 8).map((condition) => {
              const conditionName = condition.name
              const active = activeConditions.includes(conditionName)
              return (
                <button
                  key={conditionName}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleCondition(conditionName)}
                  className={`rounded px-1.5 py-0.5 text-[9px] font-semibold border ${
                    active
                      ? "border-destructive/50 bg-destructive/15 text-destructive"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {conditionName}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {hasAbilities ? (
        <div className="px-3 py-2 grid grid-cols-6 gap-1 border-b border-border">
          {ABILITY_ORDER.map((key) => {
            const row = abilityScores?.[key]
            if (!row) return <div key={key} />
            const hasSaveProficiency = row.save !== row.modifier
            return (
              <div key={key} className="text-center p-1 bg-muted/40 rounded-md">
                <p className="text-[8px] font-bold text-muted-foreground">{ABILITY_LABEL_SHORT[key]}</p>
                <p className="text-xs font-black tabular-nums text-foreground">{row.score}</p>
                <p className="text-[8px] text-primary font-bold">{formatMod(row.modifier)}</p>
                <div className="h-3 flex items-center justify-center mt-0.5">
                  {hasSaveProficiency ? (
                    <CompanionSaveBadge label={ABILITY_LABEL_SHORT[key]} save={row.save} />
                  ) : null}
                </div>
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

      {(hasMeta || template.traits.length > 0 || hasActions) && (
        <div className="px-3 py-2 space-y-2">
          {hasMeta ? (
            <div className="space-y-0.5">
              {metaLines.map((line) => (
                <MetaLine key={line.label} label={line.label} value={line.value} />
              ))}
            </div>
          ) : null}
          <BlockList
            title="Traits"
            blocks={template.traits.map((block) => ({ ...block, resolvedAttack: null }))}
            spellAttackModifier={spellAttackModifier}
          />
          {hasActions ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
              <BlockList title="Actions" blocks={companion.actions} spellAttackModifier={spellAttackModifier} />
              <div className="space-y-2">
                <BlockList
                  title="Bonus Actions"
                  blocks={companion.bonusActions}
                  spellAttackModifier={spellAttackModifier}
                />
                <BlockList
                  title="Reactions"
                  blocks={companion.reactions}
                  spellAttackModifier={spellAttackModifier}
                />
                <BlockList
                  title="Legendary Actions"
                  blocks={companion.legendaryActions}
                  spellAttackModifier={spellAttackModifier}
                />
              </div>
            </div>
          ) : null}
        </div>
      )}

      {onNotesChange || companion.notes ? (
        <CompanionNotes notes={companion.notes ?? null} onChange={onNotesChange} />
      ) : null}
    </section>
  )
}
