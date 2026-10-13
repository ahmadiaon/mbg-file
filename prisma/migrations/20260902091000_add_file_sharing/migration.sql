ALTER TABLE `files`
  ADD COLUMN `share_token` VARCHAR(191) NULL,
  ADD COLUMN `share_enabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `share_expires_at` DATETIME(3) NULL,
  ADD UNIQUE INDEX `files_share_token_key`(`share_token`);
