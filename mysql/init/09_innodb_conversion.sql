-- Convert legacy MyISAM tables to InnoDB.
-- Run this once during a maintenance window; it locks each table while rebuilding.
-- Fresh databases get this automatically after 08.

ALTER TABLE `accounts` ENGINE=InnoDB;
ALTER TABLE `ateles` ENGINE=InnoDB;
ALTER TABLE `bans` ENGINE=InnoDB;
ALTER TABLE `business_furnitures` ENGINE=InnoDB;
ALTER TABLE `cars` ENGINE=InnoDB;
ALTER TABLE `characters` ENGINE=InnoDB;
ALTER TABLE `cheques` ENGINE=InnoDB;
ALTER TABLE `clothing` ENGINE=InnoDB;
ALTER TABLE `factions` ENGINE=InnoDB;
ALTER TABLE `fines` ENGINE=InnoDB;
ALTER TABLE `gates` ENGINE=InnoDB;
ALTER TABLE `houses` ENGINE=InnoDB;
ALTER TABLE `house_furnitures` ENGINE=InnoDB;
ALTER TABLE `logs_ban` ENGINE=InnoDB;
ALTER TABLE `logs_connection` ENGINE=InnoDB;
ALTER TABLE `logs_jail` ENGINE=InnoDB;
ALTER TABLE `logs_kick` ENGINE=InnoDB;
ALTER TABLE `movedoors` ENGINE=InnoDB;
ALTER TABLE `phone_contacts` ENGINE=InnoDB;
ALTER TABLE `phone_sms` ENGINE=InnoDB;
ALTER TABLE `radio` ENGINE=InnoDB;
ALTER TABLE `vehicles` ENGINE=InnoDB;
ALTER TABLE `weapon` ENGINE=InnoDB;
