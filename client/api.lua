--[[
    Disa acik istemci API'si — kendi arac menunden (ornegin G tusu ile acilan
    "arac bilgisi / motor bilgisi" menusu) kaplama islemleri icin.

    Ornek (ox_lib context menusu icinden):
        local veh = <menunun baktigi arac>
        exports.loe_vehicledesign:OpenLiveryMenu(veh)       -- hazir alt menu
    veya kendi menunde:
        local list = exports.loe_vehicledesign:GetLiveriesForVehicle(veh)
        for _, l in ipairs(list) do ... l.label, l.designer, l.slot ... end
        local ok, msg = exports.loe_vehicledesign:FitLivery(veh, list[1].slot)
]]

local function itemsFor(veh)
    local out = {}
    if not veh or not DoesEntityExist(veh) then return out end
    local model = GetEntityModel(veh)
    local slots = exports.ox_inventory:Search('slots', Config.Items.livery) or {}
    for _, it in pairs(slots) do
        local m = it.metadata or {}
        if m.model and joaat(m.model) == model then
            out[#out + 1] = {
                slot = it.slot,
                label = m.label or 'Kaplama',
                designId = m.designId,
                designer = m.designer,
                vehicle = m.vehicle,
                image = m.imageurl,
                metadata = m,
            }
        end
    end
    return out
end

local function findSlot(item, slotId)
    for _, it in pairs(exports.ox_inventory:Search('slots', item) or {}) do
        if it.slot == slotId then return { slot = it.slot, metadata = it.metadata or {} } end
    end
end

local function firstSlot(item)
    local list = exports.ox_inventory:Search('slots', item) or {}
    for _, it in pairs(list) do return { slot = it.slot, metadata = it.metadata or {} } end
end

--- Araca uyan (ayni model) kaplama esyalari.
exports('GetLiveriesForVehicle', itemsFor)

--- Aracta ozel kaplama var mi? Varsa tasarim kodu doner.
exports('GetVehicleLivery', function(veh)
    local st = veh and DoesEntityExist(veh) and Entity(veh).state.loe_livery
    return st and st.d or nil
end)

--- Envanterdeki belirli slottaki kaplamayi araca tak (ilerleme cubugu + sunucu dogrulamasi).
exports('FitLivery', function(veh, slotId)
    local slot = findSlot(Config.Items.livery, slotId)
    if not slot then return false, 'Kaplama eşyası bulunamadı' end
    local ok, msg = ClientFit.fit(veh, slot)
    ClientFit.notify(msg, ok and 'success' or 'error')
    return ok, msg
end)

--- Envanterdeki sokucuyle kaplamayi sok.
exports('RemoveLivery', function(veh)
    local slot = firstSlot(Config.Items.remover)
    if not slot then return false, 'Kaplama Sökücü gerekli' end
    local ok, msg = ClientFit.remove(veh, slot)
    ClientFit.notify(msg, ok and 'success' or 'error')
    return ok, msg
end)

--- Hazir menu: bu araca takilabilecek kaplamalar + sokme secenegi.
exports('OpenLiveryMenu', function(veh, parentMenu)
    if not veh or not DoesEntityExist(veh) then return ClientFit.notify('Araç bulunamadı', 'error') end
    local options = {}
    for _, l in ipairs(itemsFor(veh)) do
        options[#options + 1] = {
            title = l.label,
            description = ('Tasarımcı: %s · #%s'):format(l.designer or '?', l.designId or '?'),
            icon = 'paint-roller',
            image = l.image,
            onSelect = function()
                local ok, msg = ClientFit.fit(veh, { slot = l.slot, metadata = l.metadata })
                ClientFit.notify(msg, ok and 'success' or 'error')
            end,
        }
    end
    if not next(options) then
        options[1] = { title = 'Bu araca uygun kaplama yok', description = 'Tasarım stüdyosunda bu model için kaplama bas.', icon = 'circle-info', disabled = true }
    end
    if Entity(veh).state.loe_livery then
        options[#options + 1] = {
            title = 'Kaplamayı Sök',
            description = 'Kaplama Sökücü gerekir',
            icon = 'eraser',
            onSelect = function()
                local slot = firstSlot(Config.Items.remover)
                if not slot then return ClientFit.notify('Kaplama Sökücü gerekli', 'error') end
                local ok, msg = ClientFit.remove(veh, slot)
                ClientFit.notify(msg, ok and 'success' or 'error')
            end,
        }
    end
    lib.registerContext({ id = 'loe_vd_livery_menu', title = 'Kaplama', menu = parentMenu, options = options })
    lib.showContext('loe_vd_livery_menu')
end)
