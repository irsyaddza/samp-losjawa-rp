-- Enforce one non-zero phone number per character.
-- Safe to re-run. Run with the game server stopped.

UPDATE `characters` SET `PhoneNumbr` = 0 WHERE `PhoneNumbr` IS NULL;

DROP PROCEDURE IF EXISTS `p2_fix_duplicate_phones`;
DELIMITER $$
CREATE PROCEDURE `p2_fix_duplicate_phones`()
BEGIN
    DECLARE v_total INT DEFAULT 0;
    DECLARE v_i INT DEFAULT 1;
    DECLARE v_id INT;
    DECLARE v_phone INT;
    DECLARE v_tries INT;
    DECLARE v_found INT;

    DROP TEMPORARY TABLE IF EXISTS `p2_phone_dupes`;
    CREATE TEMPORARY TABLE `p2_phone_dupes` (
        `seq` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        `ID` INT NOT NULL,
        UNIQUE KEY `uq_p2_phone_dupes_id` (`ID`)
    );

    INSERT INTO `p2_phone_dupes` (`ID`)
    SELECT c.`ID`
    FROM `characters` c
    JOIN (
        SELECT `PhoneNumbr`, MIN(`ID`) AS keep_id
        FROM `characters`
        WHERE `PhoneNumbr` <> 0
        GROUP BY `PhoneNumbr`
        HAVING COUNT(*) > 1
    ) d ON c.`PhoneNumbr` = d.`PhoneNumbr`
    WHERE c.`ID` <> d.keep_id;

    SET v_total = (SELECT COUNT(*) FROM `p2_phone_dupes`);

    WHILE v_i <= v_total DO
        SELECT `ID` INTO v_id FROM `p2_phone_dupes` WHERE `seq` = v_i;

        SET v_tries = 0;
        SET v_found = 0;
        SET v_phone = 0;

        WHILE v_tries < 100 AND v_found = 0 DO
            SET v_phone = 100000 + FLOOR(RAND() * 900000);
            IF NOT EXISTS (SELECT 1 FROM `characters` WHERE `PhoneNumbr` = v_phone) THEN
                SET v_found = 1;
            ELSE
                SET v_tries = v_tries + 1;
            END IF;
        END WHILE;

        IF v_found = 1 THEN
            UPDATE `characters` SET `PhoneNumbr` = v_phone WHERE `ID` = v_id;
        ELSE
            UPDATE `characters` SET `PhoneNumbr` = 0 WHERE `ID` = v_id;
        END IF;

        SET v_i = v_i + 1;
    END WHILE;

    DROP TEMPORARY TABLE IF EXISTS `p2_phone_dupes`;
END$$
DELIMITER ;

CALL `p2_fix_duplicate_phones`();
DROP PROCEDURE IF EXISTS `p2_fix_duplicate_phones`;

SET @has_phone_unique_col = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'characters'
      AND COLUMN_NAME = 'phone_unique'
);
SET @sql = IF(
    @has_phone_unique_col = 0,
    'ALTER TABLE `characters` ADD COLUMN `phone_unique` INT GENERATED ALWAYS AS (NULLIF(`PhoneNumbr`, 0)) STORED',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_phone_unique_idx = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'characters'
      AND COLUMN_NAME = 'phone_unique'
      AND NON_UNIQUE = 0
);
SET @sql = IF(
    @has_phone_unique_idx = 0,
    'ALTER TABLE `characters` ADD UNIQUE KEY `uq_characters_phone_unique` (`phone_unique`)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
