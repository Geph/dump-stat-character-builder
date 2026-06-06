-- Dump Stat — MySQL schema for Dreamhost VPS
-- Run in phpMyAdmin or: mysql -u USER -p DATABASE < mysql/schema.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS classes (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  hit_die INT NOT NULL DEFAULT 8,
  primary_ability JSON,
  saving_throws JSON,
  armor_proficiencies JSON,
  weapon_proficiencies JSON,
  skill_choices JSON,
  starting_equipment JSON,
  starting_equipment_groups JSON,
  starting_gold INT DEFAULT 0,
  features JSON,
  class_resources JSON,
  spellcasting JSON,
  icon VARCHAR(255),
  source VARCHAR(64) NOT NULL DEFAULT 'Custom',
  creator_url VARCHAR(512),
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subclasses (
  id CHAR(36) PRIMARY KEY,
  class_id CHAR(36),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  features JSON,
  spellcasting JSON,
  icon VARCHAR(255),
  source VARCHAR(64) NOT NULL DEFAULT 'Custom',
  creator_url VARCHAR(512),
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS species (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  speed JSON,
  size VARCHAR(32),
  creature_type VARCHAR(64) DEFAULT 'Humanoid',
  traits JSON,
  characteristics JSON,
  icon VARCHAR(255),
  source VARCHAR(64) NOT NULL DEFAULT 'Custom',
  creator_url VARCHAR(512),
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS backgrounds (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  ability_bonuses JSON,
  skill_proficiencies JSON,
  tool_proficiencies JSON,
  proficiencies JSON,
  feat_granted VARCHAR(255),
  starting_gold INT,
  starting_equipment JSON,
  equipment JSON,
  feature JSON,
  grants_spells TINYINT(1) NOT NULL DEFAULT 0,
  granted_spells JSON,
  icon VARCHAR(255),
  source VARCHAR(64) NOT NULL DEFAULT 'Custom',
  creator_url VARCHAR(512),
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS spells (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  level INT NOT NULL DEFAULT 0,
  school VARCHAR(64) NOT NULL,
  casting_time VARCHAR(128),
  `range` VARCHAR(128),
  components JSON,
  material TEXT,
  duration VARCHAR(128),
  concentration TINYINT(1) NOT NULL DEFAULT 0,
  ritual TINYINT(1) NOT NULL DEFAULT 0,
  description TEXT,
  higher_levels TEXT,
  classes JSON,
  icon VARCHAR(255),
  source VARCHAR(64) NOT NULL DEFAULT 'Custom',
  creator_url VARCHAR(512),
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS feats (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(64),
  level_requirement INT,
  prerequisite TEXT,
  prerequisite_feat_ids JSON,
  prerequisite_class_ids JSON,
  prerequisite_species_ids JSON,
  prerequisite_background_ids JSON,
  benefits JSON,
  repeatable TINYINT(1) NOT NULL DEFAULT 0,
  icon VARCHAR(255),
  source VARCHAR(64) NOT NULL DEFAULT 'Custom',
  creator_url VARCHAR(512),
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS equipment (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(128) NOT NULL,
  subcategory VARCHAR(128),
  cost JSON,
  weight DECIMAL(10,2),
  properties JSON,
  description TEXT,
  icon VARCHAR(255),
  source VARCHAR(64) NOT NULL DEFAULT 'Custom',
  creator_url VARCHAR(512),
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS class_resources (
  id CHAR(36) PRIMARY KEY,
  class_id CHAR(36) NOT NULL,
  resource_key VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  uses JSON NOT NULL,
  icon VARCHAR(255),
  source VARCHAR(64) NOT NULL DEFAULT 'Custom',
  creator_url VARCHAR(512),
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY class_resource_key (class_id, resource_key),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS custom_abilities (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  characteristics JSON,
  prerequisites TEXT,
  attached_to_type VARCHAR(64),
  attached_to_id VARCHAR(128),
  uses JSON,
  show_in_builder TINYINT(1) NOT NULL DEFAULT 1,
  icon VARCHAR(255),
  source VARCHAR(64) NOT NULL DEFAULT 'Custom',
  creator_url VARCHAR(512),
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS characters (
  id CHAR(36) PRIMARY KEY,
  local_id VARCHAR(64),
  name VARCHAR(255) NOT NULL DEFAULT 'Unnamed',
  level INT NOT NULL DEFAULT 1,
  experience INT NOT NULL DEFAULT 0,
  class_id CHAR(36),
  subclass_id CHAR(36),
  species_id CHAR(36),
  background_id CHAR(36),
  strength INT NOT NULL DEFAULT 10,
  dexterity INT NOT NULL DEFAULT 10,
  constitution INT NOT NULL DEFAULT 10,
  intelligence INT NOT NULL DEFAULT 10,
  wisdom INT NOT NULL DEFAULT 10,
  charisma INT NOT NULL DEFAULT 10,
  alignment VARCHAR(64),
  personality_traits TEXT,
  ideals TEXT,
  bonds TEXT,
  flaws TEXT,
  backstory TEXT,
  appearance JSON,
  portrait_url MEDIUMTEXT,
  banner_url MEDIUMTEXT,
  proficiency_bonus INT NOT NULL DEFAULT 2,
  hit_points INT,
  hit_point_max INT,
  armor_class INT,
  initiative INT,
  speed INT,
  skill_proficiencies JSON,
  skill_expertise JSON,
  tool_proficiencies JSON,
  weapon_proficiencies JSON,
  armor_proficiencies JSON,
  languages JSON,
  equipment_ids JSON,
  spell_ids JSON,
  feat_ids JSON,
  asi_allocations JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (subclass_id) REFERENCES subclasses(id) ON DELETE SET NULL,
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE SET NULL,
  FOREIGN KEY (background_id) REFERENCES backgrounds(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
