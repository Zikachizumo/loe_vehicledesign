# Referans Video Analizi (saniye saniye)

Kaynak: kullanıcının paylaştığı ~4:38'lik tanıtım videosu (başka bir stüdyonun ücretli
"vehicle designer" ürünü). Videodaki **işlevler** incelendi; kod, logo, marka ve görseller
**kopyalanmadı** — LoE için sıfırdan yazıldı ve LoE kimliğiyle tasarlandı.

İnceleme yöntemi: video saniyede 1 kareye bölündü (278 kare), 3×3 kontak sayfalarında
tamamı gözden geçirildi, arayüz metinleri için ilgili kareler 3× büyütülüp okundu.

## Zaman çizelgesi

| Süre | Videoda görülen | LoE karşılığı |
|---|---|---|
| 0:00–0:06 | Stüdyo logosu, şehir gece çekimi (tanıtım) | — |
| 0:06–0:12 | Ürün adı yazısı; biri kaplamalı iki araç | — |
| 0:12–0:20 | Hazır kaplamalı araçların yakın çekimleri (boya sıçraması desenleri, yan kapıda yazı) | Sıçrat + Yazı araçları |
| 0:20–0:23 | Editör açılır: sol **garaj kütüphanesi** (marka, model, yıl, sınıf, "x/16 slot", "UV hazır" rozeti, arama, kategori sekmeleri, Araçlar/Tasarımlarım), ortada "araç seç" boş durumu, sağda **Katmanlar** + **Katman Özellikleri**, altta araç ayar çubuğu, en altta adımlar (Seç/Tasarla/Tak/Sür) ve **Bas** düğmesi | Aynı yerleşim: `Library`, `Workspace`, `LayersPanel`, `OptionsBar`, `Footer` |
| 0:23–0:28 | Araç seçilir → "boya yüzeyi hazırlanıyor" → spot ışıklı, zemin halkalı 3D model; alt kısımda kamera açısı düğmeleri | `Viewport3D` + `Preparing`, 6 kamera açısı |
| 0:28–0:35 | 3D model döndürülür; **UV düzeni** moduna geçilir: renkli UV çizgileriyle şablon | UV Şablon modu, şablon GLB'den otomatik |
| 0:36–0:45 | **Dolgu** aracı (tolerans + renk; HSV kare, RGB, damlalık) → taban dolgu katmanı, araç siyah olur | Dolgu (Bölge/Panel/Tüm yüzey) + özel renk seçici |
| 0:46–0:56 | 3D'de seçim tutamaçları; **Sıçrat** (boyut, renk, enerji, damlacık, temiz/akıntı): gövdeye her tıklama ayrı katman | Sıçrat: aynı parametreler, deterministik prosedürel üretim |
| 0:57–1:12 | Farklı renklerle çok sayıda sıçrama; katman listesi büyür | — |
| 1:13–1:36 | **Yazı** aracı: metin kutusu, stil düğmeleri, font listesi, **font yükle**, boyut, renk; yazı yan kapıya yerleştirilip renk değiştirilir | Yazı: kalın/eğik/kontur/aralık + font yükleme |
| 1:37–1:44 | Seç ile yazı 3D üzerinde taşınır; farklı açılardan bakılır | 3D'de sürükleyerek taşıma, Shift/Ctrl+tekerlek |
| 1:45–1:57 | **Fırça** (4 uç tipi, boyut, renk) ile far çevresi boyanır; UV modunda tüm katmanlar görünür | Fırça: yuvarlak/markör/kare/sprey, sertlik, opaklık |
| 1:57–2:06 | **Bas** → "basılıyor" durumu → editör kapanır | Bas penceresi + ilerleme durumu |
| 2:06–2:13 | Oyunda envanter: aracın adını taşıyan kaplama eşyası, üzerine gelince tasarım bilgisi | `loe_livery` eşyası, metadata: araç/tasarımcı/kod + küçük önizleme |
| 2:13–2:30 | Eşya araç yanında kullanılır, araç kaplamayla görünür | Kullan → ilerleme → sunucu doğrulaması → state bag |
| 2:30–2:43 | Yeni tasarım: kütüphanede daha fazla model; araç seçilir | — |
| 2:43–2:53 | **Görsel → URL'den içe aktar** penceresi (PNG/JPG/WEBP/GIF, sunucu doğrular) → görsel katmanı; UV'de tüm şablonu kaplayacak şekilde büyütülür | Görsel: dosya yükle + URL (önce doğrudan, olmazsa sunucu vekili, imza kontrolü) |
| 2:53–3:03 | 3D'de desen; bas; oyunda birden fazla kaplama eşyası | Tekrar bas (Basılanlar) |
| 3:03–3:10 | Eşya kayıtlı araca takılır: "takıldı ve sahip olunan araca kaydedildi" bildirimi | Kalıcı kayıt (plaka) — aynı ayrım |
| 3:10–3:22 | Kaplamalı araçla yağmurda sürüş | — |
| 3:22–3:34 | **Yapay zekâ kaplama**: istem kutusuna tarif yazılır → "oluşturuluyor" → sonuç katman olarak eklenir, UV'ye sığdırılır | YZ aracı (OpenAI görsel API veya özel uç nokta, convar anahtarı) |
| 3:34–3:55 | Kayıtsız araca takılır: sadece "araca takıldı" (kalıcı değil); turuncu kaplama numarayla görünür | Kayıtsız araçta geçici takma |
| 3:55–4:33 | Sürüş ve kaza: kopan kaput dahil hasarlı parçalarda da kaplama görünür | Doku değişimi modele uygulandığı için parçalar dahil |
| 4:33–4:38 | Kapanış / satış bilgisi | — |

## Araç çubuğunda görülen araçlar → LoE

Yeni, Kaydet, Geri, İleri · Seç, Fırça, Sıçrat, Silgi, Dolgu, Yazı, Şekil, Kalem, Geçiş, Görsel,
Klon, Karıştır, Damlalık, Efekt, Cila/Boya, Geçmiş, Yapay Zekâ → **hepsi var**. Ek olarak
**Çıkartma** (LoE için çizilmiş hazır desenler) eklendi.

## Videodan farklı / bilinçli kararlar

- Marka, logo, renkler ve metinler LoE'ye aittir; arayüz Türkçedir.
- Videodaki ürün her araç için hazırlanmış 3D model paketleriyle geliyor. LoE'de her araç için
  `.glb` + livery slotu sunucu sahibi tarafından eklenir (`docs/ARAC_HAZIRLAMA.md`).
  Test için prosedürel **Demo Coupe** eklendi (basılamaz).
- Videoda görülmeyen ama eklenenler: panel dolgusu (tek kaporta parçası), katman efektleri,
  alt boya/yüzey tipi, proje kaydet/aç, tekrar bas, sökücü eşya, dışa açık API, Discord log.
