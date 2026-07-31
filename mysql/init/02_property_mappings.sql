CREATE TABLE IF NOT EXISTS `property_mappings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ucp_name` varchar(32) NOT NULL,
  `property_type` int(11) NOT NULL DEFAULT '1', -- 1 = House, 2 = Biz, 3 = Apartment
  `property_id` int(11) NOT NULL,
  `mapping_code` longtext NOT NULL,
  `status` int(11) NOT NULL DEFAULT '0', -- 0 = PENDING, 1 = APPROVED, 2 = REJECTED
  `admin_note` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
