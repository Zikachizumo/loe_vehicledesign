# assets/

Sunucu sahibinin eklediği araç dosyaları. Yeniden derleme (build) **gerekmez**;
dosyayı koy, `config/vehicles.lua`'da yolunu yaz, kaynağı yeniden başlat.

| Klasör | İçerik | Zorunlu mu? |
|---|---|---|
| `models/<model>.glb` | 3D önizleme modeli (Blender + Sollumz ile dışa aktarılır) | Hayır — yoksa sadece UV modu çalışır |
| `uv/<model>.png` | UV şablonu (livery UV haritası, şeffaf PNG, kare) | Hayır — GLB varsa otomatik üretilir |
| `thumbs/<model>.png` | Kütüphane kartı görseli (≈ 320×180, şeffaf PNG) | Hayır |

Hazırlama adımları: [`docs/ARAC_HAZIRLAMA.md`](../docs/ARAC_HAZIRLAMA.md)
