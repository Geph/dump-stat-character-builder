import { describe, expect, it } from "vitest"
import { attachClassDetails, type CharacterClassDetail } from "@/lib/character/character-classes"
import { collectSheetActions } from "@/lib/character/sheet-actions"
import { resolveCharacterCompanionsDetailed } from "@/lib/character/resolve-companions"
import { enrichClassesList } from "@/lib/compendium/normalize-class-data"
import { buildCreaturePersistRows } from "@/lib/import/build-creature-persist-rows"
import { loadMageHandPressPack } from "@/lib/seed-packs/mage-hand-press/load"
import type { CreatureImportRow } from "@/lib/import/creature-import-v2-schema"
import type { ClassResource, Creature, DndClass, Feature, Subclass } from "@/lib/types"

const pack = loadMageHandPressPack()
const necroFile = pack.files.find((file) =>
  (file.classes ?? []).some((cls) => /necromancer/i.test(String(cls.name))),
)
if (!necroFile) throw new Error("MHP Necromancer seed missing")

const resources: ClassResource[] = (necroFile.class_resources ?? []).map((row) => ({
  id: row.resource_key,
  name: row.name,
  description: row.description ?? undefined,
  uses: row.uses as ClassResource["uses"],
  subclassName: row.subclass_name ?? null,
}))
const cls = enrichClassesList([
  {
    ...(necroFile.classes![0] as unknown as DndClass),
    id: "cls_necromancer",
    class_resources: resources.filter((row) => !row.subclassName),
  },
])[0]

const subclasses = (necroFile.subclasses ?? []).map((row) => ({
  ...row,
  id: `sub_${String(row.name).toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
  class_id: "cls_necromancer",
  icon: null,
  creator_url: null,
  created_at: "",
})) as unknown as Subclass[]

const creatures = buildCreaturePersistRows(
  (necroFile.creatures ?? []) as CreatureImportRow[],
  "Mage Hand Press",
).map((row, index) => ({
  id: `thrall_${index}`,
  name: row.name,
  description: row.description,
  creature_type: row.creature_type,
  size: row.size,
  alignment: row.alignment,
  cr: row.cr,
  category: row.category,
  xp: row.xp,
  scaling: row.scaling,
  import_payload: row.import_payload,
  stat_block: row.stat_block,
  prerequisite_rules: row.prerequisite_rules,
  icon: null,
  source: row.source,
  creator_url: null,
  created_at: "",
})) as Creature[]

const CTX = {
  abilityMods: {
    strength: 0,
    dexterity: 0,
    constitution: 1,
    intelligence: 3,
    wisdom: 0,
    charisma: 1,
  },
  proficiencyBonus: 2,
  spellAttackModifier: 5,
  spellSaveDc: 13,
  classLevels: [{ className: "Necromancer", level: 2 }],
}

function detailAt(level: number, subclassName?: string): CharacterClassDetail {
  const subclass = subclassName
    ? subclasses.find((row) => row.name === subclassName) ?? null
    : null
  const [entry] = attachClassDetails(
    [
      {
        class_id: cls.id,
        level,
        subclass_id: subclass?.id ?? null,
        order: 0,
      },
    ],
    [cls],
    subclass ? [subclass] : [],
  )
  return entry
}

function actionsAt(level: number, subclassName?: string) {
  return collectSheetActions({
    classDetails: [detailAt(level, subclassName)],
    species: null,
  })
}

function chars(feature: Feature | undefined) {
  return feature?.linkedModifiers?.flatMap((instance) => instance.characteristics ?? []) ?? []
}

function featureOf(entry: CharacterClassDetail, name: string): Feature | undefined {
  return (
    (entry.class?.features as Feature[] | undefined)?.find((row) => row.name === name) ??
    (entry.subclass?.features as Feature[] | undefined)?.find((row) => row.name === name)
  )
}

describe("Necromancer free-subclass sheet playthrough", () => {
  it("ships Death Knight, Overlord, and Pale Master in the free pack", () => {
    expect(subclasses.map((row) => row.name).sort()).toEqual(
      expect.arrayContaining(["Death Knight", "Overlord", "Pale Master"]),
    )
  })

  it("level 1: Charnel Touch is a Combat Magic action on the charnel_touch pool", () => {
    const entry = detailAt(1)
    const touch = featureOf(entry, "Charnel Touch")
    expect(touch?.activation?.action).toBe(true)
    expect(touch?.sheetDisplay?.combatActions).toBe(true)
    expect(touch?.limitedUses).toMatchObject({
      type: "class_resource",
      classResourceKey: "charnel_touch",
    })
    const action = actionsAt(1).find((row) => row.name === "Charnel Touch")
    expect(action).toMatchObject({
      kinds: expect.arrayContaining(["action"]),
    })
    const pool = entry.class?.class_resources?.find((row) => row.id === "charnel_touch")
    expect(pool?.uses).toMatchObject({
      type: "at_level",
      atLevelMode: "multiply_level",
      atLevelTable: [expect.objectContaining({ level: 1, count: 5 })],
    })
  })

  it("level 2: Dead Space is a utility action; Thralls offer companion choices", () => {
    const entry = detailAt(2)
    const deadSpace = featureOf(entry, "Dead Space")
    expect(deadSpace?.activation?.action).toBe(true)
    const deadAction = actionsAt(2).find((row) => row.name === "Dead Space")
    expect(deadAction).toMatchObject({
      kinds: ["action"],
      category: "utility",
    })

    const thralls = featureOf(entry, "Thralls")
    const grant = chars(thralls).find((row) => row.type === "grant_creature")
    expect(grant).toMatchObject({
      type: "grant_creature",
      choiceOptions: expect.arrayContaining(["Skeleton", "Spirit", "Zombie"]),
    })

    const { formGroups, companions } = resolveCharacterCompanionsDetailed({
      classDetails: [entry],
      customAbilities: [],
      creatures,
      formSelections: {},
      ctx: CTX,
    })
    expect(formGroups.some((group) => /thrall/i.test(group.featureName))).toBe(true)
    expect(companions.length).toBe(0)
  })

  it("level 2: picking a Skeleton puts a companion on the sheet", () => {
    const entry = detailAt(2)
    const resolved = resolveCharacterCompanionsDetailed({
      classDetails: [entry],
      customAbilities: [],
      creatures,
      formSelections: {},
      ctx: CTX,
    })
    const groupKey = resolved.formGroups.find((group) => /thrall/i.test(group.featureName))?.key
    const { companions } = resolveCharacterCompanionsDetailed({
      classDetails: [entry],
      customAbilities: [],
      creatures,
      formSelections: groupKey ? { [groupKey]: ["Skeleton"] } : {},
      ctx: CTX,
    })
    expect(companions.map((row) => row.template.name)).toContain("Skeleton")
    const skeleton = companions.find((row) => row.template.name === "Skeleton")
    expect(skeleton?.template.actions?.length).toBeGreaterThan(0)
  })

  it("level 3 Overlord: Dark Arcana and Charnel Aura are combat bonus actions", () => {
    const names = actionsAt(3, "Overlord").map((row) => row.name)
    expect(names).toEqual(expect.arrayContaining(["Dark Arcana", "Charnel Aura", "Charnel Touch"]))
    const aura = featureOf(detailAt(3, "Overlord"), "Charnel Aura")
    expect(aura?.activation?.bonusAction).toBe(true)
    expect(chars(aura).some((row) => row.type === "resource_ability_menu")).toBe(true)
  })

  it("level 3 Pale Master: Charnel Empower is a Charnel Touch / spell rider, not a false immunity", () => {
    const empower = featureOf(detailAt(3, "Pale Master"), "Charnel Empower")
    expect(chars(empower).some((row) => row.type === "on_cast_spell_trigger")).toBe(true)
  })

  it("level 3 Death Knight: Combat Research grants martial/armor and Extra Attack arrives at 6", () => {
    const research = featureOf(detailAt(3, "Death Knight"), "Combat Research")
    const types = chars(research).map((row) => row.type)
    expect(types).toEqual(
      expect.arrayContaining(["weapon_proficiencies", "armor_proficiencies"]),
    )
    const extra = featureOf(detailAt(6, "Death Knight"), "Extra Attack")
    expect(
      extra?.linkedModifiers?.some((instance) =>
        (instance.activation?.effects ?? []).some((effect) => effect.kind === "extra_attack"),
      ),
    ).toBe(true)
    expect(
      chars(extra).some(
        (row) =>
          row.type === "power_rider" &&
          (row.parentPowerNames ?? []).some((name) => /attack/i.test(name)),
      ),
    ).toBe(true)
  })

  it("level 6 Overlord: Despotic Discourse is a passive CHA check bonus", () => {
    const discourse = featureOf(detailAt(6, "Overlord"), "Despotic Discourse")
    const effect = discourse?.linkedModifiers
      ?.flatMap((instance) => instance.activation?.effects ?? [])
      .find((row) => row.kind === "check_roll_modifier")
    expect(effect).toMatchObject({
      checkCategory: "skill",
    })
  })

  it("level 6 Pale Master: Chilling Disposition offers Frightening Gaze as a bonus action", () => {
    const chilling = featureOf(detailAt(6, "Pale Master"), "Chilling Disposition")
    expect(chilling?.activation?.bonusAction).toBe(true)
    expect(actionsAt(6, "Pale Master").some((row) => /frightening gaze|chilling disposition/i.test(row.name))).toBe(
      true,
    )
  })

  it("level 10 Overlord: Sacrificial Thralls is a reaction; Pale Master Thrall Rush is on initiative", () => {
    expect(featureOf(detailAt(10, "Overlord"), "Sacrificial Thralls")?.activation?.reaction).toBe(true)
    expect(featureOf(detailAt(10, "Pale Master"), "Thrall Rush")?.activation?.onInitiative).toBe(true)
    expect(actionsAt(10, "Overlord").some((row) => row.name === "Sacrificial Thralls")).toBe(true)
    const rush = actionsAt(10, "Pale Master").find((row) => row.name === "Thrall Rush")
    expect(rush).toMatchObject({
      trigger: "When you roll Initiative",
      spendsEconomy: false,
    })
    const overcharged = featureOf(detailAt(10, "Death Knight"), "Overcharged Thralls")
    expect(chars(overcharged).some((row) => row.type === "on_creature_death_trigger")).toBe(true)
    const overchargedAction = actionsAt(10, "Death Knight").find((row) => row.name === "Overcharged Thralls")
    expect(overchargedAction?.trigger).toMatch(/dies/i)
  })

  it("level 18–20: Undying Servitude is a reaction; Lichdom is passive immunities", () => {
    expect(featureOf(detailAt(18), "Undying Servitude")?.activation?.reaction).toBe(true)
    const lichdom = featureOf(detailAt(20), "Lichdom")
    expect(chars(lichdom).some((row) => row.type === "damage_immunity")).toBe(true)
    expect(chars(lichdom).some((row) => row.type === "condition_immunity")).toBe(true)
    expect(chars(lichdom).some((row) => row.type === "vision")).toBe(true)
  })

  it("Improved Thralls does not put thrall immunities on the Necromancer", () => {
    const improved = featureOf(detailAt(7), "Improved Thralls")
    expect(chars(improved).some((row) => row.type === "condition_immunity")).toBe(false)
  })
})
