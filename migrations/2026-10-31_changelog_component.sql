-- 2026-10-31: changelog component split
-- Run once against an existing database before deploying the new web image and
-- the recompiled gamemode.
--
-- `component` separates game releases from portal releases while both keep
-- sharing one product version, because a single commit deploys both images.
--
-- Existing rows default to 'game'. Entries that describe portal work are
-- backfilled to 'web' by id below; later entries are classified in the admin
-- changelog manager.

SET @has_component = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'server_changelogs'
    AND COLUMN_NAME = 'component'
);

SET @sql = IF(@has_component = 0,
  'ALTER TABLE `server_changelogs` ADD COLUMN `component` ENUM(''game'',''web'') NOT NULL DEFAULT ''game'' AFTER `version`',
  'DO 0');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill portal entries published before the component column existed.
-- #78 stays 'game': the trigger is an in-game ban or unban.
UPDATE `server_changelogs` SET `component` = 'web' WHERE `id` IN (
  36,
  49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62,
  63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77,
  79, 80, 81, 82, 83, 84, 85
);

-- Verification: the backfill cannot fail loudly when an id is missing, so this
-- reports the result instead. A portal count below 37 means the id list did not
-- match this database; review it before deploying the new images.
SELECT
  COUNT(*) AS total_entries,
  SUM(`component` = 'web') AS portal_entries,
  SUM(`component` = 'game') AS game_entries,
  IF(SUM(`component` = 'web') >= 37,
     'OK: portal backfill applied',
     'WARNING: fewer than 37 portal entries; review the id list against this database') AS migration_check
FROM `server_changelogs`;

