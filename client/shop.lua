--[[
    Kaplama magazasi (oyuncu tarafi). Oyuncu aracini noktaya getirir, [E]:
    araca uyan yayindaki tasarimlar -> Onizle (sadece kendi ekraninda) / Satin al.
]]

local function notify(msg, kind)
    lib.notify({ title = 'Kaplama Mağazası', description = msg, type = kind or 'inform', position = 'top' })
end

local busy = false
local currentShop = nil

local function money(n, cur)
    local s = tostring(math.floor(n or 0)):reverse():gsub('(%d%d%d)', '%1.'):reverse():gsub('^%.', '')
    return (cur or '$') .. s
end

local function targetVehicle()
    if cache.vehicle then return cache.vehicle end
    local veh = lib.getClosestVehicle(GetEntityCoords(cache.ped), Config.Shop.maxVehicleDistance, false)
    return veh
end

local openShop

local function buy(veh, d, info)
    local content
    if d.owned then
        content = ('**%s**  \n%s için  \nBu kaplamaya **sahipsin** — ücretsiz takılacak.'):format(d.label, info.vehicle)
    else
        content = ('**%s**  \n%s için  \nFiyat: **%s**%s'):format(d.label, info.vehicle, money(d.price, info.currency),
            Config.Shop.mode == 'item' and '  \nKaplama envanterine eklenecek.' or '  \nKaplama aracına hemen takılacak.')
    end
    local alert = lib.alertDialog({
        header = d.owned and 'Kaplamayı tak' or 'Kaplamayı satın al',
        content = content,
        centered = true,
        cancel = true,
        labels = { confirm = d.owned and 'Tak' or 'Satın al', cancel = 'Vazgeç' },
    })
    if alert ~= 'confirm' then return openShop() end
    local res = lib.callback.await('loe_vd:server:shopBuy', false, d.id, VehToNet(veh))
    notify(res and res.message or 'Satın alınamadı', res and res.ok and 'success' or 'error')
end

--- Tebex islem kodunu kullan (kaplama karaktere baglanir).
local function redeem()
    local input = lib.inputDialog('Tebex kodunu kullan', {
        { type = 'input', label = 'İşlem kodu', description = 'Tebex e-postasındaki kod (tbx-...)', required = true, min = 6, max = 64 },
    })
    if not input or not input[1] then return openShop() end
    local res = lib.callback.await('loe_vd:server:redeem', false, input[1])
    notify(res and res.message or 'Kod kullanılamadı', res and res.ok and 'success' or 'error')
    if res and res.ok then openShop() end
end

--- Gercek para ile satilan kaplama: magaza sitesini goster (baglanti panoya kopyalanir).
local function tebexInfo(d, info)
    if info.storeUrl then lib.setClipboard(info.storeUrl) end
    local alert = lib.alertDialog({
        header = 'Gerçek para ile satın al',
        content = ('**%s** kaplaması sunucu mağazamızdan (Tebex) satın alınır.  \n\n%s  \n\n'
            .. 'Ödemeden sonra e-postana gelen **işlem kodunu** burada "Tebex kodunu kullan" ile gir: '
            .. 'kaplama karakterine bağlanır, kendi araçlarına ücretsiz takarsın.  \n'
            .. 'Sadece görünüm (kozmetik) — oyunda avantaj sağlamaz, devredilemez.'):format(
            d.label, info.storeUrl and ('Mağaza: **%s** (bağlantı panoya kopyalandı)'):format(info.storeUrl) or 'Mağaza bağlantısını yetkililerden iste.'),
        centered = true,
        cancel = true,
        labels = { confirm = 'Kodum var', cancel = 'Geri' },
    })
    if alert == 'confirm' then return redeem() end
    openShop()
end

local function preview(veh, d, info)
    local secs = Config.Shop.previewSeconds
    notify(('Önizleme %d sn — sadece sen görüyorsun'):format(secs))
    local ok, err = Liveries.previewOn(veh, info.model, d.id, secs, function()
        busy = false
    end)
    if not ok then
        busy = false
        return notify(err or 'Önizleme açılamadı', 'error')
    end
    busy = true
end

openShop = function()
    if busy then return notify('Önizleme bitene kadar bekle') end
    local veh = targetVehicle()
    if not veh or veh == 0 or not NetworkGetEntityIsNetworked(veh) then return notify('Aracını mağazaya getir', 'error') end
    local res = lib.callback.await('loe_vd:server:shopList', false, VehToNet(veh))
    if not res or not res.ok then return notify(res and res.error or 'Mağaza açılamadı', 'error') end
    local raw = Transfer.await(res.transfer, 30000)
    local ok, list = pcall(json.decode, raw or '[]')
    list = ok and type(list) == 'table' and list or {}

    local options = {}
    if res.tebex then
        options[1] = {
            title = 'Tebex kodunu kullan',
            description = 'Gerçek para ile aldığın kaplamanın işlem kodunu gir',
            icon = 'ticket',
            onSelect = redeem,
        }
    end
    local listed = 0
    for _, d in ipairs(list) do
        listed = listed + 1
        local priceText = d.owned and 'SAHİPSİN — ücretsiz tak' or d.tebex and 'Gerçek para (Tebex)' or money(d.price, res.currency)
        local action
        if d.owned then
            action = { title = 'Aracıma tak (ücretsiz)', icon = 'check', onSelect = function() buy(veh, d, res) end }
        elseif d.tebex then
            action = { title = 'Satın al (gerçek para — Tebex)', icon = 'gem', onSelect = function() tebexInfo(d, res) end }
        else
            action = { title = ('Satın al — %s'):format(money(d.price, res.currency)), icon = 'cart-shopping', onSelect = function() buy(veh, d, res) end }
        end
        options[#options + 1] = {
            title = d.label,
            description = ('%s  ·  Tasarımcı: %s%s'):format(priceText, d.designer or '?', d.id == res.current and '  ·  TAKILI' or ''),
            icon = d.owned and 'circle-check' or d.tebex and 'gem' or 'paint-roller',
            image = d.thumb,
            arrow = true,
            onSelect = function()
                lib.registerContext({
                    id = 'loe_vd_shop_item',
                    title = d.label,
                    menu = 'loe_vd_shop',
                    options = {
                        { title = ('Önizle (%d sn)'):format(Config.Shop.previewSeconds), icon = 'eye', image = d.thumb, onSelect = function() preview(veh, d, res) end },
                        action,
                    },
                })
                lib.showContext('loe_vd_shop_item')
            end,
        }
    end
    if listed == 0 then
        options[#options + 1] = { title = 'Bu araç için satışta kaplama yok', description = res.vehicle, icon = 'circle-info', disabled = true }
    end
    lib.registerContext({ id = 'loe_vd_shop', title = ('Kaplama Mağazası · %s'):format(res.vehicle), options = options })
    lib.showContext('loe_vd_shop')
end

exports('OpenShop', function() openShop() end)

CreateThread(function()
    for i, s in ipairs(Config.Shops) do
        if s.blip then
            local b = AddBlipForCoord(s.coords.x, s.coords.y, s.coords.z)
            SetBlipSprite(b, s.blip.sprite or 72)
            SetBlipColour(b, s.blip.color or 46)
            SetBlipScale(b, s.blip.scale or 0.75)
            SetBlipAsShortRange(b, true)
            BeginTextCommandSetBlipName('STRING')
            AddTextComponentSubstringPlayerName(s.blip.label or s.label)
            EndTextCommandSetBlipName(b)
        end
        local point = lib.points.new({ coords = s.coords, distance = s.radius or 8.0 })
        function point:onEnter()
            currentShop = i
            lib.showTextUI(('[E] %s'):format(s.label), { icon = 'paint-roller' })
        end
        function point:onExit()
            if currentShop == i then currentShop = nil end
            lib.hideTextUI()
        end
        function point:nearby()
            if IsControlJustReleased(0, 38) and not lib.getOpenContextMenu() then openShop() end
        end
    end
end)
