import {
  boolean,
  char,
  int,
  json,
  mediumtext,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
} from "drizzle-orm/mysql-core"

const id = () => char("id", { length: 36 }).primaryKey().notNull()
const timestamps = {
  created_at: timestamp("created_at").defaultNow().notNull(),
}
const compendiumMeta = {
  prerequisite_rules: json("prerequisite_rules").$type<
    import("@/lib/import/content-schema").PrerequisiteRule[]
  >(),
  icon: varchar("icon", { length: 255 }),
  accent_color: varchar("accent_color", { length: 32 }),
  card_image_url: mediumtext("card_image_url"),
  source: varchar("source", { length: 64 }).notNull().default("Custom"),
  creator_url: varchar("creator_url", { length: 512 }),
  enabled: boolean("enabled").notNull().default(true),
  ...timestamps,
}

export const classes = mysqlTable("classes", {
  id: id(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  card_blurb: varchar("card_blurb", { length: 120 }),
  complexity: varchar("complexity", { length: 16 }).$type<
    import("@/lib/compendium/class-complexity").ClassComplexity | null
  >(),
  hit_die: int("hit_die").notNull().default(8),
  primary_ability: json("primary_ability").$type<string[]>(),
  saving_throws: json("saving_throws").$type<string[]>(),
  armor_proficiencies: json("armor_proficiencies").$type<string[]>(),
  weapon_proficiencies: json("weapon_proficiencies").$type<string[]>(),
  skill_choices: json("skill_choices").$type<{
    count: number
    options: string[]
    fixed?: string[]
  } | null>(),
  starting_equipment: json("starting_equipment"),
  starting_equipment_groups: json("starting_equipment_groups"),
  starting_gold: int("starting_gold").default(0),
  multiclass_prerequisites: json("multiclass_prerequisites").$type<
    { ability: string; minimum: number }[]
  >(),
  multiclass_proficiencies_gained: json("multiclass_proficiencies_gained").$type<string[]>(),
  features: json("features").$type<unknown[]>().default([]),
  class_resources: json("class_resources").$type<unknown[]>().default([]),
  spellcasting: json("spellcasting"),
  special_ability: json("special_ability").$type<
    import("@/lib/types").DndClass["special_ability"]
  >(),
  /** Prefer same-source spells/feats over SRD when this class replaces SRD content. */
  prefer_same_source_replacements: boolean("prefer_same_source_replacements")
    .notNull()
    .default(false),
  ...compendiumMeta,
})

export const subclasses = mysqlTable("subclasses", {
  id: id(),
  class_id: char("class_id", { length: 36 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  card_blurb: varchar("card_blurb", { length: 120 }),
  features: json("features").$type<unknown[]>().default([]),
  spellcasting: json("spellcasting"),
  ...compendiumMeta,
})

export const species = mysqlTable("species", {
  id: id(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  speed: json("speed"),
  size: varchar("size", { length: 32 }),
  size_options: json("size_options").$type<string[]>(),
  creature_type: varchar("creature_type", { length: 64 }).default("Humanoid"),
  traits: json("traits").$type<unknown[]>().default([]),
  characteristics: json("characteristics").$type<unknown[]>().default([]),
  modifier_refs: json("modifier_refs").$type<string[]>().default([]),
  linked_modifiers: json("linked_modifiers").$type<unknown[]>().default([]),
  ...compendiumMeta,
})

export const languages = mysqlTable("languages", {
  id: id(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  pool: varchar("pool", { length: 32 }).notNull().default("standard"),
  typical_speakers: text("typical_speakers"),
  script: varchar("script", { length: 128 }),
  ...compendiumMeta,
})

export const tools = mysqlTable("tools", {
  id: id(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  tool_group: varchar("tool_group", { length: 32 }).notNull().default("other"),
  subcategory: varchar("subcategory", { length: 64 }),
  check_ability: varchar("check_ability", { length: 32 }).notNull().default("intelligence"),
  expands_to: json("expands_to").$type<string[]>(),
  ...compendiumMeta,
})

export const creatures = mysqlTable("creatures", {
  id: id(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  creature_type: varchar("creature_type", { length: 64 }),
  size: varchar("size", { length: 64 }),
  alignment: varchar("alignment", { length: 64 }),
  cr: varchar("cr", { length: 16 }),
  category: varchar("category", { length: 16 }).$type<"creature" | "companion">().default("creature"),
  xp: int("xp"),
  scaling: json("scaling").$type<{ scales_with: string; notes: string } | null>(),
  import_payload: json("import_payload").$type<
    import("@/lib/import/creature-import-v2-schema").CreatureImportV2 | null
  >(),
  stat_block: json("stat_block").$type<
    import("@/lib/character/companion-stat-block").CompanionStatBlockTemplate
  >(),
  ...compendiumMeta,
})

export const backgrounds = mysqlTable("backgrounds", {
  id: id(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  ability_bonuses: json("ability_bonuses"),
  skill_proficiencies: json("skill_proficiencies").$type<string[]>(),
  tool_proficiencies: json("tool_proficiencies").$type<string[]>(),
  proficiencies: json("proficiencies").$type<import("@/lib/compendium/background-proficiencies").BackgroundProficiencies>(),
  feat_granted: varchar("feat_granted", { length: 255 }),
  starting_gold: int("starting_gold"),
  starting_equipment: json("starting_equipment"),
  starting_equipment_groups: json("starting_equipment_groups").$type<
    import("@/lib/types").StartingEquipmentGroup[]
  >(),
  equipment: json("equipment"),
  feature: json("feature"),
  grants_spells: boolean("grants_spells").notNull().default(false),
  granted_spells: json("granted_spells").$type<Record<string, string[]>>(),
  ...compendiumMeta,
})

export const spells = mysqlTable("spells", {
  id: id(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  level: int("level").notNull().default(0),
  school: varchar("school", { length: 64 }).notNull(),
  casting_time: varchar("casting_time", { length: 128 }),
  range: varchar("range", { length: 128 }),
  components: json("components").$type<string[]>(),
  material: text("material"),
  duration: varchar("duration", { length: 128 }),
  concentration: boolean("concentration").notNull().default(false),
  ritual: boolean("ritual").notNull().default(false),
  description: text("description"),
  higher_levels: text("higher_levels"),
  classes: json("classes").$type<string[]>(),
  psionic_augments: json("psionic_augments").$type<
    import("@/lib/compendium/parse-psionic-augments").PsionicAugmentsConfig
  >(),
  companion_creature_names: json("companion_creature_names").$type<string[]>().default([]),
  linked_modifiers: json("linked_modifiers").$type<unknown[]>().default([]),
  ...compendiumMeta,
})

export const feats = mysqlTable("feats", {
  id: id(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  category: varchar("category", { length: 64 }),
  level_requirement: int("level_requirement"),
  prerequisite: text("prerequisite"),
  prerequisite_feat_ids: json("prerequisite_feat_ids").$type<string[]>(),
  prerequisite_class_ids: json("prerequisite_class_ids").$type<string[]>(),
  prerequisite_species_ids: json("prerequisite_species_ids").$type<string[]>(),
  prerequisite_background_ids: json("prerequisite_background_ids").$type<string[]>(),
  benefits: json("benefits"),
  modifier_refs: json("modifier_refs").$type<string[]>().default([]),
  linked_modifiers: json("linked_modifiers").$type<unknown[]>().default([]),
  is_choice: boolean("is_choice").notNull().default(false),
  choices: json("choices").$type<import("@/lib/types").FeatureChoice | null>(),
  duration: varchar("duration", { length: 32 }),
  repeatable: boolean("repeatable").notNull().default(false),
  ...compendiumMeta,
})

export const equipment = mysqlTable("equipment", {
  id: id(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  category: varchar("category", { length: 128 }).notNull(),
  subcategory: varchar("subcategory", { length: 128 }),
  cost: json("cost"),
  weight: decimal("weight", { precision: 10, scale: 2 }),
  properties: json("properties"),
  description: text("description"),
  requires_attunement: boolean("requires_attunement"),
  magic_item_category: varchar("magic_item_category", { length: 64 }),
  rarity: varchar("rarity", { length: 32 }),
  base_equipment_ids: json("base_equipment_ids").$type<string[]>(),
  selected_base_equipment_id: char("selected_base_equipment_id", { length: 36 }),
  base_equipment_filter: varchar("base_equipment_filter", { length: 32 }),
  magic_effects: json("magic_effects").$type<unknown[]>().default([]),
  ...compendiumMeta,
})

export const classResources = mysqlTable("class_resources", {
  id: id(),
  class_id: char("class_id", { length: 36 }).notNull(),
  resource_key: varchar("resource_key", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  uses: json("uses").$type<import("@/lib/types").UsesConfig>().notNull(),
  ...compendiumMeta,
})

export const customAbilities = mysqlTable("custom_abilities", {
  id: id(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  characteristics: json("characteristics").$type<unknown[]>().default([]),
  modifier_refs: json("modifier_refs").$type<string[]>().default([]),
  linked_modifiers: json("linked_modifiers").$type<unknown[]>().default([]),
  prerequisites: text("prerequisites"),
  attached_to_type: varchar("attached_to_type", { length: 64 }),
  attached_to_id: varchar("attached_to_id", { length: 128 }),
  uses: json("uses"),
  show_in_builder: boolean("show_in_builder").notNull().default(true),
  companion_stat_block: json("companion_stat_block").$type<
    import("@/lib/character/companion-stat-block").CompanionStatBlockTemplate
  >(),
  psionic_augments: json("psionic_augments").$type<
    import("@/lib/compendium/parse-psionic-augments").PsionicAugmentsConfig
  >(),
  casting_time: varchar("casting_time", { length: 128 }),
  execution: varchar("execution", { length: 255 }),
  eligible_classes: json("eligible_classes").$type<string[]>(),
  range: varchar("range", { length: 255 }),
  components: json("components").$type<string[]>(),
  duration: varchar("duration", { length: 255 }),
  concentration: boolean("concentration"),
  is_choice: boolean("is_choice"),
  choices: json("choices").$type<import("@/lib/types").FeatureChoice>(),
  level_requirement: int("level_requirement"),
  ability_role: varchar("ability_role", { length: 32 }),
  is_system: boolean("is_system").notNull().default(false),
  modifier_catalog: json("modifier_catalog").$type<import("@/lib/compendium/modifier-catalog").ModifierCatalogEntry[]>().default([]),
  icon: varchar("icon", { length: 255 }),
  accent_color: varchar("accent_color", { length: 32 }),
  source: varchar("source", { length: 64 }).notNull().default("Custom"),
  creator_url: varchar("creator_url", { length: 512 }),
  enabled: boolean("enabled").notNull().default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
})

export const characters = mysqlTable("characters", {
  id: id(),
  local_id: varchar("local_id", { length: 64 }),
  name: varchar("name", { length: 255 }).notNull().default("Unnamed"),
  level: int("level").notNull().default(1),
  experience: int("experience").notNull().default(0),
  class_id: char("class_id", { length: 36 }),
  subclass_id: char("subclass_id", { length: 36 }),
  character_classes: json("character_classes").$type<
    import("@/lib/character/character-classes").CharacterClassRow[]
  >(),
  class_add_order: json("class_add_order").$type<string[]>(),
  species_id: char("species_id", { length: 36 }),
  background_id: char("background_id", { length: 36 }),
  size: varchar("size", { length: 32 }),
  strength: int("strength").notNull().default(10),
  dexterity: int("dexterity").notNull().default(10),
  constitution: int("constitution").notNull().default(10),
  intelligence: int("intelligence").notNull().default(10),
  wisdom: int("wisdom").notNull().default(10),
  charisma: int("charisma").notNull().default(10),
  alignment: varchar("alignment", { length: 64 }),
  personality_traits: text("personality_traits"),
  ideals: text("ideals"),
  bonds: text("bonds"),
  flaws: text("flaws"),
  backstory: text("backstory"),
  appearance: json("appearance"),
  portrait_url: mediumtext("portrait_url"),
  banner_url: mediumtext("banner_url"),
  asi_allocations: json("asi_allocations").$type<Record<string, Record<string, number>>>(),
  proficiency_bonus: int("proficiency_bonus").notNull().default(2),
  hit_points: int("hit_points"),
  hit_point_max: int("hit_point_max"),
  armor_class: int("armor_class"),
  initiative: int("initiative"),
  speed: int("speed"),
  skill_proficiencies: json("skill_proficiencies").$type<string[]>(),
  skill_expertise: json("skill_expertise").$type<string[]>(),
  tool_proficiencies: json("tool_proficiencies").$type<string[]>(),
  weapon_proficiencies: json("weapon_proficiencies").$type<string[]>(),
  armor_proficiencies: json("armor_proficiencies").$type<string[]>(),
  languages: json("languages").$type<string[]>(),
  equipment_ids: json("equipment_ids").$type<string[]>().default([]),
  gold: int("gold").notNull().default(0),
  equipped_armor_id: char("equipped_armor_id", { length: 36 }),
  equipped_shield_id: char("equipped_shield_id", { length: 36 }),
  equipped_weapon_id: char("equipped_weapon_id", { length: 36 }),
  equipped_off_hand_weapon_id: char("equipped_off_hand_weapon_id", { length: 36 }),
  attuned_item_ids: json("attuned_item_ids").$type<string[]>().default([]),
  equipment_base_selections: json("equipment_base_selections").$type<Record<string, string>>(),
  spell_ids: json("spell_ids").$type<string[]>().default([]),
  feat_ids: json("feat_ids").$type<string[]>().default([]),
  feat_choice_picks: json("feat_choice_picks").$type<Record<string, string[]>>(),
  feature_choice_picks: json("feature_choice_picks").$type<Record<string, string[]>>(),
  modifier_player_picks: json("modifier_player_picks").$type<Record<string, string[]>>(),
  builder_picks: json("builder_picks").$type<
    import("@/lib/builder/builder-picks").CharacterBuilderPicks
  >(),
  companion_state: json("companion_state").$type<
    import("@/lib/character/companion-stat-block").CharacterCompanionState[]
  >(),
  sheet_state: json("sheet_state").$type<
    import("@/lib/character/sheet-play-state").CharacterSheetPlayState
  >(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
})

export const characterClasses = mysqlTable("character_classes", {
  id: id(),
  character_id: char("character_id", { length: 36 }).notNull(),
  class_id: char("class_id", { length: 36 }).notNull(),
  level: int("level").notNull().default(1),
  subclass_id: char("subclass_id", { length: 36 }),
  sort_order: int("sort_order").notNull().default(0),
  created_at: timestamp("created_at").defaultNow().notNull(),
})

export const tableMap = {
  classes,
  subclasses,
  species,
  backgrounds,
  spells,
  feats,
  creatures,
  equipment,
  languages,
  tools,
  class_resources: classResources,
  custom_abilities: customAbilities,
  characters,
} as const

export type TableName = keyof typeof tableMap
