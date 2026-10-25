-- UCP rate limits for authentication and other sensitive actions.
-- Run this once against an existing database before deploying the web update.

CREATE TABLE IF NOT EXISTS `ucp_rate_limits` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bucket` char(64) NOT NULL,
  `action` varchar(32) NOT NULL,
  `window_start` int unsigned NOT NULL,
  `count` int unsigned NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bucket_action_window` (`bucket`, `action`, `window_start`),
  KEY `window_start` (`window_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
