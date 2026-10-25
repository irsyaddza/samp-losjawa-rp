-- Session revocation and richer login history.
-- Run this once against an existing database before deploying the web update.

ALTER TABLE `accounts`
  ADD COLUMN `SessionVersion` int(11) NOT NULL DEFAULT 0;

ALTER TABLE `ucp_logins`
  MODIFY `IP` varchar(45) NOT NULL,
  MODIFY `Browser` varchar(32) NOT NULL,
  MODIFY `OS` varchar(32) NOT NULL,
  ADD KEY `User_Date` (`User`, `Date`);
