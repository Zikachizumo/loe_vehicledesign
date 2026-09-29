--[[
    Kaplama magazasi (oyuncular). Yetkililerin "magazada sat" ile yayinladigi
    tasarimlar, oyuncunun getirdigi aracin modeline gore listelenir ve satilir.
    Oyuncular tasarim studyosuna ERISEMEZ; sadece burada satin alir.
]]

Shop = {}

local hashCache, hashVersion = {}, -1
local function modelOf(veh)
    if hashVersion ~= Catalog.version then
        hashCache = {}
        for model in pairs(Config.Vehicles) do hashCache[joaat(model)] = model end
        hashVersion = Catalog.version
    end
    return hashCache[GetEntityModel(veh)]
end

local function nearShop(src)
    local pos = GetEntityCoords(GetPlayerPed(src))
    for _, s in ipairs(Config.Shops) do
        if #(pos - s.coords) <= (s.radius or 8.0) + 4.0 then return s end
    end
end

local lastBuy = {}
AddEventHandler('playerDropped', function() lastBuy[source] = nil end)

--- Tebex ile sahip olunan tasarimi kendi aracina ucretsiz tak (esya verilmez: devredilemez).
function Shop.fitOwned(src, row, netId)
    local veh = Fit.resolveVehicle(src, netId, Config.Shop.maxVehicleDistance)
    if not veh then return { ok = false, message = 'Aracını mağazaya getir' } end
    local design = Designs.get(row.id)
    if not design then return { ok = false, message = 'Tasarım bulunamadı' } end
    local ok, msg, saved = Fit.fitDesign(src, veh, design, { onlyOwn = true })
    if ok then msg = ('"%s" takıldı%s'):format(row.label, saved and ' ve aracına kaydedildi' or '') end
    return { ok = ok, message = msg }
end

--- Magaza listesi: oyuncunun getirdigi araca uyan yayindaki tasarimlar.
lib.callback.register('loe_vd:server:shopList', function(src, netId)
    if not nearShop(src) then return { ok = false, error = 'Kaplama mağazasında değilsin' } end
    local veh = Fit.resolveVehicle(src, netId, Config.Shop.maxVehicleDistance)
    if not veh then return { ok = false, error = 'Aracını mağazaya getir' } end
    local model = modelOf(veh)
    if not model then return { ok = false, error = 'Bu araç kaplama desteklemiyor' } end
    local cid = Bridge.citizenId(src)
    -- satistakiler + (satistan kalksa bile) Tebex ile sahip olunanlar
    local rows = MySQL.query.await([[
        SELECT d.id, d.label, d.price, d.thumb, d.designer, d.sales, d.tebex, o.design_id IS NOT NULL AS owned
        FROM loe_vd_designs d
        LEFT JOIN loe_vd_owned o ON o.design_id = d.id AND o.citizenid = ?
        WHERE d.model = ? AND (d.published = 1 OR o.design_id IS NOT NULL)
        ORDER BY owned DESC, d.sales DESC, d.created_at DESC LIMIT 60
    ]], { cid or '', model }) or {}
    local list = {}
    for _, r in ipairs(rows) do
        r.tebex = r.tebex == true or r.tebex == 1
        r.owned = r.owned == true or r.owned == 1
        if r.owned or not r.tebex or Config.Tebex.enabled then list[#list + 1] = r end
    end
    local st = Entity(veh).state.loe_livery
    return {
        ok = true,
        model = model,
        vehicle = Designs.vehicleLabel(model),
        current = st and st.d or nil,
        count = #list,
        currency = Config.Print.currency,
        tebex = Config.Tebex.enabled,
        storeUrl = Config.Tebex.storeUrl ~= '' and Config.Tebex.storeUrl or nil,
        transfer = Transfer.push(src, json.encode(list)),
    }
end)

--- Satin al: parayi cek -> araca tak (veya esya ver). Basarisizsa para iade.
lib.callback.register('loe_vd:server:shopBuy', function(src, id, netId)
    local now = GetGameTimer()
    if lastBuy[src] and now - lastBuy[src] < 2500 then return { ok = false, message = 'Biraz bekle' } end
    lastBuy[src] = now
    if not nearShop(src) then return { ok = false, message = 'Kaplama mağazasında değilsin' } end
    if type(id) ~= 'string' or #id > 12 then return { ok = false, message = 'Geçersiz tasarım' } end
    local row = MySQL.single.await('SELECT id, model, label, price, published, designer, thumb, tebex FROM loe_vd_designs WHERE id = ?', { id })
    if not row then return { ok = false, message = 'Bu kaplama artık satışta değil' } end
    local cid = Bridge.citizenId(src)
    local owned = Tebex.owns(cid, id)
    if not owned and not (row.published == true or row.published == 1) then return { ok = false, message = 'Bu kaplama artık satışta değil' } end
    if owned then return Shop.fitOwned(src, row, netId) end
    if row.tebex == true or row.tebex == 1 then
        return { ok = false, message = 'Bu kaplama gerçek para ile satılır: Tebex mağazasından al, e-postadaki kodu gir.' }
    end
    local price = Designs.clampPrice(row.price)
    local accounts = Config.Shop.accounts
    local charged = false
    local function charge()
        if not Bridge.removeMoney(src, price, 'loe-livery-shop', accounts) then
            return false, ('Yetersiz bakiye (%s%s)'):format(Config.Print.currency, price)
        end
        charged = true
        return true
    end
    local function refund()
        if charged then Bridge.addMoney(src, price, 'loe-livery-shop-refund', accounts[1]) end
        charged = false
    end

    local ok, msg
    if Config.Shop.mode == 'item' then
        if not exports.ox_inventory:CanCarryItem(src, Config.Items.livery, 1) then return { ok = false, message = 'Envanterinde yer yok' } end
        ok, msg = charge()
        if ok then
            ok, msg = Designs.giveDesignItem(src, row)
            if ok then msg = ('"%s" satın alındı — envanterine eklendi'):format(row.label) else refund() end
        end
    else
        local veh = Fit.resolveVehicle(src, netId, Config.Shop.maxVehicleDistance)
        if not veh then return { ok = false, message = 'Aracını mağazaya getir' } end
        local design = Designs.get(id)
        if not design then return { ok = false, message = 'Tasarım bulunamadı' } end
        local saved
        ok, msg, saved = Fit.fitDesign(src, veh, design, {
            onlyOwn = Config.Shop.onlyOwnVehicles,
            before = charge,
            rollback = refund,
        })
        if ok then msg = ('"%s" satın alındı — %s'):format(row.label, saved and 'aracına takıldı ve kaydedildi' or 'aracına takıldı') end
    end
    if not ok then return { ok = false, message = msg } end

    MySQL.update('UPDATE loe_vd_designs SET sales = sales + 1 WHERE id = ?', { id })
    Designs.log(src, ('**%s** "%s" kaplamasını satın aldı (%s%s, #%s)'):format(Bridge.name(src), row.label, Config.Print.currency, price, id))
    if type(ServerConfig.OnPurchase) == 'function' then
        pcall(ServerConfig.OnPurchase, src, { id = id, label = row.label, model = row.model, price = price, designer = row.designer })
    end
    return { ok = true, message = msg }
end)
