import { describe, expect, it } from "vitest"
import { getBackgroundStartingGold } from "@/lib/compendium/background-equipment"
import { isLegacyBackground } from "@/lib/compendium/background-origin-feat"
import { loadKibblesTastyPack } from "@/lib/seed-packs/kibbles-tasty/load"
import type { Background, Trait } from "@/lib/types"

function serializedModifiers(value: { linkedModifiers?: unknown[] } | undefined): string {
  return JSON.stringify(value?.linkedModifiers ?? [])
}

describe("Kibbles Tasty species and background seed content", () => {
  const pack = loadKibblesTastyPack()
  const species = pack.files.flatMap((file) => file.species ?? [])
  const backgrounds = pack.files.flatMap((file) => file.backgrounds ?? [])
  const feats = pack.files.flatMap((file) => file.feats ?? [])

  it("keeps manifest files aligned with the runtime loader", () => {
    expect(pack.manifest.files).toHaveLength(pack.files.length)
    expect(pack.manifest.files).toEqual(
      expect.arrayContaining(["kibbles-backgrounds.json", "kibbles-species.json"]),
    )
  })

  it("loads all audited species, backgrounds, and species feats", () => {
    expect(species.map((row) => row.name)).toEqual([
      "Awakened Undead",
      "Ironwrought",
      "Farling",
      "Augmented",
      "Warped",
    ])
    expect(backgrounds.map((row) => row.name)).toEqual([
      "Apothecary",
      "Engineer",
      "Tinker",
    ])
    expect(feats.map((row) => row.name)).toEqual(
      expect.arrayContaining(["Modified Remains", "Twice Awakened", "Refined Control"]),
    )
    expect(
      species.every(
        (row) => (row as typeof row & { source?: string }).source === "Kibbles Tasty",
      ),
    ).toBe(true)
    expect(backgrounds.every((row) => row.source === "Kibbles Tasty")).toBe(true)
  })

  it("ships curated icons and source details on species and backgrounds", () => {
    expect(
      species.map((row) => ({
        name: row.name,
        icon: (row as { icon?: string | null }).icon ?? null,
        creator_url: (row as { creator_url?: string | null }).creator_url ?? null,
      })),
    ).toEqual([
      {
        name: "Awakened Undead",
        icon: "surprised-skull",
        creator_url: "https://www.kthomebrew.com/",
      },
      {
        name: "Ironwrought",
        icon: "robot-helmet",
        creator_url: "https://www.kthomebrew.com/",
      },
      {
        name: "Farling",
        icon: "alien-bug",
        creator_url: "https://www.kthomebrew.com/",
      },
      {
        name: "Augmented",
        icon: "mechanical-arm",
        creator_url: "https://www.kthomebrew.com/",
      },
      {
        name: "Warped",
        icon: "tentacles-skull",
        creator_url: "https://www.kthomebrew.com/",
      },
    ])
    expect(
      backgrounds.every(
        (row) => (row as { creator_url?: string | null }).creator_url === "https://www.kthomebrew.com/",
      ),
    ).toBe(true)
    expect(
      backgrounds.map((row) => ({
        name: row.name,
        icon: (row as { icon?: string | null }).icon ?? null,
      })),
    ).toEqual([
      { name: "Apothecary", icon: "cauldron" },
      { name: "Engineer", icon: "monkey-wrench" },
      { name: "Tinker", icon: "screwdriver" },
    ])
  })

  it("ships option-level species wiring for darkvision and languages", () => {
    const ironwrought = species.find((row) => row.name === "Ironwrought")
    const modular = (ironwrought?.traits as Trait[] | undefined)?.find(
      (trait) => trait.name === "Modular Design",
    )
    const nightMode = modular?.choices?.options.find((option) => option.name === "Night Mode")
    expect(serializedModifiers(nightMode)).toMatch(/darkvision/i)
    expect(serializedModifiers(nightMode)).toMatch(/"rangeFeet":60/)

    const augmented = species.find((row) => row.name === "Augmented")
    const abilities = (augmented?.traits as Trait[] | undefined)?.find(
      (trait) => trait.name === "Augmented Abilities",
    )
    const arcaneEye = abilities?.choices?.options.find((option) => option.name === "Arcane Eye")
    expect(serializedModifiers(arcaneEye)).toMatch(/"rangeFeet":120/)

    const undead = species.find((row) => row.name === "Awakened Undead")
    const animatingForce = (undead?.traits as Trait[] | undefined)?.find(
      (trait) => trait.name === "Animating Force",
    )
    const fey = animatingForce?.choices?.options.find((option) => option.name === "Fey Energy")
    const infernal = animatingForce?.choices?.options.find(
      (option) => option.name === "Infernal Energy",
    )
    expect(serializedModifiers(fey)).toMatch(/Sylvan/)
    expect(serializedModifiers(infernal)).toMatch(/Infernal/)
  })

  it("keeps Farling skill and artisan-tool choices", () => {
    const farling = species.find((row) => row.name === "Farling")
    const absorption = (farling?.traits as Trait[] | undefined)?.find(
      (trait) => trait.name === "Skill Absorption",
    )
    expect(serializedModifiers(absorption)).toMatch(/"type":"skills"/)
    expect(serializedModifiers(absorption)).toMatch(/"type":"tool_proficiencies"/)
  })

  it("keeps all three backgrounds legacy and preserves Engineer pouch gold", () => {
    expect(backgrounds.every((row) => isLegacyBackground(row as unknown as Background))).toBe(true)

    const engineer = backgrounds.find((row) => row.name === "Engineer") as
      | Background
      | undefined
    expect(engineer).toBeDefined()
    expect(getBackgroundStartingGold(engineer!)).toBe(10)
    expect(engineer?.starting_equipment?.map((item) => item.name)).toContain("Belt Pouch")

    const tinker = backgrounds.find((row) => row.name === "Tinker")
    const tinkerFeature = tinker?.feature as
      | { name: string; description: string; linkedModifiers?: unknown[] }
      | undefined
    const tinkerLanguageWiring = JSON.stringify(tinkerFeature?.linkedModifiers ?? [])
    expect(tinkerLanguageWiring).toMatch(/"type":"languages"/)
    expect(tinkerLanguageWiring).toMatch(/"choiceCount":1/)
  })
})
