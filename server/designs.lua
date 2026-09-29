--[[
    Projeler (duzenlenebilir kayit) + basilan tasarimlar (oyuna giden gorsel) + item.
    Tum NUI kaynakli istekler Studio oturumu ister (bkz. server/main.lua).
]]

Designs = {}

local cache = {} -- [id] = { image, model, paint, t }
local cacheOrder = {}
local CACHE_MAX = 48

local function cachePut(id, row)
    if not cache[id] then cacheOrder[#cacheOrder + 1] = id end
    cache[id] = row
    while #cacheOrder > CACHE_MAX do
        local old = table.remove(cacheOrder, 1)
        cache[old] = nil
    end
end

--- Tasarim gorselini getir (onbellek -> DB).
function Designs.get(id)
    if type(id) ~= 'string' or #id > 12 then return nil end
    local hit = cache[id]
    if hit then return hit end
    local row = MySQL.single.await('SELECT id, model, image, paint, label, citizenid FROM loe_vd_designs WHERE id = ?', { id })
    if not row then return nil end
    row.paint = row.paint and json.decode(row.paint) or nil
    cachePut(id, row)
    return row
end

local CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
local function newId()
    for _ = 1, 20 do
        local t = {}
        for i = 1, 8 do
            local r = math.random(1, #CHARS)
            t[i] = CHARS:sub(r, r)
        end
        local id = table.concat(t)
        if not MySQL.scalar.await('SELECT 1 FROM loe_vd_designs WHERE id = ?', { id }) then return id end
    end
    return nil
end

local function clean(s, max)
    s = tostring(s or ''):gsub('[%c<>]', ''):gsub('^%s+', ''):gsub('%s+$', '')
    if #s > max then s = s:sub(1, max) end
    return s
end
Designs.clean = clean

local function validImage(data, maxBytes)
    if type(data) ~= 'string' then return false end
    if not (data:find('^data:image/webp;base64,') or data:find('^data:image/png;base64,')) then return false end
    return #data <= maxBytes * 4 / 3 + 64
end

local function validThumb(t)
    return type(t) == 'string' and #t < 200000 and t:find('^data:image/%a+;base64,') ~= nil
end

local function sanitizePaint(p)
    if type(p) ~= 'table' then return nil end
    local finish = ({ gloss = 1, metallic = 1, pearl = 1, matte = 1, brushed = 1, chrome = 1 })[p.finish] and p.finish or 'gloss'
    local color = type(p.color) == 'string' and p.color:match('^#%x%x%x%x%x%x$') or '#ffffff'
    return { color = color, finish = finish, apply = p.apply == true }
end

-- ---------------- Projeler ----------------

function Designs.listFor(cid)
    local projects = MySQL.query.await(
        'SELECT id, name, model, thumb, UNIX_TIMESTAMP(updated_at) AS updated FROM loe_vd_projects WHERE citizenid = ? ORDER BY updated_at DESC LIMIT 40',
        { cid }) or {}
    local printed = MySQL.query.await(
        'SELECT id, label, model, thumb, UNIX_TIMESTAMP(created_at) AS created FROM loe_vd_designs WHERE citizenid = ? ORDER BY created_at DESC LIMIT 40',
        { cid }) or {}
    return { projects = projects, printed = printed }
end

local function modelAllowed(model)
    return type(model) == 'string' and (Config.Vehicles[model] ~= nil or (Config.ShowDemoVehicle and model == 'loe_demo'))
end

function Designs.saveProject(src, cid, data)
    if not modelAllowed(data.model) then return { ok = false, error = 'Geçersiz araç' } end
    -- zarf: "<kucuk resim dataURL>\n<proje JSON>"
    local raw = Transfer.take(src, data.transfer, 60000)
    if not raw then return { ok = false, error = 'Veri aktarımı başarısız' } end
    local thumb, payload = raw:match('^([^\n]*)\n(.*)$')
    raw = nil
    if not payload then return { ok = false, error = 'Bozuk proje verisi' } end
    if #payload > Config.Limits.maxProjectBytes then return { ok = false, error = 'Proje çok büyük' } end
    if payload:sub(1, 1) ~= '{' then return { ok = false, error = 'Bozuk proje verisi' } end
    local name = clean(data.name, 48)
    if name == '' then name = 'Kaplama' end
    if not validThumb(thumb) then thumb = nil end
    local id = tonumber(data.id)
    if id then
        local owner = MySQL.scalar.await('SELECT citizenid FROM loe_vd_projects WHERE id = ?', { id })
        if owner == cid then
            MySQL.update.await('UPDATE loe_vd_projects SET name = ?, model = ?, data = ?, thumb = ? WHERE id = ?', { name, data.model, payload, thumb, id })
            return { ok = true, id = id }
        end
    end
    local count = MySQL.scalar.await('SELECT COUNT(*) FROM loe_vd_projects WHERE citizenid = ?', { cid }) or 0
    if count >= Config.Limits.maxProjectsPerPlayer then
        return { ok = false, error = ('En fazla %d proje saklayabilirsin'):format(Config.Limits.maxProjectsPerPlayer) }
    end
    local newIdNum = MySQL.insert.await('INSERT INTO loe_vd_projects (citizenid, name, model, data, thumb) VALUES (?, ?, ?, ?, ?)', { cid, name, data.model, payload, thumb })
    return { ok = newIdNum ~= nil, id = newIdNum }
end

function Designs.loadProject(src, cid, id)
    local row = MySQL.single.await('SELECT data FROM loe_vd_projects WHERE id = ? AND citizenid = ?', { tonumber(id), cid })
    if not row then return { ok = false, error = 'Proje bulunamadı' } end
    return { ok = true, transfer = Transfer.push(src, row.data) }
end

function Designs.deleteProject(cid, id)
    local n = MySQL.update.await('DELETE FROM loe_vd_projects WHERE id = ? AND citizenid = ?', { tonumber(id), cid })
    return { ok = (n or 0) > 0 }
end

-- ---------------- Basma (item uretimi) ----------------

local function itemMetadata(design, vehicleLabel, designer, thumb)
    local meta = {
        designId = design.id,
        model = design.model,
        vehicle = vehicleLabel,
        designer = designer,
        label = ('%s Kaplaması'):format(design.label),
        description = ('Araç: %s  \nTasarımcı: %s  \nKod: #%s'):format(vehicleLabel, designer, design.id),
    }
    -- envanter ikonu olarak kucuk onizleme (her envanter senkronunda tasindigi icin kucuk tutulur)
    if Config.Print.itemThumbnail and validThumb(thumb) and #thumb <= 40000 then meta.imageurl = thumb end
    return meta
end

local function giveItem(src, meta)
    local item = Config.Items.livery
    if not exports.ox_inventory:CanCarryItem(src, item, 1, meta) then
        return false, 'Envanterinde yer yok'
    end
    local ok = exports.ox_inventory:AddItem(src, item, 1, meta)
    if not ok then return false, 'Eşya verilemedi' end
    return true
end

local function vehicleLabel(model)
    local def = Config.Vehicles[model]
    if not def then return model end
    return def.brand and (def.brand .. ' ' .. def.label) or def.label
end

function Designs.print(src, cid, data)
    local def = Config.Vehicles[data.model]
    if not def then return { ok = false, error = 'Bu araç basılamaz' } end
    local label = clean(data.label, Config.Limits.labelLength)
    if label == '' then label = def.label end
    -- zarf: "<onizleme>\n<envanter ikonu>\n<kaplama gorseli>"
    local raw = Transfer.take(src, data.transfer, 60000)
    if not raw then return { ok = false, error = 'Veri aktarımı başarısız' } end
    local preview, itemThumb, image = raw:match('^([^\n]*)\n([^\n]*)\n(.*)$')
    raw = nil
    if not validImage(image, Config.Limits.maxImageBytes) then return { ok = false, error = 'Tasarım görseli geçersiz veya çok büyük' } end

    local designer = Bridge.name(src)
    local design = { model = data.model, label = label }
    local vLabel = vehicleLabel(data.model)
    local thumb = validThumb(itemThumb) and itemThumb or nil
    -- once yer kontrolu (para cekmeden)
    if not exports.ox_inventory:CanCarryItem(src, Config.Items.livery, 1) then
        return { ok = false, error = 'Envanterinde yer yok' }
    end
    local price = Config.Print.price or 0
    if not Bridge.removeMoney(src, price, 'loe-livery-print') then
        return { ok = false, error = ('Yetersiz bakiye (%s%s)'):format(Config.Print.currency, price) }
    end
    design.id = newId()
    if not design.id then
        Bridge.addMoney(src, price, 'loe-livery-refund')
        return { ok = false, error = 'Kod üretilemedi' }
    end
    local paint = sanitizePaint(data.paint)
    MySQL.insert.await('INSERT INTO loe_vd_designs (id, citizenid, designer, model, label, image, thumb, paint) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', {
        design.id, cid, designer, data.model, label, image, validThumb(preview) and preview or nil, paint and json.encode(paint) or nil,
    })
    cachePut(design.id, { id = design.id, model = data.model, image = image, paint = paint, label = label, citizenid = cid })
    local ok, err = giveItem(src, itemMetadata(design, vLabel, designer, thumb))
    if not ok then
        Bridge.addMoney(src, price, 'loe-livery-refund')
        return { ok = false, error = err }
    end
    Designs.log(src, ('**%s** "%s" kaplamasını bastı (%s, #%s)'):format(designer, label, vLabel, design.id))
    return { ok = true, id = design.id, message = ('"%s" basıldı — envanterine eklendi'):format(label) }
end

function Designs.reprint(src, cid, id)
    local row = MySQL.single.await('SELECT id, model, label, thumb, designer FROM loe_vd_designs WHERE id = ? AND citizenid = ?', { id, cid })
    if not row then return { ok = false, error = 'Tasarım bulunamadı' } end
    if not Config.Vehicles[row.model] then return { ok = false, error = 'Bu araç artık desteklenmiyor' } end
    if not exports.ox_inventory:CanCarryItem(src, Config.Items.livery, 1) then return { ok = false, error = 'Envanterinde yer yok' } end
    local price = Config.Print.price or 0
    if not Bridge.removeMoney(src, price, 'loe-livery-reprint') then
        return { ok = false, error = ('Yetersiz bakiye (%s%s)'):format(Config.Print.currency, price) }
    end
    local thumb = nil
    if Config.Print.itemThumbnail then thumb = row.thumb end
    local ok, err = giveItem(src, itemMetadata(row, vehicleLabel(row.model), row.designer, thumb))
    if not ok then
        Bridge.addMoney(src, price, 'loe-livery-refund')
        return { ok = false, error = err }
    end
    return { ok = true, message = ('"%s" tekrar basıldı'):format(row.label) }
end

function Designs.log(src, text)
    local hook = ServerConfig.Webhook
    if not hook or hook == '' then return end
    PerformHttpRequest(hook, function() end, 'POST', json.encode({
        username = 'LoE Tasarım Stüdyosu',
        embeds = { { description = text, color = 13935180, footer = { text = ('ID %s'):format(src) } } },
    }), { ['Content-Type'] = 'application/json' })
end
