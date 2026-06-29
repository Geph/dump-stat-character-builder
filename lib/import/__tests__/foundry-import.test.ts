import { describe, expect, it } from "vitest"
import {
  cleanFoundryHtml,
  isFoundryDnd5eJson,
  parseFoundryDnd5eJson,
} from "@/lib/import/parse-foundry-dnd5e"

const fireball = {
  name: "Fireball",
  type: "spell",
  system: {
    description: {
      value:
        "<p>A bright streak flashes to a point you choose. Each creature must make a @Check[type:dexterity]{Dexterity saving throw}, taking [[/damage 8d6 fire]] damage.</p>",
    },
    level: 3,
    school: "evo",
    properties: ["vocal", "somatic", "material"],
    materials: { value: "a tiny ball of bat guano and sulfur" },
    activation: { type: "action", cost: 1 },
    range: { value: 150, units: "ft" },
    duration: { value: 0, units: "inst" },
    sourceClass: "wizard",
  },
}

const concentrationSpell = {
  name: "Bless",
  type: "spell",
  system: {
    description: { value: "<p>You bless up to three creatures.</p>" },
    level: 1,
    school: "enc",
    properties: ["vocal", "somatic", "material", "concentration"],
    activation: { type: "action", cost: 1 },
    range: { value: 30, units: "ft" },
    duration: { value: 1, units: "minute" },
  },
}

const legacyComponentsSpell = {
  name: "Mage Hand",
  type: "spell",
  system: {
    description: { value: "<p>A spectral hand appears.</p>" },
    level: 0,
    school: "con",
    components: { vocal: true, somatic: true, material: false, concentration: false, ritual: false },
    activation: { type: "action", cost: 1 },
    range: { value: 30, units: "ft" },
    duration: { value: 1, units: "minute" },
  },
}

const homebrewWeapon = {
  name: "Sun Blade",
  type: "weapon",
  system: {
    description: { value: "<p>A radiant blade of pure light.</p>" },
    type: { value: "martialM" },
    damage: { base: { number: 1, denomination: 8, types: ["radiant"] } },
    properties: ["fin", "ver", "mgc"],
    price: { value: 5000, denomination: "gp" },
    weight: { value: 3 },
    rarity: "rare",
    attunement: "required",
  },
}

const originFeat = {
  name: "Tough",
  type: "feat",
  system: {
    description: { value: "<p>Your hit point maximum increases.</p>" },
    type: { value: "feat", subtype: "origin" },
    requirements: "",
  },
}

const homebrewClass = {
  name: "Warlord",
  type: "class",
  system: {
    description: { value: "<p>A battlefield commander.</p>" },
    hd: { denomination: "d10" },
    primaryAbility: { value: ["cha"] },
    spellcasting: { progression: "half", ability: "cha" },
    advancement: [
      {
        type: "Trait",
        configuration: { grants: ["saves:str", "saves:cha", "armor:lgt", "armor:med", "weapon:mar"] },
      },
      {
        type: "Trait",
        configuration: {
          choices: [{ count: 2, pool: ["skills:ath", "skills:itm", "skills:per"] }],
        },
      },
    ],
  },
}

describe("cleanFoundryHtml", () => {
  it("strips enrichers and inline rolls but keeps labels", () => {
    const cleaned = cleanFoundryHtml(
      "Make a @Check[type:dexterity]{Dexterity save} or take [[/damage 8d6 fire]] and @UUID[Compendium.x.y]",
    )
    expect(cleaned).toContain("Dexterity save")
    expect(cleaned).toContain("8d6 fire")
    expect(cleaned).not.toContain("@Check")
    expect(cleaned).not.toContain("[[")
    expect(cleaned).not.toContain("@UUID")
  })
})

describe("isFoundryDnd5eJson", () => {
  it("detects a single Foundry item", () => {
    expect(isFoundryDnd5eJson(JSON.stringify(fireball))).toBe(true)
  })

  it("detects an array of Foundry items", () => {
    expect(isFoundryDnd5eJson(JSON.stringify([fireball, homebrewWeapon]))).toBe(true)
  })

  it("detects newline-delimited NeDB pack lines", () => {
    const nedb = `${JSON.stringify(fireball)}\n${JSON.stringify(originFeat)}`
    expect(isFoundryDnd5eJson(nedb)).toBe(true)
  })

  it("ignores non-Foundry JSON", () => {
    expect(isFoundryDnd5eJson(JSON.stringify({ spells: [] }))).toBe(false)
    expect(isFoundryDnd5eJson('{"type":"dump-stat-export","items":[]}')).toBe(false)
    expect(isFoundryDnd5eJson("not json")).toBe(false)
  })
})

describe("parseFoundryDnd5eJson — spells", () => {
  it("maps a standard spell with school, components, casting time, range, duration", () => {
    const content = parseFoundryDnd5eJson(JSON.stringify(fireball))
    const spell = content?.spells?.[0]
    expect(spell?.name).toBe("Fireball")
    expect(spell?.level).toBe(3)
    expect(spell?.school).toBe("Evocation")
    expect(spell?.components).toEqual(["V", "S", "M"])
    expect(spell?.casting_time).toBe("1 Action")
    expect(spell?.range).toBe("150 feet")
    expect(spell?.duration).toBe("Instantaneous")
    expect(spell?.concentration).toBe(false)
    expect(spell?.classes).toEqual(["Wizard"])
    expect(spell?.description).toContain("Dexterity saving throw")
    expect(spell?.description).toContain("bat guano")
    expect(spell?.description).not.toContain("@Check")
  })

  it("formats concentration durations", () => {
    const content = parseFoundryDnd5eJson(JSON.stringify(concentrationSpell))
    const spell = content?.spells?.[0]
    expect(spell?.concentration).toBe(true)
    expect(spell?.duration).toBe("Concentration, up to 1 minute")
  })

  it("supports legacy components objects", () => {
    const content = parseFoundryDnd5eJson(JSON.stringify(legacyComponentsSpell))
    const spell = content?.spells?.[0]
    expect(spell?.level).toBe(0)
    expect(spell?.school).toBe("Conjuration")
    expect(spell?.components).toEqual(["V", "S"])
  })
})

describe("parseFoundryDnd5eJson — equipment", () => {
  it("maps a magic weapon with damage, properties, cost, rarity, attunement", () => {
    const content = parseFoundryDnd5eJson(JSON.stringify(homebrewWeapon))
    const item = content?.equipment?.[0]
    expect(item?.name).toBe("Sun Blade")
    expect(item?.category).toBe("Weapon")
    expect(item?.subcategory).toBe("Martial Melee")
    expect(item?.rarity).toBe("Rare")
    expect(item?.requires_attunement).toBe(true)
    expect(item?.magic_item_category).toBe("Weapon")
    expect(item?.cost).toEqual({ amount: 5000, unit: "GP" })
    expect(item?.weight).toBe(3)
    const props = item?.properties as Record<string, unknown>
    expect(props.damage).toBe("1d8 Radiant")
    expect(props.properties).toEqual(["Finesse", "Versatile", "Magical"])
  })
})

describe("parseFoundryDnd5eJson — feats", () => {
  it("maps a feat with its category", () => {
    const content = parseFoundryDnd5eJson(JSON.stringify(originFeat))
    const feat = content?.feats?.[0]
    expect(feat?.name).toBe("Tough")
    expect(feat?.category).toBe("Origin")
  })
})

describe("parseFoundryDnd5eJson — classes", () => {
  it("maps hit die, abilities, proficiencies, skill choices, spellcasting", () => {
    const content = parseFoundryDnd5eJson(JSON.stringify(homebrewClass))
    const cls = content?.classes?.[0]
    expect(cls?.name).toBe("Warlord")
    expect(cls?.hit_die).toBe(10)
    expect(cls?.primary_ability).toEqual(["Charisma"])
    expect(cls?.saving_throws).toEqual(["Strength", "Charisma"])
    expect(cls?.armor_proficiencies).toEqual(["Light", "Medium"])
    expect(cls?.weapon_proficiencies).toEqual(["Martial weapons"])
    expect(cls?.skill_choices).toEqual({
      count: 2,
      options: ["Athletics", "Intimidation", "Persuasion"],
    })
    expect(cls?.spellcasting).toEqual({ ability: "Charisma" })
  })
})

describe("parseFoundryDnd5eJson — mixed pack", () => {
  it("buckets a multi-type export and returns null for empty", () => {
    const content = parseFoundryDnd5eJson(
      JSON.stringify([fireball, homebrewWeapon, originFeat, homebrewClass]),
    )
    expect(content?.spells?.length).toBe(1)
    expect(content?.equipment?.length).toBe(1)
    expect(content?.feats?.length).toBe(1)
    expect(content?.classes?.length).toBe(1)
    expect(parseFoundryDnd5eJson(JSON.stringify([{ type: "spell", system: {} }]))).toBeNull()
  })
})
