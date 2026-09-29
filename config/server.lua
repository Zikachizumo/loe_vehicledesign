--[[
    LoE Arac Tasarim Studyosu - SADECE SUNUCU AYARLARI
    API anahtarlarini BURAYA YAZMA: server.cfg'de convar olarak ver:
        set loe_vd_ai_key "sk-..."
]]

ServerConfig = {}

-- Yapay zeka ile desen uretimi. Anahtar yoksa otomatik kapali kalir.
ServerConfig.AI = {
    enabled = true, -- anahtar tanimliysa acik
    provider = 'openai', -- 'openai' | 'custom'
    endpoint = 'https://api.openai.com/v1/images/generations',
    model = 'gpt-image-1',
    size = '1024x1024',
    cooldown = 45, -- sn (oyuncu basina)
    price = 0, -- her uretim icin ucret (0 = ucretsiz)
    ace = nil, -- ornek: 'loe.vehicledesign.ai' -> sadece bu izni olanlar
    -- Uretilen gorselin aracin UV'sine yayilabilecek desen olmasi icin istem oneki
    promptPrefix = 'Seamless flat 2D vehicle livery wrap texture, graphic design only, no car, no background scenery, high contrast, print ready. Design: ',
}

-- URL'den gorsel ice aktarma (sunucu vekili)
ServerConfig.Import = {
    enabled = true,
    cooldown = 5,
    -- Bos birakilirsa her alan adina izin verilir. Ornek: { 'i.imgur.com', 'cdn.discordapp.com' }
    allowedHosts = {},
}

-- Magaza satisi sonrasi (istege bagli): gelir bir sirket/meslek kasasina gitsin vb.
-- Ornek (Renewed-Banking): function(src, sale) exports['Renewed-Banking']:addAccountMoney('bennys', sale.price) end
ServerConfig.OnPurchase = nil

-- Tebex paket komutlari (SUNUCU KONSOLUNDA calisir; oyuncular calistiramaz).
-- Paket satin alma komutu :  loe_tebex_kaplama {transaction} TASARIMKODU [TASARIMKODU2 ...]
-- Iade/chargeback komutu  :  loe_tebex_iade {transaction}
ServerConfig.Tebex = {
    grantCommand = 'loe_tebex_kaplama',
    revokeCommand = 'loe_tebex_iade',
}

-- Discord webhook (basilan kaplamalari loglamak icin). Bos = kapali.
ServerConfig.Webhook = GetConvar('loe_vd_webhook', '')
