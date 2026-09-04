import { describe, expect, it } from "vitest"
import {
  flattenSourceBasenameToSlug,
  parseSpellCardSourceBase,
  parseSubclassSourceBasename,
} from "../../../scripts/card-source-layout.mjs"

describe("card source layout", () => {
  it("parses origin-folder subclass remainders into class/display slugs", () => {
    expect(parseSubclassSourceBasename("Cleric Light")).toMatchObject({
      classSlug: "cleric",
      itemSlug: "light-domain",
      displayName: "Light Domain",
    })
    expect(parseSubclassSourceBasename("Monk Mystric Arts")).toMatchObject({
      classSlug: "monk",
      itemSlug: "mystic-arts",
      displayName: "Mystic Arts",
    })
    expect(parseSubclassSourceBasename("Psion Knowing")).toMatchObject({
      classSlug: "psion",
      itemSlug: "knowing-mind",
      displayName: "Knowing Mind",
    })
    expect(parseSubclassSourceBasename("Bard College of the Moon")).toMatchObject({
      classSlug: "bard",
      itemSlug: "college-of-the-moon",
    })
    expect(parseSubclassSourceBasename("Druid Forged")).toMatchObject({
      classSlug: "druid",
      itemSlug: "circle-of-the-forged",
    })
    expect(parseSubclassSourceBasename("Paladin Vengence")).toMatchObject({
      classSlug: "paladin",
      itemSlug: "oath-of-vengeance",
      displayName: "Oath of Vengeance",
    })
    expect(parseSubclassSourceBasename("Paladin Genies")).toMatchObject({
      classSlug: "paladin",
      itemSlug: "oath-of-the-noble-genies",
      displayName: "Oath of the Noble Genies",
    })
    expect(parseSubclassSourceBasename("Ranger Beastmaster")).toMatchObject({
      classSlug: "ranger",
      itemSlug: "beast-master",
      displayName: "Beast Master",
    })
    expect(parseSubclassSourceBasename("Rogue Soul Knife")).toMatchObject({
      classSlug: "rogue",
      itemSlug: "soulknife",
      displayName: "Soulknife",
    })
    expect(parseSubclassSourceBasename("Ranger Warden")).toMatchObject({
      classSlug: "ranger",
      itemSlug: "warden",
      displayName: "Warden",
    })
    expect(parseSubclassSourceBasename("Alchemist Amorist")).toMatchObject({
      classSlug: "alchemist",
      itemSlug: "amorist",
      displayName: "Amorist",
    })
    expect(parseSubclassSourceBasename("Amorist")).toMatchObject({
      classSlug: "alchemist",
      itemSlug: "amorist",
      displayName: "Amorist",
    })
    expect(parseSubclassSourceBasename("Slime Rancher")).toMatchObject({
      classSlug: "alchemist",
      itemSlug: "ooze-rancher",
      displayName: "Ooze Rancher",
    })
    expect(parseSubclassSourceBasename("Acrobat")).toMatchObject({
      classSlug: "dancer",
      itemSlug: "acrobat",
      displayName: "Acrobat",
    })
    expect(parseSubclassSourceBasename("Fire Dancer")).toMatchObject({
      classSlug: "dancer",
      itemSlug: "fire-dancer",
      displayName: "Fire Dancer",
    })
    expect(parseSubclassSourceBasename("Danseur Macabre")).toMatchObject({
      classSlug: "dancer",
      itemSlug: "danseur-macabre",
      displayName: "Danseur Macabre",
    })
  })

  it("flattens Title Case, Drive copies, and typo aliases", () => {
    expect(flattenSourceBasenameToSlug("Dragonborn (1)")).toBe("dragonborn")
    expect(flattenSourceBasenameToSlug("Aasimar-2024")).toBe("aasimar")
    expect(flattenSourceBasenameToSlug("archeaeologist")).toBe("archaeologist")
    expect(flattenSourceBasenameToSlug("House Thurani Heir")).toBe("house-thuranni-heir")
    expect(flattenSourceBasenameToSlug("House Tharashk")).toBe("house-tharashk-heir")
    expect(flattenSourceBasenameToSlug("Gate Guardian")).toBe("gate-warden")
    expect(flattenSourceBasenameToSlug("Dhakanni Golin'dar")).toBe("dhakaani-golindar")
  })

  it("collapses spell version/Front suffixes and typo aliases", () => {
    expect(parseSpellCardSourceBase("Mutate 2")).toEqual({ outputSlug: "mutate", version: 2 })
    expect(parseSpellCardSourceBase("Repair Front")).toEqual({ outputSlug: "repair", version: 0 })
    expect(parseSpellCardSourceBase("sapre-the-dying")).toEqual({
      outputSlug: "spare-the-dying",
      version: 0,
    })
  })
})
