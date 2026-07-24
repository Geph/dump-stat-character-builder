import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { CLASS_RESOURCE_IMPORT_HINT, IMPORT_PROPOSALS_HINT } from "@/lib/import/content-schema"
import { HOMEBREW_WIRING_PATTERNS } from "@/lib/import/modifier-wiring-registry"

/**
 * Prompt footgun guard (#4): known Mage Hand Press / homebrew extract bullets
 * must remain in LLM hint strings so future class passes don't regress.
 */
describe("homebrew prompt footguns", () => {
  it("keeps Investigator / Martyr / Necromancer / Vagabond / Witch / Warmage / Occultist / Beastheart / Kibbles Warden / Inventor resource bullets in CLASS_RESOURCE_IMPORT_HINT", () => {
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/finisher/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/never "finisher_dice"/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/Martyr Spell Uses/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/max_spell_level/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/atLevelMode: \"multiply_level\"/)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/Do not use uses\.type \"multiply_level\"/)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/not class_upgrades pickers/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/Vagabond Battle Dice/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/not Gunslinger auto-grant/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/Witch Hexes/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/grand_hexes/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/Warmage/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/cantrips only/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/Occultist \(KibblesTasty\)/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/occult_rites_known/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/Beastheart \(MCDM\)/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/ferocity/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/Warden \(KibblesTasty\)/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/primal_manifestations/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/endurance_die_size/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/Inventor \(KibblesTasty\)/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/class_resources\.upgrades/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/Alternate Sorcerer \(LaserLlama\)/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/metamagics_known/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/Alternate Barbarian \(LaserLlama\)/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/freeUseAfterLevel: 20/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/exploits_known/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/Alternate Ranger \(LaserLlama\)/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/quarry_die/i)
    expect(CLASS_RESOURCE_IMPORT_HINT).toMatch(/knacks_known/i)
  })

  it("keeps Investigator trinket auto-grant exception in IMPORT_PROPOSALS_HINT", () => {
    expect(IMPORT_PROPOSALS_HINT).toMatch(/Investigator subclass Trinkets/i)
    expect(IMPORT_PROPOSALS_HINT).toMatch(/do NOT wire the class Trinkets feature as optionsSource "class_upgrades"/i)
  })

  it("documents Investigator, Necromancer, Vagabond, Witch, Warmage, Occultist, Beastheart, Kibbles Warden, and Inventor patterns in HOMEBREW_WIRING_PATTERNS", () => {
    const blob = HOMEBREW_WIRING_PATTERNS.flatMap((p) => [p.source, ...p.guidance]).join("\n")
    expect(blob).toMatch(/Investigator/i)
    expect(blob).toMatch(/finisher_dice/i)
    expect(blob).toMatch(/Necromancer/i)
    expect(blob).toMatch(/charnel_touch/i)
    expect(blob).toMatch(/class_upgrades/i)
    expect(blob).toMatch(/Deadnaught/i)
    expect(blob).toMatch(/Vagabond/i)
    expect(blob).toMatch(/Mage Brand/i)
    expect(blob).toMatch(/not appear in the Maneuvers Known picker/i)
    expect(blob).toMatch(/Witch/i)
    expect(blob).toMatch(/grand_hexes/i)
    expect(blob).toMatch(/Hex:… cantrips/i)
    expect(blob).toMatch(/Warmage/i)
    expect(blob).toMatch(/House of Bishops/i)
    expect(blob).toMatch(/NO caster_progression/i)
    expect(blob).toMatch(/Occultist \/ KibblesTasty traditions/i)
    expect(blob).toMatch(/occult_rites_known/i)
    expect(blob).toMatch(/never nest under classes\[0\]\.subclasses/i)
    expect(blob).toMatch(/Beastheart \/ MCDM companions/i)
    expect(blob).toMatch(/mix them into Primal Exploits/i)
    expect(blob).toMatch(/Warden \/ KibblesTasty bonds/i)
    expect(blob).toMatch(/never primal_manifestations_known/i)
    expect(blob).toMatch(/endurance_die_size/i)
    expect(blob).toMatch(/Inventor \/ KibblesTasty specializations/i)
    expect(blob).toMatch(/never emit upgrades as a spendable/i)
    expect(blob).toMatch(/grant_creature/i)
    expect(blob).toMatch(/Alternate Sorcerer \/ LaserLlama point-pool/i)
    expect(blob).toMatch(/never invent ability_role metamagic/i)
    expect(blob).toMatch(/Alternate Barbarian \/ LaserLlama exploits/i)
    expect(blob).toMatch(/never invent a placeholder count of 100/i)
    expect(blob).toMatch(/Alternate Ranger \/ LaserLlama knacks/i)
    expect(blob).toMatch(/NEVER a second class_knacks picker/i)
  })

  it("third-party charnel_touch definition still warns about uses.shape", () => {
    const src = readFileSync(join(process.cwd(), "lib/import/third-party-resources.ts"), "utf8")
    expect(src).toMatch(/never uses\.type multiply_level/)
  })
})
