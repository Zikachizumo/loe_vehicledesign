--[[
    Framework koprusu (Qbox). Baska framework'e gecilirse sadece bu dosya degisir.
    Tum cagrilar pcall ile korunur: framework hazir degilse kaynak kirilmaz.
]]

Bridge = {}

local function qbxPlayer(src)
    local ok, p = pcall(function() return exports.qbx_core:GetPlayer(src) end)
    return ok and p or nil
end

function Bridge.citizenId(src)
    local p = qbxPlayer(src)
    return p and p.PlayerData and p.PlayerData.citizenid or nil
end

function Bridge.name(src)
    local p = qbxPlayer(src)
    local ci = p and p.PlayerData and p.PlayerData.charinfo
    if ci and ci.firstname then
        return ('%s %s'):format(ci.firstname, ci.lastname or '')
    end
    return GetPlayerName(src) or 'Bilinmeyen'
end

function Bridge.job(src)
    local p = qbxPlayer(src)
    local job = p and p.PlayerData and p.PlayerData.job
    if not job then return nil, 0 end
    local grade = type(job.grade) == 'table' and (job.grade.level or 0) or (tonumber(job.grade) or 0)
    return job.name, grade
end

--- Parayi hesap sirasina gore cekmeye calis (varsayilan Config.Print.accounts).
function Bridge.removeMoney(src, amount, reason, accounts)
    if amount <= 0 then return true end
    local p = qbxPlayer(src)
    if not p then return false end
    for _, acc in ipairs(accounts or Config.Print.accounts) do
        local balance = p.PlayerData.money and p.PlayerData.money[acc] or 0
        if balance >= amount then
            local ok, res = pcall(function() return p.Functions.RemoveMoney(acc, amount, reason) end)
            if ok and res ~= false then return true end
        end
    end
    return false
end

function Bridge.addMoney(src, amount, reason, account)
    if amount <= 0 then return end
    local p = qbxPlayer(src)
    if not p then return end
    pcall(function() p.Functions.AddMoney(account or Config.Print.accounts[1] or 'bank', amount, reason) end)
end

--- Tasarim yetkisi (studyo + magaza yonetimi). Config.Command izni ile ayni.
function Bridge.isDesigner(src)
    local name = Config.Command and Config.Command.name or 'kaplamastudyo'
    return IsPlayerAceAllowed(src, 'command.' .. name)
end

--- Plaka player_vehicles tablosunda kayitli mi? Kayitliysa sahibinin citizenid'si doner.
function Bridge.vehicleOwner(plate)
    local ok, row = pcall(MySQL.single.await, 'SELECT citizenid FROM player_vehicles WHERE TRIM(UPPER(plate)) = ? LIMIT 1', { plate })
    if ok and row then return row.citizenid end
    return nil
end

function Bridge.notify(src, msg, kind)
    TriggerClientEvent('ox_lib:notify', src, {
        title = 'Tasarım Stüdyosu',
        description = msg,
        type = kind or 'inform',
        position = 'top',
    })
end

function Bridge.trimPlate(plate)
    return (plate or ''):gsub('^%s+', ''):gsub('%s+$', ''):upper()
end
