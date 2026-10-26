-- Give every character a unique phone number.
-- Safe to re-run. Run after 11_phone_unique.sql with the game server stopped.

UPDATE `characters` SET `PhoneNumbr` = 0 WHERE `PhoneNumbr` IS NULL;

DROP PROCEDURE IF EXISTS `p3_backfill_phones`;
DELIMITER $$
CREATE PROCEDURE `p3_backfill_phones`()
BEGIN
    DECLARE v_total INT DEFAULT 0;
    DECLARE v_i INT DEFAULT 1;
    DECLARE v_id INT;
    DECLARE v_phone INT;
    DECLARE v_found INT;

    DROP TEMPORARY TABLE IF EXISTS `p3_zero_phones`;
    CREATE TEMPORARY TABLE `p3_zero_phones` (
        `seq` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        `ID` INT NOT NULL,
        UNIQUE KEY `uq_p3_zero_phones_id` (`ID`)
    );

    INSERT INTO `p3_zero_phones` (`ID`)
    SELECT `ID` FROM `characters` WHERE `PhoneNumbr` = 0;

    SET v_total = (SELECT COUNT(*) FROM `p3_zero_phones`);

    WHILE v_i <= v_total DO
        SELECT `ID` INTO v_id FROM `p3_zero_phones` WHERE `seq` = v_i;

        SET v_found = 0;
        SET v_phone = 100000;

        WHILE v_found = 0 AND v_phone <= 999999 DO
            IF NOT EXISTS (SELECT 1 FROM `characters` WHERE `PhoneNumbr` = v_phone) THEN
                SET v_found = 1;
            ELSE
                SET v_phone = v_phone + 1;
            END IF;
        END WHILE;

        IF v_found = 1 THEN
            UPDATE `characters` SET `PhoneNumbr` = v_phone WHERE `ID` = v_id;
        END IF;

        SET v_i = v_i + 1;
    END WHILE;

    DROP TEMPORARY TABLE IF EXISTS `p3_zero_phones`;
END$$
DELIMITER ;

CALL `p3_backfill_phones`();
DROP PROCEDURE IF EXISTS `p3_backfill_phones`;

SELECT COUNT(*) AS zero_phone_count FROM `characters` WHERE `PhoneNumbr` = 0;
