import { describe, expect, it } from "vitest"
import { attachClassDetails, type CharacterClassDetail } from "@/lib/character/character-classes"
import { buildLevelUpPlan } from "@/lib/character/level-up-plan"
import { enrichClassesList } from "@/lib/compendium/normalize-class-data"
import {
  isMhpFreeSubclassName,
  MHP_FREE_SUBCLASSES_BY_CLASS,
} from "@/lib/seed-packs/mage-hand-press-free-subclasses"
import { loadMageHandPressPack } from "@/lib/seed-packs/mage-hand-press/load"
import type { ClassResource, DndClass, Feature, Subclass } from "@/lib/types"

const pack = loadMageHandPressPack()

type PackFile = {
  classes?: Array<Record<string, unknown>>
  subclasses?: Array<Record<string, unknown>>
  class_resources?: ClassResource[]
}

function packFiles(): PackFile[] {
  return pack.files as PackFile[]
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
}

const loadedClasses: DndClass[] = []
const loadedSubclasses: Subclass[] = []

for (const file of packFiles()) {
  for (const row of file.classes ?? []) {
    const name = String(row.name)
    const resources = (file.class_resources ?? []).filter(
      (resource) =>
        !resource.subclassName &&
        (!("class_name" in resource) ||
          String((resource as { class_name?: string }).class_name ?? name) === name ||
          String((resource as { class_name?: string }).class_name ?? "")
            .toLowerCase()
            .includes(name.split(" ")[0]!.toLowerCase())),
    )
    loadedClasses.push(
      enrichClassesList([
        {
          ...row,
          id: `cls_${slug(name)}`,
          class_resources: resources.length ? resources : (row.class_resources as ClassResource[] | undefined),
        } as DndClass,
      ])[0],
    )
  }
  for (const row of file.subclasses ?? []) {
    const parent = String(row.class_name ?? "")
    loadedSubclasses.push({
      ...row,
      id: `sub_${slug(String(row.name))}`,
      class_id: `cls_${slug(parent)}`,
    } as Subclass)
  }
}

function classByName(name: string): DndClass {
  const cls = loadedClasses.find((row) => row.name === name)
  if (!cls) throw new Error(`missing MHP class ${name}`)
  return cls
}

function classNameForId(classId: string): string {
  return loadedClasses.find((row) => row.id === classId)?.name ?? classId
}

function subclassesFor(className: string): Subclass[] {
  const classId = `cls_${slug(className)}`
  return loadedSubclasses.filter((sub) => sub.class_id === classId)
}

function entryAt(cls: DndClass, level: number, subclass?: Subclass | null): CharacterClassDetail {
  const [detail] = attachClassDetails(
    [
      {
        class_id: cls.id,
        level,
        subclass_id: subclass?.id ?? null,
        order: 0,
      },
    ],
    [cls],
    subclass ? [subclass] : [],
  )
  return detail
}

function planFor(cls: DndClass, fromLevel: number, subclass?: Subclass | null) {
  return buildLevelUpPlan({
    entry: entryAt(cls, fromLevel, subclass),
    subclasses: subclass ? [subclass] : subclassesFor(cls.name),
    currentTotalLevel: fromLevel,
    featureChoicePicks: {},
  })
}

function featureNamesAtLevel(features: Feature[] | undefined, level: number): string[] {
  return (features ?? []).filter((feature) => feature.level === level).map((feature) => feature.name)
}

function choiceNeedsOptions(feature: Feature): boolean {
  if (!feature.isChoice || !feature.choices) return false
  if (feature.choices.optionsSource) return false
  return (feature.choices.options?.length ?? 0) === 0
}

describe("MHP free seed pack level-up sweep", () => {
  it("bundles only allowlisted free subclasses", () => {
    const unexpected: string[] = []
    for (const sub of loadedSubclasses) {
      if (!isMhpFreeSubclassName(sub.name)) {
        unexpected.push(`${classNameForId(sub.class_id)}/${sub.name}`)
      }
    }
    expect(unexpected).toEqual([])
    expect(loadedClasses.map((row) => row.name).sort()).toEqual(
      [
        "Alchemist",
        "Captain",
        "Craftsman",
        "Dancer",
        "Gunslinger",
        "Investigator",
        "Martyr",
        "Necromancer",
        "Vagabond",
        "Warden (Mage Hand Press)",
        "Warmage",
        "Witch",
      ].sort(),
    )
    expect(loadedSubclasses.some((sub) => /binder|musketeer|house of cards/i.test(sub.name))).toBe(
      false,
    )
  })

  it("lists every free class feature at the level it unlocks", () => {
    const missing: string[] = []
    for (const cls of loadedClasses) {
      for (let from = 1; from < 20; from++) {
        const plan = planFor(cls, from)
        for (const name of featureNamesAtLevel(cls.features, from + 1)) {
          if (!plan?.newFeatures.some((feature) => feature.name === name && feature.source === "class")) {
            missing.push(`${cls.name} ${from}→${from + 1} ${name}`)
          }
        }
      }
    }
    expect(missing).toEqual([])
  })

  it("lists every free subclass feature at the level it unlocks", () => {
    const missing: string[] = []
    for (const cls of loadedClasses) {
      for (const sub of subclassesFor(cls.name)) {
        for (let from = 1; from < 20; from++) {
          const plan = planFor(cls, from, sub)
          for (const name of featureNamesAtLevel(sub.features as Feature[] | undefined, from + 1)) {
            if (
              !plan?.newFeatures.some((feature) => feature.name === name && feature.source === "subclass")
            ) {
              missing.push(`${cls.name}/${sub.name} ${from}→${from + 1} ${name}`)
            }
          }
        }
      }
    }
    expect(missing).toEqual([])
  })

  it("does not ship choice features without options or an options source", () => {
    const empty: string[] = []
    for (const cls of loadedClasses) {
      for (const feature of cls.features ?? []) {
        if (choiceNeedsOptions(feature)) empty.push(`${cls.name} L${feature.level} ${feature.name}`)
      }
      for (const sub of subclassesFor(cls.name)) {
        for (const feature of (sub.features ?? []) as Feature[]) {
          if (choiceNeedsOptions(feature)) {
            empty.push(`${cls.name}/${sub.name} L${feature.level} ${feature.name}`)
          }
        }
      }
    }
    expect(empty).toEqual([])
  })

  it("surfaces Gunslinger Fighting Style, Risk Dice, and Critical Shot scaling", () => {
    const gunslinger = classByName("Gunslinger")
    const intoTwo = planFor(gunslinger, 1)
    expect(intoTwo?.newFeatures.some((feature) => feature.name === "Risk")).toBe(true)
    expect(intoTwo?.newFeatures.some((feature) => feature.name === "Critical Shot")).toBe(true)

    const intoSix = planFor(gunslinger, 5)
    expect(
      intoSix?.featureImprovements.some(
        (row) => /risk/i.test(row.name) && /4/.test(row.detail) && /5/.test(row.detail),
      ),
    ).toBe(true)

    const intoNine = planFor(gunslinger, 8)
    expect(
      intoNine?.featureImprovements.some(
        (row) => /critical shot/i.test(row.name) && /18/.test(row.detail),
      ),
    ).toBe(true)

    const intoTen = planFor(gunslinger, 9)
    expect(
      intoTen?.featureImprovements.some(
        (row) => /risk/i.test(row.name) && /d8/.test(row.detail) && /d10/.test(row.detail),
      ),
    ).toBe(true)

    const fromZero = planFor(gunslinger, 0)
    expect(
      fromZero?.steps.some(
        (step) =>
          step.kind === "feat_or_asi" &&
          /fighting style/i.test(step.featureName) &&
          step.featCategories?.includes("Fighting Style"),
      ),
    ).toBe(true)
    expect(
      fromZero?.steps.some((step) => step.kind === "feature_choice" && /weapon mastery/i.test(step.title)),
    ).toBe(true)
  })

  it("asks for Alchemist formulas and Investigator Expertise", () => {
    const alchemist = classByName("Alchemist")
    const formulas = planFor(alchemist, 1)
    expect(
      formulas?.steps.some((step) => step.kind === "feature_choice" && /formula/i.test(step.title)),
    ).toBe(true)

    const investigator = classByName("Investigator")
    const expertise = planFor(investigator, 1)
    expect(
      expertise?.steps.some(
        (step) => step.kind === "modifier_choice" && /expertise/i.test(step.title),
      ),
    ).toBe(true)
  })

  it("surfaces Captain Battle Dice and Dancer Dance Die growth", () => {
    const captain = classByName("Captain")
    const captainFive = planFor(captain, 4)
    expect(
      captainFive?.featureImprovements.some(
        (row) => /battle/i.test(row.name) && (/\d/.test(row.detail) || /d/.test(row.detail)),
      ),
    ).toBe(true)

    const dancer = classByName("Dancer")
    const dancerFive = planFor(dancer, 4)
    expect(
      dancerFive?.featureImprovements.some(
        (row) => /dance/i.test(row.name) && (/\d/.test(row.detail) || /d/.test(row.detail)),
      ),
    ).toBe(true)
  })

  it("offers a subclass pick at the unlock level for each free class", () => {
    const missing: string[] = []
    for (const cls of loadedClasses) {
      const available = subclassesFor(cls.name)
      if (!available.length) {
        missing.push(`${cls.name} (no free subclasses in pack)`)
        continue
      }
      const plan = planFor(cls, 2)
      if (!plan?.steps.some((step) => step.kind === "subclass")) {
        missing.push(`${cls.name} 2→3`)
      }
    }
    expect(missing).toEqual([])
    expect(Object.keys(MHP_FREE_SUBCLASSES_BY_CLASS).length).toBeGreaterThan(0)
  })
})
