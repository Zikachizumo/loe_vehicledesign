--[[
    Istemci tarafi buyuk veri aktarimi.
      Transfer.send(data)          -> sunucuya latent parcalar, kimlik doner
      Transfer.await(id, timeout)  -> sunucudan gelen veriyi bekle
      Transfer.toNui(id, data)     -> NUI'ye 'download' mesajlariyla ilet
]]

Transfer = {}

local received = {} -- [id] = { parts, got, total, err }
local counter = 0

RegisterNetEvent('loe_vd:rx', function(id, index, total, chunk)
    local r = received[id]
    if not r then
        r = { parts = {}, got = 0, total = total, t = GetGameTimer() }
        received[id] = r
    end
    if not r.parts[index] then
        r.parts[index] = chunk
        r.got = r.got + 1
    end
end)

RegisterNetEvent('loe_vd:rxError', function(id, err)
    received[id] = received[id] or { parts = {}, got = 0, total = 1 }
    received[id].err = err
end)

function Transfer.send(data)
    counter = counter + 1
    local id = ('c%x%x'):format(GetGameTimer(), counter)
    local size = Config.Transfer.chunkSize
    local total = math.max(1, math.ceil(#data / size))
    for i = 1, total do
        TriggerLatentServerEvent('loe_vd:tx', Config.Transfer.bps, id, i, total, data:sub((i - 1) * size + 1, i * size))
    end
    return id
end

function Transfer.await(id, timeoutMs)
    local deadline = GetGameTimer() + (timeoutMs or 60000)
    while GetGameTimer() < deadline do
        local r = received[id]
        if r then
            if r.err then
                received[id] = nil
                return nil, r.err
            end
            if r.got >= r.total then
                received[id] = nil
                return table.concat(r.parts)
            end
        end
        Wait(50)
    end
    received[id] = nil
    return nil, 'timeout'
end

-- Zaman asimindan sonra gelen / kimsenin beklemedigi aktarimlari bellekte tutma
CreateThread(function()
    while true do
        Wait(60000)
        local now = GetGameTimer()
        for id, r in pairs(received) do
            if r.t and now - r.t > 300000 then received[id] = nil end
        end
    end
end)

local NUI_CHUNK = 256 * 1024
function Transfer.toNui(id, data)
    local total = math.max(1, math.ceil(#data / NUI_CHUNK))
    for i = 1, total do
        SendNUIMessage({ action = 'download', data = { id = id, index = i, total = total, data = data:sub((i - 1) * NUI_CHUNK + 1, i * NUI_CHUNK) } })
    end
end

function Transfer.nuiError(id, err)
    SendNUIMessage({ action = 'downloadError', data = { id = id, error = err or 'error' } })
end

--- Sunucudan gelen aktarimi arka planda bekleyip NUI'ye ilet.
function Transfer.forward(id, timeoutMs)
    CreateThread(function()
        local data, err = Transfer.await(id, timeoutMs)
        if data then Transfer.toNui(id, data) else Transfer.nuiError(id, err) end
    end)
end
