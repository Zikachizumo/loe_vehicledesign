--[[
    Kaplamayi araca takma / sokme + plakaya kalici kayit.
    Arac durumu state bag ile tum istemcilere dagitilir:
      Entity(veh).state.loe_livery = { d = tasarimId, s = slot, m = model, p = boya|nil }
]]

Fit = {}

local STATE = 'loe_livery'
local persisted = {} -- [plate] = { design, model }

CreateThread(function()
    DB.waitReady()
    local rows = MySQL.query.await('SELECT plate, design_id, model FROM loe_vd_vehicles') or {}
    for _, r in ipairs(rows) do persisted[r.plate] = { design = r.design_id, model = r.model } end
    if Config.Debug then print(('[loe_vd] %d kalici kaplama yuklendi'):format(#rows)) end
    -- Kaynak yeniden baslatildiysa mevcut araclara tekrar uygula
    for _, veh in ipairs(GetAllVehicles()) do Fit.tryRestore(veh) end
end)

--- Araca tasarimi uygula (state bag + slot). Basariliysa slot doner.
function Fit.apply(veh, design)
    local slot = Slots.acquire(design.model, design.id)
    if not slot then return nil end
    Slots.bind(veh, design.model, slot)
    local paint = design.paint
    Entity(veh).state:set(STATE, {
        d = design.id,
        s = slot,
        m = design.model,
        p = (paint and paint.apply) and paint or nil,
    }, true)
    return slot
end

function Fit.clear(veh)
    Slots.unbind(veh)
    Entity(veh).state:set(STATE, nil, true)
end

function Fit.tryRestore(veh)
    if not DoesEntityExist(veh) or GetEntityType(veh) ~= 2 then return false end
    if Entity(veh).state[STATE] then return true end
    local plate = Bridge.trimPlate(GetVehicleNumberPlateText(veh))
    local rec = persisted[plate]
    if not rec then return false end
    if GetEntityModel(veh) ~= joaat(rec.model) then return false end
    local design = Designs.get(rec.design)
    if not design then return false end
    return Fit.apply(veh, design) ~= nil
end

-- Garajdan cikan / yeniden spawn olan kayitli araclara kaplamayi geri yukle.
-- Plaka olusturmadan hemen sonra atanabildigi icin birkac saniye denenir.
AddEventHandler('entityCreated', function(ent)
    if not next(persisted) then return end
    if not DoesEntityExist(ent) or GetEntityType(ent) ~= 2 then return end
    CreateThread(function()
        for _ = 1, 16 do
            Wait(500)
            if not DoesEntityExist(ent) then return end
            if Fit.tryRestore(ent) then return end
        end
    end)
end)

local function near(src, veh, maxDist)
    local ped = GetPlayerPed(src)
    if not ped or ped == 0 then return false end
    return #(GetEntityCoords(ped) - GetEntityCoords(veh)) <= maxDist
end

local function resolveVehicle(src, netId, maxDist)
    if type(netId) ~= 'number' then return nil end
    local veh = NetworkGetEntityFromNetworkId(netId)
    if not veh or veh == 0 or not DoesEntityExist(veh) or GetEntityType(veh) ~= 2 then return nil end
    if not near(src, veh, maxDist + 2.0) then return nil end
    return veh
end

lib.callback.register('loe_vd:server:fit', function(src, slotId, netId)
    local item = exports.ox_inventory:GetSlot(src, slotId)
    if not item or item.name ~= Config.Items.livery then return { ok = false, message = 'Kaplama eşyası bulunamadı' } end
    local meta = item.metadata or {}
    local design = Designs.get(meta.designId)
    if not design then return { ok = false, message = 'Bu kaplamanın tasarımı bulunamadı' } end
    local def = Config.Vehicles[design.model]
    if not def then return { ok = false, message = 'Bu araç modeli artık desteklenmiyor' } end
    local veh = resolveVehicle(src, netId, Config.Fit.distance)
    if not veh then return { ok = false, message = 'Araç çok uzakta' } end
    if GetEntityModel(veh) ~= joaat(design.model) then
        return { ok = false, message = ('Bu kaplama sadece %s için'):format(meta.vehicle or def.label) }
    end
    local plate = Bridge.trimPlate(GetVehicleNumberPlateText(veh))
    local owner = Bridge.vehicleOwner(plate)
    local cid = Bridge.citizenId(src)
    if Config.Fit.onlyOwnVehicles and owner ~= cid then
        return { ok = false, message = 'Sadece kendi aracına kaplama takabilirsin' }
    end
    local slot = Fit.apply(veh, design)
    if not slot then
        return { ok = false, message = 'Bu model için boş kaplama slotu yok, daha sonra tekrar dene' }
    end
    if Config.Fit.consumeItem then exports.ox_inventory:RemoveItem(src, item.name, 1, nil, slotId) end

    local saved = false
    if Config.Fit.persistOwned and owner then
        MySQL.insert.await(
            'INSERT INTO loe_vd_vehicles (plate, design_id, model, citizenid) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE design_id = VALUES(design_id), model = VALUES(model), citizenid = VALUES(citizenid)',
            { plate, design.id, design.model, owner })
        persisted[plate] = { design = design.id, model = design.model }
        saved = true
    end
    Designs.log(src, ('**%s** #%s kaplamasını %s plakalı araca taktı'):format(Bridge.name(src), design.id, plate))
    return {
        ok = true,
        saved = saved,
        message = saved and 'Kaplama takıldı ve araca kalıcı olarak kaydedildi' or 'Kaplama araca takıldı (kayıtlı araç olmadığı için geçici)',
    }
end)

--- Kaplamayi sok (sokucu item veya yetkili komut).
function Fit.remove(src, veh, checkOwner)
    local st = Entity(veh).state[STATE]
    local plate = Bridge.trimPlate(GetVehicleNumberPlateText(veh))
    if not st and not persisted[plate] then return false, 'Bu araçta özel kaplama yok' end
    if checkOwner then
        local owner = Bridge.vehicleOwner(plate)
        if owner ~= Bridge.citizenId(src) then return false, 'Bu araç sana ait değil' end
    end
    Fit.clear(veh)
    if persisted[plate] then
        persisted[plate] = nil
        MySQL.update.await('DELETE FROM loe_vd_vehicles WHERE plate = ?', { plate })
    end
    return true, 'Kaplama söküldü'
end

lib.callback.register('loe_vd:server:remove', function(src, slotId, netId)
    local item = exports.ox_inventory:GetSlot(src, slotId)
    if not item or item.name ~= Config.Items.remover then return { ok = false, message = 'Sökücü bulunamadı' } end
    local veh = resolveVehicle(src, netId, Config.Remove.distance)
    if not veh then return { ok = false, message = 'Araç çok uzakta' } end
    local ok, msg = Fit.remove(src, veh, Config.Remove.onlyOwnVehicles)
    if ok and Config.Remove.consumeItem then exports.ox_inventory:RemoveItem(src, item.name, 1, nil, slotId) end
    return { ok = ok, message = msg }
end)

-- Istemci arac dokusunu istiyor: gorseli latent olarak gonder
lib.callback.register('loe_vd:server:getDesign', function(src, id)
    local d = Designs.get(id)
    if not d then return { ok = false } end
    return { ok = true, transfer = Transfer.push(src, d.image) }
end)

-- Disa acik API (garaj/mekanik scriptleri icin)
exports('ApplyDesign', function(veh, designId)
    local d = Designs.get(designId)
    if not d or GetEntityModel(veh) ~= joaat(d.model) then return false end
    return Fit.apply(veh, d) ~= nil
end)
exports('RemoveDesign', function(veh) Fit.clear(veh) end)
exports('RestoreDesign', function(veh) return Fit.tryRestore(veh) end)
exports('GetVehicleDesign', function(veh)
    local st = Entity(veh).state[STATE]
    return st and st.d or nil
end)
