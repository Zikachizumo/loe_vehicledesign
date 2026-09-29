--[[
    Kaplama itemini kullanma (ox_inventory client export) ve sokucu.
    ox_inventory data/items.lua:
      client = { export = 'loe_vehicledesign.useLivery' }
      client = { export = 'loe_vehicledesign.useRemover' }
]]

local function notify(msg, kind)
    lib.notify({ title = 'Kaplama', description = msg, type = kind or 'inform', position = 'top' })
end

local busy = false

local function closestVehicle(dist)
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

exports('useLivery', function(_, slot)
    if busy then return end
    if cache.vehicle then return notify('Araçtan inmelisin', 'error') end
    local meta = slot and slot.metadata or {}
    if not meta.designId or not meta.model then return notify('Bu kaplama bozuk', 'error') end
    local veh = closestVehicle(Config.Fit.distance)
    if not veh then return notify('Yakında araç yok', 'error') end
    if GetEntityModel(veh) ~= joaat(meta.model) then
        return notify(('Bu kaplama sadece %s için'):format(meta.vehicle or meta.model), 'error')
    end
    busy = true
    TaskTurnPedToFaceEntity(cache.ped, veh, 800)
    Wait(800)
    local done = work(Config.Fit.duration, 'Kaplama uygulanıyor...', Config.Fit.anim)
    if done then
        local res = lib.callback.await('loe_vd:server:fit', false, slot.slot, VehToNet(veh))
        notify(res and res.message or 'Hata', res and res.ok and 'success' or 'error')
    else
        notify('İptal edildi', 'error')
    end
    busy = false
end)

exports('useRemover', function(_, slot)
    if busy then return end
    if cache.vehicle then return notify('Araçtan inmelisin', 'error') end
    local veh = closestVehicle(Config.Remove.distance)
    if not veh then return notify('Yakında araç yok', 'error') end
    if not Entity(veh).state.loe_livery then return notify('Bu araçta özel kaplama yok', 'error') end
    busy = true
    TaskTurnPedToFaceEntity(cache.ped, veh, 800)
    Wait(800)
    local done = work(Config.Remove.duration, 'Kaplama sökülüyor...', Config.Remove.anim)
    if done then
        local res = lib.callback.await('loe_vd:server:remove', false, slot.slot, VehToNet(veh))
        notify(res and res.message or 'Hata', res and res.ok and 'success' or 'error')
    else
        notify('İptal edildi', 'error')
    end
    busy = false
end)
