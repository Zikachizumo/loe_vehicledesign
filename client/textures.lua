--[[
    Oyundaki kaplama dokulari.
    - Arac state bag'i: Entity(veh).state.loe_livery = { d, s, m, p }
    - Tasarim gorseli sunucudan latent olarak cekilir, bir DUI sayfasina cizilir,
      DUI -> runtime texture olur ve AddReplaceTexture ile modelin livery slot
      dokusunun yerine gecer.
    - Aracin sahibi (network owner) livery index'ini ve istege bagli boyayi uygular.
]]

Liveries = {}

local RT_TXD = 'loe_vd_rt'
local rtTxd = CreateRuntimeTxd(RT_TXD)
local DUI_URL = ('https://cfx-nui-%s/dui/index.html'):format(GetCurrentResourceName())
local STATE = 'loe_livery'

local textures = {} -- [designId] = { state, dui, texName, lastSeen, size }
local bound = {} -- ['model:slot'] = designId
local painted = {} -- [veh] = anahtar (ayni boyayi tekrar tekrar uygulama)
local texCounter = 0

local hashToModel = {}
for model in pairs(Config.Vehicles) do hashToModel[joaat(model)] = model end

local function dbg(...)
    if Config.Debug then print('[loe_vd]', ...) end
end

local function sendToDui(dui, data)
    local size = 256 * 1024
    local total = math.max(1, math.ceil(#data / size))
    SendDuiMessage(dui, json.encode({ loe = true, type = 'begin', total = total }))
    for i = 1, total do
        SendDuiMessage(dui, json.encode({ loe = true, type = 'chunk', i = i, data = data:sub((i - 1) * size + 1, i * size) }))
    end
end

local function slotNames(def, slot)
    return def.txd:format(slot), def.texture:format(slot)
end

local function unload(id)
    local t = textures[id]
    if not t then return end
    for key, did in pairs(bound) do
        if did == id then
            local model, slot = key:match('^(.+):(%d+)$')
            local def = Config.Vehicles[model]
            if def then RemoveReplaceTexture(slotNames(def, tonumber(slot))) end
            bound[key] = nil
        end
    end
    if t.dui then DestroyDui(t.dui) end
    textures[id] = nil
    dbg('doku bosaltildi', id)
end

local function evictIfNeeded()
    local n, oldestId, oldest = 0, nil, math.huge
    for id, t in pairs(textures) do
        n = n + 1
        if t.lastSeen < oldest then oldest, oldestId = t.lastSeen, id end
    end
    if n >= Config.Textures.maxLoaded and oldestId then unload(oldestId) end
end

--- Tasarim dokusunu yukle (zaten yukluyse onu dondur).
function Liveries.load(id, size)
    local t = textures[id]
    if t then
        t.lastSeen = GetGameTimer()
        return t
    end
    evictIfNeeded()
    t = { state = 'loading', lastSeen = GetGameTimer(), size = size }
    textures[id] = t
    CreateThread(function()
        local res = lib.callback.await('loe_vd:server:getDesign', false, id)
        if not res or not res.ok then
            t.state = 'failed'
            return
        end
        local data = Transfer.await(res.transfer, 120000)
        if not data or textures[id] ~= t then
            t.state = 'failed'
            return
        end
        local dui = CreateDui(DUI_URL, size, size)
        local deadline = GetGameTimer() + 8000
        while not IsDuiAvailable(dui) and GetGameTimer() < deadline do Wait(50) end
        texCounter = texCounter + 1
        local texName = ('d_%s_%d'):format(id, texCounter)
        CreateRuntimeTextureFromDuiHandle(rtTxd, texName, GetDuiHandle(dui))
        Wait(400)
        sendToDui(dui, data)
        t.dui, t.texName, t.state = dui, texName, 'ready'
        dbg('doku hazir', id, texName)
        -- Sayfa gec yuklendiyse ilk mesaj kaybolmasin diye bir kez daha gonder
        SetTimeout(2500, function()
            if textures[id] == t and t.dui then sendToDui(t.dui, data) end
            data = nil
        end)
    end)
    return t
end

local function bindSlot(def, model, slot, id)
    local key = model .. ':' .. slot
    local t = textures[id]
    if not t or t.state ~= 'ready' then return false end
    if bound[key] == id then return true end
    local txd, tex = slotNames(def, slot)
    if bound[key] then RemoveReplaceTexture(txd, tex) end
    AddReplaceTexture(txd, tex, RT_TXD, t.texName)
    bound[key] = id
    dbg('slot baglandi', key, id)
    return true
end

local PAINT_TYPE = { gloss = 0, metallic = 1, pearl = 2, matte = 3, brushed = 4, chrome = 5 }

local function hexToRgb(hex)
    local r, g, b = hex:match('^#(%x%x)(%x%x)(%x%x)$')
    if not r then return 255, 255, 255 end
    return tonumber(r, 16), tonumber(g, 16), tonumber(b, 16)
end

local function applyIndex(veh, def, slot)
    local idx = (slot - 1) + (def.indexOffset or 0)
    if def.method == 'livery' then
        if GetVehicleLivery(veh) ~= idx then SetVehicleLivery(veh, idx) end
    else
        if GetVehicleModKit(veh) ~= 0 then SetVehicleModKit(veh, 0) end
        if GetVehicleMod(veh, 48) ~= idx then SetVehicleMod(veh, 48, idx, false) end
    end
end

local function resetIndex(veh, def)
    if def.method == 'livery' then
        SetVehicleLivery(veh, def.defaultIndex or 0)
    else
        SetVehicleModKit(veh, 0)
        RemoveVehicleMod(veh, 48)
    end
end

local function applyPaint(veh, st)
    local p = st.p
    local key = p and ('%s|%s|%s'):format(st.d, p.color, p.finish) or st.d
    if painted[veh] == key then return end
    painted[veh] = key
    if not p then return end
    local r, g, b = hexToRgb(p.color or '#ffffff')
    SetVehicleModKit(veh, 0)
    SetVehicleModColor_1(veh, PAINT_TYPE[p.finish] or 0, 0, 0)
    SetVehicleCustomPrimaryColour(veh, r, g, b)
end

--- Tek arac icin: doku yukle, slotu bagla, sahibiysek index/boya uygula.
local function process(veh, st, now)
    local def = Config.Vehicles[st.m]
    if not def or GetEntityModel(veh) ~= joaat(st.m) then return end
    local t = Liveries.load(st.d, def.size or 2048)
    t.lastSeen = now
    bindSlot(def, st.m, st.s, st.d)
    if NetworkGetEntityOwner(veh) == PlayerId() then
        applyIndex(veh, def, st.s)
        applyPaint(veh, st)
    end
end

AddStateBagChangeHandler(STATE, nil, function(bagName, _, value)
    local veh = GetEntityFromStateBagName(bagName)
    if not veh or veh == 0 then return end -- henuz yakinda degil; dongu yakalar
    painted[veh] = nil
    if value then
        process(veh, value, GetGameTimer())
    else
        local model = hashToModel[GetEntityModel(veh)]
        local def = model and Config.Vehicles[model]
        if def and NetworkGetEntityOwner(veh) == PlayerId() then resetIndex(veh, def) end
    end
end)

-- Bakim dongusu: yakindaki araclari isle, uzun suredir gorulmeyen dokulari bosalt.
CreateThread(function()
    while true do
        local now = GetGameTimer()
        local pos = GetEntityCoords(cache.ped)
        local maxDist = Config.Textures.streamDistance
        for _, veh in ipairs(GetGamePool('CVehicle')) do
            if NetworkGetEntityIsNetworked(veh) then
                local st = Entity(veh).state[STATE]
                if st and #(GetEntityCoords(veh) - pos) < maxDist then process(veh, st, now) end
            end
        end
        for id, t in pairs(textures) do
            if now - t.lastSeen > Config.Textures.unloadAfter * 1000 then unload(id) end
        end
        for veh in pairs(painted) do
            if not DoesEntityExist(veh) then painted[veh] = nil end
        end
        Wait(1000)
    end
end)

AddEventHandler('onResourceStop', function(res)
    if res ~= GetCurrentResourceName() then return end
    for id in pairs(textures) do unload(id) end
end)
