# CHANGELOG

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
