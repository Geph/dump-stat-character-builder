import type { ClassResource } from "@/lib/types"

const SHORT_OR_LONG_REST = [{ rest: "short_rest" as const }, { rest: "long_rest" as const }]

/** Resource keys that belong to specific subclasses, not the base class. */
export const SUBCLASS_GATED_CLASS_RESOURCE_KEYS = new Set([
  "superiority_dice",
  "psionic_energy_dice",
  "rampage_die",
  /** Grey Watchman (MHP Warden) — not Captain/Vagabond class-table Battle Dice. */
  "battle_dice",
])

type SubclassGatedResource = {
  className: string
  /** Normalized name fragments (lowercase, spaces collapsed). */
  subclassMatchers: string[]
  resource: ClassResource
}

const SUPERIORITY_DICE: ClassResource = {
  id: "superiority_dice",
  name: "Superiority Dice",
  description:
    "Spent when you use a Battle Master maneuver. Four dice at level 3, five at level 7, six at level 15. Die starts at d8, becomes d10 at level 10 and d12 at level 18. Recharges on a short or long rest.",
  uses: {
    type: "at_level",
    atLevelMode: "tier",
    dieType: "d8",
    dieSidesByLevel: [
      { level: 3, count: 8 },
      { level: 10, count: 10 },
      { level: 18, count: 12 },
    ],
    recharges: SHORT_OR_LONG_REST,
    atLevelTable: [
      { level: 3, count: 4 },
      { level: 7, count: 5 },
      { level: 15, count: 6 },
    ],
  },
}

const FIGHTER_PSIONIC_ENERGY_DICE: ClassResource = {
  id: "psionic_energy_dice",
  name: "Psionic Energy Dice",
  description:
    "Spent on Psi Warrior powers (Protective Field, Psionic Strike, Telekinetic Movement, and similar). Pool size and die size scale by Fighter level. Regain one die on a short rest and all dice on a long rest.",
  uses: {
    type: "at_level",
    atLevelMode: "tier",
    dieType: "d6",
    recharges: [
      { rest: "short_rest", amount: 1 },
      { rest: "long_rest" },
    ],
    atLevelTable: [
      { level: 3, count: 4 },
      { level: 5, count: 6 },
      { level: 9, count: 8 },
      { level: 11, count: 8 },
      { level: 13, count: 10 },
      { level: 17, count: 12 },
    ],
  },
}

const ROGUE_PSIONIC_ENERGY_DICE: ClassResource = {
  id: "psionic_energy_dice",
  name: "Psionic Energy Dice",
  description:
    "Spent on Soulknife psionic powers (Psi-Bolstered Knack, Psychic Whispers, Homing Strikes, and similar). Pool size and die size scale by Rogue level. Regain one die on a short rest and all dice on a long rest.",
  uses: {
    type: "at_level",
    atLevelMode: "tier",
    dieType: "d6",
    recharges: [
      { rest: "short_rest", amount: 1 },
      { rest: "long_rest" },
    ],
    atLevelTable: [
      { level: 3, count: 4 },
      { level: 5, count: 6 },
      { level: 9, count: 8 },
      { level: 11, count: 8 },
      { level: 13, count: 10 },
      { level: 17, count: 12 },
    ],
  },
}

const PSION_RAMPAGE_DIE: ClassResource = {
  id: "rampage_die",
  name: "Rampage Die",
  description:
    "Starts at d4 and changes during play. Use the character-sheet Rampage Die controls to step it up through d6, d8, d10, and d12 or reset it to d4.",
  display: "static",
  uses: {
    type: "special",
    dieType: "d4",
    specialDescription: "Mutable play-state die (d4–d12)",
  },
}

/** Stub for gated upsert — import proposals usually supply the real at_level table. */
const WARDEN_GREY_WATCHMAN_BATTLE_DICE: ClassResource = {
  id: "battle_dice",
  name: "Battle Dice",
  description:
    "Spent when you use a Grey Watchman maneuver. Pool size and die size scale by Warden level. Regain on Initiative, and on a short or long rest.",
  uses: {
    type: "at_level",
    atLevelMode: "tier",
    dieType: "d6",
    recharges: SHORT_OR_LONG_REST,
    rechargeOnInitiative: true,
    atLevelTable: [
      { level: 3, count: 2 },
      { level: 7, count: 3 },
      { level: 13, count: 4 },
      { level: 19, count: 5 },
    ],
  },
}

/** Subclass-only pools (Battle Master, Psi Warrior / Psi Knight, Soulknife, Grey Watchman). */
export const SUBCLASS_GATED_CLASS_RESOURCES: SubclassGatedResource[] = [
  {
    className: "Fighter",
    subclassMatchers: ["battle master", "battlemaster"],
    resource: SUPERIORITY_DICE,
  },
  {
    className: "Fighter",
    subclassMatchers: ["psi warrior", "psi knight", "psionic warrior"],
    resource: FIGHTER_PSIONIC_ENERGY_DICE,
  },
  {
    className: "Rogue",
    subclassMatchers: ["soulknife", "soul knife"],
    resource: ROGUE_PSIONIC_ENERGY_DICE,
  },
  {
    className: "Psion",
    subclassMatchers: ["unleashed mind"],
    resource: PSION_RAMPAGE_DIE,
  },
  {
    className: "Warden",
    subclassMatchers: ["grey watchman", "gray watchman"],
    resource: WARDEN_GREY_WATCHMAN_BATTLE_DICE,
  },
]

export function normalizeSubclassNameForGate(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function matchesSubclassGate(subclassName: string, matchers: string[]): boolean {
  const normalized = normalizeSubclassNameForGate(subclassName)
  return matchers.some((matcher) => normalized === matcher || normalized.includes(matcher))
}

/** Match "Warden" to imported renames like "Mage Hand Press Warden". */
export function classNamesMatchGate(actual: string, expected: string): boolean {
  if (actual === expected) return true
  const a = normalizeSubclassNameForGate(actual)
  const e = normalizeSubclassNameForGate(expected)
  if (!a || !e) return false
  return a === e || a.includes(e) || e.includes(a)
}

export function isSubclassGatedClassResourceKey(resourceKey: string): boolean {
  return SUBCLASS_GATED_CLASS_RESOURCE_KEYS.has(resourceKey)
}

export function isGatedClassResourceUnlockedForClass(
  resourceKey: string,
  className: string,
  subclassNames: readonly string[],
): boolean {
  if (!isSubclassGatedClassResourceKey(resourceKey)) return true
  const entriesForKey = SUBCLASS_GATED_CLASS_RESOURCES.filter(
    (entry) => entry.resource.id === resourceKey,
  )
  const classEntries = entriesForKey.filter((entry) =>
    classNamesMatchGate(className, entry.className),
  )
  // Gated only for classes that appear in the table (e.g. Captain battle_dice stays open).
  if (classEntries.length === 0) return true
  return classEntries.some((entry) =>
    subclassNames.some((name) => matchesSubclassGate(name, entry.subclassMatchers)),
  )
}

/** Hide subclass-only pools in the Class Resources tab until unlockers are loaded. */
export function filterCompendiumClassResourcesBySubclasses<
  T extends { class_id: string; resource_key: string },
>(
  rows: T[],
  classNamesById: Record<string, string>,
  subclasses: readonly { class_id: string; name: string }[],
): T[] {
  const subclassNamesByClassId = new Map<string, string[]>()
  for (const subclass of subclasses) {
    const list = subclassNamesByClassId.get(subclass.class_id) ?? []
    list.push(subclass.name)
    subclassNamesByClassId.set(subclass.class_id, list)
  }

  return rows.filter((row) => {
    if (!isSubclassGatedClassResourceKey(row.resource_key)) return true
    const className = classNamesById[row.class_id] ?? ""
    const names = subclassNamesByClassId.get(row.class_id) ?? []
    return isGatedClassResourceUnlockedForClass(row.resource_key, className, names)
  })
}

export function gatedClassResourcesUnlockedBySubclass(
  className: string,
  subclassName: string,
): ClassResource[] {
  return SUBCLASS_GATED_CLASS_RESOURCES.filter(
    (entry) =>
      classNamesMatchGate(className, entry.className) &&
      matchesSubclassGate(subclassName, entry.subclassMatchers),
  ).map((entry) => entry.resource)
}

/** Upsert payload when an unlocking subclass is imported. */
export function buildGatedClassResourceRowsForSubclass(
  classId: string,
  className: string,
  subclassName: string,
  source: string,
): Record<string, unknown>[] {
  return gatedClassResourcesUnlockedBySubclass(className, subclassName).map((resource) => ({
    class_id: classId,
    resource_key: resource.id,
    name: resource.name,
    description: resource.description ?? "",
    uses: resource.uses,
    source,
  }))
}
