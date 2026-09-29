--[[
    ox_inventory (bitirim_inventory) -> data/items.lua dosyasina EKLE.
    Ikonlar: install/ox_inventory/web/images/*.png -> ox_inventory/web/images/ klasorune kopyala.
    Not: client.export oldugu icin ox item'i kendiliginden tuketmez; tuketimi sunucu
    dogrulamadan sonra loe_vehicledesign yapar (Config.Fit.consumeItem).
]]

['loe_livery'] = {
    label = 'Araç Kaplaması',
    weight = 300,
    stack = false,
    close = true,
    description = 'Tasarım stüdyosunda basılmış, modele kilitli kaplama. Aracın yanında kullan.',
    client = {
        export = 'loe_vehicledesign.useLivery',
    },
},

['loe_livery_remover'] = {
    label = 'Kaplama Sökücü',
    weight = 500,
    stack = true,
    close = true,
    description = 'Araçtaki özel kaplamayı söker.',
    client = {
        export = 'loe_vehicledesign.useRemover',
    },
},
