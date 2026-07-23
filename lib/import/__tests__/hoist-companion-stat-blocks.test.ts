import { describe, expect, it } from "vitest"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { hoistCompanionStatBlocksToCreatures } from "@/lib/import/hoist-companion-stat-blocks"
import { buildCreaturePersistRows } from "@/lib/import/build-creature-persist-rows"
import type { ImportContent } from "@/lib/import/content-schema"

const PSI_CRYSTAL_DESC = `<p>Psi Crystal</p>
<p>Tiny Construct, Unaligned</p>
<p>Armor Class 12 plus your Intelligence modifier</p>
<p>Hit Points 5 + your Psion level</p>
<p>Speed 0 ft., fly 30 ft. (hover)</p>
<p>STR 1 (−5) DEX 14 (+2) CON 10 (+0) INT 14 (+2) WIS 12 (+1) CHA 6 (−2)</p>
<p>Traits</p>
<p>Telepathic Bond. You can communicate telepathically with the crystal.</p>
<p>Actions</p>
<p>Shock. Melee Spell Attack: your spell attack modifier to hit. Hit: 1d4 psychic damage.</p>`

describe("hoistCompanionStatBlocksToCreatures", () => {
  it("promotes companion_stat_block on a custom ability into creatures[]", () => {
    const content = {
      abilities: [
        {
          name: "Psi Crystal",
          description: PSI_CRYSTAL_DESC,
          source_type: "class",
          source_name: "Psion",
          level_requirement: null,
          companion_stat_block: {
            name: "Psi Crystal",
            sizeTypeAlignment: "Tiny Construct, Unaligned",
            ac: { parts: [{ type: "fixed", value: 12 }] },
            hp: { parts: [{ type: "fixed", value: 5 }] },
            traits: [{ name: "Telepathic Bond", description: "You can communicate telepathically." }],
            actions: [{ name: "Shock", description: "1d4 psychic damage." }],
            category: "companion",
            scaling: { scales_with: "caregiver", notes: "scales with Psion level" },
          },
        },
      ],
    } as unknown as ImportContent

    const hoisted = hoistCompanionStatBlocksToCreatures(content)
    expect(hoisted.creatures).toHaveLength(1)
    expect(hoisted.creatures?.[0]?.name).toBe("Psi Crystal")
    expect((hoisted.creatures?.[0] as { category?: string }).category).toBe("companion")

    const persist = buildCreaturePersistRows(hoisted.creatures!, "Custom")
    expect(persist[0].category).toBe("companion")
    expect(persist[0].stat_block.name).toBe("Psi Crystal")
  })

  it("does not duplicate an existing creatures[] row of the same name", () => {
    const content = {
      creatures: [
        {
          name: "Psi Crystal",
          category: "companion",
          creature_type: "Construct",
          size: "Tiny",
          alignment: "Unaligned",
          cr: null,
          xp: null,
          proficiency_bonus: null,
          scaling: { scales_with: "caregiver", notes: "explicit" },
          ac: "12",
          ac_note: null,
          initiative_modifier: null,
          initiative_passive: null,
          hp: "5",
          hit_dice: null,
          speed: { walk: 0, fly: 30, swim: null, climb: null, burrow: null, notes: "hover" },
          ability_scores: {
            str: { score: 1, mod: "-5", save: "-5" },
            dex: { score: 14, mod: "+2", save: "+2" },
            con: { score: 10, mod: "+0", save: "+0" },
            int: { score: 14, mod: "+2", save: "+2" },
            wis: { score: 12, mod: "+1", save: "+1" },
            cha: { score: 6, mod: "-2", save: "-2" },
          },
          skills: null,
          proficiencies: null,
          gear: null,
          resistances: null,
          damage_immunities: null,
          condition_immunities: null,
          vulnerabilities: null,
          senses: null,
          languages: null,
          traits: [],
          actions: [],
          bonus_actions: null,
          reactions: null,
          legendary_actions: null,
          description: "Explicit v2 row",
        },
      ],
      abilities: [
        {
          name: "Psi Crystal",
          description: PSI_CRYSTAL_DESC,
          source_type: "class",
          source_name: "Psion",
          level_requirement: null,
          companion_stat_block: {
            name: "Psi Crystal",
            ac: { parts: [{ type: "fixed", value: 99 }] },
            hp: { parts: [{ type: "fixed", value: 99 }] },
            traits: [],
            actions: [],
            category: "companion",
          },
        },
      ],
    } as unknown as ImportContent

    const hoisted = hoistCompanionStatBlocksToCreatures(content)
    expect(hoisted.creatures).toHaveLength(1)
    expect((hoisted.creatures?.[0] as { description?: string }).description).toBe("Explicit v2 row")
  })

  it("runs during enrichImportContentModifiers for subclass companion features", () => {
    const enriched = enrichImportContentModifiers({
      classes: [
        {
          name: "Artificer",
          description: null,
          hit_die: 8,
          primary_ability: ["Intelligence"],
          features: [],
        },
      ],
      subclasses: [
        {
          name: "Battle Smith",
          class_name: "Artificer",
          description: null,
          features: [
            {
              level: 3,
              name: "Steel Defender",
              description: `Steel Defender
Medium Construct, Unaligned
Armor Class 15 (natural armor)
Hit Points 2 + your Intelligence modifier + 5 times your Artificer level
Speed 40 ft.
STR DEX CON INT WIS CHA
14 (+2) 12 (+1) 14 (+2) 4 (−3) 10 (+0) 6 (−2)
ACTIONS
Force-Empowered Rend. Melee Weapon Attack: your spell attack modifier to hit, reach 5 ft. Hit: 1d8 + PB force damage.`,
            },
          ],
        },
      ],
    } as unknown as ImportContent)

    const steel = enriched.creatures?.find((c) => c.name === "Steel Defender")
    expect(steel).toBeTruthy()
    expect((steel as { category?: string } | undefined)?.category).toBe("companion")
  })
})
