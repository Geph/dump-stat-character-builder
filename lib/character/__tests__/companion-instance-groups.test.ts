import { describe, expect, it } from "vitest"
import {
  companionPoolDefaultLabel,
  groupCompanionInstances,
  summarizeCompanionFormSelection,
} from "@/lib/character/companion-instance-groups"
import {
  companionKey,
  type CompanionSource,
  type ResolvedCompanion,
} from "@/lib/character/companion-stat-block"
import type { CompanionFormGroup } from "@/lib/character/resolve-companions"

const BASE: CompanionSource = {
  featureName: "Thralls",
  featureLevel: 2,
  className: "Necromancer",
  classId: "necro",
}

function row(name: string, overrides: Partial<CompanionSource> = {}): ResolvedCompanion {
  const source = { ...BASE, formName: name, ...overrides }
  return {
    key: companionKey(source),
    template: { name, ac: { parts: [] }, hp: { parts: [] }, traits: [], actions: [] },
    source,
    ac: 13,
    maxHp: 13,
    proficiencyBonus: 2,
    polymorph: false,
    actions: [],
    bonusActions: [],
    reactions: [],
    legendaryActions: [],
  } as unknown as ResolvedCompanion
}

describe("groupCompanionInstances", () => {
  it("collapses repeated thrall picks into one stat block with a pool per copy", () => {
    const rows = [
      row("Skeleton", { formInstance: 1 }),
      row("Zombie", { formInstance: 1 }),
      row("Skeleton", { formInstance: 2 }),
      row("Skeleton", { formInstance: 3 }),
    ]
    const groups = groupCompanionInstances(rows)
    expect(groups.map((group) => [group.members[0]!.template.name, group.members.length])).toEqual([
      ["Skeleton", 3],
      ["Zombie", 1],
    ])
    expect(new Set(groups[0]!.members.map((member) => member.key)).size).toBe(3)
    expect(groups[0]!.members.map(companionPoolDefaultLabel)).toEqual([
      "Skeleton 1",
      "Skeleton 2",
      "Skeleton 3",
    ])
  })

  it("keeps fixed forms without a copy index as their own stat blocks", () => {
    const groups = groupCompanionInstances([row("Wolf"), row("Bear"), row("Wolf", { featureName: "Other" })])
    expect(groups).toHaveLength(3)
  })
})

describe("summarizeCompanionFormSelection", () => {
  it("counts chosen types and combined CR in option order", () => {
    const group: CompanionFormGroup = {
      key: "necro:none:thralls",
      featureName: "Thralls",
      className: "Necromancer",
      kind: "choice",
      options: [
        { name: "Skeleton", cr: "1/4" },
        { name: "Spirit", cr: "1/4" },
        { name: "Zombie", cr: "1/4" },
      ],
      selected: ["Zombie", "Skeleton", "Skeleton", "skeleton"],
      maxKnown: 4,
      maxCombinedCr: 1,
    }
    expect(summarizeCompanionFormSelection(group)).toEqual({
      total: 4,
      max: 4,
      crUsed: 1,
      crMax: 1,
      types: [
        { name: "Skeleton", count: 3, cr: "1/4" },
        { name: "Zombie", count: 1, cr: "1/4" },
      ],
    })
  })
})
