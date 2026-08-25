-- 2026-08-26: Gas station fuel fill location
-- Adds a dedicated pump point for gas stations (bType 1) so /fill
-- no longer depends on the entrance coordinates.
-- Run once against the server database BEFORE deploying the new amx.
-- Existing stations keep working: empty fill coords fall back to entrance.

ALTER TABLE `business`
  ADD COLUMN `biz_fillX` FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN `biz_fillY` FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN `biz_fillZ` FLOAT NOT NULL DEFAULT 0;
