/**
 * Incremental schema updates for databases created before a column was added to mysql/schema.sql.
 * Applied automatically before /api/seed and via `pnpm db:migrate`.
 *
 * Uses SHOW COLUMNS for existence checks (works on shared hosts where information_schema
 * may be restricted for the app database user).
 */
export const SCHEMA_MIGRATIONS = [
  {
    name: "species.creature_type",
    check: `SHOW COLUMNS FROM species LIKE 'creature_type'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE species ADD COLUMN creature_type VARCHAR(64) DEFAULT 'Humanoid' AFTER size`,
  },
  {
    name: "feats.prerequisite_content_ids",
    check: `SHOW COLUMNS FROM feats LIKE 'prerequisite_class_ids'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE feats
      ADD COLUMN prerequisite_class_ids JSON AFTER prerequisite_feat_ids,
      ADD COLUMN prerequisite_species_ids JSON AFTER prerequisite_class_ids,
      ADD COLUMN prerequisite_background_ids JSON AFTER prerequisite_species_ids`,
  },
  {
    name: "custom_abilities.attached_to_id_varchar",
    check: `SHOW COLUMNS FROM custom_abilities LIKE 'attached_to_id'`,
    alreadyApplied: (rows) => {
      if (!rows.length) return false
      const type = String(/** @type {{ Type?: string }} */ (rows[0]).Type ?? "").toLowerCase()
      const match = type.match(/varchar\((\d+)\)/)
      return match ? Number(match[1]) >= 128 : type.includes("varchar")
    },
    apply: `ALTER TABLE custom_abilities MODIFY COLUMN attached_to_id VARCHAR(128)`,
  },
  {
    name: "custom_abilities.characteristics",
    check: `SHOW COLUMNS FROM custom_abilities LIKE 'characteristics'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE custom_abilities ADD COLUMN characteristics JSON AFTER description`,
  },
  {
    name: "species.characteristics",
    check: `SHOW COLUMNS FROM species LIKE 'characteristics'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE species ADD COLUMN characteristics JSON AFTER traits`,
  },
  {
    name: "characters.portrait_url_mediumtext",
    check: `SHOW COLUMNS FROM characters LIKE 'portrait_url'`,
    alreadyApplied: (rows) => {
      if (!rows.length) return false
      const type = String(/** @type {{ Type?: string }} */ (rows[0]).Type ?? "").toLowerCase()
      return type.includes("text")
    },
    apply: `ALTER TABLE characters MODIFY COLUMN portrait_url MEDIUMTEXT`,
  },
  {
    name: "characters.banner_url",
    check: `SHOW COLUMNS FROM characters LIKE 'banner_url'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE characters ADD COLUMN banner_url MEDIUMTEXT AFTER portrait_url`,
  },
  {
    name: "characters.asi_allocations",
    check: `SHOW COLUMNS FROM characters LIKE 'asi_allocations'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE characters ADD COLUMN asi_allocations JSON AFTER feat_ids`,
  },
  {
    name: "characters.skill_expertise",
    check: `SHOW COLUMNS FROM characters LIKE 'skill_expertise'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE characters ADD COLUMN skill_expertise JSON AFTER skill_proficiencies`,
  },
  {
    name: "subclasses.icon",
    check: `SHOW COLUMNS FROM subclasses LIKE 'icon'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE subclasses ADD COLUMN icon VARCHAR(255) AFTER spellcasting`,
  },
  {
    name: "backgrounds.icon",
    check: `SHOW COLUMNS FROM backgrounds LIKE 'icon'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE backgrounds ADD COLUMN icon VARCHAR(255) AFTER feature`,
  },
  {
    name: "spells.icon",
    check: `SHOW COLUMNS FROM spells LIKE 'icon'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE spells ADD COLUMN icon VARCHAR(255) AFTER classes`,
  },
  {
    name: "feats.icon",
    check: `SHOW COLUMNS FROM feats LIKE 'icon'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE feats ADD COLUMN icon VARCHAR(255) AFTER benefits`,
  },
  {
    name: "equipment.icon",
    check: `SHOW COLUMNS FROM equipment LIKE 'icon'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE equipment ADD COLUMN icon VARCHAR(255) AFTER description`,
  },
  {
    name: "custom_abilities.icon",
    check: `SHOW COLUMNS FROM custom_abilities LIKE 'icon'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE custom_abilities ADD COLUMN icon VARCHAR(255) AFTER show_in_builder`,
  },
  {
    name: "feats.repeatable",
    check: `SHOW COLUMNS FROM feats LIKE 'repeatable'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE feats ADD COLUMN repeatable TINYINT(1) NOT NULL DEFAULT 0 AFTER benefits`,
  },
  {
    name: "backgrounds.proficiencies",
    check: `SHOW COLUMNS FROM backgrounds LIKE 'proficiencies'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE backgrounds ADD COLUMN proficiencies JSON AFTER tool_proficiencies`,
  },
  {
    name: "characters.weapon_armor_proficiencies",
    check: `SHOW COLUMNS FROM characters LIKE 'weapon_proficiencies'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE characters
      ADD COLUMN weapon_proficiencies JSON AFTER tool_proficiencies,
      ADD COLUMN armor_proficiencies JSON AFTER weapon_proficiencies`,
  },
  {
    name: "classes.class_resources",
    check: `SHOW COLUMNS FROM classes LIKE 'class_resources'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE classes ADD COLUMN class_resources JSON AFTER features`,
  },
  {
    name: "class_resources.table",
    check: `SHOW TABLES LIKE 'class_resources'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `CREATE TABLE class_resources (
      id CHAR(36) PRIMARY KEY,
      class_id CHAR(36) NOT NULL,
      resource_key VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      uses JSON NOT NULL,
      icon VARCHAR(255),
      source VARCHAR(64) NOT NULL DEFAULT 'Custom',
      creator_url VARCHAR(512),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY class_resource_key (class_id, resource_key),
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  },
  {
    name: "backgrounds.grants_spells",
    check: `SHOW COLUMNS FROM backgrounds LIKE 'grants_spells'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE backgrounds
      ADD COLUMN grants_spells TINYINT(1) NOT NULL DEFAULT 0 AFTER feature,
      ADD COLUMN granted_spells JSON AFTER grants_spells`,
  },
  ...[
    "classes",
    "subclasses",
    "species",
    "backgrounds",
    "spells",
    "feats",
    "equipment",
    "class_resources",
    "custom_abilities",
  ].map((table) => ({
    name: `${table}.enabled`,
    check: `SHOW COLUMNS FROM ${table} LIKE 'enabled'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE ${table} ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER creator_url`,
  })),
  {
    name: "custom_abilities.is_system",
    check: `SHOW COLUMNS FROM custom_abilities LIKE 'is_system'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE custom_abilities ADD COLUMN is_system TINYINT(1) NOT NULL DEFAULT 0 AFTER show_in_builder`,
  },
  {
    name: "custom_abilities.modifier_refs",
    check: `SHOW COLUMNS FROM custom_abilities LIKE 'modifier_refs'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE custom_abilities ADD COLUMN modifier_refs JSON AFTER characteristics`,
  },
  {
    name: "custom_abilities.modifier_catalog",
    check: `SHOW COLUMNS FROM custom_abilities LIKE 'modifier_catalog'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE custom_abilities ADD COLUMN modifier_catalog JSON AFTER characteristics`,
  },
  {
    name: "feats.modifier_refs",
    check: `SHOW COLUMNS FROM feats LIKE 'modifier_refs'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE feats ADD COLUMN modifier_refs JSON AFTER benefits`,
  },
  {
    name: "species.modifier_refs",
    check: `SHOW COLUMNS FROM species LIKE 'modifier_refs'`,
    alreadyApplied: (rows) => rows.length > 0,
    apply: `ALTER TABLE species ADD COLUMN modifier_refs JSON AFTER characteristics`,
  },
]
