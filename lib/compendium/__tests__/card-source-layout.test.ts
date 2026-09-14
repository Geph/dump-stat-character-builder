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
    expect(parseSubclassSourceBasename("Death Knight")).toMatchObject({
      classSlug: "necromancer",
      itemSlug: "death-knight",
      displayName: "Death Knight",
    })
    expect(parseSubclassSourceBasename("Reanimator")).toMatchObject({
      classSlug: "necromancer",
      itemSlug: "reanimator",
      displayName: "Reanimator",
    })
    expect(parseSubclassSourceBasename("Plague Lord")).toMatchObject({
      classSlug: "necromancer",
      itemSlug: "plague-lord",
      displayName: "Plague Lord",
    })
    expect(parseSubclassSourceBasename("Gray Watchman")).toMatchObject({
      classSlug: "warden",
      itemSlug: "grey-watchman",
      displayName: "Grey Watchman",
    })
    expect(parseSubclassSourceBasename("Lion Banner")).toMatchObject({
      classSlug: "captain",
      itemSlug: "lion-banner",
      displayName: "Lion Banner",
    })
    expect(parseSubclassSourceBasename("Alchemist Mad Bomber")).toMatchObject({
      classSlug: "alchemist",
      itemSlug: "mad-bomber",
      displayName: "Mad Bomber",
    })
    expect(parseSubclassSourceBasename("Captain Jolly Roger")).toMatchObject({
      classSlug: "captain",
      itemSlug: "jolly-roger",
      displayName: "Jolly Roger",
    })
    expect(parseSubclassSourceBasename("Dancer Moonwalker")).toMatchObject({
      classSlug: "dancer",
      itemSlug: "moonwalker",
      displayName: "Moonwalker",
    })
    expect(parseSubclassSourceBasename("Dancer Mime")).toMatchObject({
      classSlug: "dancer",
      itemSlug: "mime",
      displayName: "Mime",
    })
    expect(parseSubclassSourceBasename("Dancer Shadow Dancer")).toMatchObject({
      classSlug: "dancer",
      itemSlug: "shadow-dancer",
      displayName: "Shadow Dancer",
    })
    expect(parseSubclassSourceBasename("Warmage House of Darts")).toMatchObject({
      classSlug: "warmage",
      itemSlug: "house-of-darts",
      displayName: "House of Darts",
    })
    expect(parseSubclassSourceBasename("Witch Black Magic")).toMatchObject({
      classSlug: "witch",
      itemSlug: "black-magic",
      displayName: "Black Magic",
    })
    expect(parseSubclassSourceBasename("Witch Technicolor")).toMatchObject({
      classSlug: "witch",
      itemSlug: "technicolor-magic",
      displayName: "Technicolor Magic",
    })
    expect(parseSubclassSourceBasename("Witch Black")).toMatchObject({
      classSlug: "witch",
      itemSlug: "black-magic",
      displayName: "Black Magic",
    })
    expect(parseSubclassSourceBasename("Craftsman Armigers")).toMatchObject({
      classSlug: "craftsman",
      itemSlug: "armigers-guild",
      displayName: "Armigers' Guild",
    })
    expect(parseSubclassSourceBasename("Gunslinger Trick Shot")).toMatchObject({
      classSlug: "gunslinger",
      itemSlug: "trick-shot",
      displayName: "Trick Shot",
    })
    expect(parseSubclassSourceBasename("Gunslinger Gun Ko Master")).toMatchObject({
      classSlug: "gunslinger",
      itemSlug: "gun-ko-master",
      displayName: "Gun-Ko Master",
    })
    expect(parseSubclassSourceBasename("Martyr Tyranny")).toMatchObject({
      classSlug: "martyr",
      itemSlug: "burden-of-tyranny",
      displayName: "Burden of Tyranny",
    })
    expect(parseSubclassSourceBasename("Investigator Occultist")).toMatchObject({
      classSlug: "investigator",
      itemSlug: "occultist",
      displayName: "Occultist",
    })
    expect(parseSubclassSourceBasename("Martyr The End")).toMatchObject({
      classSlug: "martyr",
      itemSlug: "burden-of-the-end",
      displayName: "Burden of the End",
    })
    expect(parseSubclassSourceBasename("Warmage House of Bishops")).toMatchObject({
      classSlug: "warmage",
      itemSlug: "house-of-bishops",
      displayName: "House of Bishops",
    })
    expect(parseSubclassSourceBasename("Craftsman Bladeworkers")).toMatchObject({
      classSlug: "craftsman",
      itemSlug: "bladeworkers-guild",
      displayName: "Bladeworkers' Guild",
    })
    expect(parseSubclassSourceBasename("Vagabond Experiment-x")).toMatchObject({
      classSlug: "vagabond",
      itemSlug: "experiment-x",
      displayName: "Experiment X",
    })
    expect(parseSubclassSourceBasename("Vagabond Ronin")).toMatchObject({
      classSlug: "vagabond",
      itemSlug: "ronin",
      displayName: "Rōnin",
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
    // Bare warden = Mage Hand Press; Kibbles masters must use Warden-Kibbles.
    expect(flattenSourceBasenameToSlug("warden")).toBe("warden")
    expect(flattenSourceBasenameToSlug("Warden-Kibbles")).toBe("warden-kibbles")
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
