import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { getCompendiumItemIcon } from "@/lib/compendium/content-types"
import {
  CREATURE_TYPE_ICONS_BY_NAME,
  defaultCreatureIconForItem,
  inferCreatureOwnerClassName,
} from "@/lib/compendium/creature-icons-defaults"
import { HOMEBREW_CLASS_ICONS_BY_NAME, SRD_CLASS_ICONS_BY_NAME } from "@/lib/compendium/class-icons-defaults"

describe("creature and companion icon defaults", () => {
  it("uses the owning class icon when the companion scales with that class", () => {
    expect(
      defaultCreatureIconForItem({
        name: "Minstrel",
        creature_type: "Humanoid",
        scaling: { scales_with: "your Captain level", notes: "" },
      }),
    ).toBe(HOMEBREW_CLASS_ICONS_BY_NAME.Captain)
    expect(
      inferCreatureOwnerClassName({
        scaling: { scales_with: "Artificer level", notes: "HP = 5 + 5 × level" },
      }),
    ).toBe("Artificer")
    expect(
      defaultCreatureIconForItem({
        name: "Beast of the Land",
        creature_type: "Beast",
        class_name: "Ranger",
      }),
    ).toBe(SRD_CLASS_ICONS_BY_NAME.Ranger)
  })

  it("reads class_level refs on the companion stat block", () => {
    expect(
      inferCreatureOwnerClassName({
        creature_type: "Construct",
        stat_block: {
          hp: {
            parts: [
              { type: "fixed", value: 5 },
              { type: "scale", ref: { kind: "class_level", className: "Inventor", multiplier: 5 } },
            ],
          },
        },
      }),
    ).toBe("Inventor")
    expect(
      defaultCreatureIconForItem({
        name: "Mechanical Golem",
        creature_type: "Construct",
        stat_block: {
          hp: {
            parts: [
              { type: "scale", ref: { kind: "class_level", className: "Inventor", multiplier: 5 } },
            ],
          },
        },
      }),
    ).toBe(HOMEBREW_CLASS_ICONS_BY_NAME.Inventor)
  })

  it("falls back to creature type when no class icon is known", () => {
    expect(
      defaultCreatureIconForItem({
        name: "Wolf",
        creature_type: "Beast",
      }),
    ).toBe("wolf-head")
    expect(
      defaultCreatureIconForItem({
        name: "Steel Defender",
        creature_type: "Construct",
        scaling: { scales_with: "your Artificer level", notes: "" },
      }),
    ).toBe("robot-golem")
    expect(
      defaultCreatureIconForItem({
        name: "Skeleton",
        creature_type: "Undead (Humanoid)",
      }),
    ).toBe("stoned-skull")
  })

  it("keeps an assigned icon", () => {
    expect(
      defaultCreatureIconForItem({
        name: "Wolf",
        creature_type: "Beast",
        icon: "custom-paw",
        class_name: "Ranger",
      }),
    ).toBe("custom-paw")
  })

  it("wires creature defaults through getCompendiumItemIcon", () => {
    expect(
      getCompendiumItemIcon("creatures", {
        name: "Minstrel",
        creature_type: "Humanoid",
        scaling: { scales_with: "your Captain level" },
      }),
    ).toBe("captain-hat-profile")
    expect(
      getCompendiumItemIcon("creatures", {
        name: "Wolf",
        creature_type: "Beast",
      }),
    ).toBe("wolf-head")
  })

  it("ships every creature-type default icon", () => {
    const iconsDir = path.join(process.cwd(), "public/icons")
    for (const [type, slug] of Object.entries(CREATURE_TYPE_ICONS_BY_NAME)) {
      expect(
        fs.existsSync(path.join(iconsDir, `${slug}.svg`)),
        `missing icon for ${type}: ${slug}`,
      ).toBe(true)
    }
  })
})
