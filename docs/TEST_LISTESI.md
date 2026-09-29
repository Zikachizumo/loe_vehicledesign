# Sunucu Test Listesi (kısa)

Kurulum: `git pull` → `install/ox_inventory` içeriğini ox_inventory'ye ekle → `restart ox_inventory` → `ensure loe_vehicledesign`.
F8 konsolunda ve sunucu konsolunda **kırmızı hata** var mı, her adımda bak.

1. **Açılış:** Sunucu konsolunda `[loe_vd] Katalog: …` satırı çıkıyor mu?
2. **Tarama:** Yetkiliyle `/kaplamatarama` → bitince bildirimdeki sayıları not et (kaç araç / kaç kaplamalı / kaç yüklenemedi).
3. **Stüdyo:** Yetkiliyle `/kaplamastudyo` → açılıyor mu? Kütüphanede araçlar, görseller, "SADECE KAPLAMALI" filtresi.
   Yetkisiz bir oyuncuyla `/kaplamastudyo` → açılMAMALI.
4. **Demo:** Demo Coupe → 3D'de sıçrat / yazı / fırça çalışıyor mu? UV şablona geç.
5. **Canlı önizleme:** Kaplamalı gerçek bir araç seç (örn. polis aracı veya bir tuner araç) → OYUNDA:
   araç önünde çıkıyor mu, sağda sürükleyince dönüyor mu, soldaki UV'ye boyayınca araçta görünüyor mu?
   **IZGARA**'yı aç: harfler araçta görünüyor mu?
6. **Mağazaya ekle:** KAPLAMAYI BAS → "MAĞAZADA SAT" açık, fiyat örn. 5000 → "mağazaya eklendi" bildirimi?
   Tasarımlarım → Basılanlar kartında **SATIŞTA · $5.000** yazıyor mu?
7. **Mağaza (oyuncu hesabıyla):** Aynı model KENDİ aracınla Benny's'teki mağaza noktasına gel → `[E]` →
   kaplama listede mi (görsel + fiyat)? **Önizle** → 15 sn araçta görünüp geri gidiyor mu?
8. **Satın al:** Onayla → para düştü mü, kaplama takıldı mı? Yanındaki ikinci oyuncu da görüyor mu?
   Parası yetmeyen oyuncuda "Yetersiz bakiye" çıkıyor, kaplama takılmıyor mu?
9. **Kalıcılık:** Aracı garaja koy, çıkar → kaplama geri geldi mi?
10. **Fiyat/Kaldır:** Stüdyoda kartta **MAĞAZA** → fiyatı değiştir → mağazada yeni fiyat mı? Satıştan kaldır
    → mağazada artık görünmüyor mu?
11. **Sök:** Kaplama Sökücü ile sök → kaplama gitti mi, eşya harcandı mı?
12. **Kaydet/Aç:** Projeyi kaydet → stüdyoyu kapat/aç → Tasarımlarım → Aç → aynı tasarım geldi mi?

**Tebex (gerçek para) — Tebex'e bağlamadan önce konsoldan denenebilir:**

13. Stüdyoda bir tasarımı **GERÇEK PARA (TEBEX)** ile mağazaya ekle → kartta MAĞAZA → komutu kopyala.
14. **txAdmin konsoluna** yaz: `loe_tebex_kaplama test-123456 KOD` (KOD = kartın üstündeki #kod)
    → "1 kaplama kodu kullanima hazir" yazmalı.
15. Oyuncu hesabıyla mağazada **Tebex kodunu kullan** → `test-123456` → "hesabına eklendi" mi?
    Aynı kodu tekrar gir → "zaten kullanılmış" demeli.
16. Aracı getir → kaplama **SAHİPSİN** görünüyor mu → **Aracıma tak (ücretsiz)** → para düşmeden takıldı mı?
17. Konsola `loe_tebex_iade test-123456` yaz → kaplama araçtan kalktı mı, mağazada tekrar "Gerçek para" mı görünüyor?

Sorun olursa: adım numarası + F8 / sunucu konsolundaki hata satırı + (varsa) ekran görüntüsü yeterli.
