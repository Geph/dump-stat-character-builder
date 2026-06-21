import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { Feature, FeatureActivation, Species, UsesConfig } from "@/lib/types"

export type ActionEconomyKind = "action" | "bonus" | "reaction"

export type SheetActionEntry = {
  id: string
  name: string
  sourceLabel: string
  kinds: ActionEconomyKind[]
  limitedUses: UsesConfig | null | undefined
  classLevel: number
}

export function activationKinds(activation?: FeatureActivation | null): ActionEconomyKind[] {
  if (!activation) return []
  const kinds: ActionEconomyKind[] = []
  if (activation.action) kinds.push("action")
  if (activation.bonusAction) kinds.push("bonus")
  if (activation.reaction) kinds.push("reaction")
  return kinds
}

function pushFeatureActions(
  actions: SheetActionEntry[],
  features: Feature[] | undefined,
  classLevel: number,
  sourceLabel: string,
  idPrefix: string,
) {
  for (const feature of features ?? []) {
    if (feature.level > classLevel) continue
    const kinds = activationKinds(feature.activation)
    if (!kinds.length) continue
    actions.push({
      id: `${idPrefix}:${feature.level}:${feature.name}`,
      name: feature.name,
      sourceLabel,
      kinds,
      limitedUses: feature.limitedUses,
      classLevel,
    })
  }
}

export function collectSheetActions(params: {
  classDetails: CharacterClassDetail[]
  species: Species | null
}): SheetActionEntry[] {
  const actions: SheetActionEntry[] = []

  for (const entry of params.classDetails) {
    const className = entry.class?.name ?? "Class"
    pushFeatureActions(
      actions,
      entry.class?.features as Feature[] | undefined,
      entry.row.level,
      className,
      entry.row.class_id,
    )
    if (entry.subclass) {
      pushFeatureActions(
        actions,
        entry.subclass.features as Feature[] | undefined,
        entry.row.level,
        entry.subclass.name,
        `sub-${entry.subclass.id}`,
      )
    }
  }

  return actions
}

export const ACTION_KIND_LABELS: Record<ActionEconomyKind, string> = {
  action: "Action",
  bonus: "Bonus Action",
  reaction: "Reaction",
}
