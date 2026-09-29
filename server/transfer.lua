--[[
    Buyuk veri aktarimi (latent event, parca parca).
      client -> server : 'loe_vd:tx'  (id, index, total, chunk)
      server -> client : 'loe_vd:rx'  (id, index, total, chunk)
    Guvenlik: oyuncu basina es zamanli aktarim, toplam boyut ve zaman asimi siniri.
]]

Transfer = {}

local incoming = {} -- [src] = { [id] = { parts, got, total, bytes, t } }
local MAX_BYTES = math.max(Config.Limits.maxProjectBytes, Config.Limits.maxImageBytes) + 256 * 1024
local MAX_CHUNKS = math.ceil(MAX_BYTES / Config.Transfer.chunkSize) + 2
local MAX_CONCURRENT = 4
local TIMEOUT = 120 -- sn

RegisterNetEvent('loe_vd:tx', function(id, index, total, chunk)
    local src = source
    if type(id) ~= 'string' or #id > 40 or type(index) ~= 'number' or type(total) ~= 'number' or type(chunk) ~= 'string' then return end
    if total < 1 or total > MAX_CHUNKS or index < 1 or index > total then return end
    if #chunk > Config.Transfer.chunkSize + 64 then return end
    local mine = incoming[src]
    if not mine then
        mine = {}
        incoming[src] = mine
    end
    local tr = mine[id]
    if not tr then
        local n = 0
        for _ in pairs(mine) do n = n + 1 end
        if n >= MAX_CONCURRENT then return end
        tr = { parts = {}, got = 0, total = total, bytes = 0, t = os.time() }
        mine[id] = tr
    end
    if tr.total ~= total or tr.parts[index] then return end
    tr.bytes = tr.bytes + #chunk
    if tr.bytes > MAX_BYTES then
        mine[id] = nil
        return
    end
    tr.parts[index] = chunk
    tr.got = tr.got + 1
end)

--- Oyuncunun gonderdigi aktarimi bekle ve birlestir. Basarisizsa nil.
function Transfer.take(src, id, timeoutMs)
    if type(id) ~= 'string' then return nil end
    local deadline = GetGameTimer() + (timeoutMs or 60000)
    while GetGameTimer() < deadline do
        local tr = incoming[src] and incoming[src][id]
        if tr and tr.got >= tr.total then
            incoming[src][id] = nil
            return table.concat(tr.parts)
        end
        Wait(100)
    end
    if incoming[src] then incoming[src][id] = nil end
    return nil
end

local counter = 0
--- Veriyi oyuncuya parca parca gonder, aktarim kimligini dondur.
function Transfer.push(src, data)
    counter = counter + 1
    local id = ('s%x%x'):format(os.time(), counter)
    local size = Config.Transfer.chunkSize
    local total = math.max(1, math.ceil(#data / size))
    CreateThread(function()
        for i = 1, total do
            TriggerLatentClientEvent('loe_vd:rx', src, Config.Transfer.bps, id, i, total, data:sub((i - 1) * size + 1, i * size))
        end
    end)
    return id
end

--- Aktarim hatasini oyuncuya bildir (NUI bekliyorsa bosuna beklemesin).
function Transfer.fail(src, id, err)
    TriggerClientEvent('loe_vd:rxError', src, id, err or 'error')
end

AddEventHandler('playerDropped', function()
    incoming[source] = nil
end)

-- Yarim kalan aktarimlari temizle
CreateThread(function()
    while true do
        Wait(30000)
        local now = os.time()
        for src, list in pairs(incoming) do
            for id, tr in pairs(list) do
                if now - tr.t > TIMEOUT then list[id] = nil end
            end
            if not next(list) then incoming[src] = nil end
        end
    end
end)
