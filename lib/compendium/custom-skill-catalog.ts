import { createCharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"

/** Reusable common-modifier template for homebrew / third-party custom skills. */
export const CUSTOM_SKILL_CATALOG_ID = "cat_char_custom_skill"

export function buildCustomSkillCatalogEntry(): ModifierCatalogEntry {
  const mod = createCharacteristicModifier("custom_skill")
  mod.label = "Custom Skill"
  return {
    id: CUSTOM_SKILL_CATALOG_ID,
    name: "Custom Skill",
    group: "Skills & saving throws",
    summary: "Passive: grant a named skill (proficiency + ability mod, optional expertise)",
    description:
      "<p>Creates a skill that works like a standard SRD skill check: ability modifier plus proficiency bonus (doubled with expertise). " +
      "The skill name appears in skill-check advantage and bonus modifiers on the same source.</p>",
    characteristics: [mod],
  }
}
