# Annotation method / Anotasyon yöntemi

## Unit / Birim

Each unit is one bilingual semantic pair: a Turkish text and its English
counterpart. Both are evaluated together.

Her birim iki dilli bir semantik çifttir: Türkçe metin ve İngilizce karşılığı
birlikte değerlendirilir.

## Blindness / Körlük

Annotators do not see ALFA predictions, expected labels, confidence scores or
other annotators' responses.

Anotörler ALFA tahminlerini, beklenen etiketleri, güven skorlarını veya diğer
anotörlerin yanıtlarını görmez.

## Decision classes / Karar sınıfları

- `NET_MEANING` — Clear Meaning / Net Anlam
- `MEANINGFUL_NOISE` — Noisy but Meaningful / Gürültülü ama Anlamlı
- `CONTRADICTION` — Contradictory Text / Çelişkili Metin
- `SEMANTIC_INCOHERENCE` — Semantic Incoherence / Anlamsal Tutarsızlık
- `NO_MEANING` — No Meaning Recovered / Anlam Çıkarılamadı

Annotators also provide confidence from 1 to 5. A short reason is optional and
must not contain personal information.

Anotörler ayrıca 1–5 arasında güven bildirir. Kısa gerekçe isteğe bağlıdır ve
kişisel bilgi içermemelidir.

## Submission / Gönderim

Drafts remain local during annotation. Remote submission is enabled only after
all 20 items are complete and requires a separate consent action. The server
revalidates the package, allowed sample identifiers, decision vocabulary,
confidence range, note length, timestamps and blinding declarations. A stable
submission identifier makes network retries idempotent.

Anotasyon sırasında taslaklar yerel kalır. Uzak gönderim yalnız 20 öğenin tümü
tamamlandığında açılır ve ayrı onay gerektirir. Sunucu; paketi, izinli örnek
kimliklerini, karar sözlüğünü, güven aralığını, not uzunluğunu, zaman
bilgilerini ve körlük bildirimlerini yeniden doğrular. Sabit gönderim kimliği,
ağ yeniden denemelerinin yinelenen kayıt üretmesini önler.

## Analysis boundary / Analiz sınırı

The pilot export is not a calibrated result. Agreement, exclusions, duplicate
control items, missingness and adjudication must be reported before any
scientific claim.

Pilot dışa aktarımı kalibre edilmiş sonuç değildir. Her bilimsel iddiadan önce
uyum, dışlamalar, yinelenen kontrol öğeleri, eksik yanıtlar ve uzlaşma süreci
raporlanmalıdır.
