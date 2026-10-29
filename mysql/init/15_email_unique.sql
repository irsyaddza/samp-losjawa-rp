-- Enforce one non-empty recovery email per account.
-- Safe to re-run. Run with the web container stopped.

-- Normalize whitespace before the unique index treats values as distinct.
UPDATE `accounts`
SET `Email` = TRIM(`Email`)
WHERE `Email` IS NOT NULL AND `Email` <> TRIM(`Email`);

-- Normalize legacy placeholders so MySQL allows multiple NULL rows.
UPDATE `accounts`
SET `Email` = NULL
WHERE `Email` IS NOT NULL
  AND (TRIM(`Email`) = '' OR LOWER(TRIM(`Email`)) IN ('none', 'n/a'));

-- Preflight: this must return no rows before the unique index can be added.
SELECT `Email`, COUNT(*) AS `total`
FROM `accounts`
WHERE `Email` IS NOT NULL AND TRIM(`Email`) <> ''
GROUP BY `Email`
HAVING COUNT(*) > 1;

SET @has_email_unique_idx = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'accounts'
      AND COLUMN_NAME = 'Email'
      AND NON_UNIQUE = 0
);
SET @sql = IF(
    @has_email_unique_idx = 0,
    'ALTER TABLE `accounts` ADD UNIQUE KEY `uq_accounts_email` (`Email`)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
