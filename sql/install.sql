-- LoE Arac Tasarim Studyosu tablolari.
-- Kaynak acilista bunlari otomatik olusturur; elle kurmak istersen bu dosyayi calistir.

CREATE TABLE IF NOT EXISTS `loe_vd_designs` (
    `id` VARCHAR(12) NOT NULL,
    `citizenid` VARCHAR(64) NOT NULL,
    `designer` VARCHAR(100) NOT NULL DEFAULT '',
    `model` VARCHAR(60) NOT NULL,
    `label` VARCHAR(64) NOT NULL,
    `image` LONGTEXT NOT NULL,
    `thumb` MEDIUMTEXT NULL,
    `paint` VARCHAR(255) NULL,
    `published` TINYINT(1) NOT NULL DEFAULT 0,
    `price` INT UNSIGNED NOT NULL DEFAULT 0,
    `sales` INT UNSIGNED NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_citizen` (`citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `loe_vd_projects` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `citizenid` VARCHAR(64) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `model` VARCHAR(60) NOT NULL,
    `data` LONGTEXT NOT NULL,
    `thumb` MEDIUMTEXT NULL,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_citizen` (`citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `loe_vd_vehicles` (
    `plate` VARCHAR(16) NOT NULL,
    `design_id` VARCHAR(12) NOT NULL,
    `model` VARCHAR(60) NOT NULL,
    `citizenid` VARCHAR(64) NULL,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`plate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
