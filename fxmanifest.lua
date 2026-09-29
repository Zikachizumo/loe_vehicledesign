fx_version 'cerulean'
game 'gta5'
lua54 'yes'
use_experimental_fxv2_oal 'yes'

name 'loe_vehicledesign'
author 'Legends of Empire RP'
description 'LoE Arac Tasarim Studyosu - oyun ici 3D kaplama (livery) editoru'
version '1.2.0'
repository 'https://github.com/Zikachizumo/loe_vehicledesign'

dependencies {
    '/server:7290',
    '/onesync',
    'ox_lib',
    'oxmysql',
    'ox_inventory',
}

shared_scripts {
    '@ox_lib/init.lua',
    'config/shared.lua',
    'config/vehicles.lua',
}

client_scripts {
    'client/transfer.lua',
    'client/textures.lua',
    'client/scanner.lua',
    'client/preview.lua',
    'client/studio.lua',
    'client/fit.lua',
    'client/api.lua',
    'client/shop.lua',
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'config/server.lua',
    'server/bridge.lua',
    'server/db.lua',
    'server/transfer.lua',
    'server/slots.lua',
    'server/catalog.lua',
    'server/designs.lua',
    'server/fit.lua',
    'server/shop.lua',
    'server/remote.lua',
    'server/main.lua',
}

ui_page 'web/build/index.html'

files {
    'web/build/index.html',
    'web/build/assets/*',
    'dui/index.html',
    'assets/**/*',
}
