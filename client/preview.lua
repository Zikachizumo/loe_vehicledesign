--[[
    Canli onizleme: studyoda secilen aracin gercegi oyuncunun onunde (yerel,
    agda olmayan) olusturulur, yorunge kamerasiyla gosterilir. NUI tasarimi
    kucultup gonderir; ayri bir DUI'ye cizilir ve modelin son slotu gecici
    olarak bu dokuya yonlendirilir. NUI calisma alani seffaf olur.
]]

Preview = { vehicle = nil }

local PTXD = 'loe_vd_prev'
local ptxd = CreateRuntimeTxd(PTXD)
local DUI_URL = ('https://cfx-nui-%s/dui/index.html'):format(GetCurrentResourceName())

local st = nil -- { model, def, slot, veh, cam }
local dui, texName, duiCounter = nil, nil, 0
local yaw, pitch, dist = 35.0, 10.0, 6.5
local offX, offY = 0.0, 0.0 -- seffaf alanin ekran merkezine gore kaymasi (NDC)
local PAINT_TYPE = { gloss = 0, metallic = 1, pearl = 2, matte = 3, brushed = 4, chrome = 5 }

local function ensureDui()
    if dui then return end
    local size = Config.Preview.textureSize
    dui = CreateDui(DUI_URL, size, size)
    local deadline = GetGameTimer() + 8000
    while not IsDuiAvailable(dui) and GetGameTimer() < deadline do Wait(50) end
    duiCounter = duiCounter + 1
    texName = ('prev_%d'):format(duiCounter)
    CreateRuntimeTextureFromDuiHandle(ptxd, texName, GetDuiHandle(dui))
end

local function updateCam()
    if not st or not st.cam then return end
    local veh = st.veh
    local min, max = GetModelDimensions(GetEntityModel(veh))
    local center = GetOffsetFromEntityInWorldCoords(veh, 0.0, (min.y + max.y) / 2, (min.z + max.z) / 2)
    -- yaw 0 = aracin onu, 90 = sol yan, 180 = arka (aracin yonune gore)
    local ry, rp = math.rad(yaw + GetEntityHeading(veh) + 180.0), math.rad(pitch)
    local dir = vec3(math.cos(rp) * math.sin(ry), -math.cos(rp) * math.cos(ry), math.sin(rp))
    local pos = center + dir * dist
    -- Seffaf alan ekran ortasinda degilse araci o alanin ortasina kaydir
    local fwd = -dir
    local right = vec3(fwd.y, -fwd.x, 0.0)
    local rl = #right
    right = rl > 0.001 and right / rl or vec3(1.0, 0.0, 0.0)
    local up = vec3(right.y * fwd.z - right.z * fwd.y, right.z * fwd.x - right.x * fwd.z, right.x * fwd.y - right.y * fwd.x)
    local fov = Config.Preview.fov
    local halfH = dist * math.tan(math.rad(fov) / 2)
    local sw, sh = GetActiveScreenResolution()
    local halfW = halfH * (sw / math.max(sh, 1))
    local shift = right * (-offX * halfW) + up * (-offY * halfH)
    SetCamCoord(st.cam, pos.x + shift.x, pos.y + shift.y, pos.z + shift.z)
    PointCamAtCoord(st.cam, center.x + shift.x, center.y + shift.y, center.z + shift.z)
end

function Preview.stop()
    if not st then return end
    Liveries.restore(st.model, st.slot)
    if st.cam then
        RenderScriptCams(false, true, 400, true, true)
        DestroyCam(st.cam, false)
    end
    if DoesEntityExist(st.veh) then DeleteEntity(st.veh) end
    SetEntityVisible(cache.ped, true, false)
    st = nil
    Preview.vehicle = nil
    if dui then
        DestroyDui(dui)
        dui = nil
    end
end

function Preview.start(model)
    Preview.stop()
    if not Config.Preview.enabled then return false, 'kapali' end
    local def = Config.Vehicles[model]
    if not def then return false, 'Bu araç kaplama desteklemiyor' end
    local hash = joaat(model)
    if not IsModelInCdimage(hash) then return false, 'Model oyunda yok' end
    RequestModel(hash)
    local deadline = GetGameTimer() + 8000
    while not HasModelLoaded(hash) and GetGameTimer() < deadline do Wait(0) end
    if not HasModelLoaded(hash) then return false, 'Model yüklenemedi' end

    local ped = cache.ped
    local pos = GetOffsetFromEntityInWorldCoords(ped, 0.0, Config.Preview.distance, 0.0)
    local found, gz = GetGroundZFor_3dCoord(pos.x, pos.y, pos.z + 3.0, false)
    local veh = CreateVehicle(hash, pos.x, pos.y, found and gz or pos.z, GetEntityHeading(ped) + 120.0, false, false)
    SetModelAsNoLongerNeeded(hash)
    if not veh or veh == 0 then return false, 'Araç oluşturulamadı' end
    SetVehicleOnGroundProperly(veh)
    FreezeEntityPosition(veh, true)
    SetEntityInvincible(veh, true)
    SetEntityNoCollisionEntity(veh, ped, false)
    SetVehicleDirtLevel(veh, 0.0)
    SetVehicleEngineOn(veh, false, true, true)
    SetVehicleLights(veh, 2)
    SetVehicleModKit(veh, 0)
    SetVehicleColours(veh, 111, 111) -- beyaz alt boya

    ensureDui()
    local slot = def.slots
    Liveries.override(model, slot, PTXD, texName)
    Liveries.applyIndex(veh, def, slot)

    local cam = CreateCam('DEFAULT_SCRIPTED_CAMERA', true)
    SetCamFov(cam, Config.Preview.fov)
    st = { model = model, def = def, slot = slot, veh = veh, cam = cam }
    Preview.vehicle = veh
    local _, max = GetModelDimensions(hash)
    dist = math.max(4.5, max.y * 2.6)
    yaw, pitch = 35.0, 10.0
    updateCam()
    RenderScriptCams(true, true, 600, true, true)

    CreateThread(function()
        while st and st.veh == veh do
            SetEntityLocallyInvisible(cache.ped)
            -- livery modlari parca olarak gec yuklenebilir; index'i koru
            if def.method == 'mod' and GetVehicleMod(veh, 48) ~= (slot - 1) + (def.indexOffset or 0) then
                Liveries.applyIndex(veh, def, slot)
            end
            Wait(0)
        end
    end)
    return true
end

function Preview.image(data, paint)
    if not st or not dui then return end
    Liveries.sendToDui(dui, data)
    if type(paint) == 'table' and type(paint.color) == 'string' then
        local r, g, b = paint.color:match('^#(%x%x)(%x%x)(%x%x)$')
        if r then
            SetVehicleModColor_1(st.veh, PAINT_TYPE[paint.finish] or 0, 0, 0)
            SetVehicleCustomPrimaryColour(st.veh, tonumber(r, 16), tonumber(g, 16), tonumber(b, 16))
        end
    end
end

function Preview.cam(dx, dy, zoom)
    if not st then return end
    yaw = (yaw + (dx or 0) * 0.35) % 360
    pitch = math.max(-5.0, math.min(70.0, pitch + (dy or 0) * 0.25))
    if zoom and zoom ~= 0 then dist = math.max(2.5, math.min(16.0, dist * (1 + zoom * 0.1))) end
    updateCam()
end

local VIEWS = { three = { 35, 10 }, front = { 0, 6 }, side = { 90, 6 }, rear = { 180, 8 }, other = { 270, 6 }, top = { 0, 70 } }
function Preview.view(name)
    local v = VIEWS[name]
    if not v or not st then return end
    yaw, pitch = v[1], v[2]
    updateCam()
end

function Preview.offset(x, y)
    offX, offY = tonumber(x) or 0.0, tonumber(y) or 0.0
    updateCam()
end

AddEventHandler('onResourceStop', function(res)
    if res == GetCurrentResourceName() then Preview.stop() end
end)
