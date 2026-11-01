-- 2026-11-01: finalise the portal version history and fix a game typo
-- Run after 2026-10-31_changelog_web_versions.sql.
--
-- Portal history:
--   UCP 1.0.0  2026-06-05  website initialised
--   UCP 1.0.1  2026-08-26  public changelog page
--   UCP 1.1.0  2026-10-25  portal release shipped with LJ:RP 0.4.0

UPDATE `server_changelogs`
SET `version` = 'LJ:RP 0.1.0-Alpha'
WHERE `version` = 'LJ:RP 0.1.0-Apha';

UPDATE `server_changelogs`
SET `version` = 'UCP 1.0.1'
WHERE `component` = 'web' AND `version` = 'UCP 0.3.0';

UPDATE `server_changelogs`
SET `version` = 'UCP 1.1.0'
WHERE `component` = 'web' AND `version` = 'UCP 0.4.0';

INSERT INTO `server_changelogs`
  (`entry`, `added_by`, `version`, `component`, `added_date`, `created_at`)
SELECT 'Initialize', 'Shikimura04', 'UCP 1.0.0', 'web', '05/06/2026', '2026-06-05 00:00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM `server_changelogs` WHERE `component` = 'web' AND `version` = 'UCP 1.0.0'
);

SELECT
  `component`,
  `version`,
  COUNT(*) AS entries,
  MAX(`created_at`) AS last_entry
FROM `server_changelogs`
GROUP BY `component`, `version`
ORDER BY `component`, `version`;
