# Araç Hazırlama Rehberi

## 0) Önce: tüm araçları otomatik tara (orijinal GTA V araçları)

Oyunda yetkili olarak **`/kaplamatarama`** yaz (veya stüdyo kütüphanesindeki
**TÜM ARAÇLARI TARA** düğmesi). Tarama sunucunun oyun sürümündeki (`sv_enforceGameBuild`) ve
eklenti olarak yüklü **her aracı** sırayla görünmez şekilde yükler ve şunları bulur:

- ad, marka, sınıf (kütüphane kategorisi)
- kaç livery'si (`SetVehicleLivery`) ve kaç livery modu (`SetVehicleMod 48`) olduğu
- livery doku adını bilinen adlandırma kalıplarıyla tahmin eder ve oyunda doğrular

Sonuç `data/vehicles_auto.json`'a yazılır, kütüphane anında güncellenir. Birkaç dakika sürer;
yeni DLC / araç eklediğinde tekrar çalıştır.

> **Önemli:** GTA'da bir araç özel tasarımı ancak modelinde **livery (kaplama) slotu** varsa
> gösterebilir. Orijinal araçların bir kısmında (polis/kamu, yarış/tuner DLC araçları, bazı
> motorlar/uçaklar…) bu slot vardır, bir kısmında yoktur. Slotu olmayanlar kütüphanede
> "KAPLAMA YOK" olarak soluk görünür. Slotu olup doku adı otomatik bulunamayanlar için
> aşağıdaki adımlarla `config/vehicles.lua`'ya elle ekleyebilirsin (elle tanım taramayı ezer).
>
> Orijinal araçların 3D modelleri Rockstar'ın dosyalarıdır, bu repoya konmaz. Bu araçlarda
> 3D yerine **OYUNDA (canlı önizleme)** modu kullanılır: gerçek araç oyunda döner, tasarım
> anında üzerinde görünür. **IZGARA** ile UV'de hangi harf-numaranın araçta nereye denk
> geldiğini görürsün.

---

Bir aracın stüdyoda tasarlanıp oyunda gösterilebilmesi için 3 şey gerekir:

1. **Livery slotları** (zorunlu) — modelde tasarımın basılacağı boş livery dokuları.
2. **UV şablonu** (önerilir) — tasarımcının aracın hangi parçasını boyadığını görmesi için.
3. **3D model (.glb)** (önerilir) — "3D doğrudan boyama" için. Varsa UV şablonu otomatik üretilir.

---

## 1) Livery slotları

Sistem, oyuncunun tasarımını çalışma anında (runtime) modelin bir livery dokusunun **yerine**
basar (`AddReplaceTexture`). Bu değişim o modeldeki **tüm araçlar** için geçerli olduğundan,
aynı modelde aynı anda farklı tasarımlar göstermek için her tasarıma ayrı bir slot verilir.
`slots = 16` → o modelden aynı anda en fazla 16 farklı kaplama görünebilir (aynı tasarımı
kullanan araçlar slotu paylaşır).

İki yöntem desteklenir (`method`):

| method | Oyunda | Doku nerede? |
|---|---|---|
| `'livery'` | `SetVehicleLivery(index)` | Modelin kendi `.ytd`'sindeki `*_sign_N` dokuları (carvariations `liveries`) |
| `'mod'` | `SetVehicleMod(48, index)` | carcols modkit'teki `VMT_LIVERY_MOD` parçaları (her biri ayrı `.yft` + gömülü doku) |

### Doku adlarını bulma
OpenIV / CodeWalker ile aracın dosyalarını aç:
- `'livery'` yöntemi: `<model>.ytd` içinde `<model>_sign_1`, `<model>_sign_2`… gibi dokular.
  → `txd = '<model>'`, `texture = '<model>_sign_%d'`
- `'mod'` yöntemi: `<model>_livery1.yft`, `<model>_livery2.yft`… Her `.yft`'nin gömülü doku
  sözlüğünün adı genelde yft adıdır. → `txd = '<model>_livery%d'`, `texture = '<doku adı>%d'`

`%d` yerine **livery numarası** yazılır (1 tabanlı; = `slot + indexOffset`).
Oyundaki index = `slot - 1 + indexOffset`. Örnek: `indexOffset = 1` → tasarım slotu 1,
oyunda livery index 1'i (`_sign_2`) kullanır; livery 0 (aracın varsayılanı) bozulmaz.
Tarama `'livery'` yönteminde bunu otomatik yapar.

### Slot sayısını artırma / orijinal liveryleri korumak
Araçta 4 livery varsa ve bunlar kullanılacaksa, tasarım slotu olarak **ekstra boş** livery
ekle (ör. 5–16) ve `indexOffset = 4` ver. Boş livery dokusu: **2048×2048 (veya 1024), DXT5/BC3,
tamamen şeffaf** PNG'den dönüştürülür. Doku boyutu `size` ile aynı olmalı.

> İpucu: Doku ne kadar büyükse kaplama o kadar keskin görünür ama bellek artar.
> Çok sayıda araç için 1024, gösteri araçları için 2048 önerilir.

---

## 2) UV şablonu (PNG)

Blender + **Sollumz** ile:
1. `.yft`'yi içe aktar (Sollumz → Import).
2. Livery'nin göründüğü gövde parçalarını seç (genelde `vehicle_paint*` / "sign" materyalli meshler).
3. **UV Editing** sekmesi → livery'nin kullandığı UV haritasını seç
   (Sollumz'da genelde ikinci harita: `UVMap 1`).
4. `UV → Export UV Layout` → **Size: 2048** (veya `size` neyse), Fill Opacity 0, PNG.
5. Dosyayı `assets/uv/<model>.png` olarak kaydet → `uv = 'assets/uv/<model>.png'`.

GLB varsa bu adımı atlayabilirsin: stüdyo şablonu geometriden **otomatik** üretir.

---

## 3) 3D model (.glb)

Blender'da (Sollumz ile içe aktardıktan sonra):
1. Gövde, camlar ve tekerlekleri seç (iç mekân/motor gerekmez; dosya küçük kalsın).
2. `File → Export → glTF 2.0 (.glb)`:
   - **Include**: Selected Objects
   - **Mesh**: UVs ✔, Normals ✔, Apply Modifiers ✔
   - **Compression** (Draco) ✔ önerilir — dosyayı 5–10 kat küçültür.
3. `assets/models/<model>.glb` olarak kaydet → `glb = 'assets/models/<model>.glb'`.
4. Livery ikinci UV haritasındaysa `uvChannel = 1` (glTF'te `TEXCOORD_1`). İlk haritadaysa `0`.

Boyanacak parçalar otomatik bulunur (materyal/mesh adında `paint`, `body`, `sign`, `livery`
geçenler; cam/teker/far hariç). Yanlışsa `liveryMaterials = { 'paint', 'sign' }` ile belirt.
Model ters duruyorsa `rotationY = 90` / `-90` / `180` dene (ön taraf +X'e bakmalı).

---

## 4) config/vehicles.lua örneği

```lua
Config.Vehicles = {
    ['m8'] = {
        label = 'M8 Competition', brand = 'BMW', year = 2020, category = 'sports',
        size = 2048,
        method = 'mod', slots = 16,
        txd = 'm8_livery%d', texture = 'm8_livery%d', indexOffset = 0,
        glb = 'assets/models/m8.glb', uvChannel = 1,
        uv = 'assets/uv/m8.png',        -- istege bagli
        thumb = 'assets/thumbs/m8.png', -- istege bagli
    },
}
```

## 5) Doğrulama (her yeni araçta 2 dakika)

1. Stüdyoyu aç, aracı seç. UV modunda şablon ile 3D modun örtüştüğünü kontrol et.
2. **Çıkartma → Yarış Numarası**'nı kapıya, **Yazı**'yı kaputa koy.
3. Bas → eşyayı oyundaki araca tak.
4. Numara ve yazı doğru yerde mi?
   - Hiç görünmüyor → `txd`/`texture` adı veya `method` yanlış.
   - Kayık / yanlış parçada → `uvChannel` yanlış (0 ↔ 1 dene).
   - Ters (ayna) → UV şablonu yanlış haritadan alınmış.
   - Sadece bir kısmında görünüyor → livery o parçalarda tanımlı değil (model kısıtı).
