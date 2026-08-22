/**
 * Layout profiles for sheets whose form fields carry no meaningful names.
 *
 * Alias matching (see `field-aliases.ts`) handles sheets that name their fields after
 * what they hold. Some publisher sheets instead ship `Text Box 27` / `Numeric Field 5`
 * everywhere, so the only way to fill them is an explicit map recorded from the widget
 * layout. A profile applies only when every name in its `signature` is present, which
 * keeps it from touching a different sheet that happens to reuse generic names.
 *
 * These sheets also reuse the same field name on both pages, so profile entries are
 * page-scoped.
 */

export type SheetProfileTarget = {
  name: string
  /** Page index the widget lives on; profile-wide default when omitted. */
  page?: number
}

export type SheetFieldProfile = {
  id: string
  label: string
  signature: readonly string[]
  defaultPage: number
  fields: Readonly<Record<string, string | readonly string[]>>
}

/** `Text Box 35`-style rows: [name, attack, damage, notes] per row, top to bottom. */
const PHB_2024_WEAPON_ROWS = [
  ["Text Box 35", "Text Box 53", "Text Box 47"],
  ["Text Box 36", "Text Box 54", "Text Box 51"],
  ["Text Box 37", "Text Box 55", "Text Box 52"],
  ["Text Box 38", "Text Box 56", "Text Box 48"],
  ["Text Box 39", "Text Box 57", "Text Box 49"],
  ["Text Box 40", "Text Box 58", "Text Box 50"],
] as const

function phb2024WeaponFields(): Record<string, string> {
  const out: Record<string, string> = {}
  PHB_2024_WEAPON_ROWS.forEach(([name, attack, damage], i) => {
    const n = i + 1
    out[`weapon.${n}.name`] = name
    out[`weapon.${n}.attack`] = attack
    out[`weapon.${n}.damage`] = damage
  })
  return out
}

const PHB_2024_PROFILE: SheetFieldProfile = {
  id: "phb-2024-fillable",
  label: "2024 PHB character sheet",
  signature: [
    "Strength Mod",
    "Int Saving Throw Proficiency",
    "Numeric Field 7",
    "Class Features 1",
    "Species Traits",
    "Hit Dice Spent",
    "Passive Perception",
    "Text Box 59",
  ],
  defaultPage: 0,
  fields: {
    characterName: "Text Box 1",
    backgroundName: "Text Box 2",
    className: "Text Box 3",
    playerName: "Text Box 4",
    subclassName: "Text Box 5",
    initiative: "Text Box 59",

    "ability.strength.mod": "Strength Mod",
    "ability.strength.score": "Numeric Field 3",
    "save.strength.bonus": "Text Box 13",
    "save.strength.proficient": "Check Box 8",
    "skill.athletics.bonus": "Text Box 14",
    "skill.athletics.proficient": "Check Box 9",

    "ability.dexterity.mod": "Text Box 15",
    "ability.dexterity.score": "Numeric Field 4",
    "save.dexterity.bonus": "Text Box 16",
    "save.dexterity.proficient": "Check Box 13",
    "skill.acrobatics.bonus": "Text Box 17",
    "skill.acrobatics.proficient": "Check Box 14",
    "skill.sleight-of-hand.bonus": "Text Box 18",
    "skill.sleight-of-hand.proficient": "Check Box 15",
    "skill.stealth.bonus": "Text Box 19",
    "skill.stealth.proficient": "Check Box 16",

    "ability.constitution.mod": "Text Box 27",
    "ability.constitution.score": "Numeric Field 6",
    "save.constitution.bonus": "Text Box 28",
    "save.constitution.proficient": "Check Box 23",

    "ability.intelligence.mod": "Text Box 6",
    "ability.intelligence.score": "Numeric Field 2",
    "save.intelligence.bonus": "Text Box 7",
    "save.intelligence.proficient": "Int Saving Throw Proficiency",
    "skill.arcana.bonus": "Text Box 8",
    "skill.arcana.proficient": "Arcana Proficiency",
    "skill.history.bonus": "Text Box 9",
    "skill.history.proficient": "History Proficiency",
    "skill.investigation.bonus": "Text Box 12",
    "skill.investigation.proficient": "Investigation Proficiency",
    "skill.nature.bonus": "Text Box 10",
    "skill.nature.proficient": "Nature Proficiency",
    "skill.religion.bonus": "Text Box 11",
    "skill.religion.proficient": "Religion Proficiency",

    "ability.wisdom.mod": "Text Box 20",
    "ability.wisdom.score": "Numeric Field 5",
    "save.wisdom.bonus": "Text Box 21",
    "save.wisdom.proficient": "Check Box 20",
    "skill.animal-handling.bonus": "Text Box 22",
    "skill.animal-handling.proficient": "Check Box 21",
    "skill.insight.bonus": "Text Box 23",
    "skill.insight.proficient": "Check Box 19",
    "skill.medicine.bonus": "Text Box 25",
    "skill.medicine.proficient": "Check Box 18",
    "skill.perception.bonus": "Text Box 24",
    "skill.perception.proficient": "Check Box 22",
    "skill.survival.bonus": "Text Box 26",
    "skill.survival.proficient": "Check Box 17",

    "ability.charisma.mod": "Text Box 29",
    "ability.charisma.score": "Numeric Field 7",
    "save.charisma.bonus": "Text Box 30",
    "save.charisma.proficient": "Check Box 24",
    "skill.deception.bonus": "Text Box 32",
    "skill.deception.proficient": "Check Box 28",
    "skill.intimidation.bonus": "Text Box 33",
    "skill.intimidation.proficient": "Check Box 25",
    "skill.performance.bonus": "Text Box 34",
    "skill.performance.proficient": "Check Box 26",
    "skill.persuasion.bonus": "Text Box 31",
    "skill.persuasion.proficient": "Check Box 27",

    "prof.armor.light": "Check Box 12",
    "prof.armor.medium": ["Check Box 11", "Medium Armor"],
    "prof.armor.heavy": "Check Box 1",
    "prof.shields": "Check Box 10",

    ...phb2024WeaponFields(),
  },
}

export const SHEET_FIELD_PROFILES: readonly SheetFieldProfile[] = [PHB_2024_PROFILE]

export function matchSheetProfile(fieldNames: readonly string[]): SheetFieldProfile | null {
  const present = new Set(fieldNames)
  return (
    SHEET_FIELD_PROFILES.find((profile) =>
      profile.signature.every((name) => present.has(name)),
    ) ?? null
  )
}

/** Page-scoped targets for a canonical key, or an empty list when unmapped. */
export function profileTargets(
  profile: SheetFieldProfile,
  canonicalKey: string,
): SheetProfileTarget[] {
  const entry = profile.fields[canonicalKey]
  if (!entry) return []
  const names = typeof entry === "string" ? [entry] : entry
  return names.map((name) => ({ name, page: profile.defaultPage }))
}
