import { describe, expect, it } from "vitest"
import { buildByoExtractionPrompt, CLEAN_SOURCE_TEXT_GUIDELINES } from "@/lib/import/byo-import-kit"
import { buildImportSystemPrompt } from "@/lib/import/import-system-prompt"
import {
  CHOICE_EXTRACTION_HINT,
  CUSTOM_CLASS_IMPORT_HINT,
  DUPLICATE_ABILITY_MERGE_HINT,
  FEAT_CATEGORY_IMPORT_HINT,
  GENERAL_SOURCE_CLEANUP_HINT,
  MARKER_LEGEND_SCAN_HINT,
  NAME_SOURCE_MATCHING_HINT,
} from "@/lib/import/content-schema"
import { COMMON_MODIFIERS_IMPORT_HINT } from "@/lib/import/common-modifiers-import-hints"
import { RICH_TEXT_TABLE_HINT } from "@/lib/import/rich-text-import-hints"

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
    expect(prompt).toContain("specialization_choices")
    expect(prompt).toContain("class_talents_known")
    expect(prompt).not.toContain("KibblesTasty Psion")
  })

  it("prompts choose-from-spell-list subclass options with per-option tables", () => {
    expect(CHOICE_EXTRACTION_HINT).toContain("Choose-from-spell-lists")
    expect(CHOICE_EXTRACTION_HINT).toContain("Circle of the Land")
    const prompt = buildByoExtractionPrompt("subclasses")
    expect(prompt).toContain("mutually exclusive spell lists")
  })

  it("requires concise class and subclass card blurbs", () => {
    for (const contentType of ["classes", "subclasses"] as const) {
      const prompt = buildByoExtractionPrompt(contentType)
      expect(prompt).toContain("Always emit card_blurb")
      expect(prompt).toContain("120 characters or fewer")
      expect(prompt).toContain("player-facing summary")
      expect(prompt).toContain("How it feels to play")
      expect(prompt).toContain("What this path offers")
      expect(prompt).toContain("Becoming a [Class]")
      expect(prompt).toContain("core gameplay loop")
    }
  })

  it("requires class complexity and lists Mage Hand Press defaults", () => {
    const prompt = buildByoExtractionPrompt("classes")
    expect(prompt).toContain('complexity: "easy" (Low)')
    expect(prompt).toContain("Mage Hand Press class defaults")
    expect(prompt).toContain("Warmage easy")
    expect(prompt).toContain("Craftsman hard")
    expect(prompt).toContain("Witch easy")
  })

  it("preserves species provenance, regional choices, and spellcasting ability picks", () => {
    const prompt = buildByoExtractionPrompt("species")
    expect(prompt).toContain("source, creature_type, size/size_options")
    expect(prompt).toContain('spellcastingAbilityOptions: ["intelligence", "wisdom", "charisma"]')
    expect(prompt).toContain("unlocksAtClassLevel 1/3/5")
    expect(prompt).toContain("Wood Elf Druidcraft")
    expect(prompt).toContain("regional choice/option")
    expect(prompt).toContain("skills for skill choices")
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
    expect(prompt).toContain("power_rider")
    expect(prompt).toContain("hit_dice_restore")
    expect(prompt).toContain("hitDiceRestoreAmount")
    expect(prompt).toContain("Divine Respite")
    expect(prompt).toContain("immediately use your")
    expect(prompt).toContain("not a Reaction")
    expect(prompt).toContain("parentMenuOptionNames")
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
    expect(prompt).toContain("do not emit extra_weapon_mastery")
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

  it("keeps table-row option benefits separate from benefits shared by every option", () => {
    expect(CHOICE_EXTRACTION_HINT).toContain("only what DIFFERS between rows")
    expect(CHOICE_EXTRACTION_HINT).toContain("stays on the parent")
    expect(CHOICE_EXTRACTION_HINT).toContain("Plane | Damage Resistance | Cantrip")
    expect(CHOICE_EXTRACTION_HINT).toContain("parent spellcasting_ability mechanic")

    const feats = buildByoExtractionPrompt("feats")
    expect(feats).toContain("one option per row named exactly as the first column")
    expect(feats).toContain("one feat-level spellcasting_ability mechanic")
    expect(feats).toContain("Your Wisdom ability score increases by 1")
    expect(CHOICE_EXTRACTION_HINT).toContain("fixed +1, not a player-choice pool")
    expect(FEAT_CATEGORY_IMPORT_HINT).toContain("Planar Infusion")
    expect(FEAT_CATEGORY_IMPORT_HINT).toContain("The Outlands")
    expect(FEAT_CATEGORY_IMPORT_HINT).toContain("never repeat the casting-ability choice on every option")
  })

  it("documents the player-chosen spellcasting ability mechanic and its inheritance", () => {
    expect(COMMON_MODIFIERS_IMPORT_HINT).toContain("- spellcasting_ability:")
    expect(COMMON_MODIFIERS_IMPORT_HINT).toContain("emit ONE spellcasting_ability mechanic on the PARENT")
    expect(COMMON_MODIFIERS_IMPORT_HINT).toContain("inherit whichever ability the player picks")
  })

  it("gates Psion play-state features instead of granting them outright", () => {
    const prompt = buildByoExtractionPrompt("subclasses")
    expect(prompt).toContain("rampage_die_d8_plus")
    expect(prompt).toContain("do not declare it under new_toggles")
    expect(prompt).toContain("weapon_morph_")
    expect(COMMON_MODIFIERS_IMPORT_HINT).toContain("Play-state derived toggles")
    expect(COMMON_MODIFIERS_IMPORT_HINT).toContain("Mutation Die")

    const abilities = buildByoExtractionPrompt("abilities", {
      customSystems: { abilityCategory: "Psionic Disciplines", classResourceLabels: "Psi Points" },
    })
    expect(abilities).toContain("Flesh Warp")
    expect(abilities).toContain("Imaginary Ally")
    expect(abilities).toContain("weapon_morph_")
  })

  it("forbids inventing ability_bonuses keys like desktop on backgrounds", () => {
    const prompt = buildByoExtractionPrompt("backgrounds")
    expect(prompt).toContain("never invent keys like desktop")
    expect(prompt).toContain("strength|dexterity|constitution|intelligence|wisdom|charisma")
    expect(buildImportSystemPrompt("backgrounds")).toContain('never invent keys like "desktop"')
  })

  it("requires class-specific weapons as full equipment[] rows in the same JSON", () => {
    expect(CUSTOM_CLASS_IMPORT_HINT).toContain("Class-specific / non-SRD weapons")
    expect(CUSTOM_CLASS_IMPORT_HINT).toContain("equipment[]")
    expect(CUSTOM_CLASS_IMPORT_HINT).toContain("Revolver")
    expect(CUSTOM_CLASS_IMPORT_HINT).toContain("flags named starting gear")
    const prompt = buildByoExtractionPrompt("classes")
    expect(prompt).toContain("non-SRD weapon")
    expect(prompt).toContain("equipment[]")
    expect(prompt).toContain("unmatched and flagged")
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
    expect(prompt).toContain("Belt Pouch")
    expect(prompt).toContain("do NOT invent Old Hand")
  })

  it("covers Kibbles-style species choice tables in BYO species focus", () => {
    const prompt = buildByoExtractionPrompt("species")
    expect(prompt).toContain("Remains / Animating Force / Modular Design")
    expect(prompt).toContain("You know Sylvan")
    expect(prompt).toContain("see in dim light within N feet")
    expect(prompt).toContain("size: null")
  })

  it("warns on schema-fit mismatches and advises separate weapon mastery imports", () => {
    expect(CLEAN_SOURCE_TEXT_GUIDELINES).toContain("Schema fit")
    expect(CLEAN_SOURCE_TEXT_GUIDELINES).toContain("Whole-book")
    expect(CLEAN_SOURCE_TEXT_GUIDELINES).toContain("Weapon Mastery Properties")
    expect(CLEAN_SOURCE_TEXT_GUIDELINES).toContain("ask the user what to rename")
    const equipment = buildByoExtractionPrompt("equipment")
    expect(equipment).toContain("properties.mastery")
    expect(equipment).toContain("forms[]")
    expect(equipment).toContain("string tags")
    const abilities = buildByoExtractionPrompt("abilities")
    expect(abilities).toContain("Weapon Mastery Properties")
    expect(abilities).toContain("Parry")
    const classes = buildByoExtractionPrompt("classes")
    expect(classes).toContain("plain language")
    expect(classes).toContain("do NOT invent JSON")
  })

  it("covers Metamagic library cost/prose rules, split-table rebuild, and OCR repair", () => {
    const metamagic = buildByoExtractionPrompt("invocations_metamagic")
    expect(metamagic).toContain("Keep Sorcery Point / resource cost sentences verbatim")
    expect(metamagic).toContain("equal to the spell's level")
    expect(metamagic).toContain("Do NOT emit mechanics[] for per-cast spell modifications")
    expect(metamagic).toContain("extract every supplied entry as written")
    expect(metamagic).not.toContain('ability_role: "metamagic"')

    expect(RICH_TEXT_TABLE_HINT).toContain("rebuild the fragments into a single HTML table")
    expect(RICH_TEXT_TABLE_HINT).toContain("[Source ends mid-entry]")

    expect(GENERAL_SOURCE_CLEANUP_HINT).toContain("Narrow OCR / line-join repair")
    expect(GENERAL_SOURCE_CLEANUP_HINT).toContain("to to cast")
    expect(GENERAL_SOURCE_CLEANUP_HINT).toContain("Never alter numbers")
    const prompt = buildByoExtractionPrompt("invocations_metamagic")
    expect(prompt).toContain("Narrow OCR / line-join repair")
    expect(prompt).toContain("rebuild the fragments into a single HTML table")
  })

  it("splits Martyr Sacrifice named benefits in BYO class prompts", () => {
    expect(CUSTOM_CLASS_IMPORT_HINT).toContain("Sacrificial Strike")
    expect(CUSTOM_CLASS_IMPORT_HINT).toContain("Sacrificial Skill")
    expect(CUSTOM_CLASS_IMPORT_HINT).toContain("different action economies")
    const prompt = buildByoExtractionPrompt("classes")
    expect(prompt).toContain("Sacrificial Strike")
    expect(prompt).toContain("Improved Sacrificial Strike")
    expect(prompt).toContain("failed_roll_trigger")
    expect(prompt).toContain("bonusFixed 5")
  })
})
