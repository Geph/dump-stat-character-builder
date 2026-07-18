import { enrichSpellRowWithBundledCardImage } from "@/lib/compendium/enrich-srd-spells"
import { enrichSpeciesList } from "@/lib/compendium/normalize-species-traits"
import { enrichBackgroundList } from "@/lib/compendium/normalize-backgrounds"
import { enrichFeatsList } from "@/lib/compendium/normalize-feats"
import { enrichClassesList } from "@/lib/compendium/normalize-class-data"
import { enrichPsionicTalentGrantFeatures } from "@/lib/builder/aggregate-psionic-talents"
import { attachClassResourcesToClass } from "@/lib/compendium/resolve-class-resources"
import { filterEnabled } from "@/lib/compendium/compendium-enabled"
import { loadModifierCatalog } from "@/lib/compendium/ensure-modifier-catalog"
import { loadCustomAbilitiesForGameplay } from "@/lib/compendium/load-custom-abilities-for-gameplay"
import type { DataClient } from "@/lib/db/client"
import { asCompendiumRows } from "@/lib/data/types"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type {
  Background,
  CustomAbility,
  DndClass,
  Equipment,
  Feat,
  Species,
  Spell,
  Subclass,
} from "@/lib/types"

const COMPENDIUM_META =
  "prerequisite_rules, icon, accent_color, card_image_url, source, enabled"

/** Columns omitted from every compendium fetch: created_at, creator_url. */
export const BUILDER_CLASS_COLUMNS = [
  "id",
  "name",
  "description",
  "card_blurb",
  "complexity",
  "hit_die",
  "primary_ability",
  "saving_throws",
  "armor_proficiencies",
  "weapon_proficiencies",
  "skill_choices",
  "starting_equipment",
  "starting_equipment_groups",
  "starting_gold",
  "multiclass_prerequisites",
  "multiclass_proficiencies_gained",
  "features",
  "class_resources",
  "spellcasting",
  "special_ability",
  COMPENDIUM_META,
].join(", ")

export const BUILDER_SUBCLASS_COLUMNS = [
  "id",
  "class_id",
  "name",
  "description",
  "features",
  "spellcasting",
  COMPENDIUM_META,
].join(", ")

export const BUILDER_SPECIES_COLUMNS = [
  "id",
  "name",
  "description",
  "speed",
  "size",
  "size_options",
  "creature_type",
  "traits",
  "characteristics",
  "modifier_refs",
  "linked_modifiers",
  COMPENDIUM_META,
].join(", ")

export const BUILDER_BACKGROUND_COLUMNS = [
  "id",
  "name",
  "description",
  "ability_bonuses",
  "skill_proficiencies",
  "tool_proficiencies",
  "proficiencies",
  "feat_granted",
  "starting_gold",
  "starting_equipment",
  "starting_equipment_groups",
  "equipment",
  "feature",
  "grants_spells",
  "granted_spells",
  COMPENDIUM_META,
].join(", ")

export const BUILDER_FEAT_COLUMNS = [
  "id",
  "name",
  "description",
  "category",
  "level_requirement",
  "prerequisite",
  "prerequisite_feat_ids",
  "prerequisite_class_ids",
  "prerequisite_species_ids",
  "prerequisite_background_ids",
  "benefits",
  "modifier_refs",
  "linked_modifiers",
  "is_choice",
  "choices",
  "duration",
  "repeatable",
  COMPENDIUM_META,
].join(", ")

/** Omits higher_levels, material, psionic_augments — unused in builder spell UI. */
export const BUILDER_SPELL_COLUMNS = [
  "id",
  "name",
  "level",
  "school",
  "casting_time",
  "range",
  "components",
  "duration",
  "concentration",
  "ritual",
  "description",
  "classes",
  COMPENDIUM_META,
].join(", ")

export const BUILDER_EQUIPMENT_COLUMNS = [
  "id",
  "name",
  "category",
  "subcategory",
  "cost",
  "weight",
  "properties",
  "description",
  "requires_attunement",
  "magic_item_category",
  "rarity",
  "base_equipment_ids",
  "selected_base_equipment_id",
  "base_equipment_filter",
  "magic_effects",
  COMPENDIUM_META,
].join(", ")

export const BUILDER_CLASS_RESOURCE_COLUMNS = [
  "id",
  "class_id",
  "resource_key",
  "name",
  "description",
  "uses",
  COMPENDIUM_META,
].join(", ")

export type BuilderCompendiumPayload = {
  classes: DndClass[]
  subclasses: Subclass[]
  species: Species[]
  backgrounds: Background[]
  feats: Feat[]
  featsLoadError: string | null
  spells: Spell[]
  equipment: Equipment[]
  modifierCatalog: ModifierCatalogEntry[]
  customAbilities: CustomAbility[]
}

let cached: BuilderCompendiumPayload | null = null
let inflight: Promise<BuilderCompendiumPayload> | null = null

export function invalidateBuilderCompendiumCache(): void {
  cached = null
  inflight = null
}

export async function loadBuilderCompendium(
  db: DataClient,
  options?: { force?: boolean },
): Promise<BuilderCompendiumPayload> {
  if (!options?.force && cached) return cached
  if (!options?.force && inflight) return inflight

  inflight = fetchBuilderCompendium(db).then((payload) => {
    cached = payload
    inflight = null
    return payload
  })

  return inflight
}

async function fetchBuilderCompendium(db: DataClient): Promise<BuilderCompendiumPayload> {
  const [
    classesRes,
    subclassesRes,
    speciesRes,
    backgroundsRes,
    featsRes,
    spellsRes,
    equipmentRes,
    classResourcesRes,
  ] = await Promise.all([
    db.from("classes").select(BUILDER_CLASS_COLUMNS).order("name"),
    db.from("subclasses").select(BUILDER_SUBCLASS_COLUMNS).order("name"),
    db.from("species").select(BUILDER_SPECIES_COLUMNS).order("name"),
    db.from("backgrounds").select(BUILDER_BACKGROUND_COLUMNS).order("name"),
    db.from("feats").select(BUILDER_FEAT_COLUMNS).order("name"),
    db.from("spells").select(BUILDER_SPELL_COLUMNS).order("level").order("name"),
    db.from("equipment").select(BUILDER_EQUIPMENT_COLUMNS).order("category").order("name"),
    db.from("class_resources").select(BUILDER_CLASS_RESOURCE_COLUMNS),
  ])

  const catalog = await loadModifierCatalog(db)
  const customAbilities = await loadCustomAbilitiesForGameplay(db)

  const classResourceRows = asCompendiumRows(classResourcesRes.data)
  const enrichedClasses = enrichClassesList(
    asCompendiumRows<Parameters<typeof enrichClassesList>[0][number]>(classesRes.data),
  ) as unknown as DndClass[]

  const classes = filterEnabled(
    enrichedClasses.map((cls) => {
      const withResources = attachClassResourcesToClass(cls, classResourceRows as never)
      return {
        ...withResources,
        features: enrichPsionicTalentGrantFeatures(withResources.features ?? []),
      }
    }) as (DndClass & { enabled?: boolean | number | null })[],
  ) as unknown as DndClass[]

  const subclasses = filterEnabled(asCompendiumRows(subclassesRes.data)) as unknown as Subclass[]
  const species = filterEnabled(
    enrichSpeciesList(
      asCompendiumRows<Parameters<typeof enrichSpeciesList>[0][number]>(speciesRes.data),
    ) as unknown as Species[],
  )
  const backgrounds = enrichBackgroundList(
    filterEnabled(
      asCompendiumRows<
        Parameters<typeof enrichBackgroundList>[0][number] & { enabled?: boolean | number | null }
      >(backgroundsRes.data),
    ),
  ) as unknown as Background[]

  let feats: Feat[]
  let featsLoadError: string | null
  if (featsRes.error) {
    featsLoadError = featsRes.error.message
    feats = []
  } else {
    featsLoadError = null
    feats = filterEnabled(
      enrichFeatsList(
        asCompendiumRows<Parameters<typeof enrichFeatsList>[0][number]>(featsRes.data),
        catalog,
      ) as (Feat & { enabled?: boolean | number | null })[],
    ) as unknown as Feat[]
  }

  const spells = filterEnabled(
    asCompendiumRows(spellsRes.data).map((row) =>
      enrichSpellRowWithBundledCardImage(row as Record<string, unknown>),
    ),
  ) as unknown as Spell[]
  const equipment = filterEnabled(asCompendiumRows(equipmentRes.data)) as unknown as Equipment[]

  return {
    classes,
    subclasses,
    species,
    backgrounds,
    feats,
    featsLoadError,
    spells,
    equipment,
    modifierCatalog: catalog,
    customAbilities,
  }
}
