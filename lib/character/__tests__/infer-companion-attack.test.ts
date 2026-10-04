import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { inferCompanionAttackFromText } from "@/lib/character/infer-companion-attack"
import {
  resolveCompanion,
  type CompanionNamedBlock,
  type CompanionResolveContext,
} from "@/lib/character/companion-stat-block"
import { buildCreaturePersistRows } from "@/lib/import/build-creature-persist-rows"
import type { CreatureImportRow } from "@/lib/import/creature-import-v2-schema"

const CTX: CompanionResolveContext = {
  abilityMods: { strength: 0, dexterity: 0, constitution: 0, intelligence: 4, wisdom: 0, charisma: 3 },
  proficiencyBonus: 4,
  spellAttackModifier: 8,
  spellSaveDc: 16,
  classLevels: [{ className: "Necromancer", level: 9 }],
}

describe("inferCompanionAttackFromText", () => {
  it("wires a saving-throw action with damage", () => {
    const attack = inferCompanionAttackFromText(
      "Constitution Saving Throw: DC 13, each creature it chooses within 5 feet. Failure: 17 (5d6) Necrotic damage. Success: Half damage.",
    )
    expect(attack).toEqual({
      kind: "save",
      saveAbility: "constitution",
      saveDc: { parts: [{ type: "fixed", value: 13 }] },
      area: "each creature it chooses within 5 feet",
      halfOnSuccess: true,
      damage: [{ dice: "5d6", bonus: null, type: "Necrotic" }],
    })
  })

  it("scales a save DC that equals the owner's spell save DC", () => {
    const attack = inferCompanionAttackFromText(
      "Dexterity Saving Throw: DC equals your spell save DC, each creature in a 15-foot Cube. Failure: 2d6 damage of its chosen type. Success: Half damage.",
    )
    expect(attack?.saveDc?.parts).toEqual([{ type: "scale", ref: { kind: "spell_save_dc" } }])
    expect(attack?.damage).toEqual([{ dice: "2d6", bonus: null, type: null }])
  })

  it("parses 2024 attack rolls with owner-scaled bonuses and multiple damage rolls", () => {
    expect(
      inferCompanionAttackFromText(
        "Melee Attack Roll: Bonus equals your spell attack modifier, reach 5 ft. Hit: 1d8 + 4 plus your Charisma modifier Force damage.",
      ),
    ).toMatchObject({
      kind: "melee",
      toHit: { parts: [{ type: "fixed", value: 0 }, { type: "scale", ref: { kind: "spell_attack_modifier" } }] },
      reach: "5 ft.",
      damage: [
        {
          dice: "1d8",
          type: "Force",
          bonus: {
            parts: [
              { type: "fixed", value: 4 },
              { type: "scale", ref: { kind: "ability_modifier", ability: "charisma" } },
            ],
          },
        },
      ],
    })
    expect(
      inferCompanionAttackFromText(
        "Melee Attack Roll: +3, reach 5 ft. Hit: 3 (1d4 + 1) Piercing damage plus 2 (1d4) Acid damage.",
      )?.damage.map((roll) => roll.type),
    ).toEqual(["Piercing", "Acid"])
  })

  it("parses 2014 attack and saving throw wording", () => {
    expect(
      inferCompanionAttackFromText(
        "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) piercing damage.",
      ),
    ).toMatchObject({ kind: "melee", toHit: { parts: [{ type: "fixed", value: 4 }] }, damage: [{ dice: "2d4", type: "Piercing" }] })
    expect(
      inferCompanionAttackFromText(
        "The dragon exhales fire. Each creature in that area must make a DC 13 Dexterity saving throw, taking 22 (4d10) fire damage on a failed save, or half as much damage on a successful one.",
      ),
    ).toMatchObject({ kind: "save", saveAbility: "dexterity", halfOnSuccess: true, damage: [{ dice: "4d10", type: "Fire" }] })
  })

  it("ignores actions with neither an attack roll nor a saving throw", () => {
    expect(inferCompanionAttackFromText("The deadnaught makes two attacks.")).toBeNull()
  })

  it("resolves prose-only save actions on the sheet without stored attack data", () => {
    const resolved = resolveCompanion(
      {
        name: "Draconic Spirit",
        ac: { parts: [{ type: "fixed", value: 14 }] },
        hp: { parts: [{ type: "fixed", value: 50 }] },
        traits: [],
        actions: [
          {
            name: "Breath Weapon",
            description:
              "Dexterity Saving Throw: DC equals your spell save DC, each creature in a 15-foot Cube. Failure: 2d6 Fire damage. Success: Half damage.",
          },
        ],
      },
      { featureName: "Summon Dragon", featureLevel: 5, className: "Wizard", classId: "w" },
      CTX,
    )
    expect(resolved.actions[0].resolvedAttack).toMatchObject({
      kind: "save",
      toHitBonus: null,
      saveAbility: "dexterity",
      saveDc: 16,
      halfOnSuccess: true,
      damage: [{ formula: "2d6", type: "Fire" }],
    })
  })
})

function bundledCreatureFiles(): { file: string; creatures: CreatureImportRow[] }[] {
  const out: { file: string; creatures: CreatureImportRow[] }[] = []
  const srd = JSON.parse(readFileSync("lib/srd/seed-data/creatures.json", "utf8"))
  out.push({ file: "srd/creatures.json", creatures: srd.creatures ?? srd })
  for (const pack of readdirSync("lib/seed-packs", { withFileTypes: true })) {
    if (!pack.isDirectory()) continue
    for (const name of readdirSync(join("lib/seed-packs", pack.name))) {
      if (!name.endsWith(".json")) continue
      const json = JSON.parse(readFileSync(join("lib/seed-packs", pack.name, name), "utf8"))
      if (Array.isArray(json?.creatures) && json.creatures.length) {
        out.push({ file: `${pack.name}/${name}`, creatures: json.creatures })
      }
    }
  }
  return out
}

const DAMAGING_ATTACK_OR_SAVE = (text: string) =>
  /\d+d\d+[^.]*\bdamage\b/i.test(text) &&
  /Attack Roll|Weapon Attack|Spell Attack|Saving Throw/i.test(text)

describe("bundled creature actions", () => {
  it("assign structured damage to every attack-roll or saving-throw action that deals damage", () => {
    const missing: string[] = []
    let wired = 0
    for (const { file, creatures } of bundledCreatureFiles()) {
      for (const row of buildCreaturePersistRows(creatures, file)) {
        const sb = row.stat_block
        if (!sb) continue
        const blocks: CompanionNamedBlock[] = [
          ...sb.actions,
          ...(sb.bonusActions ?? []),
          ...(sb.reactions ?? []),
          ...(sb.legendaryActions ?? []),
        ]
        for (const block of blocks) {
          if (!DAMAGING_ATTACK_OR_SAVE(block.description)) continue
          if (block.attack?.damage.length) wired += 1
          else missing.push(`${file} · ${row.name} · ${block.name}`)
        }
      }
    }
    expect(missing).toEqual([])
    expect(wired).toBeGreaterThan(20)
  })
})
