"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUp, Check, ChevronLeft, ChevronRight, X } from "lucide-react"
import { MultiSelectChoices } from "@/components/builder/multi-select-choices"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import { createClient } from "@/lib/db/client"
import {
  attachClassDetails,
  normalizeCharacterClassRows,
  type CharacterClassDetail,
} from "@/lib/character/character-classes"
import {
  buildLevelUpPlan,
  spellsEligibleForLevelUp,
  type LevelUpPlan,
} from "@/lib/character/level-up-plan"
import { normalizeBuilderPicks } from "@/lib/builder/builder-picks"
import { withChosenOptionChrome } from "@/lib/character/chosen-option-label"
import { asCompendiumRows } from "@/lib/data/types"
import type { Character, DndClass, Feat, Spell, Subclass } from "@/lib/types"
import { ABILITY_SCORE_KEYS, type AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"

const ABILITY_LABELS: Record<AbilityScoreKey, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
}

type LevelUpWizardProps = {
  characterId: string
  open: boolean
  onClose: () => void
  onComplete?: () => void
}

type Loaded = {
  character: Character
  classDetails: CharacterClassDetail[]
  subclasses: Subclass[]
  feats: Feat[]
  spells: Spell[]
}

export function LevelUpWizard({ characterId, open, onClose, onComplete }: LevelUpWizardProps) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [classId, setClassId] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [choicePicks, setChoicePicks] = useState<Record<string, string[]>>({})
  const [subclassId, setSubclassId] = useState<string | null>(null)
  const [featId, setFeatId] = useState<string | null>(null)
  const [asi, setAsi] = useState<Partial<Record<AbilityScoreKey, number>>>({})
  const [asiMode, setAsiMode] = useState<"feat" | "asi">("feat")
  const [spellIds, setSpellIds] = useState<string[]>([])
  const [cantripIds, setCantripIds] = useState<string[]>([])

  useEffect(() => {
    if (!open || !characterId) return
    let cancelled = false
    const load = async () => {
      setError(null)
      const db = createClient()
      const [{ data: character }, { data: classes }, { data: subclasses }, { data: feats }, { data: spells }] =
        await Promise.all([
          db.from("characters").select("*").eq("id", characterId).single(),
          db.from("classes").select("*"),
          db.from("subclasses").select("*"),
          db.from("feats").select("*"),
          db.from("spells").select("*"),
        ])
      if (cancelled) return
      if (!character) {
        setError("Could not load character.")
        return
      }
      const char = character as Character
      const classRows = normalizeCharacterClassRows(char)
      const classDetails = attachClassDetails(
        classRows,
        asCompendiumRows(classes) as unknown as DndClass[],
        asCompendiumRows(subclasses) as unknown as Subclass[],
      )
      setLoaded({
        character: char,
        classDetails,
        subclasses: asCompendiumRows(subclasses) as unknown as Subclass[],
        feats: asCompendiumRows(feats) as unknown as Feat[],
        spells: asCompendiumRows(spells) as unknown as Spell[],
      })
      setClassId(classDetails[0]?.row.class_id ?? null)
      setChoicePicks(char.feature_choice_picks ?? {})
      setStepIndex(0)
      setSubclassId(null)
      setFeatId(null)
      setAsi({})
      setAsiMode("feat")
      setSpellIds([])
      setCantripIds([])
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open, characterId])

  const selectedEntry = loaded?.classDetails.find((entry) => entry.row.class_id === classId) ?? null
  const plan: LevelUpPlan | null = useMemo(() => {
    if (!loaded || !selectedEntry) return null
    return buildLevelUpPlan({
      entry: selectedEntry,
      subclasses: loaded.subclasses,
      currentTotalLevel: loaded.character.level,
      featureChoicePicks: loaded.character.feature_choice_picks ?? {},
    })
  }, [loaded, selectedEntry])

  const wizardSteps = plan?.steps ?? []
  const current = wizardSteps[stepIndex] ?? null
  const isReview = Boolean(plan) && stepIndex >= wizardSteps.length

  const eligibleFeats = useMemo(() => {
    if (!loaded) return []
    const owned = new Set(loaded.character.feat_ids ?? [])
    return loaded.feats.filter((feat) => !owned.has(feat.id) && (feat.level_requirement ?? 1) <= (plan?.toLevel ?? 1))
  }, [loaded, plan?.toLevel])

  const canAdvance = (): boolean => {
    if (!current) return true
    if (current.kind === "subclass") return Boolean(subclassId)
    if (current.kind === "feature_choice") {
      return (choicePicks[current.id] ?? []).length >= current.required
    }
    if (current.kind === "feat_or_asi") {
      if (asiMode === "feat") return Boolean(featId)
      const total = Object.values(asi).reduce((sum, value) => sum + (value ?? 0), 0)
      return total === 2
    }
    if (current.kind === "spells") {
      return cantripIds.length === current.extraCantrips && spellIds.length === current.extraPrepared
    }
    return true
  }

  const applyLevelUp = async () => {
    if (!loaded || !plan || !selectedEntry) return
    setSaving(true)
    setError(null)
    try {
      const db = createClient()
      const nextRows = normalizeCharacterClassRows(loaded.character).map((row) =>
        row.class_id === plan.classId
          ? { ...row, level: plan.toLevel, subclass_id: subclassId ?? row.subclass_id }
          : row,
      )
      const nextPicks = { ...(loaded.character.feature_choice_picks ?? {}), ...choicePicks }
      const builderPicks = normalizeBuilderPicks(loaded.character.builder_picks)
      const existingSpells = builderPicks.spell_picks_by_class_id?.[plan.classId] ?? []
      const nextSpellPicks = {
        ...(builderPicks.spell_picks_by_class_id ?? {}),
        [plan.classId]: [...existingSpells, ...cantripIds, ...spellIds],
      }
      const nextFeatIds = featId
        ? [...new Set([...(loaded.character.feat_ids ?? []), featId])]
        : loaded.character.feat_ids ?? []
      const nextSpellIds = [...new Set([...(loaded.character.spell_ids ?? []), ...cantripIds, ...spellIds])]
      const hitDie = selectedEntry.class?.hit_die ?? 8
      const conMod = Math.floor(((loaded.character.constitution ?? 10) - 10) / 2)
      const hpGain = Math.floor(hitDie / 2) + 1 + conMod
      const nextMax = Math.max(1, (loaded.character.hit_point_max ?? loaded.character.hit_points ?? 1) + hpGain)
      const nextAsi = { ...(loaded.character.asi_allocations ?? {}) }
      if (asiMode === "asi" && Object.keys(asi).length) {
        nextAsi[`level-up:${plan.classId}:${plan.toLevel}`] = asi
      }
      const abilityPatch: Partial<Record<AbilityScoreKey, number>> = {}
      if (asiMode === "asi") {
        for (const key of ABILITY_SCORE_KEYS) {
          const bump = asi[key] ?? 0
          if (bump) abilityPatch[key] = (loaded.character[key] ?? 10) + bump
        }
      }

      const { error: updateError } = await db
        .from("characters")
        .update({
          level: plan.newTotalLevel,
          character_classes: nextRows,
          subclass_id:
            selectedEntry.row.order === 0 ? (subclassId ?? loaded.character.subclass_id) : loaded.character.subclass_id,
          feature_choice_picks: nextPicks,
          feat_ids: nextFeatIds,
          spell_ids: nextSpellIds,
          builder_picks: { ...builderPicks, spell_picks_by_class_id: nextSpellPicks },
          asi_allocations: nextAsi,
          hit_point_max: nextMax,
          hit_points: nextMax,
          ...abilityPatch,
        })
        .eq("id", loaded.character.id)
      if (updateError) throw new Error(updateError.message)
      onComplete?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save level-up.")
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-primary/40 bg-card p-5 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:text-foreground"
            aria-label="Close level up"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Level up</p>
          <h2 className="pr-8 font-serif text-2xl font-black text-foreground">
            {loaded?.character.name ?? "Character"}
          </h2>

          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          {!loaded && !error ? <p className="mt-4 text-sm text-muted-foreground">Loading…</p> : null}

          {loaded && plan ? (
            <div className="mt-4 space-y-4">
              {loaded.classDetails.length > 1 ? (
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold">Class to advance</span>
                  <select
                    value={classId ?? ""}
                    onChange={(event) => {
                      setClassId(event.target.value)
                      setStepIndex(0)
                    }}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2"
                  >
                    {loaded.classDetails.map((entry) => (
                      <option key={entry.row.class_id} value={entry.row.class_id}>
                        {entry.class?.name ?? "Class"} {entry.row.level} → {entry.row.level + 1}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {plan.className} {plan.fromLevel} → {plan.toLevel} (character level {plan.newTotalLevel})
                </p>
              )}

              {plan.newFeatures.length > 0 ? (
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">New features</p>
                  <ul className="mt-2 space-y-2">
                    {plan.newFeatures.map((feature) => (
                      <li key={`${feature.source}-${feature.name}`}>
                        <p className="text-sm font-semibold text-foreground">{feature.name}</p>
                        {feature.description ? (
                          <RichTextContent
                            html={feature.description}
                            className="text-xs text-muted-foreground [&_p]:mb-1"
                            fallback=""
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No named features unlock at this level — resources and proficiency still scale.</p>
              )}

              {current?.kind === "subclass" ? (
                <div>
                  <p className="mb-2 text-sm font-semibold">Choose subclass (level {current.unlockLevel}+)</p>
                  <div className="grid gap-2">
                    {loaded.subclasses
                      .filter((sub) => sub.class_id === current.classId)
                      .map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setSubclassId(sub.id)}
                          className={`rounded-lg border px-3 py-2 text-left text-sm ${
                            subclassId === sub.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                          }`}
                        >
                          {sub.name}
                        </button>
                      ))}
                  </div>
                </div>
              ) : null}

              {current?.kind === "feature_choice" ? (
                <MultiSelectChoices
                  title={withChosenOptionChrome(current.title, choicePicks[current.id] ?? [])}
                  options={(current.feature.choices?.options ?? []).map((option) => ({
                    name: option.name,
                    description: option.description,
                  }))}
                  maxCount={current.required}
                  selected={choicePicks[current.id] ?? []}
                  onChange={(selected) => setChoicePicks((prev) => ({ ...prev, [current.id]: selected }))}
                  showOptionInfo
                />
              ) : null}

              {current?.kind === "feat_or_asi" ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {(["feat", "asi"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setAsiMode(mode)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                          asiMode === mode ? "border-primary bg-primary/10" : "border-border"
                        }`}
                      >
                        {mode === "feat" ? "Feat" : "Ability scores"}
                      </button>
                    ))}
                  </div>
                  {asiMode === "feat" ? (
                    <select
                      value={featId ?? ""}
                      onChange={(event) => setFeatId(event.target.value || null)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Choose a feat…</option>
                      {eligibleFeats.map((feat) => (
                        <option key={feat.id} value={feat.id}>
                          {feat.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {ABILITY_SCORE_KEYS.map((key) => (
                        <label key={key} className="text-xs">
                          <span className="mb-1 block font-semibold">{ABILITY_LABELS[key]}</span>
                          <input
                            type="number"
                            min={0}
                            max={2}
                            value={asi[key] ?? 0}
                            onChange={(event) =>
                              setAsi((prev) => ({ ...prev, [key]: Number(event.target.value) || 0 }))
                            }
                            className="w-full rounded-md border border-border bg-background px-2 py-1"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {current?.kind === "spells" ? (
                <SpellPickStep
                  current={current}
                  spells={loaded.spells}
                  alreadyKnown={loaded.character.spell_ids ?? []}
                  cantripIds={cantripIds}
                  spellIds={spellIds}
                  onCantripsChange={setCantripIds}
                  onSpellsChange={setSpellIds}
                />
              ) : null}

              {isReview ? (
                <p className="text-sm text-muted-foreground">
                  Confirm to apply level {plan.toLevel} in {plan.className}. Hit points increase by the class average.
                </p>
              ) : null}

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  disabled={stepIndex === 0}
                  onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                {isReview ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void applyLevelUp()}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    {saving ? "Saving…" : "Apply level up"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canAdvance()}
                    onClick={() => setStepIndex((value) => value + 1)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function SpellPickStep({
  current,
  spells,
  alreadyKnown,
  cantripIds,
  spellIds,
  onCantripsChange,
  onSpellsChange,
}: {
  current: Extract<LevelUpPlan["steps"][number], { kind: "spells" }>
  spells: Spell[]
  alreadyKnown: string[]
  cantripIds: string[]
  spellIds: string[]
  onCantripsChange: (ids: string[]) => void
  onSpellsChange: (ids: string[]) => void
}) {
  const eligible = useMemo(
    () => spellsEligibleForLevelUp(spells, current.className, current.maxSpellLevel, alreadyKnown),
    [alreadyKnown, current.className, current.maxSpellLevel, spells],
  )
  const cantrips = eligible.filter((spell) => (spell.level ?? 0) === 0)
  const leveled = eligible.filter((spell) => (spell.level ?? 0) > 0)
  return (
    <div className="space-y-3">
      {current.extraCantrips > 0 ? (
        <MultiSelectChoices
          title={`Cantrips (${current.extraCantrips})`}
          options={cantrips.map((spell) => ({ name: spell.name, description: spell.description ?? undefined }))}
          maxCount={current.extraCantrips}
          selected={cantrips.filter((spell) => cantripIds.includes(spell.id)).map((spell) => spell.name)}
          onChange={(names) =>
            onCantripsChange(cantrips.filter((spell) => names.includes(spell.name)).map((spell) => spell.id))
          }
          showOptionInfo
        />
      ) : null}
      {current.extraPrepared > 0 ? (
        <MultiSelectChoices
          title={`${current.preparedCaster ? "Prepared" : "Known"} spells (${current.extraPrepared})`}
          options={leveled.map((spell) => ({
            name: spell.name,
            description: `L${spell.level} · ${spell.description ?? ""}`,
          }))}
          maxCount={current.extraPrepared}
          selected={leveled.filter((spell) => spellIds.includes(spell.id)).map((spell) => spell.name)}
          onChange={(names) =>
            onSpellsChange(leveled.filter((spell) => names.includes(spell.name)).map((spell) => spell.id))
          }
          showOptionInfo
        />
      ) : null}
    </div>
  )
}

export function LevelUpButton({
  onClick,
  className,
  title = "Level up",
}: {
  onClick: () => void
  className?: string
  title?: string
}) {
  return (
    <button type="button" onClick={onClick} className={className} title={title} aria-label={title}>
      <ArrowUp className="h-4 w-4" />
    </button>
  )
}
