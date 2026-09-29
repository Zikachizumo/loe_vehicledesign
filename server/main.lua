--[[
    Studyo oturumu + NUI istek uclari.
    Oturum: oyuncu bir studyo noktasinda (veya yetkili komutla) acinca verilir;
    kaydet/bas/ice aktar/YZ gibi tum istekler oturum ister.
]]

local sessions = {} -- [src] = { studio = index|0, t = os.time() }

local function jobAllowed(src, jobs)
    if not jobs then return true end
    local name, grade = Bridge.job(src)
    local min = name and jobs[name]
    return min ~= nil and grade >= min
end

local DEMO = {
    model = 'loe_demo', label = 'Demo Coupe', brand = 'LoE', year = 2026, category = 'sports',
    size = 2048, demo = true, supported = true, slotsTotal = 16, slotsFree = 16,
}

--- Kutuphane listesi (JSON). Buyuk olabildigi icin latent aktarimla gider.
local function catalogJson()
    local list = Catalog.forNui()
    if Config.ShowDemoVehicle then table.insert(list, 1, DEMO) end
    return json.encode(list)
end

local function initials(name)
    local out = ''
    for w in name:gmatch('%S+') do
        out = out .. w:sub(1, 1):upper()
        if #out >= 2 then break end
    end
    return out ~= '' and out or 'LE'
end

local function openPayload(src)
    local name = Bridge.name(src)
    local jobName = Bridge.job(src)
    return {
        brand = Config.Brand,
        theme = Config.Theme,
        player = { name = name, initials = initials(name), role = jobName and jobName:gsub('^%l', string.upper) or 'Tasarımcı' },
        categories = Config.Categories,
        catalog = Catalog.meta,
        isAdmin = IsPlayerAceAllowed(src, 'command.' .. Config.Scan.command),
        thumbnailUrl = Config.ThumbnailUrl,
        preview = Config.Preview.enabled,
        price = Config.Print.price or 0,
        currency = Config.Print.currency or '$',
        aiEnabled = Remote.aiEnabled(src),
        fonts = Config.Fonts,
        limits = {
            maxLayers = Config.Limits.maxLayers,
            maxProjectBytes = Config.Limits.maxProjectBytes,
            maxImportBytes = Config.Limits.maxImportBytes,
            maxImageBytes = Config.Limits.maxImageBytes,
            maxTextLength = Config.Limits.maxTextLength,
        },
    }
end

--- Studyo acma istegi (nokta index'i ile). Mesafe + meslek sunucuda dogrulanir.
lib.callback.register('loe_vd:server:open', function(src, studioIndex)
    local cid = Bridge.citizenId(src)
    if not cid then return { ok = false, error = 'Karakter yüklenmedi' } end
    if studioIndex == 0 then
        if not sessions[src] or sessions[src].studio ~= 0 then return { ok = false, error = 'Yetkin yok' } end
    else
        local st = Config.Studios[studioIndex]
        if not st then return { ok = false } end
        local ped = GetPlayerPed(src)
        if #(GetEntityCoords(ped) - st.coords) > (st.radius or 2.5) + 3.0 then return { ok = false, error = 'Stüdyodan çok uzaktasın' } end
        if not jobAllowed(src, st.jobs) then return { ok = false, error = 'Bu stüdyoyu kullanma yetkin yok' } end
    end
    sessions[src] = { studio = studioIndex, t = os.time() }
    return { ok = true, data = openPayload(src), catalog = Transfer.push(src, catalogJson()) }
end)

RegisterNetEvent('loe_vd:server:closed', function()
    local s = sessions[source]
    if s and s.studio ~= 0 then sessions[source] = nil end
end)

AddEventHandler('playerDropped', function()
    sessions[source] = nil
end)

-- Studyo kutuphanesindeki "TUM ARACLARI TARA" dugmesi (yetki burada kontrol edilir)
RegisterNetEvent('loe_vd:server:requestScan', function()
    local src = source
    if not IsPlayerAceAllowed(src, 'command.' .. Config.Scan.command) then return end
    TriggerClientEvent('loe_vd:client:scan', src)
end)

local busy = {}
--- Oturum isteyen, ayni anda tek istek calistiran sarmalayici.
local function guarded(name, fn)
    lib.callback.register(name, function(src, data)
        if not sessions[src] then return { ok = false, error = 'Stüdyo oturumu yok' } end
        local cid = Bridge.citizenId(src)
        if not cid then return { ok = false, error = 'Karakter yüklenmedi' } end
        local key = src .. name
        if busy[key] then return { ok = false, error = 'Önceki işlem sürüyor' } end
        busy[key] = true
        local ok, res = pcall(fn, src, cid, type(data) == 'table' and data or {})
        busy[key] = nil
        if not ok then
            print(('[loe_vd] %s hatasi: %s'):format(name, res))
            return { ok = false, error = 'Sunucu hatası' }
        end
        return res
    end)
end

guarded('loe_vd:server:listDesigns', function(src, cid)
    return { ok = true, transfer = Transfer.push(src, json.encode(Designs.listFor(cid))) }
end)
guarded('loe_vd:server:saveProject', function(src, cid, d) return Designs.saveProject(src, cid, d) end)
guarded('loe_vd:server:loadProject', function(src, cid, d) return Designs.loadProject(src, cid, d.id) end)
guarded('loe_vd:server:deleteProject', function(_, cid, d) return Designs.deleteProject(cid, d.id) end)
guarded('loe_vd:server:print', function(src, cid, d) return Designs.print(src, cid, d) end)
guarded('loe_vd:server:reprint', function(src, cid, d) return Designs.reprint(src, cid, d.id) end)
guarded('loe_vd:server:importUrl', function(src, _, d) return Remote.importUrl(src, d.url) end)
guarded('loe_vd:server:aiGenerate', function(src, _, d) return Remote.aiGenerate(src, d.prompt, d.model) end)

-- ---------------- Komutlar ----------------
if Config.Command then
    lib.addCommand(Config.Command.name, {
        help = 'Araç tasarım stüdyosunu aç',
        restricted = Config.Command.restricted,
    }, function(src)
        sessions[src] = { studio = 0, t = os.time() }
        TriggerClientEvent('loe_vd:client:openAnywhere', src)
    end)
end

if Config.AdminRemoveCommand then
    lib.addCommand(Config.AdminRemoveCommand.name, {
        help = 'En yakın araçtaki özel kaplamayı kaldır',
        restricted = Config.AdminRemoveCommand.restricted,
    }, function(src)
        local ped = GetPlayerPed(src)
        local pos = GetEntityCoords(ped)
        local best, bestDist
        for _, veh in ipairs(GetAllVehicles()) do
            local d = #(GetEntityCoords(veh) - pos)
            if d < 6.0 and (not bestDist or d < bestDist) then best, bestDist = veh, d end
        end
        if not best then return Bridge.notify(src, 'Yakında araç yok', 'error') end
        local ok, msg = Fit.remove(src, best, false)
        Bridge.notify(src, msg, ok and 'success' or 'error')
    end)
end

exports('OpenStudioFor', function(src)
    sessions[src] = { studio = 0, t = os.time() }
    TriggerClientEvent('loe_vd:client:openAnywhere', src)
end)
