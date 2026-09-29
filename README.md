# LoE Araç Tasarım Stüdyosu (`loe_vehicledesign`)

**Legends of Empire RP** için oyun içi **3D araç kaplama (livery) editörü** — FiveM / **Qbox**.

**Tasarım ekibi (yetkililer)** stüdyoda aracı seçer, 3D model üzerinde doğrudan (veya UV
şablonunda hassas) boyar ve kaplamayı **fiyat vererek mağazaya ekler**. **Oyuncular stüdyoya
erişemez**: aracını Benny's'teki **Kaplama Mağazası**'na getirir, araca uyan kaplamaları görür,
**önizler** ve **parayla satın alır** — kaplama aracına takılır. Kayıtlı araçlarda kaplama plakaya
**kalıcı** kaydedilir.

> Akış: **Yetkili: SEÇ → TASARLA → MAĞAZAYA EKLE** · **Oyuncu: MAĞAZA → ÖNİZLE → SATIN AL → SÜR**

## Özellikler

- **3D doğrudan boyama** (three.js): araca tıklayınca boya tam o noktaya (UV'ye) düşer.
  Kamera açıları: 3/4, ön, yan, arka, diğer yan, üst.
- **UV hassas tuval**: yakınlaştır/kaydır, UV şablonu (GLB'den otomatik üretilir),
  seçili katmanda taşı / boyutlandır / döndür tutamaçları.
- **Araçlar**: Seç, Fırça (yuvarlak/markör/kare/sprey), Sıçrat (boya fırlatma — her atış ayrı katman),
  Silgi, Dolgu (bölge / **panel** — tek kaporta parçası / tüm yüzey), Yazı (font yükleme dahil),
  Şekil (12 şekil), Kalem, Renk geçişi, Görsel (dosya + **URL'den içe aktarma**), Çıkartma
  (LoE için çizilmiş hazır desenler), Klon, Karıştır, Damlalık, Efekt (gölge/parıltı/kontur),
  Boya (alt boya + parlak/metalik/sedef/mat/fırçalı/krom), Geçmiş, **Yapay zekâ** (isteğe bağlı).
- **Katmanlar**: sürükle-bırak sıralama, göster/gizle, kilit, çoğalt, sil, ad değiştir,
  opaklık, 16 karışım modu, ayna, konum/boyut/döndürme.
- **Geri al / ileri al** (raster değişiklikleri yama olarak tutulur, bellek dostu).
- **Projeler**: kaydet / aç / sil (Tasarımlarım); basılanların **fiyatını değiştir / mağazadan kaldır**,
  satış sayısını gör, istersen eşya olarak al.
- **Kaplama Mağazası** (oyuncular): araca uyan satıştaki kaplamalar, 15 sn **önizleme** (sadece
  alıcı görür), onaylı satın alma (banka → nakit). Başarısız takmada para **iade** edilir.
  `mode = 'fit'` (hemen takılır) veya `'item'` (envantere eşya verilir).
- **Gerçek para satışı (Tebex)**: tasarım "GERÇEK PARA (TEBEX)" olarak işaretlenir; oyuncu Tebex'ten
  alır, e-postadaki kodu oyunda girer, kaplama karakterine bağlanır (devredilemez) ve ücretsiz takılır.
  İade/chargeback otomatik geri alır. Kurallar ve kurulum: [`docs/GERCEK_PARA_TEBEX.md`](docs/GERCEK_PARA_TEBEX.md)
- **Oyunda**: tasarım DUI → runtime texture → `AddReplaceTexture` ile modelin livery slotuna
  basılır; sunucu slotları global dağıtır, böylece aynı modelde aynı anda farklı tasarımlar görünür.
- Kalıcılık: `player_vehicles`'ta kayıtlı araçlarda plaka bazlı; garajdan çıkınca otomatik geri gelir.
- **Tüm GTA V araçları**: `/kaplamatarama` oyundaki her aracı (sunucu oyun sürümü + eklentiler) tarar,
  adını/markasını/sınıfını ve kaplama slotlarını bulur; kütüphane otomatik dolar.
- **Oyunda canlı önizleme**: 3D model dosyası olmayan araçlarda gerçek araç oyunda gösterilir,
  tasarım anında üzerine basılır; **UV ızgarası** ile hangi bölgenin nereye denk geldiği görülür.
- Basma ücretsiz (ayarlanabilir); G menüsü gibi kendi menüleriniz için hazır istemci exportları.
- Türkçe arayüz, tema seçenekleri (`empire` altın, `crimson`, `magenta`, `emerald`, `ice`).

## Gereksinimler

`ox_lib`, `oxmysql`, `ox_inventory` (bitirim_inventory forku dahil), `qbx_core`, OneSync.
İsteğe bağlı: `ox_target`.

## Kurulum

1. Bu klasörü `resources/[loe]/loe_vehicledesign` olarak koy.
2. `server.cfg`:
   ```cfg
   ensure ox_lib
   ensure oxmysql
   ensure qbx_core
   ensure ox_inventory
   ensure loe_vehicledesign
   ```
3. **Envanter eşyaları** — `install/ox_inventory/items.lua` içeriğini ox_inventory'nin
   `data/items.lua` dosyasına ekle; `install/ox_inventory/web/images/*.png` dosyalarını
   `ox_inventory/web/images/` içine kopyala.
4. Veritabanı tabloları açılışta otomatik oluşur (`sql/install.sql` elle kurulum için).
5. **Araçları ekle**: oyunda yetkili olarak **`/kaplamatarama`** yaz (bir kez; yeni DLC/araç eklenince
   tekrar). Tüm araçlar kütüphaneye gelir. Otomatik bulunamayanlar ve eklenti araçlar için:
   `config/vehicles.lua` + `assets/` → [`docs/ARAC_HAZIRLAMA.md`](docs/ARAC_HAZIRLAMA.md)
6. (İsteğe bağlı) Yapay zekâ: `set loe_vd_ai_key "sk-..."` (server.cfg). Anahtar yoksa YZ aracı gizlenir.
7. (İsteğe bağlı) Discord log: `set loe_vd_webhook "https://discord.com/api/webhooks/..."`

## Kullanım

- **Tasarım (sadece yetkili):** `/kaplamastudyo` → tasarla → **KAPLAMAYI BAS** → "MAĞAZADA SAT" açık +
  satış fiyatı → mağazaya eklenir. Fiyat değiştirmek / kaldırmak: Kütüphane → TASARIMLARIM →
  kartta **MAĞAZA**.
- **Yetki:** stüdyoyu `command.kaplamastudyo` izni olan açar (varsayılan `group.admin`).
  Admin olmayan bir tasarımcıya vermek için `server.cfg`:
  `add_ace identifier.fivem:123456 command.kaplamastudyo allow`
- **Oyuncu:** aracını haritadaki **LoE Kaplama Mağazası**'na (Benny's) getir → `[E]` → kaplama seç →
  Önizle / Satın al. (İçindeyken veya yanında durarak.)
- **Gerçek para:** Tebex kurulumu, kurallar (sadece Tebex, marka/logo yok, coin yok) →
  [`docs/GERCEK_PARA_TEBEX.md`](docs/GERCEK_PARA_TEBEX.md). Oyuncu kodu: `/kaplamakod tbx-...`
- Diğer yetkili komutları: `/kaplamasok` (en yakın araçtaki kaplamayı kaldırır), `/kaplamatarama`
  (tüm araçları tarar).
- **Kaplama Sökücü** eşyası ile kaplama sökülür; `'item'` modunda satılan **Araç Kaplaması** eşyası
  aracın yanında kullanılarak takılır.
- Ayarlar: `config/shared.lua` → `Config.Shops` (konum/blip), `Config.Shop` (mode, onlyOwnVehicles,
  accounts, previewSeconds, defaultPrice). Satış kancası: `config/server.lua` → `ServerConfig.OnPurchase`
  (örn. tasarımcıya / şirkete pay).

## Dışa açık API

```lua
-- server
exports.loe_vehicledesign:ApplyDesign(vehicle, designId)   -- true/false
exports.loe_vehicledesign:RemoveDesign(vehicle)
exports.loe_vehicledesign:RestoreDesign(vehicle)           -- plakadan geri yükle
exports.loe_vehicledesign:GetVehicleDesign(vehicle)        -- designId | nil
exports.loe_vehicledesign:OpenStudioFor(source)
-- client
exports.loe_vehicledesign:OpenStudio()                     -- yetkisizde sunucu reddeder
exports.loe_vehicledesign:OpenShop()                       -- kaplama mağazası menüsü (mağaza noktasında)
exports.loe_vehicledesign:IsStudioOpen()
-- client: kendi araç menün (G tuşu vb.) için — ayrıntı: docs/G_MENUSU.md
exports.loe_vehicledesign:OpenLiveryMenu(vehicle)          -- hazır "Kaplama" alt menüsü
exports.loe_vehicledesign:GetLiveriesForVehicle(vehicle)   -- bu araca uyan kaplama eşyaları
exports.loe_vehicledesign:FitLivery(vehicle, slot)         -- takar (ilerleme + sunucu doğrulaması)
exports.loe_vehicledesign:RemoveLivery(vehicle)            -- sökücü ile söker
exports.loe_vehicledesign:GetVehicleLivery(vehicle)        -- takılı tasarım kodu | nil
```

## Geliştirme (arayüz)

```bash
cd web
bun install
bun run start     # tarayıcıda demo araçla çalışır (Lua gerekmez)
bun run build     # web/build/ üretir — ÇIKTIYI COMMIT ET (sunucuda build yok)
```

Belgeler: [`docs/MASTER_CONTEXT.md`](docs/MASTER_CONTEXT.md) · [`docs/VIDEO_ANALIZI.md`](docs/VIDEO_ANALIZI.md) ·
[`docs/G_MENUSU.md`](docs/G_MENUSU.md) · [`docs/ROADMAP.md`](docs/ROADMAP.md) · [`docs/CHANGELOG.md`](docs/CHANGELOG.md)
