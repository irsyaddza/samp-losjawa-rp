-- Remove NULLs from character columns that are read as integers.
-- Safe to re-run. Run with the game server stopped.

DROP PROCEDURE IF EXISTS `p2_character_not_null`;
DELIMITER $$
CREATE PROCEDURE `p2_character_not_null`()
BEGIN
    UPDATE `characters` SET
        `Tutorial` = IFNULL(`Tutorial`, 0),
        `Model` = IFNULL(`Model`, 264),
        `PhoneTextRingtone` = IFNULL(`PhoneTextRingtone`, 0),
        `PosX` = IFNULL(`PosX`, 0),
        `PosY` = IFNULL(`PosY`, 0),
        `PosZ` = IFNULL(`PosZ`, 0),
        `PosA` = IFNULL(`PosA`, 0),
        `Interior` = IFNULL(`Interior`, 0),
        `World` = IFNULL(`World`, 0),
        `CreateDate` = IFNULL(`CreateDate`, 0),
        `LastLogin` = IFNULL(`LastLogin`, 0),
        `LastIP` = IFNULL(`LastIP`, ''),
        `ChequeCash` = IFNULL(`ChequeCash`, 0),
        `SavingsCollect` = IFNULL(`SavingsCollect`, 0),
        `Attribute` = IFNULL(`Attribute`, ''),
        `Jailed` = IFNULL(`Jailed`, 0),
        `SentenceTime` = IFNULL(`SentenceTime`, 0),
        `CarLic` = IFNULL(`CarLic`, 0),
        `WepLic` = IFNULL(`WepLic`, 0),
        `ADPoint` = IFNULL(`ADPoint`, 0),
        `PackageWeapons` = IFNULL(`PackageWeapons`, ''),
        `PrimaryLicense` = IFNULL(`PrimaryLicense`, 0),
        `SecondaryLicense` = IFNULL(`SecondaryLicense`, 0),
        `CCWLicense` = IFNULL(`CCWLicense`, 0),
        `busJobDelay` = IFNULL(`busJobDelay`, 0),
        `sweeperJobDelay` = IFNULL(`sweeperJobDelay`, 0)
    WHERE
        `Tutorial` IS NULL OR `Model` IS NULL OR `PhoneTextRingtone` IS NULL OR
        `PosX` IS NULL OR `PosY` IS NULL OR `PosZ` IS NULL OR `PosA` IS NULL OR
        `Interior` IS NULL OR `World` IS NULL OR `CreateDate` IS NULL OR
        `LastLogin` IS NULL OR `LastIP` IS NULL OR `ChequeCash` IS NULL OR
        `SavingsCollect` IS NULL OR `Attribute` IS NULL OR `Jailed` IS NULL OR
        `SentenceTime` IS NULL OR `CarLic` IS NULL OR `WepLic` IS NULL OR
        `ADPoint` IS NULL OR `PackageWeapons` IS NULL OR
        `PrimaryLicense` IS NULL OR `SecondaryLicense` IS NULL OR
        `CCWLicense` IS NULL OR `busJobDelay` IS NULL OR `sweeperJobDelay` IS NULL;

    IF EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'characters'
          AND IS_NULLABLE = 'YES'
          AND COLUMN_NAME IN (
              'Tutorial', 'Model', 'PhoneTextRingtone', 'PosX', 'PosY', 'PosZ',
              'PosA', 'Interior', 'World', 'CreateDate', 'LastLogin', 'LastIP',
              'ChequeCash', 'SavingsCollect', 'Attribute', 'Jailed',
              'SentenceTime', 'CarLic', 'WepLic', 'ADPoint', 'PackageWeapons',
              'PrimaryLicense', 'SecondaryLicense', 'CCWLicense',
              'busJobDelay', 'sweeperJobDelay'
          )
    ) THEN
        ALTER TABLE `characters`
            MODIFY `Tutorial` INT(11) NOT NULL DEFAULT 0,
            MODIFY `Model` INT(11) NOT NULL DEFAULT 264,
            MODIFY `PhoneTextRingtone` INT(11) NOT NULL DEFAULT 0,
            MODIFY `PosX` FLOAT NOT NULL DEFAULT 0,
            MODIFY `PosY` FLOAT NOT NULL DEFAULT 0,
            MODIFY `PosZ` FLOAT NOT NULL DEFAULT 0,
            MODIFY `PosA` FLOAT NOT NULL DEFAULT 0,
            MODIFY `Interior` INT(11) NOT NULL DEFAULT 0,
            MODIFY `World` INT(11) NOT NULL DEFAULT 0,
            MODIFY `CreateDate` INT(11) NOT NULL DEFAULT 0,
            MODIFY `LastLogin` INT(11) NOT NULL DEFAULT 0,
            MODIFY `LastIP` VARCHAR(16) NOT NULL DEFAULT '',
            MODIFY `ChequeCash` INT(11) NOT NULL DEFAULT 0,
            MODIFY `SavingsCollect` INT(11) NOT NULL DEFAULT 0,
            MODIFY `Attribute` VARCHAR(500) NOT NULL DEFAULT '',
            MODIFY `Jailed` INT(11) NOT NULL DEFAULT 0,
            MODIFY `SentenceTime` INT(11) NOT NULL DEFAULT 0,
            MODIFY `CarLic` INT(11) NOT NULL DEFAULT 0,
            MODIFY `WepLic` INT(11) NOT NULL DEFAULT 0,
            MODIFY `ADPoint` INT(11) NOT NULL DEFAULT 0,
            MODIFY `PackageWeapons` VARCHAR(255) NOT NULL DEFAULT '',
            MODIFY `PrimaryLicense` INT(11) NOT NULL DEFAULT 0,
            MODIFY `SecondaryLicense` INT(11) NOT NULL DEFAULT 0,
            MODIFY `CCWLicense` INT(11) NOT NULL DEFAULT 0,
            MODIFY `busJobDelay` INT(11) NOT NULL DEFAULT 0,
            MODIFY `sweeperJobDelay` INT(11) NOT NULL DEFAULT 0;
    END IF;
END$$
DELIMITER ;

CALL `p2_character_not_null`();
DROP PROCEDURE IF EXISTS `p2_character_not_null`;
