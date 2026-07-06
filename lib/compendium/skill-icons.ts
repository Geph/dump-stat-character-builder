import { SKILL_NAMES } from "@/lib/compendium/characteristic-modifiers"
import { collectCustomSkillNames } from "@/lib/compendium/characteristic-modifiers"
import type { CustomAbility } from "@/lib/types"

/** game-icons.net slugs for SRD skills (verified under public/icons/). */
const SKILL_ICON_BY_NAME: Record<string, string> = {
  Acrobatics: "acrobatic",
  "Animal Handling": "paw",
  Arcana: "crystal-ball",
  Athletics: "muscle-up",
  Deception: "domino-mask",
  History: "scroll-unfurled",
  Insight: "brain",
  Intimidation: "bull-horns",
  Investigation: "magnifying-glass",
  Medicine: "health-potion",
  Nature: "oak-leaf",
  Perception: "eyeball",
  Performance: "theater-curtains",
  Persuasion: "public-speaker",
  Religion: "church",
  "Sleight of Hand": "assassin-pocket",
  Stealth: "ninja-mask",
  Survival: "camping-tent",
}

const DEFAULT_SKILL_ICON = "skills"

export function skillIconSlug(
  skillName: string,
  customIcons: Record<string, string> = {},
): string | null {
  const name = skillName.trim()
  if (!name) return null
  if (customIcons[name]) return customIcons[name]
  if (SKILL_ICON_BY_NAME[name]) return SKILL_ICON_BY_NAME[name]
  if ((SKILL_NAMES as readonly string[]).includes(name)) return DEFAULT_SKILL_ICON
  return null
}

/** Map custom / homebrew skill names to icons from compendium custom abilities. */
export function buildCustomSkillIconByName(
  abilities: Pick<CustomAbility, "name" | "icon" | "characteristics" | "linked_modifiers">[],
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const ability of abilities) {
    const icon = ability.icon?.trim()
    if (!icon) continue
    const abilityName = ability.name?.trim()
    if (abilityName) map[abilityName] = icon
    for (const name of collectCustomSkillNames(ability.characteristics)) {
      map[name] = icon
    }
    for (const instance of ability.linked_modifiers ?? []) {
      for (const name of collectCustomSkillNames(instance.characteristics)) {
        map[name] = icon
      }
    }
  }
  return map
}
