import { describe, expect, it } from "vitest"
import { auditModifierCatalog } from "@/lib/compendium/audit-modifier-catalog"

describe("audit-modifier-catalog", () => {
  const result = auditModifierCatalog()

  it("snapshots DEAD modifier types (defined but never applied)", () => {
    expect(result.summary.dead).toMatchInlineSnapshot(`
      [
        "d20_test_reaction",
        "damage_halving_reaction",
        "grant_creature",
        "grant_feat",
        "healing_dice_pool",
        "on_creature_death_trigger",
        "skill_check_alternate_ability",
        "turn_start_trigger",
      ]
    `)
  })

  it("snapshots UNREACHABLE modifier types (applied but not authorable and not importable)", () => {
    expect(result.summary.unreachable).toMatchInlineSnapshot(`
      [
        "catalog_option",
        "craftable_items",
        "custom_skill",
        "equipment_and_magic_items",
        "held_items_cap",
      ]
    `)
  })

  it("covers every CHARACTERISTIC_MODIFIER_TYPE_OPTIONS value", () => {
    expect(result.rows.length).toBeGreaterThan(40)
    expect(new Set(result.rows.map((row) => row.type)).size).toBe(result.rows.length)
  })
})
