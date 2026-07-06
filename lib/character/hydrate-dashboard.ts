import { asCompendiumRows, type DataClient } from "@/lib/data/types"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { loadModifierCatalog } from "@/lib/compendium/ensure-modifier-catalog"
import { loadCustomAbilitiesForGameplay } from "@/lib/compendium/load-custom-abilities-for-gameplay"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type {
  Background,
  Character,
  CustomAbility,
  DndClass,
  Equipment,
  Feat,
  Species,
  Spell,
  Subclass,
} from "@/lib/types"

export type DashboardCharacterRecord = Character & {
  classes?: DndClass | null
  species?: Species | null
  backgrounds?: Background | null
  subclasses?: Subclass | null
  class_list?: CharacterClassDetail[]
}

export type DashboardHydratedCharacter = {
  character: DashboardCharacterRecord
  feats: Feat[]
  equipment: Equipment[]
  equipmentCatalog: Equipment[]
  modifierCatalog: ModifierCatalogEntry[]
  customAbilities: CustomAbility[]
  spells: Spell[]
}

/**
 * Load selected characters plus shared compendium data for dashboard summaries.
 * Future live-sync: replace one-shot fetch with a subscription that calls this on push.
 */
export async function hydrateDashboardCharacters(
  db: DataClient,
  ids: string[],
): Promise<DashboardHydratedCharacter[]> {
  if (!ids.length) return []

  const [modifierCatalog, customAbilities, equipmentCatalogResult] = await Promise.all([
    loadModifierCatalog(db),
    loadCustomAbilitiesForGameplay(db),
    db.from("equipment").select("*").order("name"),
  ])
  const equipmentCatalog = asCompendiumRows(equipmentCatalogResult.data) as unknown as Equipment[]

  const characterRows = await Promise.all(
    ids.map(async (id) => {
      const { data, error } = await db
        .from("characters")
        .select(`*, classes (*), species (*), backgrounds (*), subclasses (*)`)
        .eq("id", id)
        .single()
      if (error || !data) return null
      return data as DashboardCharacterRecord
    }),
  )

  const validCharacters = characterRows.filter(
    (row): row is DashboardCharacterRecord => row !== null,
  )

  const allFeatIds = [...new Set(validCharacters.flatMap((row) => row.feat_ids ?? []))]
  const allEquipmentIds = [...new Set(validCharacters.flatMap((row) => row.equipment_ids ?? []))]
  const allSpellIds = [...new Set(validCharacters.flatMap((row) => row.spell_ids ?? []))]

  const [featsResult, equipmentResult, spellsResult] = await Promise.all([
    allFeatIds.length
      ? db.from("feats").select("*").in("id", allFeatIds)
      : Promise.resolve({ data: [] as unknown as Feat[] }),
    allEquipmentIds.length
      ? db.from("equipment").select("*").in("id", allEquipmentIds)
      : Promise.resolve({ data: [] as unknown as Equipment[] }),
    allSpellIds.length
      ? db.from("spells").select("*").in("id", allSpellIds)
      : Promise.resolve({ data: [] as unknown as Spell[] }),
  ])

  const featsById = new Map((asCompendiumRows(featsResult.data) as unknown as Feat[]).map((feat) => [feat.id, feat]))
  const equipmentById = new Map(
    (asCompendiumRows(equipmentResult.data) as unknown as Equipment[]).map((item) => [item.id, item]),
  )
  const spellsById = new Map((asCompendiumRows(spellsResult.data) as unknown as Spell[]).map((spell) => [spell.id, spell]))

  return validCharacters.map((character) => ({
    character,
    feats: (character.feat_ids ?? [])
      .map((featId) => featsById.get(featId))
      .filter((feat): feat is Feat => Boolean(feat)),
    equipment: (character.equipment_ids ?? [])
      .map((itemId) => equipmentById.get(itemId))
      .filter((item): item is Equipment => Boolean(item)),
    equipmentCatalog,
    modifierCatalog,
    customAbilities,
    spells: (character.spell_ids ?? [])
      .map((spellId) => spellsById.get(spellId))
      .filter((spell): spell is Spell => Boolean(spell)),
  }))
}
