-- New characters start with full hunger and thirst.
-- Run once: the repair also refills characters who are legitimately starving.

ALTER TABLE `characters`
    MODIFY `Hunger` FLOAT NOT NULL DEFAULT 100,
    MODIFY `Thirst` INT(11) NOT NULL DEFAULT 100;

UPDATE `characters` SET `Hunger` = 100 WHERE `Hunger` = 0;
