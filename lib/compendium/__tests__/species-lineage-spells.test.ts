import { describe, expect, it } from "vitest"
import { enrichCustomSpeciesRow } from "@/lib/compendium/enrich-custom-species"
import { enrichSrdSpeciesRow } from "@/lib/compendium/enrich-srd-species"
import { collectGrantedSpellCastProfiles } from "@/lib/character/free-cast-spells"
import { tagModifierSource } from "@/lib/character/tag-modifier-source"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import type { Trait } from "@/lib/types"

function optionSpells(option: { linkedModifiers?: { characteristics?: CharacteristicModifier[] }[] }) {
  return (option.linkedModifiers ?? []).flatMap((instance) =>
    (instance.characteristics ?? []).flatMap((char) =>
      char.type === "spells_known" ? (char.spells ?? []) : [],
    ),
  )
}

describe("species lineage spell grants", () => {
  it("merges Wood Elf lineage spells onto a PHB option that already has speed", () => {
    const enriched = enrichCustomSpeciesRow({
      name: "Elf",
      source: "phb",
      traits: [
        {
          name: "Elven Lineage",
          description: "Choose a lineage.",
          isChoice: true,
          choices: {
            category: "Elven Lineage",
            count: 1,
            options: [
              {
                name: "Wood Elf",
                description: "Level 1: Speed increases to 35 ft.; know Druidcraft.",
                linkedModifiers: [
                  {
                    instanceId: "modinst_speed_5",
                    catalogRefId: "cat_char_speed",
                    characteristics: [
                      {
                        id: "mod_speed_5",
                        type: "speed",
                        speedType: "walk",
                        mode: "add",
                        value: 5,
                        label: "Wood Elf speed",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    })

    const lineage = (enriched.traits as Trait[]).find((trait) => trait.name === "Elven Lineage")
    const wood = lineage?.choices?.options?.find((option) => option.name === "Wood Elf")
    const spells = optionSpells(wood ?? {})
    const ids = spells.map((entry) => entry.spellId)

    expect(ids.join(" ")).toMatch(/Druidcraft/)
    expect(ids.join(" ")).toMatch(/Longstrider/)
    expect(ids.join(" ")).toMatch(/Pass without Trace/)
    expect(spells.find((entry) => /Longstrider/i.test(entry.spellId))?.unlocksAtClassLevel).toBe(3)
    expect(spells.find((entry) => /Longstrider/i.test(entry.spellId))?.freeCastPerLongRest).toBe(1)
    expect(spells.find((entry) => /Pass without Trace/i.test(entry.spellId))?.freeCastPerLongRest).toBe(1)
    expect(wood?.linkedModifiers?.some((instance) => instance.catalogRefId === "cat_char_speed")).toBe(
      true,
    )
  })

  it("copies 1/Long Rest free casts onto stored Wood Elf grants that only have names", () => {
    const enriched = enrichCustomSpeciesRow({
      name: "Elf",
      source: "phb",
      traits: [
        {
          name: "Elven Lineage",
          description: "",
          isChoice: true,
          choices: {
            category: "Elven Lineage",
            count: 1,
            options: [
              {
                name: "Wood Elf",
                description: "",
                linkedModifiers: [
                  {
                    instanceId: "modinst_wood_elf_spells",
                    catalogRefId: "cat_char_spells_known",
                    characteristics: [
                      {
                        id: "mod_wood_elf_spells",
                        type: "spells_known",
                        alwaysPrepared: true,
                        spells: [
                          { spellId: "Druidcraft", alwaysPrepared: true, unlocksAtClassLevel: 1 },
                          { spellId: "Longstrider", alwaysPrepared: true, unlocksAtClassLevel: 3 },
                          {
                            spellId: "Pass without Trace",
                            alwaysPrepared: true,
                            unlocksAtClassLevel: 5,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    })
    const wood = (enriched.traits as Trait[])
      .find((trait) => trait.name === "Elven Lineage")
      ?.choices?.options?.find((option) => option.name === "Wood Elf")
    const spells = optionSpells(wood ?? {})
    expect(spells.find((entry) => /Longstrider/i.test(entry.spellId))?.freeCastPerLongRest).toBe(1)
    expect(spells.find((entry) => /Druidcraft/i.test(entry.spellId))?.freeCastPerLongRest).toBeUndefined()
  })

  it("keeps SRD High Elf and Tiefling Infernal grants with free casts on leveled spells", () => {
    const elf = enrichSrdSpeciesRow({
      name: "Elf",
      source: "SRD",
      traits: [
        {
          name: "Elven Lineage",
          description: "",
          isChoice: true,
          choices: {
            category: "Elven Lineage",
            count: 1,
            options: [{ name: "High Elf", description: "" }],
          },
        },
      ],
    })
    const high = (elf.traits as Trait[])
      .find((trait) => trait.name === "Elven Lineage")
      ?.choices?.options?.find((option) => option.name === "High Elf")
    const highSpells = optionSpells(high ?? {})
    expect(highSpells.map((entry) => entry.spellId).join(" ")).toMatch(
      /Prestidigitation.*Detect Magic.*Misty Step|Prestidigitation/,
    )
    expect(highSpells.find((entry) => /Misty Step/i.test(entry.spellId))?.freeCastPerLongRest).toBe(1)

    const profiles = collectGrantedSpellCastProfiles(
      tagModifierSource(
        highSpells.length
          ? [
              {
                id: "mod_high_elf_spells",
                type: "spells_known",
                spells: highSpells,
                alwaysPrepared: true,
                castingAbility: "intelligence",
                label: "High Elf lineage spells",
              } as CharacteristicModifier,
            ]
          : [],
        { sourceType: "species", source: "Elven Lineage", sourceId: "elf", label: "Elven Lineage" },
      ),
    )
    const misty = profiles.find((profile) => /Misty Step/i.test(profile.spellId ?? ""))
    expect(misty).toMatchObject({
      castingAbility: "intelligence",
      freeCastCount: 1,
    })
  })
})
