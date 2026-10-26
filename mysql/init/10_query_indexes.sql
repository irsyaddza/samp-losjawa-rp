-- Indexes for the hot read paths that still use the synchronous MySQL API.
-- Run this once against an existing database; fresh databases get it automatically.

ALTER TABLE `accounts`
  ADD INDEX `Username` (`Username`);

ALTER TABLE `characters`
  ADD INDEX `master` (`master`),
  ADD INDEX `Faction` (`Faction`),
  ADD INDEX `char_name` (`char_name`),
  ADD INDEX `PhoneNumbr` (`PhoneNumbr`);

ALTER TABLE `cars`
  ADD INDEX `carOwner` (`carOwner`),
  ADD INDEX `carPlate` (`carPlate`);

ALTER TABLE `cheques`
  ADD INDEX `owner_ID` (`owner_ID`);

ALTER TABLE `criminal_record`
  ADD INDEX `player_name_idx` (`player_name`, `idx`);

ALTER TABLE `houses`
  ADD INDEX `owner` (`owner`);

ALTER TABLE `fines`
  ADD INDEX `addressee` (`addressee`);

ALTER TABLE `clothing`
  ADD INDEX `owner_slot` (`owner`, `slot`);

ALTER TABLE `logs_ban`
  ADD INDEX `user_id` (`user_id`);

ALTER TABLE `logs_jail`
  ADD INDEX `user_id` (`user_id`);

ALTER TABLE `logs_kick`
  ADD INDEX `user_id` (`user_id`);

ALTER TABLE `business_furnitures`
  ADD INDEX `houseid` (`houseid`);

ALTER TABLE `house_furnitures`
  ADD INDEX `houseid` (`houseid`);

ALTER TABLE `phone_contacts`
  ADD INDEX `contactAdded` (`contactAdded`),
  ADD INDEX `contactAddee` (`contactAddee`);

ALTER TABLE `phone_sms`
  ADD INDEX `PhoneOwner` (`PhoneOwner`),
  ADD INDEX `PhoneReceive` (`PhoneReceive`);

ALTER TABLE `radio_station`
  ADD INDEX `genres_subgenres` (`genres_id`, `subgenres_id`);
