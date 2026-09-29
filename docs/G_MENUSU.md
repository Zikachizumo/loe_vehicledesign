# Kendi araç menünden kaplama (G tuşu vb.)

Envanterden kullanmaya ek olarak, ileride yapacağın **G tuşuyla açılan araç menüsüne**
(araç bilgisi, motor bilgisi…) "Kaplama" seçeneğini tek satırla bağlayabilirsin.
Tüm doğrulamalar (eşya gerçekten sende mi, araç bu model mi, mesafe) yine sunucuda yapılır.

## En kolay yol: hazır alt menü

```lua
-- G menünde (ox_lib context) bir seçenek:
{
    title = 'Kaplama',
    icon = 'paint-roller',
    onSelect = function()
        exports.loe_vehicledesign:OpenLiveryMenu(vehicle, 'benim_arac_menum') -- 2. parametre: geri dönülecek menü id'si (isteğe bağlı)
    end,
},
```

Açılan menü: bu araca uyan kaplamalar (ad, tasarımcı, kod) → seçince ilerleme çubuğu ve takma.
Araçta kaplama varsa **Kaplamayı Sök** seçeneği de çıkar (Kaplama Sökücü gerekir).

## Kendi arayüzünle

```lua
local list = exports.loe_vehicledesign:GetLiveriesForVehicle(vehicle)
-- list[i] = { slot, label, designer, designId, vehicle, image }

local ok, msg = exports.loe_vehicledesign:FitLivery(vehicle, list[1].slot)
local ok, msg = exports.loe_vehicledesign:RemoveLivery(vehicle)
local code = exports.loe_vehicledesign:GetVehicleLivery(vehicle) -- takılıysa tasarım kodu
```

Notlar:
- Oyuncu araçtan inmiş ve araca `Config.Fit.distance` (3.5 m) kadar yakın olmalı.
- Envanterden kullanmayı kapatmak istersen `install/ox_inventory/items.lua` içindeki
  `client.export` satırlarını kaldırman yeterli; menü yolu çalışmaya devam eder.
