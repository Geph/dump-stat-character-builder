import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { buildLevelUpPlan } from "@/lib/character/level-up-plan"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { enrichSrdClassList } from "@/lib/compendium/enrich-srd-classes"
import { enrichSrdSubclassRow } from "@/lib/compendium/enrich-srd-subclasses"
import { resolveClassResourcesForClass } from "@/lib/compendium/resolve-class-resources"
import { hasHomebrewFixture, homebrewFixturePath } from "@/lib/import/__tests__/homebrew-fixture-path"
import bundledClasses from "@/lib/srd/seed-data/classes.json"
import bundledSubclasses from "@/lib/srd/seed-data/subclasses.json"
import type { DndClass, Feature, Subclass } from "@/lib/types"

const PHB_CLASSES = [
  "barbarian",
  "bard",
  "cleric",
  "druid",
  "fighter",
  "monk",
  "paladin",
  "ranger",
  "rogue",
  "sorcerer",
  "warlock",
  "wizard",
] as const

const enrichedClasses = enrichSrdClassList(bundledClasses as Record<string, unknown>[]).map(
  (row) => {
    const name = String(row.name)
    const withId = { ...row, id: `cls_${name.toLowerCase().replace(/\s+/g, "_")}` }
    return {
      ...withId,
      class_resources: resolveClassResourcesForClass({
        id: String(withId.id),
        name,
        class_resources: null,
      }),
    } as unknown as DndClass
  },
)

const enrichedSubclasses = (bundledSubclasses as Array<Record<string, unknown> & { class_name: string }>).map(
  (row) => {
    const parent = String(row.class_name)
    const name = String(row.name)
    return enrichSrdSubclassRow(
      { ...row, id: `sub_${name.toLowerCase().replace(/\s+/g, "_")}`, class_id: `cls_${parent.toLowerCase()}` },
      parent,
      [],
    ) as unknown as Subclass
  },
)

function classByName(name: string): DndClass {
  const cls = enrichedClasses.find((row) => row.name === name)
  if (!cls) throw new Error(`missing SRD class ${name}`)
  return cls
}

function subclassByName(className: string, subclassName: string): Subclass {
  const classId = `cls_${className.toLowerCase()}`
  const sub = enrichedSubclasses.find(
    (row) => row.name === subclassName && row.class_id === classId,
  )
  if (!sub) throw new Error(`missing SRD subclass ${className} / ${subclassName}`)
  return sub
}

function entryAt(cls: DndClass, level: number, subclass?: Subclass | null): CharacterClassDetail {
  return {
    row: {
      class_id: cls.id,
      level,
      subclass_id: subclass?.id ?? null,
      order: 0,
    },
    class: cls,
    subclass: subclass ?? null,
  }
}

function planFor(cls: DndClass, fromLevel: number, subclass?: Subclass | null) {
  return buildLevelUpPlan({
    entry: entryAt(cls, fromLevel, subclass),
    subclasses: subclass ? [subclass] : [],
    currentTotalLevel: fromLevel,
    featureChoicePicks: {},
  })
}

function featureNamesAtLevel(features: Feature[] | undefined, level: number): string[] {
  return (features ?? []).filter((feature) => feature.level === level).map((feature) => feature.name)
}

describe("SRD class level-up sweep", () => {
  it("lists every class feature at the level it unlocks", () => {
    const missing: string[] = []
    for (const cls of enrichedClasses) {
      for (let from = 1; from < 20; from++) {
        const plan = planFor(cls, from)
        const expected = featureNamesAtLevel(cls.features, from + 1)
        for (const name of expected) {
          if (!plan?.newFeatures.some((feature) => feature.name === name && feature.source === "class")) {
            missing.push(`${cls.name} ${from}→${from + 1} ${name}`)
          }
        }
      }
    }
    expect(missing).toEqual([])
  })

  it("lists every SRD subclass feature at the level it unlocks", () => {
    const missing: string[] = []
    for (const sub of enrichedSubclasses) {
      const parentName =
        (sub as Subclass & { class_name?: string }).class_name ??
        enrichedClasses.find((cls) => cls.id === sub.class_id)?.name
      if (!parentName) continue
      const cls = classByName(parentName)
      for (let from = 1; from < 20; from++) {
        const plan = planFor(cls, from, sub)
        const expected = featureNamesAtLevel(sub.features as Feature[] | undefined, from + 1)
        for (const name of expected) {
          if (
            !plan?.newFeatures.some((feature) => feature.name === name && feature.source === "subclass")
          ) {
            missing.push(`${parentName}/${sub.name} ${from}→${from + 1} ${name}`)
          }
        }
      }
    }
    expect(missing).toEqual([])
  })

  it("surfaces SRD resource and feature scaling that is not a new named feature", () => {
    const barbarian = classByName("Barbarian")
    const rogue = classByName("Rogue")
    const monk = classByName("Monk")
    const fighter = classByName("Fighter")
    const cleric = classByName("Cleric")
    const bard = classByName("Bard")

    const rage = planFor(barbarian, 8)
    expect(rage?.featureImprovements.some((row) => /rage/i.test(row.name) && /\+2/.test(row.detail))).toBe(
      true,
    )

    const sneak = planFor(rogue, 2)
    expect(
      sneak?.featureImprovements.some(
        (row) => /sneak attack/i.test(row.name) && /1d6/.test(row.detail) && /2d6/.test(row.detail),
      ),
    ).toBe(true)

    const monkFive = planFor(monk, 4)
    expect(monkFive?.newFeatures.some((feature) => feature.name === "Extra Attack")).toBe(true)
    expect(
      monkFive?.featureImprovements.some((row) => /martial arts/i.test(row.name) && /d8/.test(row.detail)),
    ).toBe(true)
    expect(
      monkFive?.featureImprovements.some((row) => /unarmored movement|walking speed/i.test(row.detail)),
    ).toBe(true)
    expect(
      monkFive?.featureImprovements.some((row) => /focus/i.test(row.name) && /4/.test(row.detail) && /5/.test(row.detail)),
    ).toBe(true)

    const actionSurge = planFor(fighter, 16)
    expect(
      actionSurge?.featureImprovements.some(
        (row) => /action surge/i.test(row.name) && /1/.test(row.detail) && /2/.test(row.detail),
      ),
    ).toBe(true)

    const channel = planFor(cleric, 5)
    expect(
      channel?.featureImprovements.some(
        (row) => /channel divinity/i.test(row.name) && /2/.test(row.detail) && /3/.test(row.detail),
      ),
    ).toBe(true)

    const bardic = planFor(bard, 4)
    expect(
      bardic?.featureImprovements.some(
        (row) => /bardic inspiration/i.test(row.name) && /d6/.test(row.detail) && /d8/.test(row.detail),
      ),
    ).toBe(true)
  })

  it("asks for Fighting Style when Paladin unlocks it at 2", () => {
    const plan = planFor(classByName("Paladin"), 1)
    expect(plan?.newFeatures.some((feature) => /fighting style/i.test(feature.name))).toBe(true)
    expect(
      plan?.steps.some(
        (step) =>
          step.kind === "feat_or_asi" &&
          /fighting style/i.test(step.featureName) &&
          step.featCategories?.includes("Fighting Style"),
      ),
    ).toBe(true)
  })

  it("asks for Weapon Mastery picks when the feature first unlocks", () => {
    const plan = planFor(classByName("Fighter"), 0)
    expect(plan?.steps.some((step) => step.kind === "feature_choice" && /weapon mastery/i.test(step.title))).toBe(
      true,
    )
  })

  it("offers Champion Improved Critical as a Champion 3 feature", () => {
    const plan = planFor(classByName("Fighter"), 2, subclassByName("Fighter", "Champion"))
    expect(plan?.newFeatures.some((feature) => feature.name === "Improved Critical")).toBe(true)
  })
})

describe.skipIf(!hasHomebrewFixture(...PHB_CLASSES.map((cls) => `phb-${cls}-subclasses`)))(
  "PHB subclass level-up sweep (local import fixtures, not seed)",
  () => {
    function cap(value: string): string {
      return value.charAt(0).toUpperCase() + value.slice(1)
    }

    function loadPhbSubclasses(cls: (typeof PHB_CLASSES)[number]): Subclass[] {
      const path = homebrewFixturePath(`phb-${cls}-subclasses`)
      if (!path) return []
      const data = JSON.parse(readFileSync(path, "utf8")) as { subclasses?: Record<string, unknown>[] }
      return (data.subclasses ?? []).map(
        (sub) =>
          enrichSrdSubclassRow({ ...sub, id: String(sub.id ?? sub.name) }, cap(cls), []) as unknown as Subclass,
      )
    }

    it("lists every PHB subclass feature at the level it unlocks", () => {
      const missing: string[] = []
      for (const clsName of PHB_CLASSES) {
        const cls = classByName(cap(clsName))
        for (const sub of loadPhbSubclasses(clsName)) {
          for (let from = 1; from < 20; from++) {
            const plan = planFor(cls, from, sub)
            const expected = featureNamesAtLevel(sub.features as Feature[] | undefined, from + 1)
            for (const name of expected) {
              if (
                !plan?.newFeatures.some(
                  (feature) => feature.name === name && feature.source === "subclass",
                )
              ) {
                missing.push(`${clsName}/${sub.name} ${from}→${from + 1} ${name}`)
              }
            }
          }
        }
      }
      expect(missing).toEqual([])
    })

    it("offers Battle Master maneuvers as a choice at 3", () => {
      const fighter = classByName("Fighter")
      const battleMaster = loadPhbSubclasses("fighter").find((sub) => /battle master/i.test(sub.name))
      expect(battleMaster).toBeTruthy()
      const plan = planFor(fighter, 2, battleMaster)
      expect(
        plan?.newFeatures.some((feature) => /maneuver|combat superiority|student of war/i.test(feature.name)),
      ).toBe(true)
      expect(
        plan?.steps.some(
          (step) =>
            step.kind === "feature_choice" &&
            /maneuver|superiority|combat superiority/i.test(step.title),
        ),
      ).toBe(true)
    })
  },
)
