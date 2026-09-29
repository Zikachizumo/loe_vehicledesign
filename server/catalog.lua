--[[
    Arac katalogu = elle tanimlananlar (config/vehicles.lua) + tarama sonucu
    (data/vehicles_auto.json). Kaplama destekleyen her arac Config.Vehicles'a
    eklenir; desteklemeyenler kutuphanede "kaplama yok" olarak listelenir.
]]

Catalog = { list = {}, version = 0, meta = {} }

local RES = GetCurrentResourceName()
local FILE = 'data/vehicles_auto.json'
local manual = {}
for model in pairs(Config.Vehicles) do manual[model] = true end

local function supported(def)
    return def and def.method and def.txd and def.texture and (def.slots or 0) > 0
end

function Catalog.load()
    for model in pairs(Config.Vehicles) do
        if not manual[model] then Config.Vehicles[model] = nil end
    end
    local raw = LoadResourceFile(RES, FILE)
    local ok, data = pcall(json.decode, raw or '')
    data = ok and type(data) == 'table' and data or {}
    local list, seen = {}, {}
    for _, e in ipairs(data.vehicles or {}) do
        if type(e) == 'table' and type(e.model) == 'string' then
            seen[e.model] = true
            if not manual[e.model] and supported(e) then
                Config.Vehicles[e.model] = {
                    label = e.label, brand = e.brand, category = e.category, size = e.size or 1024,
                    method = e.method, slots = e.slots, txd = e.txd, texture = e.texture,
                    indexOffset = e.indexOffset or 0, auto = true,
                }
            end
            list[#list + 1] = e
        end
    end
    -- Elle tanimlanip taramada olmayanlar (eklenti araclar vb.)
    for model, v in pairs(Config.Vehicles) do
        if manual[model] and not seen[model] then
            list[#list + 1] = { model = model, label = v.label, brand = v.brand, category = v.category }
        end
    end
    Catalog.list = list
    Catalog.meta = { scannedAt = data.scannedAt, gameBuild = data.gameBuild, total = #list }
    Catalog.version = Catalog.version + 1
    local n = 0
    for _ in pairs(Config.Vehicles) do n = n + 1 end
    Catalog.meta.supported = n
    print(('[loe_vd] Katalog: %d arac, %d tanesi kaplama destekli'):format(#list, n))
end

--- NUI kutuphanesi icin tum araclar (+ slot durumu).
function Catalog.forNui()
    local out = {}
    for _, e in ipairs(Catalog.list) do
        local def = Config.Vehicles[e.model]
        local free, total = 0, 0
        if def then free, total = Slots.free(e.model) end
        out[#out + 1] = {
            model = e.model,
            label = (def and def.label) or e.label or e.model,
            brand = (def and def.brand) or e.brand,
            year = def and def.year,
            category = (def and def.category) or e.category or 'sports',
            size = (def and def.size) or e.size or 1024,
            glb = def and def.glb,
            uv = def and def.uv,
            thumb = def and def.thumb,
            uvChannel = def and def.uvChannel,
            liveryMaterials = def and def.liveryMaterials,
            excludeMaterials = def and def.excludeMaterials,
            rotationY = def and def.rotationY,
            supported = def ~= nil,
            liveries = e.liveries,
            modLiveries = e.modLiveries,
            slotsTotal = total,
            slotsFree = free,
        }
    end
    table.sort(out, function(a, b)
        if a.supported ~= b.supported then return a.supported end
        return ((a.brand or '') .. ' ' .. a.label) < ((b.brand or '') .. ' ' .. b.label)
    end)
    return out
end

--- Istemcilerin dokuyu basabilmesi icin gereken tanimlar (sadece destekliler).
function Catalog.defs()
    local out = {}
    for model, v in pairs(Config.Vehicles) do
        out[model] = {
            method = v.method, slots = v.slots, txd = v.txd, texture = v.texture,
            indexOffset = v.indexOffset or 0, size = v.size or 1024, defaultIndex = v.defaultIndex,
        }
    end
    return out
end

lib.callback.register('loe_vd:server:liveryDefs', function(src)
    return { version = Catalog.version, transfer = Transfer.push(src, json.encode(Catalog.defs())) }
end)

-- Tarama sonucu (yetkili)
lib.callback.register('loe_vd:server:scanResult', function(src, transferId)
    if not IsPlayerAceAllowed(src, 'command.' .. Config.Scan.command) then return { ok = false, error = 'Yetkin yok' } end
    local raw = Transfer.take(src, transferId, 120000)
    if not raw then return { ok = false, error = 'Veri alınamadı' } end
    local ok, data = pcall(json.decode, raw)
    if not ok or type(data) ~= 'table' or type(data.vehicles) ~= 'table' then return { ok = false, error = 'Bozuk tarama verisi' } end
    local clean = {}
    local function str(v, max) return type(v) == 'string' and v:sub(1, max) or nil end
    for _, e in ipairs(data.vehicles) do
        if type(e) == 'table' and type(e.model) == 'string' and e.model:match('^[%w_%-]+$') then
            clean[#clean + 1] = {
                model = e.model:sub(1, 40),
                label = str(e.label, 60) or e.model,
                brand = str(e.brand, 40),
                class = tonumber(e.class),
                category = str(e.category, 24),
                liveries = tonumber(e.liveries) or 0,
                modLiveries = tonumber(e.modLiveries) or 0,
                method = (e.method == 'mod' or e.method == 'livery') and e.method or nil,
                txd = str(e.txd, 80),
                texture = str(e.texture, 80),
                indexOffset = tonumber(e.indexOffset) or 0,
                slots = math.min(tonumber(e.slots) or 0, 64),
                size = (tonumber(e.size) == 2048) and 2048 or 1024,
                res = tonumber(e.res),
                error = str(e.error, 16),
            }
        end
    end
    local out = json.encode({ scannedAt = os.time(), gameBuild = tonumber(data.gameBuild), vehicles = clean })
    if not SaveResourceFile(RES, FILE, out, -1) then return { ok = false, error = 'Dosya yazılamadı (data/ klasörü?)' } end
    Catalog.load()
    TriggerClientEvent('loe_vd:client:defsUpdated', -1)
    return { ok = true, total = #clean, supported = Catalog.meta.supported }
end)

lib.addCommand(Config.Scan.command, {
    help = 'Oyundaki tüm araçları kaplama stüdyosu için tara',
    restricted = Config.Scan.restricted,
}, function(src)
    TriggerClientEvent('loe_vd:client:scan', src)
end)

Catalog.load()
CreateThread(function()
    Wait(1000)
    TriggerClientEvent('loe_vd:client:defsUpdated', -1)
end)
