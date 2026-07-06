"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { MainNav } from "@/components/main-nav"
import { pageBackLinkClass, pageFloatingHintClass } from "@/lib/compendium/editor-field-styles"
import { SiteFooter } from "@/components/site-footer"
import { SheetPersistentStatsBar } from "@/components/character-sheet/sheet-persistent-stats-bar"
import { createClient } from "@/lib/db/client"
import {
  buildInputsFromSavedCharacter,
  computeDerivedCharacter,
} from "@/lib/character/compute-derived"
import { getDerivedCharacterBreakdowns } from "@/lib/character/get-derived-breakdowns"
import { loadModifierCatalog } from "@/lib/compendium/ensure-modifier-catalog"
import { SRD_CONDITIONS } from "@/lib/srd/condition-descriptions"
import type { Character, DndClass, Equipment, Feat, Species, Background } from "@/lib/types"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { asCompendiumRow, asCompendiumRows, castCompendiumRow } from "@/lib/data/types"

type LoadedCharacter = Character & {
  classes?: DndClass | null
  class_list?: CharacterClassDetail[]
  species?: Species | null
  backgrounds?: Background | null
  temporary_hit_points?: number | null
  active_conditions?: string[] | null
}

function TableModeInner() {
  const searchParams = useSearchParams()
  const characterId = searchParams.get("id")?.trim() ?? ""
  const [loading, setLoading] = useState(true)
  const [character, setCharacter] = useState<LoadedCharacter | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [feats, setFeats] = useState<Feat[]>([])
  const [modifierCatalog, setModifierCatalog] = useState<ModifierCatalogEntry[]>([])
  const [currentHp, setCurrentHp] = useState(0)
  const [tempHp, setTempHp] = useState(0)
  const [activeConditions, setActiveConditions] = useState<string[]>([])

  useEffect(() => {
    if (!characterId) {
      setLoading(false)
      return
    }
    const load = async () => {
      setLoading(true)
      const db = createClient()
      const { data, error } = await db
        .from("characters")
        .select(`*, classes (*), species (*), backgrounds (*), subclasses (*)`)
        .eq("id", characterId)
        .single()
      if (error || !data) {
        setCharacter(null)
        setLoading(false)
        return
      }
      const row = asCompendiumRow<LoadedCharacter & Record<string, unknown>>(data)
      if (error || !row) {
        setCharacter(null)
        setLoading(false)
        return
      }
      setCharacter(row)
      setCurrentHp(row.hit_points ?? 0)
      setTempHp(row.temporary_hit_points ?? 0)
      setActiveConditions(row.active_conditions ?? [])

      const [equipRes, featRes, catalog] = await Promise.all([
        db.from("equipment").select("*"),
        db.from("feats").select("*"),
        loadModifierCatalog(db),
      ])
      const allEquipment = asCompendiumRows<Equipment & Record<string, unknown>>(equipRes.data) as Equipment[]
      setEquipment(allEquipment)
      const allFeats = asCompendiumRows<Feat & Record<string, unknown>>(featRes.data) as Feat[]
      const selectedFeatIds = row.feat_ids ?? []
      setFeats(allFeats.filter((feat) => selectedFeatIds.includes(feat.id)))
      setModifierCatalog(catalog)
      setLoading(false)
    }
    void load()
  }, [characterId])

  const buildInputs = useMemo(() => {
    if (!character) return null
    const classList = character.class_list ?? []
    const classesFromList = classList.map((entry) => entry.class).filter(Boolean) as unknown as DndClass[]
    return buildInputsFromSavedCharacter({
      character,
      classes: classesFromList.length ? classesFromList : character.classes ? [character.classes] : [],
      subclasses: [],
      species: character.species,
      background: character.backgrounds,
      feats,
      equipment,
      equipmentCatalog: equipment,
      modifierCatalog,
    })
  }, [character, equipment, feats, modifierCatalog])

  const derived = useMemo(
    () => (buildInputs ? computeDerivedCharacter(buildInputs) : null),
    [buildInputs],
  )

  const statBreakdowns = useMemo(
    () => (buildInputs ? getDerivedCharacterBreakdowns(buildInputs) : undefined),
    [buildInputs],
  )

  if (!characterId) {
    return (
      <p className="text-sm text-muted-foreground p-4">
        Open table mode with <code>?id=&lt;characterId&gt;</code>
      </p>
    )
  }

  if (loading) {
    return <p className={`p-4 ${pageFloatingHintClass}`}>Loading…</p>
  }

  if (!character || !derived) {
    return <p className="p-4 text-sm text-destructive">Character not found.</p>
  }

  return (
    <div className="space-y-4 p-3 max-w-lg mx-auto">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/characters/${character.id}`} className={pageBackLinkClass}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Full sheet
        </Link>
        <h1 className="text-base font-bold truncate">{character.name}</h1>
      </div>

      <SheetPersistentStatsBar
        armorClass={derived.armorClass}
        acBreakdown={derived.acBreakdown}
        statBreakdowns={statBreakdowns}
        initiative={derived.initiative}
        speed={derived.speed}
        maxHp={derived.maxHp}
        currentHp={currentHp}
        tempHp={tempHp}
        onCurrentHpChange={setCurrentHp}
        onTempHpChange={setTempHp}
        onInitiativeRoll={() => {}}
        formatMod={(mod) => (mod >= 0 ? `+${mod}` : String(mod))}
      />

      <section className="bg-card rounded-xl border border-border p-3">
        <h2 className="text-xs font-bold uppercase text-muted-foreground mb-2">Conditions</h2>
        <div className="flex flex-wrap gap-1.5">
          {SRD_CONDITIONS.map((condition) => {
            const conditionName = condition.name
            const active = activeConditions.includes(conditionName)
            return (
              <button
                key={conditionName}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setActiveConditions((prev) =>
                    prev.includes(conditionName)
                      ? prev.filter((entry) => entry !== conditionName)
                      : [...prev, conditionName],
                  )
                }
                className={`min-h-9 rounded-lg border px-2 text-xs font-semibold ${
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
      </section>

      <p className="text-[11px] text-muted-foreground text-center">
        Table mode — HP and conditions are session-only until you save on the full sheet.
      </p>
    </div>
  )
}

export default function TableModePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MainNav />
      <main className="flex-1">
        <Suspense fallback={<p className={`p-4 ${pageFloatingHintClass}`}>Loading…</p>}>
          <TableModeInner />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  )
}
