/**
 * Heroes of Faerûn subclass wiring audit: every subclass feature in the Drive
 * import JSON must come out of SRD enrichment with at least one mechanical hook
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

const FIXTURE = "faerun-subclasses"

type OptionRow = { name?: string; linkedModifiers?: unknown[]; modifierRefs?: unknown[] }
type FeatureRow = {
  name?: string
  level?: number
  description?: string
  isChoice?: boolean
  choices?: {
    options?: OptionRow[]
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

describe("Heroes of Faerûn subclass wiring", () => {
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
    expect(wired).toBeGreaterThanOrEqual(40)
  })

  it.skipIf(skip)("wires Aura of Elemental Shielding and Dread Allegiance option mods", () => {
    const path = homebrewFixturePath(FIXTURE)!
    const data = JSON.parse(readFileSync(path, "utf8")) as {
      subclasses?: {
        name?: string
        class_name?: string
        features?: FeatureRow[]
      }[]
    }

    const genies = data.subclasses?.find((s) => /^oath of the noble genies$/i.test(s.name ?? ""))
    const aura = enrichSrdSubclassRow(
      { ...genies, features: (genies?.features ?? []).filter((f) => /^aura of elemental shielding$/i.test(f.name ?? "")) },
      "Paladin",
    ) as { features?: FeatureRow[] }
    const auraFeat = aura.features?.[0]
    expect(auraFeat?.isChoice).toBe(true)
    expect(auraFeat?.choices?.swappableOnRest).toBeUndefined()
    expect((auraFeat?.choices?.options ?? []).every((o) => (o.linkedModifiers?.length ?? 0) > 0)).toBe(
      true,
    )
    expect((auraFeat?.choices?.options ?? []).map((o) => o.name)).toEqual(
      expect.arrayContaining(["Acid", "Cold", "Fire", "Lightning", "Thunder"]),
    )

    const scion = data.subclasses?.find((s) => /^scion of the three$/i.test(s.name ?? ""))
    const dread = enrichSrdSubclassRow(
      { ...scion, features: (scion?.features ?? []).filter((f) => /^dread allegiance$/i.test(f.name ?? "")) },
      "Rogue",
    ) as { features?: FeatureRow[] }
    const dreadFeat = dread.features?.[0]
    expect(dreadFeat?.isChoice).toBe(true)
    expect(dreadFeat?.choices?.swappableOnRest).toBe(true)
    expect((dreadFeat?.choices?.options ?? []).map((o) => o.name)).toEqual(
      expect.arrayContaining(["Bane", "Bhaal", "Myrkul"]),
    )
    expect((dreadFeat?.choices?.options ?? []).every((o) => (o.linkedModifiers?.length ?? 0) >= 2)).toBe(
      true,
    )
  })

  it("registers Faerûn transformation sheet toggles", () => {
    for (const id of ["bladesong_active", "frozen_haunt_form", "crown_of_spellfire_active"]) {
      expect(isKnownSheetToggleId(id)).toBe(true)
      expect(getSheetToggleDefinition(id)?.sourceType).toBe("class_feature")
    }
    expect(getSheetToggleDefinition("bladesong_active")?.label).toBe("Bladesong")
    expect(getSheetToggleDefinition("frozen_haunt_form")?.label).toBe("Frozen Haunt")
    expect(getSheetToggleDefinition("crown_of_spellfire_active")?.label).toBe("Crown of Spellfire")
  })
})
