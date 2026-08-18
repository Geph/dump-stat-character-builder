import { describe, expect, it, vi } from "vitest"
import {
  flattenRelatedCascade,
  prerequisiteMentionsName,
  summarizeRelatedNames,
} from "@/lib/compendium/related-cascade"
import type { CompendiumToggleTarget } from "@/lib/compendium/compendium-toggle"

describe("prerequisiteMentionsName", () => {
  it("matches whole-phrase prerequisites", () => {
    expect(prerequisiteMentionsName("Awakened Undead", "Awakened Undead")).toBe(true)
    expect(prerequisiteMentionsName("5th-level Psion", "Psion")).toBe(true)
    expect(prerequisiteMentionsName("Requires Inventor specialization", "Inventor")).toBe(true)
  })

  it("does not match partial word collisions", () => {
    expect(prerequisiteMentionsName("Humanoid", "Human")).toBe(false)
    expect(prerequisiteMentionsName("Warlock", "War")).toBe(false)
  })
})

describe("flattenRelatedCascade", () => {
  const feats: CompendiumToggleTarget[] = [
    { table: "feats", contentType: "feats", id: "f1", name: "Twice Awakened" },
  ]
  const creatures: CompendiumToggleTarget[] = [
    { table: "creatures", contentType: "creatures", id: "c1", name: "Golem" },
  ]
  const abilities: CompendiumToggleTarget[] = [
    { table: "custom_abilities", contentType: "abilities", id: "a1", name: "Upgrade Pack" },
  ]

  it("respects include flags", () => {
    expect(
      flattenRelatedCascade(
        { feats, creatures, abilities },
        { includeFeats: true, includeCreatures: false, includeAbilities: false },
      ),
    ).toEqual(feats)
    expect(
      flattenRelatedCascade(
        { feats, creatures, abilities },
        { includeFeats: false, includeCreatures: true, includeAbilities: true },
      ),
    ).toEqual([...creatures, ...abilities])
  })
})

describe("summarizeRelatedNames", () => {
  it("truncates long lists", () => {
    const targets = Array.from({ length: 10 }, (_, i) => ({
      table: "feats" as const,
      contentType: "feats" as const,
      id: `f${i}`,
      name: `Feat ${i}`,
    }))
    expect(summarizeRelatedNames(targets, 3)).toBe("Feat 0, Feat 1, Feat 2 +7 more")
  })
})

function mockQuery(table: string, handlers: Record<string, unknown>) {
  const chain: Record<string, unknown> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.single = vi.fn(async () => {
    const single = handlers[`${table}:single`]
    if (typeof single === "function") return (single as () => unknown)()
    return { data: null, error: null }
  })
  Object.assign(chain, {
    then(resolve: (value: { data: unknown; error: null }) => void) {
      const list = handlers[`${table}:list`]
      if (typeof list === "function") {
        resolve((list as () => { data: unknown; error: null })())
        return
      }
      resolve({ data: [], error: null })
    },
  })
  return chain
}

describe("findRelatedFeatsAndCompanions", () => {
  it("finds text-prerequisite feats, grant_creature companions, and attached abilities", async () => {
    const { findRelatedFeatsAndCompanions } = await import("@/lib/compendium/related-cascade")

    const db = {
      from: vi.fn((table: string) =>
        mockQuery(table, {
          "classes:single": () => ({
            data: { name: "Inventor", features: [] },
            error: null,
          }),
          "feats:list": () => ({
            data: [
              {
                id: "feat-1",
                name: "Inventor Adept",
                prerequisite: "Inventor",
                prerequisite_class_ids: null,
                prerequisite_species_ids: null,
              },
              {
                id: "feat-2",
                name: "Unrelated",
                prerequisite: "Fighter",
                prerequisite_class_ids: null,
                prerequisite_species_ids: null,
              },
              {
                id: "feat-3",
                name: "Wired Inventor",
                prerequisite: null,
                prerequisite_class_ids: ["class-1"],
                prerequisite_species_ids: null,
              },
            ],
            error: null,
          }),
          "subclasses:list": () => ({
            data: [
              {
                id: "sub-1",
                features: [
                  {
                    name: "Mechanical Golem",
                    description: "",
                    linkedModifiers: [
                      {
                        catalogRefId: "cat_char_grant_creature",
                        characteristics: [
                          {
                            id: "m1",
                            type: "grant_creature",
                            creatureNames: ["Golem"],
                            count: 1,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
            error: null,
          }),
          "custom_abilities:list": () => ({
            data: [
              {
                id: "ability-1",
                name: "Gadget Upgrade",
                attached_to_type: "class",
                attached_to_id: "class-1",
                companion_creature_names: null,
                linked_modifiers: null,
                linkedModifiers: null,
                modifierRefs: null,
              },
              {
                id: "ability-2",
                name: "Subclass Trick",
                attached_to_type: "subclass",
                attached_to_id: "sub-1",
                companion_creature_names: null,
                linked_modifiers: null,
                linkedModifiers: null,
                modifierRefs: null,
              },
              {
                id: "ability-3",
                name: "Other Class",
                attached_to_type: "class",
                attached_to_id: "other",
                companion_creature_names: null,
                linked_modifiers: null,
                linkedModifiers: null,
                modifierRefs: null,
              },
            ],
            error: null,
          }),
          "creatures:list": () => ({
            data: [
              { id: "creature-1", name: "Golem" },
              { id: "creature-2", name: "Wolf" },
            ],
            error: null,
          }),
        }),
      ),
    }

    const related = await findRelatedFeatsAndCompanions(db as never, "classes", "class-1")
    expect(related.feats.map((f) => f.name).sort()).toEqual(["Inventor Adept", "Wired Inventor"])
    expect(related.creatures.map((c) => c.name)).toEqual(["Golem"])
    expect(related.abilities.map((a) => a.name).sort()).toEqual(["Gadget Upgrade", "Subclass Trick"])
  })

  it("finds species feats from free-text prerequisites", async () => {
    const { findRelatedFeatsAndCompanions } = await import("@/lib/compendium/related-cascade")

    const db = {
      from: vi.fn((table: string) =>
        mockQuery(table, {
          "species:single": () => ({
            data: { name: "Awakened Undead", traits: [] },
            error: null,
          }),
          "feats:list": () => ({
            data: [
              {
                id: "f1",
                name: "Modified Remains",
                prerequisite: "Awakened Undead",
                prerequisite_class_ids: null,
                prerequisite_species_ids: null,
              },
              {
                id: "f2",
                name: "Other",
                prerequisite: "Elf",
                prerequisite_class_ids: null,
                prerequisite_species_ids: null,
              },
            ],
            error: null,
          }),
          "custom_abilities:list": () => ({ data: [], error: null }),
          "creatures:list": () => ({ data: [], error: null }),
        }),
      ),
    }

    const related = await findRelatedFeatsAndCompanions(db as never, "species", "species-1")
    expect(related.feats.map((f) => f.name)).toEqual(["Modified Remains"])
    expect(related.creatures).toEqual([])
    expect(related.abilities).toEqual([])
  })
})
