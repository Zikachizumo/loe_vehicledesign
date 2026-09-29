# CHANGELOG

## 1.3.0 — 2026-09-29 (gerçek para — Tebex)
- Tasarımlar **GERÇEK PARA (TEBEX)** olarak satılabilir (stüdyoda satış türü seçimi, Tebex paket
  komutunu kopyalama).
- Tebex konsol komutları: `loe_tebex_kaplama {transaction} KOD [KOD...]` (satın alma),
  `loe_tebex_iade {transaction}` (iade/chargeback → sahiplik ve araçtaki kaplama geri alınır).
  Oyuncular bu komutları çalıştıramaz.
- Oyuncu kodu kullanır: mağazada **Tebex kodunu kullan** veya `/kaplamakod`. Kaplama **karaktere
  bağlanır**: eşya verilmez, devredilemez; mağazada kendi araçlarına ücretsiz takılır. Satıştan
  kaldırılsa da sahipler görmeye devam eder.
- Mağaza: Tebex kaplamaları için mağaza bağlantısı (panoya kopyalanır), SAHİPSİN etiketi.
- Veritabanı: `loe_vd_designs.tebex`, yeni `loe_vd_purchases` ve `loe_vd_owned` tabloları (otomatik).
- Belge: `docs/GERCEK_PARA_TEBEX.md` (Cfx.re/Tebex kuralları + kurulum).

## 1.2.0 — 2026-09-29 (tasarım mağazası)
- **Stüdyo sadece yetkililere açık** (`command.kaplamastudyo` izni; varsayılan `group.admin`).
  Tüm stüdyo istekleri sunucuda hem oturum hem yetki kontrol eder; stüdyo noktaları oyunculara
  gösterilmez (varsayılan: nokta yok, `/kaplamastudyo` ile açılır).
- **Kaplama Mağazası** (Benny's, blip + `[E]`): oyuncu aracını getirir, o modele uyan satıştaki
  kaplamaları görür (görsel, fiyat, tasarımcı, TAKILI), **15 sn önizleme** (sadece kendisi görür),
  onaylı **satın alma** (banka → nakit). `mode = 'fit'` araca hemen takar (kayıtlı araçta kalıcı),
  `'item'` envantere eşya verir. Takma başarısızsa para iade edilir. Varsayılan: sadece kendi aracına.
- Stüdyo: **KAPLAMAYI BAS** penceresinde "MAĞAZADA SAT" + satış fiyatı + "ENVANTERİME DE VER".
- Tasarımlarım → Basılanlar: SATIŞTA/SATIŞTA DEĞİL etiketi, fiyat, tasarımcı, satış sayısı;
  **MAĞAZA** (fiyat değiştir / kaldır) ve **EŞYA AL** düğmeleri. Basılanlar listesi artık tüm ekibin
  tasarımlarını gösterir.
- Veritabanı: `loe_vd_designs` tablosuna `published`, `price`, `sales` sütunları (açılışta otomatik eklenir).
- `ServerConfig.OnPurchase` kancası (satıştan pay vb.), Discord logunda satışlar.
- Export: `OpenShop()`.

## 1.1.1 — 2026-09-29 (hata düzeltmeleri)
- **Güvenlik:** kaplama takarken eşya artık önce silinir; takma başarısız olursa geri verilir
  (bekleme sırasında eşyayı taşıyarak çoğaltma açığı kapandı). Sökücü için de aynı.
- Doku bir kez yüklenemezse artık 15 sn sonra tekrar denenir (önceden kaplama hiç görünmeyebiliyordu).
- Canlı önizleme: ilk görüntü doku sayfası hazır olmadan gelirse tekrar gönderilir (boş araç sorunu);
  önizleme slot 1'i kullanır (gerçek kaplamalarla çakışmaz).
- **Bölünmüş görünüm (OYUNDA):** solda UV tuvalinde boya, sağda gerçek araçta anında gör;
  kamera aracı sağ alana sığdırır.
- Tarama düğmesi sunucu olayıyla çalışır (yetki sunucuda); tarama hatasında geçici araç silinir.
- Stüdyo kapanınca, oyuncu hâlâ noktadaysa `[E]` yazısı geri gelir.
- Plaka eşleşmesi boşluk/küçük harf farkından etkilenmez (`player_vehicles`).
- Editör: kaydırıcı değişikliğinden hemen sonra Geri Al'da "İleri Al" kaybolmuyor; ölçeklenmiş
  yazının metni değişince boyut korunuyor; büyük tasarımlar basılırken kalite otomatik düşürülüyor.
- İstemci aktarımında sahipsiz veriler 5 dk sonra temizlenir.

## 1.1.0 — 2026-09-29
- **Tüm araçlar**: `/kaplamatarama` ile oyundaki tüm araçların otomatik taranması ve kataloğu
  (ad/marka/sınıf/livery sayısı/doku adı tahmini) → `data/vehicles_auto.json`.
- Kütüphane: GTA araç sınıflarına göre 22 kategori, "SADECE KAPLAMALI" filtresi, araç görselleri
  (docs.fivem.net), kaplama desteklemeyen araçlar soluk + uyarı, yetkiliye tarama düğmesi.
- **Oyunda canlı önizleme** (OYUNDA modu): gerçek araç, sürükle-döndür kamera, açı düğmeleri,
  tasarım anlık doku olarak.
- **UV ızgarası** yardımcısı (UV tuvali + canlı önizleme).
- Basma ücreti 0 (varsayılan).
- G menüsü vb. için istemci exportları: `OpenLiveryMenu`, `GetLiveriesForVehicle`, `FitLivery`,
  `RemoveLivery`, `GetVehicleLivery` (`docs/G_MENUSU.md`).
- Düzeltme: livery doku numarası artık `slot + indexOffset`; slot dağıtımı sondan başa.

## 1.0.0 — 2026-09-29
- İlk sürüm: referans videodaki işlev seti LoE için sıfırdan yazıldı (bkz. `VIDEO_ANALIZI.md`).
- NUI: React/Vite/three.js editör, Türkçe arayüz, `empire` teması.
- Lua (Qbox): stüdyo noktaları, oturumlu sunucu uçları, latent veri aktarımı, projeler,
  basma/tekrar basma, takma/sökme, slot dağıtımı, plaka kalıcılığı, DUI dokuları,
  URL içe aktarma vekili, yapay zekâ, Discord log, dışa açık API.
- ox_inventory eşya tanımları ve ikonları (`install/`).
