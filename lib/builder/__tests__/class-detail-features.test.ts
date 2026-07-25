import { describe, expect, it } from "vitest"
import {
  getClassDetailBaseFeatures,
  getClassDetailFeatures,
} from "@/lib/builder/class-detail-features"
import type { DndClass } from "@/lib/types"

function bardFixture(): DndClass {
  return {
    id: "bard",
    name: "Bard",
    description: null,
        hit_die: 8,
    primary_ability: ["Charisma"],
    saving_throws: ["Dexterity", "Charisma"],
    armor_proficiencies: ["Light armor"],
    weapon_proficiencies: [],
    skill_choices: { count: 2, options: [] },
    starting_equipment: null,
    starting_equipment_groups: null,
    starting_gold: null,
    features: [
      { level: 1, name: "Bardic Inspiration", description: "Inspire allies." },
      { level: 2, name: "Expertise", description: "Pick skills." },
      {
        level: 3,
        name: "Bard College",
        description: "Choose a subclass.",
        isChoice: true,
        choices: { category: "Bard College", count: 1, options: [] },
      },
    ],
    icon: null,
    source: "SRD",
    creator_url: null,
    created_at: "",
  } as unknown as unknown as DndClass
}

describe("getClassDetailBaseFeatures", () => {
  it("lists levels 1–3 without level labels in the row shape", () => {
    const rows = getClassDetailBaseFeatures(bardFixture())
    expect(rows.map((row) => row.name)).toEqual(["Bardic Inspiration", "Expertise"])
  })

  it("excludes subclass gate features at any unlock level", () => {
    const all = getClassDetailFeatures(bardFixture())
    expect(all.some((row) => row.name === "Bard College")).toBe(true)
    expect(getClassDetailBaseFeatures(bardFixture()).some((row) => row.name === "Bard College")).toBe(
      false,
    )
  })

  it("excludes level-1 Psionic Archetype from base features", () => {
    const psion = {
      ...bardFixture(),
      name: "Psion",
      features: [
        { level: 1, name: "Psionics", description: "You use psionics." },
        {
          level: 1,
          name: "Psionic Archetype",
          description: "Choose a Psionic Archetype.",
        },
        {
          level: 3,
          name: "Psionic Archetype Feature",
          description: "Gain a feature from your chosen Psionic Archetype.",
        },
      ],
    } as unknown as DndClass
    expect(getClassDetailBaseFeatures(psion).map((row) => row.name)).toEqual([
      "Psionics",
      "Psionic Archetype Feature",
    ])
  })

  it("does not flag features that only mention a resource in their description", () => {
    const barbarian = {
      ...bardFixture(),
      name: "Barbarian",
      class_resources: [{ id: "rage", name: "Rage", type: "limited_use" }],
      features: [
        {
          level: 1,
          name: "Rage",
          description: "Enter a Rage as a Bonus Action.",
          limitedUses: { type: "class_resource", classResourceKey: "rage" },
        },
        {
          level: 2,
          name: "Primal Knowledge",
          description:
            "While your Rage is active, you can make certain checks as Strength checks.",
        },
      ],
    } as unknown as DndClass

    const rows = getClassDetailFeatures(barbarian)
    expect(rows.find((row) => row.name === "Rage")?.resourceRelated).toBe(true)
    expect(rows.find((row) => row.name === "Primal Knowledge")?.resourceRelated).toBe(false)
  })
})
