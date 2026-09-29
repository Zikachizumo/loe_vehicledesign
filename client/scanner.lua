--[[
    Tum araclari tarama (/kaplamatarama, yetkili).
    Oyunun (sunucu oyun surumu + eklenti araclar) TUM arac modellerini gezer:
      - ad, marka, sinif (kategori)
      - livery sayisi (SetVehicleLivery) ve livery mod sayisi (SetVehicleMod 48)
      - livery doku adini bilinen adlandirma kaliplariyla tahmin eder
        (GetTextureResolution ile dogrulanir)
    Sonuc sunucuya gonderilir ve data/vehicles_auto.json'a yazilir.
    Araclar oyuncunun altinda gorunmez/yerel olarak kisa sure olusturulup silinir.
]]

local CLASS_IDS = {}
for _, c in ipairs(Config.Categories) do CLASS_IDS[c.class] = c.id end

-- 'livery' yontemi: dokular aracin kendi ytd'sinde (txd = model adi)
local LIVERY_PATTERNS = {
    '%s_sign_%d',
    '%s_sign_%02d',
    '%s_livery_%d',
    '%s_livery%d',
}

-- 'mod' yontemi: her livery modu ayri parca (txd = parca adi) veya ana ytd
local MOD_PATTERNS = {
    { '%s_livery%d', '%s_livery%d' },
    { '%s_livery_%d', '%s_livery_%d' },
    { '%s_livery%d', '%s_sign_%d' },
    { '%s_livery_%d', '%s_sign_%d' },
    { '%s_liv%d', '%s_liv%d' },
    { '%s_livery%02d', '%s_livery%02d' },
    { '%s', '%s_livery%d' },
    { '%s', '%s_livery_%d' },
    { '%s', '%s_sign_%d' },
}

local function res(txd, tex)
    local r = GetTextureResolution(txd, tex)
    return r and math.floor(r.x) or 0
end

local function fill(pattern, name, n)
    -- '%s' -> model adi, '%d' / '%02d' -> numara (kalip olarak saklamak icin n=nil)
    local p = pattern:gsub('%%s', name)
    if n then return p:format(n) end
    return p
end

local function scanOne(name, pos)
    local hash = joaat(name)
    if not IsModelInCdimage(hash) or not IsModelAVehicle(hash) then return nil end
    local class = GetVehicleClassFromName(hash)
    if Config.Scan.skipClasses[class] then return nil end

    local dispKey = GetDisplayNameFromVehicleModel(hash)
    local label = GetLabelText(dispKey)
    if not label or label == 'NULL' or label == '' then
        label = (dispKey and dispKey ~= 'CARNOTFOUND') and dispKey or name
    end
    local makeKey = GetMakeNameFromVehicleModel(hash)
    local brand
    if makeKey and makeKey ~= '' then
        brand = GetLabelText(makeKey)
        if brand == 'NULL' then brand = makeKey:sub(1, 1) .. makeKey:sub(2):lower() end
    end

    local e = { model = name, label = label, brand = brand, class = class, category = CLASS_IDS[class] or 'sports', liveries = 0, modLiveries = 0 }

    RequestModel(hash)
    local deadline = GetGameTimer() + Config.Scan.modelTimeout
    while not HasModelLoaded(hash) and GetGameTimer() < deadline do Wait(0) end
    if not HasModelLoaded(hash) then
        e.error = 'load'
        return e
    end
    local veh = CreateVehicle(hash, pos.x, pos.y, pos.z, 0.0, false, false)
    if not veh or veh == 0 then
        SetModelAsNoLongerNeeded(hash)
        e.error = 'spawn'
        return e
    end
    SetEntityVisible(veh, false, false)
    SetEntityCollision(veh, false, false)
    FreezeEntityPosition(veh, true)
    SetVehicleModKit(veh, 0)
    Wait(0)

    local liv = GetVehicleLiveryCount(veh)
    local mods = GetNumVehicleMods(veh, 48)
    e.liveries = liv > 0 and liv or 0
    e.modLiveries = mods > 0 and mods or 0

    -- 1) SetVehicleLivery + aracin kendi ytd'si. Livery 0 cogu aracin varsayilanidir;
    --    onu bozmamak icin tasarim slotlari 2. liveryden baslar (indexOffset = 1).
    if e.liveries > 1 then
        for _, pat in ipairs(LIVERY_PATTERNS) do
            local r = res(name, fill(pat, name, 1))
            if r > 8 then
                local found = 0
                for n = 1, e.liveries do
                    if res(name, fill(pat, name, n)) > 8 then found = n else break end
                end
                if found > 1 then
                    e.method, e.txd, e.texture = 'livery', name, fill(pat, name)
                    e.indexOffset, e.slots, e.res = 1, found - 1, r
                end
                break
            end
        end
    end

    -- 2) Livery modlari (mod 48). Varsayilan -1 (mod yok) oldugu icin tum slotlar kullanilabilir.
    if not e.method and e.modLiveries > 0 then
        SetVehicleMod(veh, 48, 0, false)
        local t = GetGameTimer() + 2500
        while not IsVehicleModLoadDone(veh) and GetGameTimer() < t do Wait(0) end
        Wait(60)
        for _, pat in ipairs(MOD_PATTERNS) do
            local r = res(fill(pat[1], name, 1), fill(pat[2], name, 1))
            if r > 8 then
                e.method, e.txd, e.texture = 'mod', fill(pat[1], name), fill(pat[2], name)
                e.indexOffset, e.slots, e.res = 0, e.modLiveries, r
                break
            end
        end
    end

    if e.res then e.size = e.res >= 2048 and 2048 or 1024 end
    DeleteEntity(veh)
    SetModelAsNoLongerNeeded(hash)
    return e
end

local scanning = false
RegisterNetEvent('loe_vd:client:scan', function()
    if scanning then return end
    if exports[GetCurrentResourceName()]:IsStudioOpen() then return end
    scanning = true
    local models = GetAllVehicleModels()
    table.sort(models)
    local base = GetEntityCoords(cache.ped)
    local pos = vec3(base.x, base.y, base.z - 25.0)
    local out, supported, failed = {}, 0, 0
    lib.notify({ title = 'Araç Taraması', description = ('%d model taranacak, bu birkaç dakika sürebilir.'):format(#models), type = 'inform' })
    for i, name in ipairs(models) do
        local ok, e = pcall(scanOne, name, pos)
        if ok and e then
            out[#out + 1] = e
            if e.method then supported = supported + 1 end
            if e.error then failed = failed + 1 end
        end
        if i % 5 == 0 or i == #models then
            lib.showTextUI(('Araçlar taranıyor %d / %d  ·  kaplamalı: %d'):format(i, #models, supported), { icon = 'car' })
        end
    end
    lib.hideTextUI()
    local payload = json.encode({ gameBuild = GetGameBuildNumber(), vehicles = out })
    local id = Transfer.send(payload)
    local r = lib.callback.await('loe_vd:server:scanResult', false, id)
    scanning = false
    lib.notify({
        title = 'Araç Taraması',
        description = r and r.ok and ('%d araç kaydedildi · %d tanesi kaplama destekliyor%s'):format(#out, supported, failed > 0 and (' · %d yüklenemedi'):format(failed) or '')
            or (r and r.error or 'Kayıt başarısız'),
        type = r and r.ok and 'success' or 'error',
        duration = 10000,
    })
end)
