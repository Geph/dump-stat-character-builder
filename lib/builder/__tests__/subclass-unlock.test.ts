import { describe, expect, it } from "vitest"
import {
  classNeedsSubclass,
  isSubclassUnlockFeature,
  resolveSubclassUnlockLabel,
  resolveSubclassUnlockLevel,
} from "@/lib/builder/subclass-unlock"
import { ensureSubclassUnlockFeature } from "@/lib/compendium/subclass-unlock-modifier"
import { enrichSrdClassList } from "@/lib/compendium/enrich-srd-classes"
import bundledClasses from "@/lib/srd/seed-data/classes.json"
import type { DndClass, Feature } from "@/lib/types"

function feature(partial: Partial<Feature> & Pick<Feature, "name" | "level">): Feature {
  return {
    description: "",
    isChoice: false,
    ...partial,
  }
}

describe("resolveSubclassUnlockLevel", () => {
  it("uses Psionic Archetype at level 1 for Psion", () => {
    const psion = {
      features: [
        feature({
          name: "Psionic Archetype",
          level: 1,
          description: "Choose a Psionic Archetype.",
        }),
        feature({
          name: "Psionic Archetype Feature",
          level: 3,
          description: "Gain a feature from your chosen Psionic Archetype.",
        }),
      ],
    } as Pick<DndClass, "features">

    expect(resolveSubclassUnlockLevel(psion)).toBe(1)
    expect(resolveSubclassUnlockLabel(psion)).toBe("Psionic Archetype")
    expect(isSubclassUnlockFeature(psion.features![0]!)).toBe(true)
    expect(isSubclassUnlockFeature(psion.features![1]!)).toBe(false)
    expect(classNeedsSubclass(1, 3, resolveSubclassUnlockLevel(psion))).toBe(true)
  })

  it("defaults to level 3 for SRD-style Martial Archetype", () => {
    const fighter = {
      features: [
        feature({ name: "Fighting Style", level: 1 }),
        feature({
          name: "Martial Archetype",
          level: 3,
          description: "Choose a Martial Archetype.",
        }),
      ],
    } as Pick<DndClass, "features">

    expect(resolveSubclassUnlockLevel(fighter)).toBe(3)
    expect(classNeedsSubclass(2, 2, resolveSubclassUnlockLevel(fighter))).toBe(false)
    expect(classNeedsSubclass(3, 2, resolveSubclassUnlockLevel(fighter))).toBe(true)
  })

  it("falls back to 3 when no unlock feature is present", () => {
    expect(resolveSubclassUnlockLevel({ features: [] })).toBe(3)
    expect(resolveSubclassUnlockLabel({ features: [] })).toBe("Subclass")
  })

  it("ignores incidental subclass and patron prose on later features", () => {
    const cleric = {
      features: [
        feature({
          name: "Blessed Strikes",
          level: 7,
          description: "If you get this option from a Cleric subclass, use only one option.",
        }),
      ],
    } as Pick<DndClass, "features">
    const warlock = {
      features: [
        feature({
          name: "Contact Patron",
          level: 9,
          description: "You contact your patron.",
        }),
      ],
    } as Pick<DndClass, "features">

    expect(resolveSubclassUnlockLevel(cleric)).toBe(3)
    expect(resolveSubclassUnlockLevel(warlock)).toBe(3)
  })

  it("prefers the reusable subclass unlock modifier", () => {
    const warden = {
      features: [
        feature({
          name: "Warden Bond",
          level: 1,
          linkedModifiers: [
            {
              instanceId: "warden-subclass",
              catalogRefId: "cat_char_subclass_unlock",
              characteristics: [
                { id: "subclass", type: "subclass_unlock", label: "Warden Bond" },
              ],
            },
          ],
        }),
      ],
    } as Pick<DndClass, "features">

    expect(resolveSubclassUnlockLevel(warden)).toBe(1)
    expect(resolveSubclassUnlockLabel(warden)).toBe("Warden Bond")
  })

  it("adds a structural subclass feature when source data omits one", () => {
    const features = ensureSubclassUnlockFeature(
      { name: "Cleric", features: [feature({ name: "Spellcasting", level: 1 })] },
      3,
      "Divine Domain",
    )
    const gate = features.find((entry) => entry.name === "Divine Domain")

    expect(gate?.level).toBe(3)
    expect(gate && isSubclassUnlockFeature(gate)).toBe(true)
  })

  it("unlocks every bundled SRD class at level 3", () => {
    const classes = enrichSrdClassList(
      bundledClasses.map((cls) => ({ ...cls, source: "SRD" })) as Record<string, unknown>[],
    ) as unknown as DndClass[]

    for (const cls of classes) {
      expect(resolveSubclassUnlockLevel(cls), cls.name).toBe(3)
    }
  })
})
