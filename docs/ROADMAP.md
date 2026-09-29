# ROADMAP

Durum: 🟢 tamam · 🟡 kısmen · 🔴 planlı

## 🟢 v1.0 — Editör + oyun içi takma
- 3D doğrudan boyama + UV tuvali, 18 araç, katmanlar, geçmiş, projeler.
- Bas → modele kilitli ox_inventory eşyası; tak/sök; plakaya kalıcı kayıt; slot dağıtımı.
- URL'den içe aktarma (sunucu vekili), yapay zekâ (isteğe bağlı), Discord log.

## 🟢 v1.1 — Tüm araçlar + canlı önizleme
- Oyun içi tarama ile otomatik katalog, OYUNDA modu, UV ızgarası, ücretsiz basma, G menüsü exportları.

## 🟡 Doğrulanacaklar (ilk sunucu testinde)
- [ ] `/kaplamatarama` sonucu: kaç araç "kaplamalı" çıktı, doku adı bulunamayanlar hangileri?
- [ ] Canlı önizlemede kaplama görünüyor mu, kamera ve şeffaf alan hizası doğru mu?
- [ ] Gerçek bir araçta `txd`/`texture`/`method` ayarı → kaplama görünüyor mu?
- [ ] DUI şeffaflığı (boş alanlarda araç boyası görünmeli).
- [ ] Garajdan çıkan kayıtlı araçta otomatik geri yükleme (qbx_garages ile).
- [ ] 2048 doku + çok oyuncu → FPS/bellek (gerekirse `size = 1024`).
- [ ] Bitirim envanterinde eşya ikonu (metadata.imageurl) ve açıklama görünümü.

## 🔴 Sonraki
- G tuşu araç menüsü (araç/motor bilgisi) — `OpenLiveryMenu` ile bağlanacak.
- Mekanik mesleği için müşteri aracına "iş emri" akışı.
- Stüdyo içinde araç çağırma / döndürme kamerası.
- Takım/ekip kaplamaları (tasarımı paylaşma, izinli yeniden basma).
- Çıkartma kütüphanesini genişletme (sunucu sahibinin PNG ekleyebileceği klasör).
