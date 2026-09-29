--[[
    Gercek para satisi — SADECE Tebex (Cfx.re PLA: baska odeme yolu yasak).

    Tebex paketi satin alininca sunucu konsolunda calisir:
        loe_tebex_kaplama {transaction} ABC23456 [DEF34567 ...]
    Iade / chargeback olunca:
        loe_tebex_iade {transaction}

    Oyuncu e-postasindaki islem kodunu oyunda girer (/kaplamakod veya magaza menusu):
    kaplama KARAKTERINE baglanir (esya verilmez, devredilemez, oyun parasina cevrilemez)
    ve magazada kendi aracina ucretsiz takilir.
]]

Tebex = {}

local function normTx(tx)
    if type(tx) ~= 'string' then return nil end
    tx = tx:lower():gsub('%s+', '')
    if #tx < 6 or #tx > 64 or not tx:match('^[%w%-]+$') then return nil end
    return tx
end

local function normId(id)
    id = tostring(id or ''):upper():gsub('^#', '')
    if #id < 4 or #id > 12 or not id:match('^[%w]+$') then return nil end
    return id
end

--- Karakter bu tasarima sahip mi (Tebex ile alinmis)?
function Tebex.owns(cid, designId)
    if not cid or not designId then return false end
    return MySQL.scalar.await('SELECT 1 FROM loe_vd_owned WHERE citizenid = ? AND design_id = ?', { cid, designId }) ~= nil
end

-- ---------------- Tebex konsol komutlari ----------------

RegisterCommand(ServerConfig.Tebex.grantCommand, function(src, args)
    if src ~= 0 then return end -- sadece sunucu konsolu (Tebex); yetkili oyuncular bile calistiramaz
    local tx = normTx(args[1])
    if not tx or #args < 2 then
        return print(('[loe_vd] Kullanim: %s {transaction} TASARIMKODU [...]'):format(ServerConfig.Tebex.grantCommand))
    end
    DB.waitReady()
    local added, labels = 0, {}
    for i = 2, #args do
        local id = normId(args[i])
        local row = id and MySQL.single.await('SELECT id, label FROM loe_vd_designs WHERE id = ?', { id })
        if row then
            added = added + (MySQL.update.await('INSERT IGNORE INTO loe_vd_purchases (tx, design_id) VALUES (?, ?)', { tx, row.id }) or 0)
            labels[#labels + 1] = ('"%s" (#%s)'):format(row.label, row.id)
        else
            print(('[loe_vd] Tebex %s: bilinmeyen tasarim kodu "%s" — paket komutunu kontrol et'):format(tx, tostring(args[i])))
        end
    end
    print(('[loe_vd] Tebex %s: %d kaplama kodu kullanima hazir'):format(tx, added))
    if added > 0 then Designs.log(0, ('💳 Tebex satışı `%s`: %s'):format(tx, table.concat(labels, ', '))) end
end, true)

RegisterCommand(ServerConfig.Tebex.revokeCommand, function(src, args)
    if src ~= 0 then return end
    local tx = normTx(args[1])
    if not tx then return print(('[loe_vd] Kullanim: %s {transaction}'):format(ServerConfig.Tebex.revokeCommand)) end
    DB.waitReady()
    local rows = MySQL.query.await('SELECT design_id, citizenid, status FROM loe_vd_purchases WHERE tx = ?', { tx }) or {}
    MySQL.update.await("UPDATE loe_vd_purchases SET status = 'revoked' WHERE tx = ?", { tx })
    local removed = 0
    for _, r in ipairs(rows) do
        if r.status == 'redeemed' and r.citizenid then
            -- ayni tasarimi baska gecerli bir odemeyle de aldiysa sahiplik o odemeye gecer
            local other = MySQL.scalar.await(
                "SELECT tx FROM loe_vd_purchases WHERE citizenid = ? AND design_id = ? AND status = 'redeemed' AND tx <> ? LIMIT 1",
                { r.citizenid, r.design_id, tx })
            if other then
                MySQL.update.await('UPDATE loe_vd_owned SET tx = ? WHERE citizenid = ? AND design_id = ?', { other, r.citizenid, r.design_id })
            else
                MySQL.update.await('DELETE FROM loe_vd_owned WHERE citizenid = ? AND design_id = ?', { r.citizenid, r.design_id })
                removed = removed + Fit.revokeDesign(r.citizenid, r.design_id)
            end
        end
    end
    print(('[loe_vd] Tebex %s iptal edildi (%d kayit, %d aractan kaplama kaldirildi)'):format(tx, #rows, removed))
    if #rows > 0 then Designs.log(0, ('↩️ Tebex iade/chargeback `%s`: %d kaplama geri alındı'):format(tx, #rows)) end
end, true)

-- ---------------- Oyuncu: kod kullanma ----------------

local lastTry = {}
AddEventHandler('playerDropped', function() lastTry[source] = nil end)

function Tebex.redeem(src, code)
    local now = GetGameTimer()
    if lastTry[src] and now - lastTry[src] < 3000 then return { ok = false, message = 'Biraz bekle ve tekrar dene' } end
    lastTry[src] = now
    local cid = Bridge.citizenId(src)
    if not cid then return { ok = false, message = 'Karakter yüklenmedi' } end
    local tx = normTx(code)
    if not tx then return { ok = false, message = 'Geçersiz kod (örn. tbx-1234abcd-ef56)' } end
    local rows = MySQL.query.await(
        'SELECT p.design_id, p.status, d.label FROM loe_vd_purchases p LEFT JOIN loe_vd_designs d ON d.id = p.design_id WHERE p.tx = ?',
        { tx }) or {}
    if #rows == 0 then
        return { ok = false, message = 'Kod bulunamadı. Ödemeyi yeni yaptıysan birkaç dakika sonra tekrar dene.' }
    end
    for _, r in ipairs(rows) do
        if r.status == 'revoked' then return { ok = false, message = 'Bu satın alma iade/iptal edilmiş' } end
    end
    -- tek UPDATE ile sahiplen: ayni anda iki kisi denerse sadece biri kazanir
    local n = MySQL.update.await(
        "UPDATE loe_vd_purchases SET status = 'redeemed', citizenid = ?, redeemed_at = NOW() WHERE tx = ? AND status = 'pending'",
        { cid, tx }) or 0
    if n == 0 then return { ok = false, message = 'Bu kod zaten kullanılmış' } end
    MySQL.update.await(
        "INSERT IGNORE INTO loe_vd_owned (citizenid, design_id, tx) SELECT citizenid, design_id, tx FROM loe_vd_purchases WHERE tx = ? AND citizenid = ? AND status = 'redeemed'",
        { tx, cid })
    MySQL.update.await(
        "UPDATE loe_vd_designs SET sales = sales + 1 WHERE id IN (SELECT design_id FROM loe_vd_purchases WHERE tx = ? AND citizenid = ?)",
        { tx, cid })
    local names = {}
    for _, r in ipairs(rows) do names[#names + 1] = r.label or ('#' .. r.design_id) end
    Designs.log(src, ('🎟️ **%s** Tebex kodunu kullandı `%s`: %s'):format(Bridge.name(src), tx, table.concat(names, ', ')))
    return {
        ok = true,
        message = ('%s hesabına eklendi. Aracını Kaplama Mağazası\'na getir ve ücretsiz tak.'):format(table.concat(names, ', ')),
    }
end

lib.callback.register('loe_vd:server:redeem', function(src, code) return Tebex.redeem(src, code) end)

if Config.Tebex.enabled and Config.Tebex.redeemCommand then
    lib.addCommand(Config.Tebex.redeemCommand, {
        help = 'Tebex\'ten aldığın kaplamanın işlem kodunu kullan',
        params = { { name = 'kod', type = 'string', help = 'E-postadaki işlem kodu (tbx-...)' } },
    }, function(src, args)
        local res = Tebex.redeem(src, args.kod)
        Bridge.notify(src, res.message, res.ok and 'success' or 'error')
    end)
end
