import { describe, expect, it, vi } from "vitest"
import { findCompendiumDependents } from "@/lib/compendium/compendium-toggle"

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

describe("findCompendiumDependents", () => {
  it("includes subclass-attached abilities and text-prerequisite feats for classes", async () => {
    const db = {
      from: vi.fn((table: string) =>
        mockQuery(table, {
          "classes:single": () => ({ data: { name: "Inventor" }, error: null }),
          "subclasses:list": () => ({
            data: [{ id: "sub-1", name: "Golemsmith" }],
            error: null,
          }),
          "class_resources:list": () => ({ data: [], error: null }),
          "feats:list": () => ({
            data: [
              {
                id: "f1",
                name: "Inventor Adept",
                prerequisite: "Inventor",
                prerequisite_class_ids: null,
              },
            ],
            error: null,
          }),
          "spells:list": () => ({ data: [], error: null }),
          "custom_abilities:list": () => ({
            data: [
              {
                id: "a1",
                name: "Class Upgrade",
                attached_to_type: "class",
                attached_to_id: "class-1",
              },
              {
                id: "a2",
                name: "Golem Chassis",
                attached_to_type: "subclass",
                attached_to_id: "sub-1",
              },
            ],
            error: null,
          }),
        }),
      ),
    }

    const dependents = await findCompendiumDependents(db as never, "classes", "class-1")
    expect(dependents.map((d) => d.name).sort()).toEqual([
      "Class Upgrade",
      "Golem Chassis",
      "Golemsmith",
      "Inventor Adept",
    ])
  })

  it("finds abilities attached to a subclass", async () => {
    const db = {
      from: vi.fn((table: string) =>
        mockQuery(table, {
          "custom_abilities:list": () => ({
            data: [
              {
                id: "a1",
                name: "Deadeye Trick",
                attached_to_type: "subclass",
                attached_to_id: "sub-1",
              },
              {
                id: "a2",
                name: "Other",
                attached_to_type: "subclass",
                attached_to_id: "sub-2",
              },
            ],
            error: null,
          }),
        }),
      ),
    }

    const dependents = await findCompendiumDependents(db as never, "subclasses", "sub-1")
    expect(dependents.map((d) => d.name)).toEqual(["Deadeye Trick"])
  })
})
