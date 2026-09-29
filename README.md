# LoE Araç Tasarım Stüdyosu (`loe_vehicledesign`)

**Legends of Empire RP** için oyun içi **3D araç kaplama (livery) editörü** — FiveM / **Qbox**.

Oyuncu stüdyoda aracını seçer, 3D model üzerinde doğrudan (veya UV şablonunda hassas)
boyar, kaplamayı **modele kilitli bir envanter eşyası** olarak basar, sonra eşyayı aracın
yanında kullanarak kaplamayı takar. Kayıtlı araçlarda kaplama plakaya **kalıcı** kaydedilir.

> Akış: **01 SEÇ → 02 TASARLA → 03 TAK → 04 SÜR**

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
- **Projeler**: kaydet / aç / sil (Tasarımlarım), basılanları **tekrar bas**.
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

- Stüdyo: haritadaki **LoE Tasarım Stüdyosu** (varsayılan Benny's) → `[E]`.
- Yetkili: `/kaplamastudyo` (her yerden açar), `/kaplamasok` (en yakın araçtaki kaplamayı kaldırır),
  `/kaplamatarama` (tüm araçları tarar).
- Oyuncu: envanterdeki **Araç Kaplaması** eşyasını aracın yanında kullan.
  **Kaplama Sökücü** ile kaplama sökülür.

## Dışa açık API

```lua
-- server
exports.loe_vehicledesign:ApplyDesign(vehicle, designId)   -- true/false
exports.loe_vehicledesign:RemoveDesign(vehicle)
exports.loe_vehicledesign:RestoreDesign(vehicle)           -- plakadan geri yükle
exports.loe_vehicledesign:GetVehicleDesign(vehicle)        -- designId | nil
exports.loe_vehicledesign:OpenStudioFor(source)
-- client
exports.loe_vehicledesign:OpenStudio()
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
