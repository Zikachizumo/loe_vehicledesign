# ROADMAP

Durum: 🟢 tamam · 🟡 kısmen · 🔴 planlı

## 🟢 v1.0 — Editör + oyun içi takma
- 3D doğrudan boyama + UV tuvali, 18 araç, katmanlar, geçmiş, projeler.
- Bas → modele kilitli ox_inventory eşyası; tak/sök; plakaya kalıcı kayıt; slot dağıtımı.
- URL'den içe aktarma (sunucu vekili), yapay zekâ (isteğe bağlı), Discord log.

## 🟡 Doğrulanacaklar (ilk sunucu testinde)
- [ ] Gerçek bir araçta `txd`/`texture`/`method` ayarı → kaplama görünüyor mu?
- [ ] DUI şeffaflığı (boş alanlarda araç boyası görünmeli).
- [ ] Garajdan çıkan kayıtlı araçta otomatik geri yükleme (qbx_garages ile).
- [ ] 2048 doku + çok oyuncu → FPS/bellek (gerekirse `size = 1024`).
- [ ] Bitirim envanterinde eşya ikonu (metadata.imageurl) ve açıklama görünümü.

## 🔴 Sonraki
- Oyun içi **canlı önizleme**: editör açıkken gerçek araç üzerinde anlık doku.
- Mekanik mesleği için müşteri aracına "iş emri" akışı.
- Stüdyo içinde araç çağırma / döndürme kamerası.
- Takım/ekip kaplamaları (tasarımı paylaşma, izinli yeniden basma).
- Çıkartma kütüphanesini genişletme (sunucu sahibinin PNG ekleyebileceği klasör).
