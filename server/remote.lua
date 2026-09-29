--[[
    Dis istekler: URL'den gorsel ice aktarma (vekil) + yapay zeka ile desen uretimi.
    Anahtar convar'dan okunur:  set loe_vd_ai_key "sk-..."
]]

Remote = {}

-- ---------------- base64 ----------------
local B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
local pair = {}
for i = 0, 4095 do
    local a, b = (i >> 6) + 1, (i & 63) + 1
    pair[i] = B64:sub(a, a) .. B64:sub(b, b)
end

function Remote.base64(data)
    local out, n = {}, #data
    local k = 0
    local i = 1
    while i + 2 <= n do
        local a, b, c = data:byte(i, i + 2)
        local v = (a << 16) | (b << 8) | c
        k = k + 1
        out[k] = pair[v >> 12] .. pair[v & 4095]
        i = i + 3
    end
    local rest = n - i + 1
    if rest == 1 then
        local v = data:byte(i) << 16
        k = k + 1
        out[k] = pair[v >> 12]:sub(1, 2) .. '=='
    elseif rest == 2 then
        local a, b = data:byte(i, i + 1)
        local v = (a << 16) | (b << 8)
        k = k + 1
        out[k] = pair[v >> 12] .. pair[v & 4095]:sub(1, 1) .. '='
    end
    return table.concat(out)
end

--- Dosya imzasindan gorsel turunu bul (icerik tipine guvenme).
local function sniffMime(body)
    if body:sub(1, 8) == '\137PNG\r\n\26\n' then return 'image/png' end
    if body:sub(1, 3) == '\255\216\255' then return 'image/jpeg' end
    if body:sub(1, 4) == 'GIF8' then return 'image/gif' end
    if body:sub(1, 4) == 'RIFF' and body:sub(9, 12) == 'WEBP' then return 'image/webp' end
    return nil
end

local function httpAwait(url, method, body, headers)
    local p = promise.new()
    PerformHttpRequest(url, function(status, resp, respHeaders)
        p:resolve({ status = status, body = resp, headers = respHeaders })
    end, method or 'GET', body or '', headers or {})
    return Citizen.Await(p)
end

local lastUse = {} -- [src..kind] = os.time()
local function cooldown(src, kind, secs)
    local key = src .. ':' .. kind
    local now = os.time()
    if lastUse[key] and now - lastUse[key] < secs then return secs - (now - lastUse[key]) end
    lastUse[key] = now
    return 0
end

AddEventHandler('playerDropped', function()
    local src = tostring(source)
    for k in pairs(lastUse) do
        if k:find('^' .. src .. ':') then lastUse[k] = nil end
    end
end)

-- ---------------- URL'den ice aktarma ----------------
function Remote.importUrl(src, url)
    local cfg = ServerConfig.Import
    if not cfg.enabled then return { ok = false, error = 'İçe aktarma kapalı' } end
    if type(url) ~= 'string' or #url > 600 or not url:find('^https?://') then return { ok = false, error = 'Geçersiz bağlantı' } end
    local host = url:match('^https?://([^/:?#]+)')
    if not host then return { ok = false, error = 'Geçersiz bağlantı' } end
    host = host:lower()
    -- yerel/ic ag adreslerine istek atma (SSRF korumasi)
    if host == 'localhost' or host:find('^127%.') or host:find('^10%.') or host:find('^192%.168%.') or host:find('^172%.1[6-9]%.') or host:find('^172%.2%d%.') or host:find('^172%.3[01]%.') or host:find('^169%.254%.') or host == '0.0.0.0' or host:find('^%[') then
        return { ok = false, error = 'Bu adrese izin verilmiyor' }
    end
    if #cfg.allowedHosts > 0 then
        local allowed = false
        for _, h in ipairs(cfg.allowedHosts) do
            if host == h or host:sub(-(#h + 1)) == '.' .. h then allowed = true end
        end
        if not allowed then return { ok = false, error = 'Bu siteye izin verilmiyor' } end
    end
    local wait = cooldown(src, 'import', cfg.cooldown)
    if wait > 0 then return { ok = false, error = ('%d sn bekle'):format(wait) } end
    local res = httpAwait(url, 'GET', '', { ['User-Agent'] = 'LoE-VehicleDesign/1.0' })
    if res.status ~= 200 or type(res.body) ~= 'string' then return { ok = false, error = ('Görsel indirilemedi (%s)'):format(res.status) } end
    if #res.body > Config.Limits.maxImportBytes then return { ok = false, error = 'Görsel çok büyük' } end
    local mime = sniffMime(res.body)
    if not mime then return { ok = false, error = 'Desteklenmeyen dosya (PNG/JPG/WEBP/GIF)' } end
    local dataUrl = ('data:%s;base64,%s'):format(mime, Remote.base64(res.body))
    return { ok = true, transfer = Transfer.push(src, dataUrl) }
end

-- ---------------- Yapay zeka ----------------
local function aiKey()
    return GetConvar('loe_vd_ai_key', '')
end

function Remote.aiEnabled(src)
    local cfg = ServerConfig.AI
    if not cfg.enabled or aiKey() == '' then return false end
    if cfg.ace and src and not IsPlayerAceAllowed(src, cfg.ace) then return false end
    return true
end

function Remote.aiGenerate(src, prompt, vehicleLabel)
    local cfg = ServerConfig.AI
    if not Remote.aiEnabled(src) then return { ok = false, error = 'Yapay zekâ kapalı' } end
    prompt = Designs.clean(prompt, 600)
    if #prompt < 4 then return { ok = false, error = 'Tarif çok kısa' } end
    local wait = cooldown(src, 'ai', cfg.cooldown)
    if wait > 0 then return { ok = false, error = ('Yeni desen için %d sn bekle'):format(wait) } end
    if (cfg.price or 0) > 0 and not Bridge.removeMoney(src, cfg.price, 'loe-livery-ai') then
        return { ok = false, error = 'Yetersiz bakiye' }
    end
    local full = cfg.promptPrefix .. prompt
    if vehicleLabel and vehicleLabel ~= '' then full = full .. ' (for a ' .. Designs.clean(vehicleLabel, 60) .. ')' end

    local body, headers
    if cfg.provider == 'openai' then
        local req = { model = cfg.model, prompt = full, size = cfg.size, n = 1 }
        if tostring(cfg.model):find('^dall%-e') then req.response_format = 'b64_json' end
        body = json.encode(req)
        headers = { ['Content-Type'] = 'application/json', ['Authorization'] = 'Bearer ' .. aiKey() }
    else
        body = json.encode({ prompt = full, size = cfg.size })
        headers = { ['Content-Type'] = 'application/json', ['Authorization'] = 'Bearer ' .. aiKey() }
    end
    local res = httpAwait(cfg.endpoint, 'POST', body, headers)
    if res.status ~= 200 or type(res.body) ~= 'string' then
        if (cfg.price or 0) > 0 then Bridge.addMoney(src, cfg.price, 'loe-livery-ai-refund') end
        print(('[loe_vd] AI hatasi %s: %s'):format(res.status, tostring(res.body):sub(1, 300)))
        return { ok = false, error = 'Yapay zekâ servisi yanıt vermedi' }
    end
    local ok, data = pcall(json.decode, res.body)
    if not ok or type(data) ~= 'table' then return { ok = false, error = 'Yapay zekâ yanıtı okunamadı' } end
    local dataUrl
    local first = data.data and data.data[1]
    if first and first.b64_json then
        dataUrl = 'data:image/png;base64,' .. first.b64_json
    elseif data.image and type(data.image) == 'string' then
        dataUrl = data.image:find('^data:') and data.image or ('data:image/png;base64,' .. data.image)
    elseif (first and first.url) or data.url then
        local img = httpAwait((first and first.url) or data.url, 'GET')
        if img.status == 200 and sniffMime(img.body or '') then
            dataUrl = ('data:%s;base64,%s'):format(sniffMime(img.body), Remote.base64(img.body))
        end
    end
    if not dataUrl then return { ok = false, error = 'Yapay zekâ görsel döndürmedi' } end
    Designs.log(src, ('**%s** YZ deseni üretti: %s'):format(Bridge.name(src), prompt))
    return { ok = true, transfer = Transfer.push(src, dataUrl) }
end
