import { describe, expect, it } from "vitest"
import { buildByoExtractionPrompt, CLEAN_SOURCE_TEXT_GUIDELINES } from "@/lib/import/byo-import-kit"
import { buildImportSystemPrompt } from "@/lib/import/import-system-prompt"
import {
  CHOICE_EXTRACTION_HINT,
  CUSTOM_CLASS_IMPORT_HINT,
  DUPLICATE_ABILITY_MERGE_HINT,
  GENERAL_SOURCE_CLEANUP_HINT,
  MARKER_LEGEND_SCAN_HINT,
  NAME_SOURCE_MATCHING_HINT,
} from "@/lib/import/content-schema"
import { COMMON_MODIFIERS_IMPORT_HINT } from "@/lib/import/common-modifiers-import-hints"

describe("BYO prompt guidance (Psion audit follow-up)", () => {
  it("places name/source matching before the Common Modifier wiring index", () => {
    const prompt = buildImportSystemPrompt("classes")
    const nameIdx = prompt.indexOf("Name and source matching")
    const modifiersIdx = prompt.indexOf("Common Modifier wiring index")
    expect(nameIdx).toBeGreaterThan(-1)
    expect(modifiersIdx).toBeGreaterThan(nameIdx)
    expect(NAME_SOURCE_MATCHING_HINT).toContain("identical name string")
  })

  it("covers talent pools, class_talent, Specialization, and distinct category labels", () => {
    const prompt = buildByoExtractionPrompt("abilities", {
      customSystems: {
        abilityCategory: "Psionic Disciplines",
        classResourceLabels: "Psi Points, Psi Limit",
      },
    })
    expect(prompt).toContain("class_talent")
    expect(prompt).toContain("Discipline Talents")
    expect(prompt).toContain("Class Talents")
    expect(prompt).toContain("Specialization")
    expect(prompt).toContain("class_talents_known")
    expect(prompt).not.toContain("KibblesTasty Psion")
  })

  it("scopes feat isChoice to ability-catalog picks, not grant_feat milestones", () => {
    expect(CHOICE_EXTRACTION_HINT).toContain("do NOT use isChoice")
    expect(CHOICE_EXTRACTION_HINT).toContain("grant_feat")
    expect(CHOICE_EXTRACTION_HINT).toContain("custom ability catalog")
    expect(CHOICE_EXTRACTION_HINT).toContain("not another feat")
    expect(COMMON_MODIFIERS_IMPORT_HINT).toContain("never isChoice")
    expect(COMMON_MODIFIERS_IMPORT_HINT).toContain("ability catalog")
  })

  it("includes cleanup, marker legends, duplicate merge, and class-naming rules", () => {
    const prompt = buildImportSystemPrompt("all")
    expect(prompt).toContain(GENERAL_SOURCE_CLEANUP_HINT.slice(0, 40))
    expect(prompt).toContain(MARKER_LEGEND_SCAN_HINT.slice(0, 40))
    expect(prompt).toContain(DUPLICATE_ABILITY_MERGE_HINT.slice(0, 40))
    expect(CUSTOM_CLASS_IMPORT_HINT).toContain("exactly as it appears")
    expect(CUSTOM_CLASS_IMPORT_HINT).not.toContain("KibblesTasty Psion")
    expect(prompt).toContain("turn_start_bonus_grant")
    expect(prompt).toContain("expiresEndOfTurn")
  })

  it("tells the LLM to collapse doubled ALL-CAPS PDF glyphs (LaserLlama-style)", () => {
    expect(GENERAL_SOURCE_CLEANUP_HINT).toContain("Doubled ALL-CAPS PDF glyphs")
    expect(GENERAL_SOURCE_CLEANUP_HINT).toContain('S ST T R R" → "STR')
    expect(GENERAL_SOURCE_CLEANUP_HINT).toContain('T TR RA AI IT TS S" → "TRAITS')
    expect(GENERAL_SOURCE_CLEANUP_HINT).toContain("only applies to ALL-CAPS runs")
    expect(CLEAN_SOURCE_TEXT_GUIDELINES).toContain("LaserLlama")
    expect(CLEAN_SOURCE_TEXT_GUIDELINES).toContain("S ST T R R")
    const prompt = buildByoExtractionPrompt("classes")
    expect(prompt).toContain("Doubled ALL-CAPS PDF glyphs")
    expect(prompt).toContain("TRAITS")
  })

  it("tells the LLM to strip trailing superscript markers pasted as letters (KibblesTasty K)", () => {
    expect(GENERAL_SOURCE_CLEANUP_HINT).toContain("Trailing superscript markers")
    expect(GENERAL_SOURCE_CLEANUP_HINT).toContain('Returning WeaponK" → "Returning Weapon')
    expect(GENERAL_SOURCE_CLEANUP_HINT).toContain("custom_abilities")
    expect(MARKER_LEGEND_SCAN_HINT).toContain("Returning WeaponK")
    expect(CLEAN_SOURCE_TEXT_GUIDELINES).toContain("Returning WeaponK")
    const prompt = buildByoExtractionPrompt("spells")
    expect(prompt).toContain("Trailing superscript markers")
    expect(prompt).toContain("Returning Weapon")
  })

  it("covers exploit-library fields and cross-pass Leadership-style notes", () => {
    const prompt = buildByoExtractionPrompt("abilities", {
      customSystems: {
        abilityCategory: "Exploits",
        classResourceLabels: "Exploit Dice",
      },
    })
    expect(prompt).toContain("execution")
    expect(prompt).toContain("eligible_classes")
    expect(prompt).toContain("Section-intro rules propagate")
    expect(prompt).toContain("until_item_consumed")
    expect(prompt).toContain("up_to_proficiency_bonus")
    expect(prompt).toContain("Leadership modifier")
    expect(prompt).toContain("companion_stat_block")
    expect(prompt).toContain('"execution": "On a successful Grapple"')
    // Psion single-class pattern still uses source_name
    expect(prompt).toContain('"source_name": "Psion"')
  })

  it("covers World Tree / Zealot mechanics[] kinds and class_resource scoping", () => {
    const prompt = buildByoExtractionPrompt("subclasses")
    expect(prompt).toContain("on_hit_trigger")
    expect(prompt).toContain("temporary_hit_points")
    expect(prompt).toContain("turn_start_trigger")
    expect(prompt).toContain("resource_ability_menu")
    expect(prompt).toContain("unarmed_strike_damage")
    expect(prompt).toContain("telepathy")
    expect(prompt).toContain("initiative")
    expect(prompt).toContain("alternateRefresh")
    expect(prompt).toContain("on_resource_reactivation")
    expect(prompt).toContain("gatingResourceKey")
    expect(prompt).toContain("subclass_name")
    expect(prompt).toContain("Warrior of the Gods Dice")
    expect(prompt).toContain("new_toggles")
    expect(prompt).toContain("half_character_level_round_down")
    expect(prompt).toContain("weapon_reach_modifier")
    expect(prompt).toContain("extra_weapon_mastery")
    expect(prompt).toContain("canHover")
    expect(COMMON_MODIFIERS_IMPORT_HINT).toContain("Divine Fury")
    // Every phrase-index catalog that previously lacked a kind is now documentable
    for (const kind of [
      "on_hit_trigger",
      "turn_start_trigger",
      "resource_ability_menu",
      "unarmed_strike_damage",
      "initiative",
      "telepathy",
    ] as const) {
      expect(COMMON_MODIFIERS_IMPORT_HINT).toContain(`- ${kind}:`)
      expect(COMMON_MODIFIERS_IMPORT_HINT).toContain(kind)
    }
  })

  it("covers Dance/Glamour follow-up kinds and basedOnSrdFeature guidance", () => {
    const prompt = buildByoExtractionPrompt("subclasses")
    expect(prompt).toContain("damage_reduction")
    expect(prompt).toContain("reductionMode")
    expect(prompt).toContain("basedOnSrdFeature")
    expect(prompt).toContain("Leading Evasion")
    expect(prompt).toContain("spendSpellSlotMinLevel")
    expect(prompt).toContain("ALWAYS wire the base usesFixed")
    expect(prompt).toContain("amountMultiplier")
    expect(prompt).toContain("movement_grant")
    expect(prompt).toContain("Unarmed Strike")
    expect(prompt).toContain("conditionNote")
    expect(prompt).toContain("targetCount")
    expect(prompt).toContain("only cover effects on the character's own sheet")
    expect(COMMON_MODIFIERS_IMPORT_HINT).toContain("- damage_reduction:")
    expect(COMMON_MODIFIERS_IMPORT_HINT).toContain("- movement_grant:")
  })

  it("tells the LLM to reconstruct domain-spell tables that lost whitespace in PDF extraction (Cleric domains audit)", () => {
    expect(CLEAN_SOURCE_TEXT_GUIDELINES).toContain("lost its whitespace")
    expect(CLEAN_SOURCE_TEXT_GUIDELINES).toContain("Cleric LevelPrepared Spells3Aid")
    const prompt = buildByoExtractionPrompt("subclasses")
    expect(prompt).toContain("lost its whitespace")
  })

  it("distinguishes rest-swappable choices, modal toggles, and mutable combat dice", () => {
    const prompt = buildByoExtractionPrompt("subclasses")
    expect(prompt).toContain("swappableOnRest")
    expect(prompt).toContain("primordial_aspect_lightning")
    expect(prompt).toContain("Rampage Die")
    expect(prompt).toContain("not by class level")
  })

  it("forbids inventing ability_bonuses keys like desktop on backgrounds", () => {
    const prompt = buildByoExtractionPrompt("backgrounds")
    expect(prompt).toContain("never invent keys like desktop")
    expect(prompt).toContain("strength|dexterity|constitution|intelligence|wisdom|charisma")
    expect(buildImportSystemPrompt("backgrounds")).toContain('never invent keys like "desktop"')
  })

  it("requires nested starting_equipment_groups options shape for backgrounds", () => {
    const prompt = buildByoExtractionPrompt("backgrounds")
    expect(prompt).toContain("one group with description + options")
    expect(prompt).toContain('never a flat [{label,items}] array')
    const system = buildImportSystemPrompt("backgrounds")
    expect(system).toContain('"description": "Choose A or B:"')
    expect(system).toContain("Wrong (will be dropped)")
    expect(system).toContain("options")
  })

  it("preserves faction skill fallbacks and campaign gates on backgrounds", () => {
    const prompt = buildByoExtractionPrompt("backgrounds")
    expect(prompt).toContain('"One skill of your choice"')
    expect(prompt).toContain("preserve the faction table in description")
    expect(prompt).toContain(
      'prerequisite_rules: [{ "category": "other", "value": "Planescape Campaign" }]',
    )
    expect(prompt).toContain("Survivor or a Dark Gift feat of your choice")
    expect(prompt).toContain("Choose one Dark Gift feat")
  })
})
