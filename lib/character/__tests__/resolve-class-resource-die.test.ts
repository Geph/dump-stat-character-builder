import { describe, expect, it } from "vitest"
import {
  buildClassResourceDieSidesMap,
  resolveClassResourceDieSides,
} from "@/lib/character/resolve-class-resource-die"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { SUBCLASS_GATED_CLASS_RESOURCES } from "@/lib/compendium/subclass-gated-class-resources"
import type { DndClass } from "@/lib/types"

function bardDetail(level: number): CharacterClassDetail {
  return {
    row: { class_id: "cls_bard", level, subclass_id: null, order: 0 },
    class: { id: "cls_bard", name: "Bard" } as unknown as DndClass,
  }
}

function battleMasterFighterDetail(level: number): CharacterClassDetail {
  const superiority = SUBCLASS_GATED_CLASS_RESOURCES.find(
    (entry) => entry.resource.id === "superiority_dice",
  )!.resource
  return {
    row: { class_id: "cls_fighter", level, subclass_id: "sub_battle_master", order: 0 },
    class: {
      id: "cls_fighter",
      name: "Fighter",
      class_resources: [superiority],
    } as unknown as DndClass,
  }
}

describe("resolveClassResourceDieSides", () => {
  it("resolves Bardic Inspiration's die size from SRD defaults, scaling by level", () => {
    expect(resolveClassResourceDieSides([bardDetail(1)], "bardic_inspiration")).toBe(6)
    expect(resolveClassResourceDieSides([bardDetail(5)], "bardic_inspiration")).toBe(8)
    expect(resolveClassResourceDieSides([bardDetail(10)], "bardic_inspiration")).toBe(10)
    expect(resolveClassResourceDieSides([bardDetail(15)], "bardic_inspiration")).toBe(12)
  })

  it("resolves Superiority Dice from an embedded subclass-gated class resource", () => {
    expect(resolveClassResourceDieSides([battleMasterFighterDetail(3)], "superiority_dice")).toBe(8)
    expect(resolveClassResourceDieSides([battleMasterFighterDetail(10)], "superiority_dice")).toBe(10)
    expect(resolveClassResourceDieSides([battleMasterFighterDetail(18)], "superiority_dice")).toBe(12)
  })

  it("returns null for an unknown resource key", () => {
    expect(resolveClassResourceDieSides([bardDetail(5)], "not_a_real_resource")).toBeNull()
  })

  it("checks every class on a multiclass character", () => {
    const details = [battleMasterFighterDetail(10), bardDetail(5)]
    expect(resolveClassResourceDieSides(details, "superiority_dice")).toBe(10)
    expect(resolveClassResourceDieSides(details, "bardic_inspiration")).toBe(8)
  })
})

describe("buildClassResourceDieSidesMap", () => {
  it("maps every dice-scaled resource across all of a character's classes", () => {
    const map = buildClassResourceDieSidesMap([battleMasterFighterDetail(10), bardDetail(5)])
    expect(map.superiority_dice).toBe(10)
    expect(map.bardic_inspiration).toBe(8)
  })
})
