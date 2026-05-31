/**
 * Incremental schema updates for databases created before a column was added to mysql/schema.sql.
 * Applied automatically before /api/seed and via `pnpm db:migrate`.
 */
export const SCHEMA_MIGRATIONS = [
  {
    name: "species.creature_type",
    check: `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'species' AND COLUMN_NAME = 'creature_type'`,
    apply: `ALTER TABLE species ADD COLUMN creature_type VARCHAR(64) DEFAULT 'Humanoid' AFTER size`,
  },
  {
    name: "feats.prerequisite_content_ids",
    check: `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'feats' AND COLUMN_NAME = 'prerequisite_class_ids'`,
    apply: `ALTER TABLE feats
      ADD COLUMN prerequisite_class_ids JSON AFTER prerequisite_feat_ids,
      ADD COLUMN prerequisite_species_ids JSON AFTER prerequisite_class_ids,
      ADD COLUMN prerequisite_background_ids JSON AFTER prerequisite_species_ids`,
  },
  {
    name: "custom_abilities.attached_to_id_varchar",
    check: `SELECT CHARACTER_MAXIMUM_LENGTH AS len FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_abilities' AND COLUMN_NAME = 'attached_to_id'`,
    apply: `ALTER TABLE custom_abilities MODIFY COLUMN attached_to_id VARCHAR(128)`,
    alreadyApplied: (row) => Number(row.len ?? 0) >= 128,
  },
  {
    name: "custom_abilities.characteristics",
    check: `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_abilities' AND COLUMN_NAME = 'characteristics'`,
    apply: `ALTER TABLE custom_abilities ADD COLUMN characteristics JSON AFTER description`,
  },
  {
    name: "species.characteristics",
    check: `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'species' AND COLUMN_NAME = 'characteristics'`,
    apply: `ALTER TABLE species ADD COLUMN characteristics JSON AFTER traits`,
  },
]
