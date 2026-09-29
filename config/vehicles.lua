--[[
    LoE Arac Tasarim Studyosu - KAPLAMA YAPILABILIR ARACLAR

    Her arac icin modelde BOS livery slotlari olmali (docs/ARAC_HAZIRLAMA.md).
    Sunucu, ayni modelde ayni anda gorunen her farkli tasarima bir slot ayirir;
    slot sayisi = o modelde ayni anda gorunebilecek farkli kaplama sayisi.

    Alanlar:
      label, brand, year, category   -> kutuphane karti (category: Config.Categories id)
      size        -> kaplama doku boyutu (kare; 1024 veya 2048 onerilir)
      method      -> 'mod'   : SetVehicleMod(48, index)  (carcols modkit liveries)
                     'livery': SetVehicleLivery(index)    (carvariations "sign" dokulari)
      slots       -> modeldeki bos livery sayisi
      txd         -> livery dokusunun bulundugu doku sozlugu. %d varsa slot no ile doldurulur.
      texture     -> livery doku adi. %d -> slot no (1..slots)
      indexOffset -> oyundaki index = (slot - 1) + indexOffset
      glb         -> (istege bagli) 3D onizleme modeli, assets/ altinda
      uv          -> (istege bagli) UV sablon PNG'si; yoksa GLB'den otomatik uretilir
      uvChannel   -> livery'nin kullandigi UV kanali (Sollumz GLB: genelde 1)
      liveryMaterials -> (istege bagli) 3D'de boyanacak materyal adlari (icerir eslesmesi)
      rotationY   -> (istege bagli) 3D modelin yon duzeltmesi (derece)
      thumb       -> (istege bagli) kutuphane karti gorseli
]]

Config.Vehicles = {
    -- ORNEK (kendi aracina gore duzenle, sonra yorum isaretlerini kaldir):
    -- ['m8'] = {
    --     label = 'M8 Competition',
    --     brand = 'BMW',
    --     year = 2020,
    --     category = 'sports',
    --     size = 2048,
    --     method = 'mod',
    --     slots = 16,
    --     txd = 'm8_livery%d',
    --     texture = 'm8_livery%d',
    --     indexOffset = 0,
    --     glb = 'assets/models/m8.glb',
    --     uv = 'assets/uv/m8.png',
    --     uvChannel = 1,
    --     thumb = 'assets/thumbs/m8.png',
    -- },
}
