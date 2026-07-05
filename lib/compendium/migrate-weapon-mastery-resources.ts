import type { ClassResource, DndClass, Feature } from "@/lib/types"
import { weaponMasteryChoiceCountByLevel } from "@/lib/compendium/weapon-mastery-choice"

/** Copy legacy weapon_mastery resource tables onto Weapon Mastery feature choices. */
export function migrateWeaponMasteryOnClass(classRow: DndClass): DndClass {
  const resources = classRow.class_resources ?? []
  const wmResource = resources.find((resource) => resource.id === "weapon_mastery")
  if (!wmResource?.uses.atLevelTable?.length && wmResource?.uses.type !== "fixed") {
    return classRow
  }

  const table =
    wmResource.uses.type === "fixed"
      ? [{ level: 1, count: wmResource.uses.fixedAmount ?? 2 }]
      : (wmResource.uses.atLevelTable ?? [])

  const features = (classRow.features ?? []).map((feature) => {
    if (!/^weapon mastery$/i.test(feature.name?.trim() ?? "")) return feature
    return {
      ...feature,
      isChoice: true,
      choices: {
        ...(feature.choices ?? {
          category: "Weapon Mastery",
          count: table[0]?.count ?? 2,
          options: [],
        }),
        choiceCountByLevel: table,
        resourceKey: undefined,
      },
    }
  })

  return {
    ...classRow,
    features,
    class_resources: resources.filter((resource) => resource.id !== "weapon_mastery"),
  }
}

export function migrateWeaponMasteryResourcesList(
  resources: ClassResource[],
  features: Feature[] | null | undefined,
  className: string,
): { resources: ClassResource[]; features: Feature[] } {
  const wmResource = resources.find((resource) => resource.id === "weapon_mastery")
  const nextResources = resources.filter((resource) => resource.id !== "weapon_mastery")
  if (!wmResource) {
    return { resources: nextResources, features: features ?? [] }
  }

  const table = wmResource.uses.atLevelTable?.length
    ? wmResource.uses.atLevelTable
    : wmResource.uses.type === "fixed"
      ? [{ level: 1, count: wmResource.uses.fixedAmount ?? 2 }]
      : weaponMasteryChoiceCountByLevel(className)

  const nextFeatures = (features ?? []).map((feature) => {
    if (!/^weapon mastery$/i.test(feature.name?.trim() ?? "")) return feature
    return {
      ...feature,
      isChoice: true,
      choices: {
        ...(feature.choices ?? {
          category: "Weapon Mastery",
          count: table[0]?.count ?? 2,
          options: [],
        }),
        choiceCountByLevel: feature.choices?.choiceCountByLevel?.length
          ? feature.choices.choiceCountByLevel
          : table,
        resourceKey: undefined,
      },
    }
  })

  return { resources: nextResources, features: nextFeatures }
}
