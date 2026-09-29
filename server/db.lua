-- Tablolar (yoksa olustur). sql/install.sql ile ayni.
DB = {}

CreateThread(function()
    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS `loe_vd_designs` (
            `id` VARCHAR(12) NOT NULL,
            `citizenid` VARCHAR(64) NOT NULL,
            `designer` VARCHAR(100) NOT NULL DEFAULT '',
            `model` VARCHAR(60) NOT NULL,
            `label` VARCHAR(64) NOT NULL,
            `image` LONGTEXT NOT NULL,
            `thumb` MEDIUMTEXT NULL,
            `paint` VARCHAR(255) NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            INDEX `idx_citizen` (`citizenid`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ]])
    MySQL.query.await([[
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ]])
    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS `loe_vd_vehicles` (
            `plate` VARCHAR(16) NOT NULL,
            `design_id` VARCHAR(12) NOT NULL,
            `model` VARCHAR(60) NOT NULL,
            `citizenid` VARCHAR(64) NULL,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`plate`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ]])
    -- v1.2: magaza sutunlari (eski kurulumlarda yoksa ekle)
    local function ensureColumn(tbl, col, ddl)
        local has = MySQL.scalar.await(
            'SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            { tbl, col })
        if (tonumber(has) or 0) == 0 then MySQL.query.await(('ALTER TABLE `%s` ADD COLUMN %s'):format(tbl, ddl)) end
    end
    ensureColumn('loe_vd_designs', 'published', '`published` TINYINT(1) NOT NULL DEFAULT 0')
    ensureColumn('loe_vd_designs', 'price', '`price` INT UNSIGNED NOT NULL DEFAULT 0')
    ensureColumn('loe_vd_designs', 'sales', '`sales` INT UNSIGNED NOT NULL DEFAULT 0')
    DB.ready = true
    TriggerEvent('loe_vd:server:dbReady')
end)

function DB.waitReady()
    local t = 0
    while not DB.ready and t < 200 do
        Wait(100)
        t = t + 1
    end
end
