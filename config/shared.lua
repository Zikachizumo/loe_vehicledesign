--[[
    LoE Arac Tasarim Studyosu - GENEL AYARLAR (client + server gorur)
    Sunucuya ozel gizli ayarlar (API anahtari vb.) config/server.lua + convar'dadir.
]]

Config = {}

Config.Debug = false

-- Marka / tema (NUI)
Config.Brand = {
    name = 'Legends of Empire',
    short = 'LoE RP',
    tagline = 'ARAÇ TASARIM STÜDYOSU',
}
-- 'empire' (altin) | 'crimson' | 'magenta' | 'emerald' | 'ice'
Config.Theme = 'empire'

-- ox_inventory item adlari (install/ox_inventory/items.lua dosyasindaki tanimlarla ayni olmali)
Config.Items = {
    livery = 'loe_livery',
    remover = 'loe_livery_remover',
}

-- Basma (Print) ucreti. price = 0 -> ucretsiz.
Config.Print = {
    price = 0,
    accounts = { 'bank', 'cash' }, -- sirayla denenir
    currency = '$',
    itemThumbnail = true, -- envanter ikonunda kaplamanin kucuk onizlemesi (metadata.imageurl)
    thumbSize = 96,
}

-- Kaplamayi takma (Fit)
Config.Fit = {
    distance = 3.5, -- araca en fazla bu kadar yakin olmali (m)
    duration = 7000, -- ms
    consumeItem = true, -- takinca item tukensin mi
    onlyOwnVehicles = false, -- true: sadece kendi (player_vehicles) aracina takabilir
    persistOwned = true, -- kayitli (player_vehicles) araclarda plakaya kalici kaydet
    anim = { scenario = 'WORLD_HUMAN_MAID_CLEAN' },
}

-- Sokme (Remover item)
Config.Remove = {
    distance = 3.5,
    duration = 5000,
    consumeItem = true,
    onlyOwnVehicles = false,
    anim = { scenario = 'PROP_HUMAN_BUM_BIN' },
}

-- Sinirlar
Config.Limits = {
    maxLayers = 80,
    maxProjectBytes = 12 * 1024 * 1024, -- kayitli proje JSON (katmanlar dahil)
    maxImageBytes = 6 * 1024 * 1024, -- basilan kaplama gorseli (webp dataURL)
    maxImportBytes = 8 * 1024 * 1024, -- URL'den ice aktarilan gorsel
    maxProjectsPerPlayer = 25,
    maxTextLength = 48,
    labelLength = 40,
}

-- Studyo konumlari. jobs = nil -> herkes; { mechanic = 0 } -> sadece o meslek (min rutbe).
Config.Studios = {
    {
        label = 'Araç Tasarım Stüdyosu',
        coords = vec3(-211.55, -1324.55, 30.9), -- Benny's
        radius = 2.5,
        jobs = nil,
        blip = { sprite = 72, color = 46, scale = 0.75, label = 'LoE Tasarım Stüdyosu' },
    },
}

-- true: ox_target kuresi; false: [E] metin arayuzu (lib.points)
Config.UseTarget = false

-- Her yerden studyo acma komutu (yetkili). nil yaparak kapat.
Config.Command = { name = 'kaplamastudyo', restricted = 'group.admin' }
-- En yakin aractaki kaplamayi kaldirma komutu (yetkili). nil yaparak kapat.
Config.AdminRemoveCommand = { name = 'kaplamasok', restricted = 'group.admin' }

-- Kutuphane kategorileri = GTA arac siniflari (GetVehicleClass 0..22).
-- Taramada her arac sinifina gore otomatik kategorilenir.
Config.Categories = {
    { id = 'compacts', label = 'KOMPAKT', class = 0 },
    { id = 'sedans', label = 'SEDAN', class = 1 },
    { id = 'suvs', label = 'SUV', class = 2 },
    { id = 'coupes', label = 'COUPE', class = 3 },
    { id = 'muscle', label = 'MUSCLE', class = 4 },
    { id = 'sportsclassics', label = 'KLASİK SPOR', class = 5 },
    { id = 'sports', label = 'SPOR', class = 6 },
    { id = 'super', label = 'SÜPER', class = 7 },
    { id = 'motorcycles', label = 'MOTOSİKLET', class = 8 },
    { id = 'offroad', label = 'ARAZİ', class = 9 },
    { id = 'industrial', label = 'ENDÜSTRİYEL', class = 10 },
    { id = 'utility', label = 'HİZMET', class = 11 },
    { id = 'vans', label = 'VAN', class = 12 },
    { id = 'cycles', label = 'BİSİKLET', class = 13 },
    { id = 'boats', label = 'TEKNE', class = 14 },
    { id = 'helicopters', label = 'HELİKOPTER', class = 15 },
    { id = 'planes', label = 'UÇAK', class = 16 },
    { id = 'service', label = 'SERVİS', class = 17 },
    { id = 'emergency', label = 'KAMU', class = 18 },
    { id = 'military', label = 'ASKERİ', class = 19 },
    { id = 'commercial', label = 'TİCARİ', class = 20 },
    { id = 'openwheel', label = 'FORMULA', class = 22 },
}

-- Tum araclari tarama (/kaplamatarama). Sonuc data/vehicles_auto.json'a yazilir.
Config.Scan = {
    command = 'kaplamatarama', -- yetkili komut (restricted asagida)
    restricted = 'group.admin',
    skipClasses = { [21] = true }, -- trenler
    modelTimeout = 6000, -- ms: model yuklenemezse atla
}

-- Kutuphane kart gorseli (assets/thumbs yoksa). %s = model adi. nil -> ikon.
Config.ThumbnailUrl = 'https://docs.fivem.net/vehicles/%s.webp'

-- Oyun ici canli onizleme: studyoda secilen aracin gercegi oyuncunun onunde
-- gosterilir, tasarim anlik olarak uzerine basilir.
Config.Preview = {
    enabled = true,
    distance = 7.0, -- oyuncunun onunde (m)
    textureSize = 1024, -- onizleme dokusu (px)
    fov = 38.0,
}

-- Yazi araci fontlari (oyuncunun Windows'unda olan fontlar calisir; ozel font NUI'den yuklenebilir)
Config.Fonts = { 'Impact', 'Arial Black', 'Bahnschrift', 'Segoe UI', 'Georgia', 'Trebuchet MS', 'Verdana', 'Courier New', 'Times New Roman' }

-- Kutuphanede prosedurel demo arac (3D test icin; BASILAMAZ). Arac hazirlarken faydali.
Config.ShowDemoVehicle = true

-- Dokular: bu mesafedeki araclarin kaplamasi yuklenir, en fazla bu kadar farkli tasarim ayni anda
Config.Textures = {
    streamDistance = 160.0,
    maxLoaded = 24,
    unloadAfter = 45, -- sn: gorulmeyen tasarim bellekten atilir
}

-- Buyuk veri aktarimi (latent event hizi, byte/sn)
Config.Transfer = {
    chunkSize = 128 * 1024,
    bps = 1000000,
}
