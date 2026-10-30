-- 2026-10-29: UCP mailbox
-- Run once against the existing database before deploying the new web image.
-- Fresh installs get the same schema from mysql/init/16_ucp_mailbox.sql.
-- Legacy `notifications` rows are intentionally not migrated.

CREATE TABLE IF NOT EXISTS `ucp_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sender_id` int(11) NOT NULL,
  `sender_username` varchar(24) NOT NULL,
  `recipient_id` int(11) NOT NULL,
  `recipient_username` varchar(24) NOT NULL,
  `subject` varchar(120) NOT NULL,
  `body` text NOT NULL,
  `body_text` text NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ucp_message_states` (
  `message_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `mailbox` enum('inbox','sent') NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`message_id`,`account_id`),
  KEY `account_mailbox_read` (`account_id`,`mailbox`,`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tables created by the earlier mailbox MVP did not have body_text.
SET @has_body_text = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ucp_messages'
    AND COLUMN_NAME = 'body_text'
);
SET @add_body_text = IF(
  @has_body_text = 0,
  'ALTER TABLE `ucp_messages` ADD COLUMN `body_text` text NULL AFTER `body`',
  'SELECT 1'
);
PREPARE mailbox_stmt FROM @add_body_text;
EXECUTE mailbox_stmt;
DEALLOCATE PREPARE mailbox_stmt;
