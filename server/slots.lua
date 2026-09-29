--[[
    Livery slot dagitimi.
    AddReplaceTexture istemcide MODEL basina gecerlidir; ayni modelde ayni anda
    farkli tasarimlar gostermek icin her tasarim modelin ayri bir livery slotuna
    yerlestirilir. Sunucu slotlari global yonetir, boylece tum oyuncular ayni
    araci ayni slot/dokuyla gorur.
]]

Slots = {}

local models = {} -- [model] = { [slot] = { design = id, refs = { [entity] = true } } }
local byEntity = {} -- [entity] = { model, slot }

local function modelSlots(model)
    local def = Config.Vehicles[model]
    if not def then return nil end
    local m = models[model]
    if not m then
        m = {}
        for i = 1, def.slots or 1 do m[i] = { design = nil, refs = {} } end
        models[model] = m
    end
    return m
end

local function refCount(s)
    local n = 0
    for ent in pairs(s.refs) do
        if DoesEntityExist(ent) then n = n + 1 else s.refs[ent] = nil end
    end
    return n
end

--- Tasarim icin slot ayir (varsa ayni tasarimin slotunu paylas).
function Slots.acquire(model, designId)
    local m = modelSlots(model)
    if not m then return nil end
    for i, s in ipairs(m) do
        if s.design == designId then return i end
    end
    -- Sondan basa: dusuk numarali liveryler oyunda daha sik kullanilir, cakismayi azalt.
    for i = #m, 1, -1 do
        if not m[i].design then
            m[i].design = designId
            return i
        end
    end
    for i = #m, 1, -1 do
        if refCount(m[i]) == 0 then
            m[i].design = designId
            m[i].refs = {}
            return i
        end
    end
    return nil
end

function Slots.bind(entity, model, slot)
    Slots.unbind(entity)
    local m = modelSlots(model)
    if not m or not m[slot] then return end
    m[slot].refs[entity] = true
    byEntity[entity] = { model = model, slot = slot }
end

function Slots.unbind(entity)
    local b = byEntity[entity]
    if not b then return end
    local m = models[b.model]
    if m and m[b.slot] then m[b.slot].refs[entity] = nil end
    byEntity[entity] = nil
end

function Slots.free(model)
    local def = Config.Vehicles[model]
    if not def then return 0, 0 end
    local m = models[model]
    if not m then return def.slots or 1, def.slots or 1 end
    local used = 0
    for _, s in ipairs(m) do
        if s.design and refCount(s) > 0 then used = used + 1 end
    end
    return (def.slots or 1) - used, def.slots or 1
end

AddEventHandler('entityRemoved', function(entity)
    if byEntity[entity] then Slots.unbind(entity) end
end)
