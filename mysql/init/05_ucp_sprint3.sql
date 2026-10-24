-- Sprint 3: ban appeals. One appeal per ban record, with a snapshot of the ban
-- so the appeal remains readable after the ban row is removed.

CREATE TABLE IF NOT EXISTS `ucp_ban_appeals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ban_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `username` varchar(32) NOT NULL,
  `ban_reason` varchar(100) DEFAULT NULL,
  `ban_bannedby` varchar(24) DEFAULT NULL,
  `ban_player_ip` varchar(100) DEFAULT NULL,
  `ban_perm` tinyint(1) NOT NULL DEFAULT '0',
  `ban_expire` datetime DEFAULT NULL,
  `ban_created_at` datetime DEFAULT NULL,
  `ban_source` varchar(16) NOT NULL DEFAULT 'game',
  `message` text NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'open',
  `admin_id` int(11) DEFAULT NULL,
  `admin_username` varchar(32) DEFAULT NULL,
  `response` text,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ban_id` (`ban_id`),
  KEY `account_id` (`account_id`),
  KEY `status` (`status`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
