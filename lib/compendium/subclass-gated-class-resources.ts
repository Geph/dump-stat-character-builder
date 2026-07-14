import type { ClassResource } from "@/lib/types"

const SHORT_OR_LONG_REST = [{ rest: "short_rest" as const }, { rest: "long_rest" as const }]

/** Resource keys that belong to specific subclasses, not the base class. */
export const SUBCLASS_GATED_CLASS_RESOURCE_KEYS = new Set([
  "superiority_dice",
  "psionic_energy_dice",
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

/** Subclass-only pools (Battle Master, Psi Warrior / Psi Knight, Soulknife). */
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
]

export function normalizeSubclassNameForGate(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function matchesSubclassGate(subclassName: string, matchers: string[]): boolean {
  const normalized = normalizeSubclassNameForGate(subclassName)
  return matchers.some((matcher) => normalized === matcher || normalized.includes(matcher))
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
  return SUBCLASS_GATED_CLASS_RESOURCES.some(
    (entry) =>
      entry.className === className &&
      entry.resource.id === resourceKey &&
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
      entry.className === className && matchesSubclassGate(subclassName, entry.subclassMatchers),
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
