--[[
    Studyo: noktalar/blip, NUI ac/kapat ve NUI -> sunucu kopruleri.
]]

local isOpen = false
local insideStudio = nil -- oyuncunun icinde durdugu studyo noktasi (kapaninca [E] yazisini geri getirmek icin)
local uploads = {} -- NUI'den parca parca gelen buyuk veri
local MAX_UPLOAD = 24 * 1024 * 1024

local function notify(msg, kind)
    lib.notify({ title = 'Tasarım Stüdyosu', description = msg, type = kind or 'inform', position = 'top' })
end

local function openStudio(index)
    if isOpen then return end
    if cache.vehicle then return notify('Araçtan inmelisin', 'error') end
    local res = lib.callback.await('loe_vd:server:open', false, index)
    if not res or not res.ok then return notify(res and res.error or 'Stüdyo açılamadı', 'error') end
    -- Arac katalogu (yuzlerce arac) latent aktarimla gelir
    local catalog = Transfer.await(res.catalog, 30000)
    res.data.vehiclesJson = catalog or '[]'
    res.data.inGame = true
    isOpen = true
    lib.hideTextUI()
    SetNuiFocus(true, true)
    SendNUIMessage({ action = 'open', data = res.data })
    DisplayRadar(false)
    CreateThread(function()
        while isOpen do
            DisableAllControlActions(0)
            Wait(0)
        end
    end)
end

local function closeStudio()
    if not isOpen then return end
    isOpen = false
    Preview.stop()
    uploads = {}
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'close' })
    DisplayRadar(true)
    TriggerServerEvent('loe_vd:server:closed')
    if insideStudio then lib.showTextUI(('[E] %s'):format(insideStudio.label), { icon = 'paint-roller' }) end
end

exports('OpenStudio', function() openStudio(0) end)
exports('IsStudioOpen', function() return isOpen end)
RegisterNetEvent('loe_vd:client:openAnywhere', function() openStudio(0) end)

-- ---------------- Noktalar ----------------
-- Studyo noktalari sadece tasarim yetkililerine gorunur (sunucu da ayrica kontrol eder)
local designer = false
local function jobOk()
    return designer
end

CreateThread(function()
    if #Config.Studios == 0 then return end
    Wait(3000)
    local ok, res = pcall(lib.callback.await, 'loe_vd:server:isDesigner', false)
    designer = ok and res == true
    if not designer then return end
    for i, st in ipairs(Config.Studios) do
        if st.blip then
            local b = AddBlipForCoord(st.coords.x, st.coords.y, st.coords.z)
            SetBlipSprite(b, st.blip.sprite or 72)
            SetBlipColour(b, st.blip.color or 46)
            SetBlipScale(b, st.blip.scale or 0.75)
            SetBlipAsShortRange(b, true)
            BeginTextCommandSetBlipName('STRING')
            AddTextComponentSubstringPlayerName(st.blip.label or st.label)
            EndTextCommandSetBlipName(b)
        end
        if Config.UseTarget and GetResourceState('ox_target') == 'started' then
            exports.ox_target:addSphereZone({
                coords = st.coords,
                radius = st.radius or 2.5,
                debug = Config.Debug,
                options = {
                    {
                        name = 'loe_vd_studio_' .. i,
                        icon = 'fa-solid fa-paint-roller',
                        label = st.label,
                        canInteract = function() return jobOk(st.jobs) end,
                        onSelect = function() openStudio(i) end,
                    },
                },
            })
        else
            local point = lib.points.new({ coords = st.coords, distance = st.radius or 2.5 })
            function point:onEnter()
                if jobOk(st.jobs) then
                    insideStudio = st
                    if not isOpen then lib.showTextUI(('[E] %s'):format(st.label), { icon = 'paint-roller' }) end
                end
            end
            function point:onExit()
                if insideStudio == st then insideStudio = nil end
                lib.hideTextUI()
            end
            function point:nearby()
                if not isOpen and IsControlJustReleased(0, 38) and jobOk(st.jobs) then openStudio(i) end
            end
        end
    end
end)

-- ---------------- NUI kopruleri ----------------
RegisterNUICallback('close', function(_, cb)
    closeStudio()
    cb({ ok = true })
end)

RegisterNUICallback('upload', function(d, cb)
    if type(d) ~= 'table' or type(d.id) ~= 'string' or type(d.index) ~= 'number' or type(d.total) ~= 'number' or type(d.data) ~= 'string' then
        return cb({ ok = false })
    end
    local u = uploads[d.id]
    if not u then
        u = { parts = {}, got = 0, total = d.total, bytes = 0 }
        uploads[d.id] = u
    end
    if not u.parts[d.index] then
        u.parts[d.index] = d.data
        u.got = u.got + 1
        u.bytes = u.bytes + #d.data
    end
    if u.bytes > MAX_UPLOAD then
        uploads[d.id] = nil
        return cb({ ok = false })
    end
    cb({ ok = true })
end)

local function takeUpload(id)
    local u = uploads[id]
    uploads[id] = nil
    if not u or u.got < u.total then return nil end
    return table.concat(u.parts)
end

--- NUI yuklemesini sunucuya aktar ve sunucu callback'ini cagir.
local function relayUpload(name, d, cb)
    local data = takeUpload(d.uploadId)
    if not data then return cb({ ok = false, error = 'Yükleme eksik' }) end
    d.uploadId = nil
    d.transfer = Transfer.send(data)
    cb(lib.callback.await(name, false, d) or { ok = false, error = 'Sunucu yanıt vermedi' })
end

--- Sunucu veriyi 'transfer' ile gonderiyorsa NUI'ye ilet.
local function relayDownload(name, d, cb, timeout)
    local res = lib.callback.await(name, false, d) or { ok = false, error = 'Sunucu yanıt vermedi' }
    if res.ok and res.transfer then Transfer.forward(res.transfer, timeout) end
    cb(res)
end

RegisterNUICallback('listDesigns', function(d, cb) relayDownload('loe_vd:server:listDesigns', d, cb) end)
RegisterNUICallback('saveProject', function(d, cb) relayUpload('loe_vd:server:saveProject', d, cb) end)
RegisterNUICallback('loadProject', function(d, cb) relayDownload('loe_vd:server:loadProject', d, cb) end)
RegisterNUICallback('deleteProject', function(d, cb) cb(lib.callback.await('loe_vd:server:deleteProject', false, d) or { ok = false }) end)
RegisterNUICallback('print', function(d, cb) relayUpload('loe_vd:server:print', d, cb) end)
RegisterNUICallback('reprint', function(d, cb) cb(lib.callback.await('loe_vd:server:reprint', false, d) or { ok = false }) end)
RegisterNUICallback('setListing', function(d, cb) cb(lib.callback.await('loe_vd:server:setListing', false, d) or { ok = false }) end)
RegisterNUICallback('importUrl', function(d, cb) relayDownload('loe_vd:server:importUrl', d, cb) end)
RegisterNUICallback('aiGenerate', function(d, cb) relayDownload('loe_vd:server:aiGenerate', d, cb, 180000) end)

-- ---------------- Canli onizleme kopruleri ----------------
RegisterNUICallback('previewStart', function(d, cb)
    local ok, err = Preview.start(d and d.model)
    if ok and d.offset then Preview.offset(d.offset.x, d.offset.y, d.offset.w) end
    cb({ ok = ok == true, error = err })
end)
RegisterNUICallback('previewStop', function(_, cb)
    Preview.stop()
    cb({ ok = true })
end)
RegisterNUICallback('previewCam', function(d, cb)
    if d.view then Preview.view(d.view) else Preview.cam(tonumber(d.dx), tonumber(d.dy), tonumber(d.zoom)) end
    cb({ ok = true })
end)
RegisterNUICallback('previewOffset', function(d, cb)
    Preview.offset(d.x, d.y, d.w)
    cb({ ok = true })
end)
RegisterNUICallback('previewImage', function(d, cb)
    local data = takeUpload(d.uploadId)
    if data then Preview.image(data, d.paint) end
    cb({ ok = data ~= nil })
end)
RegisterNUICallback('scan', function(_, cb)
    cb({ ok = true })
    closeStudio()
    TriggerServerEvent('loe_vd:server:requestScan') -- yetki sunucuda kontrol edilir
end)

AddEventHandler('onResourceStop', function(res)
    if res == GetCurrentResourceName() and isOpen then
        SetNuiFocus(false, false)
        DisplayRadar(true)
    end
end)
