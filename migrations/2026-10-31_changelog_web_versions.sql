-- 2026-10-31: give the web changelog its own version line
-- Run after 2026-10-31_changelog_component.sql.
--
-- Game releases keep `LJ:RP <semver>-<stage>`; portal releases use
-- `UCP <semver>`. Historical portal entries are relabelled 1:1 to the release
-- they shipped with, so dates and ordering stay accurate instead of inventing
-- a `UCP 1.0.0` that never shipped.

UPDATE `server_changelogs`
SET `version` = 'UCP 0.3.0'
WHERE `component` = 'web' AND `version` = 'LJ:RP 0.3.0-Alpha';

UPDATE `server_changelogs`
SET `version` = 'UCP 0.4.0'
WHERE `component` = 'web' AND `version` = 'LJ:RP 0.4.0-Alpha';

SELECT
  `component`,
  `version`,
  COUNT(*) AS entries
FROM `server_changelogs`
GROUP BY `component`, `version`
ORDER BY `component`, `version`;
