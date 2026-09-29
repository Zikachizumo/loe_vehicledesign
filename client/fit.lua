--[[
    Kaplama takma / sokme akisi.
    - Envanterden kullanma: ox_inventory data/items.lua
        client = { export = 'loe_vehicledesign.useLivery' }
        client = { export = 'loe_vehicledesign.useRemover' }
    - Kendi menunden (G menusu vb.): client/api.lua exportlari ayni akisi kullanir.
]]

ClientFit = {}

local function notify(msg, kind)
    lib.notify({ title = 'Kaplama', description = msg, type = kind or 'inform', position = 'top' })
end
ClientFit.notify = notify

local busy = false

function ClientFit.closestVehicle(dist)
    local veh = lib.getClosestVehicle(GetEntityCoords(cache.ped), dist, false)
    if not veh or veh == 0 or not NetworkGetEntityIsNetworked(veh) then return nil end
    return veh
end

local function work(duration, label, anim)
    return lib.progressCircle({
        duration = duration,
        label = label,
        position = 'bottom',
        useWhileDead = false,
        canCancel = true,
        disable = { move = true, car = true, combat = true },
        anim = anim,
    })
end

--- Envanter slotundaki kaplamayi araca tak. slot = { slot = n, metadata = {...} }
function ClientFit.fit(veh, slot)
    if busy then return false, 'Meşgul' end
    if cache.vehicle then return false, 'Araçtan inmelisin' end
    local meta = slot and slot.metadata or {}
    if not meta.designId or not meta.model then return false, 'Bu kaplama bozuk' end
    if not veh or not DoesEntityExist(veh) then return false, 'Yakında araç yok' end
    if #(GetEntityCoords(cache.ped) - GetEntityCoords(veh)) > Config.Fit.distance + 1.5 then return false, 'Araca yaklaş' end
    if GetEntityModel(veh) ~= joaat(meta.model) then
        return false, ('Bu kaplama sadece %s için'):format(meta.vehicle or meta.model)
    end
    busy = true
    TaskTurnPedToFaceEntity(cache.ped, veh, 800)
    Wait(800)
    local done = work(Config.Fit.duration, 'Kaplama uygulanıyor...', Config.Fit.anim)
    local ok, msg = false, 'İptal edildi'
    if done then
        local res = lib.callback.await('loe_vd:server:fit', false, slot.slot, VehToNet(veh))
        ok, msg = res and res.ok == true, res and res.message or 'Hata'
    end
    busy = false
    return ok, msg
end

--- Sokucu slotuyla aractaki kaplamayi sok.
function ClientFit.remove(veh, slot)
    if busy then return false, 'Meşgul' end
    if cache.vehicle then return false, 'Araçtan inmelisin' end
    if not veh or not DoesEntityExist(veh) then return false, 'Yakında araç yok' end
    if not Entity(veh).state.loe_livery then return false, 'Bu araçta özel kaplama yok' end
    busy = true
    TaskTurnPedToFaceEntity(cache.ped, veh, 800)
    Wait(800)
    local done = work(Config.Remove.duration, 'Kaplama sökülüyor...', Config.Remove.anim)
    local ok, msg = false, 'İptal edildi'
    if done then
        local res = lib.callback.await('loe_vd:server:remove', false, slot.slot, VehToNet(veh))
        ok, msg = res and res.ok == true, res and res.message or 'Hata'
    end
    busy = false
    return ok, msg
end

exports('useLivery', function(_, slot)
    local ok, msg = ClientFit.fit(ClientFit.closestVehicle(Config.Fit.distance), slot)
    notify(msg, ok and 'success' or 'error')
end)

exports('useRemover', function(_, slot)
    local ok, msg = ClientFit.remove(ClientFit.closestVehicle(Config.Remove.distance), slot)
    notify(msg, ok and 'success' or 'error')
end)
