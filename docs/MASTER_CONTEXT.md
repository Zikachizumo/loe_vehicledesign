# LoE Araç Tasarım Stüdyosu — MASTER CONTEXT

> Projenin **tek teknik referansı**. Yeni bir sohbet/geliştirici bunu okuyunca kaldığı yerden
> devam edebilmeli. Değişiklikler: [`CHANGELOG.md`](./CHANGELOG.md) · Plan: [`ROADMAP.md`](./ROADMAP.md)

Son güncelleme: 2026-09-29 (v1.2)

## 1. Amaç
Legends of Empire RP (Qbox) için oyun içi 3D kaplama editörü + **kaplama mağazası**.
Tasarım ekibi (yetkili) tasarlar ve fiyatla mağazaya ekler; **oyuncular stüdyoya erişemez**,
mağazada önizleyip parayla satın alır → araca takılır → (kayıtlı araçta) plakaya kalıcı kaydedilir.

## 2. Teknolojiler
| Katman | Teknoloji |
|---|---|
| Framework | Qbox (`qbx_core`), `ox_lib`, `oxmysql`, `ox_inventory` (bitirim_inventory forku) |
| NUI | React 19 + Vite 8 + TypeScript + Zustand + three.js r186 + SASS |
| Derleme | Bun (`cd web && bun run build`), **`web/build` commit edilir** |
| Oyun dokusu | DUI (`dui/index.html`) → `CreateRuntimeTextureFromDuiHandle` → `AddReplaceTexture` |

## 3. Klasör yapısı
```
fxmanifest.lua
config/  shared.lua (genel) · vehicles.lua (araçlar) · server.lua (sunucu-özel, YZ/import/webhook)
client/  transfer.lua · textures.lua (DUI + state bag + bakım döngüsü) · scanner.lua (tüm araç taraması)
         preview.lua (canlı oyun önizlemesi) · studio.lua (nokta/NUI) · fit.lua (takma/sökme) · api.lua (G menüsü exportları)
server/  bridge.lua (Qbox) · db.lua · transfer.lua · slots.lua · catalog.lua (tarama + katalog) · designs.lua
         fit.lua · remote.lua · main.lua
data/    vehicles_auto.json (tarama sonucu — sunucuda oluşur)
dui/     index.html  (tasarım görselini tam ekran çizen sayfa)
web/src  engine/ (belge, katman çizimi, araçlar, geçmiş, sıçrama, dolgu, çıkartma)
         three/  (Scene3D, demo araç, UV şablon üretimi) · components/ · store.ts · actions.ts · nui.ts
assets/  models/*.glb · uv/*.png · thumbs/*.png  (sunucu sahibi ekler, build gerekmez)
install/ ox_inventory item tanımı + ikonlar
sql/     install.sql
```

## 4. Veri akışı
- **Aç**: `/kaplamastudyo` (veya `Config.Studios` noktası) → `loe_vd:server:open` (`Bridge.isDesigner` =
  `command.kaplamastudyo` ace + mesafe/meslek doğrulanır, **oturum** açılır) → NUI `open`.
  `guarded` uçları her istekte oturum **ve** yetkiyi yeniden kontrol eder.
- **Mağaza** (`server/shop.lua`, `client/shop.lua`): `Config.Shops` noktası → `loe_vd:server:shopList(netId)`
  (yakınlık, araç mesafesi, model → `published = 1` tasarımlar, latent) → ox_lib context menü.
  Önizleme: `Liveries.previewOn` (slot 1 geçici yönlendirme, sadece alıcının ekranında).
  `loe_vd:server:shopBuy(id, netId)`: hız sınırı → yayında mı → `'fit'`: `Fit.fitDesign`
  (`before` = para çek, `rollback` = iade) / `'item'`: para çek → `Designs.giveDesignItem` →
  `sales + 1`, log, `ServerConfig.OnPurchase`.
- **Yayın**: bas isteğinde `publish/shopPrice/giveItem`; sonradan `loe_vd:server:setListing(id, price, published)`.
- **Büyük veri**: NUI→Lua `upload` (256KB parça) → Lua→sunucu `loe_vd:tx` (latent, 128KB) →
  `Transfer.take`. Ters yön: `Transfer.push` → `loe_vd:rx` → NUI `download` parçaları.
  Zarf biçimi: kaydet = `önizleme\nJSON`, bas = `önizleme\nikon\ngörsel`.
- **Kaydet/Aç/Sil**: `loe_vd_projects` (JSON: katmanlar; raster katmanlar PNG dataURL).
- **Bas**: görsel (webp, saydam) `loe_vd_designs`'a, eşya `loe_livery` metadata:
  `designId, model, vehicle, designer, label, description, imageurl(küçük)`.
- **Tak**: item client export → ilerleme → `loe_vd:server:fit` (eşya slotu, mesafe, model
  doğrulama) → `Slots.acquire` → `Entity(veh).state.loe_livery = {d, s, m, p}` →
  kayıtlıysa `loe_vd_vehicles` (plaka).
- **Görünme**: her istemci state bag'i görünce tasarımı ister (`getDesign` → latent),
  DUI'ye çizer, `AddReplaceTexture(txd(slot), texture(slot), 'loe_vd_rt', tex)`. Aracın
  **network sahibi** livery index'ini (`SetVehicleMod 48` / `SetVehicleLivery`) ve isteğe
  bağlı boyayı uygular. 45 sn görülmeyen doku boşaltılır; en fazla 24 doku.
- **Geri yükleme**: `entityCreated` + plaka eşleşmesi (8 sn dener); kaynak yeniden
  başlarsa tüm araçlar taranır.

## 4.5 Araç kataloğu ve canlı önizleme
- **Tarama** (`client/scanner.lua`): `GetAllVehicleModels()` → her model yerel/görünmez oluşturulur;
  `GetVehicleLiveryCount`, `GetNumVehicleMods(48)`, doku adı kalıpları `GetTextureResolution` ile
  denenir. Sonuç `loe_vd:server:scanResult` → `data/vehicles_auto.json` (SaveResourceFile).
- **Katalog** (`server/catalog.lua`): elle tanımlar + tarama birleşir; destekliler `Config.Vehicles`'a
  girer. İstemciler livery tanımlarını `loe_vd:server:liveryDefs` ile alır (tarama sonrası
  `loe_vd:client:defsUpdated` ile yenilenir). Kütüphane listesi stüdyo açılışında latent gider.
- **Canlı önizleme** (`client/preview.lua`): seçili aracın yerel kopyası oyuncunun önünde,
  yörünge kamera (`previewCam`), ayrı DUI dokusu modelin **son slotuna** geçici yönlendirilir
  (`Liveries.override/restore`). NUI 'OYUNDA' modunda çalışma alanı şeffaf; tasarım 1024px webp
  olarak ~0.65 sn aralıkla gönderilir (`previewImage`). Kamera, şeffaf alanın ekran merkezine
  göre kaydırılır (`previewOffset`).
- **UV ızgarası** (`engine/grid.ts`): A1..H8 hücreleri UV tuvalinde ve önizleme dokusunda aynı yerde.

## 5. Slot sistemi
`AddReplaceTexture` model başına geçerli → her farklı tasarım modelin ayrı livery slotuna.
Sunucu slotları global dağıtır (`server/slots.lua`): aynı tasarım aynı slotu paylaşır; boş
slot yoksa aracı kalmamış slot geri alınır; hiçbiri yoksa takma reddedilir. Dağıtım **sondan
başa** yapılır (düşük numaralı liveryler oyunda daha sık kullanılır). Kütüphane
kartında `boş/toplam slot` gösterilir.

## 6. NUI mimarisi
- `engine/doc.ts` `LiveryDoc`: katmanlar + `rasters` (katman id → tuval) + `out` (saydam
  kaplama) + `preview` (alt boya + kaplama, 3D doku/UV görünümü).
- Koordinatlar **doku pikseli** (0..size). UV (u,v) → (u·size, v·size), glTF kuralı (flipY=false).
- Katman tipleri: fill, gradient, raster, image, text, shape, splat. Konumlu katmanlar
  merkez + boyut + döndürme + ayna; efektler (gölge/parıltı/kontur) ayrı tuvalden birleştirilir.
- Geçmiş: her adım katman anlık görüntüsü; raster değişiklikleri **kirli dikdörtgen yaması**
  (önce/sonra) olarak tutulur. En fazla 60 adım.
- 3D: `Scene3D` ışın atar, `hit.uv` (veya `uv1`) → belge noktası → aynı araç işleyicisi.
  UV şablonu ve **ada maskesi** (panel dolgusu) GLB geometrisinden üretilir.

## 7. Güvenlik
Sunucu-otoriter: stüdyo sadece `command.kaplamastudyo` izinlilere; tüm stüdyo istekleri oturum + yetki ister;
mağazada fiyat/yayın durumu sunucudaki satırdan okunur (istemci fiyatı gönderemez), para önce çekilir,
başarısızlıkta iade; eşya slotu/metadata sunucuda okunur; araç
mesafe + model kontrolü; boyut sınırları; oyuncu başına eş zamanlı aktarım sınırı; URL içe
aktarmada iç ağ adresleri engellenir ve dosya imzası kontrol edilir; YZ anahtarı convar'da.

## 8. Kod standartları
- Lua: yorumlar Türkçe ASCII, olaylar `loe_vd:client:*` / `loe_vd:server:*`, framework
  çağrıları `server/bridge.lua`'da ve pcall'lı.
- TS: arayüz metinleri **sadece** `web/src/i18n.ts`'de; sınıf adları kısa ve bileşen bazlı.
- Commit: `feat:`, `fix:`, `docs:`, `chore:` önekleri, Türkçe gövde.

## 9. Test durumu
- NUI: tarayıcıda (Playwright + demo araç) tüm araçlar, 3D boyama, panel dolgusu, UV,
  kaydet/aç, bas, YZ (sahte), geçmiş test edildi.
- Lua: Lua 5.4 ile sözdizimi; slot dağıtıcı ve base64 birim testleri.
- Tarama doku adı kalıbı ve slot dağıtıcı birim testleri.
- **Oyun içi test henüz yapılmadı** (bkz. ROADMAP "Doğrulanacaklar").
