-- Sprint 2: moderation center. Track whether a ban was created from the UCP or in-game.
SET @has_source := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'bans'
    AND column_name = 'source'
);

SET @sql := IF(
  @has_source = 0,
  'ALTER TABLE `bans` ADD COLUMN `source` varchar(16) NOT NULL DEFAULT ''game'' AFTER `serial`',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
