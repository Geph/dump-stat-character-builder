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

  it("excludes level-3 subclass gate features", () => {
    const all = getClassDetailFeatures(bardFixture())
    expect(all.some((row) => row.name === "Bard College")).toBe(true)
    expect(getClassDetailBaseFeatures(bardFixture()).some((row) => row.name === "Bard College")).toBe(
      false,
    )
  })
})
