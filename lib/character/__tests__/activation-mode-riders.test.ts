import { describe, expect, it } from "vitest"

import {
  collectActivationModeRiderModifiers,
  mergeActivationModeRidersIntoFeature,
} from "@/lib/character/activation-mode-riders"
import type { Feature } from "@/lib/types"

describe("activation-mode-riders", () => {
  it("attaches default Dance Style riders when the feature has none", () => {
    const feature = mergeActivationModeRidersIntoFeature({
      level: 2,
      name: "Dance Styles",
      description: "Choose a Dance Style.",
      isChoice: true,
      choices: { category: "Dance Style", count: 1, resourceKey: "dance_styles_known", options: [] },
    } as Feature)
    const ids = (feature.linkedModifiers ?? []).flatMap((instance) =>
      (instance.characteristics ?? []).map((mod) => mod.id),
    )
    expect(ids).toEqual(
      expect.arrayContaining(["char_agile_movement", "mod_elegant_form", "mod_spinning_shot"]),
    )
  })

  it("does not duplicate Graceful Dodge when Dance already has that menu", () => {
    const feature = mergeActivationModeRidersIntoFeature({
      level: 2,
      name: "Dance",
      description: "Begin dancing.",
      linkedModifiers: [
        {
          instanceId: "existing",
          catalogRefId: "cat_char_resource_ability_menu",
          characteristics: [
            {
              id: "other_gd",
              type: "resource_ability_menu",
              resourceKey: "dance_die",
              options: [{ name: "Graceful Dodge", description: "AC.", resourceCost: 0 }],
            },
          ],
        },
      ],
    } as Feature)
    const menus = (feature.linkedModifiers ?? []).flatMap((instance) =>
      (instance.characteristics ?? []).filter((mod) => mod.type === "resource_ability_menu"),
    )
    expect(menus).toHaveLength(1)
  })

  it("collects riders from Dance + Dance Styles without repeating ids", () => {
    const mods = collectActivationModeRiderModifiers(
      [
        { level: 2, name: "Dance", description: "" } as Feature,
        {
          level: 2,
          name: "Dance Styles",
          description: "",
          choices: { resourceKey: "dance_styles_known", options: [] },
        } as unknown as Feature,
      ],
      new Set(["mod_graceful_dodge"]),
    )
    expect(mods.some((mod) => mod.id === "mod_graceful_dodge")).toBe(false)
    expect(mods.some((mod) => mod.id === "char_agile_movement")).toBe(true)
  })
})
