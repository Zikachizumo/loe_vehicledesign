# Kaplamaları Gerçek Para ile Satmak (Tebex)

> Bu bir hukuk danışmanlığı değildir. Kurallar değişebilir: satışa başlamadan önce güncel
> **Cfx.re Creator Platform License Agreement (PLA)** ve **Tebex** kurallarını kendin oku.
> Bu belge yazılırken geçerli olan PLA sürümü: **12 Ocak 2026**.

## 1. Kurallar (özet)

| Durum | Açıklama |
|---|---|
| ✅ Serbest | Kendi yaptığın **kozmetik** içerik: sunucuna özel kaplamalar/araç görünümleri |
| ✅ Zorunlu | Ödeme **sadece Tebex** ile. PayPal, Papara, IBAN, Shopier, Discord'dan elden satış, Patreon vb. **yasak** (PLA ihlali → sunucu kapatılabilir) |
| ❌ Yasak | **Gerçek marka / logo** (Red Bull, Monster, BMW M, Ferrari vb.), logosu silinmiş taklitler, internetten alınmış telifli görseller |
| ❌ Yasak | **Oyun parası / coin / token** satmak (örn. "100 LoE Coin" paketi) |
| ❌ Yasak | **Şans kutusu / rastgele kaplama** (loot box, gacha, çekiliş) |
| ❌ Yasak | Gerçek paraya geri çevrilebilen şeyler, satın alınanın oyun parasıyla takas edilmesi |
| ⚠️ Dikkat | Gerçek marka araç modlarına (addon BMW, Audi vb.) gerçek parayla kaplama satma. Sadece GTA'nın kendi araçları veya hakları sende olan araçlar |

Bu yüzden sistem şöyle tasarlandı:
- Oyuncu Tebex'ten **belirli bir kaplamayı** satın alır. Coin veya kredi sistemi yok.
- Satın alınan kaplama **karaktere bağlanır**. Envanter eşyası verilmez, başkasına verilemez,
  satılamaz, oyun parasına çevrilemez.
- Kaplama sadece görünümdür, oyunda avantaj sağlamaz.
- İade veya chargeback olunca kaplama otomatik geri alınır.

**Tasarımlar:** stüdyonun **URL'den içe aktar** ve **Yapay zekâ** araçlarıyla yaptığın görselleri
gerçek parayla satmadan önce telif durumunu kontrol et. En güvenlisi, kaplamayı stüdyoda sıfırdan
çizmek (fırça, şekil, yazı, LoE çıkartmaları).

**Vergi:** Tebex satıcı (merchant of record) olarak ödemeyi ve KDV'yi yönetir. Sana gelen
ödemeler gelirdir; Türkiye'deki vergi yükümlülüğün için bir mali müşavire danış.

## 2. Kurulum

1. **Tebex mağazası aç:** tebex.io → FiveM mağazası oluştur (Cfx.re hesabınla).
2. **Sunucuya bağla:** Tebex panelinde oyun sunucusu ekle ve verilen **gizli anahtarı** `server.cfg`
   dosyasına yaz. Bu anahtarı kimseyle paylaşma:
   ```cfg
   sv_tebexSecret "TEBEX_PANELINDEKI_ANAHTAR"
   ```
3. **Mağaza bağlantısı:** `config/shared.lua` dosyasında:
   ```lua
   Config.Tebex = { enabled = true, storeUrl = 'https://SENIN-MAGAZAN.tebex.io', redeemCommand = 'kaplamakod' }
   ```
4. **Kaplamayı Tebex'e koy:**
   - Stüdyoda (`/kaplamastudyo`) tasarımı bas. "MAĞAZADA SAT" açık olsun ve **GERÇEK PARA (TEBEX)** seçili olsun.
   - Tasarımlarım → Basılanlar → kartta **MAĞAZA** → komutu **KOPYALA**. Örnek:
     `loe_tebex_kaplama {transaction} ABC23456`
   - Tebex panelinde yeni paket oluştur (ad, fiyat, görsel). Sunucu komutu olarak
     **satın alma** anında, **oyuncu çevrimiçi olmasa da** çalışan komuta yapıştır.
   - **İade / chargeback** komutu olarak şunu ekle: `loe_tebex_iade {transaction}`
   - Paket seti (bundle) için kodları yan yana yaz: `loe_tebex_kaplama {transaction} ABC23456 DEF34567`

   > Tebex panelindeki menü adları zamanla değişebilir. Önemli olan iki şey: komut **sunucu konsolunda**
   > çalışmalı ve `{transaction}` değişkeni kullanılmalı.

5. **Paket açıklamasına ekle** (önerilir): *"Sadece görünüm, oyunda avantaj sağlamaz. Satın aldıktan
   sonra e-postandaki işlem kodunu oyunda Kaplama Mağazası'nda veya `/kaplamakod <kod>` ile gir.
   Kaplama karakterine bağlanır, devredilemez. Seçtiğin araç modeli içindir."*

## 3. Oyuncu tarafı

1. Tebex mağazasından kaplamayı satın alır.
2. E-postasına gelen işlem kodunu (`tbx-...`) oyunda girer: Kaplama Mağazası → **Tebex kodunu kullan**
   veya `/kaplamakod tbx-...`
3. Aracını mağazaya getirir. Kaplama listede **SAHİPSİN** olarak görünür → **Aracıma tak (ücretsiz)**.
4. Aynı modeldeki kendi diğer araçlarına da istediği zaman ücretsiz takabilir.

## 4. Güvenlik

- `loe_tebex_kaplama` ve `loe_tebex_iade` komutlarını **sadece sunucu konsolu** çalıştırabilir.
  Admin oyuncular bile oyundan çalıştıramaz.
- Her işlem kodu **bir kez** kullanılır. İki kişi aynı anda denerse sadece biri alır.
- İade veya chargeback olunca sahiplik silinir ve kaplama o oyuncunun kayıtlı araçlarından kaldırılır.
  Oyuncu aynı kaplamayı ikinci kez satın aldıysa sahiplik diğer ödemeye geçer.
- Tüm satışlar, kod kullanımları ve iadeler Discord loguna düşer (`loe_vd_webhook`).

## Kaynaklar
- Cfx.re — Setting Up a Tebex Store: https://docs.fivem.net/docs/server-manual/setting-up-a-tebex-store/
- Cfx.re Creator Platform License Agreement (12 Ocak 2026): https://static.cfx.re/platform-license-agreement-12-jan-2026.pdf
- Tebex FiveM: https://docs.tebex.io/creators/tebex-control-panel/game-servers/fivem
