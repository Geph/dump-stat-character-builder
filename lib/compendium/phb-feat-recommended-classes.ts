/**
 * Soft “recommended for” class lists for 2024 PHB feats.
 * Applied by feat name when recommended_classes is empty (import + load enrich).
 * Does not gate eligibility — use prerequisite_class_ids for hard class gates.
 */

export const PHB_FEAT_RECOMMENDED_CLASS_NAMES = [
  "Artificer",
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
] as const

export type PhbFeatRecommendedClassName = (typeof PHB_FEAT_RECOMMENDED_CLASS_NAMES)[number]

/** Class → recommended feat names (user-facing PHB / 2024 Artificer lists). */
const PHB_CLASS_RECOMMENDED_FEATS: Record<PhbFeatRecommendedClassName, readonly string[]> = {
  Artificer: [
    "War Caster",
    "Crossbow Expert",
    "Fey Touched",
    "Shadow Touched",
    "Telekinetic",
    "Resilient",
    "Keen Mind",
    "Medium Armor Master",
  ],
  Barbarian: [
    "Great Weapon Master",
    "Crusher",
    "Sentinel",
    "Polearm Master",
    "Slasher",
    "Piercer",
    "Charger",
    "Grappler",
  ],
  Bard: [
    "Inspiring Leader",
    "Metamagic Adept",
    "Fey Touched",
    "Skill Expert",
    "Telekinetic",
    "War Caster",
    "Actor",
    "Resilient",
  ],
  Cleric: [
    "War Caster",
    "Resilient",
    "Elemental Adept",
    "Fey Touched",
    "Inspiring Leader",
    "Heavy Armor Master",
    "Telepathic",
    "Observant",
  ],
  Druid: [
    "War Caster",
    "Elemental Adept",
    "Resilient",
    "Telekinetic",
    "Observant",
    "Fey Touched",
    "Durable",
    "Keen Mind",
  ],
  Fighter: [
    "Great Weapon Master",
    "Sharpshooter",
    "Polearm Master",
    "Sentinel",
    "Crossbow Expert",
    "Resilient",
    "Dual Wielder",
    "Durable",
  ],
  Monk: [
    "Grappler",
    "Crusher",
    "Skulker",
    "Telekinetic",
    "Fey Touched",
    "Resilient",
    "Observant",
    "Charger",
  ],
  Paladin: [
    "Great Weapon Master",
    "Heavy Armor Master",
    "Shield Master",
    "Sentinel",
    "Inspiring Leader",
    "War Caster",
    "Charger",
    "Resilient",
  ],
  Ranger: [
    "Sharpshooter",
    "Crossbow Expert",
    "Skulker",
    "Speedy",
    "Fey Touched",
    "Observant",
    "Polearm Master",
    "Spell Sniper",
  ],
  Rogue: [
    "Skulker",
    "Skill Expert",
    "Piercer",
    "Slasher",
    "Crossbow Expert",
    "Defensive Duelist",
    "Telekinetic",
    "Fey Touched",
  ],
  Sorcerer: [
    "Metamagic Adept",
    "War Caster",
    "Elemental Adept",
    "Fey Touched",
    "Shadow Touched",
    "Telekinetic",
    "Resilient",
    "Spell Sniper",
  ],
  Warlock: [
    "Spell Sniper",
    "War Caster",
    "Fey Touched",
    "Shadow Touched",
    "Telekinetic",
    "Elemental Adept",
    "Resilient",
    "Telepathic",
  ],
  Wizard: [
    "War Caster",
    "Elemental Adept",
    "Fey Touched",
    "Shadow Touched",
    "Telekinetic",
    "Keen Mind",
    "Metamagic Adept",
    "Resilient",
  ],
}

/** Normalize Resilient (Con)/(Wis) style labels onto the catalog feat name. */
function normalizeRecommendedFeatName(name: string): string {
  const trimmed = name.replace(/\u2019/g, "'").trim()
  if (/^resilient\b/i.test(trimmed)) return "Resilient"
  return trimmed
}

function buildFeatToClassesMap(): Record<string, string[]> {
  const map = new Map<string, Set<string>>()
  for (const className of PHB_FEAT_RECOMMENDED_CLASS_NAMES) {
    for (const featName of PHB_CLASS_RECOMMENDED_FEATS[className]) {
      const key = normalizeRecommendedFeatName(featName)
      let set = map.get(key)
      if (!set) {
        set = new Set()
        map.set(key, set)
      }
      set.add(className)
    }
  }
  const out: Record<string, string[]> = {}
  for (const [feat, classes] of map) {
    out[feat] = PHB_FEAT_RECOMMENDED_CLASS_NAMES.filter((c) => classes.has(c))
  }
  return out
}

/** Feat name → recommended class names (PHB order). */
export const PHB_FEAT_RECOMMENDED_CLASSES_BY_NAME: Record<string, string[]> = buildFeatToClassesMap()

export function recommendedClassesForFeatName(featName: string): string[] | null {
  const key = normalizeRecommendedFeatName(featName)
  const classes = PHB_FEAT_RECOMMENDED_CLASSES_BY_NAME[key]
  return classes?.length ? [...classes] : null
}

function readRecommendedClasses(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  const names = raw.map((v) => String(v ?? "").trim()).filter(Boolean)
  return names.length ? names : null
}

/** Fill recommended_classes from the PHB map when unset. Preserves editor/custom values (including []). */
export function applyFeatRecommendedClasses(row: Record<string, unknown>): Record<string, unknown> {
  const hasExplicit =
    Array.isArray(row.recommended_classes) || Array.isArray(row.recommendedClasses)
  if (hasExplicit) {
    return {
      ...row,
      recommended_classes: readRecommendedClasses(row.recommended_classes ?? row.recommendedClasses) ?? [],
    }
  }
  const fromMap = recommendedClassesForFeatName(String(row.name ?? ""))
  if (!fromMap) return row
  return { ...row, recommended_classes: fromMap }
}
