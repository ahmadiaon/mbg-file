ALTER TABLE `folders` ADD COLUMN `parent_id` INTEGER NULL;

ALTER TABLE `folders`
  ADD CONSTRAINT `folders_parent_id_fkey`
  FOREIGN KEY (`parent_id`) REFERENCES `folders`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
