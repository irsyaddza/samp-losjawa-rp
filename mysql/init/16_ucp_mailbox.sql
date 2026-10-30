-- UCP mailbox: one-to-one messages between UCP accounts.
-- The legacy `notifications` table is intentionally left untouched and is not migrated.

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
