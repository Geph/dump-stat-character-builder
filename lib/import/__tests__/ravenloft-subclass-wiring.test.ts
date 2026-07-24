/**
 * Ravenloft subclass wiring audit: every subclass feature in the Drive import
 * JSON must come out of SRD enrichment with at least one mechanical hook
 * (linked modifiers, spell table, uses, or wired choice options).
 */
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { enrichSrdSubclassRow } from "@/lib/compendium/enrich-srd-subclasses"
import {
  getSheetToggleDefinition,
  isKnownSheetToggleId,
} from "@/lib/compendium/sheet-toggle-registry"
import { parseSubclassSpellTable } from "@/lib/import/subclass-spell-table"
import { hasHomebrewFixture, homebrewFixturePath } from "./homebrew-fixture-path"

const FIXTURE = "ravenloft-subclasses"

type OptionRow = {
  name?: string
  prerequisite?: string | null
  linkedModifiers?: unknown[]
  modifierRefs?: unknown[]
}
type FeatureRow = {
  name?: string
  level?: number
  description?: string
  isChoice?: boolean
  choices?: {
    options?: OptionRow[]
    choiceCountByLevel?: { level: number; count: number }[]
    swappableOnRest?: boolean
  }
  mechanics?: unknown[]
  linked_modifiers?: unknown[]
  linkedModifiers?: unknown[]
  modifierRefs?: unknown[]
  uses?: unknown
}

function featureHasWiring(feat: FeatureRow): boolean {
  const mods = [
    ...((feat.linked_modifiers as unknown[]) ?? []),
    ...((feat.linkedModifiers as unknown[]) ?? []),
  ]
  const refs = (feat.modifierRefs as unknown[]) ?? []
  const mech = (feat.mechanics ?? []) as unknown[]
  const spellTableRows = /spells$/i.test(feat.name ?? "")
    ? (parseSubclassSpellTable(feat.description ?? "")?.rows ?? [])
    : []
  const optionWiring = (feat.choices?.options ?? []).some(
    (option) => (option.linkedModifiers?.length ?? 0) > 0 || (option.modifierRefs?.length ?? 0) > 0,
  )
  return (
    mods.length > 0 ||
    refs.length > 0 ||
    mech.length > 0 ||
    spellTableRows.length > 0 ||
    Boolean(feat.uses) ||
    optionWiring
  )
}

describe("Ravenloft subclass wiring", () => {
  const skip = !hasHomebrewFixture(FIXTURE)

  it.skipIf(skip)("wires every subclass feature after SRD enrichment", () => {
    const path = homebrewFixturePath(FIXTURE)!
    const data = JSON.parse(readFileSync(path, "utf8")) as {
      subclasses?: {
        name?: string
        class_name?: string
        features?: FeatureRow[]
      }[]
    }

    const unwired: string[] = []
    let wired = 0
    for (const sc of data.subclasses ?? []) {
      const enriched = enrichSrdSubclassRow(
        {
          ...sc,
          features: (sc.features ?? []).map((f) => ({ ...f })),
        },
        sc.class_name ?? "",
      ) as { features?: FeatureRow[] }
      for (const feat of enriched.features ?? []) {
        if (featureHasWiring(feat)) wired++
        else unwired.push(`${sc.class_name}/${sc.name} L${feat.level} ${feat.name}`)
      }
    }

    expect(unwired, JSON.stringify(unwired, null, 2)).toEqual([])
    expect(wired).toBeGreaterThanOrEqual(35)
  })

  it.skipIf(skip)("stages Strange Modifications via choiceCountByLevel (not a second Macabre picker)", () => {
    const path = homebrewFixturePath(FIXTURE)!
    const data = JSON.parse(readFileSync(path, "utf8")) as {
      subclasses?: {
        name?: string
        class_name?: string
        features?: FeatureRow[]
      }[]
    }

    const reanimator = data.subclasses?.find((s) => /^reanimator$/i.test(s.name ?? ""))
    const strange = enrichSrdSubclassRow(
      {
        ...reanimator,
        features: (reanimator?.features ?? []).filter((f) =>
          /^strange modifications$/i.test(f.name ?? ""),
        ),
      },
      "Artificer",
    ) as { features?: FeatureRow[] }
    const strangeFeat = strange.features?.[0]
    expect(strangeFeat?.isChoice).toBe(true)
    expect(strangeFeat?.choices?.choiceCountByLevel).toEqual([
      { level: 5, count: 1 },
      { level: 9, count: 2 },
      { level: 15, count: 3 },
    ])
    expect((strangeFeat?.choices?.options ?? []).map((o) => o.name)).toEqual(
      expect.arrayContaining(["Arcane Conduit", "Ferocity", "Bloated", "Gaunt", "Moist"]),
    )
    expect((strangeFeat?.choices?.options ?? []).every((o) => (o.linkedModifiers?.length ?? 0) > 0)).toBe(
      true,
    )

    const macabre = enrichSrdSubclassRow(
      {
        ...reanimator,
        features: (reanimator?.features ?? []).filter((f) =>
          /^macabre modifications$/i.test(f.name ?? ""),
        ),
      },
      "Artificer",
    ) as { features?: FeatureRow[] }
    expect(macabre.features?.[0]?.isChoice ?? false).toBe(false)
  })

  it("registers Ravenloft transformation sheet toggles", () => {
    for (const id of ["wrath_of_the_wild_form", "ghost_walk_form", "umbral_form"]) {
      expect(isKnownSheetToggleId(id)).toBe(true)
      expect(getSheetToggleDefinition(id)?.sourceType).toBe("class_feature")
    }
    expect(getSheetToggleDefinition("wrath_of_the_wild_form")?.label).toBe("Wrath of the Wild")
    expect(getSheetToggleDefinition("ghost_walk_form")?.label).toBe("Ghost Walk")
    expect(getSheetToggleDefinition("umbral_form")?.label).toBe("Umbral Form")
    expect(getSheetToggleDefinition("form_of_dread")?.sourceType).toBe("builtin")
  })
})
