/** Builder-only pick state persisted on the character row for edit round-trips. */
export type CharacterBuilderPicks = {
  class_skill_picks?: Record<string, string[]>
  class_tool_picks?: Record<string, string[]>
  spell_picks_by_class_id?: Record<string, string[]>
  species_trait_picks?: Record<string, string[]>
  starting_equipment_option_index?: number | null
  background_starting_equipment_option_index?: number | null
  gold_purchased_equipment_ids?: string[]
}

export function normalizeBuilderPicks(raw: unknown): CharacterBuilderPicks {
  if (!raw || typeof raw !== "object") return {}
  const row = raw as CharacterBuilderPicks
  return {
    class_skill_picks: normalizeStringRecord(row.class_skill_picks),
    class_tool_picks: normalizeStringRecord(row.class_tool_picks),
    spell_picks_by_class_id: normalizeStringRecord(row.spell_picks_by_class_id),
    species_trait_picks: normalizeStringRecord(row.species_trait_picks),
    starting_equipment_option_index:
      typeof row.starting_equipment_option_index === "number"
        ? row.starting_equipment_option_index
        : null,
    background_starting_equipment_option_index:
      typeof row.background_starting_equipment_option_index === "number"
        ? row.background_starting_equipment_option_index
        : null,
    gold_purchased_equipment_ids: Array.isArray(row.gold_purchased_equipment_ids)
      ? row.gold_purchased_equipment_ids.filter((id): id is string => typeof id === "string")
      : [],
  }
}

function normalizeStringRecord(raw: unknown): Record<string, string[]> | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const out: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue
    const picks = value.filter((entry): entry is string => typeof entry === "string")
    if (picks.length) out[key] = picks
  }
  return Object.keys(out).length ? out : undefined
}

export function buildBuilderPicksFromSnapshot(params: {
  classSkillPicks: Record<string, string[]>
  classToolPicks: Record<string, string[]>
  spellPicksByClassId: Record<string, string[]>
  speciesTraitPicks: Record<string, string[]>
  startingEquipmentOptionIndex: number | null
  backgroundStartingEquipmentOptionIndex: number | null
  goldPurchasedEquipmentIds: string[]
}): CharacterBuilderPicks {
  const picks: CharacterBuilderPicks = {}
  if (Object.keys(params.classSkillPicks).length) {
    picks.class_skill_picks = params.classSkillPicks
  }
  if (Object.keys(params.classToolPicks).length) {
    picks.class_tool_picks = params.classToolPicks
  }
  if (Object.keys(params.spellPicksByClassId).length) {
    picks.spell_picks_by_class_id = params.spellPicksByClassId
  }
  if (Object.keys(params.speciesTraitPicks).length) {
    picks.species_trait_picks = params.speciesTraitPicks
  }
  if (params.startingEquipmentOptionIndex != null) {
    picks.starting_equipment_option_index = params.startingEquipmentOptionIndex
  }
  if (params.backgroundStartingEquipmentOptionIndex != null) {
    picks.background_starting_equipment_option_index =
      params.backgroundStartingEquipmentOptionIndex
  }
  if (params.goldPurchasedEquipmentIds.length) {
    picks.gold_purchased_equipment_ids = params.goldPurchasedEquipmentIds
  }
  return picks
}
