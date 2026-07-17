import { describe, expect, it } from "vitest"
import { resolveCompanion } from "@/lib/character/companion-stat-block"
import {
  CreatureImportDocumentSchema,
  CreatureImportV2Schema,
  isCreatureImportV2,
} from "@/lib/import/creature-import-v2-schema"
import {
  CreatureImportValidationException,
  parseCreatureImportDocument,
  parseCreatureImportV2,
} from "@/lib/import/load-creature-import-v2"
import { loadCreatureImportDocumentFromFile } from "@/lib/import/load-creature-import-v2-file"
import {
  buildCreaturePersistRows,
  mapCreatureImportV2ToTemplate,
} from "@/lib/import/map-creature-import-v2"
import {
  BASILISK_COMPANION_V2,
  CREATURE_IMPORT_V2_FIXTURE_DOCUMENT,
  MINSTREL_V2,
  WOLF_V2,
} from "@/lib/import/__tests__/fixtures/creature-import-v2-fixtures"
import { existsSync } from "node:fs"
import path from "node:path"

describe("CreatureImportV2Schema", () => {
  it("accepts the Wolf monster fixture", () => {
    expect(CreatureImportV2Schema.safeParse(WOLF_V2).success).toBe(true)
  })

  it("accepts Basilisk and Minstrel companion fixtures", () => {
    expect(CreatureImportV2Schema.safeParse(BASILISK_COMPANION_V2).success).toBe(true)
    expect(CreatureImportV2Schema.safeParse(MINSTREL_V2).success).toBe(true)
  })

  it("rejects a monster missing cr", () => {
    const bad = { ...WOLF_V2, cr: null }
    const result = CreatureImportV2Schema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it("rejects a companion missing scaling", () => {
    const bad = { ...BASILISK_COMPANION_V2, scaling: null }
    const result = CreatureImportV2Schema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it("validates the fixture document", () => {
    expect(CreatureImportDocumentSchema.safeParse(CREATURE_IMPORT_V2_FIXTURE_DOCUMENT).success).toBe(
      true,
    )
  })
})

describe("parseCreatureImportDocument", () => {
  it("throws loudly on invalid documents", () => {
    expect(() => parseCreatureImportDocument({ schema_version: "2.0", creatures: [] })).toThrow(
      CreatureImportValidationException,
    )
    expect(() => parseCreatureImportDocument({ schema_version: "1.0", creatures: [WOLF_V2] })).toThrow(
      CreatureImportValidationException,
    )
  })

  it("round-trips the fixture document without data loss", () => {
    const doc = parseCreatureImportDocument(CREATURE_IMPORT_V2_FIXTURE_DOCUMENT)
    expect(doc.creatures).toHaveLength(3)
    expect(doc.creatures[0]).toEqual(WOLF_V2)
    expect(doc.creatures[1]).toEqual(BASILISK_COMPANION_V2)
    expect(doc.creatures[2]).toEqual(MINSTREL_V2)
  })
})

describe("mapCreatureImportV2ToTemplate + persist", () => {
  it("maps Wolf to fixed scaled values and ability rows", () => {
    const template = mapCreatureImportV2ToTemplate(WOLF_V2)
    expect(template.category).toBe("creature")
    expect(template.ac.parts).toEqual([{ type: "fixed", value: 12 }])
    expect(template.hp.parts).toEqual([{ type: "fixed", value: 11 }])
    expect(template.hitDiceNote).toBe("2d8 + 2")
    expect(template.initiative).toBe("+2 (12)")
    expect(template.abilityScores?.strength).toMatchObject({
      score: 14,
      modifier: 2,
      save: 2,
    })
    expect(template.traits[0]?.name).toBe("Pack Tactics")
    expect(template.actions[0]?.name).toBe("Bite")
    expect(template.xp).toBe(50)
  })

  it("keeps Basilisk companion formulas for resolve-time evaluation", () => {
    const template = mapCreatureImportV2ToTemplate(BASILISK_COMPANION_V2)
    expect(template.category).toBe("companion")
    expect(template.cr).toBeNull()
    expect(template.scaling?.scales_with).toBe("caregiver's level")
    expect(template.ac.parts).toEqual([
      { type: "fixed", value: 15 },
      { type: "scale", ref: { kind: "proficiency_bonus" } },
    ])
    expect(template.hp.parts[0]).toEqual({ type: "fixed", value: 7 })
    expect(template.hp.parts[1]).toMatchObject({
      type: "scale",
      ref: { kind: "class_level", multiplier: 7 },
    })
    expect(template.abilityScores?.constitution?.saveFormula?.parts).toEqual([
      { type: "fixed", value: 2 },
      { type: "scale", ref: { kind: "proficiency_bonus" } },
    ])
    expect(template.actions.map((a) => a.name)).toEqual([
      "Bite",
      "Poison Spittle",
      "Poison Gaze",
      "Lesser Petrifying Gaze",
    ])
    expect(template.actions[1]?.unlockLevel).toBe(1)
    expect(template.actions[1]?.tag).toBe("2 Ferocity")
    expect(template.reactions?.[0]?.name).toBe("Heavy Glare")
  })

  it("resolves Basilisk AC/HP/Con save against owner context", () => {
    const template = mapCreatureImportV2ToTemplate(BASILISK_COMPANION_V2)
    const resolved = resolveCompanion(
      template,
      {
        featureName: "Primal Companion",
        featureLevel: 3,
        className: "Ranger",
        classId: "ranger",
      },
      {
        abilityMods: {
          strength: 0,
          dexterity: 0,
          constitution: 0,
          intelligence: 0,
          wisdom: 0,
          charisma: 0,
        },
        proficiencyBonus: 3,
        spellAttackModifier: null,
        spellSaveDc: null,
        classLevels: [{ className: "Ranger", level: 5 }],
      },
    )
    expect(resolved.ac).toBe(18) // 15 + PB 3
    expect(resolved.maxHp).toBe(42) // 7 + 7*5
    expect(resolved.abilityScores?.constitution?.save).toBe(5) // 2 + PB 3
  })

  it("maps Minstrel gear, proficiencies, and mixed leveled actions", () => {
    const template = mapCreatureImportV2ToTemplate(MINSTREL_V2)
    expect(template.gear).toContain("Lute")
    expect(template.proficiencies).toContain("Simple weapons")
    expect(template.hp.parts).toEqual([
      { type: "fixed", value: 6 },
      { type: "scale", ref: { kind: "class_level", className: "Captain", multiplier: 6 } },
    ])
    expect(template.actions.map((a) => ({ name: a.name, level: a.unlockLevel }))).toEqual([
      { name: "Dagger", level: null },
      { name: "Encouraging Tune", level: null },
      { name: "Taunt", level: null },
      { name: "Multiattack", level: 5 },
    ])
    expect(template.bonusActions?.map((a) => a.name)).toEqual([
      "Psychic Strike",
      "Inspiring Song",
    ])
    expect(template.bonusActions?.[1]?.tag).toBe("1/Day")
  })

  it("persists v2 rows with import_payload for round-trip", () => {
    const rows = buildCreaturePersistRows(
      CREATURE_IMPORT_V2_FIXTURE_DOCUMENT.creatures,
      "Test",
    )
    expect(rows).toHaveLength(3)
    expect(rows.every((row) => isCreatureImportV2(row.import_payload!))).toBe(true)
    expect(rows[0].category).toBe("creature")
    expect(rows[1].category).toBe("companion")
    expect(rows[1].import_payload).toEqual(BASILISK_COMPANION_V2)
    expect(rows[2].size).toBe("Medium or Small")
  })

  it("still accepts legacy prose rows", () => {
    const rows = buildCreaturePersistRows(
      [
        {
          name: "Skeleton",
          description:
            "Skeleton\nMedium Undead, Lawful Evil\nAC 14\nHP 13 (2d8 + 4)\nSpeed 30 ft.\nActions\nShortsword. Melee Attack Roll: +5.",
        },
      ],
      "Custom",
    )
    expect(rows[0].category).toBe("creature")
    expect(rows[0].import_payload).toBeNull()
    expect(rows[0].stat_block.actions[0]?.name).toBe("Shortsword")
  })
})

describe("SRD creatures seed fixture", () => {
  const seedFixture = path.resolve(process.cwd(), "lib/srd/seed-data/creatures.json")
  const externalFixture = path.resolve(process.cwd(), "dump-stat-import-creatures-v2.json")
  const fixturePath = existsSync(seedFixture)
    ? seedFixture
    : existsSync(externalFixture)
      ? externalFixture
      : null
  const run = fixturePath ? it : it.skip

  run("round-trips every record in the SRD creatures fixture", () => {
    const doc = loadCreatureImportDocumentFromFile(fixturePath!)
    expect(doc.schema_version).toBe("2.0")
    expect(doc.creatures.length).toBe(91)
    for (const creature of doc.creatures) {
      expect(() => parseCreatureImportV2(creature)).not.toThrow()
      const template = mapCreatureImportV2ToTemplate(creature)
      expect(template.name).toBe(creature.name)
      if (creature.category === "companion") {
        expect(template.category).toBe("companion")
        expect(template.scaling).toBeTruthy()
      } else {
        expect(template.category).toBe("creature")
        expect(template.cr).toBeTruthy()
      }
    }
    const rows = buildCreaturePersistRows(doc.creatures, "D&D 5.5e SRD")
    expect(rows).toHaveLength(91)
    expect(rows.every((row) => row.import_payload != null)).toBe(true)
    expect(
      rows.every((row) => row.category === "creature" || row.category === "companion"),
    ).toBe(true)
    expect(rows.find((row) => row.name === "Wolf")?.stat_block.ac.parts).toEqual([
      { type: "fixed", value: 12 },
    ])
  })
})
