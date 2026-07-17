import { describe, expect, it } from "vitest"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import {
  formSelectionsFromState,
  resolveCharacterCompanionsDetailed,
} from "@/lib/character/resolve-companions"
import { buildSrdCreatureSeedRows } from "@/lib/compendium/seed-srd-creatures"
import type { Creature } from "@/lib/types"

const SEED_CREATURES = buildSrdCreatureSeedRows() as unknown as Creature[]

const CTX = {
  abilityMods: { strength: 0, dexterity: 0, constitution: 0, intelligence: 1, wisdom: 3, charisma: 0 },
  proficiencyBonus: 3,
  spellAttackModifier: 6,
  spellSaveDc: 14,
  classLevels: [{ className: "Druid", level: 5 }],
  ownerMaxHp: 38,
}

function classDetail(params: {
  classId: string
  className: string
  level: number
  features: { name: string; level: number; description?: string }[]
  subclass?: { id: string; name: string; features: { name: string; level: number; description?: string }[] }
}): CharacterClassDetail {
  return {
    row: { class_id: params.classId, level: params.level, subclass_id: params.subclass?.id ?? null },
    class: {
      name: params.className,
      features: params.features.map((f) => ({ description: "", ...f })),
    },
    subclass: params.subclass
      ? { id: params.subclass.id, name: params.subclass.name, features: params.subclass.features.map((f) => ({ description: "", ...f })) }
      : null,
  } as unknown as CharacterClassDetail
}

const druid = (level: number) =>
  classDetail({
    classId: "druid",
    className: "Druid",
    level,
    features: [{ name: "Wild Shape", level: 2 }],
  })

describe("Wild Shape linked to eligible beasts", () => {
  it("defaults to the four recommended forms and exposes the eligible pool", () => {
    const { companions, formGroups } = resolveCharacterCompanionsDetailed({
      classDetails: [druid(2)],
      ctx: CTX,
      creatures: SEED_CREATURES,
    })
    const wildShape = formGroups.find((group) => group.kind === "wild_shape")!
    expect(wildShape.featureName).toBe("Wild Shape")
    expect(wildShape.maxKnown).toBe(4)
    expect(wildShape.selected.sort()).toEqual(["Rat", "Riding Horse", "Spider", "Wolf"])
    expect(wildShape.options.map((o) => o.name)).toContain("Panther")
    expect(wildShape.options.map((o) => o.name)).not.toContain("Owl")

    const names = companions.map((c) => c.template.name).sort()
    expect(names).toEqual(["Rat", "Riding Horse", "Spider", "Wolf"])
    expect(companions.every((c) => c.polymorph)).toBe(true)
  })

  it("honors player-selected known forms from companion state", () => {
    const state = [{ key: "druid:none:wild_shape", knownForms: ["Panther", "Wolf"] }]
    const { companions, formGroups } = resolveCharacterCompanionsDetailed({
      classDetails: [druid(5)],
      ctx: CTX,
      creatures: SEED_CREATURES,
      formSelections: formSelectionsFromState(state),
    })
    expect(companions.map((c) => c.template.name).sort()).toEqual(["Panther", "Wolf"])
    const wildShape = formGroups.find((group) => group.kind === "wild_shape")!
    expect(wildShape.maxKnown).toBe(6)
    // CR 1/2 beasts unlock at level 5.
    expect(wildShape.options.map((o) => o.name)).toContain("Black Bear")
  })

  it("falls back to the bundled SRD forms without a creatures catalog", () => {
    const { companions, formGroups } = resolveCharacterCompanionsDetailed({
      classDetails: [druid(2)],
      ctx: CTX,
    })
    expect(companions.map((c) => c.template.name).sort()).toEqual([
      "Rat",
      "Riding Horse",
      "Spider",
      "Wolf",
    ])
    expect(formGroups).toHaveLength(0)
  })
})

describe("Find Familiar form selection", () => {
  const wizardSource = { className: "Wizard", classId: "wizard" }

  it("grants the generic familiar with pickable forms when no form is chosen", () => {
    const { companions, formGroups } = resolveCharacterCompanionsDetailed({
      classDetails: [],
      ctx: CTX,
      creatures: SEED_CREATURES,
      findFamiliarSpellSource: wizardSource,
    })
    expect(companions.map((c) => c.template.name)).toContain("Familiar")
    const familiar = formGroups.find((group) => group.kind === "familiar")!
    expect(familiar.options.map((o) => o.name)).toContain("Owl")
    expect(familiar.options.map((o) => o.name)).not.toContain("Imp")
    expect(familiar.maxKnown).toBe(1)
  })

  it("resolves the chosen form into the familiar's stat block", () => {
    const { companions } = resolveCharacterCompanionsDetailed({
      classDetails: [],
      ctx: CTX,
      creatures: SEED_CREATURES,
      findFamiliarSpellSource: wizardSource,
      formSelections: { "wizard:none:find_familiar": ["Owl"] },
    })
    const familiar = companions.find((c) => /^Familiar/.test(c.template.name))!
    expect(familiar.template.name).toBe("Familiar (Owl)")
    expect(familiar.template.traits.map((t) => t.name)).toContain("Telepathic Link")
  })

  it("broadens options for a Warlock with Pact of the Chain", () => {
    const warlock = classDetail({
      classId: "warlock",
      className: "Warlock",
      level: 3,
      features: [{ name: "Pact of the Chain", level: 3 }],
    })
    const { companions, formGroups } = resolveCharacterCompanionsDetailed({
      classDetails: [warlock],
      ctx: CTX,
      creatures: SEED_CREATURES,
      formSelections: { "warlock:none:pact_of_the_chain": ["Imp"] },
    })
    const group = formGroups.find((g) => g.kind === "familiar")!
    expect(group.featureName).toBe("Pact of the Chain")
    const optionNames = group.options.map((o) => o.name)
    for (const name of ["Imp", "Pseudodragon", "Quasit", "Skeleton", "Sphinx of Wonder", "Sprite", "Venomous Snake"]) {
      expect(optionNames).toContain(name)
    }
    const familiar = companions.find((c) => /^Familiar/.test(c.template.name))!
    expect(familiar.template.name).toBe("Familiar (Imp)")
  })

  it("suppresses the spell-source familiar when a feature already granted one", () => {
    const warlock = classDetail({
      classId: "warlock",
      className: "Warlock",
      level: 3,
      features: [{ name: "Pact of the Chain", level: 3 }],
    })
    const { companions } = resolveCharacterCompanionsDetailed({
      classDetails: [warlock],
      ctx: CTX,
      creatures: SEED_CREATURES,
      findFamiliarSpellSource: { className: "Warlock", classId: "warlock" },
      formSelections: { "warlock:none:pact_of_the_chain": ["Sprite"] },
    })
    const familiars = companions.filter((c) => /^Familiar/.test(c.template.name))
    expect(familiars).toHaveLength(1)
    expect(familiars[0].template.name).toBe("Familiar (Sprite)")
  })
})

describe("Faithful Steed on the companion tab", () => {
  it("resolves the Otherworldly Steed via the grant_creature modifier", () => {
    const paladin = classDetail({
      classId: "paladin",
      className: "Paladin",
      level: 5,
      features: [
        {
          name: "Faithful Steed",
          level: 5,
          // Enrichment attaches companion_creature_names / grant_creature; the
          // resolve layer reads the names field directly.
        },
      ],
    })
    const feature = (paladin.class as unknown as { features: Record<string, unknown>[] })
      .features[0]
    feature.companion_creature_names = ["Otherworldly Steed"]

    const { companions } = resolveCharacterCompanionsDetailed({
      classDetails: [paladin],
      ctx: { ...CTX, classLevels: [{ className: "Paladin", level: 5 }] },
      creatures: SEED_CREATURES,
    })
    const steed = companions.find((c) => c.template.name === "Otherworldly Steed")
    expect(steed).toBeDefined()
    expect(steed!.source.featureName).toBe("Faithful Steed")
  })
})
